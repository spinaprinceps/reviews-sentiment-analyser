// Every call to the API in one place.
// Throws an Error with the server's message when a request fails.
async function request(path, options) {
  const response = await fetch(path, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body;
}

const get = (path) => request(path);

// Sends data as JSON, e.g. a new review or booking.
const send = (path, data) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data ?? {}),
  });

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

export const submitReview = (hotelId, review) => send(`/api/hotels/${hotelId}/reviews`, review);

export const getHotelNotifications = (hotelId) => get(`/api/hotels/${hotelId}/notifications`);

export const signIn = (email, name) => send('/api/travellers', { email, name });

export const getBookings = (travellerId) => get(`/api/travellers/${travellerId}/bookings`);

export const book = (travellerId, booking) => send(`/api/travellers/${travellerId}/bookings`, booking);

export const getTravellerNotifications = (travellerId) =>
  get(`/api/travellers/${travellerId}/notifications`);

export const markRead = (notificationId) => send(`/api/notifications/${notificationId}/read`);
