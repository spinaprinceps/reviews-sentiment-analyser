const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/reviews';

// The alert rule. Change these and re-run to tune how sensitive the detector is.
const BASELINE_MONTHS = 6;
const MIN_MENTIONS = 20;
const MIN_BASELINE_MENTIONS = 60;
const MIN_JUMP = 15; // percentage points of negative mentions

// Rebuilds the monthly counts from scratch, so rows for mentions that were
// removed (e.g. replaced by the LLM) don't linger.
async function refreshMonthly(client) {
  await client.query('BEGIN');
  try {
    await client.query('DELETE FROM hotel_aspect_monthly');
    const result = await client.query(
      `INSERT INTO hotel_aspect_monthly (hotel_id, aspect, month, positive_count, negative_count)
       SELECT hotel_id,
              aspect,
              date_trunc('month', review_date)::date AS month,
              count(*) FILTER (WHERE polarity = 1),
              count(*) FILTER (WHERE polarity = -1)
       FROM aspect_mentions
       GROUP BY hotel_id, aspect, month`
    );
    await client.query('COMMIT');
    return result.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

// Compares each month with the months before it and saves the big jumps as alerts.
// BASELINE_MONTHS is our own constant, so it is safe to put into the SQL text.
async function detectSpikes(client) {
  await client.query(
    `WITH w AS (
       SELECT hotel_id, aspect, month, negative_count,
              positive_count + negative_count AS total,
              sum(negative_count) OVER prev AS base_negative,
              sum(positive_count + negative_count) OVER prev AS base_total
       FROM hotel_aspect_monthly
       WINDOW prev AS (
         PARTITION BY hotel_id, aspect
         ORDER BY month
         RANGE BETWEEN INTERVAL '${BASELINE_MONTHS} months' PRECEDING AND INTERVAL '1 month' PRECEDING
       )
     )
     INSERT INTO alerts (hotel_id, aspect, alert_type, month, baseline_value, current_value, mentions)
     SELECT hotel_id, aspect, 'negative_spike', month,
            round(100.0 * base_negative / base_total, 1),
            round(100.0 * negative_count / total, 1),
            total
     FROM w
     WHERE total >= $1
       AND base_total >= $2
       AND 100.0 * negative_count / total - 100.0 * base_negative / base_total >= $3
     ON CONFLICT (hotel_id, aspect, alert_type, month)
     DO UPDATE SET baseline_value = EXCLUDED.baseline_value,
                   current_value  = EXCLUDED.current_value,
                   mentions       = EXCLUDED.mentions`,
    [MIN_MENTIONS, MIN_BASELINE_MENTIONS, MIN_JUMP]
  );
}

async function countAlerts(client) {
  const result = await client.query('SELECT count(*) AS n FROM alerts');
  return Number(result.rows[0].n);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  client.setTypeParser(1082, (value) => value);

  try {
    const monthlyRows = await refreshMonthly(client);
    const before = await countAlerts(client);
    await detectSpikes(client);
    const after = await countAlerts(client);

    const top = await client.query(
      `SELECT h.name AS hotel, a.aspect, a.month, a.baseline_value AS before_pct,
              a.current_value AS now_pct, a.mentions
       FROM alerts a
       JOIN hotels h ON h.id = a.hotel_id
       ORDER BY a.current_value - a.baseline_value DESC
       LIMIT 5`
    );

    console.log('\nDone.');
    console.log(`  monthly rows rebuilt:  ${monthlyRows}`);
    console.log(`  alerts in total:       ${after}`);
    console.log(`  new this run:          ${after - before}`);
    console.log('\nBiggest jumps:');
    console.table(top.rows);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Trend detection failed: ${error.message || error.code}`);
  process.exit(1);
});
