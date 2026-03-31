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
