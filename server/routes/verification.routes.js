const express = require('express');
const verificationController = require('../controllers/verification.controller');
const {
  authenticate,
  authorizeRoles,
  requireUnrestrictedAccount,
} = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  verificationSubmitSchema,
  verificationResubmitSchema,
} = require('../validators/verification.validator');
const { singleEvidenceUpload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');
const { ROLES } = require('../config/constants');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/evidence/:token', asyncHandler(verificationController.serveLocalEvidence));

router.use(authenticate);
router.use(authorizeRoles(ROLES.ATHLETE, ROLES.COACH, ROLES.RECRUITER));

router.get('/', asyncHandler(verificationController.listRequests));
router.post(
  '/evidence',
  requireUnrestrictedAccount,
  uploadLimiter,
  singleEvidenceUpload,
  asyncHandler(verificationController.uploadEvidence),
);
router.post(
  '/',
  requireUnrestrictedAccount,
  validate(verificationSubmitSchema),
  asyncHandler(verificationController.submitRequest),
);
router.post(
  '/:id/resubmit',
  requireUnrestrictedAccount,
  validate(verificationResubmitSchema),
  asyncHandler(verificationController.resubmitRequest),
);
router.get('/:id/evidence/:evidenceId/url', asyncHandler(verificationController.getEvidenceUrl));
router.get('/:id', asyncHandler(verificationController.getRequest));

module.exports = router;
