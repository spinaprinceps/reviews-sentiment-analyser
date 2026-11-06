import { useState } from 'react';
import { getMeta, submitReview } from '../api';
import { useApi } from '../hooks/useApi';
import { label } from '../format';

export default function ReviewForm({ hotelId, hotelName, onClose }) {
  // The allowed trip and traveller types come from the API, like every other list.
  const meta = useApi(getMeta, []);
  const [score, setScore] = useState('8');
  const [positive, setPositive] = useState('');
  const [negative, setNegative] = useState('');
  const [tripType, setTripType] = useState('');
  const [travellerType, setTravellerType] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await submitReview(hotelId, {
        reviewer_score: Number(score),
        positive_text: positive,
        negative_text: negative,
        trip_type: tripType || null,
        traveller_type: travellerType || null,
      });
      setSaved(true);
    } catch (e) {
      setError(e.message); // e.g. "Write at least one of ..." or "already submitted today"
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <p className="success small">
        Thanks for reviewing {hotelName}! The background worker reads new reviews every minute, so
        it will count towards the hotel's scores shortly.{' '}
        <button className="link" onClick={onClose}>Close</button>
      </p>
    );
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <label>
        <span className="small">Score (1 to 10)</span>
        <input
          type="number"
          min="1"
          max="10"
          step="0.5"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          required
        />
      </label>
      <label>
        <span className="small">What did you like?</span>
        <textarea rows="2" maxLength="2000" value={positive} onChange={(e) => setPositive(e.target.value)} />
      </label>
      <label>
        <span className="small">What didn't you like?</span>
        <textarea rows="2" maxLength="2000" value={negative} onChange={(e) => setNegative(e.target.value)} />
      </label>
      <div className="form-row">
        <label>
          <span className="small">Trip</span>
          <select value={tripType} onChange={(e) => setTripType(e.target.value)}>
            <option value="">Not saying</option>
            {meta.data?.trip_types.map((t) => (
              <option key={t} value={t}>{label(t)}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="small">Travelling as</span>
          <select value={travellerType} onChange={(e) => setTravellerType(e.target.value)}>
            <option value="">Not saying</option>
            {meta.data?.traveller_types.map((t) => (
              <option key={t} value={t}>{label(t)}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-row">
        <button className="primary" disabled={saving}>{saving ? 'Sending…' : 'Send review'}</button>
        <button type="button" className="link" onClick={onClose}>Cancel</button>
      </div>
      {error && <p className="error small">{error}</p>}
    </form>
  );
}
