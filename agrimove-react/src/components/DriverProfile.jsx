export default function DriverProfile({ driver, onBook, onClose }) {
  if (!driver) return null;

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
              <span className="tag tag-location">{driver.location}</span>
              <span className={`tag ${driver.available ? 'tag-available' : 'tag-busy'}`}>
                {driver.available ? 'Available' : 'Unavailable'}
              </span>
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
            <span className="stat-value">RWF {driver.rate.toLocaleString()}</span>
            <span className="stat-label">Per day</span>
          </div>
          <div className="stat">
            <span className="stat-value">{driver.capacity}</span>
            <span className="stat-label">Capacity</span>
          </div>
        </div>

        <div className="profile-section">
          <h4>Carries</h4>
          <p>{driver.crops}</p>
        </div>

        <div className="profile-section">
          <h4>Based in</h4>
          <p>{driver.location}</p>
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
