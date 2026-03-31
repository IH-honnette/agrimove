# AgriMove Mobile App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React Native (Expo) Android app where users sign up/log in then browse drivers, view profiles, book transport, and call drivers to confirm.

**Architecture:** New `agrimove-mobile/` Expo project talks to the existing Express backend (`POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`, `/api/drivers`, `/api/bookings`). Auth state lives in `AuthContext` backed by `expo-secure-store`. `AppNavigator` renders `AuthStack` (Login/Register) or `AppStack` (full app) based on whether a valid token exists.

**Tech Stack:** Expo SDK (managed workflow), React Navigation v6 native stack, expo-secure-store, react-native-safe-area-context, react-native-screens, react-native-gesture-handler

---

## File Map

**New project root: `agrimove-mobile/`**

| File | Responsibility |
|------|---------------|
| `App.jsx` | Root — wraps everything in `GestureHandlerRootView` + `AuthProvider` + `AppNavigator` |
| `app.json` | Expo config — name, slug, Android package |
| `babel.config.js` | Expo babel preset |
| `.env.example` | `EXPO_PUBLIC_API_URL` template |
| `src/theme.js` | Color, spacing, radius, fontSize constants |
| `src/context/AuthContext.jsx` | `user`, `token`, `loading`, `login()`, `logout()` |
| `src/api/auth.js` | `signup(data)`, `login(email, password)` |
| `src/api/drivers.js` | `fetchDrivers(filters, token)`, `fetchDriver(id, token)` |
| `src/api/bookings.js` | `createBooking(data, token)` |
| `src/navigation/AppNavigator.jsx` | Conditional AuthStack / AppStack |
| `src/screens/SplashScreen.jsx` | Loading screen shown while checking stored token |
| `src/screens/LoginScreen.jsx` | Email + password login form |
| `src/screens/RegisterScreen.jsx` | Name + email + phone + password signup form |
| `src/screens/DriverListScreen.jsx` | FlatList of drivers with filter chips + pull-to-refresh |
| `src/screens/DriverProfileScreen.jsx` | Transparent modal bottom sheet — stats, Book button |
| `src/screens/BookingFormScreen.jsx` | Pickup / destination / cargo / phone form |
| `src/screens/BookingConfirmedScreen.jsx` | Success screen with phone number + Call Now |
| `src/screens/ProfileScreen.jsx` | User info + logout |
| `src/components/DriverCard.jsx` | Single driver row card |
| `src/components/FilterChip.jsx` | Pressable pill chip for filter bar |

---

## Task 0: Backend — add role + driver signup

**Files:**
- Modify: `backend/src/schema.sql`
- Modify: `backend/src/routes/auth.js`
- Create: `backend/src/migrate-role.js` (run once, then delete)

- [ ] **Step 1: Run database migration**

Create `backend/src/migrate-role.js`:

```js
require('dotenv').config();
const pool = require('./db');

async function migrate() {
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer'`);
  await pool.query(`ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
  console.log('Migration done');
  process.exit(0);
}
migrate().catch(e => { console.error(e); process.exit(1); });
```

Run it:
```bash
cd /Users/mac/Desktop/ALU/SE/backend && node src/migrate-role.js
```

Expected output: `Migration done`

- [ ] **Step 2: Update `backend/src/schema.sql`**

Replace the file content with:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT NOW()
);

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
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
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

- [ ] **Step 3: Replace `backend/src/routes/auth.js`**

```js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'agrimove_secret_key_change_in_production';

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, email, phone, password, role = 'customer', vehicle, type, capacity, location, rate } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (role !== 'customer' && role !== 'driver') {
      return res.status(400).json({ error: 'Role must be customer or driver' });
    }
    if (role === 'driver' && (!vehicle || !type || !capacity || !location || !rate)) {
      return res.status(400).json({ error: 'Drivers must provide vehicle, type, capacity, location, and rate' });
    }
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const password_hash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');
    const userResult = await client.query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone, role, created_at',
      [name, email, phone || null, password_hash, role]
    );
    const user = userResult.rows[0];

    if (role === 'driver') {
      const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      await client.query(
        'INSERT INTO drivers (name, initials, vehicle, type, capacity, rating, trips, rate, available, location, phone, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
        [name, initials, vehicle, type, capacity, 4.5, 0, parseInt(rate, 10), true, location, phone || null, user.id]
      );
    }

    await client.query('COMMIT');
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const { password_hash, ...safeUser } = user;
    const token = signToken(safeUser);
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me — verify token & return user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await pool.query('SELECT id, name, email, phone, role, created_at FROM users WHERE id = $1', [decoded.id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Auth/me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

- [ ] **Step 4: Restart backend and verify driver signup creates a drivers row**

```bash
cd /Users/mac/Desktop/ALU/SE/backend && npm run dev
```

Test customer signup:
```bash
curl -s -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Customer","email":"customer@test.com","password":"test123","role":"customer"}' | jq .user.role
```
Expected: `"customer"`

Test driver signup:
```bash
curl -s -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Driver","email":"driver2@test.com","password":"test123","role":"driver","phone":"+250788000001","vehicle":"Isuzu Truck","type":"Truck","capacity":"5 tonnes","location":"Kigali","rate":"15000"}' | jq .user.role
```
Expected: `"driver"`

Then check new driver appears in listing:
```bash
curl -s http://localhost:3001/api/drivers | jq 'map(.name) | last'
```
Expected: `"Test Driver"`

- [ ] **Step 5: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add backend/src/schema.sql backend/src/routes/auth.js backend/src/migrate-role.js
git commit -m "feat: add role to users, driver signup creates drivers row"
```

