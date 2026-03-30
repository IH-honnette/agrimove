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
