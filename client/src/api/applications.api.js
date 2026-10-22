import api from './client';

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  );
}

export const applicationsApi = {
  mine(params) {
    return api.get('/applications/me', { params: cleanParams(params) });
  },
  get(applicationId) {
    return api.get(`/applications/${encodeURIComponent(applicationId)}`);
  },
  withdraw(applicationId) {
    return api.post(`/applications/${encodeURIComponent(applicationId)}/withdraw`);
  },
  updateStatus(applicationId, payload) {
    return api.patch(`/applications/${encodeURIComponent(applicationId)}/status`, payload);
  },
  shortlist(applicationId) {
    return api.post(`/applications/${encodeURIComponent(applicationId)}/shortlist`);
  },
  uploadDocument(file, onUploadProgress) {
    const formData = new FormData();
    formData.append('document', file);
    return api.post('/applications/documents', formData, { onUploadProgress });
  },
};
