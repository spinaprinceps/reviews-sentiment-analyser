import { useState } from 'react';
import HotelPicker from './components/HotelPicker.jsx';
import HotelDashboard from './components/HotelDashboard.jsx';
import TravellerPage from './components/TravellerPage.jsx';
import MyTrips from './components/MyTrips.jsx';

const VIEWS = [
  { id: 'traveller', label: 'Find a hotel' },
  { id: 'trips', label: 'My trips' },
  { id: 'hotel', label: 'Hotel insights' },
];

const STORAGE_KEY = 'traveller';

// The signed-in traveller is remembered in this browser. Storage can be blocked
// (e.g. in a private window), so every access is wrapped: the page still works,
// the traveller just has to sign in again.
function loadTraveller() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

function saveTraveller(traveller) {
  try {
    if (traveller) localStorage.setItem(STORAGE_KEY, JSON.stringify(traveller));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Not remembered; nothing else to do.
  }
}

export default function App() {
  const [view, setView] = useState('traveller');
  const [hotel, setHotel] = useState(null);
  const [traveller, setTravellerState] = useState(loadTraveller);

  function setTraveller(next) {
    setTravellerState(next);
    saveTraveller(next);
  }

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
        {traveller && <span className="topbar-user muted small">Signed in as {traveller.name}</span>}
      </nav>

      {view === 'traveller' && (
        <TravellerPage
          traveller={traveller}
          onSignIn={() => setView('trips')}
          onOpenHotel={(picked) => {
            setHotel(picked);
            setView('hotel');
          }}
        />
      )}

      {view === 'trips' && <MyTrips traveller={traveller} onSignIn={setTraveller} />}

      {view === 'hotel' && (
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
