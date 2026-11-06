const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/reviews';
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'db', 'schema.sql');

// Creates any missing tables, columns and indexes. Every statement in schema.sql
// is written to be safe to repeat, so this can run as often as you like.
async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query(fs.readFileSync(SCHEMA_PATH, 'utf8'));
    console.log('Schema is up to date.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Migration failed: ${error.message || error.code}`);
  process.exit(1);
});
