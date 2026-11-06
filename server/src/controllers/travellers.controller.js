const travellersService = require('../services/travellers.service');
const hotelsService = require('../services/hotels.service');
const notificationsService = require('../services/notifications.service');
const { text, id, isoDate } = require('../lib/params');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 100;
const MAX_NIGHTS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Finds the traveller named in the URL, or sends 400/404 and returns null.
async function findTraveller(req, res) {
  const travellerId = id(req.params.id);
  if (!travellerId) {
    res.status(400).json({ error: 'Traveller id must be a positive whole number' });
    return null;
  }
  const traveller = await travellersService.getTraveller(travellerId);
  if (!traveller) {
    res.status(404).json({ error: 'Traveller not found' });
    return null;
  }
  return traveller;
}

// POST /api/travellers  { email, name }
async function signIn(req, res) {
  const email = text(req.body?.email)?.toLowerCase() ?? null;
  const name = text(req.body?.name);

  if (!email || !EMAIL.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email, e.g. anna@example.com' });
  }
  if (!name || name.length > MAX_NAME) {
    return res.status(400).json({ error: `Enter a name of 1 to ${MAX_NAME} characters` });
  }

  res.json(await travellersService.signIn(email, name));
}

// GET /api/travellers/:id/bookings
async function bookings(req, res) {
  const traveller = await findTraveller(req, res);
  if (!traveller) return;

  res.json({ traveller, bookings: await travellersService.listBookings(traveller.id) });
}

// POST /api/travellers/:id/bookings  { hotel_id, check_in, check_out }
async function book(req, res) {
  const traveller = await findTraveller(req, res);
  if (!traveller) return;

  const hotelId = id(req.body?.hotel_id);
  if (!hotelId) return res.status(400).json({ error: 'hotel_id must be a positive whole number' });

  const checkIn = isoDate(req.body.check_in);
  const checkOut = isoDate(req.body.check_out);
  if (!checkIn || !checkOut) {
    return res.status(400).json({ error: 'check_in and check_out must be dates like 2026-12-01' });
  }

  const nights = (Date.parse(checkOut) - Date.parse(checkIn)) / DAY_MS;
  if (nights < 1 || nights > MAX_NIGHTS) {
    return res.status(400).json({ error: `Check-out must be 1 to ${MAX_NIGHTS} nights after check-in` });
  }

  const hotel = await hotelsService.getHotel(hotelId);
  if (!hotel) return res.status(404).json({ error: 'Hotel not found' });

  const booking = await travellersService.createBooking(traveller.id, hotel.id, checkIn, checkOut);
  res.status(201).json(booking);
}

// GET /api/travellers/:id/notifications
async function notifications(req, res) {
  const traveller = await findTraveller(req, res);
  if (!traveller) return;

  res.json({ notifications: await notificationsService.forTraveller(traveller.id) });
}

module.exports = { signIn, bookings, book, notifications };
