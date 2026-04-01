import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchDriverBookings } from '../api/driversApi';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLE = {
  pending:   { bg: '#fef9c3', color: '#854d0e' },
  confirmed: { bg: '#dcfce7', color: '#15803d' },
  completed: { bg: '#e0f2fe', color: '#0369a1' },
  cancelled: { bg: '#fee2e2', color: '#be123c' },
};

export default function DriverDashboard() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchDriverBookings(token);
      setBookings(data);
    } catch {
      setError('Could not load bookings. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const pending   = bookings.filter(b => b.status === 'pending').length;
  const completed = bookings.filter(b => b.status === 'completed').length;

  return (
    <main className="app-main">
      <div className="dashboard-header">
        <h2>📋 Booking Requests</h2>
        <p className="results-count">{bookings.length} total · {pending} pending · {completed} completed</p>
      </div>

      {loading && <div className="loading">Loading bookings…</div>}
      {error   && <div className="error-msg">{error} <button onClick={load} style={{ marginLeft: '1rem' }}>Retry</button></div>}

      {!loading && !error && bookings.length === 0 && (
        <div className="no-results" style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
          <p style={{ fontWeight: '700', fontSize: '1.1rem' }}>No booking requests yet</p>
          <p style={{ color: 'var(--text-secondary)' }}>Requests from customers will appear here.</p>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="bookings-list">
          {bookings.map(b => {
            const s = STATUS_STYLE[b.status] || STATUS_STYLE.pending;
            return (
              <div key={b.id} className="booking-card">
                <div className="booking-card-top">
                  <div className="booking-customer">
                    <div className="booking-avatar">
                      {(b.customer_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="booking-customer-name">{b.customer_name}</div>
                      <div className="booking-customer-phone">{b.customer_phone}</div>
                    </div>
                  </div>
                  <span className="booking-status-badge" style={{ background: s.bg, color: s.color }}>
                    {b.status}
                  </span>
                </div>

                <div className="booking-route">
                  <div className="booking-route-row">📍 <span>{b.pickup_location}</span></div>
                  <div className="booking-route-divider" />
                  <div className="booking-route-row">🏁 <span>{b.destination}</span></div>
                </div>

                {b.cargo_type && <div className="booking-cargo">📦 {b.cargo_type}</div>}

                <div className="booking-footer">
                  <span className="booking-date">{formatDate(b.created_at)}</span>
                  {b.status === 'pending' && (
                    <a href={`tel:${(b.customer_phone || '').replace(/\s/g, '')}`} className="btn-call-small">
                      📞 Call Customer
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
