const express = require('express');
const hotelsController = require('../controllers/hotels.controller');

const router = express.Router();

router.get('/', hotelsController.list);

module.exports = router;
