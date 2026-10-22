import api from './client';

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== null && value !== undefined,
    ),
  );
}

export const teamsApi = {
  discover(params) {
    return api.get('/teams/discover', { params: cleanParams(params) });
  },
  mine() {
    return api.get('/teams/mine');
  },
  get(teamId) {
    return api.get(`/teams/${encodeURIComponent(teamId)}`);
  },
  create(payload) {
    return api.post('/teams', payload);
  },
  update(teamId, payload) {
    return api.patch(`/teams/${encodeURIComponent(teamId)}`, payload);
  },
  remove(teamId) {
    return api.delete(`/teams/${encodeURIComponent(teamId)}`);
  },
  invite(teamId, payload) {
    return api.post(`/teams/${encodeURIComponent(teamId)}/members`, payload);
  },
  respond(teamId, accept) {
    return api.post(`/teams/${encodeURIComponent(teamId)}/respond`, { accept });
  },
  members(teamId) {
    return api.get(`/teams/${encodeURIComponent(teamId)}/members`);
  },
  removeMember(teamId, userId) {
    return api.delete(
      `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
    );
  },
  updateMemberRole(teamId, userId, role) {
    return api.patch(
      `/teams/${encodeURIComponent(teamId)}/members/${encodeURIComponent(userId)}`,
      { role },
    );
  },
  leave(teamId) {
    return api.delete(`/teams/${encodeURIComponent(teamId)}/membership`);
  },
  updates(teamId) {
    return api.get(`/teams/${encodeURIComponent(teamId)}/updates`);
  },
  postUpdate(teamId, text) {
    return api.post(`/teams/${encodeURIComponent(teamId)}/updates`, { text });
  },
};
