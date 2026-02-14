const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, verifySession } = require('../middleware/authMiddleware');

// ✅ NEW: Create session (login)
router.post('/session', authController.createSession);

// ✅ NEW: Logout
router.post('/logout', verifySession, authController.logout);

// Protected routes (now use verifySession instead of verifyToken)
router.post('/verify', verifySession, authController.verifyAuth);
router.post('/sync', verifySession, authController.syncUser);
router.get('/users', verifySession, authController.getAllUsers);

module.exports = router;