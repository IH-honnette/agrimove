# AgriMove Logistics — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack logistics platform where farmers browse available drivers, view their profiles, create bookings, and get the driver's phone number to call and confirm.

**Architecture:** React/Vite frontend (existing `agrimove-react/`) communicates with a new Express REST API (`backend/`) backed by PostgreSQL. App state drives a single-page flow: driver list → profile modal → booking form → phone prompt.

**Tech Stack:** React 19, Vite 8, Express 4, node-postgres (`pg`), PostgreSQL 14+, Jest, Supertest, CORS, dotenv

---

## File Map

**New — Backend**
- `backend/package.json` — dependencies + scripts
- `backend/.env.example` — DB connection template
- `backend/src/index.js` — Express app + server start
- `backend/src/db.js` — pg Pool singleton
- `backend/src/routes/drivers.js` — GET /api/drivers, GET /api/drivers/:id
- `backend/src/routes/bookings.js` — POST /api/bookings
- `backend/src/seed.js` — seed drivers from hardcoded data
- `backend/src/schema.sql` — CREATE TABLE statements
- `backend/__tests__/drivers.test.js` — route tests
- `backend/__tests__/bookings.test.js` — booking route tests

**Modified — Frontend (`agrimove-react/src/`)**
- `src/api/driversApi.js` — fetch wrapper for backend
- `src/components/DriverCard.jsx` — driver listing card
- `src/components/DriverProfile.jsx` — full profile modal
- `src/components/BookingForm.jsx` — booking details form
- `src/components/PhonePrompt.jsx` — call-to-confirm screen
- `src/components/FilterBar.jsx` — filter by type/location/availability
- `src/App.jsx` — state machine + page routing
- `src/App.css` — full restyle for AgriMove brand
- `src/index.css` — CSS variables (keep existing, extend)

**New — Root**
- `README.md` — complete setup guide

---

## Task 1: Backend — Initialize Express project

**Files:**
- Create: `backend/package.json`
- Create: `backend/src/index.js`
- Create: `backend/.env.example`
- Create: `backend/.gitignore`

- [ ] **Step 1: Create backend directory and package.json**

```bash
mkdir -p /Users/mac/Desktop/ALU/SE/backend/src
mkdir -p /Users/mac/Desktop/ALU/SE/backend/__tests__
```

Create `backend/package.json`:
```json
{
  "name": "agrimove-backend",
  "version": "1.0.0",
  "type": "commonjs",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js",
    "test": "jest --runInBand",
    "seed": "node src/seed.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/mac/Desktop/ALU/SE/backend && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 3: Create `.env.example`**

```
DATABASE_URL=postgres://postgres:password@localhost:5432/agrimove
PORT=3001
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
.env
```

- [ ] **Step 5: Create `backend/src/index.js`**

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const driversRouter = require('./routes/drivers');
const bookingsRouter = require('./routes/bookings');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/drivers', driversRouter);
app.use('/api/bookings', bookingsRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
```

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add backend/
git commit -m "feat: initialize Express backend with cors + dotenv"
```

---

## Task 2: Database — Schema and seed

**Files:**
- Create: `backend/src/schema.sql`
- Create: `backend/src/db.js`
- Create: `backend/src/seed.js`

- [ ] **Step 1: Create `backend/src/schema.sql`**

```sql
CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  initials VARCHAR(10),
  vehicle VARCHAR(255),
  type VARCHAR(50),
  capacity VARCHAR(50),
  rating DECIMAL(3,1),
  trips INTEGER DEFAULT 0,
  rate INTEGER,
  available BOOLEAN DEFAULT true,
  location VARCHAR(255),
  crops VARCHAR(255),
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  cargo_type VARCHAR(255),
  pickup_location VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **Step 2: Create the PostgreSQL database**

Run in your terminal (psql must be installed):
```bash
createdb agrimove
psql agrimove < /Users/mac/Desktop/ALU/SE/backend/src/schema.sql
```

Expected: No errors. Tables `drivers` and `bookings` created.

- [ ] **Step 3: Create `backend/.env` from example**

```bash
cp /Users/mac/Desktop/ALU/SE/backend/.env.example /Users/mac/Desktop/ALU/SE/backend/.env
```

Edit `.env` to match your local PostgreSQL credentials:
```
DATABASE_URL=postgres://YOUR_USER:YOUR_PASSWORD@localhost:5432/agrimove
PORT=3001
```

If using default postgres with no password: `postgres://postgres@localhost:5432/agrimove`

- [ ] **Step 4: Create `backend/src/db.js`**

```js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

module.exports = pool;
```

- [ ] **Step 5: Create `backend/src/seed.js`**

