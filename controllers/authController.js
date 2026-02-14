const { auth } = require('../config/firebase');
const jwt = require('jsonwebtoken'); // ✅ ADDED

// ✅ NEW: Create session cookie after Firebase login
exports.createSession = async (req, res) => {
  try {
    const { idToken } = req.body; // Firebase ID token from frontend
    
    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Create custom session token (30 days expiry)
    const sessionToken = jwt.sign(
      { 
        uid: decodedToken.uid,
        phone: decodedToken.phone_number,
        email: decodedToken.email,
        name: decodedToken.name
      },
      process.env.COOKIE_SECRET,
      { expiresIn: '30d' }
    );
    
    // Set HTTP Only cookie
    res.cookie('nexus_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });
    
    res.json({
      success: true,
      message: 'Session created',
      user: {
        uid: decodedToken.uid,
        phone: decodedToken.phone_number,
        email: decodedToken.email,
        name: decodedToken.name
      }
    });
    
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ success: false, message: 'Failed to create session' });
  }
};

// ✅ NEW: Logout - clear cookie
exports.logout = async (req, res) => {
  try {
    res.clearCookie('nexus_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    res.json({ success: true, message: 'Logged out successfully' });
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

// ✅ NEW: Check if user session is valid (for frontend auth check)
exports.checkUser = async (req, res) => {
  try {
    // req.user is set by verifySession middleware
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ 
        success: false, 
        exists: false,
        error: 'Invalid session' 
      });
    }

    // Optional: Verify user exists in database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, firebase_uid, email, full_name, phone')
      .eq('firebase_uid', req.user.uid)
      .single();

    if (error || !user) {
      // Session valid but no profile yet
      return res.json({ 
        success: true, 
        exists: false,
        uid: req.user.uid,
        message: 'Session valid but profile not complete'
      });
    }

    res.json({ 
      success: true, 
      exists: true,
      user: {
        uid: user.firebase_uid,
        email: user.email,
        name: user.full_name,
        phone: user.phone
      }
    });

  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ 
      success: false, 
      exists: false,
      error: 'Failed to check session' 
    });
  }
};

// ✅ UPDATED: Verify auth using cookie instead of Firebase token
exports.verifyAuth = async (req, res) => {
  try {
    const user = req.user; // Set by verifySession middleware
    
    res.status(200).json({
      success: true,
      message: 'Authenticated successfully',
      user: {
        uid: user.uid,
        phone: user.phone,
        email: user.email,
        name: user.name
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication verification failed'
    });
  }
};

// Sync user (same as before)
exports.syncUser = async (req, res) => {
  try {
    const { uid, phone, email, name, photoURL } = req.user;
    
    res.status(200).json({
      success: true,
      message: 'User synced successfully',
      user: { uid, phone, email, name, photoURL }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to sync user'
    });
  }
};

// Get all users (same as before)
exports.getAllUsers = async (req, res) => {
  try {
    const listUsers = await auth.listUsers();
    const users = listUsers.users.map(user => ({
      uid: user.uid,
      phone: user.phoneNumber,
      email: user.email,
      name: user.displayName,
      createdAt: user.metadata.creationTime
    }));
    
    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};