// Small checks for values that arrive in URLs, query strings and request bodies.

// A value as trimmed text, or null if it's missing or not a single text value.
const text = (value) => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

// A value as a positive whole number, or null if it isn't one.
const id = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

// 'YYYY-MM-DD' if it is a real calendar date (so not 2026-02-30), otherwise null.
function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

module.exports = { text, id, isoDate };
