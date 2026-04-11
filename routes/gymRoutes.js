const express = require('express');
const router = express.Router();
const gymController = require('../controllers/gymController');

// Public route to fetch approved gyms
router.get('/', gymController.getGyms);

module.exports = router;
