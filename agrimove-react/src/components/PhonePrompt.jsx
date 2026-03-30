export default function PhonePrompt({ booking, onDone }) {
  const rawPhone = booking.driver_phone || '';
  const telHref = `tel:${rawPhone.replace(/\s/g, '')}`;

  return (
    <div className="page-container">
      <div className="prompt-card">
        <div className="prompt-icon">✓</div>
        <h2>Booking Confirmed!</h2>
        <p className="prompt-sub">
          Your booking #{booking.id} is saved. Call the driver to arrange pick-up details.
        </p>

        <div className="phone-box">
          <p className="phone-label">Driver: {booking.driver_name}</p>
          <p className="phone-number">{booking.driver_phone}</p>
          <a href={telHref} className="btn-call">
            📞 Call Now
          </a>
        </div>

        <div className="booking-summary">
          <p><strong>Pickup:</strong> {booking.pickup_location}</p>
          <p><strong>Destination:</strong> {booking.destination}</p>
          {booking.cargo_type && <p><strong>Cargo:</strong> {booking.cargo_type}</p>}
        </div>

        <button className="btn-secondary btn-full" onClick={onDone}>
          Back to Drivers
        </button>
      </div>
    </div>
  );
}
