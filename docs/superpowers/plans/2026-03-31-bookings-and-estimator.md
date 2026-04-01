# My Bookings + Price Estimator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "My Bookings" screen where customers see their booking history, and a "Price Estimator" screen that uses Google Places autocomplete for location input and Google Distance Matrix API to calculate real km and estimated cost.

**Architecture:** Backend gets a `user_id` column on bookings and a new `GET /api/bookings/mine` endpoint (JWT-protected). Mobile gets two new screens: `MyBookingsScreen` (accessible from ProfileScreen) and `PriceEstimatorScreen` (accessible from DriverProfileScreen via "Estimate Cost" button). Location inputs use `react-native-google-places-autocomplete`. Distance is fetched from Google Distance Matrix API via a direct `fetch()` call — no extra library needed.

**Tech Stack:** Express + pg (backend), React Native + Expo, `react-native-google-places-autocomplete`, Google Places API, Google Distance Matrix API

**Prerequisite:** A Google Maps API key with **Places API** and **Distance Matrix API** enabled. Add it to `agrimove-mobile/.env` as `EXPO_PUBLIC_GOOGLE_MAPS_KEY=<your_key>` and to `agrimove-mobile/.env.example` as `EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key_here`.

---

## File Map

| File | Change | Responsibility |
|------|--------|---------------|
| `backend/src/migrate-bookings-user.js` | Create | One-time migration: add `user_id` to bookings |
| `backend/src/schema.sql` | Modify | Add `user_id` FK to bookings table |
| `backend/src/routes/bookings.js` | Modify | Save `user_id` on POST; add `GET /mine` endpoint |
| `agrimove-mobile/.env.example` | Modify | Document `EXPO_PUBLIC_GOOGLE_MAPS_KEY` |
| `agrimove-mobile/src/api/bookings.js` | Modify | Add `fetchMyBookings(token)` |
| `agrimove-mobile/src/screens/MyBookingsScreen.jsx` | Create | List customer's own bookings |
| `agrimove-mobile/src/screens/PriceEstimatorScreen.jsx` | Create | Places autocomplete + Distance Matrix + price calc |
| `agrimove-mobile/src/navigation/AppNavigator.jsx` | Modify | Register two new screens |
| `agrimove-mobile/src/screens/ProfileScreen.jsx` | Modify | Add "My Bookings" button |
| `agrimove-mobile/src/screens/DriverProfileScreen.jsx` | Modify | Add "Estimate Cost" button |

---

## Task 0: Backend — add user_id to bookings + /mine endpoint

**Files:**
- Create: `backend/src/migrate-bookings-user.js`
- Modify: `backend/src/schema.sql`
- Modify: `backend/src/routes/bookings.js`

- [ ] **Step 1: Create migration script**

Create `backend/src/migrate-bookings-user.js`:

```js
require('dotenv').config();
const pool = require('./db');

async function migrate() {
  await pool.query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  console.log('Migration done');
  process.exit(0);
}
migrate().catch(e => { console.error(e); process.exit(1); });
```

Run it:
```bash
cd /Users/mac/Desktop/ALU/SE/backend && node src/migrate-bookings-user.js
```
Expected: `Migration done`

- [ ] **Step 2: Update schema.sql — add user_id to bookings**

In `backend/src/schema.sql`, find the bookings table and add `user_id` after `destination`:

