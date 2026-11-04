const { pool } = require('../db');

// Hotels with the most open alerts first. A null filter is ignored.
async function listHotels({ city, q }) {
  const result = await pool.query(
    `SELECT h.id, h.name, h.city, count(a.id)::int AS open_alerts
     FROM hotels h
     LEFT JOIN alerts a ON a.hotel_id = h.id AND a.status = 'open'
     WHERE ($1::text IS NULL OR h.city = $1)
       AND ($2::text IS NULL OR h.name ILIKE '%' || $2 || '%')
     GROUP BY h.id
     ORDER BY open_alerts DESC, h.name
     LIMIT 50`,
    [city, q]
  );
  return result.rows;
}

module.exports = { listHotels };
