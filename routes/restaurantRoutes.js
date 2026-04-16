const express = require('express');
const router = express.Router();
const { getRestaurants, trackMetrics } = require('../controllers/restaurantController');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Use cache to prevent hammering the DB (cache for 5 minutes)
router.get('/', cacheMiddleware({ EX: 300 }), getRestaurants);

// Metric Tracking (No Cache)
router.post('/:id/track', trackMetrics);

module.exports = router;
