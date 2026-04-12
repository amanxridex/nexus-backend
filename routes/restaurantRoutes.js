const express = require('express');
const router = express.Router();
const { getRestaurants } = require('../controllers/restaurantController');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Use cache to prevent hammering the DB (cache for 5 minutes)
router.get('/', cacheMiddleware({ EX: 300 }), getRestaurants);

module.exports = router;
