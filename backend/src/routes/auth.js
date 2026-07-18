const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { auth, db, isMock } = require('../config/firebase');
const { authenticateToken } = require('../middleware/auth');

// Validation schema for registration
const registerSchema = Joi.object({
  companyName: Joi.string().required(),
  userName: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  phone: Joi.string().required(),
  address: Joi.string().required(),
  role: Joi.string().valid('Selling Place', 'Vendor').required(),
  licenseNo: Joi.string().allow('').optional()
});

// Validation schema for login (only used as a fallback/mock API)
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user profile
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [companyName, userName, email, password, phone, address, role]
 *             properties:
 *               companyName: { type: string }
 *               userName: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               phone: { type: string }
 *               address: { type: string }
 *               role: { type: string, enum: [Selling Place, Vendor] }
 *               licenseNo: { type: string }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { companyName, userName, email, password, phone, address, role, licenseNo = '' } = value;

  try {
    let uid;
    if (isMock || process.env.DATABASE_URL || process.env['1hsdb_DATABASE_URL']) {
      // Mock mode or Postgres mode registration
      const mockUser = await auth.createUser({
        email,
        displayName: userName,
        phoneNumber: phone
      });
      uid = mockUser.uid;
    } else {
      // Create user in Firebase Authentication
      const firebaseAdmin = require('firebase-admin');
      const userRecord = await firebaseAdmin.auth().createUser({
        email,
        password,
        displayName: userName,
        phoneNumber: phone
      });
      uid = userRecord.uid;
    }

    // Save profile attributes in Firestore (under 'login_credentials' collection)
    const dbRole = role === 'Selling Place' ? 'seller' : 'vendor';
    const userProfile = {
      uid,
      companyName,
      name: userName,
      email,
      phoneNo: phone,
      address,
      role: dbRole,
      licenseNo,
      createdAt: new Date().toISOString()
    };
    await db.collection('login_credentials').doc(uid).set(userProfile);

    // Also register under respective collection for easier querying
    const specificCollection = role === 'Selling Place' ? 'sellingPlaces' : 'vendors';
    await db.collection(specificCollection).doc(uid).set({
      id: uid,
      companyName,
      userName,
      email,
      phone,
      address,
      licenseNo,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      message: 'Registration successful',
      user: { uid, email, userName, role }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message || 'Error creating user profile' });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Log in (primarily used in local mock mode fallback)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful, returns token
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email } = value;

  try {
    // In Mock Mode, we lookup the user by email in the mock json file
    const usersSnapshot = await db.collection('login_credentials').where('email', '==', email).get();
    if (usersSnapshot.empty) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    const doc = usersSnapshot.docs[0];
    const userProfile = doc.data();

    // Generate a mock token
    const mockToken = `mock-token-${doc.id}`;

    // Map database role ('seller', 'vendor') back to UI format
    let appRole = userProfile.role;
    if (userProfile.role === 'seller') appRole = 'Selling Place';
    else if (userProfile.role === 'vendor') appRole = 'Vendor';

    res.json({
      message: 'Login successful',
      token: mockToken,
      user: {
        uid: doc.id,
        email: userProfile.email,
        userName: userProfile.name || userProfile.userName || '',
        role: appRole,
        companyName: userProfile.companyName
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Error logging in' });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User profile payload
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

/**
 * @swagger
 * /api/auth/vendors:
 *   get:
 *     summary: Retrieve registered vendors list
 *     tags: [Authentication]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of vendors
 */
router.get('/vendors', authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('vendors').get();
    const vendorsList = [];
    snapshot.docs.forEach(doc => {
      vendorsList.push({ id: doc.id, ...doc.data() });
    });
    res.json(vendorsList);
  } catch (err) {
    console.error('Error fetching vendors:', err);
    res.status(500).json({ error: 'Failed to fetch vendors list' });
  }
});

module.exports = router;
