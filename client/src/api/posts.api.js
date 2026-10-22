import api from './client';

function imageFormData(file) {
  const data = new FormData();
  data.append('image', file);
  return data;
}

export const postsApi = {
  feed(cursor = '', limit = 10) {
    return api.get('/feed', {
      params: { limit, ...(cursor ? { cursor } : {}) },
    });
  },
  get(postId) {
    return api.get(`/posts/${encodeURIComponent(postId)}`);
  },
  create(payload) {
    return api.post('/posts', payload);
  },
  update(postId, payload) {
    return api.patch(`/posts/${encodeURIComponent(postId)}`, payload);
  },
  remove(postId) {
    return api.delete(`/posts/${encodeURIComponent(postId)}`);
  },
  uploadMedia(file) {
    return api.post('/posts/media', imageFormData(file));
  },
  like(postId) {
    return api.post(`/posts/${encodeURIComponent(postId)}/like`);
  },
  unlike(postId) {
    return api.delete(`/posts/${encodeURIComponent(postId)}/like`);
  },
  comments(postId, params = {}) {
    return api.get(`/posts/${encodeURIComponent(postId)}/comments`, { params });
  },
  addComment(postId, text) {
    return api.post(`/posts/${encodeURIComponent(postId)}/comments`, { text });
  },
  deleteComment(postId, commentId) {
    return api.delete(
      `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
    );
  },
  share(postId, text = '') {
    return api.post(`/posts/${encodeURIComponent(postId)}/share`, { text });
  },
};
