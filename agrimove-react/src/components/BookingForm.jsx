import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { createBooking } from '../api/driversApi';
import Autocomplete from 'react-google-autocomplete';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';
const BASE_PRICE = 1000;
const RATE_PER_KM = 1500;

async function fetchDistance(originPlaceId, destinationPlaceId) {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=place_id:${originPlaceId}&destination=place_id:${destinationPlaceId}&units=metric&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== 'OK' || !json.routes?.length) throw new Error('Could not calculate distance');
  const leg = json.routes[0].legs[0];
  return {
    distanceText: leg.distance.text,
    distanceKm: leg.distance.value / 1000,
    durationText: leg.duration.text,
  };
}

export default function BookingForm({ driver, onConfirm, onBack }) {
  const { user, token } = useAuth();

  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupPlaceId, setPickupPlaceId] = useState(null);
  const [destination, setDestination] = useState('');
  const [destPlaceId, setDestPlaceId] = useState(null);
  const [form, setForm] = useState({
    customer_name: user?.name || '',
    customer_phone: user?.phone || '',
    cargo_type: '',
  });
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-calculate when both place IDs available
  useEffect(() => {
    if (!pickupPlaceId || !destPlaceId) { setEstimate(null); return; }
    let cancelled = false;
    setEstimating(true);
    fetchDistance(pickupPlaceId, destPlaceId)
      .then(({ distanceText, distanceKm, durationText }) => {
        if (cancelled) return;
        const price = Math.max(BASE_PRICE, Math.round(BASE_PRICE + RATE_PER_KM * distanceKm));
        setEstimate({ distanceText, distanceKm, durationText, price });
      })
      .catch(() => { if (!cancelled) setEstimate(null); })
      .finally(() => { if (!cancelled) setEstimating(false); });
    return () => { cancelled = true; };
  }, [pickupPlaceId, destPlaceId]);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pickupLocation.trim() || !destination.trim()) {
      setError('Please select pickup and destination from the suggestions');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const booking = await createBooking({
        driver_id: driver.id,
        customer_name: form.customer_name,
        customer_phone: form.customer_phone,
        cargo_type: form.cargo_type || null,
        pickup_location: pickupLocation,
        destination,
      }, token);
      onConfirm(booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const acOptions = {
    apiKey: GOOGLE_KEY,
    options: {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'rw' },
    },
    language: 'en',
  };

  return (
    <div className="page-container">
      <button className="btn-back" onClick={onBack}>← Back</button>
      <div className="form-card">
        <div className="form-header">
          <div className="form-avatar">{driver.initials}</div>
          <div>
            <h2>Book {driver.name}</h2>
            <p className="form-sub">{driver.vehicle} · {driver.location_address || driver.location}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <label>
            Your Name *
            <input name="customer_name" value={form.customer_name} onChange={handleChange} required placeholder="Full name" />
          </label>

          <label>
            Your Phone Number *
            <input name="customer_phone" value={form.customer_phone} onChange={handleChange} required placeholder="+250 7XX XXX XXX" type="tel" />
          </label>

          <label>
            Pickup Location *
            <Autocomplete
              {...acOptions}
              className="places-input"
              placeholder="Where to pick up your cargo"
              onPlaceSelected={(place) => {
                setPickupLocation(place.formatted_address || place.name || '');
                setPickupPlaceId(place.place_id || null);
                setEstimate(null);
              }}
            />
          </label>

          <label>
            Destination *
            <Autocomplete
              {...acOptions}
              className="places-input"
              placeholder="Where to deliver"
              onPlaceSelected={(place) => {
                setDestination(place.formatted_address || place.name || '');
                setDestPlaceId(place.place_id || null);
                setEstimate(null);
              }}
            />
          </label>

          {/* Inline estimate */}
          {estimating && (
            <div className="estimate-card estimate-loading">
              <span className="estimate-spinner" /> Calculating distance…
            </div>
          )}
          {estimate && !estimating && (
            <div className="estimate-card">
              <div className="estimate-row">
                <span className="estimate-label">Distance</span>
                <span className="estimate-value">{estimate.distanceText}</span>
              </div>
              <div className="estimate-divider" />
              <div className="estimate-row">
                <span className="estimate-label">Drive time</span>
                <span className="estimate-value">{estimate.durationText}</span>
              </div>
              <div className="estimate-divider" />
              <div className="estimate-row">
                <span className="estimate-label">Base fee</span>
                <span className="estimate-value">RWF {BASE_PRICE.toLocaleString()}</span>
              </div>
              <div className="estimate-divider" />
              <div className="estimate-row">
                <span className="estimate-label">Per km (RWF {RATE_PER_KM.toLocaleString()} × {estimate.distanceKm.toFixed(1)} km)</span>
                <span className="estimate-value">RWF {Math.round(RATE_PER_KM * estimate.distanceKm).toLocaleString()}</span>
              </div>
              <div className="estimate-divider estimate-divider-bold" />
              <div className="estimate-row">
                <span className="estimate-label estimate-total-label">Estimated total</span>
                <span className="estimate-total">RWF {estimate.price.toLocaleString()}</span>
              </div>
            </div>
          )}

          <label>
            Cargo Type
            <input name="cargo_type" value={form.cargo_type} onChange={handleChange} placeholder="e.g. Maize, Vegetables, Livestock" />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Booking…' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}
