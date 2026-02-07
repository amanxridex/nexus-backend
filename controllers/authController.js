const { auth } = require('../config/firebase');

// Verify token and return user data (called after frontend auth)
exports.verifyAuth = async (req, res) => {
  try {
    // req.user is set by verifyToken middleware
    const user = req.user;
    
    // You can fetch additional user data from your database here
    // const dbUser = await User.findOne({ uid: user.uid });
    
    res.status(200).json({
      success: true,
      message: 'Authenticated successfully',
      user: {
        uid: user.uid,
        phone: user.phone,
        email: user.email,
        name: user.name,
        photoURL: user.picture,
        // Add custom fields from your DB
        // kycVerified: dbUser?.kycVerified || false,
        // walletBalance: dbUser?.walletBalance || 0
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication verification failed'
    });
  }
};

// Create or update user in database after Firebase auth
exports.syncUser = async (req, res) => {
  try {
    const { uid, phone, email, name, photoURL } = req.user;
    
    // Example: Update or create in MongoDB
    /*
    const user = await User.findOneAndUpdate(
      { uid },
      { 
        uid,
        phone,
        email,
        name,
        photoURL,
        lastLogin: new Date()
      },
      { upsert: true, new: true }
    );
    */
    
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

// Admin: Get all users (example admin route)
exports.getAllUsers = async (req, res) => {
  try {
    // Only allow admin users
    // if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin only' });
    
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