# Driver Live Location Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drivers can toggle live location sharing from their phone. Their real GPS coordinates are reverse-geocoded to a street/cell address, sent to the backend, and displayed on DriverCard + DriverProfileScreen. Customers can filter "Near Me" using their own GPS to fetch drivers sorted by distance.

**Architecture:**
- Driver app uses `expo-location` `watchPositionAsync` (foreground) when sharing is on. On each significant position change (>50m), reverse geocodes with `Location.reverseGeocodeAsync` then PATCHes `/api/drivers/me/location`.
- Backend stores `latitude`, `longitude`, `location_address`, `location_updated_at` on the drivers row. `GET /api/drivers` accepts optional `?lat=&lng=&radius=` and uses SQL Haversine to order/filter.
- Customer taps "Near Me" chip → `expo-location.getCurrentPositionAsync` → re-fetches drivers with coordinates → cards show distance + live address.

**Tech Stack:** expo-location, Express + pg, SQL Haversine formula

---

## File Map

| File | Change | Responsibility |
|------|--------|---------------|
| `backend/src/migrate-driver-location.js` | Create | One-time: add lat/lng/address/updated_at to drivers |
| `backend/src/schema.sql` | Modify | Add 4 location columns to drivers table |
| `backend/src/routes/drivers.js` | Modify | Add PATCH /me/location; update GET / with Haversine |
| `agrimove-mobile/src/api/drivers.js` | Modify | Add updateDriverLocation(); update fetchDrivers() to pass lat/lng |
| `agrimove-mobile/src/screens/ProfileScreen.jsx` | Modify | Driver-only location sharing toggle + current address display |
| `agrimove-mobile/src/components/DriverCard.jsx` | Modify | Show location_address (or location fallback) + distance badge + live dot |
| `agrimove-mobile/src/screens/DriverProfileScreen.jsx` | Modify | Show live address in Location stat; show live indicator |
| `agrimove-mobile/src/screens/DriverListScreen.jsx` | Modify | Add Near Me chip; pass customer lat/lng to fetchDrivers |

---

## Task 0: Backend — location columns + PATCH /me/location + Haversine GET

**Files:**
- Create: `backend/src/migrate-driver-location.js`
- Modify: `backend/src/schema.sql`
- Modify: `backend/src/routes/drivers.js`

- [ ] **Step 1: Create and run migration**

Create `backend/src/migrate-driver-location.js`:

```js
require('dotenv').config();
const pool = require('./db');

async function migrate() {
  await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7)`);
  await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7)`);
  await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_address TEXT`);
  await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMP`);
  console.log('Migration done');
  process.exit(0);
}
migrate().catch(e => { console.error(e); process.exit(1); });
```

Run:
```bash
cd /Users/mac/Desktop/ALU/SE/backend && node src/migrate-driver-location.js
```
Expected: `Migration done`

- [ ] **Step 2: Update schema.sql — add 4 columns to drivers table**

In `backend/src/schema.sql`, find the drivers table and add these 4 columns before `created_at`:

```sql
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  location_address TEXT,
  location_updated_at TIMESTAMP,
```

The full drivers table should end with:
```sql
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  location_address TEXT,
  location_updated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
```

- [ ] **Step 3: Read and replace drivers route**

First read `backend/src/routes/drivers.js` to understand existing code, then replace it entirely with:

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

      const distanceExpr = `
        ROUND(
          (6371 * acos(
            LEAST(1, cos(radians(${userLat})) * cos(radians(latitude))
            * cos(radians(longitude) - radians(${userLng}))
            + sin(radians(${userLat})) * sin(radians(latitude))
          ))::numeric, 1
        )
      `;

      const query = `
        SELECT *,
          ${distanceExpr} AS distance_km
        FROM drivers
        ${locationFilter}
        HAVING ${distanceExpr} <= ${radiusKm}
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
```

- [ ] **Step 4: Test**

```bash
cd /Users/mac/Desktop/ALU/SE/backend && npm run dev &
sleep 4
```

Test location update (need a driver token):
```bash
DRIVER_TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Loc Driver\",\"email\":\"loc_driver_$(date +%s)@test.com\",\"password\":\"test1234\",\"role\":\"driver\",\"phone\":\"+250700000001\",\"vehicle\":\"Test Truck\",\"type\":\"Truck\",\"capacity\":\"5 tonnes\",\"location\":\"Kigali\",\"rate\":\"15000\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

curl -s -X PATCH http://localhost:3001/api/drivers/me/location \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -d '{"latitude":-1.9441,"longitude":30.0619,"address":"KG 7 Ave, Kinyinya, Kigali"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK:', 'latitude' in d)"
```
Expected: `OK: True`

