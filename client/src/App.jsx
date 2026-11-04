import { useState } from 'react';
import HotelPicker from './components/HotelPicker.jsx';
import HotelDashboard from './components/HotelDashboard.jsx';

export default function App() {
  const [hotel, setHotel] = useState(null);

  return (
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
              Pick a hotel on the left to see what guests complain about, how it changes month by
              month, and what suddenly got worse.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
