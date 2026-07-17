const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { authenticateToken } = require('../middleware/auth');

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Retrieve notifications for the current user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('notifications')
      .where('userId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const notifications = [];
    snapshot.docs.forEach(doc => {
      notifications.push({ id: doc.id, ...doc.data() });
    });

    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
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
 *         description: Notification updated successfully
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const docRef = db.collection('notifications').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const notif = doc.data();
    if (notif.userId !== req.user.uid) {
      return res.status(403).json({ error: 'Access Denied: Notification belongs to another user.' });
    }

    await docRef.update({
      read: true,
      updatedAt: new Date().toISOString()
    });

    res.json({ id: req.params.id, ...notif, read: true });
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ error: 'Failed to dismiss notification' });
  }
});

module.exports = router;
