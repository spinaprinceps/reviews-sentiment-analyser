// Every call to the Insights API in one place.
// Throws an Error with the server's message when a request fails.
async function get(path) {
  const response = await fetch(path);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body;
}

export function listHotels({ city, q }) {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (q) params.set('q', q);
  return get(`/api/hotels?${params}`);
}

export const getAspects = (hotelId) => get(`/api/hotels/${hotelId}/aspects`);

export const getTrend = (hotelId, aspect) =>
  get(`/api/hotels/${hotelId}/trends?aspect=${encodeURIComponent(aspect)}`);

export const getAlerts = (hotelId) => get(`/api/hotels/${hotelId}/alerts`);

export const getMeta = () => get('/api/meta');

export function getRecommendations(city, priorities) {
  const params = new URLSearchParams({ city, priorities: priorities.join(',') });
  return get(`/api/recommendations?${params}`);
}
