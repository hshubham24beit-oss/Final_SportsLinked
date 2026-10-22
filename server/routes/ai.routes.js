const express = require('express');
const aiController = require('../controllers/ai.controller');
const {
  authenticate,
  authorizeRoles,
} = require('../middleware/auth');
const { aiRateLimit } = require('../services/ai/rateLimit');
const { validate } = require('../middleware/validate');
const {
  profileSuggestionSchema,
  contentDraftSchema,
  opportunityMatchSchema,
} = require('../validators/ai.validator');
const { PUBLIC_ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate, authorizeRoles(...PUBLIC_ROLES), aiRateLimit);

router.post(
  '/profile-suggestion',
  validate(profileSuggestionSchema),
  asyncHandler(aiController.profileSuggestion),
);
router.post(
  '/content-draft',
  validate(contentDraftSchema),
  asyncHandler(aiController.contentDraft),
);
router.post(
  '/opportunity-matches',
  validate(opportunityMatchSchema),
  asyncHandler(aiController.opportunityMatches),
);
router.get(
  '/profile-recommendations',
  asyncHandler(aiController.profileRecommendations),
);
router.get(
  '/performance-insights',
  asyncHandler(aiController.performanceInsights),
);

module.exports = router;
