# AgriMove Mobile App — Design Spec

**Date:** 2026-03-31
**Platform:** Android (Expo React Native)
**Design style:** Clean & Minimal — white backgrounds, sky blue (#0ea5e9) primary, subtle shadows, no gradients

---

## Overview

A React Native (Expo) mobile app for the AgriMove agricultural logistics platform. Users must sign up or log in before accessing anything. After authentication, both customers and drivers have full access to all features. The app communicates with the existing Express + Neon PostgreSQL backend, which will be extended with auth endpoints.

---

## Architecture

### New project
`agrimove-mobile/` — Expo managed workflow, sits alongside existing `backend/` and `agrimove-react/`

### Backend additions (extend existing `backend/`)
- New `users` table in Neon DB
- `user_id` column added to `drivers` table
- New endpoints:
  - `POST /api/auth/register` — create customer or driver account
  - `POST /api/auth/login` — email + password → returns JWT
  - `GET /api/auth/me` — returns current user from JWT
- Bookings `POST` updated to require JWT (customer must be authenticated)
- Password hashing: `bcryptjs`
- JWT: `jsonwebtoken`, 7-day expiry

### Auth storage
JWT stored in **Expo SecureStore** (encrypted). On app launch, token is read and validated; if valid, user goes straight to the app. If expired or absent, user is sent to Login.

---

## Database Changes

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'driver')),
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE drivers ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
```

When a driver registers, one row is created in `users` (role='driver') **and** one row in `drivers` (with all vehicle details + `user_id` set). The driver appears in the listing immediately.

---

## Navigation Structure

```
AppNavigator
├── AuthStack (shown when NOT authenticated)
│   ├── SplashScreen       — logo + check token → route to Login or App
│   ├── LoginScreen        — email + password
│   └── RegisterScreen     — role picker (Customer | Driver) + details form
│       └── (Driver role shows extra fields: vehicle, type, capacity,
│            location, crops, rate, phone)
│
└── AppStack (shown when authenticated)
    ├── DriverListScreen   — scrollable list, filter chips (type, available)
    ├── DriverProfileScreen — bottom sheet modal: stats, carries, Book button
    ├── BookingFormScreen  — pickup, destination, cargo type, phone
    ├── BookingConfirmedScreen — success + driver phone + Call Now button
    └── ProfileScreen      — user info, role badge, logout button
```

`AppNavigator` checks auth state from `AuthContext`. If token exists and is valid → `AppStack`. Otherwise → `AuthStack`.

---

## Screens

### SplashScreen
- AgriMove logo centered
- Checks SecureStore for JWT on mount
- Routes to LoginScreen (no token) or DriverListScreen (valid token)
- No user interaction

### LoginScreen
- Logo + "Welcome back" heading
- Email input, password input (secure)
- "Sign In" primary button → POST /api/auth/login → store JWT → navigate to AppStack
- "Don't have an account? Sign Up" link → RegisterScreen
- Inline error message on failure

### RegisterScreen
- Back button
- Role selector: **Customer (Farmer)** | **Driver** — tapping a card selects it
- Common fields: Full Name, Email, Password
- Driver-only extra fields (shown when Driver selected):
  - Phone number
  - Vehicle name (e.g. "Isuzu Truck")
  - Vehicle type: select (Truck / Pickup / Van)
  - Capacity (e.g. "5 tonnes")
  - Location: select from Rwanda districts
  - Crops/cargo carried (e.g. "Vegetables, Grains")
  - Daily rate (RWF)
- "Create Account" button → POST /api/auth/register → JWT → AppStack
- Inline validation errors

### DriverListScreen
- Header: AgriMove logo left, user name + avatar initial right
- Filter chips: All · Truck · Pickup · Van · Available Only
- Count label: "8 Drivers Found"
- Vertical list of DriverCard components
- Pull-to-refresh

#### DriverCard
- Avatar circle (initials), Name, Vehicle + capacity, location + type tags
- Right: available dot (green/red), rate, star rating
- Unavailable cards slightly dimmed, still tappable to view profile
- Tap → opens DriverProfileScreen (bottom sheet)

### DriverProfileScreen (bottom sheet)
- Drag handle at top
- Avatar, name, vehicle, location + availability tags
- Stats row: Rating · Trips · Capacity · Rate/day
- "Carries" section: crops text
- "Book This Driver" primary button (only shown if driver is available)
- "Unavailable" message if not available

### BookingFormScreen
- Back button + "Book Driver" title
- Driver summary banner at top (avatar, name, vehicle, rate) — sky blue tint
- Fields: Pickup Location*, Destination*, Cargo Type (optional), Your Phone*
- Customer name and email pre-filled from auth context (not editable here)
- "Confirm Booking" button → POST /api/bookings (with JWT header) → BookingConfirmedScreen
- Error message on failure

### BookingConfirmedScreen
- Green checkmark icon
- "Booking Confirmed!" heading + booking ID
- Phone box (green tinted): driver name, phone number (large), "📞 Call Now" button (tel: link)
- Booking summary: pickup, destination
- "Back to Drivers" button → DriverListScreen

### ProfileScreen
- Accessible via header avatar tap or bottom tab
- User's name, email, role badge (Customer / Driver)
- If Driver: their vehicle info summary
- "Sign Out" button → clears JWT from SecureStore → AuthStack

---

## API Layer (`agrimove-mobile/src/api/`)

```
api/
  auth.js      — register(data), login(email, password), getMe(token)
  drivers.js   — fetchDrivers(filters, token), fetchDriver(id, token)
  bookings.js  — createBooking(data, token)
