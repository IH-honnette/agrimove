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

// GET /api/drivers — list all drivers
// Optional query params: type, available, lat, lng, radius (km, default 50)
router.get('/', async (req, res, next) => {
  try {
    const { type, available, lat, lng, radius = 50 } = req.query;
    const params = [];
    const conditions = [];

    if (type) {
      params.push(type.toLowerCase());
      conditions.push(`LOWER(type) = $${params.length}`);
    }
    if (available === 'true') {
      conditions.push(`available = true`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // If customer sends their GPS, add Haversine distance and filter by radius
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = parseFloat(radius);

      if (isNaN(userLat) || isNaN(userLng)) {
        return res.status(400).json({ error: 'Invalid lat/lng' });
      }

      // Only include drivers that have shared their location
      const locationFilter = conditions.length
        ? `${where} AND latitude IS NOT NULL AND longitude IS NOT NULL`
        : `WHERE latitude IS NOT NULL AND longitude IS NOT NULL`;

      const distanceExpr = `ROUND((6371 * acos(LEAST(1, cos(radians(${userLat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${userLng})) + sin(radians(${userLat})) * sin(radians(latitude)))))::numeric, 1)`;

      const query = `
        SELECT * FROM (
          SELECT *, ${distanceExpr} AS distance_km
          FROM drivers
          ${locationFilter}
        ) sub
        WHERE distance_km <= ${radiusKm}
        ORDER BY distance_km ASC
      `;

      const { rows } = await pool.query(query, params);
      return res.json(rows);
    }

    // No GPS — return all matching drivers
    const { rows } = await pool.query(
      `SELECT * FROM drivers ${where} ORDER BY rating DESC`,
      params
    );
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

// PATCH /api/drivers/me/location — driver updates their own live location
router.patch('/me/location', async (req, res, next) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: 'Authentication required' });
    if (decoded.role !== 'driver') return res.status(403).json({ error: 'Only drivers can update location' });

    const { latitude, longitude, address } = req.body;
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const { rows } = await pool.query(
      `UPDATE drivers
       SET latitude = $1, longitude = $2, location_address = $3, location_updated_at = NOW()
       WHERE user_id = $4
       RETURNING id, latitude, longitude, location_address, location_updated_at`,
      [latitude, longitude, address || null, decoded.id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Driver record not found for this user' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/drivers/me/location-off — driver clears their location (stops sharing)
router.patch('/me/location-off', async (req, res, next) => {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return res.status(401).json({ error: 'Authentication required' });
    if (decoded.role !== 'driver') return res.status(403).json({ error: 'Only drivers can update location' });

    await pool.query(
      `UPDATE drivers SET latitude = NULL, longitude = NULL, location_address = NULL, location_updated_at = NULL WHERE user_id = $1`,
      [decoded.id]
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
