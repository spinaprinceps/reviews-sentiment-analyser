const express = require('express');
const recommendationsController = require('../controllers/recommendations.controller');

const router = express.Router();

router.get('/', recommendationsController.recommend);

module.exports = router;
