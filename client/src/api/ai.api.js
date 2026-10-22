import api from './client';

export const aiApi = {
  profileSuggestion(payload) {
    return api.post('/ai/profile-suggestion', payload);
  },
  contentDraft(payload) {
    return api.post('/ai/content-draft', payload);
  },
  opportunityMatches(payload) {
    return api.post('/ai/opportunity-matches', payload);
  },
  profileRecommendations() {
    return api.get('/ai/profile-recommendations');
  },
  performanceInsights() {
    return api.get('/ai/performance-insights');
  },
};
