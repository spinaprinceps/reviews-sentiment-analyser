// The wording of notifications, kept apart from the database code so it can be tested alone.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// '2026-11-01' -> 'Nov 2026'
function monthLabel(isoDate) {
  const [year, month] = isoDate.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

// 35.456 -> '35.5%'
const pct = (value) => `${Number(value).toFixed(1)}%`;

// 'cleanliness' -> 'Cleanliness'
const capitalise = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// For the hotel's own staff.
function hotelMessage(alert, hotelName) {
  return (
    `${capitalise(alert.aspect)} complaints at ${hotelName} jumped to ${pct(alert.current_value)} ` +
    `of mentions in ${monthLabel(alert.month)}, up from ${pct(alert.baseline_value)} before.`
  );
}

// For a traveller who has an upcoming stay at that hotel.
function travellerMessage(alert, hotelName, booking) {
  return (
    `Heads-up about your stay at ${hotelName} (${booking.check_in} to ${booking.check_out}): ` +
    `guests are complaining more about ${alert.aspect}, ${pct(alert.current_value)} of mentions ` +
    `in ${monthLabel(alert.month)}, up from ${pct(alert.baseline_value)} before.`
  );
}

module.exports = { monthLabel, hotelMessage, travellerMessage };
