import api from './client';

export const reportsApi = {
  create(payload) {
    return api.post('/reports', payload);
  },
  listMine() {
    return api.get('/reports/mine');
  },
  adminList(params = {}) {
    return api.get('/admin/reports', { params });
  },
  adminUpdate(reportId, payload) {
    return api.patch(`/admin/reports/${encodeURIComponent(reportId)}`, payload);
  },
};
