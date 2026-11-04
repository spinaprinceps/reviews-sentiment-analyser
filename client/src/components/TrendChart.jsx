import { useMemo, useRef, useState } from 'react';
import { getTrend } from '../api';
import { useApi } from '../hooks/useApi';
import { formatMonth, label, pct } from '../format';

// The chart is drawn in a 720 x 260 coordinate space and scaled to fit its box.
const WIDTH = 720;
const HEIGHT = 260;
const PAD = { top: 16, right: 56, bottom: 28, left: 44 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;
const Y_TICKS = [0, 25, 50, 75, 100];

// '2016-03-01' -> a running month number, so a month with no data still takes up its space.
function monthNumber(isoDate) {
  const [year, month] = isoDate.split('-').map(Number);
  return year * 12 + (month - 1);
}

const yFor = (percent) => PAD.top + (1 - percent / 100) * PLOT_H;

export default function TrendChart({ hotelId, aspect, alertMonths }) {
  const { data, error, loading } = useApi(() => getTrend(hotelId, aspect), [hotelId, aspect]);
  const [active, setActive] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const svgRef = useRef(null);

  const months = data?.months;
  const points = useMemo(() => {
    if (!months?.length) return [];
    const first = monthNumber(months[0].month);
    const span = Math.max(monthNumber(months[months.length - 1].month) - first, 1);
    return months.map((m) => ({
      ...m,
      x: PAD.left + ((monthNumber(m.month) - first) / span) * PLOT_W,
      y: yFor(m.pct_negative),
      alert: alertMonths.has(m.month),
    }));
  }, [months, alertMonths]);

  const activePoint = active !== null ? points[active] ?? null : null;
  const last = points[points.length - 1];
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const shownLabel = data?.aspect ?? aspect;

  // The crosshair snaps to the month nearest the pointer, so nobody has to hit a 2px line.
  function handlePointerMove(event) {
    const box = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * WIDTH;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(points[nearest].x - x)) nearest = i;
    });
    setActive(nearest);
  }

  // Left and right arrow keys move between months, for keyboard users.
  function handleKeyDown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.key === 'ArrowLeft' ? -1 : 1;
    setActive((i) => {
      const start = i === null ? (step === 1 ? -1 : points.length) : i;
      return Math.min(points.length - 1, Math.max(0, start + step));
    });
  }

  return (
    <section className={`card ${loading && data ? 'refreshing' : ''}`}>
      <div className="card-head">
        <h2>{label(shownLabel)}: % negative by month</h2>
        {points.length > 0 && (
          <button className="link" onClick={() => setShowTable((s) => !s)}>
            {showTable ? 'Show chart' : 'Show table'}
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {!data && loading && <p className="muted">Loading…</p>}
      {data && points.length === 0 && <p className="muted">No mentions of this aspect yet.</p>}

      {points.length > 0 && !showTable && (
        <>
          <div className="chart-wrap">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label={`${label(shownLabel)} complaints by month. Use the arrow keys to read each month.`}
              tabIndex={0}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setActive(null)}
              onKeyDown={handleKeyDown}
              onBlur={() => setActive(null)}
            >
              {Y_TICKS.map((tick) => (
                <g key={tick}>
                  <line
                    className={tick === 0 ? 'axis' : 'grid'}
                    x1={PAD.left}
                    x2={WIDTH - PAD.right}
                    y1={yFor(tick)}
                    y2={yFor(tick)}
                  />
                  <text className="tick" x={PAD.left - 8} y={yFor(tick) + 4} textAnchor="end">
                    {tick}%
                  </text>
                </g>
              ))}

              {points
                .filter((p) => p.month.slice(5, 7) === '01' || p.month.slice(5, 7) === '07')
                .map((p) => (
                  <text key={p.month} className="tick" x={p.x} y={HEIGHT - 8} textAnchor="middle">
                    {formatMonth(p.month)}
                  </text>
                ))}

              <path className="line" d={path} />

              {points
                .filter((p) => p.alert)
                .map((p) => (
                  <circle key={p.month} className="alert-dot" cx={p.x} cy={p.y} r={5} />
                ))}

              <circle className="end-dot" cx={last.x} cy={last.y} r={4} />
              <text className="end-label" x={last.x + 8} y={last.y + 4}>
                {pct(last.pct_negative)}
              </text>

              {activePoint && (
                <g>
                  <line
                    className="crosshair"
                    x1={activePoint.x}
                    x2={activePoint.x}
                    y1={PAD.top}
                    y2={PAD.top + PLOT_H}
                  />
                  <circle className="active-dot" cx={activePoint.x} cy={activePoint.y} r={5} />
                </g>
              )}
            </svg>

            {activePoint && (
              <div
                className={`tooltip ${activePoint.x > WIDTH * 0.7 ? 'left' : ''}`}
                style={{ left: `${(activePoint.x / WIDTH) * 100}%` }}
              >
                <strong>{pct(activePoint.pct_negative)} negative</strong>
                <span className="muted">
                  {formatMonth(activePoint.month)} · {activePoint.negative} of{' '}
                  {activePoint.positive + activePoint.negative} mentions
                </span>
                {activePoint.alert && <span className="tooltip-alert">⚠ Alert this month</span>}
              </div>
            )}
          </div>

          {points.some((p) => p.alert) && (
            <p className="muted small key">
              <span className="key-dot" aria-hidden="true" /> Month with an alert
            </p>
          )}
        </>
      )}

      {points.length > 0 && showTable && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Positive</th>
                <th>Negative</th>
                <th>% negative</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.month}>
                  <td>{formatMonth(p.month)}</td>
                  <td>{p.positive}</td>
                  <td>{p.negative}</td>
                  <td>{pct(p.pct_negative)}</td>
                  <td>{p.alert ? '⚠ Alert' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