---

## Task 1: Expo project scaffold

**Files:**
- Create: `agrimove-mobile/` (via `create-expo-app`)
- Create: `agrimove-mobile/.env.example`

- [ ] **Step 1: Scaffold the project**

```bash
cd /Users/mac/Desktop/ALU/SE
npx create-expo-app@latest agrimove-mobile --template blank
cd agrimove-mobile
```

Expected: `agrimove-mobile/` created with `App.js`, `app.json`, `babel.config.js`, `package.json`.

- [ ] **Step 2: Install navigation + safe area + gesture handler**

```bash
npm install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context react-native-gesture-handler
npx expo install expo-secure-store
```

Expected: no errors. `node_modules/` updated.

- [ ] **Step 3: Rename App.js → App.jsx**

```bash
mv App.js App.jsx
```

- [ ] **Step 4: Create `.env.example`**

```
EXPO_PUBLIC_API_URL=http://10.0.2.2:3001/api
```

`10.0.2.2` is the Android emulator's alias for the host machine's `localhost`. Create `.env` with the same value:

```bash
cp .env.example .env
```

- [ ] **Step 5: Create `src/` directory structure**

```bash
mkdir -p src/api src/context src/navigation src/screens src/components
```

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/
git commit -m "feat: scaffold Expo React Native project"
```

---

## Task 2: Theme

**Files:**
- Create: `agrimove-mobile/src/theme.js`

- [ ] **Step 1: Create `agrimove-mobile/src/theme.js`**

```js
export const colors = {
  primary: '#0ea5e9',
  primaryLight: '#f0f9ff',
  primaryDark: '#0369a1',
  success: '#22c55e',
  successLight: '#f0fdf4',
  successBorder: '#bbf7d0',
  error: '#ef4444',
  errorLight: '#fff1f2',
  text: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
};
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/theme.js
git commit -m "feat: add design theme tokens"
```

---

## Task 3: API layer

**Files:**
- Create: `agrimove-mobile/src/api/auth.js`
- Create: `agrimove-mobile/src/api/drivers.js`
- Create: `agrimove-mobile/src/api/bookings.js`

- [ ] **Step 1: Create `agrimove-mobile/src/api/auth.js`**

```js
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001/api';

