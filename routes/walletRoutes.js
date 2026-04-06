const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { verifySession } = require('../middleware/authMiddleware');

router.post('/update', verifySession, walletController.updateWallet);

module.exports = router;
