const express = require('express');
const pool = require('../db');
const router = express.Router();

// POST /api/bookings
router.post('/', async (req, res, next) => {
  try {
    const { driver_id, customer_name, customer_phone, cargo_type, pickup_location, destination } = req.body;

    if (!driver_id || !customer_name || !customer_phone || !pickup_location || !destination) {
      return res.status(400).json({ error: 'driver_id, customer_name, customer_phone, pickup_location, and destination are required' });
    }

    const client = await pool.connect();
    try {
      const driverRes = await client.query('SELECT * FROM drivers WHERE id = $1', [driver_id]);
      if (driverRes.rows.length === 0) return res.status(404).json({ error: 'Driver not found' });

      const { rows } = await client.query(
        `INSERT INTO bookings (driver_id, customer_name, customer_phone, cargo_type, pickup_location, destination, status)
         VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
        [driver_id, customer_name, customer_phone, cargo_type || null, pickup_location, destination]
      );
      const booking = rows[0];
      // Return booking + driver phone so frontend can display it for calling
      res.status(201).json({ ...booking, driver_phone: driverRes.rows[0].phone, driver_name: driverRes.rows[0].name });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings (list all)
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, d.name AS driver_name, d.phone AS driver_phone
       FROM bookings b LEFT JOIN drivers d ON b.driver_id = d.id
       ORDER BY b.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
