const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken } = require('../middleware/authMiddleware');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const { queryLimiter, strictLimiter } = require('../middleware/rateLimiter');
const { requireIdempotency } = require('../middleware/idempotencyMiddleware');

// Public routes
router.get('/', queryLimiter, cacheMiddleware({ EX: 300 }), ticketController.getTickets);

// o. ADD THESE - For QR Scanner
router.get('/by-ticket-id/:ticketId', strictLimiter, ticketController.getTicketById);
router.patch('/:ticketId/mark-used', strictLimiter, ticketController.markTicketUsed);

// Protected routes
router.post('/', strictLimiter, verifyToken, requireIdempotency({ expireMs: 300000 }), ticketController.createTicket);
router.post('/:ticketId/buy', strictLimiter, verifyToken, requireIdempotency({ expireMs: 300000 }), ticketController.buyTicket);

module.exports = router;