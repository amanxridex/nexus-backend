const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// POST /api/notifications/send
// You might want to add admin middleware here later to securely authorize who can send pushes
router.post('/send', notificationController.sendNotification);

module.exports = router;
