function isLive(updatedAt) {
  if (!updatedAt) return false;
  return (Date.now() - new Date(updatedAt).getTime()) < 10 * 60 * 1000;
}

export default function DriverProfile({ driver, onBook, onClose, heroData }) {
  if (!driver) return null;
  const live = isLive(driver.location_updated_at);
  const displayLocation = driver.location_address || driver.location || '—';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="profile-header">
          <div className="profile-avatar">{driver.initials}</div>
          <div>
            <h2 className="profile-name">{driver.name}</h2>
            <p className="profile-vehicle">{driver.vehicle}</p>
            <div className="profile-tags">
              <span className="tag tag-type">{driver.type}</span>
              <span className={`tag ${driver.available ? 'tag-available' : 'tag-busy'}`}>
                {driver.available ? 'Available' : 'Unavailable'}
              </span>
              {live && <span className="tag tag-live">● Live</span>}
            </div>
          </div>
        </div>

        <div className="profile-stats">
          <div className="stat">
            <span className="stat-value">{driver.rating}</span>
            <span className="stat-label">Rating</span>
          </div>
          <div className="stat">
            <span className="stat-value">{driver.trips}</span>
            <span className="stat-label">Trips</span>
          </div>
          <div className="stat">
            <span className="stat-value">{driver.capacity}</span>
            <span className="stat-label">Capacity</span>
          </div>
          {driver.distance_km != null && (
            <div className="stat">
              <span className="stat-value">{driver.distance_km} km</span>
              <span className="stat-label">From you</span>
            </div>
          )}
        </div>

        <div className="profile-section profile-location-section">
          <h4>📍 Current Location</h4>
          <p>{displayLocation}</p>
          {live && <p className="live-label">● Live location · updated just now</p>}
        </div>

        {driver.available ? (
          <button className="btn-primary btn-full" onClick={() => onBook(driver)}>
            Book This Driver
          </button>
        ) : (
          <p className="unavailable-note">This driver is currently unavailable.</p>
        )}
      </div>
    </div>
  );
}
