const { Client } = require('pg');
const { extractMentions, flagReason } = require('./aspects');

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/reviews';
const BATCH_SIZE = 500;
const PROGRESS_EVERY = 50_000;

// Claims the next batch. SKIP LOCKED lets several workers run at once without
// two of them taking the same reviews.
async function claimBatch(client) {
  const result = await client.query(
    `SELECT id, hotel_id, review_date, positive_text, negative_text
     FROM reviews
     WHERE processed_at IS NULL
     ORDER BY id
     LIMIT $1
     FOR UPDATE SKIP LOCKED`,
    [BATCH_SIZE]
  );
  return result.rows;
}

// unnest() turns six arrays into rows, so the query always has 6 parameters
// however many mentions there are.
async function saveMentions(client, mentions) {
  if (mentions.length === 0) return 0;

  const result = await client.query(
    `INSERT INTO aspect_mentions (hotel_id, review_id, review_date, aspect, polarity, sentence)
     SELECT * FROM unnest($1::int[], $2::int[], $3::date[], $4::text[], $5::smallint[], $6::text[])
     ON CONFLICT (review_id, aspect, polarity) DO NOTHING`,
    [
      mentions.map((m) => m.hotel_id),
      mentions.map((m) => m.review_id),
      mentions.map((m) => m.review_date),
      mentions.map((m) => m.aspect),
      mentions.map((m) => m.polarity),
      mentions.map((m) => m.sentence),
    ]
  );
  return result.rowCount;
}

// Marks the batch as done and stores why each review needs the LLM (NULL = it doesn't).
async function markProcessed(client, reviewIds, reasons) {
  await client.query(
    `UPDATE reviews SET processed_at = now(), llm_reason = d.reason
     FROM unnest($1::int[], $2::text[]) AS d(id, reason)
     WHERE reviews.id = d.id`,
    [reviewIds, reasons]
  );
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  // Return dates as plain 'YYYY-MM-DD' text instead of JS Date objects, which
  // would shift by the local time zone.
  client.setTypeParser(1082, (value) => value);

  const started = Date.now();
  let processed = 0;
  let saved = 0;
  let withoutMentions = 0;
  let flagged = 0;

  try {
    while (true) {
      // Saving the mentions and marking the reviews happen together or not at all.
      await client.query('BEGIN');
      const reviews = await claimBatch(client);
      if (reviews.length === 0) {
        await client.query('COMMIT');
        break;
      }

      const reasons = [];
      const mentions = reviews.flatMap((review) => {
        const found = extractMentions(review);
        if (found.length === 0) withoutMentions += 1;
        reasons.push(flagReason(review, found));
        return found.map((m) => ({
          ...m,
          hotel_id: review.hotel_id,
          review_id: review.id,
          review_date: review.review_date,
        }));
      });

      saved += await saveMentions(client, mentions);
      await markProcessed(client, reviews.map((r) => r.id), reasons);
      await client.query('COMMIT');
      flagged += reasons.filter(Boolean).length;

      const before = processed;
      processed += reviews.length;
      if (Math.floor(processed / PROGRESS_EVERY) > Math.floor(before / PROGRESS_EVERY)) {
        console.log(`${processed.toLocaleString('en')} reviews processed, ${saved.toLocaleString('en')} mentions`);
      }
    }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  console.log('\nDone.');
  console.log(`  reviews processed:     ${processed}`);
  console.log(`  mentions saved:        ${saved}`);
  console.log(`  reviews with none:     ${withoutMentions}`);
  console.log(`  flagged for the LLM:   ${flagged}`);
  console.log(`  took:                  ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((error) => {
  console.error(`Extraction failed: ${error.message || error.code}`);
  process.exit(1);
});