Test near-me query:
```bash
curl -s "http://localhost:3001/api/drivers?lat=-1.9441&lng=30.0619&radius=100" \
  | python3 -c "import sys,json; rows=json.load(sys.stdin); print('Rows:', len(rows), '| First has distance:', 'distance_km' in rows[0] if rows else 'no rows')"
```
Expected: rows with `distance_km` field

```bash
pkill -f "node src/index.js" 2>/dev/null; pkill -f nodemon 2>/dev/null; true
```

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add backend/src/migrate-driver-location.js backend/src/schema.sql backend/src/routes/drivers.js
git commit -m "feat: add live driver location — PATCH /me/location, near-me Haversine query"
```

---

## Task 1: Install expo-location + update API layer

**Files:**
- Modify: `agrimove-mobile/src/api/drivers.js`

- [ ] **Step 1: Install expo-location**

```bash
cd /Users/mac/Desktop/ALU/SE/agrimove-mobile && npx expo install expo-location
```

- [ ] **Step 2: Update src/api/drivers.js**

Replace `agrimove-mobile/src/api/drivers.js` with:

```js
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function fetchDrivers(filters = {}, token) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.available) params.set('available', 'true');
  if (filters.lat != null) params.set('lat', String(filters.lat));
  if (filters.lng != null) params.set('lng', String(filters.lng));
  if (filters.radius != null) params.set('radius', String(filters.radius));

  const res = await fetch(`${BASE}/drivers?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch drivers');
  return res.json();
}

export async function fetchDriver(id, token) {
  const res = await fetch(`${BASE}/drivers/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Driver not found');
  return res.json();
}

export async function updateDriverLocation(latitude, longitude, address, token) {
  const res = await fetch(`${BASE}/drivers/me/location`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ latitude, longitude, address }),
  });
  if (!res.ok) throw new Error('Failed to update location');
  return res.json();
}

