const { Client } = require('pg');
const { ASPECTS } = require('../lib/aspects');

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/reviews';
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
const DELAY_MS = Number(process.env.LLM_DELAY_MS ?? 4000);
const BATCH_SIZE = 20;
const DEFAULT_LIMIT = 200;
const MAX_ATTEMPTS = 5;
const ASPECT_NAMES = Object.keys(ASPECTS);
const USAGE = 'Usage: npm run llm -- [--limit N]';

const INSTRUCTIONS = `You label hotel reviews by aspect.
Each review has a "liked" and a "disliked" part written by the guest.
For each review, list every aspect the guest gives an opinion about, using only these aspects:
${ASPECT_NAMES.join(', ')}.
Polarity is "positive" or "negative" by what the guest means, even if they wrote it in the other part.
Ignore statements that nothing was wrong.
For evidence, copy at most 12 words from the review.
Return one entry for every review_id, with an empty mentions list if no aspect applies.`;

// Gemini must answer in exactly this shape, and only with our aspect names.
const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      review_id: { type: 'INTEGER' },
      mentions: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            aspect: { type: 'STRING', enum: ASPECT_NAMES },
            polarity: { type: 'STRING', enum: ['positive', 'negative'] },
            evidence: { type: 'STRING' },
          },
          required: ['aspect', 'polarity', 'evidence'],
        },
      },
    },
    required: ['review_id', 'mentions'],
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(args) {
  const [flag, value] = args;
  if (flag === undefined) return { limit: DEFAULT_LIMIT };

  const limit = Number(value);
  if (flag !== '--limit' || !Number.isInteger(limit) || limit < 1) throw new Error(USAGE);
  return { limit };
}

// Never trust model output: keep only known aspects, for reviews in this batch,
// at most once per review, aspect and polarity.
function validateMentions(entries, reviewIds) {
  if (!Array.isArray(entries)) throw new Error('Gemini did not return a list');

  const allowed = new Set(reviewIds);
  const seen = new Set();
  const mentions = [];

  for (const entry of entries) {
    if (!allowed.has(entry?.review_id)) continue;

    for (const m of entry.mentions ?? []) {
      const polarity = { positive: 1, negative: -1 }[m?.polarity];
      if (!ASPECT_NAMES.includes(m?.aspect) || !polarity || typeof m.evidence !== 'string') continue;

      const key = `${entry.review_id}|${m.aspect}|${polarity}`;
      if (seen.has(key)) continue;
      seen.add(key);

      mentions.push({
        review_id: entry.review_id,
        aspect: m.aspect,
        polarity,
        sentence: m.evidence.trim().slice(0, 300),
      });
    }
  }
  return mentions;
}

async function callGemini(reviews) {
  const input = reviews.map((r) => ({
    review_id: r.id,
    liked: r.positive_text,
    disliked: r.negative_text,
  }));

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
    contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  for (let attempt = 1; ; attempt++) {
    let response;
    try {
      // The key goes in a header, not the URL, so it doesn't end up in logs.
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
        body,
      });
    } catch (error) {
      // No response at all, e.g. the network dropped.
      if (attempt === MAX_ATTEMPTS) throw error;
      response = null;
    }

    // 429 = rate limited, 5xx = Gemini is having trouble. Both are worth a retry.
    const retryable = !response || response.status === 429 || response.status >= 500;
    if (retryable && attempt < MAX_ATTEMPTS) {
      const wait = 30_000 * attempt;
      console.log(`Gemini ${response ? `returned ${response.status}` : 'unreachable'}, retrying in ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!response.ok) {
      throw new Error(`Gemini returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error(`Gemini returned no text: ${JSON.stringify(data).slice(0, 300)}`);

    return { entries: JSON.parse(text), tokens: data.usageMetadata?.totalTokenCount ?? 0 };
  }
}

// Reviews the rules couldn't read at all go first, because they gain the most.
async function nextBatch(client, size) {
  const result = await client.query(
    `SELECT id, hotel_id, review_date, positive_text, negative_text
     FROM reviews
     WHERE llm_reason IS NOT NULL AND llm_processed_at IS NULL
     ORDER BY (llm_reason <> 'no_aspects'), id
     LIMIT $1`,
    [size]
  );
  return result.rows;
}

// The LLM's mentions replace the rules' mentions for these reviews, all in one transaction.
async function saveBatch(client, reviews, mentions) {
  const byId = new Map(reviews.map((r) => [r.id, r]));
  const reviewIds = reviews.map((r) => r.id);

  await client.query('BEGIN');
  try {
    await client.query(
      `DELETE FROM aspect_mentions WHERE review_id = ANY($1::int[]) AND method = 'rule'`,
      [reviewIds]
    );
    const result = await client.query(
      `INSERT INTO aspect_mentions (hotel_id, review_id, review_date, aspect, polarity, sentence, method)
       SELECT *, 'llm' FROM unnest($1::int[], $2::int[], $3::date[], $4::text[], $5::smallint[], $6::text[])
       ON CONFLICT (review_id, aspect, polarity) DO NOTHING`,
      [
        mentions.map((m) => byId.get(m.review_id).hotel_id),
        mentions.map((m) => m.review_id),
        mentions.map((m) => byId.get(m.review_id).review_date),
        mentions.map((m) => m.aspect),
        mentions.map((m) => m.polarity),
        mentions.map((m) => m.sentence),
      ]
    );
    await client.query('UPDATE reviews SET llm_processed_at = now() WHERE id = ANY($1::int[])', [reviewIds]);
    await client.query('COMMIT');
    return result.rowCount;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  const { limit } = parseArgs(process.argv.slice(2));
  if (!API_KEY) throw new Error('GEMINI_API_KEY is not set. Add it to server/.env');

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  client.setTypeParser(1082, (value) => value);

  let processed = 0;
  let saved = 0;
  let tokens = 0;

  try {
    while (processed < limit) {
      const reviews = await nextBatch(client, Math.min(BATCH_SIZE, limit - processed));
      if (reviews.length === 0) break;

      const result = await callGemini(reviews);
      const mentions = validateMentions(result.entries, reviews.map((r) => r.id));
      saved += await saveBatch(client, reviews, mentions);

      processed += reviews.length;
      tokens += result.tokens;
      console.log(`${processed}/${limit} reviews, ${saved} mentions, ${tokens} tokens`);

      // Stay under the free tier's requests-per-minute limit.
      if (processed < limit) await sleep(DELAY_MS);
    }
  } finally {
    await client.end();
  }

  console.log('\nDone.');
  console.log(`  reviews sent to Gemini: ${processed}`);
  console.log(`  mentions saved:         ${saved}`);
  console.log(`  tokens used:            ${tokens}`);
}

// Only run when started from the command line, not when a test requires this file.
if (require.main === module) {
  main().catch((error) => {
    console.error(`LLM extraction failed: ${error.message || error.code}`);
    process.exit(1);
  });
}

module.exports = { validateMentions };
