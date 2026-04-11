const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken } = require('../middleware/authMiddleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Public routes
router.get('/', cacheMiddleware({ EX: 300 }), ticketController.getTickets);

// ✅ ADD THESE - For QR Scanner
router.get('/by-ticket-id/:ticketId', ticketController.getTicketById);
router.patch('/:ticketId/mark-used', ticketController.markTicketUsed);

// Protected routes
router.post('/', verifyToken, ticketController.createTicket);
router.post('/:ticketId/buy', verifyToken, ticketController.buyTicket);

module.exports = router;