export async function signup({ name, email, phone, password, role, vehicle, type, capacity, location, rate }) {
  const res = await fetch(`${BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phone, password, role, vehicle, type, capacity, location, rate }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Signup failed');
  return json; // { user, token }
}

export async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Login failed');
  return json; // { user, token }
}
```

- [ ] **Step 2: Create `agrimove-mobile/src/api/drivers.js`**

```js
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001/api';

export async function fetchDrivers(filters = {}, token) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.available) params.set('available', 'true');
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
```

- [ ] **Step 3: Create `agrimove-mobile/src/api/bookings.js`**

```js
const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3001/api';

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
```

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/api/
git commit -m "feat: add mobile API layer (auth, drivers, bookings)"
```

---

## Task 4: AuthContext

**Files:**
- Create: `agrimove-mobile/src/context/AuthContext.jsx`

- [ ] **Step 1: Create `agrimove-mobile/src/context/AuthContext.jsx`**

```jsx
import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        const storedUser = await SecureStore.getItemAsync('auth_user');
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        // Corrupt storage — ignore, user will re-login
      } finally {
        setLoading(false);
      }
    }
    restore();
  }, []);

  async function login(token, user) {
    await SecureStore.setItemAsync('auth_token', token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    setToken(token);
    setUser(user);
  }

  async function logout() {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_user');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/context/AuthContext.jsx
git commit -m "feat: add AuthContext with SecureStore persistence"
```

---

## Task 5: SplashScreen + AppNavigator

**Files:**
- Create: `agrimove-mobile/src/screens/SplashScreen.jsx`
- Create: `agrimove-mobile/src/navigation/AppNavigator.jsx`
- Modify: `agrimove-mobile/App.jsx`

- [ ] **Step 1: Create `agrimove-mobile/src/screens/SplashScreen.jsx`**

```jsx
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, fontSize } from '../theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🚛</Text>
      <Text style={styles.title}>AgriMove</Text>
      <Text style={styles.sub}>Agricultural Logistics</Text>
      <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.white },
  icon: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sub: { fontSize: fontSize.base, color: colors.textMuted, marginBottom: 32 },
  spinner: { marginTop: 8 },
});
```

- [ ] **Step 2: Create placeholder screens so navigator compiles**

Create `agrimove-mobile/src/screens/LoginScreen.jsx` (stub — full version in Task 6):
```jsx
import { View, Text } from 'react-native';
export default function LoginScreen() {
  return <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><Text>Login</Text></View>;
}
```

Create `agrimove-mobile/src/screens/RegisterScreen.jsx` (stub):
```jsx
import { View, Text } from 'react-native';
export default function RegisterScreen() {
  return <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><Text>Register</Text></View>;
}
```

Create `agrimove-mobile/src/screens/DriverListScreen.jsx` (stub):
```jsx
import { View, Text } from 'react-native';
export default function DriverListScreen() {
  return <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><Text>Drivers</Text></View>;
}
```

Create `agrimove-mobile/src/screens/DriverProfileScreen.jsx` (stub):
```jsx
import { View, Text } from 'react-native';
export default function DriverProfileScreen() {
  return <View style={{ flex:1 }}><Text>Profile</Text></View>;
}
```

Create `agrimove-mobile/src/screens/BookingFormScreen.jsx` (stub):
```jsx
import { View, Text } from 'react-native';
export default function BookingFormScreen() {
  return <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><Text>Booking</Text></View>;
}
```

Create `agrimove-mobile/src/screens/BookingConfirmedScreen.jsx` (stub):
```jsx
import { View, Text } from 'react-native';
export default function BookingConfirmedScreen() {
  return <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><Text>Confirmed</Text></View>;
}
```

Create `agrimove-mobile/src/screens/ProfileScreen.jsx` (stub):
```jsx
import { View, Text } from 'react-native';
export default function ProfileScreen() {
  return <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}><Text>My Profile</Text></View>;
}
```

- [ ] **Step 3: Create `agrimove-mobile/src/navigation/AppNavigator.jsx`**

```jsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import DriverListScreen from '../screens/DriverListScreen';
import DriverProfileScreen from '../screens/DriverProfileScreen';
import BookingFormScreen from '../screens/BookingFormScreen';
import BookingConfirmedScreen from '../screens/BookingConfirmedScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="DriverList" component={DriverListScreen} />
            <Stack.Screen
              name="DriverProfile"
              component={DriverProfileScreen}
              options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
            />
            <Stack.Screen name="BookingForm" component={BookingFormScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="BookingConfirmed" component={BookingConfirmedScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ animation: 'slide_from_right' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 4: Replace `agrimove-mobile/App.jsx`**

```jsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 5: Run on Android emulator to verify it launches**

Start the backend first:
```bash
cd /Users/mac/Desktop/ALU/SE/backend && npm run dev
```

In another terminal:
```bash
cd /Users/mac/Desktop/ALU/SE/agrimove-mobile && npx expo start --android
```

Expected: Splash screen appears with spinner, then transitions to "Login" stub screen (since no token is stored). No red screen errors.

- [ ] **Step 6: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/ agrimove-mobile/App.jsx
git commit -m "feat: add AppNavigator, AuthContext wiring, splash screen"
```

---

## Task 6: LoginScreen + RegisterScreen

**Files:**
- Replace: `agrimove-mobile/src/screens/LoginScreen.jsx`
- Replace: `agrimove-mobile/src/screens/RegisterScreen.jsx`

- [ ] **Step 1: Replace `agrimove-mobile/src/screens/LoginScreen.jsx`**

```jsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { login as apiLogin } from '../api/auth';
import { colors, spacing, radius, fontSize } from '../theme';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await apiLogin(email.trim(), password);
      await login(token, user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>🚛</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.sub}>Sign in to your AgriMove account</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.btnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkWrap}>
            <Text style={styles.link}>
              Don't have an account? <Text style={styles.linkBold}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flexGrow: 1, padding: spacing.xxl, justifyContent: 'center' },
  logo: { fontSize: 52, textAlign: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  sub: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xxxl },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.text, marginBottom: spacing.lg },
  error: { backgroundColor: colors.errorLight, color: colors.error, padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.lg, fontSize: fontSize.sm },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.xl },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  linkWrap: { alignItems: 'center' },
  link: { fontSize: fontSize.sm, color: colors.textMuted },
  linkBold: { color: colors.primary, fontWeight: '600' },
});
```

- [ ] **Step 2: Replace `agrimove-mobile/src/screens/RegisterScreen.jsx`**

```jsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { signup as apiSignup } from '../api/auth';
import { colors, spacing, radius, fontSize } from '../theme';

const VEHICLE_TYPES = ['Truck', 'Pickup', 'Van'];

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [role, setRole] = useState('customer');

  // Common fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Driver-only fields
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [vehicleType, setVehicleType] = useState('Truck');
  const [capacity, setCapacity] = useState('');
  const [location, setLocation] = useState('');
  const [rate, setRate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignup() {
    if (!name.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required');
      return;
    }
    if (role === 'driver' && (!phone.trim() || !vehicle.trim() || !capacity.trim() || !location.trim() || !rate.trim())) {
      setError('All driver fields are required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload = { name: name.trim(), email: email.trim(), password, role };
      if (role === 'driver') {
        Object.assign(payload, {
          phone: phone.trim(),
          vehicle: vehicle.trim(),
          type: vehicleType,
          capacity: capacity.trim(),
          location: location.trim(),
          rate: rate.trim(),
        });
      }
      const { token, user } = await apiSignup(payload);
      await login(token, user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.logo}>🚛</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.sub}>Join AgriMove and connect with drivers</Text>

          {/* Role selector */}
          <Text style={styles.label}>I am a *</Text>
          <View style={styles.roleRow}>
            <TouchableOpacity
              style={[styles.roleCard, role === 'customer' && styles.roleCardActive]}
              onPress={() => setRole('customer')}
            >
              <Text style={styles.roleIcon}>🌾</Text>
              <Text style={[styles.roleName, role === 'customer' && styles.roleNameActive]}>Customer</Text>
              <Text style={[styles.roleSub, role === 'customer' && styles.roleSubActive]}>Farmer / Buyer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleCard, role === 'driver' && styles.roleCardActive]}
              onPress={() => setRole('driver')}
            >
              <Text style={styles.roleIcon}>🚛</Text>
              <Text style={[styles.roleName, role === 'driver' && styles.roleNameActive]}>Driver</Text>
              <Text style={[styles.roleSub, role === 'driver' && styles.roleSubActive]}>Transport Provider</Text>
            </TouchableOpacity>
          </View>

          {/* Common fields */}
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          {/* Driver-only fields */}
          {role === 'driver' && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionHeader}>Vehicle Details</Text>

              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+250 7XX XXX XXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Vehicle Name *</Text>
              <TextInput
                style={styles.input}
                value={vehicle}
                onChangeText={setVehicle}
                placeholder="e.g. Isuzu Truck"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Vehicle Type *</Text>
              <View style={styles.typeRow}>
                {VEHICLE_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, vehicleType === t && styles.typeChipActive]}
                    onPress={() => setVehicleType(t)}
                  >
                    <Text style={[styles.typeText, vehicleType === t && styles.typeTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Capacity *</Text>
              <TextInput
                style={styles.input}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="e.g. 5 tonnes"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Base Location *</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g. Kigali, Musanze, Huye"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />

              <Text style={styles.label}>Daily Rate (RWF) *</Text>
              <TextInput
                style={styles.input}
                value={rate}
                onChangeText={setRate}
                placeholder="e.g. 15000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleSignup} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.btnText}>Create Account</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkWrap}>
            <Text style={styles.link}>
              Already have an account? <Text style={styles.linkBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flexGrow: 1, padding: spacing.xxl },
  back: { marginBottom: spacing.xl },
  backText: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600' },
  logo: { fontSize: 40, textAlign: 'center', marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.xs },
  sub: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xxl },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.text, marginBottom: spacing.lg },
  error: { backgroundColor: colors.errorLight, color: colors.error, padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.lg, fontSize: fontSize.sm },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.xl },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  linkWrap: { alignItems: 'center' },
  link: { fontSize: fontSize.sm, color: colors.textMuted },
  linkBold: { color: colors.primary, fontWeight: '600' },
  roleRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  roleCard: { flex: 1, borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  roleCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  roleIcon: { fontSize: 28, marginBottom: spacing.xs },
  roleName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: 2 },
  roleNameActive: { color: colors.primary },
  roleSub: { fontSize: fontSize.xs, color: colors.textMuted },
  roleSubActive: { color: colors.primaryDark },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.xl },
  sectionHeader: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  typeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  typeChip: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm, alignItems: 'center' },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  typeText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  typeTextActive: { color: colors.primary },
});
```

- [ ] **Step 3: Test on emulator**

Start Expo: `cd agrimove-mobile && npx expo start --android`

Verify:
1. Login screen renders with logo, two inputs, Sign In button, Sign Up link
2. Tapping "Sign Up" navigates to Register screen with Customer/Driver role cards
3. Selecting "Driver" reveals the vehicle detail fields below the common fields
4. Selecting "Customer" hides the vehicle fields
5. "← Back" on Register returns to Login
6. Attempting login with wrong credentials shows inline error message

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/screens/LoginScreen.jsx agrimove-mobile/src/screens/RegisterScreen.jsx
git commit -m "feat: add Login and Register screens"
```

---

## Task 7: DriverCard + FilterChip components

**Files:**
- Create: `agrimove-mobile/src/components/DriverCard.jsx`
- Create: `agrimove-mobile/src/components/FilterChip.jsx`

- [ ] **Step 1: Create `agrimove-mobile/src/components/DriverCard.jsx`**

```jsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme';

export default function DriverCard({ driver, onPress }) {
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
        <Text style={styles.name} numberOfLines={1}>{driver.name}</Text>
        <Text style={styles.vehicle} numberOfLines={1}>{driver.vehicle} · {driver.capacity}</Text>
        <View style={styles.tags}>
          <View style={styles.tagBlue}>
            <Text style={styles.tagTextBlue}>{driver.type}</Text>
          </View>
          <View style={styles.tagOrange}>
            <Text style={styles.tagTextOrange}>{driver.location}</Text>
          </View>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={[styles.dot, driver.available ? styles.dotGreen : styles.dotRed]} />
        <Text style={styles.rate}>RWF {Number(driver.rate).toLocaleString()}</Text>
        <Text style={styles.rateUnit}>/day</Text>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  initials: { fontSize: fontSize.sm, fontWeight: '700', color: '#0369a1' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: 2 },
  vehicle: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.sm },
  tags: { flexDirection: 'row', gap: spacing.xs },
  tagBlue: { backgroundColor: '#e0f2fe', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagOrange: { backgroundColor: '#fff7ed', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagTextBlue: { fontSize: fontSize.xs, fontWeight: '600', color: '#0369a1', textTransform: 'capitalize' },
  tagTextOrange: { fontSize: fontSize.xs, fontWeight: '600', color: '#c2410c' },
  meta: { alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotGreen: { backgroundColor: colors.success },
  dotRed: { backgroundColor: colors.error },
  rate: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  rateUnit: { fontSize: fontSize.xs, color: colors.textMuted },
  rating: { fontSize: fontSize.xs, color: '#92400e' },
});
```

- [ ] **Step 2: Create `agrimove-mobile/src/components/FilterChip.jsx`**

```jsx
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, fontSize } from '../theme';

export default function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  textActive: { color: colors.white },
});
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/components/
git commit -m "feat: add DriverCard and FilterChip components"
```

---

## Task 8: DriverListScreen

**Files:**
- Replace: `agrimove-mobile/src/screens/DriverListScreen.jsx`

- [ ] **Step 1: Replace `agrimove-mobile/src/screens/DriverListScreen.jsx`**

```jsx
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  const loadDrivers = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchDrivers(
        { type: activeType || undefined, available: availableOnly || undefined },
        token
      );
      setDrivers(data);
    } catch {
      setError('Could not load drivers. Check your connection and make sure the server is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeType, availableOnly, token]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  function onRefresh() {
    setRefreshing(true);
    loadDrivers();
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
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadDrivers}>
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
            <Text style={styles.empty}>No drivers match your filters.</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary },
  filterWrap: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterBar: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  list: { padding: spacing.lg },
  count: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl },
  errorText: { color: colors.error, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
  retryBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.md },
  retryText: { color: colors.white, fontWeight: '600' },
});
```

- [ ] **Step 2: Test on emulator**

Sign up with a new account → should land on DriverListScreen. Verify:
1. Header shows logo + avatar initial
2. Filter chips render horizontally
3. Drivers load from the backend (8 drivers)
4. Tapping a driver navigates to "DriverProfile" stub screen
5. Pull-to-refresh works

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/screens/DriverListScreen.jsx
git commit -m "feat: add DriverListScreen with filters and pull-to-refresh"
```