export async function clearDriverLocation(token) {
  const res = await fetch(`${BASE}/drivers/me/location-off`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to clear location');
  return res.json();
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/api/drivers.js agrimove-mobile/package.json agrimove-mobile/package-lock.json
git commit -m "feat: install expo-location, add location API functions"
```

---

## Task 2: Driver location sharing toggle in ProfileScreen

**Files:**
- Modify: `agrimove-mobile/src/screens/ProfileScreen.jsx`

This adds a "Share My Location" toggle that only renders when `user.role === 'driver'`. When enabled it calls `Location.requestForegroundPermissionsAsync`, then `Location.watchPositionAsync` with `distanceInterval: 50` (update every 50m of movement). Each update reverse geocodes the coordinates and PATCHes the backend.

- [ ] **Step 1: Read current ProfileScreen.jsx**

Read `/Users/mac/Desktop/ALU/SE/agrimove-mobile/src/screens/ProfileScreen.jsx` in full.

- [ ] **Step 2: Replace ProfileScreen.jsx**

Replace with:

```jsx
import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { updateDriverLocation, clearDriverLocation } from '../api/drivers';
import { colors, spacing, radius, fontSize } from '../theme';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function buildAddress(geo) {
  const parts = [geo.street, geo.district, geo.city || geo.subregion].filter(Boolean);
  return parts.join(', ') || geo.region || 'Unknown location';
}

export default function ProfileScreen({ navigation }) {
  const { user, token, logout } = useAuth();
  const isDriver = user?.role === 'driver';

  const [sharing, setSharing] = useState(false);
  const [currentAddress, setCurrentAddress] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const watchRef = useRef(null);

  // Stop watching when screen unmounts or sharing is turned off
  useEffect(() => {
    return () => {
      if (watchRef.current) watchRef.current.remove();
    };
  }, []);

  async function startSharing() {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied. Enable it in Settings.');
        setLocationLoading(false);
        return;
      }

      // Get initial position immediately
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await sendLocation(pos.coords);

      // Watch for changes — update every 50m of movement
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 50 },
        async (pos) => { await sendLocation(pos.coords); }
      );

      setSharing(true);
    } catch (e) {
      setLocationError('Could not start location tracking.');
    } finally {
      setLocationLoading(false);
    }
  }

  async function sendLocation(coords) {
    try {
      const [geo] = await Location.reverseGeocodeAsync(
        { latitude: coords.latitude, longitude: coords.longitude }
      );
      const address = geo ? buildAddress(geo) : null;
      setCurrentAddress(address);
      await updateDriverLocation(coords.latitude, coords.longitude, address, token);
    } catch {
      // Non-fatal — keep watching even if one update fails
    }
  }

  async function stopSharing() {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    setSharing(false);
    setCurrentAddress(null);
    try { await clearDriverLocation(token); } catch { /* ignore */ }
  }

  async function handleToggle(value) {
    if (value) {
      await startSharing();
    } else {
      await stopSharing();
    }
  }

  async function handleLogout() {
    await stopSharing();
    await logout();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.container}>
        {/* Avatar */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
        </View>

        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}

        <View style={styles.divider} />

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Member since</Text>
          <Text style={styles.infoValue}>
            {user?.created_at
              ? new Date(user.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' })
              : '—'}
          </Text>
        </View>

        {/* Driver-only: location sharing toggle */}
        {isDriver && (
          <>
            <View style={styles.divider} />

            <View style={styles.locationCard}>
              <View style={styles.locationTop}>
                <View style={styles.locationLeft}>
                  <Text style={styles.locationTitle}>Share My Location</Text>
                  <Text style={styles.locationSub}>
                    {sharing ? 'Customers can see you on the map' : 'Your location is hidden'}
                  </Text>
                </View>
                {locationLoading
                  ? <ActivityIndicator color={colors.primary} />
                  : <Switch
                      value={sharing}
                      onValueChange={handleToggle}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor={colors.white}
                    />
                }
              </View>

              {sharing && currentAddress ? (
                <View style={styles.liveAddress}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText} numberOfLines={2}>{currentAddress}</Text>
                </View>
              ) : null}

              {locationError ? (
                <Text style={styles.locationError}>{locationError}</Text>
              ) : null}
            </View>
          </>
        )}

        <View style={styles.divider} />

        <TouchableOpacity style={styles.bookingsBtn} onPress={() => navigation.navigate('MyBookings')}>
          <Text style={styles.bookingsBtnText}>📋  My Bookings</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600', width: 60 },
  headerTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  container: { flex: 1, alignItems: 'center', padding: spacing.xxl },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.xl, marginBottom: spacing.lg,
  },
  avatarText: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  email: { fontSize: fontSize.base, color: colors.textMuted, marginBottom: spacing.xs },
  phone: { fontSize: fontSize.base, color: colors.textMuted },
  divider: { width: '100%', height: 1, backgroundColor: colors.border, marginVertical: spacing.xxl },
  infoCard: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: fontSize.sm, color: colors.textMuted, fontWeight: '600' },
  infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  locationCard: { width: '100%', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.lg },
  locationTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationLeft: { flex: 1, marginRight: spacing.md },
  locationTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  locationSub: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  liveAddress: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, flexShrink: 0 },
  liveText: { flex: 1, fontSize: fontSize.sm, color: colors.text },
  locationError: { marginTop: spacing.sm, fontSize: fontSize.xs, color: colors.error },
  bookingsBtn: {
    borderWidth: 2, borderColor: colors.primary, borderRadius: radius.md,
    paddingHorizontal: spacing.xxxl, paddingVertical: spacing.lg, marginTop: spacing.md,
  },
  bookingsBtnText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.base },
  logoutBtn: {
    borderWidth: 2, borderColor: colors.error, borderRadius: radius.md,
    paddingHorizontal: spacing.xxxl, paddingVertical: spacing.lg, marginTop: spacing.md,
  },
  logoutText: { color: colors.error, fontWeight: '700', fontSize: fontSize.base },
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/screens/ProfileScreen.jsx
git commit -m "feat: driver location sharing toggle with live address in ProfileScreen"
```

---

## Task 3: DriverCard — live address + distance badge + live indicator

**Files:**
- Modify: `agrimove-mobile/src/components/DriverCard.jsx`

Show `location_address` when available (live GPS address), fall back to `location` text. Show green "LIVE" badge when `location_updated_at` is within 10 minutes. Show distance badge when `distance_km` is present (Near Me mode).

- [ ] **Step 1: Read current DriverCard.jsx**

Read `/Users/mac/Desktop/ALU/SE/agrimove-mobile/src/components/DriverCard.jsx`.

- [ ] **Step 2: Replace DriverCard.jsx**

```jsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme';

function isLive(updatedAt) {
  if (!updatedAt) return false;
  return (Date.now() - new Date(updatedAt).getTime()) < 10 * 60 * 1000; // 10 min
}

