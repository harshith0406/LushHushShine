const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Schema for PO items
const poItemSchema = Joi.object({
  productId: Joi.string().required(),
  productName: Joi.string().required(),
  quantity: Joi.number().integer().positive().required(),
  price: Joi.number().positive().required()
});

// Schema for creating PO
const poCreateSchema = Joi.object({
  vendorId: Joi.string().required(),
  vendorName: Joi.string().required(),
  items: Joi.array().items(poItemSchema).min(1).required()
});

// Schema for updating PO status
const poStatusUpdateSchema = Joi.object({
  status: Joi.string().valid('Pending', 'Approved', 'Shipped', 'Completed', 'Rejected').required()
});

/**
 * @swagger
 * /api/purchase-orders:
 *   get:
 *     summary: Get all purchase orders (filtered by user role)
 *     tags: [Purchase Orders]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of purchase orders
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = db.collection('purchaseOrders');

    if (req.user.role === 'Selling Place') {
      query = query.where('sellingPlaceId', '==', req.user.uid);
    } else if (req.user.role === 'Vendor') {
      query = query.where('vendorId', '==', req.user.uid);
    } else {
      return res.status(403).json({ error: 'Unrecognized user role' });
    }

    const snapshot = await query.get();
    const pos = [];
    snapshot.docs.forEach(doc => {
      pos.push({ id: doc.id, ...doc.data() });
    });

    res.json(pos);
  } catch (err) {
    console.error('Error fetching purchase orders:', err);
    res.status(500).json({ error: 'Failed to fetch purchase orders' });
  }
});

/**
 * @swagger
 * /api/purchase-orders:
 *   post:
 *     summary: Create a replenishment Purchase Order (Selling Place only)
 *     tags: [Purchase Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [vendorId, vendorName, items]
 *             properties:
 *               vendorId: { type: string }
 *               vendorName: { type: string }
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [productId, productName, quantity, price]
 *                   properties:
 *                     productId: { type: string }
 *                     productName: { type: string }
 *                     quantity: { type: integer }
 *                     price: { type: number }
 *     responses:
 *       201:
 *         description: Purchase Order created
 */
router.post('/', authenticateToken, requireRole(['Selling Place']), async (req, res) => {
  const { error, value } = poCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { vendorId, vendorName, items } = value;

  try {
    const poPayload = {
      sellingPlaceId: req.user.uid,
      sellingPlaceName: req.user.companyName,
      vendorId,
      vendorName,
      items,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('purchaseOrders').add(poPayload);

    // Send notification to Vendor
    await db.collection('notifications').add({
      userId: vendorId,
      title: 'New Purchase Order Received',
      message: `You received a new purchase order (${docRef.id}) from Retailer '${req.user.companyName}' with ${items.length} items.`,
      type: 'po-received',
      poId: docRef.id,
      read: false,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ id: docRef.id, ...poPayload });
  } catch (err) {
    console.error('Error creating purchase order:', err);
    res.status(500).json({ error: 'Failed to create purchase order' });
  }
});

/**
 * @swagger
 * /api/purchase-orders/{id}/status:
 *   put:
 *     summary: Update Purchase Order status (Approved, Shipped, Completed, etc.)
 *     tags: [Purchase Orders]
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [Pending, Approved, Shipped, Completed, Rejected] }
 *     responses:
 *       200:
 *         description: Purchase Order status updated
 */
router.put('/:id/status', authenticateToken, async (req, res) => {
  const { error, value } = poStatusUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const newStatus = value.status;

  try {
    const poDocRef = db.collection('purchaseOrders').doc(req.params.id);
    const poDoc = await poDocRef.get();
    if (!poDoc.exists) {
      return res.status(404).json({ error: 'Purchase Order not found' });
    }

    const po = poDoc.data();

    // Verify access rights & state workflow
    if (req.user.role === 'Vendor') {
      if (po.vendorId !== req.user.uid) {
        return res.status(403).json({ error: 'Access Denied: Purchase order sent to a different vendor.' });
      }
      if (['Completed'].includes(newStatus)) {
        return res.status(400).json({ error: 'Only Selling Places can mark orders as Completed upon delivery.' });
      }
    } else if (req.user.role === 'Selling Place') {
      if (po.sellingPlaceId !== req.user.uid) {
        return res.status(403).json({ error: 'Access Denied: Purchase order created by a different store.' });
      }
      if (['Approved', 'Shipped', 'Rejected'].includes(newStatus)) {
        return res.status(400).json({ error: 'Only Vendors can Approve, Ship or Reject purchase orders.' });
      }
    }

    // Update PO Status
    await poDocRef.update({
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    // Workflow Logic triggers
    if (newStatus === 'Completed') {
      // 1. Receipt confirmation: Loop through items and add them to Selling Place's inventory
      for (const item of po.items) {
        const invDocRef = db.collection('inventory').doc(item.productId);
        const invDoc = await invDocRef.get();
        if (invDoc.exists) {
          const invData = invDoc.data();
          const currentStock = invData.stock || 0;
          await invDocRef.update({
            stock: currentStock + item.quantity,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // 2. Alert the Vendor that the retailer received the shipment
      await db.collection('notifications').add({
        userId: po.vendorId,
        title: 'Shipment Delivered',
        message: `Retailer '${po.sellingPlaceName}' confirmed delivery of purchase order (${req.params.id}). Stock has been added to their inventory.`,
        type: 'po-completed',
        poId: req.params.id,
        read: false,
        createdAt: new Date().toISOString()
      });
    } else {
      // Alert the Retailer that Vendor changed status (Approved, Shipped, Rejected)
      await db.collection('notifications').add({
        userId: po.sellingPlaceId,
        title: `Purchase Order ${newStatus}`,
        message: `Vendor '${po.vendorName}' marked purchase order (${req.params.id}) as '${newStatus}'.`,
        type: `po-${newStatus.toLowerCase()}`,
        poId: req.params.id,
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    res.json({ id: req.params.id, ...po, status: newStatus });
  } catch (err) {
    console.error('Error updating purchase order status:', err);
    res.status(500).json({ error: 'Failed to update purchase order status' });
  }
});

module.exports = router;
