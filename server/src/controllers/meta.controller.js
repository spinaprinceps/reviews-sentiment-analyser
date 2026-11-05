const metaService = require('../services/meta.service');
const { ASPECTS } = require('../lib/aspects');

// The choices a client can offer: cities from the database, aspects from the extractor's rule book.
async function get(req, res) {
  res.json({
    cities: await metaService.listCities(),
    aspects: Object.keys(ASPECTS),
  });
}

module.exports = { get };
