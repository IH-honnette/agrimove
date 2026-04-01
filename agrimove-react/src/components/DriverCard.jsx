function isLive(updatedAt) {
  if (!updatedAt) return false;
  return (Date.now() - new Date(updatedAt).getTime()) < 10 * 60 * 1000;
}

export default function DriverCard({ driver, onSelect, heroData }) {
  const live = isLive(driver.location_updated_at);
  const displayLocation = driver.location_address || driver.location || '';
  const distanceKm = driver.distance_km;

  const typeStyles = {
    truck:  { bg: 'linear-gradient(135deg, #10b981, #047857)', icon: '🚛' },
    pickup: { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', icon: '🛻' },
    van:    { bg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', icon: '🚐' },
  };
  const style = typeStyles[driver.type] || typeStyles.truck;

  return (
    <div
      className={`driver-card-premium ${driver.available ? 'available' : 'unavailable'}`}
      onClick={() => driver.available && onSelect(driver)}
    >
      <div className="card-header-bg" style={{ background: style.bg }}>
        <div className="card-vehicle-icon">{style.icon}</div>
        <div className={`card-availability ${driver.available ? 'is-avail' : 'is-busy'}`}>
          {driver.available ? 'Ready to move' : 'Currently busy'}
        </div>
        {live && <div className="live-badge">● LIVE</div>}
      </div>

      <div className="card-content-wrap">
        <div className="card-avatar-overlap">{driver.initials}</div>

        <div className="card-main-info">
          <h3 className="card-name">{driver.name}</h3>
          <p className="card-vehicle-name">{driver.vehicle}</p>
          <div className="card-location">
            📍 {displayLocation || '—'}
            {distanceKm != null && <span className="distance-badge">{distanceKm} km away</span>}
          </div>
        </div>

        <div className="card-stats-row">
          <div className="card-stat-box">
            <span className="sc-val">{driver.rating} <span className="sc-star">★</span></span>
            <span className="sc-lbl">Rating</span>
          </div>
          <div className="card-stat-box">
            <span className="sc-val">{driver.trips}</span>
            <span className="sc-lbl">Trips</span>
          </div>
          <div className="card-stat-box">
            <span className="sc-val">{driver.capacity}</span>
            <span className="sc-lbl">Capacity</span>
          </div>
        </div>
      </div>

      {driver.available && (
        <div className="card-hover-overlay">
          <div className="card-hover-content">
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>📦</div>
            <h4 style={{ color: 'white', marginBottom: '16px', fontSize: '20px' }}>Book {driver.name}</h4>
            <button className="btn-hover-book">View & Book →</button>
          </div>
        </div>
      )}
    </div>
  );
}
