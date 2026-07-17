const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { db } = require('../config/firebase');
const { authenticateToken, requireRole } = require('../middleware/auth');

const vendorStatusSchema = Joi.object({
  vendorNo: Joi.string().required(),
  vendorName: Joi.string().required(),
  itemNbr: Joi.string().required(),
  sellerId: Joi.string().required()
});

/**
 * @swagger
 * /api/vendor-status:
 *   get:
 *     summary: Retrieve vendor status links (filtered by role)
 *     tags: [VendorStatus]
 *     security:
 *       - BearerAuth: []
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    let query = db.collection('vendor_status');
    
    if (req.user.role === 'Selling Place') {
      query = query.where('sellerId', '==', req.user.uid);
    } else if (req.user.role === 'Vendor') {
      query = query.where('vendorNo', '==', req.user.uid);
    }

    const snapshot = await query.get();
    const list = [];
    snapshot.docs.forEach(doc => {
      list.push({ id: doc.id, ...doc.data() });
    });

    res.json(list);
  } catch (err) {
    console.error('Error fetching vendor status:', err);
    res.status(500).json({ error: 'Failed to retrieve vendor status relations' });
  }
});

/**
 * @swagger
 * /api/vendor-status:
 *   post:
 *     summary: Establish a new vendor status relationship
 *     tags: [VendorStatus]
 *     security:
 *       - BearerAuth: []
 */
router.post('/', authenticateToken, async (req, res) => {
  const { error, value } = vendorStatusSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const { vendorNo, vendorName, itemNbr, sellerId } = value;
    const docId = `${vendorNo}_${itemNbr}`;
    
    const payload = {
      vendorNo,
      vendorName,
      itemNbr,
      sellerId,
      createdAt: new Date().toISOString()
    };

    await db.collection('vendor_status').doc(docId).set(payload);
    res.status(201).json({ id: docId, ...payload });
  } catch (err) {
    console.error('Error creating vendor status:', err);
    res.status(500).json({ error: 'Failed to create vendor status relationship' });
  }
});

module.exports = router;
