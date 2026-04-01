import { useState, useEffect, useRef } from 'react';
import './HeroSearch.css';

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const geoCache = {};
async function geocode(place) {
  if (geoCache[place]) return geoCache[place];
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  if (!data.length) return null;
  const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), name: data[0].display_name };
  geoCache[place] = result;
  return result;
}

export default function HeroSearch({ onSearch }) {
  const [pickup, setPickup] = useState('');
  const [dest, setDest] = useState('');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    setResult(null);

    if (pickup.length < 3 || dest.length < 3) {
      setStatus('');
      return;
    }

    setStatus('calculating');
    timerRef.current = setTimeout(async () => {
      try {
        const [a, b] = await Promise.all([geocode(pickup), geocode(dest)]);
        if (!a) { setStatus('error-pickup'); return; }
        if (!b) { setStatus('error-dest'); return; }

        const dist = Math.round(haversine(a.lat, a.lon, b.lat, b.lon));
        setResult({
          dist,
          pickupName: a.name.split(',')[0],
          destName: b.name.split(',')[0]
        });
        setStatus('');
      } catch (e) {
        setStatus('error-network');
      }
    }, 900);
  }, [pickup, dest]);

  function handleSearchClick() {
    if (!result) return;
    onSearch({ pickup, dest, dist: result.dist });
    
    // Smooth scroll down to drivers section
    document.getElementById('drivers-list')?.scrollIntoView({ behavior: 'smooth' });
  }

  return (
    <div className="hero-section">
      <div className="hero-content">
        <h1>Move Your Harvest<br />with Trusted Drivers</h1>
        <p className="hero-sub">Type your pickup and destination — we&apos;ll calculate distance and fare automatically.</p>

        <div className="hero-search-card">
          <h3>📍 Where are you sending your produce?</h3>
          
          <div class="hs-row">
            <div className="hs-group">
              <label>Pickup Location</label>
              <input
                type="text"
                placeholder="e.g. Musanze, Rwanda"
                value={pickup}
                onChange={e => setPickup(e.target.value)}
              />
            </div>
            <div className="hs-group">
              <label>Destination</label>
              <input
                type="text"
                placeholder="e.g. Kigali, Rwanda"
                value={dest}
                onChange={e => setDest(e.target.value)}
              />
            </div>
          </div>

          {status === 'calculating' && (
            <div className="calc-status">
              <span className="mini-spin"></span> Calculating distance…
            </div>
          )}
          {status === 'error-pickup' && <div className="calc-status error">⚠️ Could not find pickup location.</div>}
          {status === 'error-dest' && <div className="calc-status error">⚠️ Could not find destination.</div>}
          {status === 'error-network' && <div className="calc-status error">⚠️ Network error. Check connection.</div>}

          {result && (
            <>
              <div className="dist-badge show">
                <span className="dist-km">{result.dist} km</span>
                <div>
                  <div className="dist-label">{result.pickupName} → {result.destName}</div>
                </div>
              </div>
              <div className="price-row show">
                <div>
                  <div className="pr-label">Estimated Price Range</div>
                  <div className="pr-value">RWF {(420 * result.dist).toLocaleString()} – {(750 * result.dist).toLocaleString()}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="pr-note">for {result.dist} km</div>
                  <div className="pr-note">RWF 420 – 750 per km</div>
                </div>
              </div>
            </>
          )}

          <button
            className="hs-search-btn"
            disabled={!result}
            onClick={handleSearchClick}
          >
            🔍 Find Drivers Near Me
          </button>
        </div>
      </div>
    </div>
  );
}
