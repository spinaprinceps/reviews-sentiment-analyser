const express = require('express');
const travellersController = require('../controllers/travellers.controller');

const router = express.Router();

router.post('/', travellersController.signIn);
router.get('/:id/bookings', travellersController.bookings);
router.post('/:id/bookings', travellersController.book);
router.get('/:id/notifications', travellersController.notifications);

module.exports = router;