---

## Task 9: DriverProfileScreen

**Files:**
- Replace: `agrimove-mobile/src/screens/DriverProfileScreen.jsx`

- [ ] **Step 1: Replace `agrimove-mobile/src/screens/DriverProfileScreen.jsx`**

```jsx
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize } from '../theme';

export default function DriverProfileScreen({ route, navigation }) {
  const { driver } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Tap backdrop to dismiss */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={() => navigation.goBack()}
        activeOpacity={1}
      />

      {/* Bottom sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>{driver.initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{driver.name}</Text>
              <Text style={styles.vehicle}>{driver.vehicle}</Text>
              <View style={styles.tags}>
                <View style={styles.tagBlue}>
                  <Text style={[styles.tagText, { color: '#0369a1' }]}>{driver.type}</Text>
                </View>
                <View style={styles.tagOrange}>
                  <Text style={[styles.tagText, { color: '#c2410c' }]}>{driver.location}</Text>
                </View>
                <View style={driver.available ? styles.tagGreen : styles.tagRed}>
                  <Text style={[styles.tagText, { color: driver.available ? '#15803d' : '#be123c' }]}>
                    {driver.available ? 'Available' : 'Unavailable'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { val: String(driver.rating), lbl: 'Rating' },
              { val: String(driver.trips), lbl: 'Trips' },
              { val: driver.capacity, lbl: 'Capacity' },
              { val: `${Number(driver.rate).toLocaleString()}`, lbl: 'RWF/day' },
            ].map(s => (
              <View key={s.lbl} style={styles.stat}>
                <Text style={styles.statVal}>{s.val}</Text>
                <Text style={styles.statLbl}>{s.lbl}</Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          {driver.available ? (
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('BookingForm', { driver })}
            >
              <Text style={styles.btnText}>Book This Driver</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.unavailable}>This driver is currently unavailable.</Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    maxHeight: '82%',
    elevation: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
  },
  handle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.xl },
  profileHeader: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.xl, alignItems: 'flex-start' },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  initials: { fontSize: fontSize.lg, fontWeight: '700', color: '#0369a1' },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.text, marginBottom: 2 },
  vehicle: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.sm },
  tags: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  tagBlue: { backgroundColor: '#e0f2fe', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagOrange: { backgroundColor: '#fff7ed', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagGreen: { backgroundColor: '#f0fdf4', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagRed: { backgroundColor: '#fff1f2', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  tagText: { fontSize: fontSize.xs, fontWeight: '600', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xl },
  stat: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: fontSize.md, fontWeight: '800', color: colors.text, marginBottom: 2 },
  statLbl: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.xl },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center', marginBottom: spacing.md },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  unavailable: { textAlign: 'center', color: colors.textMuted, padding: spacing.md, marginBottom: spacing.md },
});
```

