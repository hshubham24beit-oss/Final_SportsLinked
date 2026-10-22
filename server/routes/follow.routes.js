const express = require('express');
const followController = require('../controllers/follow.controller');
const { authenticate, requireUnrestrictedAccount } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get('/followers/:userId', asyncHandler(followController.followers));
router.get('/following/:userId', asyncHandler(followController.following));
router.post(
  '/:userId',
  requireUnrestrictedAccount,
  asyncHandler(followController.follow),
);
router.delete('/:userId', asyncHandler(followController.unfollow));

module.exports = router;
