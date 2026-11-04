import { formatMonth, label, pct } from '../format';

export default function AlertList({ alerts, onShow }) {
  return (
    <section className="card">
      <div className="card-head">
        <h2>Alerts</h2>
        {alerts.length > 0 && <span className="muted">{alerts.length}</span>}
      </div>

      {alerts.length === 0 && (
        <p className="muted">No alerts: nothing got suddenly worse at this hotel.</p>
      )}

      <ul className="alerts">
        {alerts.map((a) => (
          <li key={a.id} className="alert">
            <div className="alert-head">
              <span className="alert-icon" aria-hidden="true">⚠</span>
              <strong>{label(a.aspect)} complaints jumped</strong>
              <span className="muted">{formatMonth(a.month)}</span>
              <span className="status">{a.status}</span>
            </div>

            <p>
              {pct(a.current_value)} of {a.mentions} mentions were negative, up from{' '}
              {pct(a.baseline_value)} in the previous 6 months (+
              {(a.current_value - a.baseline_value).toFixed(1)} pts).
            </p>

            {a.evidence.length > 0 && (
              <ul className="evidence">
                {a.evidence.map((sentence, i) => (
                  <li key={i}>“{sentence}”</li>
                ))}
              </ul>
            )}

            <button className="link" onClick={() => onShow(a.aspect)}>
              Show {a.aspect} on the chart
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
