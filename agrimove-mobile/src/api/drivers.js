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