Replace:
```sql
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

With:
```sql
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  driver_id INTEGER REFERENCES drivers(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  cargo_type VARCHAR(255),
  pickup_location VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

- [ ] **Step 3: Update bookings route**

Replace `backend/src/routes/bookings.js` with:

```js
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
```

- [ ] **Step 4: Test /mine endpoint**

Start backend (kill any existing first):
```bash
pkill -f "node src/index.js" 2>/dev/null || pkill -f nodemon 2>/dev/null || true
cd /Users/mac/Desktop/ALU/SE/backend && npm run dev &
sleep 3
```

Sign up to get a token:
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Mine Test","email":"mine_'$(date +%s)'@test.com","password":"test1234","role":"customer"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "Token: $TOKEN"
```

Call /mine:
```bash
curl -s http://localhost:3001/api/bookings/mine -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; data=json.load(sys.stdin); print('OK, got', len(data), 'bookings')"
```
Expected: `OK, got 0 bookings`

Call /mine without token — should get 401:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/bookings/mine
```
Expected: `401`

Kill test server:
```bash
pkill -f "node src/index.js" 2>/dev/null || pkill -f nodemon 2>/dev/null || true
```

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add backend/src/migrate-bookings-user.js backend/src/schema.sql backend/src/routes/bookings.js
git commit -m "feat: add user_id to bookings, add GET /api/bookings/mine"
```

---

## Task 1: Install Google Places package + add API key env var

**Files:**
- Modify: `agrimove-mobile/.env.example`
- Modify: `agrimove-mobile/.env`

- [ ] **Step 1: Install react-native-google-places-autocomplete**

```bash
cd /Users/mac/Desktop/ALU/SE/agrimove-mobile
npm install react-native-google-places-autocomplete
```

Expected: no errors.

- [ ] **Step 2: Add API key to env files**

In `agrimove-mobile/.env.example`, add:
```
EXPO_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key_here
```

In `agrimove-mobile/.env`, add your real key:
```
EXPO_PUBLIC_GOOGLE_MAPS_KEY=YOUR_ACTUAL_KEY_HERE
```

(`.env` is gitignored — the real key is safe.)

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/.env.example agrimove-mobile/package.json agrimove-mobile/package-lock.json
git commit -m "feat: install google-places-autocomplete, document API key env var"
```

---

## Task 2: Add fetchMyBookings to API layer

**Files:**
- Modify: `agrimove-mobile/src/api/bookings.js`

- [ ] **Step 1: Add fetchMyBookings**

Replace `agrimove-mobile/src/api/bookings.js` with:

```js
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function createBooking(data, token) {
  const res = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Booking failed');
  return json;
}

export async function fetchMyBookings(token) {
  const res = await fetch(`${BASE}/bookings/mine`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch bookings');
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/api/bookings.js
git commit -m "feat: add fetchMyBookings to API layer"
```

---

## Task 3: MyBookingsScreen

**Files:**
- Create: `agrimove-mobile/src/screens/MyBookingsScreen.jsx`

- [ ] **Step 1: Create MyBookingsScreen**

Create `agrimove-mobile/src/screens/MyBookingsScreen.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { fetchMyBookings } from '../api/bookings';
import { colors, spacing, radius, fontSize } from '../theme';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    pending:   { bg: '#fef9c3', color: '#854d0e' },
    confirmed: { bg: '#dcfce7', color: '#15803d' },
    completed: { bg: '#e0f2fe', color: '#0369a1' },
    cancelled: { bg: '#fee2e2', color: '#be123c' },
  };
  const style = map[status] || map.pending;
  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.badgeText, { color: style.color }]}>{status}</Text>
    </View>
  );
}

function BookingItem({ item }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.driverName}>{item.driver_name || 'Unknown driver'}</Text>
          <Text style={styles.vehicle}>{item.driver_vehicle || ''}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.route}>
        <View style={styles.routeRow}>
          <Text style={styles.routeIcon}>📍</Text>
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup_location}</Text>
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeRow}>
          <Text style={styles.routeIcon}>🏁</Text>
          <Text style={styles.routeText} numberOfLines={1}>{item.destination}</Text>
        </View>
      </View>

      {item.cargo_type ? (
        <Text style={styles.cargo}>Cargo: {item.cargo_type}</Text>
      ) : null}

      <Text style={styles.date}>{formatDate(item.created_at)}</Text>
    </View>
  );
}

export default function MyBookingsScreen({ navigation }) {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchMyBookings(token);
      setBookings(data);
    } catch {
      setError('Could not load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Bookings</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <BookingItem item={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>No bookings yet.</Text>
              <Text style={styles.emptySub}>Book a driver to see your history here.</Text>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[colors.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600', width: 60 },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  list: { padding: spacing.lg },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.md,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  driverName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  vehicle: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { fontSize: fontSize.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  route: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  routeIcon: { fontSize: 14 },
  routeText: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  routeDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs, marginLeft: 22 },
  cargo: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.xs },
  date: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'right' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.lg },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  retryText: { color: colors.white, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl * 2 },
  emptyIcon: { fontSize: 48, marginBottom: spacing.lg },
  emptyText: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  emptySub: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center' },
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/screens/MyBookingsScreen.jsx
git commit -m "feat: add MyBookingsScreen showing customer booking history"
```

---

## Task 4: PriceEstimatorScreen

**Files:**
- Create: `agrimove-mobile/src/screens/PriceEstimatorScreen.jsx`

The screen takes an optional `driver` param from route. If a driver is passed, it shows that driver's rate in the estimate. The user picks pickup and destination via Google Places autocomplete. On "Calculate", the app calls Google Distance Matrix API and shows km, duration, and estimated cost.

Price formula: `estimated = Math.round(driver.rate * distanceKm / 250)` where 250 is assumed daily km range. If no driver is passed, a generic per-km rate of RWF 60/km is used.

- [ ] **Step 1: Create PriceEstimatorScreen**

Create `agrimove-mobile/src/screens/PriceEstimatorScreen.jsx`:

```jsx
import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { colors, spacing, radius, fontSize } from '../theme';

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';
const DEFAULT_RATE_PER_KM = 60; // RWF per km when no driver selected
const ASSUMED_DAILY_KM = 250;   // km a driver covers per day (rate basis)

async function fetchDistance(originPlaceId, destinationPlaceId) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=place_id:${originPlaceId}&destinations=place_id:${destinationPlaceId}&units=metric&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  const element = json.rows?.[0]?.elements?.[0];
  if (!element || element.status !== 'OK') throw new Error('Could not calculate distance');
  return {
    distanceText: element.distance.text,        // e.g. "45.2 km"
    distanceKm: element.distance.value / 1000,  // numeric km
    durationText: element.duration.text,         // e.g. "1 hour 12 mins"
  };
}

export default function PriceEstimatorScreen({ route, navigation }) {
  const driver = route.params?.driver || null;
  const ratePerKm = driver ? driver.rate / ASSUMED_DAILY_KM : DEFAULT_RATE_PER_KM;

  const pickupRef = useRef(null);
  const destRef = useRef(null);

  const [originPlaceId, setOriginPlaceId] = useState(null);
  const [originName, setOriginName] = useState('');
  const [destPlaceId, setDestPlaceId] = useState(null);
  const [destName, setDestName] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleCalculate() {
    if (!originPlaceId || !destPlaceId) {
      setError('Please select both pickup and destination from the suggestions');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const { distanceText, distanceKm, durationText } = await fetchDistance(originPlaceId, destPlaceId);
      const estimatedPrice = Math.round(ratePerKm * distanceKm);
      setResult({ distanceText, distanceKm, durationText, estimatedPrice });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const autocompleteProps = {
    fetchDetails: true,
    enablePoweredByContainer: false,
    query: { key: GOOGLE_KEY, language: 'en', components: 'country:rw' },
    styles: {
      textInput: styles.autocompleteInput,
      listView: styles.dropdown,
      row: styles.dropdownRow,
      description: styles.dropdownText,
      poweredContainer: { display: 'none' },
    },
    textInputProps: { placeholderTextColor: colors.textMuted },
    keepResultsAfterBlur: true,
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Price Estimator</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {driver ? (
            <View style={styles.driverBanner}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverInitials}>{driver.initials}</Text>
              </View>
              <View>
                <Text style={styles.driverName}>{driver.name}</Text>
                <Text style={styles.driverRate}>RWF {Number(driver.rate).toLocaleString()}/day · ~RWF {Math.round(ratePerKm)}/km</Text>
              </View>
            </View>
          ) : (
            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>Estimate transport cost for any route</Text>
              <Text style={styles.infoSub}>Using standard rate of RWF {DEFAULT_RATE_PER_KM}/km</Text>
            </View>
          )}

          <Text style={styles.label}>Pickup Location</Text>
          <View style={styles.autocompleteWrap}>
            <GooglePlacesAutocomplete
              ref={pickupRef}
              placeholder="Search pickup location..."
              onPress={(data) => {
                setOriginPlaceId(data.place_id);
                setOriginName(data.description);
                setResult(null);
              }}
              {...autocompleteProps}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.md }]}>Destination</Text>
          <View style={styles.autocompleteWrap}>
            <GooglePlacesAutocomplete
              ref={destRef}
              placeholder="Search destination..."
              onPress={(data) => {
                setDestPlaceId(data.place_id);
                setDestName(data.description);
                setResult(null);
              }}
              {...autocompleteProps}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.calcBtn, (!originPlaceId || !destPlaceId) && styles.calcBtnDisabled]}
            onPress={handleCalculate}
            disabled={loading || !originPlaceId || !destPlaceId}
          >
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.calcBtnText}>Calculate Distance & Price</Text>}
          </TouchableOpacity>

          {result ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>Estimate</Text>

              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Distance</Text>
                <Text style={styles.resultValue}>{result.distanceText}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Driving time</Text>
                <Text style={styles.resultValue}>{result.durationText}</Text>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Estimated cost</Text>
                <Text style={styles.resultPrice}>RWF {result.estimatedPrice.toLocaleString()}</Text>
              </View>

              <Text style={styles.disclaimer}>
                * Estimate based on {driver ? `${driver.name}'s rate` : 'standard rate'}. Actual price is agreed with the driver.
              </Text>

              {driver ? (
                <TouchableOpacity
                  style={styles.bookBtn}
                  onPress={() => navigation.navigate('BookingForm', { driver })}
                >
                  <Text style={styles.bookBtnText}>Book This Driver</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  back: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600', width: 60 },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  container: { padding: spacing.xl, paddingBottom: 80 },
  driverBanner: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'center',
    backgroundColor: colors.primaryLight, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.xl,
  },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#bae6fd', alignItems: 'center', justifyContent: 'center' },
  driverInitials: { fontSize: fontSize.base, fontWeight: '700', color: '#0369a1' },
  driverName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  driverRate: { fontSize: fontSize.xs, color: colors.primaryDark, marginTop: 2 },
  infoBanner: {
    backgroundColor: colors.bg, borderRadius: radius.md,
    padding: spacing.lg, marginBottom: spacing.xl, alignItems: 'center',
  },
  infoText: { fontSize: fontSize.base, fontWeight: '600', color: colors.text },
  infoSub: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 4 },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  autocompleteWrap: { zIndex: 10, marginBottom: spacing.lg },
  autocompleteInput: {
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base,
    color: colors.text, height: 48,
  },
  dropdown: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginTop: 2 },
  dropdownRow: { padding: spacing.md },
  dropdownText: { fontSize: fontSize.sm, color: colors.text },
  error: { backgroundColor: colors.errorLight, color: colors.error, padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.lg, fontSize: fontSize.sm },
  calcBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.xl },
  calcBtnDisabled: { backgroundColor: colors.border },
  calcBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  resultCard: {
    backgroundColor: colors.bg, borderRadius: radius.lg,
    padding: spacing.xl, borderWidth: 1.5, borderColor: colors.border,
  },
  resultTitle: { fontSize: fontSize.base, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  resultDivider: { height: 1, backgroundColor: colors.border },
  resultLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  resultValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '700' },
  resultPrice: { fontSize: fontSize.lg, color: colors.primary, fontWeight: '800' },
  disclaimer: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.lg, lineHeight: 16 },
  bookBtn: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginTop: spacing.lg },
  bookBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
});
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/screens/PriceEstimatorScreen.jsx
git commit -m "feat: add PriceEstimatorScreen with Google Places + Distance Matrix"
```

---

## Task 5: Wire navigation + entry points

**Files:**
- Modify: `agrimove-mobile/src/navigation/AppNavigator.jsx`
- Modify: `agrimove-mobile/src/screens/ProfileScreen.jsx`
- Modify: `agrimove-mobile/src/screens/DriverProfileScreen.jsx`

- [ ] **Step 1: Add new screens to AppNavigator**

Read `agrimove-mobile/src/navigation/AppNavigator.jsx`. Add these two imports at the top alongside the other screen imports:

```js
import MyBookingsScreen from '../screens/MyBookingsScreen';
import PriceEstimatorScreen from '../screens/PriceEstimatorScreen';
```

Inside the authenticated `<>...</>` stack block, add after `<Stack.Screen name="Profile" .../>`:

```jsx
<Stack.Screen name="MyBookings" component={MyBookingsScreen} options={{ animation: 'slide_from_right' }} />
<Stack.Screen name="PriceEstimator" component={PriceEstimatorScreen} options={{ animation: 'slide_from_right' }} />
```

- [ ] **Step 2: Add "My Bookings" button to ProfileScreen**

In `agrimove-mobile/src/screens/ProfileScreen.jsx`, add a "My Bookings" button before the divider above "Sign Out".

Find this block:
```jsx
        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
