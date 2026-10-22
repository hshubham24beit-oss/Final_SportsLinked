const express = require('express');
const authController = require('../controllers/auth.controller');
const {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  passwordConfirmationSchema,
} = require('../validators/auth.validator');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const {
  authLimiter,
  verificationLimiter,
  passwordLimiter,
} = require('../middleware/rateLimit');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', authLimiter, asyncHandler(authController.refresh));
router.post('/logout', authLimiter, asyncHandler(authController.logout));

router.post(
  '/verify-email',
  verificationLimiter,
  validate(verifyEmailSchema),
  asyncHandler(authController.verifyEmail),
);
router.post(
  '/resend-verification',
  verificationLimiter,
  authenticate,
  asyncHandler(authController.resendVerification),
);
router.post(
  '/forgot-password',
  passwordLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword),
);
router.post(
  '/reset-password',
  passwordLimiter,
  validate(resetPasswordSchema),
  asyncHandler(authController.resetPassword),
);

router.get('/me', authenticate, asyncHandler(authController.getCurrentUser));
router.post(
  '/deactivate',
  authenticate,
  validate(passwordConfirmationSchema),
  asyncHandler(authController.deactivateAccount),
);
router.delete(
  '/account',
  authenticate,
  validate(passwordConfirmationSchema),
  asyncHandler(authController.deleteAccount),
);

module.exports = router;
