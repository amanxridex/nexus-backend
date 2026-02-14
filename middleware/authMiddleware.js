const { auth } = require('../config/firebase');
const jwt = require('jsonwebtoken'); // ✅ ADDED

// ✅ NEW: Verify session cookie (replaces Firebase token verification)
const verifySession = async (req, res, next) => {
  try {
    const token = req.cookies.nexus_session;
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No session found.' 
      });
    }

    // Verify JWT session token
    const decoded = jwt.verify(token, process.env.COOKIE_SECRET);
    
    req.user = {
      uid: decoded.uid,
      phone: decoded.phone || null,
      email: decoded.email || null,
      name: decoded.name || null
    };
    
    next();
    
  } catch (error) {
    console.error('Session verification failed:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired session' 
    });
  }
};

// ✅ OLD: Keep for backward compatibility during transition
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    
    req.user = {
      uid: decodedToken.uid,
      phone: decodedToken.phone_number || null,
      email: decodedToken.email || null,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null
    };
    
    next();
    
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

module.exports = { verifyToken, verifySession };