export default function DriverCard({ driver, onPress }) {
  const live = isLive(driver.location_updated_at);
  const displayLocation = driver.location_address || driver.location || '';

  return (
    <TouchableOpacity
      style={[styles.card, !driver.available && styles.cardDimmed]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.avatar}>
        <Text style={styles.initials}>{driver.initials}</Text>
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{driver.name}</Text>
          {live && <View style={styles.liveBadge}><Text style={styles.liveText}>LIVE</Text></View>}
        </View>
        <Text style={styles.vehicle} numberOfLines={1}>{driver.vehicle} · {driver.capacity}</Text>
        <View style={styles.locRow}>
          <Text style={styles.locIcon}>📍</Text>
          <Text style={styles.locText} numberOfLines={1}>{displayLocation || '—'}</Text>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={[styles.dot, driver.available ? styles.dotGreen : styles.dotRed]} />
        {driver.distance_km != null
          ? <Text style={styles.distance}>{driver.distance_km} km</Text>
          : null}
        <View style={styles.tagBlue}>
          <Text style={styles.tagTextBlue}>{driver.type}</Text>
        </View>
        <Text style={styles.rating}>⭐ {driver.rating}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardDimmed: { opacity: 0.55 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md, flexShrink: 0,
  },
  initials: { fontSize: fontSize.sm, fontWeight: '700', color: '#0369a1' },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, flexShrink: 1 },
  liveBadge: { backgroundColor: colors.success, borderRadius: radius.full, paddingHorizontal: 5, paddingVertical: 1 },
  liveText: { fontSize: 9, fontWeight: '800', color: colors.white, letterSpacing: 0.5 },
  vehicle: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 4 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  locIcon: { fontSize: 11 },
  locText: { fontSize: fontSize.xs, color: colors.textMuted, flex: 1 },
  meta: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: colors.success },
  dotRed: { backgroundColor: colors.error },
  distance: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  tagBlue: { backgroundColor: '#e0f2fe', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagTextBlue: { fontSize: fontSize.xs, fontWeight: '600', color: '#0369a1', textTransform: 'capitalize' },
  rating: { fontSize: fontSize.xs, color: '#92400e' },
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/components/DriverCard.jsx
git commit -m "feat: DriverCard shows live address, LIVE badge, and distance when near-me active"
```

---

## Task 4: DriverProfileScreen — live address in stats

**Files:**
- Modify: `agrimove-mobile/src/screens/DriverProfileScreen.jsx`

Update the Location stat to show `location_address` if available (and show "LIVE" indicator). If the driver has no live location, fall back to `location` text.

- [ ] **Step 1: Read current DriverProfileScreen.jsx**

Read the full file.

- [ ] **Step 2: Update Location stat and add LIVE indicator**

Find the stats array:
```jsx
            { val: String(driver.rating), lbl: 'Rating' },
              { val: String(driver.trips), lbl: 'Trips' },
              { val: driver.capacity, lbl: 'Capacity' },
              { val: driver.location || '—', lbl: 'Location' },
```

Replace with:
```jsx
            { val: String(driver.rating), lbl: 'Rating' },
              { val: String(driver.trips), lbl: 'Trips' },
              { val: driver.capacity, lbl: 'Capacity' },
```

Then add a dedicated location row ABOVE the divider (after the statsRow closing tag):

Find:
```jsx
          <View style={styles.divider} />
```

Replace with:
```jsx
          {/* Location row */}
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationInfo}>
              <Text style={styles.locationAddress} numberOfLines={2}>
                {driver.location_address || driver.location || '—'}
              </Text>
              {driver.location_updated_at &&
                (Date.now() - new Date(driver.location_updated_at).getTime()) < 10 * 60 * 1000 && (
                <View style={styles.liveRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveLabel}>Live location</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.divider} />
```

Add these styles inside StyleSheet.create:
```js
  locationRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start', marginBottom: spacing.xl, paddingHorizontal: spacing.xs },
  locationIcon: { fontSize: 18, marginTop: 2 },
  locationInfo: { flex: 1 },
  locationAddress: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveLabel: { fontSize: fontSize.xs, color: colors.success, fontWeight: '600' },
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/screens/DriverProfileScreen.jsx
git commit -m "feat: DriverProfileScreen shows live address with live indicator"
```

---

## Task 5: DriverListScreen — Near Me filter chip

**Files:**
- Modify: `agrimove-mobile/src/screens/DriverListScreen.jsx`

Add a "Near Me" chip. When active: calls `Location.requestForegroundPermissionsAsync` + `Location.getCurrentPositionAsync`, then re-fetches drivers passing `lat`, `lng`, `radius: 50`. When deactivated: re-fetches without coordinates.

- [ ] **Step 1: Read current DriverListScreen.jsx**

Read the full file first.

- [ ] **Step 2: Replace DriverListScreen.jsx**

```jsx
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { fetchDrivers } from '../api/drivers';
import DriverCard from '../components/DriverCard';
import FilterChip from '../components/FilterChip';
import { colors, spacing, fontSize, radius } from '../theme';

const TYPE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Truck', value: 'truck' },
  { label: 'Pickup', value: 'pickup' },
  { label: 'Van', value: 'van' },
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function DriverListScreen({ navigation }) {
  const { user, token } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [nearMe, setNearMe] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const loadDrivers = useCallback(async (coords) => {
    setError(null);
    try {
      const filters = {
        type: activeType || undefined,
        available: availableOnly || undefined,
      };
      if (coords) {
        filters.lat = coords.latitude;
        filters.lng = coords.longitude;
        filters.radius = 50;
      }
      const data = await fetchDrivers(filters, token);
      setDrivers(data);
    } catch {
      setError('Could not load drivers. Check your connection and make sure the server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeType, availableOnly, token]);

  useEffect(() => {
    loadDrivers(nearMe ? userCoords : null);
  }, [loadDrivers, nearMe, userCoords]);

  async function handleNearMe() {
    if (nearMe) {
      setNearMe(false);
      setUserCoords(null);
      return;
    }
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable it in Settings.');
        setLocationLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setUserCoords(pos.coords);
      setNearMe(true);
    } catch {
      setError('Could not get your location.');
    } finally {
      setLocationLoading(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadDrivers(nearMe ? userCoords : null);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>🚛</Text>
          <Text style={styles.logoText}>AgriMove</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <View style={styles.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {TYPE_FILTERS.map(f => (
            <FilterChip
              key={f.label}
              label={f.label}
              active={activeType === f.value}
              onPress={() => setActiveType(f.value)}
            />
          ))}
          <FilterChip
            label="Available"
            active={availableOnly}
            onPress={() => setAvailableOnly(v => !v)}
          />
          <TouchableOpacity
            style={[styles.nearChip, nearMe && styles.nearChipActive]}
            onPress={handleNearMe}
            disabled={locationLoading}
          >
            {locationLoading
              ? <ActivityIndicator size="small" color={nearMe ? colors.white : colors.primary} style={{ marginRight: 4 }} />
              : <Text style={styles.nearChipIcon}>📍</Text>}
            <Text style={[styles.nearChipText, nearMe && styles.nearChipTextActive]}>Near Me</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {nearMe && (
        <View style={styles.nearBanner}>
          <Text style={styles.nearBannerText}>Showing drivers within 50 km · sorted by distance</Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadDrivers(nearMe ? userCoords : null)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <DriverCard
              driver={item}
              onPress={() => navigation.navigate('DriverProfile', { driver: item })}
            />
          )}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.count}>
              {drivers.length} driver{drivers.length !== 1 ? 's' : ''} found
            </Text>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {nearMe ? 'No drivers with live location within 50 km.' : 'No drivers match your filters.'}
            </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  filterWrap: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  nearChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5, borderColor: colors.primary,
    backgroundColor: colors.white, marginRight: spacing.sm,
  },
  nearChipActive: { backgroundColor: colors.primary },
  nearChipIcon: { fontSize: 13 },
  nearChipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  nearChipTextActive: { color: colors.white },
  nearBanner: {
    backgroundColor: colors.primaryLight, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
  },
  nearBannerText: { fontSize: fontSize.xs, color: colors.primaryDark, fontWeight: '600' },
  list: { padding: spacing.lg },
  count: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  retryText: { color: colors.white, fontWeight: '600' },
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/screens/DriverListScreen.jsx
git commit -m "feat: add Near Me filter chip with GPS-based driver search"
```

---

## Self-Review

**Spec coverage:**
- ✅ Driver enables location on their phone — ProfileScreen toggle (driver role only)
- ✅ Detailed current location (street/cell) — expo-location reverseGeocodeAsync
- ✅ Location sent to backend — PATCH /api/drivers/me/location on every 50m movement
- ✅ Live address displayed on DriverCard — `location_address` with LIVE badge
- ✅ Live address + indicator on DriverProfileScreen
- ✅ Drivers near me filter — Near Me chip, GPS, Haversine SQL sort, 50km radius
- ✅ Driver can stop sharing — toggle off clears lat/lng from DB
- ✅ Fallback to base location text when driver not sharing live location
