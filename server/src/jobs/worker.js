const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { pool } = require('../db');

const run = promisify(execFile);

// How long to wait between rounds. Set WORKER_POLL_SECONDS=10 while testing.
const POLL_SECONDS = Number(process.env.WORKER_POLL_SECONDS ?? 60);

const log = (message) => console.log(`[${new Date().toLocaleTimeString()}] ${message}`);

// Runs one of the existing jobs (extract, trends, notify) as its own program, so a
// crash in one job is logged here instead of stopping the worker.
async function runJob(name) {
  log(`running ${name}...`);
  const script = path.join(__dirname, `${name}.js`);
  const { stdout } = await run(process.execPath, [script], { maxBuffer: 10 * 1024 * 1024 });
  const output = stdout.trim();
  if (output) console.log(output.replace(/^/gm, '    '));
}

async function waitingReviews() {
  const result = await pool.query('SELECT count(*)::int AS n FROM reviews WHERE processed_at IS NULL');
  return result.rows[0].n;
}

// One round: analyse new reviews if there are any, then announce any new alerts.
async function round() {
  const waiting = await waitingReviews();
  if (waiting > 0) {
    log(`${waiting} new review(s) waiting`);
    await runJob('extract');
    await runJob('trends');
  }
  await runJob('notify');
}

let stopping = false;
let busy = false;
let timer = null;

async function loop() {
  busy = true;
  try {
    await round();
  } catch (error) {
    // execFile errors carry the job's own error output.
    log(`round failed: ${(error.stderr || error.message || error).toString().trim()}`);
  }
  busy = false;

  if (stopping) return shutdown();
  timer = setTimeout(loop, POLL_SECONDS * 1000);
}

async function shutdown() {
  clearTimeout(timer);
  await pool.end();
  log('worker stopped');
  process.exit(0);
}

// Ctrl+C: finish nothing new; stop now if idle, or right after the current round.
process.on('SIGINT', () => {
  stopping = true;
  if (!busy) shutdown();
});

log(`worker started, checking every ${POLL_SECONDS}s (Ctrl+C to stop)`);
loop();
