import api from './client';

export const achievementApi = {
  list() {
    return api.get('/achievements');
  },
  create(payload) {
    return api.post('/achievements', payload);
  },
  update(achievementId, payload) {
    return api.patch(`/achievements/${achievementId}`, payload);
  },
  remove(achievementId) {
    return api.delete(`/achievements/${achievementId}`);
  },
};
