const metaService = require('../services/meta.service');
const { ASPECTS } = require('../lib/aspects');
const { TRIP_TAGS, TRAVELLER_TAGS } = require('../lib/clean');

// The choices the client's dropdowns need, so it never hardcodes them.
async function get(req, res) {
  res.json({
    cities: await metaService.listCities(),
    aspects: Object.keys(ASPECTS),
    trip_types: [...new Set(Object.values(TRIP_TAGS))],
    traveller_types: [...new Set(Object.values(TRAVELLER_TAGS))],
  });
}

module.exports = { get };
