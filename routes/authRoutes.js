const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public routes
// POST /api/auth/verify - Verify Firebase token from frontend
router.post('/verify', verifyToken, authController.verifyAuth);

// POST /api/auth/sync - Sync user data after signup
router.post('/sync', verifyToken, authController.syncUser);

// Protected admin routes
// GET /api/auth/users - Get all users (admin only)
router.get('/users', verifyToken, authController.getAllUsers);

module.exports = router;