const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const saleItemSchema = Joi.object({
  productId: Joi.string().required(),
  quantity: Joi.number().integer().positive().required(),
  price: Joi.number().positive().required()
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
    let query = db.collection('sales_table');

    if (req.user.role === 'Selling Place') {
      query = query.where('sellingPlaceId', '==', req.user.uid);
    } else if (req.user.role === 'Vendor') {
      query = query.where('vendorId', '==', req.user.uid);
    } else {
      return res.status(403).json({ error: 'Unrecognized user role' });
    }

    const snapshot = await query.get();
    const sales = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      sales.push({
        id: doc.id,
        ...data,
        productId: data.productId || data.itemNbr || '',
        quantity: data.quantity !== undefined ? data.quantity : data.totalQty || 0,
        subtotal: data.subtotal !== undefined ? data.subtotal : data.totalSales || 0,
        createdAt: data.createdAt || data.timestamp || ''
      });
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

    for (const item of items) {
      const productDoc = await db.collection('item_list').doc(item.productId).get();
      if (!productDoc.exists) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` });
      }
      const product = productDoc.data();

      if (product.sellingPlaceId !== req.user.uid) {
        return res.status(403).json({ error: `Access Denied: Product ${product.name || product.itemDesc} belongs to another store.` });
      }

      const invDocRef = db.collection('inventory').doc(item.productId);
      const invDoc = await invDocRef.get();
      if (!invDoc.exists) {
        return res.status(500).json({ error: `Inventory record missing for product ${product.name || product.itemDesc}` });
      }
      const invData = invDoc.data();

      const currentStock = invData.availableQty !== undefined ? invData.availableQty : invData.stock;

      if (currentStock < item.quantity) {
        return res.status(400).json({ 
          error: `Insufficient stock for product '${product.name || product.itemDesc}'. Current stock: ${currentStock}, Requested: ${item.quantity}` 
        });
      }

      const newAvailable = currentStock - item.quantity;
      const newSold = (invData.soldQty || 0) + item.quantity;
      const totalQty = invData.totalQty !== undefined ? invData.totalQty : (currentStock + (invData.soldQty || 0));
      
      const currentAvgSales = invData.averageDailySales || 0;
      const simulatedAvgSales = Number((currentAvgSales * 0.9 + item.quantity * 0.1).toFixed(2));

      await invDocRef.update({
        availableQty: newAvailable,
        soldQty: newSold,
        totalQty,
        stock: newAvailable,
        averageDailySales: simulatedAvgSales,
        updatedAt: new Date().toISOString()
      });

      const subtotal = item.quantity * item.price;
      totalAmount += subtotal;

      processedItems.push({
        productId: item.productId,
        productName: product.name || product.itemDesc,
        sku: product.sku || product.itemNbr,
        quantity: item.quantity,
        price: item.price,
        subtotal
      });

      const transactionId = 'TX-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      await db.collection('sales_table').doc(transactionId).set({
        transactionId,
        itemNbr: item.productId,
        totalQty: item.quantity,
        totalSales: subtotal,
        timestamp: new Date().toISOString(),
        batchNo: invData.batchNo || 'B-DEFAULT',
        
        transactionType: 'item_sale',
        productId: item.productId,
        productName: product.name || product.itemDesc,
        sku: product.sku || product.itemNbr,
        quantity: item.quantity,
        price: item.price,
        subtotal,
        sellingPlaceId: req.user.uid,
        sellingPlaceName: req.user.companyName,
        vendorId: product.vendorId,
        vendorName: product.vendorName,
        createdAt: new Date().toISOString()
      });

      const currentReorderPoint = invData.reorderPoint !== undefined ? invData.reorderPoint : 10;
      if (newAvailable <= currentReorderPoint) {
        await db.collection('notifications').add({
          userId: req.user.uid,
          title: 'Low Stock Alert',
          message: `Stock for '${product.name || product.itemDesc}' dropped to ${newAvailable} units (Reorder Point: ${currentReorderPoint}) following a checkout.`,
          type: 'low-stock',
          read: false,
          createdAt: new Date().toISOString()
        });

        await db.collection('notifications').add({
          userId: product.vendorId,
          title: 'Retailer Low Stock Alert',
          message: `Retailer '${req.user.companyName}' is running low on '${product.name || product.itemDesc}' (Stock: ${newAvailable}, Reorder Point: ${currentReorderPoint}) following a checkout.`,
          type: 'low-stock-vendor',
          read: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    const invoiceId = 'INV-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const invoicePayload = {
      transactionId: invoiceId,
      totalSales: totalAmount,
      timestamp: new Date().toISOString(),
      
      transactionType: 'master_invoice',
      sellingPlaceId: req.user.uid,
      sellingPlaceName: req.user.companyName,
      items: processedItems,
      totalAmount,
      createdAt: new Date().toISOString()
    };
    await db.collection('sales_table').doc(invoiceId).set(invoicePayload);

    res.status(201).json({ id: invoiceId, ...invoicePayload });
  } catch (err) {
    console.error('Error recording sale transaction:', err);
    res.status(500).json({ error: 'Failed to record sales transaction' });
  }
});

module.exports = router;
