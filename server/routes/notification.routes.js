const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  notificationListQuerySchema,
  notificationPreferenceSchema,
} = require('../validators/notification.validator');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  validate(notificationListQuerySchema, 'query'),
  asyncHandler(notificationController.listNotifications),
);
router.get('/unread-count', asyncHandler(notificationController.unreadCount));
router.get('/preferences', asyncHandler(notificationController.getPreferences));
router.patch(
  '/preferences',
  validate(notificationPreferenceSchema),
  asyncHandler(notificationController.updatePreferences),
);
router.post('/read-all', asyncHandler(notificationController.markAllRead));
router.patch('/:id/read', asyncHandler(notificationController.markRead));

module.exports = router;
