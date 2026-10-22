const express = require('express');
const applicationController = require('../controllers/application.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  applicationListQuerySchema,
  applicationStatusSchema,
} = require('../validators/application.validator');
const { singleDocumentUpload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');
const { ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.use(authenticate);

router.get(
  '/me',
  authorizeRoles(ROLES.ATHLETE),
  validate(applicationListQuerySchema, 'query'),
  asyncHandler(applicationController.listMyApplications),
);
router.post(
  '/documents',
  authorizeRoles(ROLES.ATHLETE),
  uploadLimiter,
  singleDocumentUpload,
  asyncHandler(applicationController.uploadApplicationDocument),
);
router.get('/:id', asyncHandler(applicationController.getApplication));
router.post(
  '/:id/withdraw',
  authorizeRoles(ROLES.ATHLETE),
  asyncHandler(applicationController.withdrawApplication),
);
router.patch(
  '/:id/status',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  validate(applicationStatusSchema),
  asyncHandler(applicationController.updateApplicationStatus),
);
router.post(
  '/:id/shortlist',
  authorizeRoles(ROLES.COACH, ROLES.RECRUITER),
  asyncHandler(applicationController.shortlistApplication),
);

module.exports = router;
