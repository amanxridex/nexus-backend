const { auth } = require('../config/firebase');
const jwt = require('jsonwebtoken');

// ✅ ADDED: Import Supabase
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ✅ NEW: Create session cookie after Firebase login
exports.createSession = async (req, res) => {
  try {
    const { idToken } = req.body;
    
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
    
    // ✅ FIXED: Cookie settings for cross-origin
    res.cookie('nexus_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
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
      secure: true,
      sameSite: 'none',
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
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ 
        success: false, 
        exists: false,
        error: 'Invalid session' 
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, firebase_uid, email, full_name, phone')
      .eq('firebase_uid', req.user.uid)
      .single();

    if (error || !user) {
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

// ✅ UPDATED: Verify auth using cookie
exports.verifyAuth = async (req, res) => {
  try {
    const user = req.user;
    
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

// Sync user
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

// Get all users
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