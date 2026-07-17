const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const batchCreateSchema = Joi.object({
  batchNo: Joi.string().required(),
  itemNbr: Joi.string().required(),
  mfgDate: Joi.string().isoDate().required(),
  expDate: Joi.string().isoDate().required()
});

const batchUpdateSchema = Joi.object({
  mfgDate: Joi.string().isoDate().optional(),
  expDate: Joi.string().isoDate().optional()
});

/**
 * @swagger
 * /api/batches:
 *   get:
 *     summary: Get all product batches (filtered by user role)
 *     tags: [Batches]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of batches
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = db.collection('batch_status');
    const snapshot = await query.get();
    
    const batches = [];
    snapshot.docs.forEach(doc => {
      batches.push({ id: doc.id, ...doc.data() });
    });

    if (req.user.role === 'Selling Place') {
      const sellerItemsSnapshot = await db.collection('item_list')
        .where('sellingPlaceId', '==', req.user.uid)
        .get();
      const sellerItemIds = sellerItemsSnapshot.docs.map(doc => doc.id);
      
      const filtered = batches.filter(b => sellerItemIds.includes(b.itemNbr));
      return res.json(filtered);
    } else if (req.user.role === 'Vendor') {
      const vendorItemsSnapshot = await db.collection('item_list')
        .where('vendorId', '==', req.user.uid)
        .get();
      const vendorItemIds = vendorItemsSnapshot.docs.map(doc => doc.id);
      
      const filtered = batches.filter(b => vendorItemIds.includes(b.itemNbr));
      return res.json(filtered);
    }

    res.json(batches);
  } catch (err) {
    console.error('Error fetching batches:', err);
    res.status(500).json({ error: 'Failed to fetch batch records' });
  }
});

/**
 * @swagger
 * /api/batches:
 *   post:
 *     summary: Register a new batch status record
 *     tags: [Batches]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [batchNo, itemNbr, mfgDate, expDate]
 *     responses:
 *       201:
 *         description: Batch registered successfully
 */
router.post('/', authenticateToken, requireRole(['Selling Place']), async (req, res) => {
  const { error, value } = batchCreateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const { batchNo, itemNbr, mfgDate, expDate } = value;

    const itemDoc = await db.collection('item_list').doc(itemNbr).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ error: `Item ${itemNbr} not found` });
    }
    if (itemDoc.data().sellingPlaceId !== req.user.uid) {
      return res.status(403).json({ error: 'Access Denied: Product belongs to another store.' });
    }

    const batchPayload = {
      batchNo,
      itemNbr,
      mfgDate,
      expDate,
      createdAt: new Date().toISOString()
    };

    await db.collection('batch_status').doc(batchNo).set(batchPayload);

    const invRef = db.collection('inventory').doc(itemNbr);
    const invDoc = await invRef.get();
    if (invDoc.exists) {
      await invRef.update({
        batchNo,
        updatedAt: new Date().toISOString()
      });
    }

    res.status(201).json(batchPayload);
  } catch (err) {
    console.error('Error creating batch status:', err);
    res.status(500).json({ error: 'Failed to register batch record' });
  }
});

/**
 * @swagger
 * /api/batches/{batchNo}:
 *   put:
 *     summary: Update batch details
 *     tags: [Batches]
 *     security:
 *       - BearerAuth: []
 */
router.put('/:batchNo', authenticateToken, requireRole(['Selling Place']), async (req, res) => {
  const { error, value } = batchUpdateSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const batchRef = db.collection('batch_status').doc(req.params.batchNo);
    const batchDoc = await batchRef.get();
    if (!batchDoc.exists) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    const batchData = batchDoc.data();
    
    const itemDoc = await db.collection('item_list').doc(batchData.itemNbr).get();
    if (itemDoc.exists && itemDoc.data().sellingPlaceId !== req.user.uid) {
      return res.status(403).json({ error: 'Access Denied: Product belongs to another store.' });
    }

    await batchRef.update(value);
    res.json({ batchNo: req.params.batchNo, ...batchData, ...value });
  } catch (err) {
    console.error('Error updating batch:', err);
    res.status(500).json({ error: 'Failed to update batch details' });
  }
});

module.exports = router;
