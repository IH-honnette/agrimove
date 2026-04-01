import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './AuthPages.css';

const VEHICLE_TYPES = ['Truck', 'Pickup', 'Van'];

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', confirm: '', role: 'customer',
    vehicle: '', vehicleType: 'Truck', capacity: '', location: '',
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.role === 'driver' && (!form.vehicle.trim() || !form.capacity.trim() || !form.location.trim())) {
      setError('Vehicle name, capacity, and base location are required for drivers');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone,
        password: form.password, role: form.role,
      };
      if (form.role === 'driver') {
        payload.vehicle = form.vehicle.trim();
        payload.type = form.vehicleType.toLowerCase();
        payload.capacity = form.capacity.trim();
        payload.location = form.location.trim();
      }
      await signup(payload);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo-icon">🚛</span>
            <span className="auth-logo-text">AgriMove</span>
          </div>

          <h1 className="auth-title">Create your account</h1>
          <p className="auth-subtitle">Join AgriMove to connect with verified transport providers</p>

          <form onSubmit={handleSubmit} className="auth-form" id="signup-form">
            {/* Role selector */}
            <div className="input-group role-group">
              <label>I am registering as:</label>
              <div className="role-options" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', textTransform: 'none', fontSize: '0.9rem' }}>
                  <input type="radio" name="role" value="customer" checked={form.role === 'customer'} onChange={handleChange} />
                  🌾 Customer
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', textTransform: 'none', fontSize: '0.9rem' }}>
                  <input type="radio" name="role" value="driver" checked={form.role === 'driver'} onChange={handleChange} />
                  🚛 Driver
                </label>
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-name">Full Name</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input id="signup-name" type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Your full name" />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-email">Email</label>
              <div className="input-wrapper">
                <span className="input-icon">✉</span>
                <input id="signup-email" type="email" name="email" value={form.email} onChange={handleChange} required placeholder="you@example.com" />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="signup-phone">Phone Number {form.role === 'driver' ? '*' : '(optional)'}</label>
              <div className="input-wrapper">
                <span className="input-icon">📱</span>
                <input id="signup-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} required={form.role === 'driver'} placeholder="+250 7XX XXX XXX" />
              </div>
            </div>

            {/* Driver-only fields */}
            {form.role === 'driver' && (
              <>
                <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border)' }} />
                <p style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Vehicle Details</p>

                <div className="input-group">
                  <label>Vehicle Name *</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🚛</span>
                    <input type="text" name="vehicle" value={form.vehicle} onChange={handleChange} required placeholder="e.g. Isuzu Truck" />
                  </div>
                </div>

                <div className="input-group">
                  <label>Vehicle Type *</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    {VEHICLE_TYPES.map(t => (
                      <button
                        key={t} type="button"
                        onClick={() => setForm(f => ({ ...f, vehicleType: t }))}
                        style={{
                          flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1.5px solid',
                          borderColor: form.vehicleType === t ? 'var(--green-600)' : 'var(--border)',
                          backgroundColor: form.vehicleType === t ? 'var(--green-50)' : 'white',
                          color: form.vehicleType === t ? 'var(--green-700)' : 'var(--text-secondary)',
                          fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem',
                        }}
                      >{t}</button>
                    ))}
                  </div>
                </div>

                <div className="input-group">
                  <label>Capacity *</label>
                  <div className="input-wrapper">
                    <span className="input-icon">⚖️</span>
                    <input type="text" name="capacity" value={form.capacity} onChange={handleChange} required placeholder="e.g. 5 tonnes" />
                  </div>
                </div>

                <div className="input-group">
                  <label>Base Location *</label>
                  <div className="input-wrapper">
                    <span className="input-icon">📍</span>
                    <input type="text" name="location" value={form.location} onChange={handleChange} required placeholder="e.g. Kigali, Musanze" />
                  </div>
                </div>
                <hr style={{ margin: '0.5rem 0', borderColor: 'var(--border)' }} />
              </>
            )}

            <div className="input-row">
              <div className="input-group">
                <label htmlFor="signup-password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input id="signup-password" type="password" name="password" value={form.password} onChange={handleChange} required placeholder="Min 8 characters" />
                </div>
              </div>
              <div className="input-group">
                <label htmlFor="signup-confirm">Confirm</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input id="signup-confirm" type="password" name="confirm" value={form.confirm} onChange={handleChange} required placeholder="Repeat password" />
                </div>
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn" disabled={loading} id="signup-submit">
              {loading ? <span className="btn-loading"><span className="spinner"></span> Creating account…</span> : 'Create Account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
