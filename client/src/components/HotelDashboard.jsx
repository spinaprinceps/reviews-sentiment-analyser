import { useMemo, useRef, useState } from 'react';
import { getAlerts, getAspects } from '../api';
import { useApi } from '../hooks/useApi';
import AspectScores from './AspectScores.jsx';
import TrendChart from './TrendChart.jsx';
import AlertList from './AlertList.jsx';

export default function HotelDashboard({ hotelId }) {
  const aspects = useApi(() => getAspects(hotelId), [hotelId]);
  const alerts = useApi(() => getAlerts(hotelId), [hotelId]);
  const [chosenAspect, setChosenAspect] = useState(null);
  const chartRef = useRef(null);

  const aspectList = aspects.data?.aspects;
  const alertList = alerts.data?.alerts;
  const hotel = aspects.data?.hotel ?? alerts.data?.hotel;

  // Until the user picks one, chart the newest alert's aspect, or else the most criticised one.
  const aspect = chosenAspect ?? alertList?.[0]?.aspect ?? aspectList?.[0]?.aspect ?? null;

  const alertMonths = useMemo(
    () => new Set((alertList ?? []).filter((a) => a.aspect === aspect).map((a) => a.month)),
    [alertList, aspect]
  );

  function showOnChart(name) {
    setChosenAspect(name);
    chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const error = aspects.error ?? alerts.error;
  if (error) return <p className="error">{error}</p>;
  if (!hotel || !aspectList || !alertList) return <p className="muted">Loading…</p>;

  return (
    <div className="dashboard">
      <header>
        <h1>{hotel.name}</h1>
        <p className="muted">{hotel.address}</p>
      </header>

      <div className="dashboard-grid">
        <AspectScores
          aspects={aspectList}
          city={hotel.city}
          selected={aspect}
          onSelect={setChosenAspect}
        />
        <div ref={chartRef}>
          {aspect && <TrendChart hotelId={hotelId} aspect={aspect} alertMonths={alertMonths} />}
        </div>
      </div>

      <AlertList alerts={alertList} onShow={showOnChart} />
    </div>
  );
}