```

Replace with:
```jsx
        <View style={styles.divider} />

        <TouchableOpacity style={styles.bookingsBtn} onPress={() => navigation.navigate('MyBookings')}>
          <Text style={styles.bookingsBtnText}>📋  My Bookings</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
```

Add these styles to ProfileScreen's StyleSheet:
```js
  bookingsBtn: {
    borderWidth: 2, borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xxxl, paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  bookingsBtnText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.base },
```

- [ ] **Step 3: Add "Estimate Cost" button to DriverProfileScreen**

In `agrimove-mobile/src/screens/DriverProfileScreen.jsx`, find the available driver section:

```jsx
          {driver.available ? (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('BookingForm', { driver })}
            >
              <Text style={styles.btnText}>Book This Driver</Text>
            </TouchableOpacity>
          ) : (
```

Replace with:
```jsx
          {driver.available ? (
            <>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => navigation.navigate('BookingForm', { driver })}
              >
                <Text style={styles.btnText}>Book This Driver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnOutline}
                onPress={() => navigation.navigate('PriceEstimator', { driver })}
              >
                <Text style={styles.btnOutlineText}>🧮  Estimate Cost</Text>
              </TouchableOpacity>
            </>
          ) : (
```

Add these styles to DriverProfileScreen's StyleSheet:
```js
  btnOutline: { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  btnOutlineText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.base },
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/navigation/AppNavigator.jsx agrimove-mobile/src/screens/ProfileScreen.jsx agrimove-mobile/src/screens/DriverProfileScreen.jsx
git commit -m "feat: wire MyBookings and PriceEstimator into navigation"
```

---

## Self-Review

**Spec coverage:**
- ✅ Customer sees their bookings — MyBookingsScreen + `/api/bookings/mine`
- ✅ Location search with real map data — Google Places Autocomplete
- ✅ Real distance in km — Google Distance Matrix API
- ✅ Estimated price — driver rate / 250 km * actual distance
- ✅ Entry point for Estimator — "Estimate Cost" button on DriverProfileScreen
- ✅ Entry point for My Bookings — "My Bookings" button on ProfileScreen
- ✅ "Book This Driver" shortcut from Estimator results when a driver is pre-selected

**No placeholders — all code is complete.**