- [ ] **Step 2: Test on emulator**

Tap a driver card → bottom sheet slides up from bottom. Verify:
1. Drag handle visible at top
2. Driver name, vehicle, tags (type, location, availability) render correctly
3. Stats row shows rating, trips, capacity, rate
4. Tapping the backdrop dismisses the sheet
5. "Book This Driver" button appears for available drivers
6. "Unavailable" message appears for unavailable drivers

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/screens/DriverProfileScreen.jsx
git commit -m "feat: add DriverProfileScreen as transparent modal bottom sheet"
```

---

## Task 10: BookingFormScreen + BookingConfirmedScreen

**Files:**
- Replace: `agrimove-mobile/src/screens/BookingFormScreen.jsx`
- Replace: `agrimove-mobile/src/screens/BookingConfirmedScreen.jsx`

- [ ] **Step 1: Replace `agrimove-mobile/src/screens/BookingFormScreen.jsx`**

```jsx
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { createBooking } from '../api/bookings';
import { colors, spacing, radius, fontSize } from '../theme';

export default function BookingFormScreen({ route, navigation }) {
  const { driver } = route.params;
  const { user, token } = useAuth();
  const [pickupLocation, setPickupLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [cargoType, setCargoType] = useState('');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleBook() {
    if (!pickupLocation.trim() || !destination.trim() || !customerPhone.trim()) {
      setError('Pickup location, destination, and phone number are required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const booking = await createBooking(
        {
          driver_id: driver.id,
          customer_name: user.name,
          customer_phone: customerPhone.trim(),
          cargo_type: cargoType.trim() || null,
          pickup_location: pickupLocation.trim(),
          destination: destination.trim(),
        },
        token
      );
      navigation.replace('BookingConfirmed', { booking });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Book Driver</Text>

          {/* Driver banner */}
          <View style={styles.banner}>
            <View style={styles.bannerAvatar}>
              <Text style={styles.bannerInitials}>{driver.initials}</Text>
            </View>
            <View>
              <Text style={styles.bannerName}>{driver.name}</Text>
              <Text style={styles.bannerSub}>{driver.vehicle} · RWF {Number(driver.rate).toLocaleString()}/day</Text>
            </View>
          </View>

          <Text style={styles.label}>Pickup Location *</Text>
          <TextInput
            style={styles.input}
            value={pickupLocation}
            onChangeText={setPickupLocation}
            placeholder="Where to pick up your cargo"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Destination *</Text>
          <TextInput
            style={styles.input}
            value={destination}
            onChangeText={setDestination}
            placeholder="Where to deliver"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Cargo Type</Text>
          <TextInput
            style={styles.input}
            value={cargoType}
            onChangeText={setCargoType}
            placeholder="e.g. Maize, Vegetables (optional)"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Your Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={customerPhone}
            onChangeText={setCustomerPhone}
            placeholder="+250 7XX XXX XXX"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.btnPrimary} onPress={handleBook} disabled={loading}>
            {loading
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.btnText}>Confirm Booking</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flexGrow: 1, padding: spacing.xl },
  back: { marginBottom: spacing.xl },
  backText: { color: colors.primary, fontSize: fontSize.base, fontWeight: '600' },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, marginBottom: spacing.xl },
  banner: {
    flexDirection: 'row', gap: spacing.md,
    backgroundColor: colors.primaryLight, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.xl, alignItems: 'center',
  },
  bannerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#bae6fd', alignItems: 'center', justifyContent: 'center' },
  bannerInitials: { fontSize: fontSize.base, fontWeight: '700', color: '#0369a1' },
  bannerName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text },
  bannerSub: { fontSize: fontSize.sm, color: colors.primaryDark, marginTop: 2 },
  label: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, fontSize: fontSize.base, color: colors.text, marginBottom: spacing.lg },
  error: { backgroundColor: colors.errorLight, color: colors.error, padding: spacing.md, borderRadius: radius.sm, marginBottom: spacing.lg, fontSize: fontSize.sm },
  btnPrimary: { backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
});
```

- [ ] **Step 2: Replace `agrimove-mobile/src/screens/BookingConfirmedScreen.jsx`**

```jsx
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, fontSize } from '../theme';

