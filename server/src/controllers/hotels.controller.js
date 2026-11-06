const hotelsService = require('../services/hotels.service');
const { ASPECTS } = require('../lib/aspects');

const reviewsService = require('../services/reviews.service');
const notificationsService = require('../services/notifications.service');
const { TRIP_TAGS, TRAVELLER_TAGS } = require('../lib/clean');

const ASPECT_NAMES = Object.keys(ASPECTS);

// The values a review may use, taken from the CSV loader's own mappings.
const TRIP_TYPES = [...new Set(Object.values(TRIP_TAGS))]; // business, leisure
const TRAVELLER_TYPES = [...new Set(Object.values(TRAVELLER_TAGS))]; // couple, solo, group, family, friends
const MAX_TEXT = 2000;

const { text, id } = require('../lib/params');

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

// Checks a submitted review. Returns { review } if it's fine, or { error } saying what's wrong.
function parseReview(body) {
  const optionalText = (value) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

  const positive_text = optionalText(body?.positive_text);
  const negative_text = optionalText(body?.negative_text);
  if (!positive_text && !negative_text) {
    return { error: 'Write at least one of positive_text or negative_text' };
  }
  if ((positive_text ?? '').length > MAX_TEXT || (negative_text ?? '').length > MAX_TEXT) {
    return { error: `Each text can be at most ${MAX_TEXT} characters` };
  }

  const score = body.reviewer_score;
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 1 || score > 10) {
    return { error: 'reviewer_score must be a number from 1 to 10' };
  }

  const trip_type = body.trip_type ?? null;
  if (trip_type !== null && !TRIP_TYPES.includes(trip_type)) {
    return { error: `trip_type must be one of: ${TRIP_TYPES.join(', ')}` };
  }

  const traveller_type = body.traveller_type ?? null;
  if (traveller_type !== null && !TRAVELLER_TYPES.includes(traveller_type)) {
    return { error: `traveller_type must be one of: ${TRAVELLER_TYPES.join(', ')}` };
  }

  return {
    review: {
      positive_text,
      negative_text,
      reviewer_score: Math.round(score * 10) / 10,
      trip_type,
      traveller_type,
    },
  };
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

async function createReview(req, res) {
  const hotel = await findHotel(req, res);
  if (!hotel) return;

  const { review, error } = parseReview(req.body);
  if (error) return res.status(400).json({ error });

  const saved = await reviewsService.createReview(hotel, review);
  if (!saved) {
    return res.status(409).json({ error: 'This review was already submitted today' });
  }

  res.status(201).json(saved);
}

// GET /api/hotels/:id/notifications: the hotel staff's inbox.
async function notifications(req, res) {
  const hotel = await findHotel(req, res);
  if (!hotel) return;

  res.json({ hotel, notifications: await notificationsService.forHotel(hotel.id) });
}

module.exports = { list, aspects, trends, alerts, createReview, notifications };