```

Base URL from environment variable `EXPO_PUBLIC_API_URL` (e.g. `http://10.0.2.2:3001/api` for Android emulator, or the deployed URL).

All authenticated requests send `Authorization: Bearer <token>` header.

---

## Auth Context (`agrimove-mobile/src/context/AuthContext.jsx`)

Provides:
- `user` — current user object (null if not logged in)
- `token` — JWT string
- `login(token, user)` — stores to SecureStore + updates state
- `logout()` — clears SecureStore + resets state
- `loading` — true while checking stored token on startup

---

## Design Tokens

```js
colors: {
  primary: '#0ea5e9',       // sky blue — buttons, links, active states
  primaryLight: '#f0f9ff',  // light blue — tinted backgrounds
  primaryDark: '#0369a1',   // dark blue — pressed states
  success: '#22c55e',       // green — available dot, call button
  successLight: '#f0fdf4',  // light green — phone box background
  error: '#ef4444',         // red — unavailable, errors
  text: '#0f172a',          // near-black — headings
  textMuted: '#64748b',     // gray — secondary text
  border: '#e2e8f0',        // light gray — input borders, dividers
  bg: '#f8fafc',            // off-white — screen backgrounds
  white: '#ffffff',         // white — cards, inputs
}

spacing: 4px base unit (4, 8, 12, 16, 20, 24, 28, 32)
borderRadius: { sm: 8, md: 12, lg: 16, full: 9999 }
fontSize: { xs: 10, sm: 12, base: 14, md: 16, lg: 18, xl: 22, xxl: 28 }
```

---

## File Structure

```
agrimove-mobile/
├── app.json                    — Expo config
├── App.jsx                     — root: AuthContext + AppNavigator
├── package.json
├── .env.example                — EXPO_PUBLIC_API_URL
├── src/
│   ├── api/
│   │   ├── auth.js
│   │   ├── drivers.js
│   │   └── bookings.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── navigation/
│   │   └── AppNavigator.jsx    — root navigator (auth vs app stack)
│   ├── screens/
│   │   ├── SplashScreen.jsx
│   │   ├── LoginScreen.jsx
│   │   ├── RegisterScreen.jsx
│   │   ├── DriverListScreen.jsx
│   │   ├── DriverProfileScreen.jsx
│   │   ├── BookingFormScreen.jsx
│   │   ├── BookingConfirmedScreen.jsx
│   │   └── ProfileScreen.jsx
│   ├── components/
│   │   ├── DriverCard.jsx
│   │   ├── FilterChip.jsx
│   │   └── StatsRow.jsx
│   └── theme.js                — colors, spacing, typography constants
```

---

## Backend File Changes

```
backend/src/
├── schema.sql         — ADD users table + ALTER drivers ADD user_id
├── routes/
│   ├── auth.js        — NEW: POST /api/auth/register, /login, GET /me
│   ├── drivers.js     — unchanged (drivers created via auth/register for drivers)
│   └── bookings.js    — UPDATED: require JWT middleware
├── middleware/
│   └── requireAuth.js — NEW: validates Bearer JWT, attaches req.user
└── index.js           — mount /api/auth router
```

---

## Constraints & Decisions

- **Android emulator base URL:** `http://10.0.2.2:3001/api` (maps to host machine localhost)
- **No driver approval flow** — drivers appear in listing immediately after signup
- **JWT expiry:** 7 days — user stays logged in across app restarts
- **No password reset flow** — out of scope
- **No image uploads** — driver avatars use initials only
- **No push notifications** — out of scope
- **Driver can also browse other drivers** — role doesn't restrict navigation
