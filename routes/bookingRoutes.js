const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authenticateUser = require('../middleware/authMiddleware');

// All routes require authentication
router.post('/create-order', authenticateUser, bookingController.createOrder);
router.post('/verify-payment', authenticateUser, bookingController.verifyPayment);
router.get('/my-tickets', authenticateUser, bookingController.getMyTickets);

module.exports = router;