const { auth } = require('../config/firebase');

// Verify Firebase ID Token
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
    
    // Verify token with Firebase
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Attach user info to request
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

// Optional: Check if user exists in database
const checkUserExists = async (req, res, next) => {
  try {
    // You can add database check here
    // const user = await User.findOne({ uid: req.user.uid });
    // if (!user) return res.status(404).json({ message: 'User not found' });
    
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { verifyToken, checkUserExists };