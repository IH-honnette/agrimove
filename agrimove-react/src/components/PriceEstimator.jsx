import { useState } from 'react';

// Approximate distances between major Rwandan locations (in km)
const DISTANCES = {
  'Kigali-Musanze': 116,
  'Kigali-Huye': 133,
  'Kigali-Rubavu': 157,
  'Kigali-Nyanza': 88,
  'Kigali-Muhanga': 55,
  'Kigali-Rwamagana': 60,
  'Kigali-Kayonza': 100,
  'Musanze-Rubavu': 67,
  'Musanze-Huye': 220,
  'Musanze-Muhanga': 140,
  'Musanze-Nyanza': 180,
  'Musanze-Rwamagana': 170,
  'Musanze-Kayonza': 200,
  'Huye-Nyanza': 30,
  'Huye-Muhanga': 80,
  'Huye-Rubavu': 250,
  'Huye-Rwamagana': 180,
  'Huye-Kayonza': 210,
  'Rubavu-Muhanga': 120,
  'Rubavu-Nyanza': 200,
  'Rubavu-Rwamagana': 210,
  'Rubavu-Kayonza': 240,
  'Nyanza-Muhanga': 40,
  'Nyanza-Rwamagana': 130,
  'Nyanza-Kayonza': 165,
  'Muhanga-Rwamagana': 110,
  'Muhanga-Kayonza': 145,
  'Rwamagana-Kayonza': 42,
};

const LOCATIONS = ['Kigali', 'Musanze', 'Huye', 'Rubavu', 'Nyanza', 'Muhanga', 'Rwamagana', 'Kayonza'];

const RATE_PER_KM = 350; // RWF per km
const BASE_FEE = 5000;   // RWF base fee

function getDistance(from, to) {
  if (from === to) return 0;
  const key1 = `${from}-${to}`;
  const key2 = `${to}-${from}`;
  return DISTANCES[key1] || DISTANCES[key2] || null;
}

export default function PriceEstimator() {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [result, setResult] = useState(null);

  function handleEstimate(e) {
    e.preventDefault();
    if (!pickup || !destination) return;

    if (pickup === destination) {
      setResult({ error: 'Pickup and destination must be different locations' });
      return;
    }

    const distance = getDistance(pickup, destination);
    if (!distance) {
      setResult({ error: 'Unable to calculate distance for this route' });
      return;
    }

    const price = BASE_FEE + (distance * RATE_PER_KM);
    setResult({ distance, price, pickup, destination });
  }

  function handleReset() {
    setPickup('');
    setDestination('');
    setResult(null);
  }

  return (
    <div className="estimator">
      <div className="estimator-content">
        <div className="estimator-text">
          <h2 className="estimator-title">
            <span className="estimator-icon">📦</span>
            Estimate Delivery Cost
          </h2>
          <p className="estimator-subtitle">
            Enter your pickup and destination to get an instant price estimate for agricultural transport across Rwanda.
          </p>
        </div>

        <form className="estimator-form" onSubmit={handleEstimate} id="price-estimator-form">
          <div className="estimator-fields">
            <div className="estimator-field">
              <label htmlFor="est-pickup">
                <span className="field-dot pickup-dot"></span>
                Pickup Location
              </label>
              <select
                id="est-pickup"
                value={pickup}
                onChange={e => { setPickup(e.target.value); setResult(null); }}
                required
              >
                <option value="">Select pickup…</option>
                {LOCATIONS.map(l => (
                  <option key={l} value={l} disabled={l === destination}>{l}</option>
                ))}
              </select>
            </div>

            <div className="estimator-route-line">
              <span className="route-arrow">→</span>
            </div>

            <div className="estimator-field">
              <label htmlFor="est-destination">
                <span className="field-dot dest-dot"></span>
                Destination
              </label>
              <select
                id="est-destination"
                value={destination}
                onChange={e => { setDestination(e.target.value); setResult(null); }}
                required
              >
                <option value="">Select destination…</option>
                {LOCATIONS.map(l => (
                  <option key={l} value={l} disabled={l === pickup}>{l}</option>
                ))}
              </select>
            </div>

            <button type="submit" className="estimator-btn" id="estimate-price-btn">
              Get Estimate
            </button>
          </div>
        </form>

        {result && !result.error && (
          <div className="estimator-result" id="estimate-result">
            <div className="result-route">
              <span className="result-location">{result.pickup}</span>
              <span className="result-separator">
                <span className="result-line"></span>
                <span className="result-distance">{result.distance} km</span>
                <span className="result-line"></span>
              </span>
              <span className="result-location">{result.destination}</span>
            </div>
            <div className="result-price">
              <span className="result-price-label">Estimated Price</span>
              <span className="result-price-value">RWF {result.price.toLocaleString()}</span>
              <span className="result-price-breakdown">
                Base fee: RWF {BASE_FEE.toLocaleString()} + {result.distance} km × RWF {RATE_PER_KM}
              </span>
            </div>
            <button type="button" className="result-reset" onClick={handleReset}>
              Calculate another route
            </button>
          </div>
        )}

        {result && result.error && (
          <div className="estimator-error" id="estimate-error">
            {result.error}
          </div>
        )}
      </div>
    </div>
  );
}
