const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Validation schema for creating a product
const productCreateSchema = Joi.object({
  name: Joi.string().required(),
  sku: Joi.string().required(),
  price: Joi.number().positive().required(),
  category: Joi.string().required(),
  vendorId: Joi.string().required(),
  vendorName: Joi.string().required(),
  description: Joi.string().allow('').optional()
});

// Validation schema for updating a product
const productUpdateSchema = Joi.object({
  name: Joi.string().optional(),
  sku: Joi.string().optional(),
  price: Joi.number().positive().optional(),
  category: Joi.string().optional(),
  vendorId: Joi.string().optional(),
  vendorName: Joi.string().optional(),
  description: Joi.string().allow('').optional()
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products (filtered by user role)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = db.collection('products');

    if (req.user.role === 'Selling Place') {
      // Selling Places only see their own products
      query = query.where('sellingPlaceId', '==', req.user.uid);
    } else if (req.user.role === 'Vendor') {
      // Vendors only see products they supply
      query = query.where('vendorId', '==', req.user.uid);
    } else {
      return res.status(403).json({ error: 'Unrecognized user role' });
    }

    const snapshot = await query.get();
    const products = [];
    snapshot.docs.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });

    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a single product details
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const doc = await db.collection('products').doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = doc.data();

    // Security check: Verify ownership
    if (req.user.role === 'Selling Place' && product.sellingPlaceId !== req.user.uid) {
      return res.status(403).json({ error: 'Access Denied: Product belongs to another store.' });
    }
    if (req.user.role === 'Vendor' && product.vendorId !== req.user.uid) {
      return res.status(403).json({ error: 'Access Denied: You do not supply this product.' });
    }

    res.json({ id: doc.id, ...product });
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product (Selling Place only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, sku, price, category, vendorId, vendorName]
 *             properties:
 *               name: { type: string }
 *               sku: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               vendorId: { type: string }
 *               vendorName: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Product created successfully
 */
router.post('/', authenticateToken, requireRole(['Selling Place']), async (req, res) => {
  const { error, value } = productCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const productPayload = {
      ...value,
      sellingPlaceId: req.user.uid,
      sellingPlaceName: req.user.companyName,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('products').add(productPayload);

    // Also initialize inventory item for this product with 0 stock
    const inventoryPayload = {
      productId: docRef.id,
      productName: value.name,
      sku: value.sku,
      category: value.category,
      stock: 0,
      reorderPoint: 10, // Default reorder threshold
      averageDailySales: 0.0,
      standardDeviation: 1.0,
      leadTimeDays: 5,
      sellingPlaceId: req.user.uid,
      sellingPlaceName: req.user.companyName,
      vendorId: value.vendorId,
      vendorName: value.vendorName,
      updatedAt: new Date().toISOString()
    };
    await db.collection('inventory').doc(docRef.id).set(inventoryPayload);

    res.status(201).json({ id: docRef.id, ...productPayload });
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update product information (Selling Place only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               sku: { type: string }
 *               price: { type: number }
 *               category: { type: string }
 *               vendorId: { type: string }
 *               vendorName: { type: string }
 *               description: { type: string }
 *     responses:
 *       200:
 *         description: Product updated successfully
 */
router.put('/:id', authenticateToken, requireRole(['Selling Place']), async (req, res) => {
  const { error, value } = productUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const docRef = db.collection('products').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = doc.data();
    if (product.sellingPlaceId !== req.user.uid) {
      return res.status(403).json({ error: 'Access Denied: Product belongs to another store.' });
    }

    const updatedPayload = {
      ...value,
      updatedAt: new Date().toISOString()
    };

    await docRef.update(updatedPayload);

    // Update corresponding inventory references if name/sku/category changed
    const invDocRef = db.collection('inventory').doc(req.params.id);
    const invDoc = await invDocRef.get();
    if (invDoc.exists) {
      const invUpdates = {};
      if (value.name) invUpdates.productName = value.name;
      if (value.sku) invUpdates.sku = value.sku;
      if (value.category) invUpdates.category = value.category;
      if (value.vendorId) invUpdates.vendorId = value.vendorId;
      if (value.vendorName) invUpdates.vendorName = value.vendorName;
      
      if (Object.keys(invUpdates).length > 0) {
        invUpdates.updatedAt = new Date().toISOString();
        await invDocRef.update(invUpdates);
      }
    }

    res.json({ id: req.params.id, ...product, ...updatedPayload });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product (Selling Place only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted successfully
 */
router.delete('/:id', authenticateToken, requireRole(['Selling Place']), async (req, res) => {
  try {
    const docRef = db.collection('products').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = doc.data();
    if (product.sellingPlaceId !== req.user.uid) {
      return res.status(403).json({ error: 'Access Denied: Product belongs to another store.' });
    }

    await docRef.delete();

    // Also delete inventory record
    await db.collection('inventory').doc(req.params.id).delete();

    res.json({ message: 'Product and inventory records deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

module.exports = router;
