import { useEffect, useState } from 'react';
import { getMeta, listHotels } from '../api';
import { useApi } from '../hooks/useApi';

export default function HotelPicker({ selectedId, onSelect }) {
  // The city list comes from the database, so a newly loaded city appears without a code change.
  const meta = useApi(getMeta, []);
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reload the list when the filters change, 300 ms after the user stops typing.
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await listHotels({ city, q: query });
        if (!cancelled) {
          setHotels(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    // Runs before the next reload: drop this one if the filters changed meanwhile.
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [city, query]);

  return (
    <aside className="picker">
      <h2>Hotels</h2>

      <select value={city} onChange={(e) => setCity(e.target.value)} aria-label="City">
        <option value="">All cities</option>
        {meta.data?.cities.map((c) => (
          <option key={c.city} value={c.city}>{c.city}</option>
        ))}
      </select>

      <input
        type="search"
        placeholder="Search by name"
        aria-label="Search hotels by name"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="error">{error}</p>}
      {!error && !loading && hotels.length === 0 && <p className="muted">No hotels found.</p>}

      <ul className={loading ? 'refreshing' : ''}>
        {hotels.map((hotel) => (
          <li key={hotel.id}>
            <button
              className={hotel.id === selectedId ? 'selected' : ''}
              onClick={() => onSelect(hotel)}
            >
              <span className="name">{hotel.name}</span>
              <span className="muted">{hotel.city}</span>
              {hotel.open_alerts > 0 && (
                <span className="badge" title={`${hotel.open_alerts} open alerts`}>
                  {hotel.open_alerts}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
