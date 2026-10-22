const express = require('express');
const eventController = require('../controllers/event.controller');
const {
  authenticate,
  authorizeRoles,
  requireUnrestrictedAccount,
} = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  eventCreateSchema,
  eventUpdateSchema,
  eventListQuerySchema,
  eventMineQuerySchema,
  eventRegistrantsQuerySchema,
  eventCancelSchema,
} = require('../validators/event.validator');
const { PUBLIC_ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  validate(eventListQuerySchema, 'query'),
  asyncHandler(eventController.listEvents),
);
router.get(
  '/mine',
  authorizeRoles(...PUBLIC_ROLES),
  validate(eventMineQuerySchema, 'query'),
  asyncHandler(eventController.listMyEvents),
);
router.post(
  '/',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  validate(eventCreateSchema),
  asyncHandler(eventController.createEvent),
);

router.get('/:id', asyncHandler(eventController.getEvent));
router.patch(
  '/:id',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  validate(eventUpdateSchema),
  asyncHandler(eventController.updateEvent),
);
router.delete(
  '/:id',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  asyncHandler(eventController.deleteEvent),
);
router.post(
  '/:id/publish',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  asyncHandler(eventController.publishEvent),
);
router.post(
  '/:id/cancel',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  validate(eventCancelSchema),
  asyncHandler(eventController.cancelEvent),
);
router.post(
  '/:id/register',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  asyncHandler(eventController.registerForEvent),
);
router.post(
  '/:id/interest',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  asyncHandler(eventController.expressInterest),
);
router.delete(
  '/:id/registration',
  authorizeRoles(...PUBLIC_ROLES),
  requireUnrestrictedAccount,
  asyncHandler(eventController.cancelRegistration),
);
router.get(
  '/:id/registrants',
  authorizeRoles(...PUBLIC_ROLES),
  validate(eventRegistrantsQuerySchema, 'query'),
  asyncHandler(eventController.listRegistrants),
);

module.exports = router;
