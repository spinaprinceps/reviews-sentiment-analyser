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

// One hotel, or null if the id doesn't exist.
async function getHotel(hotelId) {
  const result = await pool.query(
    'SELECT id, name, address, city, country, lat, lng FROM hotels WHERE id = $1',
    [hotelId]
  );
  return result.rows[0] ?? null;
}

// All-time good and bad counts per aspect, next to the average for hotels in the same city.
async function aspectSummary(hotelId) {
  const result = await pool.query(
    `WITH mine AS (
       SELECT aspect,
              sum(positive_count)::int AS positive,
              sum(negative_count)::int AS negative
       FROM hotel_aspect_monthly
       WHERE hotel_id = $1
       GROUP BY aspect
     ),
     city AS (
       SELECT m.aspect,
              round(100.0 * sum(m.negative_count) / sum(m.positive_count + m.negative_count), 1)::float
                AS city_pct_negative
       FROM hotel_aspect_monthly m
       JOIN hotels h ON h.id = m.hotel_id
       WHERE h.city = (SELECT city FROM hotels WHERE id = $1)
       GROUP BY m.aspect
     )
     SELECT mine.aspect, mine.positive, mine.negative,
            round(100.0 * mine.negative / (mine.positive + mine.negative), 1)::float AS pct_negative,
            city.city_pct_negative
     FROM mine
     JOIN city USING (aspect)
     ORDER BY pct_negative DESC`,
    [hotelId]
  );
  return result.rows;
}

// One aspect's good and bad counts for every month, oldest first, for a chart.
async function monthlyTrend(hotelId, aspect) {
  const result = await pool.query(
    `SELECT month,
            positive_count AS positive,
            negative_count AS negative,
            round(100.0 * negative_count / (positive_count + negative_count), 1)::float AS pct_negative
     FROM hotel_aspect_monthly
     WHERE hotel_id = $1 AND aspect = $2
     ORDER BY month`,
    [hotelId, aspect]
  );
  return result.rows;
}

// A hotel's alerts, newest month first, each with up to 3 complaints from that month as evidence.
async function listAlerts(hotelId) {
  const result = await pool.query(
    `SELECT a.id, a.aspect, a.alert_type, a.month, a.baseline_value, a.current_value,
            a.mentions, a.status, a.detected_at, e.evidence
     FROM alerts a
     CROSS JOIN LATERAL (
       SELECT coalesce(json_agg(m.sentence), '[]'::json) AS evidence
       FROM (
         SELECT sentence
         FROM aspect_mentions
         WHERE hotel_id = a.hotel_id
           AND aspect = a.aspect
           AND polarity = -1
           AND review_date >= a.month
           AND review_date < a.month + INTERVAL '1 month'
         ORDER BY id
         LIMIT 3
       ) m
     ) e
     WHERE a.hotel_id = $1
     ORDER BY a.month DESC, a.current_value - a.baseline_value DESC`,
    [hotelId]
  );
  return result.rows;
}

module.exports = { listHotels, getHotel, aspectSummary, monthlyTrend, listAlerts };
