const express = require('express');
const opportunityController = require('../controllers/opportunity.controller');
const applicationController = require('../controllers/application.controller');
const { authenticate, authorizeRoles, requireUnrestrictedAccount } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  opportunityCreateSchema,
  opportunityUpdateSchema,
  opportunityListQuerySchema,
  opportunityMineQuerySchema,
  opportunitySavedQuerySchema,
  applicantListQuerySchema,
} = require('../validators/opportunity.validator');
const { applicationCreateSchema } = require('../validators/application.validator');
const { ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/',
  validate(opportunityListQuerySchema, 'query'),
  asyncHandler(opportunityController.listOpportunities),
);
router.post(
  '/',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  requireUnrestrictedAccount,
  validate(opportunityCreateSchema),
  asyncHandler(opportunityController.createOpportunity),
);
router.get(
  '/mine',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  validate(opportunityMineQuerySchema, 'query'),
  asyncHandler(opportunityController.listMyOpportunities),
);
router.get(
  '/saved',
  validate(opportunitySavedQuerySchema, 'query'),
  asyncHandler(opportunityController.listSavedOpportunities),
);

router.get('/:id', asyncHandler(opportunityController.getOpportunity));
router.patch(
  '/:id',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  requireUnrestrictedAccount,
  validate(opportunityUpdateSchema),
  asyncHandler(opportunityController.updateOpportunity),
);
router.post(
  '/:id/publish',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  requireUnrestrictedAccount,
  asyncHandler(opportunityController.publishOpportunity),
);
router.post(
  '/:id/close',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  asyncHandler(opportunityController.closeOpportunity),
);
router.post(
  '/:id/save',
  asyncHandler(opportunityController.saveOpportunity),
);
router.delete(
  '/:id/save',
  asyncHandler(opportunityController.unsaveOpportunity),
);
router.post(
  '/:id/apply',
  authorizeRoles(ROLES.ATHLETE),
  requireUnrestrictedAccount,
  validate(applicationCreateSchema),
  asyncHandler(applicationController.applyToOpportunity),
);
router.get(
  '/:id/applicants',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  validate(applicantListQuerySchema, 'query'),
  asyncHandler(applicationController.listApplicants),
);

module.exports = router;
