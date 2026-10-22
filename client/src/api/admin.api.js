import api from './client';

export const adminApi = {
  overview() {
    return api.get('/admin/overview');
  },
  activity(params = {}) {
    return api.get('/admin/activity', { params });
  },
  listUsers(params = {}) {
    return api.get('/admin/users', { params });
  },
  getUser(userId) {
    return api.get(`/admin/users/${encodeURIComponent(userId)}`);
  },
  updateUserStatus(userId, payload) {
    return api.patch(`/admin/users/${encodeURIComponent(userId)}/status`, payload);
  },
};
