const { pool } = require('../db');

// Every city that has hotels, alphabetically, with how many hotels it has.
async function listCities() {
  const result = await pool.query(
    `SELECT city, country, count(*)::int AS hotels
     FROM hotels
     GROUP BY city, country
     ORDER BY city`
  );
  return result.rows;
}

module.exports = { listCities };
