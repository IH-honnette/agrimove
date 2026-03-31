const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

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
