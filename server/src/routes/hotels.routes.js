const express = require('express');
const hotelsController = require('../controllers/hotels.controller');

const router = express.Router();

router.get('/', hotelsController.list);
router.get('/:id/aspects', hotelsController.aspects);
router.get('/:id/trends', hotelsController.trends);
router.get('/:id/alerts', hotelsController.alerts);

module.exports = router;
