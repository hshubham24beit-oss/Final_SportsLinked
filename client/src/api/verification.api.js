import api from './client';

function evidenceFormData(file, label = '') {
  const data = new FormData();
  data.append('evidence', file);
  if (label) {
    data.append('label', label);
  }
  return data;
}

export const verificationApi = {
  getMine() {
    return api.get('/verifications');
  },
  getOne(requestId) {
    return api.get(`/verifications/${encodeURIComponent(requestId)}`);
  },
  uploadEvidence(file, label = '') {
    return api.post('/verifications/evidence', evidenceFormData(file, label));
  },
  submit(payload) {
    return api.post('/verifications', payload);
  },
  resubmit(requestId, payload) {
    return api.post(
      `/verifications/${encodeURIComponent(requestId)}/resubmit`,
      payload,
    );
  },
  evidenceUrl(requestId, evidenceId) {
    return api.get(
      `/verifications/${encodeURIComponent(requestId)}/evidence/${encodeURIComponent(
        evidenceId,
      )}/url`,
    );
  },
  adminList(params = {}) {
    return api.get('/admin/verifications', { params });
  },
  adminGet(requestId) {
    return api.get(`/admin/verifications/${encodeURIComponent(requestId)}`);
  },
  adminEvidenceUrl(requestId, evidenceId) {
    return api.get(
      `/admin/verifications/${encodeURIComponent(requestId)}/evidence/${encodeURIComponent(
        evidenceId,
      )}/url`,
    );
  },
  adminClaim(requestId) {
    return api.post(`/admin/verifications/${encodeURIComponent(requestId)}/claim`);
  },
  adminDecide(requestId, payload) {
    return api.post(
      `/admin/verifications/${encodeURIComponent(requestId)}/decision`,
      payload,
    );
  },
};
