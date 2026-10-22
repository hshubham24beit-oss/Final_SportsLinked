import api from './client';

export const notificationsApi = {
  list(params = {}) {
    return api.get('/notifications', { params });
  },
  unreadCount() {
    return api.get('/notifications/unread-count');
  },
  markRead(notificationId) {
    return api.patch(`/notifications/${encodeURIComponent(notificationId)}/read`);
  },
  markAllRead() {
    return api.post('/notifications/read-all');
  },
  preferences() {
    return api.get('/notifications/preferences');
  },
  updatePreferences(payload) {
    return api.patch('/notifications/preferences', payload);
  },
};
