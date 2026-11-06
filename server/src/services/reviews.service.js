const { pool } = require('../db');
const { contentHash } = require('../lib/clean');

// Saves a new review dated today. processed_at stays NULL, which is how the
// extractor knows it still has to read it. Returns null if the exact same
// review was already saved.
async function createReview(hotel, review) {
  const today = new Date().toISOString().slice(0, 10);

  const result = await pool.query(
    `INSERT INTO reviews (hotel_id, review_date, reviewer_score, positive_text, negative_text,
                          trip_type, traveller_type, content_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (content_hash) DO NOTHING
     RETURNING id, hotel_id, review_date, reviewer_score, positive_text, negative_text,
               trip_type, traveller_type, processed_at, created_at`,
    [
      hotel.id,
      today,
      review.reviewer_score,
      review.positive_text,
      review.negative_text,
      review.trip_type,
      review.traveller_type,
      contentHash(hotel.name, today, review.positive_text, review.negative_text),
    ]
  );
  return result.rows[0] ?? null;
}

module.exports = { createReview };
