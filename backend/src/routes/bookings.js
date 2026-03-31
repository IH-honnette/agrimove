const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

function getUserFromToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(header.split(' ')[1], JWT_SECRET);
  } catch {
    return null;
  }
}

// POST /api/bookings
router.post('/', async (req, res, next) => {
  try {
    const { driver_id, customer_name, customer_phone, cargo_type, pickup_location, destination } = req.body;

    if (!driver_id || !customer_name || !customer_phone || !pickup_location || !destination) {
      return res.status(400).json({ error: 'driver_id, customer_name, customer_phone, pickup_location, and destination are required' });
    }

    const decoded = getUserFromToken(req);
    const user_id = decoded ? decoded.id : null;

    const client = await pool.connect();
    try {
      const driverRes = await client.query('SELECT * FROM drivers WHERE id = $1', [driver_id]);
      if (driverRes.rows.length === 0) return res.status(404).json({ error: 'Driver not found' });

      const { rows } = await client.query(
        `INSERT INTO bookings (driver_id, user_id, customer_name, customer_phone, cargo_type, pickup_location, destination, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') RETURNING *`,
        [driver_id, user_id, customer_name, customer_phone, cargo_type || null, pickup_location, destination]
      );
      const booking = rows[0];
      res.status(201).json({ ...booking, driver_phone: driverRes.rows[0].phone, driver_name: driverRes.rows[0].name });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/bookings/mine — bookings for authenticated user
router.get('/mine', async (req, res, next) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: 'Authentication required' });

    const { rows } = await pool.query(
      `SELECT b.*, d.name AS driver_name, d.phone AS driver_phone, d.vehicle AS driver_vehicle, d.rating AS driver_rating
       FROM bookings b
       LEFT JOIN drivers d ON b.driver_id = d.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC`,
      [decoded.id]
    );
    res.json(rows);
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
