import { useState, useEffect, useCallback } from 'react';
import { fetchDrivers } from './api/driversApi';
import DriverCard from './components/DriverCard';
import DriverProfile from './components/DriverProfile';
import BookingForm from './components/BookingForm';
import PhonePrompt from './components/PhonePrompt';
import FilterBar from './components/FilterBar';
import './App.css';

export default function App() {
  const [view, setView] = useState('list'); // 'list' | 'book' | 'confirm'
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [profileDriver, setProfileDriver] = useState(null);
  const [booking, setBooking] = useState(null);
  const [filters, setFilters] = useState({});

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDrivers(filters);
      setDrivers(data);
    } catch (e) {
      setError('Could not load drivers. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  function handleSelectDriver(driver) {
    setProfileDriver(driver);
  }

  function handleBook(driver) {
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
    return <BookingForm driver={selectedDriver} onConfirm={handleConfirm} onBack={() => setView('list')} />;
  }

  if (view === 'confirm') {
    return <PhonePrompt booking={booking} onDone={handleDone} />;
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">🚛</span>
            <span className="logo-text">AgriMove</span>
          </div>
          <p className="header-tagline">Connecting farmers with trusted transport</p>
        </div>
      </header>

      <main className="app-main">
        <div className="section-title">
          <h1>Available Drivers</h1>
          <p>Browse verified agricultural transport providers across Rwanda</p>
        </div>

        <FilterBar filters={filters} onChange={setFilters} />

        {loading && <div className="loading">Loading drivers…</div>}
        {error && <div className="error-msg">{error}</div>}

        {!loading && !error && (
          <>
            <p className="results-count">{drivers.length} driver{drivers.length !== 1 ? 's' : ''} found</p>
            <div className="drivers-grid">
              {drivers.map(driver => (
                <DriverCard key={driver.id} driver={driver} onSelect={handleSelectDriver} />
              ))}
            </div>
            {drivers.length === 0 && (
              <p className="no-results">No drivers match your filters. Try adjusting your search.</p>
            )}
          </>
        )}
      </main>

      <DriverProfile
        driver={profileDriver}
        onBook={handleBook}
        onClose={() => setProfileDriver(null)}
      />
    </div>
  );
}
