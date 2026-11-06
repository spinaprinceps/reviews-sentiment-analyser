const { Client } = require('pg');
const { hotelMessage, travellerMessage } = require('../lib/notify');

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://app:app@localhost:5432/reviews';

// Alerts nobody has been told about yet. SKIP LOCKED means two notifiers running
// at the same time can't both take the same alert.
async function claimAlerts(client) {
  const result = await client.query(
    `SELECT a.id, a.hotel_id, a.aspect, a.month, a.baseline_value, a.current_value, h.name AS hotel_name
     FROM alerts a
     JOIN hotels h ON h.id = a.hotel_id
     WHERE a.notified_at IS NULL
     ORDER BY a.id
     FOR UPDATE OF a SKIP LOCKED`
  );
  return result.rows;
}

// Travellers whose stay at the hotel hasn't ended yet, with their earliest such booking.
async function upcomingStays(client, hotelId) {
  const result = await client.query(
    `SELECT DISTINCT ON (traveller_id) id, traveller_id, check_in, check_out
     FROM bookings
     WHERE hotel_id = $1 AND check_out >= current_date
     ORDER BY traveller_id, check_in`,
    [hotelId]
  );
  return result.rows;
}

async function addNotification(client, { alert, travellerId = null, bookingId = null, message }) {
  const result = await client.query(
    `INSERT INTO notifications (alert_id, hotel_id, traveller_id, booking_id, message)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (alert_id, traveller_id) DO NOTHING`,
    [alert.id, alert.hotel_id, travellerId, bookingId, message]
  );
  return result.rowCount;
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  // Return dates as plain 'YYYY-MM-DD' text, not JS Date objects.
  client.setTypeParser(1082, (value) => value);

  let forHotels = 0;
  let forTravellers = 0;

  try {
    // Telling the hotel, telling the travellers and marking the alert as announced
    // happen together or not at all.
    await client.query('BEGIN');
    const alerts = await claimAlerts(client);

    for (const alert of alerts) {
      forHotels += await addNotification(client, {
        alert,
        message: hotelMessage(alert, alert.hotel_name),
      });

      for (const stay of await upcomingStays(client, alert.hotel_id)) {
        forTravellers += await addNotification(client, {
          alert,
          travellerId: stay.traveller_id,
          bookingId: stay.id,
          message: travellerMessage(alert, alert.hotel_name, stay),
        });
      }

      await client.query('UPDATE alerts SET notified_at = now() WHERE id = $1', [alert.id]);
    }

    await client.query('COMMIT');
    console.log(`Notified: ${alerts.length} new alerts, ${forHotels} hotel and ${forTravellers} traveller notifications.`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`Notifying failed: ${error.message || error.code}`);
  process.exit(1);
});
