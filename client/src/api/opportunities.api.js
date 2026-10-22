import api from './client';

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  );
}

export const opportunitiesApi = {
  list(params) {
    return api.get('/opportunities', { params: cleanParams(params) });
  },
  mine(params) {
    return api.get('/opportunities/mine', { params: cleanParams(params) });
  },
  saved(params) {
    return api.get('/opportunities/saved', { params: cleanParams(params) });
  },
  get(opportunityId) {
    return api.get(`/opportunities/${encodeURIComponent(opportunityId)}`);
  },
  create(payload) {
    return api.post('/opportunities', payload);
  },
  update(opportunityId, payload) {
    return api.patch(`/opportunities/${encodeURIComponent(opportunityId)}`, payload);
  },
  publish(opportunityId) {
    return api.post(`/opportunities/${encodeURIComponent(opportunityId)}/publish`);
  },
  close(opportunityId) {
    return api.post(`/opportunities/${encodeURIComponent(opportunityId)}/close`);
  },
  save(opportunityId) {
    return api.post(`/opportunities/${encodeURIComponent(opportunityId)}/save`);
  },
  unsave(opportunityId) {
    return api.delete(`/opportunities/${encodeURIComponent(opportunityId)}/save`);
  },
  apply(opportunityId, payload) {
    return api.post(`/opportunities/${encodeURIComponent(opportunityId)}/apply`, payload);
  },
  applicants(opportunityId, params) {
    return api.get(`/opportunities/${encodeURIComponent(opportunityId)}/applicants`, {
      params: cleanParams(params),
    });
  },
};
