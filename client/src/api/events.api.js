import api from './client';

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  );
}

export const eventsApi = {
  list(params) {
    return api.get('/events', { params: cleanParams(params) });
  },
  mine(params) {
    return api.get('/events/mine', { params: cleanParams(params) });
  },
  get(eventId) {
    return api.get(`/events/${encodeURIComponent(eventId)}`);
  },
  create(payload) {
    return api.post('/events', payload);
  },
  update(eventId, payload) {
    return api.patch(`/events/${encodeURIComponent(eventId)}`, payload);
  },
  publish(eventId) {
    return api.post(`/events/${encodeURIComponent(eventId)}/publish`);
  },
  cancel(eventId, reason) {
    return api.post(`/events/${encodeURIComponent(eventId)}/cancel`, { reason });
  },
  remove(eventId) {
    return api.delete(`/events/${encodeURIComponent(eventId)}`);
  },
  register(eventId) {
    return api.post(`/events/${encodeURIComponent(eventId)}/register`);
  },
  expressInterest(eventId) {
    return api.post(`/events/${encodeURIComponent(eventId)}/interest`);
  },
  cancelRegistration(eventId) {
    return api.delete(`/events/${encodeURIComponent(eventId)}/registration`);
  },
  registrants(eventId, params) {
    return api.get(`/events/${encodeURIComponent(eventId)}/registrants`, {
      params: cleanParams(params),
    });
  },
};
