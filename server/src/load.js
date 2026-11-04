const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('csv-parse');
const { Client } = require('pg');
const { cleanRow } = require('./clean');

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/reviews';
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');
const USAGE = 'Usage: node src/load.js <csvPath> [--limit N]';

// 8 columns x 1000 rows stays well under Postgres's limit of 65,535 values per query.
const BATCH_SIZE = 1000;
const PROGRESS_EVERY = 50_000;

const REVIEW_COLUMNS = [
  'hotel_id',
  'review_date',
  'reviewer_score',
  'positive_text',
  'negative_text',
  'trip_type',
  'traveller_type',
  'content_hash',
];

function parseArgs(args) {
  const [csvPath, flag, value] = args;
  if (!csvPath || csvPath.startsWith('--')) throw new Error(USAGE);
  if (flag === undefined) return { csvPath, limit: Infinity };

  const limit = Number(value);
  if (flag !== '--limit' || !Number.isInteger(limit) || limit < 1) throw new Error(USAGE);
  return { csvPath, limit };
}

async function saveHotel(client, hotelIds, hotel) {
  const key = `${hotel.name}|${hotel.address}`;
  if (hotelIds.has(key)) return hotelIds.get(key);

  // DO UPDATE is a no-op, but unlike DO NOTHING it makes RETURNING give back the
  // id of a hotel saved by an earlier run.
  const result = await client.query(
    `INSERT INTO hotels (name, address, city, country, lat, lng)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (name, address) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [hotel.name, hotel.address, hotel.city, hotel.country, hotel.lat, hotel.lng]
  );

  const id = result.rows[0].id;
  hotelIds.set(key, id);
  return id;
}

// One INSERT for the whole batch: ($1, ..., $8), ($9, ..., $16), ...
async function saveReviews(client, reviews) {
  const values = [];
  const placeholders = reviews.map((review) => {
    const start = values.length;
    for (const column of REVIEW_COLUMNS) values.push(review[column]);
    return `(${REVIEW_COLUMNS.map((_, i) => `$${start + i + 1}`).join(', ')})`;
  });

  // A review already in the table (same content_hash) is skipped, so re-runs are safe.
  const result = await client.query(
    `INSERT INTO reviews (${REVIEW_COLUMNS.join(', ')})
     VALUES ${placeholders.join(', ')}
     ON CONFLICT (content_hash) DO NOTHING`,
    values
  );

  return result.rowCount;
}

async function load({ csvPath, limit }) {
  // Checked up front because a read stream error inside .pipe() would crash, not reject.
  if (!fs.existsSync(csvPath)) throw new Error(`CSV file not found: ${csvPath}`);

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Every statement in schema.sql uses IF NOT EXISTS, so this is safe on every run.
    await client.query(fs.readFileSync(SCHEMA_PATH, 'utf8'));

    const rows = fs.createReadStream(csvPath).pipe(parse({ columns: true, bom: true }));
    const hotelIds = new Map();
    const rejected = {};
    let batch = [];
    let read = 0;
    let cleaned = 0;
    let inserted = 0;

    for await (const row of rows) {
      if (read === limit) break;
      read += 1;

      const result = cleanRow(row);
      if (result.error) {
        rejected[result.error] = (rejected[result.error] ?? 0) + 1;
      } else {
        cleaned += 1;
        const hotel_id = await saveHotel(client, hotelIds, result.hotel);
        batch.push({ ...result.review, hotel_id });
      }

      if (batch.length === BATCH_SIZE) {
        inserted += await saveReviews(client, batch);
        batch = [];
      }
      if (read % PROGRESS_EVERY === 0) {
        console.log(`${read.toLocaleString('en')} rows read, ${inserted.toLocaleString('en')} inserted`);
      }
    }

    if (batch.length > 0) inserted += await saveReviews(client, batch);

    console.log('\nDone.');
    console.log(`  rows read:           ${read}`);
    console.log(`  hotels:              ${hotelIds.size}`);
    console.log(`  inserted:            ${inserted}`);
    console.log(`  duplicates skipped:  ${cleaned - inserted}`);
    console.log(`  rejected:            ${read - cleaned}`);
    for (const [reason, count] of Object.entries(rejected)) {
      console.log(`    ${reason}: ${count}`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const started = Date.now();
  await load(options);
  console.log(`  took:                ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((error) => {
  // A refused connection has an empty message and only a code, e.g. ECONNREFUSED.
  console.error(`Load failed: ${error.message || error.code}`);
  process.exit(1);
});
