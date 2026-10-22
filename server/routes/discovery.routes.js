const express = require('express');
const discoveryController = require('../controllers/discovery.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  discoveryQuerySchema,
  savedListQuerySchema,
} = require('../validators/discovery.validator');
const { ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/athletes',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER, ROLES.ADMIN),
  validate(discoveryQuerySchema, 'query'),
  asyncHandler(discoveryController.searchAthletes),
);

router.get(
  '/saved',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  validate(savedListQuerySchema, 'query'),
  asyncHandler(discoveryController.listSavedAthletes),
);

router.post(
  '/saved/:athleteId',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  asyncHandler(discoveryController.saveCandidate),
);

router.delete(
  '/saved/:athleteId',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  asyncHandler(discoveryController.removeSavedCandidate),
);

module.exports = router;
