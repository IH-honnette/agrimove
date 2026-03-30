const LOCATIONS = ['All', 'Kigali', 'Musanze', 'Huye', 'Rubavu', 'Nyanza', 'Muhanga', 'Rwamagana', 'Kayonza'];
const TYPES = ['All', 'truck', 'pickup', 'van'];

export default function FilterBar({ filters, onChange }) {
  function set(key, value) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Vehicle Type</label>
        <div className="filter-buttons">
          {TYPES.map(t => (
            <button
              key={t}
              className={`filter-btn ${filters.type === t || (!filters.type && t === 'All') ? 'active' : ''}`}
              onClick={() => set('type', t === 'All' ? '' : t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-group">
        <label>Location</label>
        <select value={filters.location || ''} onChange={e => set('location', e.target.value)}>
          {LOCATIONS.map(l => (
            <option key={l} value={l === 'All' ? '' : l}>{l}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={filters.available === true}
            onChange={e => set('available', e.target.checked ? true : undefined)}
          />
          Available only
        </label>
      </div>
    </div>
  );
}