```js
require('dotenv').config();
const pool = require('./db');

const DRIVERS = [
  { name: 'Jean-Pierre Nkurunziza', initials: 'JP', vehicle: 'Isuzu Truck (5T)',      type: 'truck',  capacity: '5 tonnes',   rating: 4.9, trips: 312, rate: 600, available: true,  location: 'Kigali',    crops: 'All types',          phone: '+250 788 101 001' },
  { name: 'Amélie Uwimana',         initials: 'AU', vehicle: 'Toyota Hilux Pickup',   type: 'pickup', capacity: '1 tonne',    rating: 4.7, trips: 184, rate: 450, available: true,  location: 'Musanze',   crops: 'Vegetables, Dairy',  phone: '+250 788 102 002' },
  { name: 'Emmanuel Habimana',      initials: 'EH', vehicle: 'Mitsubishi Van (1.5T)', type: 'van',    capacity: '1.5 tonnes', rating: 4.8, trips: 229, rate: 480, available: true,  location: 'Huye',      crops: 'Grains, Cereals',    phone: '+250 788 103 003' },
  { name: 'Solange Mukamana',       initials: 'SM', vehicle: 'Mercedes Actros (10T)', type: 'truck',  capacity: '10 tonnes',  rating: 5.0, trips: 415, rate: 750, available: false, location: 'Rubavu',    crops: 'All types',          phone: '+250 788 104 004' },
  { name: 'Patrick Bizimana',       initials: 'PB', vehicle: 'Nissan Navara Pickup',  type: 'pickup', capacity: '1 tonne',    rating: 4.6, trips: 97,  rate: 420, available: true,  location: 'Nyanza',    crops: 'Fruits, Vegetables', phone: '+250 788 105 005' },
  { name: 'Claudine Nzeyimana',     initials: 'CN', vehicle: 'Hino Truck (3T)',       type: 'truck',  capacity: '3 tonnes',   rating: 4.8, trips: 276, rate: 550, available: true,  location: 'Muhanga',   crops: 'Livestock, Grains',  phone: '+250 788 106 006' },
  { name: 'Théophile Gasana',       initials: 'TG', vehicle: 'Ford Transit Van',      type: 'van',    capacity: '1.5 tonnes', rating: 4.5, trips: 143, rate: 460, available: true,  location: 'Rwamagana', crops: 'Dairy, Vegetables',  phone: '+250 788 107 007' },
  { name: 'Immaculée Ingabire',     initials: 'II', vehicle: 'Fuso Canter (2T)',      type: 'truck',  capacity: '2 tonnes',   rating: 4.7, trips: 188, rate: 520, available: false, location: 'Kayonza',   crops: 'All types',          phone: '+250 788 108 008' },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM bookings');
    await client.query('DELETE FROM drivers');
    await client.query('ALTER SEQUENCE drivers_id_seq RESTART WITH 1');

    for (const d of DRIVERS) {
      await client.query(
        `INSERT INTO drivers (name,initials,vehicle,type,capacity,rating,trips,rate,available,location,crops,phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [d.name, d.initials, d.vehicle, d.type, d.capacity, d.rating, d.trips, d.rate, d.available, d.location, d.crops, d.phone]
      );
    }
    console.log('Seeded', DRIVERS.length, 'drivers.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
```

- [ ] **Step 6: Run seed**

```bash
cd /Users/mac/Desktop/ALU/SE/backend && npm run seed
```

Expected: `Seeded 8 drivers.`

- [ ] **Step 7: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add backend/src/schema.sql backend/src/db.js backend/src/seed.js
git commit -m "feat: add PostgreSQL schema and seed script"
```

---

## Task 3: Backend — Drivers API routes

**Files:**
- Create: `backend/src/routes/drivers.js`
- Create: `backend/__tests__/drivers.test.js`

- [ ] **Step 1: Write the failing test first**

Create `backend/__tests__/drivers.test.js`:
```js
const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/db');

afterAll(async () => {
  await pool.end();
});

describe('GET /api/drivers', () => {
  it('returns an array of drivers', async () => {
    const res = await request(app).get('/api/drivers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[0]).toHaveProperty('vehicle');
      expect(res.body[0]).toHaveProperty('available');
    }
  });

  it('filters by available=true', async () => {
    const res = await request(app).get('/api/drivers?available=true');
    expect(res.status).toBe(200);
    res.body.forEach(d => expect(d.available).toBe(true));
  });

  it('filters by type', async () => {
    const res = await request(app).get('/api/drivers?type=truck');
    expect(res.status).toBe(200);
    res.body.forEach(d => expect(d.type).toBe('truck'));
  });
});

describe('GET /api/drivers/:id', () => {
  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/drivers/99999');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/mac/Desktop/ALU/SE/backend && npm test -- --testPathPattern=drivers
```

Expected: FAIL — `Cannot find module './routes/drivers'`

- [ ] **Step 3: Create `backend/src/routes/drivers.js`**

```js
const express = require('express');
const pool = require('../db');
const router = express.Router();

// GET /api/drivers?type=truck&location=Kigali&available=true
router.get('/', async (req, res) => {
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
});

// GET /api/drivers/:id
router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Driver not found' });
  res.json(rows[0]);
});

module.exports = router;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/mac/Desktop/ALU/SE/backend && npm test -- --testPathPattern=drivers
```

Expected: PASS (all 3 tests green, assuming DB is seeded)

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add backend/src/routes/drivers.js backend/__tests__/drivers.test.js
git commit -m "feat: add drivers API routes with filtering"
```

---

## Task 4: Backend — Bookings API route

**Files:**
- Create: `backend/src/routes/bookings.js`
- Create: `backend/__tests__/bookings.test.js`

- [ ] **Step 1: Write the failing test**

Create `backend/__tests__/bookings.test.js`:
```js
const request = require('supertest');
const app = require('../src/index');
const pool = require('../src/db');

afterAll(async () => {
  await pool.end();
});

describe('POST /api/bookings', () => {
  it('creates a booking and returns it', async () => {
    // Get a driver id first
    const driversRes = await request(app).get('/api/drivers?available=true');
    const driverId = driversRes.body[0].id;

    const payload = {
      driver_id: driverId,
      customer_name: 'Test Farmer',
      customer_phone: '+250 788 999 000',
      cargo_type: 'Vegetables',
      pickup_location: 'Kigali Market',
      destination: 'Musanze',
    };

    const res = await request(app).post('/api/bookings').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.customer_name).toBe('Test Farmer');
    expect(res.body.status).toBe('pending');
    expect(res.body.driver_phone).toBeDefined();
  });

  it('rejects missing required fields', async () => {
    const res = await request(app).post('/api/bookings').send({ driver_id: 1 });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/mac/Desktop/ALU/SE/backend && npm test -- --testPathPattern=bookings
```

Expected: FAIL — `Cannot find module './routes/bookings'`

- [ ] **Step 3: Create `backend/src/routes/bookings.js`**

```js
const express = require('express');
const pool = require('../db');
const router = express.Router();

// POST /api/bookings
router.post('/', async (req, res) => {
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
    // Return booking + driver phone so frontend can display it
    res.status(201).json({ ...booking, driver_phone: driverRes.rows[0].phone, driver_name: driverRes.rows[0].name });
  } finally {
    client.release();
  }
});

// GET /api/bookings (list all, for reference)
router.get('/', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT b.*, d.name AS driver_name, d.phone AS driver_phone
     FROM bookings b LEFT JOIN drivers d ON b.driver_id = d.id
     ORDER BY b.created_at DESC`
  );
  res.json(rows);
});

module.exports = router;
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/mac/Desktop/ALU/SE/backend && npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add backend/src/routes/bookings.js backend/__tests__/bookings.test.js
git commit -m "feat: add bookings API route"
```

---

## Task 5: Frontend — API layer

**Files:**
- Create: `agrimove-react/src/api/driversApi.js`

- [ ] **Step 1: Create `agrimove-react/src/api/driversApi.js`**

```js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export async function fetchDrivers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.location) params.set('location', filters.location);
  if (filters.available !== undefined) params.set('available', filters.available);
  const res = await fetch(`${BASE}/drivers?${params}`);
  if (!res.ok) throw new Error('Failed to fetch drivers');
  return res.json();
}

export async function fetchDriver(id) {
  const res = await fetch(`${BASE}/drivers/${id}`);
  if (!res.ok) throw new Error('Driver not found');
  return res.json();
}

export async function createBooking(data) {
  const res = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Booking failed');
  }
  return res.json();
}
```

- [ ] **Step 2: Create `agrimove-react/.env` for dev API URL**

```
VITE_API_URL=http://localhost:3001/api
```

Also create `agrimove-react/.env.example`:
```
VITE_API_URL=http://localhost:3001/api
```

- [ ] **Step 3: Add `.env` to `agrimove-react/.gitignore`**

Open `agrimove-react/.gitignore` (create if not exists) and add:
```
.env
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-react/src/api/ agrimove-react/.env.example
git commit -m "feat: add frontend API layer for drivers and bookings"
```

---

## Task 6: Frontend — DriverCard component

**Files:**
- Create: `agrimove-react/src/components/DriverCard.jsx`

- [ ] **Step 1: Create `agrimove-react/src/components/DriverCard.jsx`**

```jsx
export default function DriverCard({ driver, onSelect }) {
  const stars = '★'.repeat(Math.floor(driver.rating)) + (driver.rating % 1 >= 0.5 ? '½' : '');

  return (
    <div className={`driver-card ${driver.available ? 'available' : 'unavailable'}`} onClick={() => driver.available && onSelect(driver)}>
      <div className="card-avatar">{driver.initials}</div>
      <div className="card-body">
        <h3 className="card-name">{driver.name}</h3>
        <p className="card-vehicle">{driver.vehicle}</p>
        <div className="card-tags">
          <span className="tag tag-type">{driver.type}</span>
          <span className="tag tag-location">{driver.location}</span>
        </div>
        <p className="card-crops">{driver.crops}</p>
      </div>
      <div className="card-meta">
        <div className="card-rating">{driver.rating} <span className="stars">{stars}</span></div>
        <div className="card-trips">{driver.trips} trips</div>
        <div className="card-rate">RWF {driver.rate.toLocaleString()}/day</div>
        <div className={`card-status ${driver.available ? 'status-available' : 'status-busy'}`}>
          {driver.available ? 'Available' : 'Unavailable'}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-react/src/components/DriverCard.jsx
git commit -m "feat: add DriverCard component"
```

---

## Task 7: Frontend — DriverProfile modal

**Files:**
- Create: `agrimove-react/src/components/DriverProfile.jsx`

- [ ] **Step 1: Create `agrimove-react/src/components/DriverProfile.jsx`**

```jsx
export default function DriverProfile({ driver, onBook, onClose }) {
  if (!driver) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="profile-header">
          <div className="profile-avatar">{driver.initials}</div>
          <div>
            <h2 className="profile-name">{driver.name}</h2>
            <p className="profile-vehicle">{driver.vehicle}</p>
            <div className="profile-tags">
              <span className="tag tag-type">{driver.type}</span>
              <span className="tag tag-location">{driver.location}</span>
              <span className={`tag ${driver.available ? 'tag-available' : 'tag-busy'}`}>
                {driver.available ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat">
            <span className="stat-value">{driver.rating}</span>
            <span className="stat-label">Rating</span>
          </div>
          <div className="stat">
            <span className="stat-value">{driver.trips}</span>
            <span className="stat-label">Trips</span>
          </div>
          <div className="stat">
            <span className="stat-value">RWF {driver.rate.toLocaleString()}</span>
            <span className="stat-label">Per day</span>
          </div>
          <div className="stat">
            <span className="stat-value">{driver.capacity}</span>
            <span className="stat-label">Capacity</span>
          </div>
        </div>

        <div className="profile-section">
          <h4>Carries</h4>
          <p>{driver.crops}</p>
        </div>

        <div className="profile-section">
          <h4>Based in</h4>
          <p>{driver.location}</p>
        </div>

        {driver.available ? (
          <button className="btn-primary btn-full" onClick={() => onBook(driver)}>
            Book This Driver
          </button>
        ) : (
          <p className="unavailable-note">This driver is currently unavailable.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-react/src/components/DriverProfile.jsx
git commit -m "feat: add DriverProfile modal component"
```

---

## Task 8: Frontend — BookingForm component

**Files:**
- Create: `agrimove-react/src/components/BookingForm.jsx`

- [ ] **Step 1: Create `agrimove-react/src/components/BookingForm.jsx`**

```jsx
import { useState } from 'react';
import { createBooking } from '../api/driversApi';

export default function BookingForm({ driver, onConfirm, onBack }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    cargo_type: '',
    pickup_location: '',
    destination: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const booking = await createBooking({ driver_id: driver.id, ...form });
      onConfirm(booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <button className="btn-back" onClick={onBack}>← Back</button>
      <div className="form-card">
        <div className="form-header">
          <div className="form-avatar">{driver.initials}</div>
          <div>
            <h2>Book {driver.name}</h2>
            <p className="form-sub">{driver.vehicle} · {driver.location}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <label>
            Your Name *
            <input name="customer_name" value={form.customer_name} onChange={handleChange} required placeholder="Full name" />
          </label>
          <label>
            Your Phone Number *
            <input name="customer_phone" value={form.customer_phone} onChange={handleChange} required placeholder="+250 7XX XXX XXX" type="tel" />
          </label>
          <label>
            Cargo Type
            <input name="cargo_type" value={form.cargo_type} onChange={handleChange} placeholder="e.g. Maize, Vegetables, Livestock" />
          </label>
          <label>
            Pickup Location *
            <input name="pickup_location" value={form.pickup_location} onChange={handleChange} required placeholder="Where to pick up your cargo" />
          </label>
          <label>
            Destination *
            <input name="destination" value={form.destination} onChange={handleChange} required placeholder="Where to deliver" />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Booking…' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-react/src/components/BookingForm.jsx
git commit -m "feat: add BookingForm component"
```

---

## Task 9: Frontend — PhonePrompt component

**Files:**
- Create: `agrimove-react/src/components/PhonePrompt.jsx`

- [ ] **Step 1: Create `agrimove-react/src/components/PhonePrompt.jsx`**

```jsx
export default function PhonePrompt({ booking, onDone }) {
  const rawPhone = booking.driver_phone || '';
  const telHref = `tel:${rawPhone.replace(/\s/g, '')}`;

  return (
    <div className="page-container">
      <div className="prompt-card">
        <div className="prompt-icon">✓</div>
        <h2>Booking Confirmed!</h2>
        <p className="prompt-sub">
          Your booking #{booking.id} is saved. Call the driver to arrange pick-up details.
        </p>

        <div className="phone-box">
          <p className="phone-label">Driver: {booking.driver_name}</p>
          <p className="phone-number">{booking.driver_phone}</p>
          <a href={telHref} className="btn-call">
            📞 Call Now
          </a>
        </div>

        <div className="booking-summary">
          <p><strong>Pickup:</strong> {booking.pickup_location}</p>
          <p><strong>Destination:</strong> {booking.destination}</p>
          {booking.cargo_type && <p><strong>Cargo:</strong> {booking.cargo_type}</p>}
        </div>

        <button className="btn-secondary btn-full" onClick={onDone}>
          Back to Drivers
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-react/src/components/PhonePrompt.jsx
git commit -m "feat: add PhonePrompt call-to-confirm component"
```

---

## Task 10: Frontend — FilterBar component

**Files:**
- Create: `agrimove-react/src/components/FilterBar.jsx`

- [ ] **Step 1: Create `agrimove-react/src/components/FilterBar.jsx`**

```jsx
const LOCATIONS = ['All', 'Kigali', 'Musanze', 'Huye', 'Rubavu', 'Nyanza', 'Muhanga', 'Rwamagana', 'Kayonza'];
const TYPES = ['All', 'truck', 'pickup', 'van'];

export default function FilterBar({ filters, onChange }) {
  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Vehicle Type</label>
        <div className="filter-buttons">
          {TYPES.map(t => (
            <button
              key={t}
              className={`filter-btn ${filters.type === t || (!filters.type && t === 'All') ? 'active' : ''}`}
              onClick={() => set('type', t === 'All' ? '' : t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label>Location</label>
        <select value={filters.location || ''} onChange={e => set('location', e.target.value)}>
          {LOCATIONS.map(l => (
            <option key={l} value={l === 'All' ? '' : l}>{l}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.available === true}
            onChange={e => set('available', e.target.checked ? true : undefined)}
          />
          Available only
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-react/src/components/FilterBar.jsx
git commit -m "feat: add FilterBar component"
```

---

## Task 11: Frontend — App.jsx, App.css, index.css

**Files:**
- Modify: `agrimove-react/src/App.jsx`
- Modify: `agrimove-react/src/App.css`
- Modify: `agrimove-react/src/index.css`
- Modify: `agrimove-react/index.html`

- [ ] **Step 1: Replace `agrimove-react/src/App.jsx`**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { fetchDrivers } from './api/driversApi';
import DriverCard from './components/DriverCard';
import DriverProfile from './components/DriverProfile';
import BookingForm from './components/BookingForm';
import PhonePrompt from './components/PhonePrompt';
import FilterBar from './components/FilterBar';
import './App.css';

export default function App() {
  const [view, setView] = useState('list'); // 'list' | 'book' | 'confirm'
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [profileDriver, setProfileDriver] = useState(null);
  const [booking, setBooking] = useState(null);
  const [filters, setFilters] = useState({});

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDrivers(filters);
      setDrivers(data);
    } catch (e) {
      setError('Could not load drivers. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  function handleSelectDriver(driver) {
    setProfileDriver(driver);
  }

  function handleBook(driver) {
    setSelectedDriver(driver);
    setProfileDriver(null);
    setView('book');
  }

  function handleConfirm(bookingData) {
    setBooking(bookingData);
    setView('confirm');
  }

  function handleDone() {
    setView('list');
    setBooking(null);
    setSelectedDriver(null);
    loadDrivers();
  }

  if (view === 'book') {
    return <BookingForm driver={selectedDriver} onConfirm={handleConfirm} onBack={() => setView('list')} />;
  }

  if (view === 'confirm') {
    return <PhonePrompt booking={booking} onDone={handleDone} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🚛</span>
            <span className="logo-text">AgriMove</span>
          </div>
          <p className="header-tagline">Connecting farmers with trusted transport</p>
        </div>
      </header>

      <main className="app-main">
        <div className="section-title">
          <h1>Available Drivers</h1>
          <p>Browse verified agricultural transport providers across Rwanda</p>
        </div>

        <FilterBar filters={filters} onChange={setFilters} />

        {loading && <div className="loading">Loading drivers…</div>}
        {error && <div className="error-msg">{error}</div>}

        {!loading && !error && (
          <>
            <p className="results-count">{drivers.length} driver{drivers.length !== 1 ? 's' : ''} found</p>
            <div className="drivers-grid">
              {drivers.map(driver => (
                <DriverCard key={driver.id} driver={driver} onSelect={handleSelectDriver} />
              ))}
            </div>
            {drivers.length === 0 && (
              <p className="no-results">No drivers match your filters. Try adjusting your search.</p>
            )}
          </>
        )}
      </main>

      <DriverProfile
        driver={profileDriver}
        onBook={handleBook}
        onClose={() => setProfileDriver(null)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Replace `agrimove-react/src/index.css`**

```css
:root {
  --green: #2d7a3a;
  --green-light: #e8f5e9;
  --green-dark: #1b5e20;
  --orange: #f57c00;
  --orange-light: #fff3e0;
  --text: #333;
  --text-muted: #666;
  --bg: #f5f7f5;
  --white: #ffffff;
  --border: #dde3dd;
  --shadow: 0 2px 12px rgba(0,0,0,0.08);
  --shadow-lg: 0 8px 30px rgba(0,0,0,0.15);
  --radius: 12px;
  --radius-sm: 8px;

  font: 16px/1.5 system-ui, 'Segoe UI', sans-serif;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body { min-height: 100vh; }

#root { min-height: 100vh; }

h1, h2, h3, h4 { color: var(--text); font-weight: 600; }

button { cursor: pointer; font: inherit; }

input, select { font: inherit; }
```

- [ ] **Step 3: Replace `agrimove-react/src/App.css`**

```css
/* ── Layout ───────────────────────────────────── */
.app { min-height: 100vh; display: flex; flex-direction: column; }

.app-header {
  background: var(--green);
  color: white;
  padding: 0;
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}
.logo { display: flex; align-items: center; gap: 10px; }
.logo-icon { font-size: 28px; }
.logo-text { font-size: 24px; font-weight: 700; color: white; letter-spacing: -0.5px; }
.header-tagline { color: rgba(255,255,255,0.8); font-size: 14px; }

.app-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  width: 100%;
}

/* ── Section title ────────────────────────────── */
.section-title { margin-bottom: 24px; }
.section-title h1 { font-size: 28px; color: var(--green-dark); margin-bottom: 6px; }
.section-title p { color: var(--text-muted); }

/* ── Filter bar ───────────────────────────────── */
.filter-bar {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 20px;
  margin-bottom: 24px;
  display: flex;
  gap: 24px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-group label { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.filter-buttons { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-btn {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: var(--white);
  color: var(--text-muted);
  font-size: 13px;
  transition: all 0.15s;
}
.filter-btn.active, .filter-btn:hover {
  border-color: var(--green);
  color: var(--green);
  background: var(--green-light);
}
.filter-group select {
  padding: 7px 12px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--text);
}
.checkbox-label { display: flex !important; flex-direction: row !important; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: var(--text); }
.checkbox-label input { width: 16px; height: 16px; accent-color: var(--green); }

/* ── Driver grid ──────────────────────────────── */
.results-count { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; }
.drivers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}
.no-results { text-align: center; color: var(--text-muted); padding: 40px; }

/* ── Driver card ──────────────────────────────── */
.driver-card {
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  gap: 16px;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.driver-card.available { cursor: pointer; }
.driver-card.available:hover { box-shadow: var(--shadow-lg); border-color: var(--green); }
.driver-card.unavailable { opacity: 0.6; cursor: not-allowed; }

.card-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--green-light);
  color: var(--green-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
  flex-shrink: 0;
}
.card-body { flex: 1; min-width: 0; }
.card-name { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
.card-vehicle { font-size: 13px; color: var(--text-muted); margin-bottom: 8px; }
.card-tags { display: flex; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
.card-crops { font-size: 12px; color: var(--text-muted); }

.card-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}
.card-rating { font-size: 14px; font-weight: 600; color: var(--green-dark); }
.stars { color: var(--orange); }
.card-trips { font-size: 12px; color: var(--text-muted); }
.card-rate { font-size: 13px; font-weight: 600; color: var(--orange); }
.card-status { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 10px; }
.status-available { background: var(--green-light); color: var(--green-dark); }
.status-busy { background: #fce4ec; color: #c62828; }

/* ── Tags ─────────────────────────────────────── */
.tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: capitalize;
}
.tag-type { background: #e3f2fd; color: #1565c0; }
.tag-location { background: var(--orange-light); color: var(--orange); }
.tag-available { background: var(--green-light); color: var(--green-dark); }
.tag-busy { background: #fce4ec; color: #c62828; }

/* ── Modal ────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}
.modal-card {
  background: var(--white);
  border-radius: var(--radius);
  padding: 32px;
  width: 100%;
  max-width: 520px;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}
.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 18px;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: 6px;
}
.modal-close:hover { background: var(--bg); }

.profile-header { display: flex; gap: 20px; margin-bottom: 24px; align-items: flex-start; }
.profile-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: var(--green-light);
  color: var(--green-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 22px;
  flex-shrink: 0;
}
.profile-name { font-size: 20px; margin-bottom: 4px; }
.profile-vehicle { color: var(--text-muted); font-size: 14px; margin-bottom: 8px; }
.profile-tags { display: flex; gap: 6px; flex-wrap: wrap; }

.profile-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;
}
.stat-value { display: block; font-size: 18px; font-weight: 700; color: var(--green-dark); }
.stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }

.profile-section { margin-bottom: 16px; }
.profile-section h4 { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.unavailable-note { text-align: center; color: var(--text-muted); padding: 12px; }

/* ── Booking form ─────────────────────────────── */
.page-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 32px 24px;
}
.btn-back {
  background: none;
  border: none;
  color: var(--green);
  font-size: 14px;
  font-weight: 600;
  padding: 0;
  margin-bottom: 20px;
}
.form-card {
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  padding: 28px;
}
.form-header { display: flex; gap: 16px; align-items: center; margin-bottom: 24px; }
.form-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--green-light);
  color: var(--green-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}
.form-header h2 { font-size: 20px; margin-bottom: 4px; }
.form-sub { font-size: 13px; color: var(--text-muted); }

.booking-form { display: flex; flex-direction: column; gap: 16px; }
.booking-form label { display: flex; flex-direction: column; gap: 6px; font-size: 14px; font-weight: 500; }
.booking-form input {
  padding: 10px 14px;
  border: 1.5px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--white);
  color: var(--text);
  transition: border-color 0.15s;
}
.booking-form input:focus { outline: none; border-color: var(--green); }
.form-error { background: #fce4ec; color: #c62828; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; }

/* ── Phone prompt ─────────────────────────────── */
.prompt-card {
  background: var(--white);
  border: 1.5px solid var(--border);
  border-radius: var(--radius);
  padding: 40px 28px;
  text-align: center;
}
.prompt-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--green-light);
  color: var(--green);
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}
.prompt-card h2 { font-size: 24px; color: var(--green-dark); margin-bottom: 8px; }
.prompt-sub { color: var(--text-muted); margin-bottom: 28px; font-size: 14px; }

.phone-box {
  background: var(--green-light);
  border: 2px solid var(--green);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 20px;
}
.phone-label { font-size: 13px; color: var(--text-muted); margin-bottom: 4px; }
.phone-number { font-size: 28px; font-weight: 700; color: var(--green-dark); letter-spacing: 1px; margin-bottom: 16px; }
.btn-call {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--green);
  color: white;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-call:hover { background: var(--green-dark); }

.booking-summary {
  background: var(--bg);
  border-radius: var(--radius-sm);
  padding: 16px;
  margin-bottom: 20px;
  text-align: left;
}
.booking-summary p { font-size: 14px; margin-bottom: 6px; }
.booking-summary p:last-child { margin-bottom: 0; }

/* ── Buttons ──────────────────────────────────── */
.btn-primary {
  background: var(--green);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 15px;
  font-weight: 600;
  transition: background 0.15s;
}
.btn-primary:hover:not(:disabled) { background: var(--green-dark); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
  background: var(--white);
  color: var(--green);
  border: 2px solid var(--green);
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 15px;
  font-weight: 600;
  transition: all 0.15s;
}
.btn-secondary:hover { background: var(--green-light); }
.btn-full { width: 100%; margin-top: 8px; }

/* ── States ───────────────────────────────────── */
.loading { text-align: center; padding: 60px; color: var(--text-muted); }
.error-msg { background: #fce4ec; color: #c62828; padding: 16px; border-radius: var(--radius-sm); margin-bottom: 20px; }

/* ── Responsive ───────────────────────────────── */
@media (max-width: 640px) {
  .header-inner { flex-direction: column; align-items: flex-start; gap: 4px; }
  .drivers-grid { grid-template-columns: 1fr; }
  .profile-stats { grid-template-columns: repeat(2, 1fr); }
  .filter-bar { flex-direction: column; gap: 16px; }
}
```

- [ ] **Step 4: Update `agrimove-react/index.html` title**

Change the `<title>` tag from `agrimove-react` to `AgriMove — Agricultural Logistics`:
```html
<title>AgriMove — Agricultural Logistics</title>
```

- [ ] **Step 5: Start both servers and verify the app works end to end**

Terminal 1 (backend):
```bash
cd /Users/mac/Desktop/ALU/SE/backend && npm run dev
```

Terminal 2 (frontend):
```bash
cd /Users/mac/Desktop/ALU/SE/agrimove-react && npm run dev
```

Open `http://localhost:5173` in browser. Verify:
1. Driver list loads from PostgreSQL
2. Clicking a driver opens the profile modal
3. Clicking "Book This Driver" opens the booking form
4. Submitting the form shows the phone prompt with the driver's number and "Call Now" link
5. Clicking "Back to Drivers" returns to the list

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-react/src/App.jsx agrimove-react/src/App.css agrimove-react/src/index.css agrimove-react/index.html
git commit -m "feat: build full logistics UI with driver list, profile, booking flow"
```

---

## Task 12: README

**Files:**
- Create: `README.md` (at repo root `/Users/mac/Desktop/ALU/SE/`)

- [ ] **Step 1: Create `README.md`**

```markdown
# AgriMove — Agricultural Logistics Platform

A full-stack web app connecting Rwandan farmers with verified transport drivers. Browse available drivers, view their profiles, book transport, and call the driver directly to confirm.

## Live Flow

1. Browse drivers (filter by vehicle type, location, availability)
2. Click a driver card to view their full profile
3. Click **"Book This Driver"** to fill a booking form
4. Submit the form → see the driver's phone number and a **"Call Now"** button
5. Call the driver to confirm and arrange pick-up

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Backend | Node.js + Express 4 |
| Database | PostgreSQL 14+ |
| DB client | node-postgres (`pg`) |

---

## Prerequisites

Make sure the following are installed on your machine:

- **Node.js** v18 or higher — [download](https://nodejs.org/)
- **npm** v9 or higher (comes with Node.js)
- **PostgreSQL** 14 or higher — [download](https://www.postgresql.org/download/)

Verify:
```bash
node -v        # should print v18.x.x or higher
npm -v         # should print 9.x.x or higher
psql --version # should print psql (PostgreSQL) 14.x or higher
```

---

## Setup — Step by Step

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd SE
```

### 2. Set up the PostgreSQL database

Open a terminal and create the database:

```bash
createdb agrimove
```

> If `createdb` is not in your PATH, use:
> ```bash
> psql -U postgres -c "CREATE DATABASE agrimove;"
> ```

Apply the schema:

```bash
psql agrimove < backend/src/schema.sql
```

### 3. Configure the backend environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in your PostgreSQL credentials:

```
DATABASE_URL=postgres://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/agrimove
PORT=3001
```

**Common values:**

| Setup | DATABASE_URL |
|-------|-------------|
| Default postgres (no password) | `postgres://postgres@localhost:5432/agrimove` |
| Custom user + password | `postgres://myuser:mypassword@localhost:5432/agrimove` |
| Homebrew postgres (Mac) | `postgres://$(whoami)@localhost:5432/agrimove` |

### 4. Install backend dependencies

```bash
cd backend
npm install
```

### 5. Seed the database

This loads 8 sample drivers into PostgreSQL:

```bash
npm run seed
```

Expected output: `Seeded 8 drivers.`

### 6. Configure the frontend environment

```bash
cd ../agrimove-react
cp .env.example .env
```

The default `.env` already points to `http://localhost:3001/api` — no changes needed unless you changed the backend port.

### 7. Install frontend dependencies

```bash
npm install
```

---

## Running the App

You need **two terminals** running simultaneously.

**Terminal 1 — Start the backend:**

```bash
cd backend
npm run dev
```

Expected: `Server running on port 3001`

**Terminal 2 — Start the frontend:**

```bash
cd agrimove-react
npm run dev
```

Expected: `VITE v8.x.x  ready in xxx ms` and a local URL like `http://localhost:5173`

Open `http://localhost:5173` in your browser.

---

## Running Tests

Backend API tests (requires the database to be running and seeded):

```bash
cd backend
npm test
```

---

## Project Structure

```
SE/
├── backend/                  # Express REST API
│   ├── src/
│   │   ├── index.js          # App entry point
│   │   ├── db.js             # PostgreSQL connection pool
│   │   ├── schema.sql        # Database schema
│   │   ├── seed.js           # Seed script
│   │   └── routes/
│   │       ├── drivers.js    # GET /api/drivers, GET /api/drivers/:id
│   │       └── bookings.js   # POST /api/bookings, GET /api/bookings
│   ├── __tests__/            # Jest + Supertest API tests
│   ├── .env.example          # Environment variable template
│   └── package.json
│
└── agrimove-react/           # React + Vite frontend
    ├── src/
    │   ├── api/
    │   │   └── driversApi.js # Fetch wrappers for the backend
    │   ├── components/
    │   │   ├── DriverCard.jsx
    │   │   ├── DriverProfile.jsx
    │   │   ├── BookingForm.jsx
    │   │   ├── PhonePrompt.jsx
    │   │   └── FilterBar.jsx
    │   ├── App.jsx            # State machine + page routing
    │   ├── App.css            # All component styles
    │   └── index.css          # CSS variables + reset
    ├── .env.example           # Frontend environment template
    └── package.json
```

---

## API Reference

### Drivers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drivers` | List drivers. Query params: `type`, `location`, `available` |
| GET | `/api/drivers/:id` | Get a single driver by ID |

**Example:**
```bash
curl "http://localhost:3001/api/drivers?type=truck&available=true"
```

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings` | List all bookings |

**POST /api/bookings body:**
```json
{
  "driver_id": 1,
  "customer_name": "Farmer Name",
  "customer_phone": "+250 788 000 000",
  "cargo_type": "Vegetables",
  "pickup_location": "Kigali Market",
  "destination": "Musanze"
}
```

---

## Troubleshooting

**"Could not load drivers. Make sure the backend is running."**
→ Start the backend: `cd backend && npm run dev`

**`ECONNREFUSED` on port 5432**
→ PostgreSQL is not running. Start it:
- Mac (Homebrew): `brew services start postgresql`
- Mac (Postgres.app): open the app and start
- Linux: `sudo systemctl start postgresql`

**`role "postgres" does not exist`**
→ Use your system username instead: `postgres://$(whoami)@localhost:5432/agrimove`

**`database "agrimove" does not exist`**
→ Run: `createdb agrimove && psql agrimove < backend/src/schema.sql`

**`Seeded 0 drivers` or seed fails**
→ Ensure the schema was applied first: `psql agrimove < backend/src/schema.sql`

**Port 3001 already in use**
→ Change `PORT=3002` in `backend/.env` and `VITE_API_URL=http://localhost:3002/api` in `agrimove-react/.env`
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add README.md
git commit -m "docs: add comprehensive setup README"
```

---

## Self-Review Checklist

- [x] All 5 SRS features covered: browse drivers, view profile, book, see phone number, call
- [x] PostgreSQL persistence via `pg` Pool
- [x] Backend tests for all routes (drivers GET with filters, bookings POST)
- [x] No TBD or TODO in any code block
- [x] File paths are exact and consistent across all tasks
- [x] `createBooking` called with correct field names matching backend schema
- [x] `driver_phone` and `driver_name` returned from POST /api/bookings and consumed by PhonePrompt
- [x] Filter values passed correctly from FilterBar → App → fetchDrivers → query params
- [x] `.env` files excluded from git, `.env.example` files committed
- [x] README covers every step: prereqs, DB setup, env config, install, seed, run, test, troubleshoot
