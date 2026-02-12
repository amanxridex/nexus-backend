const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken } = require('../middleware/authMiddleware');

// All routes require authentication
router.post('/create-order', verifyToken, bookingController.createOrder);
router.post('/verify-payment', verifyToken, bookingController.verifyPayment);
router.get('/my-tickets', verifyToken, bookingController.getMyTickets);
// Host verification routes (NEW)
router.post('/verify-ticket/:ticketId', bookingController.verifyTicketForHost);
router.post('/mark-used/:ticketId', bookingController.markTicketUsed);

module.exports = router;