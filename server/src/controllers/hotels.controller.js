const hotelsService = require('../services/hotels.service');

// A query string value as trimmed text, or null if it's missing or not a single value.
const text = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

async function list(req, res) {
  const hotels = await hotelsService.listHotels({
    city: text(req.query.city),
    q: text(req.query.q),
  });
  res.json(hotels);
}

module.exports = { list };
