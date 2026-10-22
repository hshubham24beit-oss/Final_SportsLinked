import api from './client';

export const statisticsApi = {
  list() {
    return api.get('/profiles/me/statistics');
  },
  create(payload) {
    return api.post('/profiles/me/statistics', payload);
  },
  update(statisticId, payload) {
    return api.patch(`/profiles/me/statistics/${statisticId}`, payload);
  },
  remove(statisticId) {
    return api.delete(`/profiles/me/statistics/${statisticId}`);
  },
};
