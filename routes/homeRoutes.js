const express = require('express');
const router = express.Router();

const homeController = require('../controllers/homeController');
const cacheMiddleware = require('../middleware/cacheMiddleware');

// Get all approved homes (cached for fast public reading)
router.get('/', cacheMiddleware({ EX: 300 }), homeController.getApprovedHomes);

module.exports = router;
