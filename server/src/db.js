const { Pool, types } = require('pg');
const config = require('./config');

// Return DATE columns as plain 'YYYY-MM-DD' text, for every query.
types.setTypeParser(1082, (value) => value);

// A pool keeps a few connections open and lends one to each request.
const pool = new Pool({ connectionString: config.databaseUrl });

module.exports = { pool };
