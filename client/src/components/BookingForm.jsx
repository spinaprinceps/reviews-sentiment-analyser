import { useState } from 'react';
import { book } from '../api';

// Today plus some days, as 'YYYY-MM-DD' in the browser's own time zone.
function inDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const two = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

export default function BookingForm({ traveller, hotel, onClose }) {
  const [checkIn, setCheckIn] = useState(inDays(14));
  const [checkOut, setCheckOut] = useState(inDays(17));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [booked, setBooked] = useState(null);

  async function submit(event) {
    event.preventDefault(); // stop the browser reloading the page, as forms do by default
    setSaving(true);
    setError(null);
    try {
      setBooked(await book(traveller.id, { hotel_id: hotel.id, check_in: checkIn, check_out: checkOut }));
    } catch (e) {
      setError(e.message); // the server's own message, e.g. about the dates
    } finally {
      setSaving(false);
    }
  }

  if (booked) {
    return (
      <p className="success small">
        Booked {booked.hotel_name}, {booked.check_in} to {booked.check_out}. You'll find it under
        My trips. <button className="link" onClick={onClose}>Close</button>
      </p>
    );
  }

  return (
    <form className="inline-form" onSubmit={submit}>
      <label>
        <span className="small">Check-in</span>
        <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />
      </label>
      <label>
        <span className="small">Check-out</span>
        <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />
      </label>
      <button className="primary" disabled={saving}>{saving ? 'Booking…' : 'Confirm booking'}</button>
      <button type="button" className="link" onClick={onClose}>Cancel</button>
      {error && <p className="error small form-error">{error}</p>}
    </form>
  );
}
