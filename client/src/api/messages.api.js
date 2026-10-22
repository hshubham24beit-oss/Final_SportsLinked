import api from './client';

export const messagesApi = {
  conversations(params = {}) {
    return api.get('/messages', { params });
  },
  start(userId) {
    return api.post('/messages', { userId });
  },
  conversation(conversationId) {
    return api.get(`/messages/${encodeURIComponent(conversationId)}`);
  },
  messages(conversationId, params = {}) {
    return api.get(`/messages/${encodeURIComponent(conversationId)}/messages`, {
      params,
    });
  },
  send(conversationId, text) {
    return api.post(`/messages/${encodeURIComponent(conversationId)}/messages`, {
      text,
    });
  },
  markRead(conversationId) {
    return api.post(`/messages/${encodeURIComponent(conversationId)}/read`);
  },
  report(conversationId, payload) {
    return api.post(`/messages/${encodeURIComponent(conversationId)}/report`, payload);
  },
};
