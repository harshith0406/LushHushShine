const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const inventoryUpdateSchema = Joi.object({
  stock: Joi.number().integer().min(0).optional(),
  reorderPoint: Joi.number().integer().min(0).optional(),
  averageDailySales: Joi.number().min(0).optional(),
  standardDeviation: Joi.number().min(0).optional(),
  leadTimeDays: Joi.number().integer().positive().optional()
});

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Get inventory levels (filtered by user role)
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of inventory items
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = db.collection('inventory');

    if (req.user.role === 'Selling Place') {
      query = query.where('sellingPlaceId', '==', req.user.uid);
    } else if (req.user.role === 'Vendor') {
      query = query.where('vendorId', '==', req.user.uid);
    } else {
      return res.status(403).json({ error: 'Unrecognized user role' });
    }

    const snapshot = await query.get();
    const inventory = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const availableQty = data.availableQty !== undefined ? data.availableQty : (data.stock || 0);
      const soldQty = data.soldQty || 0;
      const totalQty = data.totalQty !== undefined ? data.totalQty : (availableQty + soldQty);

      inventory.push({
        id: doc.id,
        itemNbr: data.itemNbr || doc.id,
        batchNo: data.batchNo || 'B-DEFAULT',
        totalQty,
        soldQty,
        availableQty,
        updatedAt: data.updatedAt,
        productId: data.productId || doc.id,
        productName: data.productName || '',
        sku: data.sku || '',
        category: data.category || '',
        stock: availableQty,
        reorderPoint: data.reorderPoint !== undefined ? data.reorderPoint : 10,
        averageDailySales: data.averageDailySales || 0.0,
        standardDeviation: data.standardDeviation || 1.0,
        leadTimeDays: data.leadTimeDays || 5,
        sellingPlaceId: data.sellingPlaceId || '',
        sellingPlaceName: data.sellingPlaceName || '',
        vendorId: data.vendorId || '',
        vendorName: data.vendorName || ''
      });
    });

    res.json(inventory);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

/**
 * @swagger
 * /api/inventory/{productId}:
 *   put:
 *     summary: Update inventory metrics (Selling Place only)
 *     tags: [Inventory]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
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
 *               stock: { type: integer }
 *               reorderPoint: { type: integer }
 *               averageDailySales: { type: number }
 *               standardDeviation: { type: number }
 *               leadTimeDays: { type: integer }
 *     responses:
 *       200:
 *         description: Inventory updated successfully
 */
router.put('/:productId', authenticateToken, requireRole(['Selling Place']), async (req, res) => {
  const { error, value } = inventoryUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const docRef = db.collection('inventory').doc(req.params.productId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Inventory record not found for this product ID' });
    }

    const invItem = doc.data();
    if (invItem.sellingPlaceId !== req.user.uid) {
      return res.status(403).json({ error: 'Access Denied: Product belongs to another store.' });
    }

    const updatedPayload = {
      ...value,
      updatedAt: new Date().toISOString()
    };

    if (value.stock !== undefined) {
      updatedPayload.availableQty = value.stock;
      const currentSold = invItem.soldQty || 0;
      updatedPayload.totalQty = value.stock + currentSold;
      updatedPayload.stock = value.stock;
    }

    await docRef.update(updatedPayload);

    const currentStock = value.stock !== undefined ? value.stock : (invItem.availableQty !== undefined ? invItem.availableQty : invItem.stock);
    const currentReorderPoint = value.reorderPoint !== undefined ? value.reorderPoint : invItem.reorderPoint;

    if (currentStock <= currentReorderPoint) {
      await db.collection('notifications').add({
        userId: req.user.uid,
        title: 'Low Stock Alert',
        message: `Stock for '${invItem.productName || 'Item'}' is at ${currentStock} units (Reorder Point: ${currentReorderPoint}). Consider ordering more units from supplied Vendor: '${invItem.vendorName || 'Vendor'}'.`,
        type: 'low-stock',
        read: false,
        createdAt: new Date().toISOString()
      });

      await db.collection('notifications').add({
        userId: invItem.vendorId,
        title: 'Retailer Low Stock Alert',
        message: `Retailer '${req.user.companyName}' is running low on '${invItem.productName || 'Item'}' (Stock: ${currentStock}, Reorder Point: ${currentReorderPoint}). Demand forecasting recommends preparing a restock order.`,
        type: 'low-stock-vendor',
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ id: req.params.productId, ...invItem, ...updatedPayload });
  } catch (err) {
    console.error('Error updating inventory:', err);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

module.exports = router;
