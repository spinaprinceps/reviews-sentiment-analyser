import { useState } from 'react';
import HotelPicker from './components/HotelPicker.jsx';
import HotelDashboard from './components/HotelDashboard.jsx';
import TravellerPage from './components/TravellerPage.jsx';

const VIEWS = [
  { id: 'traveller', label: 'Find a hotel' },
  { id: 'hotel', label: 'Hotel insights' },
];

export default function App() {
  const [view, setView] = useState('traveller');
  const [hotel, setHotel] = useState(null);

  return (
    <>
      <nav className="topbar">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            className={view === v.id ? 'selected' : ''}
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </nav>

      {view === 'traveller' ? (
        <TravellerPage
          onOpenHotel={(picked) => {
            setHotel(picked);
            setView('hotel');
          }}
        />
      ) : (
        <div className="layout">
          <HotelPicker selectedId={hotel?.id} onSelect={setHotel} />

          <main>
            {hotel ? (
              // key resets the dashboard's state (e.g. the chosen aspect) when the hotel changes.
              <HotelDashboard key={hotel.id} hotelId={hotel.id} />
            ) : (
              <div className="empty">
                <h1>Hotel insights</h1>
                <p className="muted">
                  Pick a hotel on the left to see what guests complain about, how it changes month
                  by month, and what suddenly got worse.
                </p>
              </div>
            )}
          </main>
        </div>
      )}
    </>
  );
}
