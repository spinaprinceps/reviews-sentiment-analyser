const express = require('express');
const { pool } = require('../db');

const router = express.Router();

// Confirms the server is up and can reach the database.
router.get('/', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
});

module.exports = router;
