const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/drivers?type=truck&location=Kigali&available=true
router.get('/', async (req, res, next) => {
  try {
    const { type, location, available } = req.query;
    const conditions = [];
    const values = [];

    if (type) {
      values.push(type);
      conditions.push(`type = $${values.length}`);
    }
    if (location) {
      values.push(location);
      conditions.push(`location = $${values.length}`);
    }
    if (available !== undefined) {
      values.push(available === 'true');
      conditions.push(`available = $${values.length}`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const { rows } = await pool.query(`SELECT * FROM drivers ${where} ORDER BY rating DESC`, values);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/drivers/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
