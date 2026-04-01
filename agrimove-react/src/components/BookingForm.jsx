import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { createBooking } from '../api/driversApi';

const BASE_PRICE = 1000;
const RATE_PER_KM = 1500;

export default function BookingForm({ driver, onConfirm, onBack, heroData }) {
  const { user, token } = useAuth();
  const estimatedPrice = heroData?.dist
    ? Math.max(BASE_PRICE, Math.round(BASE_PRICE + RATE_PER_KM * heroData.dist))
    : null;

  const [form, setForm] = useState({
    customer_name: user?.name || '',
    customer_phone: user?.phone || '',
    cargo_type: heroData?.cargo || '',
    pickup_location: heroData?.pickup || '',
    destination: heroData?.dest || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const booking = await createBooking({ driver_id: driver.id, ...form }, token);
      onConfirm(booking);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

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
            Cargo Type
            <input name="cargo_type" value={form.cargo_type} onChange={handleChange} placeholder="e.g. Maize, Vegetables, Livestock" />
          </label>
          <label>
            Pickup Location *
            <input name="pickup_location" value={form.pickup_location} onChange={handleChange} required placeholder="Where to pick up your cargo" />
          </label>
          <label>
            Destination *
            <input name="destination" value={form.destination} onChange={handleChange} required placeholder="Where to deliver" />
          </label>

          {estimatedPrice && (
            <div className="booking-summary">
              <p>Distance: <strong>{heroData.dist} km</strong></p>
              <p>Base fee: <strong>RWF {BASE_PRICE.toLocaleString()}</strong></p>
              <p>Per km: <strong>RWF {RATE_PER_KM.toLocaleString()}</strong></p>
              <p style={{ marginTop: '10px', fontSize: '18px', color: 'var(--green-700)' }}>
                Estimated total: <strong>RWF {estimatedPrice.toLocaleString()}</strong>
              </p>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Booking…' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}
