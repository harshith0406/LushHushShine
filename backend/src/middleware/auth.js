const { auth, db } = require('../config/firebase');

/**
 * Authentication Middleware
 * Validates the Firebase (or Mock) ID Token passed in Authorization header.
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please sign in.' });
  }

  // --- Stateless fallback for pre-seeded admin (survives cold-starts) ---
  if (token === 'mock-token-admin-uid-123') {
    req.user = {
      uid: 'admin-uid-123',
      email: 'admin@shoply.ai',
      name: 'Shoply Admin',
      companyName: 'Shoply HQ',
      role: 'Selling Place',
      phone: '1234567890',
      address: '123 Shoply Way',
      licenseNo: ''
    };
    return next();
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    
    // Retrieve complete user profile (including company name, role, etc.) from Firestore
    const userDoc = await db.collection('login_credentials').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found in database.' });
    }

    const userProfile = userDoc.data();
    
    // Map database roles ('seller', 'vendor') to UI roles ('Selling Place', 'Vendor')
    let appRole = userProfile.role;
    if (userProfile.role === 'seller') appRole = 'Selling Place';
    else if (userProfile.role === 'vendor') appRole = 'Vendor';

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: userProfile.name || userProfile.userName || userProfile.displayName || '',
      companyName: userProfile.companyName || '',
      role: appRole,
      phone: userProfile.phoneNo || userProfile.phone || '',
      address: userProfile.address || '',
      licenseNo: userProfile.licenseNo || ''
    };

    next();
  } catch (error) {
    console.error('Auth verification error:', error.message);
    return res.status(403).json({ error: 'Session expired or invalid credentials.' });
  }
};

/**
 * Enforces role membership.
 * @param {Array<string>} allowedRoles - Roles allowed to access the route ('Selling Place', 'Vendor')
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Access Denied: Required role [${allowedRoles.join(', ')}]. You are registered as [${req.user.role}].` 
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
