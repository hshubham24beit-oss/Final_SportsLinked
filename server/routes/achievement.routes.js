const express = require('express');
const achievementController = require('../controllers/achievement.controller');
const { authenticate, requireUnrestrictedAccount } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  achievementCreateSchema,
  achievementUpdateSchema,
} = require('../validators/achievement.validator');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get('/', asyncHandler(achievementController.listAchievements));
router.post(
  '/',
  requireUnrestrictedAccount,
  validate(achievementCreateSchema),
  asyncHandler(achievementController.createAchievement),
);
router.patch(
  '/:achievementId',
  requireUnrestrictedAccount,
  validate(achievementUpdateSchema),
  asyncHandler(achievementController.updateAchievement),
);
router.delete('/:achievementId', asyncHandler(achievementController.deleteAchievement));

module.exports = router;