export default function BookingConfirmedScreen({ route, navigation }) {
  const { booking } = route.params;
  const rawPhone = (booking.driver_phone || '').replace(/\s/g, '');

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>✓</Text>
        </View>

        <Text style={styles.title}>Booking Confirmed!</Text>
        <Text style={styles.sub}>
          Booking #{booking.id} saved. Call the driver to arrange pick-up details.
        </Text>

        <View style={styles.phoneBox}>
          <Text style={styles.driverLabel}>Driver</Text>
          <Text style={styles.driverName}>{booking.driver_name}</Text>
          <Text style={styles.phoneNumber}>{booking.driver_phone}</Text>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${rawPhone}`)}
            activeOpacity={0.8}
          >
            <Text style={styles.callBtnText}>📞  Call Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Pickup: </Text>
            {booking.pickup_location}
          </Text>
          <Text style={styles.summaryRow}>
            <Text style={styles.summaryKey}>Destination: </Text>
            {booking.destination}
          </Text>
          {booking.cargo_type ? (
            <Text style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Cargo: </Text>
              {booking.cargo_type}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.btnOutline}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DriverList' }] })}
        >
          <Text style={styles.btnOutlineText}>Back to Drivers</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, padding: spacing.xxl, justifyContent: 'center' },
  icon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.successLight, borderWidth: 2, borderColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: spacing.xl,
  },
  iconText: { fontSize: 28, color: colors.success },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
  sub: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xxl },
  phoneBox: {
    backgroundColor: colors.successLight,
    borderWidth: 1.5, borderColor: colors.successBorder,
    borderRadius: radius.lg, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.lg,
  },
  driverLabel: { fontSize: fontSize.xs, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs },
  driverName: { fontSize: fontSize.base, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  phoneNumber: { fontSize: fontSize.xxl, fontWeight: '800', color: '#15803d', letterSpacing: 1, marginBottom: spacing.lg },
  callBtn: { backgroundColor: colors.success, borderRadius: radius.full, paddingHorizontal: spacing.xxl, paddingVertical: spacing.md },
  callBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  summary: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.xl },
  summaryRow: { fontSize: fontSize.sm, color: colors.textMuted, marginBottom: spacing.xs, lineHeight: 18 },
  summaryKey: { fontWeight: '700', color: colors.text },
  btnOutline: { borderWidth: 2, borderColor: colors.primary, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  btnOutlineText: { color: colors.primary, fontWeight: '700', fontSize: fontSize.base },
});
```

- [ ] **Step 3: Test on emulator**

Full booking flow:
1. Tap available driver → profile sheet → "Book This Driver"
2. Fill pickup, destination, phone → "Confirm Booking"
3. Confirmation screen shows green checkmark, driver's phone number
4. "📞 Call Now" opens the phone dialer with the number pre-filled
5. "Back to Drivers" resets navigation to driver list

- [ ] **Step 4: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/screens/BookingFormScreen.jsx agrimove-mobile/src/screens/BookingConfirmedScreen.jsx
git commit -m "feat: add BookingFormScreen and BookingConfirmedScreen"
```

---

## Task 11: ProfileScreen

**Files:**
- Replace: `agrimove-mobile/src/screens/ProfileScreen.jsx`

- [ ] **Step 1: Replace `agrimove-mobile/src/screens/ProfileScreen.jsx`**

```jsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, radius, fontSize } from '../theme';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    // AppNavigator automatically switches to AuthStack when user becomes null
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
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
  logoutBtn: {
    borderWidth: 2, borderColor: colors.error,
    borderRadius: radius.md,
    paddingHorizontal: spacing.xxxl, paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  logoutText: { color: colors.error, fontWeight: '700', fontSize: fontSize.base },
});
```

- [ ] **Step 2: Test on emulator**

Tap avatar in header → ProfileScreen. Verify:
1. Name, email, phone (if set) shown
2. "Member since" shows formatted date
3. "Sign Out" clears storage → app returns to LoginScreen automatically

- [ ] **Step 3: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add agrimove-mobile/src/screens/ProfileScreen.jsx
git commit -m "feat: add ProfileScreen with logout"
```

