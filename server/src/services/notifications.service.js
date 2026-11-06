const { pool } = require('../db');

const COLUMNS = `n.id, n.message, n.created_at, n.read_at, n.hotel_id, h.name AS hotel_name,
                 a.aspect, n.booking_id`;

// A traveller's notifications, newest first.
async function forTraveller(travellerId) {
  const result = await pool.query(
    `SELECT ${COLUMNS}
     FROM notifications n
     JOIN hotels h ON h.id = n.hotel_id
     JOIN alerts a ON a.id = n.alert_id
     WHERE n.traveller_id = $1
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT 50`,
    [travellerId]
  );
  return result.rows;
}

// The hotel staff's own notifications (the ones not addressed to a traveller), newest first.
async function forHotel(hotelId) {
  const result = await pool.query(
    `SELECT ${COLUMNS}
     FROM notifications n
     JOIN hotels h ON h.id = n.hotel_id
     JOIN alerts a ON a.id = n.alert_id
     WHERE n.hotel_id = $1 AND n.traveller_id IS NULL
     ORDER BY n.created_at DESC, n.id DESC
     LIMIT 50`,
    [hotelId]
  );
  return result.rows;
}

// Marks a notification as read, keeping the first read time. Null if the id doesn't exist.
async function markRead(notificationId) {
  const result = await pool.query(
    `UPDATE notifications SET read_at = coalesce(read_at, now())
     WHERE id = $1
     RETURNING id, read_at`,
    [notificationId]
  );
  return result.rows[0] ?? null;
}

module.exports = { forTraveller, forHotel, markRead };
