import { label, pct } from '../format';

// Within this many percentage points of the city average counts as "about average".
const SIMILAR = 5;

const ICONS = { worse: '▲', better: '▼', similar: '●' };

function comparison(diff) {
  if (diff > SIMILAR) return { kind: 'worse', text: `${diff.toFixed(1)} pts worse` };
  if (diff < -SIMILAR) return { kind: 'better', text: `${(-diff).toFixed(1)} pts better` };
  return { kind: 'similar', text: 'about average' };
}

export default function AspectScores({ aspects, city, selected, onSelect }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>What guests complain about</h2>
      </div>
      <p className="muted small key">
        % of mentions that are negative ·
        <span className="key-bar" aria-hidden="true" /> this hotel
        <span className="key-tick" aria-hidden="true" /> {city} average
      </p>

      {aspects.length === 0 && <p className="muted">No aspect mentions for this hotel yet.</p>}

      <ul className="scores">
        {aspects.map((a) => {
          const { kind, text } = comparison(a.pct_negative - a.city_pct_negative);
          const mentions = (a.positive + a.negative).toLocaleString('en');
          return (
            <li key={a.aspect}>
              <button
                className={`score-row ${a.aspect === selected ? 'selected' : ''}`}
                onClick={() => onSelect(a.aspect)}
                title={`${label(a.aspect)}: ${pct(a.pct_negative)} negative here, ${pct(a.city_pct_negative)} across ${city}, from ${mentions} mentions`}
              >
                <span className="score-name">{label(a.aspect)}</span>
                <span className="score-track" aria-hidden="true">
                  <span className="score-bar" style={{ width: `${a.pct_negative}%` }} />
                  <span className="score-city" style={{ left: `${a.city_pct_negative}%` }} />
                </span>
                <span className="score-value">{pct(a.pct_negative)}</span>
                <span className="delta">
                  <span className={`delta-icon ${kind}`} aria-hidden="true">{ICONS[kind]}</span>
                  {text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
