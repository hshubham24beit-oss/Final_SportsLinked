import api from './client';

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === '' || value === null || value === undefined || value === false) {
        return false;
      }
      return true;
    }),
  );
}

export const discoveryApi = {
  searchAthletes(params) {
    return api.get('/discovery/athletes', { params: cleanParams(params) });
  },
  listSaved(params) {
    return api.get('/discovery/saved', { params: cleanParams(params) });
  },
  saveCandidate(athleteId) {
    return api.post(`/discovery/saved/${encodeURIComponent(athleteId)}`);
  },
  removeSavedCandidate(athleteId) {
    return api.delete(`/discovery/saved/${encodeURIComponent(athleteId)}`);
  },
};
