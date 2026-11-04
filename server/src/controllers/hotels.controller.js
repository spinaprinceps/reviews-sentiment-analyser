const hotelsService = require('../services/hotels.service');
const { ASPECTS } = require('../lib/aspects');

const ASPECT_NAMES = Object.keys(ASPECTS);

// A query string value as trimmed text, or null if it's missing or not a single value.
const text = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

// A URL id as a positive whole number, or null if it isn't one.
const id = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

// Finds the hotel named in the URL. If the id is bad or unknown, sends the
// error response and returns null, so the caller just stops.
async function findHotel(req, res) {
  const hotelId = id(req.params.id);
  if (!hotelId) {
    res.status(400).json({ error: 'Hotel id must be a positive whole number' });
    return null;
  }

  const hotel = await hotelsService.getHotel(hotelId);
  if (!hotel) {
    res.status(404).json({ error: 'Hotel not found' });
    return null;
  }
  return hotel;
}

async function list(req, res) {
  const hotels = await hotelsService.listHotels({
    city: text(req.query.city),
    q: text(req.query.q),
  });
  res.json(hotels);
}

async function aspects(req, res) {
  const hotel = await findHotel(req, res);
  if (!hotel) return;

  res.json({ hotel, aspects: await hotelsService.aspectSummary(hotel.id) });
}

async function trends(req, res) {
  const hotel = await findHotel(req, res);
  if (!hotel) return;

  const aspect = text(req.query.aspect);
  if (!ASPECT_NAMES.includes(aspect)) {
    return res.status(400).json({ error: `aspect must be one of: ${ASPECT_NAMES.join(', ')}` });
  }

  res.json({ hotel, aspect, months: await hotelsService.monthlyTrend(hotel.id, aspect) });
}

async function alerts(req, res) {
  const hotel = await findHotel(req, res);
  if (!hotel) return;

  res.json({ hotel, alerts: await hotelsService.listAlerts(hotel.id) });
}

module.exports = { list, aspects, trends, alerts };


