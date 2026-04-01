const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchDrivers(filters = {}, token) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.available) params.set('available', 'true');
  if (filters.lat != null) params.set('lat', filters.lat);
  if (filters.lng != null) params.set('lng', filters.lng);
  if (filters.radius != null) params.set('radius', filters.radius);
  const res = await fetch(`${BASE}/drivers?${params}`, {
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error('Failed to fetch drivers');
  return res.json();
}

export async function fetchDriver(id, token) {
  const res = await fetch(`${BASE}/drivers/${id}`, {
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error('Driver not found');
  return res.json();
}

export async function createBooking(data, token) {
  const res = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Booking failed');
  }
  return res.json();
}

export async function fetchMyBookings(token) {
  const res = await fetch(`${BASE}/bookings/mine`, {
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error('Failed to fetch bookings');
  return res.json();
}

export async function fetchDriverBookings(token) {
  const res = await fetch(`${BASE}/bookings/driver`, {
    headers: authHeader(token),
  });
  if (!res.ok) throw new Error('Failed to fetch driver bookings');
  return res.json();
}
