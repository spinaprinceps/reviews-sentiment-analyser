const { pool } = require('../db');

// Finds the traveller with this email, or creates them; signing in again with a new
// name updates it. Demo sign-in only: there is no password.
async function signIn(email, name) {
  const result = await pool.query(
    `INSERT INTO travellers (email, name)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id, email, name`,
    [email, name]
  );
  return result.rows[0];
}

// One traveller, or null if the id doesn't exist.
async function getTraveller(travellerId) {
  const result = await pool.query('SELECT id, email, name FROM travellers WHERE id = $1', [
    travellerId,
  ]);
  return result.rows[0] ?? null;
}

// A traveller's bookings, latest stay first. can_review is true once the stay has begun.
async function listBookings(travellerId) {
  const result = await pool.query(
    `SELECT b.id, b.hotel_id, h.name AS hotel_name, h.city, b.check_in, b.check_out,
            b.check_in <= current_date AS can_review
     FROM bookings b
     JOIN hotels h ON h.id = b.hotel_id
     WHERE b.traveller_id = $1
     ORDER BY b.check_in DESC, b.id DESC`,
    [travellerId]
  );
  return result.rows;
}

// Saves a booking and returns it in the same shape as listBookings.
async function createBooking(travellerId, hotelId, checkIn, checkOut) {
  const result = await pool.query(
    `WITH saved AS (
       INSERT INTO bookings (traveller_id, hotel_id, check_in, check_out)
       VALUES ($1, $2, $3, $4)
       RETURNING id, hotel_id, check_in, check_out
     )
     SELECT saved.id, saved.hotel_id, h.name AS hotel_name, h.city, saved.check_in, saved.check_out,
            saved.check_in <= current_date AS can_review
     FROM saved
     JOIN hotels h ON h.id = saved.hotel_id`,
    [travellerId, hotelId, checkIn, checkOut]
  );
  return result.rows[0];
}

module.exports = { signIn, getTraveller, listBookings, createBooking };
