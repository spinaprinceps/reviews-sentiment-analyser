import { useState } from 'react';
import { getBookings, getTravellerNotifications, markRead, signIn } from '../api';
import { useApi } from '../hooks/useApi';
import ReviewForm from './ReviewForm.jsx';

export default function MyTrips({ traveller, onSignIn }) {
  if (!traveller) return <SignIn onSignIn={onSignIn} />;
  // key: a different traveller starts with fresh state.
  return <Trips key={traveller.id} traveller={traveller} onSignOut={() => onSignIn(null)} />;
}

// Demo sign-in: an email and a name, no password.
function SignIn({ onSignIn }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      onSignIn(await signIn(email, name));
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <main className="traveller">
      <h1>My trips</h1>
      <p className="muted">
        Sign in to book hotels, review your stays and get warned if a hotel you booked starts
        getting worse. This is a demo, so there's no password.
      </p>
      <form className="card sign-in" onSubmit={submit}>
        <label>
          <span className="small">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span className="small">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength="100" required />
        </label>
        <button className="primary" disabled={saving}>{saving ? 'Signing in…' : 'Sign in'}</button>
        {error && <p className="error small">{error}</p>}
      </form>
    </main>
  );
}

function Trips({ traveller, onSignOut }) {
  // Bumping version makes both lists load again, e.g. after marking something as read.
  const [version, setVersion] = useState(0);
  const bookings = useApi(() => getBookings(traveller.id), [traveller.id, version]);
  const notifications = useApi(() => getTravellerNotifications(traveller.id), [traveller.id, version]);
  const [reviewing, setReviewing] = useState(null);

  async function read(notificationId) {
    await markRead(notificationId);
    setVersion((v) => v + 1);
  }

  const list = notifications.data?.notifications ?? [];
  const unread = list.filter((n) => !n.read_at).length;

  return (
    <main className="traveller">
      <div className="trips-head">
        <h1>My trips</h1>
        <span className="muted small">
          {traveller.name} ({traveller.email}){' '}
          <button className="link" onClick={onSignOut}>Sign out</button>
        </span>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Notifications</h2>
          <span className="muted small">{unread} unread</span>
        </div>
        {notifications.error && <p className="error">{notifications.error}</p>}
        {list.length === 0 ? (
          <p className="muted small">
            Nothing yet. If guests start complaining about a hotel you've booked, you'll see it here.
          </p>
        ) : (
          <ul className="notices">
            {list.map((n) => (
              <li key={n.id} className={n.read_at ? 'notice' : 'notice unread'}>
                <p>{n.message}</p>
                <span className="muted small">
                  {new Date(n.created_at).toLocaleString()}
                  {!n.read_at && (
                    <>
                      {' · '}
                      <button className="link" onClick={() => read(n.id)}>Mark as read</button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Bookings</h2>
        {bookings.error && <p className="error">{bookings.error}</p>}
        {bookings.data?.bookings.length === 0 && (
          <p className="muted small">No bookings yet. Find a hotel and press "Book this hotel".</p>
        )}
        <ul className="bookings">
          {bookings.data?.bookings.map((b) => (
            <li key={b.id}>
              <div className="booking-row">
                <span>
                  <strong>{b.hotel_name}</strong>
                  <span className="muted small"> · {b.city}</span>
                </span>
                <span className="small">
                  {b.check_in} to {b.check_out}
                </span>
                {b.can_review ? (
                  <button className="link" onClick={() => setReviewing(b.id)}>Write a review</button>
                ) : (
                  <span className="muted small">Review after check-in</span>
                )}
              </div>
              {reviewing === b.id && (
                <ReviewForm hotelId={b.hotel_id} hotelName={b.hotel_name} onClose={() => setReviewing(null)} />
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
