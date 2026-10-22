const express = require('express');
const adminController = require('../controllers/admin.controller');
const verificationController = require('../controllers/verification.controller');
const reportController = require('../controllers/report.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  verificationListQuerySchema,
  verificationDecisionSchema,
  reportListQuerySchema,
  reportUpdateSchema,
  adminUserListQuerySchema,
  adminUserStatusSchema,
  adminActivityQuerySchema,
} = require('../validators/verification.validator');
const { ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles(ROLES.ADMIN));

router.get('/overview', asyncHandler(adminController.overview));
router.get('/activity', validate(adminActivityQuerySchema, 'query'), asyncHandler(adminController.activity));

router.get(
  '/verifications',
  validate(verificationListQuerySchema, 'query'),
  asyncHandler(verificationController.adminListRequests),
);
router.get(
  '/verifications/:id/evidence/:evidenceId/url',
  asyncHandler(verificationController.getEvidenceUrl),
);
router.get('/verifications/:id', asyncHandler(verificationController.adminGetRequest));
router.post('/verifications/:id/claim', asyncHandler(verificationController.adminClaimRequest));
router.post(
  '/verifications/:id/decision',
  validate(verificationDecisionSchema),
  asyncHandler(verificationController.adminDecideRequest),
);

router.get(
  '/reports',
  validate(reportListQuerySchema, 'query'),
  asyncHandler(reportController.adminListReports),
);
router.patch(
  '/reports/:id',
  validate(reportUpdateSchema),
  asyncHandler(reportController.adminUpdateReport),
);

router.get('/users', validate(adminUserListQuerySchema, 'query'), asyncHandler(adminController.listUsers));
router.get('/users/:id', asyncHandler(adminController.getUser));
router.patch(
  '/users/:id/status',
  validate(adminUserStatusSchema),
  asyncHandler(adminController.updateUserStatus),
);

module.exports = router;
