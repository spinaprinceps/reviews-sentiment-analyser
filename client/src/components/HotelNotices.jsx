import { useState } from 'react';
import { getHotelNotifications, markRead } from '../api';
import { useApi } from '../hooks/useApi';

// New alerts announced to the hotel's staff. Shows nothing when there are none unread.
export default function HotelNotices({ hotelId }) {
  const [version, setVersion] = useState(0);
  const notices = useApi(() => getHotelNotifications(hotelId), [hotelId, version]);

  const unread = (notices.data?.notifications ?? []).filter((n) => !n.read_at);
  if (unread.length === 0) return null;

  async function read(id) {
    await markRead(id);
    setVersion((v) => v + 1);
  }

  return (
    <section className="card notices-card" aria-live="polite">
      <h2>
        {unread.length} new {unread.length === 1 ? 'alert' : 'alerts'} for your hotel
      </h2>
      <ul className="notices">
        {unread.map((n) => (
          <li key={n.id} className="notice unread">
            <p>{n.message}</p>
            <span className="muted small">
              {new Date(n.created_at).toLocaleString()} ·{' '}
              <button className="link" onClick={() => read(n.id)}>Mark as read</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
