const express = require('express');
const router = express.Router();
const gymController = require('../controllers/gymController');
const cacheMiddleware = require('../middleware/cacheMiddleware');
const { queryLimiter } = require('../middleware/rateLimiter');

// Public route to fetch approved gyms
router.get('/', queryLimiter, cacheMiddleware({ EX: 300 }), gymController.getGyms);

module.exports = router;
