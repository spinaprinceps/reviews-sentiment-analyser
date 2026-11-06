const express = require('express');
const notificationsController = require('../controllers/notifications.controller');

const router = express.Router();

router.post('/:id/read', notificationsController.markRead);

module.exports = router;
