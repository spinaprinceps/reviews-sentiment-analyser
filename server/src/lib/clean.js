const crypto = require('node:crypto');

// Verified by profiling all 515,738 rows of Hotel_Reviews.csv.
const CITIES = [
  { city: 'Amsterdam', country: 'Netherlands' },
  { city: 'Barcelona', country: 'Spain' },
  { city: 'London', country: 'United Kingdom' },
  { city: 'Milan', country: 'Italy' },
  { city: 'Paris', country: 'France' },
  { city: 'Vienna', country: 'Austria' },
];

const PLACEHOLDERS = new Set(['No Positive', 'No Negative']);

const TRIP_TAGS = {
  'business trip': 'business',
  'leisure trip': 'leisure',
};

const TRAVELLER_TAGS = {
  couple: 'couple',
  'solo traveler': 'solo',
  group: 'group',
  'family with young children': 'family',
  'family with older children': 'family',
  'travelers with friends': 'friends',
};

// Month/day/year to YYYY-MM-DD, or null if it is not a real calendar date.
function parseDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;

  const [, month, day, year] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function cleanText(value) {
  const text = String(value ?? '').trim();
  return text === '' || PLACEHOLDERS.has(text) ? null : text;
}

// The country must end the address: 222 Paris rows have "Amsterdam" in the street
// name, and London addresses put a postcode between the city and the country.
function parseCity(address) {
  const text = String(address ?? '').trim();
  return (
    CITIES.find(
      ({ city, country }) => text.endsWith(` ${country}`) && text.includes(` ${city} `)
    ) ?? null
  );
}

function parseTags(value) {
  const tags = [...String(value ?? '').matchAll(/'([^']*)'/g)].map((match) =>
    match[1].trim().toLowerCase()
  );

  // Exact lookups, because room tags such as "Family Room" must not count as family.
  const tripTag = tags.find((tag) => tag in TRIP_TAGS);
  const travellerTag = tags.find((tag) => tag in TRAVELLER_TAGS);

  return {
    trip_type: TRIP_TAGS[tripTag] ?? null,
    traveller_type: TRAVELLER_TAGS[travellerTag] ?? null,
  };
}

function parseNumber(value) {
  const text = String(value ?? '').trim();
  if (text === '') return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function contentHash(hotelName, date, positive, negative) {
  // JSON keeps field boundaries, so ("ab", "c") and ("a", "bc") hash differently.
  const key = JSON.stringify([hotelName, date, positive, negative]);
  return crypto.createHash('sha1').update(key).digest('hex');
}

function cleanRow(rawRow) {
  const review_date = parseDate(rawRow.Review_Date);
  if (!review_date) return { error: 'bad_date' };

  const positive_text = cleanText(rawRow.Positive_Review);
  const negative_text = cleanText(rawRow.Negative_Review);
  if (!positive_text && !negative_text) return { error: 'empty_review' };

  const location = parseCity(rawRow.Hotel_Address);
  if (!location) return { error: 'no_city' };

  const name = String(rawRow.Hotel_Name ?? '').trim();

  return {
    hotel: {
      name,
      address: rawRow.Hotel_Address.trim(),
      city: location.city,
      country: location.country,
      lat: parseNumber(rawRow.lat),
      lng: parseNumber(rawRow.lng),
    },
    review: {
      review_date,
      reviewer_score: parseNumber(rawRow.Reviewer_Score),
      positive_text,
      negative_text,
      ...parseTags(rawRow.Tags),
      content_hash: contentHash(name, review_date, positive_text, negative_text),
    },
  };
}

module.exports = {
  CITIES,
  TRIP_TAGS,
  TRAVELLER_TAGS,
  cleanRow,
  cleanText,
  contentHash,
  parseCity,
  parseDate,
  parseNumber,
  parseTags,
};
