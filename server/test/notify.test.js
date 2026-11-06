const test = require('node:test');
const assert = require('node:assert');
const { monthLabel, hotelMessage, travellerMessage } = require('../src/lib/notify');

const alert = { aspect: 'cleanliness', month: '2026-11-01', baseline_value: 12, current_value: 35.456 };

test('monthLabel turns a date into a short month and year', () => {
  assert.equal(monthLabel('2026-11-01'), 'Nov 2026');
  assert.equal(monthLabel('2017-01-01'), 'Jan 2017');
});

test('hotelMessage names the aspect, the jump and the month', () => {
  assert.equal(
    hotelMessage(alert, 'Hotel Moonlight'),
    'Cleanliness complaints at Hotel Moonlight jumped to 35.5% of mentions in Nov 2026, up from 12.0% before.'
  );
});

test('travellerMessage mentions the stay dates', () => {
  const message = travellerMessage(alert, 'Hotel Moonlight', {
    check_in: '2026-12-01',
    check_out: '2026-12-04',
  });
  assert.match(message, /^Heads-up about your stay at Hotel Moonlight \(2026-12-01 to 2026-12-04\)/);
  assert.match(message, /cleanliness, 35\.5% of mentions in Nov 2026, up from 12\.0% before\.$/);
});
