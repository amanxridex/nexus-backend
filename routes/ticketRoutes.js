const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { verifyToken } = require('../middleware/authMiddleware');

// Public routes
router.get('/', ticketController.getTickets);

// Protected routes
router.post('/', verifyToken, ticketController.createTicket);
router.post('/:ticketId/buy', verifyToken, ticketController.buyTicket);

module.exports = router;