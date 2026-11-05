const recommendationsService = require('../services/recommendations.service');
const { ASPECTS } = require('../lib/aspects');

const ASPECT_NAMES = Object.keys(ASPECTS);
const MAX_PRIORITIES = 3;

async function recommend(req, res) {
  const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  if (!city) {
    return res.status(400).json({ error: 'city is required, e.g. ?city=Paris' });
  }

  // 'Cleanliness, noise,noise' -> ['cleanliness', 'noise']
  const raw = typeof req.query.priorities === 'string' ? req.query.priorities : '';
  const priorities = [...new Set(raw.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean))];

  if (priorities.length === 0 || priorities.length > MAX_PRIORITIES) {
    return res.status(400).json({
      error: `Choose 1 to ${MAX_PRIORITIES} priorities, e.g. ?priorities=cleanliness,noise`,
    });
  }

  const unknown = priorities.filter((p) => !ASPECT_NAMES.includes(p));
  if (unknown.length > 0) {
    return res.status(400).json({
      error: `Unknown priority: ${unknown.join(', ')}. Choose from: ${ASPECT_NAMES.join(', ')}`,
    });
  }

  const hotels = await recommendationsService.recommendHotels(city, priorities);
  res.json({ city, priorities, hotels });
}

module.exports = { recommend };
