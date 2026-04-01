import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { fetchDrivers } from './api/driversApi';
import DriverCard from './components/DriverCard';
import DriverProfile from './components/DriverProfile';
import BookingForm from './components/BookingForm';
import PhonePrompt from './components/PhonePrompt';
import FilterBar from './components/FilterBar';
import HeroSearch from './components/HeroSearch';
import DriverDashboard from './components/DriverDashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import './App.css';

function Header() {
  const { user, logout } = useAuth();
  const initials = user ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '';

  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="header-left">
          <Link to="/" className="logo">
            <span className="logo-icon">🚛</span>
            <span className="logo-text">AgriMove</span>
          </Link>
          <p className="header-tagline">Connecting farmers with trusted transport</p>
        </div>
        <div className="header-right">
          {user ? (
            <div className="header-user">
              <div className="user-avatar">{initials}</div>
              <span className="user-name">{user.name}</span>
              {user.role === 'driver' && (
                <span className="role-badge">Driver</span>
              )}
              <button className="btn-logout" onClick={logout} id="logout-btn">Logout</button>
            </div>
          ) : (
            <div className="header-auth-buttons">
              <Link to="/login" className="btn-header-login" id="header-login-btn">Sign In</Link>
              <Link to="/signup" className="btn-header-signup" id="header-signup-btn">Get Started</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DriversPage() {
  const { user, token } = useAuth();
  const [view, setView] = useState('list');
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [profileDriver, setProfileDriver] = useState(null);
  const [booking, setBooking] = useState(null);
  const [filters, setFilters] = useState({});
  const [heroData, setHeroData] = useState(null);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDrivers(filters, token);
      setDrivers(data);
    } catch (e) {
      setError('Could not load drivers. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  function handleSelectDriver(driver) { setProfileDriver(driver); }

  function handleBook(driver) {
    if (!user) { window.location.href = '/login'; return; }
    setSelectedDriver(driver);
    setProfileDriver(null);
    setView('book');
  }

  function handleConfirm(bookingData) {
    setBooking(bookingData);
    setView('confirm');
  }

  function handleDone() {
    setView('list');
    setBooking(null);
    setSelectedDriver(null);
    loadDrivers();
  }

  if (view === 'book') {
    return (
      <>
        <Header />
        <BookingForm driver={selectedDriver} onConfirm={handleConfirm} onBack={() => setView('list')} heroData={heroData} />
      </>
    );
  }

  if (view === 'confirm') {
    return (
      <>
        <Header />
        <PhonePrompt booking={booking} onDone={handleDone} />
      </>
    );
  }

  return (
    <>
      <Header />
      <HeroSearch onSearch={setHeroData} />
      <main className="app-main" id="drivers-list">
        <FilterBar filters={filters} onChange={setFilters} />

        {filters.lat != null && (
          <div className="near-me-banner">
            📍 Showing drivers within 50 km of your location · sorted by distance
          </div>
        )}

        {loading && <div className="loading">Loading drivers…</div>}
        {error   && <div className="error-msg">{error}</div>}

        {!loading && !error && (
          <>
            <p className="results-count">{drivers.length} driver{drivers.length !== 1 ? 's' : ''} found</p>
            <div className="drivers-grid">
              {drivers.map(driver => (
                <DriverCard key={driver.id} driver={driver} onSelect={handleSelectDriver} heroData={heroData} />
              ))}
            </div>
            {drivers.length === 0 && (
              <p className="no-results">No drivers match your filters. Try adjusting your search.</p>
            )}
          </>
        )}
      </main>

      <DriverProfile driver={profileDriver} onBook={handleBook} onClose={() => setProfileDriver(null)} heroData={heroData} />
    </>
  );
}

function DriverPage() {
  return (
    <>
      <Header />
      <DriverDashboard />
    </>
  );
}

function HomePage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (user?.role === 'driver') return <DriverPage />;
  return <DriversPage />;
}

function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login"  element={<AuthGuard><LoginPage /></AuthGuard>} />
          <Route path="/signup" element={<AuthGuard><SignupPage /></AuthGuard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
