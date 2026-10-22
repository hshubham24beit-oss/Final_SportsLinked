const express = require('express');
const profileController = require('../controllers/profile.controller');
const statisticsController = require('../controllers/statistics.controller');
const { authenticate, optionalAuthenticate } = require('../middleware/auth');
const { validateProfileBody } = require('../validators/profile.validator');
const {
  statisticCreateSchema,
  statisticUpdateSchema,
} = require('../validators/statistic.validator');
const { validate } = require('../middleware/validate');
const { singleImageUpload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/me', authenticate, asyncHandler(profileController.getMyProfile));
router.patch(
  '/me',
  authenticate,
  validateProfileBody,
  asyncHandler(profileController.updateProfile),
);
router.post(
  '/onboarding',
  authenticate,
  validateProfileBody,
  asyncHandler(profileController.completeOnboarding),
);
router.post(
  '/',
  authenticate,
  validateProfileBody,
  asyncHandler(profileController.createProfile),
);

router.post(
  '/me/avatar',
  authenticate,
  uploadLimiter,
  singleImageUpload,
  asyncHandler(profileController.uploadAvatar),
);
router.post(
  '/me/cover',
  authenticate,
  uploadLimiter,
  singleImageUpload,
  asyncHandler(profileController.uploadCover),
);
router.delete(
  '/me/avatar',
  authenticate,
  asyncHandler(profileController.clearAvatar),
);
router.delete(
  '/me/cover',
  authenticate,
  asyncHandler(profileController.clearCover),
);
router.post(
  '/me/gallery',
  authenticate,
  uploadLimiter,
  singleImageUpload,
  asyncHandler(profileController.addGalleryImage),
);
router.delete(
  '/me/gallery/:itemId',
  authenticate,
  asyncHandler(profileController.removeGalleryImage),
);

router.get(
  '/me/statistics',
  authenticate,
  asyncHandler(statisticsController.listStatistics),
);
router.post(
  '/me/statistics',
  authenticate,
  validate(statisticCreateSchema),
  asyncHandler(statisticsController.addStatistic),
);
router.patch(
  '/me/statistics/:statisticId',
  authenticate,
  validate(statisticUpdateSchema),
  asyncHandler(statisticsController.updateStatistic),
);
router.delete(
  '/me/statistics/:statisticId',
  authenticate,
  asyncHandler(statisticsController.deleteStatistic),
);

router.get(
  '/:slug',
  optionalAuthenticate,
  asyncHandler(profileController.getPublicProfile),
);

module.exports = router;
