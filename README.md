# AgriMove — Agricultural Logistics Platform

A full-stack web application connecting Rwandan farmers with verified agricultural transport drivers. Browse available drivers, view their profiles, book transport, and call the driver directly to confirm your shipment.

## What It Does

1. **Browse drivers** — filter by vehicle type, location, or availability
2. **View driver profiles** — see vehicle, capacity, cargo types, rating, and trip history
3. **Book transport** — fill in your name, phone, pickup location, and destination
4. **Call to confirm** — get the driver's phone number with a one-tap "Call Now" button

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 |
| Backend API | Node.js 18+ + Express 4 |
| Database | PostgreSQL (Neon cloud) |
| DB Client | node-postgres (`pg`) |
| Tests | Jest + Supertest |

---

## Prerequisites

Install the following before starting:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org/)
- **npm** v9 or higher (comes with Node.js)
- **A PostgreSQL database** — this project uses [Neon](https://neon.tech) (free tier works)

Verify your Node.js installation:
```bash
node -v   # v18.x.x or higher
npm -v    # 9.x.x or higher
```

---

## Setup — Step by Step

### Step 1: Clone the repository

```bash
git clone <your-repo-url>
cd SE
```

### Step 2: Set up your database

This project uses **Neon** (cloud PostgreSQL). If you don't have a Neon account:

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy your **connection string** — it looks like:
   ```
   postgresql://user:password@host/dbname?sslmode=require&channel_binding=require
   ```

### Step 3: Configure the backend environment

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set your database URL:

```
DATABASE_URL=postgresql://YOUR_USER:YOUR_PASSWORD@YOUR_HOST/YOUR_DB?sslmode=require&channel_binding=require
PORT=3001
```

Replace the placeholder values with your actual Neon connection string.

### Step 4: Install backend dependencies

```bash
cd backend
npm install
```

### Step 5: Apply the database schema

This creates the `drivers` and `bookings` tables in your Neon database:

```bash
cd backend
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query(fs.readFileSync('./src/schema.sql', 'utf8'))
  .then(() => { console.log('Schema applied successfully'); pool.end(); })
  .catch(err => { console.error('Schema error:', err.message); pool.end(); process.exit(1); });
"
```

Expected output: `Schema applied successfully`

### Step 6: Seed the database

Load 8 sample drivers into the database:

```bash
npm run seed
```

Expected output: `Seeded 8 drivers.`

### Step 7: Configure the frontend environment

```bash
cd ../agrimove-react
cp .env.example .env
```

The default `.env` already points to `http://localhost:3001/api` — no changes needed unless you changed the backend port.

### Step 8: Install frontend dependencies

```bash
npm install
```

---

## Running the App

You need **two terminals** open at the same time.

**Terminal 1 — Start the backend:**

```bash
cd backend
npm run dev
```

Expected output:
```
Server running on port 3001
```

**Terminal 2 — Start the frontend:**

```bash
cd agrimove-react
npm run dev
```

Expected output:
```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

## Running Tests

Tests connect to your real Neon database, so the backend must be configured (`.env` set up) before running tests.

```bash
cd backend
npm test
```

Expected: 6 tests passing across 2 test suites (drivers + bookings).

---

## Project Structure

```
SE/
├── backend/                     # Express REST API
│   ├── src/
│   │   ├── index.js             # App entry point + middleware
│   │   ├── db.js                # PostgreSQL connection pool
│   │   ├── schema.sql           # Database table definitions
│   │   ├── seed.js              # Loads sample drivers into DB
│   │   └── routes/
│   │       ├── drivers.js       # GET /api/drivers, GET /api/drivers/:id
│   │       └── bookings.js      # POST /api/bookings, GET /api/bookings
│   ├── __tests__/
│   │   ├── drivers.test.js      # Driver route tests
│   │   └── bookings.test.js     # Booking route tests
│   ├── .env.example             # Environment variable template
│   └── package.json
│
└── agrimove-react/              # React + Vite frontend
    ├── src/
    │   ├── api/
    │   │   └── driversApi.js    # fetch wrappers (fetchDrivers, createBooking)
    │   ├── components/
    │   │   ├── DriverCard.jsx   # Driver listing card
    │   │   ├── DriverProfile.jsx # Full profile modal
    │   │   ├── BookingForm.jsx  # Booking details form
    │   │   ├── PhonePrompt.jsx  # Call-to-confirm screen
    │   │   └── FilterBar.jsx    # Filter by type/location/availability
    │   ├── App.jsx              # App state machine + routing
    │   ├── App.css              # Component styles
    │   └── index.css            # CSS variables + reset
    ├── .env.example             # Frontend environment template
    └── package.json
```

---

## API Reference

### Drivers

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/drivers` | List all drivers |
| `GET` | `/api/drivers?type=truck` | Filter by vehicle type (`truck`, `pickup`, `van`) |
| `GET` | `/api/drivers?location=Kigali` | Filter by location |
| `GET` | `/api/drivers?available=true` | Show only available drivers |
| `GET` | `/api/drivers/:id` | Get a single driver by ID |

**Example request:**
```bash
curl "http://localhost:3001/api/drivers?type=truck&available=true"
```

### Bookings

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/bookings` | Create a new booking |
| `GET` | `/api/bookings` | List all bookings |

**POST /api/bookings — Request body:**
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

**POST /api/bookings — Response (201):**
```json
{
  "id": 1,
  "driver_id": 1,
  "customer_name": "Farmer Name",
  "customer_phone": "+250 788 000 000",
  "cargo_type": "Vegetables",
  "pickup_location": "Kigali Market",
  "destination": "Musanze",
  "status": "pending",
  "created_at": "2026-03-30T...",
  "driver_phone": "+250 788 101 001",
  "driver_name": "Jean-Pierre Nkurunziza"
}
```

---

## Mobile App (Android)

A React Native (Expo) Android app in `agrimove-mobile/`.

### Prerequisites

- **Android Studio** with an Android emulator configured (API 33+ recommended)
- **Node.js** v20+ and npm
- The backend must be running on port 3001

### Setup

```bash
cd agrimove-mobile
npm install
cp .env.example .env
```

The default `EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api` works for Android emulator (10.0.2.2 = your machine's localhost).

### Running

Start the backend first (Terminal 1):
```bash
cd backend && npm run dev
```

Start Expo (Terminal 2):
```bash
cd agrimove-mobile && npx expo start --android
```

Android Studio emulator must be running. Expo will install the app and launch it automatically.

### App Flow

1. **Sign Up** — create an account as a Customer (farmer/buyer) or Driver (transport provider)
2. **Browse Drivers** — filter by vehicle type (Truck, Pickup, Van) or availability
3. **View Profile** — tap any driver card to see a bottom sheet with stats and details
4. **Book** — fill in pickup location, destination, cargo type, and your phone number
5. **Call to Confirm** — see the driver's number and tap **Call Now** to dial directly

---

## Troubleshooting

**"Could not load drivers. Make sure the backend is running."**
→ The frontend cannot reach the backend. Start it: `cd backend && npm run dev`

**`Error: connect ECONNREFUSED` or SSL errors**
→ Check your `DATABASE_URL` in `backend/.env`. Make sure it ends with `?sslmode=require&channel_binding=require` for Neon.

**`Seeded 0 drivers` or seed fails**
→ Make sure the schema was applied first (Step 5). Run the schema command again, then re-seed.

**Port 3001 already in use**
→ Change `PORT=3002` in `backend/.env` and update `VITE_API_URL=http://localhost:3002/api` in `agrimove-react/.env`, then restart both servers.

**Tests fail with connection errors**
→ Verify `backend/.env` has the correct `DATABASE_URL` and the Neon database is accessible.

**`npm run dev` in backend gives "SyntaxError"**
→ Make sure you are using Node.js v18 or higher: `node -v`
