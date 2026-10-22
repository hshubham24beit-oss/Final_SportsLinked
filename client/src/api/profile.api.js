import api from './client';

function imageFormData(file) {
  const data = new FormData();
  data.append('image', file);
  return data;
}

export const profileApi = {
  getMyProfile() {
    return api.get('/profiles/me');
  },
  completeOnboarding(payload) {
    return api.post('/profiles/onboarding', payload);
  },
  updateProfile(payload) {
    return api.patch('/profiles/me', payload);
  },
  getPublicProfile(slug) {
    return api.get(`/profiles/${encodeURIComponent(slug)}`);
  },
  uploadAvatar(file) {
    return api.post('/profiles/me/avatar', imageFormData(file));
  },
  uploadCover(file) {
    return api.post('/profiles/me/cover', imageFormData(file));
  },
  removeAvatar() {
    return api.delete('/profiles/me/avatar');
  },
  removeCover() {
    return api.delete('/profiles/me/cover');
  },
  addGalleryImage(file, caption = '') {
    const data = imageFormData(file);
    if (caption) {
      data.append('caption', caption);
    }
    return api.post('/profiles/me/gallery', data);
  },
  removeGalleryImage(itemId) {
    return api.delete(`/profiles/me/gallery/${itemId}`);
  },
};
