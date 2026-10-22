const aiService = require('../services/ai');
const { success } = require('../utils/apiResponse');

async function profileSuggestion(req, res) {
  const result = await aiService.suggestProfile(req.user, req.body);
  return success(res, {
    data: result,
    message: 'Profile suggestion generated for review.',
  });
}

async function contentDraft(req, res) {
  const result = await aiService.draftContent(req.user, req.body);
  return success(res, {
    data: result,
    message: 'Content draft generated for review.',
  });
}

async function opportunityMatches(req, res) {
  const result = await aiService.recommendOpportunities(req.user, req.body);
  return success(res, {
    data: result,
    message: 'Opportunity matches generated from the displayed criteria.',
  });
}

async function profileRecommendations(req, res) {
  const result = await aiService.recommendProfiles(req.user);
  return success(res, {
    data: result,
    message: 'Profile recommendations generated from your visible profile details.',
  });
}

async function performanceInsights(req, res) {
  const result = await aiService.performanceInsights(req.user);
  return success(res, {
    data: result,
    message: 'Performance insights generated from your structured records.',
  });
}

module.exports = {
  profileSuggestion,
  contentDraft,
  opportunityMatches,
  profileRecommendations,
  performanceInsights,
};
