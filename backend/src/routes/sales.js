const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Schema validation for recording a sale
const saleItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().positive().required(),
  price: Joi.number().positive().required() // Unit price of item
});

const saleCreateSchema = Joi.object({
  items: Joi.array().items(saleItemSchema).min(1).required()
});

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Get sales transactions (filtered by user role)
 *     tags: [Sales]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of sales transactions
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = db.collection('sales');

    if (req.user.role === 'Selling Place') {
      query = query.where('sellingPlaceId', '==', req.user.uid);
    } else if (req.user.role === 'Vendor') {
      // Vendors see individual item transactions they supply
      query = query.where('vendorId', '==', req.user.uid);
    } else {
      return res.status(403).json({ error: 'Unrecognized user role' });
    }

    const snapshot = await query.get();
    const sales = [];
    snapshot.docs.forEach(doc => {
      sales.push({ id: doc.id, ...doc.data() });
    });

    res.json(sales);
  } catch (err) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ error: 'Failed to fetch sales transactions' });
  }
});

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: Record a new sales transaction and deduct stock (Selling Place only)
 *     tags: [Sales]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, quantity, price]
 *                   properties:
 *                     productId: { type: string }
 *                     quantity: { type: integer }
 *                     price: { type: number }
 *     responses:
 *       201:
 *         description: Sale recorded successfully
 */
router.post('/', authenticateToken, requireRole(['Selling Place']), async (req, res) => {
  const { error, value } = saleCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { items } = value;

  try {
    let totalAmount = 0;
    const processedItems = [];

    // Process each item, deduct inventory, and update metrics
    for (const item of items) {
      const productDoc = await db.collection('products').doc(item.productId).get();
      if (!productDoc.exists) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` });
      }
      const product = productDoc.data();

      if (product.sellingPlaceId !== req.user.uid) {
        return res.status(403).json({ error: `Access Denied: Product ${product.name} belongs to another store.` });
      }

      const invDocRef = db.collection('inventory').doc(item.productId);
      const invDoc = await invDocRef.get();
      if (!invDoc.exists) {
        return res.status(500).json({ error: `Inventory record missing for product ${product.name}` });
      }
      const invData = invDoc.data();

      // Check stock availability
      if (invData.stock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for product '${product.name}'. Current stock: ${invData.stock}, Requested: ${item.quantity}` 
        });
      }

      // Deduct stock
      const newStock = invData.stock - item.quantity;
      
      // Update rolling daily sales average (simulating moving sales rate)
      const currentAvgSales = invData.averageDailySales || 0;
      // In a real database, we would calculate this based on a 30-day sum of sales.
      // Here, we simulate a slight increase in average daily sales per transaction
      const simulatedAvgSales = Number((currentAvgSales * 0.9 + item.quantity * 0.1).toFixed(2));

      await invDocRef.update({
        stock: newStock,
        averageDailySales: simulatedAvgSales,
        updatedAt: new Date().toISOString()
      });

      // Accumulate transaction sums
      const subtotal = item.quantity * item.price;
      totalAmount += subtotal;

      processedItems.push({
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        price: item.price,
        subtotal
      });

      // Record detailed transaction log under vendor's view
      // This allows vendors to search for individual transaction sales of their items
      await db.collection('sales').add({
        transactionType: 'item_sale',
        productId: item.productId,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        price: item.price,
        subtotal,
        sellingPlaceId: req.user.uid,
        sellingPlaceName: req.user.companyName,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        createdAt: new Date().toISOString()
      });

      // Low Stock Alert trigger
      if (newStock <= invData.reorderPoint) {
        await db.collection('notifications').add({
          userId: req.user.uid,
          title: 'Low Stock Alert',
          message: `Stock for '${product.name}' dropped to ${newStock} units (Reorder Point: ${invData.reorderPoint}) following a checkout.`,
          type: 'low-stock',
          read: false,
          createdAt: new Date().toISOString()
        });

        await db.collection('notifications').add({
          userId: product.vendorId,
          title: 'Retailer Low Stock Alert',
          message: `Retailer '${req.user.companyName}' is running low on '${product.name}' (Stock: ${newStock}, Reorder Point: ${invData.reorderPoint}) following a checkout.`,
          type: 'low-stock-vendor',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    // Save master invoice transaction
    const invoicePayload = {
      transactionType: 'master_invoice',
      sellingPlaceId: req.user.uid,
      sellingPlaceName: req.user.companyName,
      items: processedItems,
      totalAmount,
      createdAt: new Date().toISOString()
    };
    const invoiceRef = await db.collection('sales').add(invoicePayload);

    res.status(201).json({ id: invoiceRef.id, ...invoicePayload });
  } catch (err) {
    console.error('Error recording sale transaction:', err);
    res.status(500).json({ error: 'Failed to record sales transaction' });
  }
});

module.exports = router;
