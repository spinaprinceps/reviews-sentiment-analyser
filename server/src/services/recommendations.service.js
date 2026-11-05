const { pool } = require('../db');

// Only the latest months count, measured back from the newest month in the data.
const RECENT_MONTHS = 12;
// An alert this recent on one of the priorities is shown as a warning.
const ALERT_MONTHS = 6;
// Every hotel gets this many imaginary opinions at the city's average rate, so a
// hotel with 3 glowing mentions can't outrank one with 95 good out of 100.
const PRIOR_MENTIONS = 20;
const LIMIT = 10;

// The best hotels in a city for the given aspects, best first.
async function recommendHotels(city, priorities) {
  const result = await pool.query(
    `WITH latest AS (SELECT max(month) AS month FROM hotel_aspect_monthly),
     recent AS (
       SELECT m.hotel_id, m.aspect,
              sum(m.positive_count)::int AS positive,
              sum(m.negative_count)::int AS negative
       FROM hotel_aspect_monthly m
       JOIN hotels h ON h.id = m.hotel_id
       CROSS JOIN latest
       WHERE h.city = $1
         AND m.aspect = ANY($2::text[])
         AND m.month > latest.month - make_interval(months => $3::int)
       GROUP BY m.hotel_id, m.aspect
     ),
     city_rate AS (
       SELECT aspect, sum(positive)::float / sum(positive + negative) AS rate
       FROM recent
       GROUP BY aspect
     ),
     scored AS (
       SELECT r.hotel_id, r.aspect, r.positive + r.negative AS mentions,
              (r.positive + $4::float * c.rate) / (r.positive + r.negative + $4::float) AS satisfaction
       FROM recent r
       JOIN city_rate c USING (aspect)
     )
     SELECT h.id, h.name, h.address, h.lat, h.lng,
            round(100 * avg(s.satisfaction)::numeric, 1)::float AS score,
            json_agg(json_build_object(
              'aspect', s.aspect,
              'pct_positive', round(100 * s.satisfaction::numeric, 1),
              'mentions', s.mentions
            ) ORDER BY s.aspect) AS aspects,
            (SELECT count(*)::int
             FROM alerts a
             CROSS JOIN latest
             WHERE a.hotel_id = h.id
               AND a.aspect = ANY($2::text[])
               AND a.month > latest.month - make_interval(months => $5::int)) AS recent_alerts
     FROM scored s
     JOIN hotels h ON h.id = s.hotel_id
     GROUP BY h.id
     HAVING count(*) = cardinality($2::text[])
     ORDER BY score DESC, h.name
     LIMIT $6::int`,
    [city, priorities, RECENT_MONTHS, PRIOR_MENTIONS, ALERT_MONTHS, LIMIT]
  );
  return result.rows;
}

module.exports = { recommendHotels };
