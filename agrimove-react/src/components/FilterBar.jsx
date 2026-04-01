import { useState } from 'react';

const TYPES = ['All', 'truck', 'pickup', 'van'];

export default function FilterBar({ filters, onChange }) {
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);

  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  async function handleNearMe() {
    if (filters.lat != null) {
      // toggle off
      const { lat, lng, radius, ...rest } = filters;
      onChange(rest);
      return;
    }
    setLocLoading(true);
    setLocError(null);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
      );
      onChange({ ...filters, lat: pos.coords.latitude, lng: pos.coords.longitude, radius: 50 });
    } catch {
      setLocError('Could not get your location. Enable location access and try again.');
    } finally {
      setLocLoading(false);
    }
  }

  const nearMeActive = filters.lat != null;

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Vehicle Type</label>
        <div className="filter-buttons">
          {TYPES.map(t => (
            <button
              key={t}
              className={`filter-btn ${filters.type === t || (!filters.type && t === 'All') ? 'active' : ''}`}
              onClick={() => set('type', t === 'All' ? '' : t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.available === true}
            onChange={e => set('available', e.target.checked ? true : undefined)}
          />
          Available only
        </label>
      </div>

      <div className="filter-group">
        <button
          className={`filter-btn near-me-btn ${nearMeActive ? 'active' : ''}`}
          onClick={handleNearMe}
          disabled={locLoading}
        >
          {locLoading ? '⏳ Locating…' : nearMeActive ? '📍 Near Me ✕' : '📍 Near Me'}
        </button>
        {nearMeActive && <span className="near-me-note">Drivers within 50 km · sorted by distance</span>}
        {locError && <span className="filter-error">{locError}</span>}
      </div>
    </div>
  );
}