---

## Task 12: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add mobile app section to `README.md`**

Open `/Users/mac/Desktop/ALU/SE/README.md` and append this section before the Troubleshooting heading:

```markdown
---

## Mobile App (Android)

A React Native (Expo) Android app in `agrimove-mobile/`.

### Prerequisites

- **Android Studio** with an Android emulator configured (API 33+ recommended)
- **Expo CLI**: `npm install -g expo-cli` (or use `npx expo` directly)
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

1. **Sign Up** — create an account (name, email, phone, password)
2. **Browse Drivers** — filter by vehicle type or availability
3. **View Profile** — tap any driver to see stats and details
4. **Book** — fill in pickup, destination, cargo, and your phone
5. **Call to Confirm** — see the driver's number and tap **Call Now**
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mac/Desktop/ALU/SE
git add README.md
git commit -m "docs: add mobile app setup instructions to README"
```

---

## Self-Review

**Spec coverage:**
- ✅ Android only, Expo — Task 1
- ✅ Auth gate (login/signup required) — Task 5 (AppNavigator shows AuthStack when no user)
- ✅ `POST /api/auth/signup` with name/email/phone/password — Task 3 + Task 6
- ✅ `POST /api/auth/login` — Task 3 + Task 6
- ✅ JWT in SecureStore, persisted across restarts — Task 4
- ✅ DriverListScreen with filter chips (All/Truck/Pickup/Van/Available) — Task 8
- ✅ Pull-to-refresh — Task 8
- ✅ DriverCard with initials, tags, rating, available dot — Task 7
- ✅ DriverProfileScreen as transparent modal bottom sheet — Task 9
- ✅ Stats row (rating, trips, capacity, rate) — Task 9
- ✅ "Book This Driver" only for available drivers — Task 9
- ✅ BookingFormScreen with driver banner, pre-filled phone — Task 10
- ✅ BookingConfirmedScreen with phone number + Call Now (Linking.openURL tel:) — Task 10
- ✅ ProfileScreen with name, email, phone, logout — Task 11
- ✅ Clean & Minimal design tokens (sky blue, white, subtle shadows) — Task 2
- ✅ README updated — Task 12

**Placeholder scan:** No TBDs, no "similar to Task N" references, all code blocks complete.

**Type consistency:**
- `login(token, user)` defined in AuthContext Task 4, called identically in LoginScreen Task 6 and RegisterScreen Task 6
- `fetchDrivers(filters, token)` defined in Task 3, called in DriverListScreen Task 8 with same signature
- `createBooking(data, token)` defined in Task 3, called in BookingFormScreen Task 10 with same signature
- `route.params.driver` passed from DriverListScreen → DriverProfileScreen → BookingFormScreen, consistent across Tasks 8, 9, 10
- `booking` object from `createBooking` response includes `driver_phone`, `driver_name` — these come from the existing backend `POST /api/bookings` which already returns them
