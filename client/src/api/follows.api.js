import api from './client';

export const followsApi = {
  follow(userId) {
    return api.post(`/follows/${encodeURIComponent(userId)}`);
  },
  unfollow(userId) {
    return api.delete(`/follows/${encodeURIComponent(userId)}`);
  },
  followers(userId, params = {}) {
    return api.get(`/follows/followers/${encodeURIComponent(userId)}`, { params });
  },
  following(userId, params = {}) {
    return api.get(`/follows/following/${encodeURIComponent(userId)}`, { params });
  },
};
