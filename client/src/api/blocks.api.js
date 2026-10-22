import api from './client';

export const blocksApi = {
  list() {
    return api.get('/blocks');
  },
  block(userId, reason = '') {
    return api.post('/blocks', { userId, reason });
  },
  unblock(userId) {
    return api.delete(`/blocks/${encodeURIComponent(userId)}`);
  },
};
