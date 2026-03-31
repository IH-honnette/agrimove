export default function DriverCard({ driver, onSelect, heroData }) {
  const stars = '★'.repeat(Math.floor(driver.rating)) + (driver.rating % 1 >= 0.5 ? '½' : '');
  const fare = heroData ? driver.rate * heroData.dist : null;

  return (
    <div className={`driver-card ${driver.available ? 'available' : 'unavailable'}`} onClick={() => driver.available && onSelect(driver)}>
      <div className="card-avatar">{driver.initials}</div>
      <div className="card-body">
        <h3 className="card-name">{driver.name}</h3>
        <p className="card-vehicle">{driver.vehicle}</p>
        <div className="card-tags">
          <span className="tag tag-type">{driver.type}</span>
          <span className="tag tag-location">{driver.location}</span>
        </div>
      </div>
      <div className="card-meta">
        <div className="card-rating">{driver.rating} <span className="stars">{stars}</span></div>
        <div className="card-trips">{driver.trips} trips</div>
        {fare ? (
          <div className="card-rate">RWF {fare.toLocaleString()} total</div>
        ) : (
          <div className="card-rate">RWF {driver.rate.toLocaleString()}/km</div>
        )}
        <div className={`card-status ${driver.available ? 'status-available' : 'status-busy'}`}>
          {driver.available ? 'Available' : 'Unavailable'}
        </div>
      </div>
    </div>
  );
}
