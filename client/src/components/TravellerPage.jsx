import { useState } from 'react';
import { getMeta, getRecommendations } from '../api';
import { useApi } from '../hooks/useApi';
import { label, pct } from '../format';

const MAX_PRIORITIES = 3;

export default function TravellerPage({ onOpenHotel }) {
  // Cities and aspect names come from the API, never from a list typed in here.
  const meta = useApi(getMeta, []);
  const [city, setCity] = useState('');
  const [priorities, setPriorities] = useState([]);

  // Only ask for recommendations once there is something to ask about.
  const ready = city !== '' && priorities.length > 0;
  const results = useApi(
    () => (ready ? getRecommendations(city, priorities) : Promise.resolve(null)),
    // An array changes identity on every render, so depend on its text instead.
    [city, priorities.join(',')]
  );

  // Click once to add a priority, again to remove it.
  function togglePriority(aspect) {
    setPriorities((current) =>
      current.includes(aspect) ? current.filter((p) => p !== aspect) : [...current, aspect]
    );
  }

  const full = priorities.length >= MAX_PRIORITIES;

  return (
    <main className="traveller">
      <h1>Find a hotel</h1>
      <p className="muted">
        Pick a city and up to {MAX_PRIORITIES} things you care about. We rank hotels by what recent
        guests said.
      </p>

      {meta.error && <p className="error">{meta.error}</p>}

      <div className="card finder">
        <label className="field">
          <span className="field-label">City</span>
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Choose a city</option>
            {meta.data?.cities.map((c) => (
              <option key={c.city} value={c.city}>
                {c.city}, {c.country} ({c.hotels} hotels)
              </option>
            ))}
          </select>
        </label>

        <fieldset className="field">
          <legend className="field-label">
            What matters most to you?{' '}
            <span className="muted">
              {priorities.length} of {MAX_PRIORITIES} chosen
            </span>
          </legend>
          <div className="chips">
            {meta.data?.aspects.map((aspect) => {
              const on = priorities.includes(aspect);
              return (
                <button
                  key={aspect}
                  type="button"
                  className={on ? 'chip selected' : 'chip'}
                  aria-pressed={on}
                  disabled={!on && full}
                  onClick={() => togglePriority(aspect)}
                >
                  {label(aspect)}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      {!ready && (
        <p className="muted hint">Choose a city and at least one priority to see hotels.</p>
      )}
      {ready && results.error && <p className="error">{results.error}</p>}
      {ready && !results.data && !results.error && <p className="muted hint">Loading…</p>}
      {ready && results.data && (
        <Results data={results.data} loading={results.loading} onOpenHotel={onOpenHotel} />
      )}
    </main>
  );
}

function Results({ data, loading, onOpenHotel }) {
  const { city, hotels } = data;

  if (hotels.length === 0) {
    return (
      <p className="muted hint">
        No hotels in {city} have recent reviews about all of these. Try fewer priorities.
      </p>
    );
  }

  return (
    <section className={loading ? 'refreshing' : ''}>
      <p className="muted small hint">
        Based on reviews from the last 12 months. Hotels with only a few reviews are pulled towards
        the {city} average, so a handful of glowing reviews can't top the list.
      </p>

      <ol className="results">
        {hotels.map((hotel, index) => (
          <li key={hotel.id} className="card result">
            <div className="result-head">
              <span className="rank">{index + 1}</span>
              <div className="result-title">
                <h2>{hotel.name}</h2>
                <p className="muted small">{hotel.address}</p>
              </div>
              <div className="result-score">
                <strong>{hotel.score.toFixed(1)}</strong>
                <span className="muted small">score</span>
              </div>
            </div>

            <ul className="result-aspects">
              {hotel.aspects.map((a) => (
                <li key={a.aspect}>
                  <span className="score-name">{label(a.aspect)}</span>
                  <span className="score-track">
                    <span className="score-bar" style={{ width: `${a.pct_positive}%` }} />
                  </span>
                  <span className="small">
                    {pct(a.pct_positive)} positive · {a.mentions} mentions
                  </span>
                  {a.quotes?.length > 0 && (
                    // Snippets are cut from longer reviews, so show them as excerpts.
                    <ul className="quotes" aria-label={`What guests said about ${a.aspect}`}>
                      {a.quotes.map((quote, i) => (
                        <li key={i}>“…{quote}…”</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>

            <div className="result-foot">
              {hotel.recent_alerts > 0 ? (
                <span className="warning small">
                  ⚠ Getting worse lately: {hotel.recent_alerts} recent{' '}
                  {hotel.recent_alerts === 1 ? 'alert' : 'alerts'} on your priorities
                </span>
              ) : (
                <span />
              )}
              <button className="link" onClick={() => onOpenHotel(hotel)}>
                See full insights →
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
