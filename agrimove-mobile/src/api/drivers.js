const BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

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
