import { useState } from 'react';
import { createBooking } from '../api/driversApi';

export default function BookingForm({ driver, onConfirm, onBack }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    cargo_type: '',
    pickup_location: '',
    destination: '',
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
      const booking = await createBooking({ driver_id: driver.id, ...form });
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
            <p className="form-sub">{driver.vehicle} · {driver.location}</p>
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

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? 'Booking…' : 'Confirm Booking'}
          </button>
        </form>
      </div>
    </div>
  );
}
