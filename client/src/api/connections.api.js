import api from './client';

export const connectionsApi = {
  list(params = {}) {
    return api.get('/connections', { params });
  },
  requests(direction = 'incoming', params = {}) {
    return api.get('/connections/requests', {
      params: { ...params, direction },
    });
  },
  suggestions(limit = 10) {
    return api.get('/connections/suggestions', { params: { limit } });
  },
  mutual(userId) {
    return api.get(`/connections/mutual/${encodeURIComponent(userId)}`);
  },
  send(userId, message = '') {
    return api.post('/connections/requests', { userId, message });
  },
  accept(connectionId) {
    return api.post(`/connections/${encodeURIComponent(connectionId)}/accept`);
  },
  reject(connectionId) {
    return api.post(`/connections/${encodeURIComponent(connectionId)}/reject`);
  },
  cancel(connectionId) {
    return api.post(`/connections/${encodeURIComponent(connectionId)}/cancel`);
  },
  remove(connectionId) {
    return api.delete(`/connections/${encodeURIComponent(connectionId)}`);
  },
};
