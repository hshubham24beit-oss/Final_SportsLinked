const authService = require('../services/auth.service');
const config = require('../config/env');
const { success } = require('../utils/apiResponse');
const { refreshCookieOptions, clearRefreshCookieOptions } = require('../utils/cookies');

async function register(req, res) {
  const { user, emailSent } = await authService.registerUser(req.body);

  const message = emailSent
    ? 'Account created. Check your inbox to verify your email address.'
    : 'Account created, but we could not send the verification email. You can request a new link after signing in.';

  return success(res, {
    statusCode: 201,
    message,
    data: { user, emailSent },
  });
}

async function login(req, res) {
  const { user, accessToken, refreshToken } = await authService.loginUser(req.body);
  res.cookie(config.cookie.name, refreshToken, refreshCookieOptions());

  return success(res, {
    message: 'Signed in successfully.',
    data: { user, accessToken },
  });
}

async function refresh(req, res) {
  const rawRefreshToken = req.cookies[config.cookie.name];

  try {
    const { user, accessToken, refreshToken } = await authService.rotateSession(rawRefreshToken);
    res.cookie(config.cookie.name, refreshToken, refreshCookieOptions());

    return success(res, {
      message: 'Session refreshed.',
      data: { user, accessToken },
    });
  } catch (error) {
    res.clearCookie(config.cookie.name, clearRefreshCookieOptions());
    throw error;
  }
}

async function logout(req, res) {
  await authService.logoutUser(req.cookies[config.cookie.name]);
  res.clearCookie(config.cookie.name, clearRefreshCookieOptions());

  return success(res, {
    message: 'Signed out successfully.',
    data: null,
  });
}

async function verifyEmail(req, res) {
  const user = await authService.verifyEmail(req.body.token);

  return success(res, {
    message: 'Email verified. Your account now has verified email status.',
    data: { user },
  });
}

async function resendVerification(req, res) {
  await authService.resendVerification(req.user.id);

  return success(res, {
    message: 'A new verification link has been sent to your email address.',
    data: null,
  });
}

async function forgotPassword(req, res) {
  await authService.forgotPassword(req.body.email);

  return success(res, {
    message: 'If an account exists for that email, a password reset link has been sent.',
    data: null,
  });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.body.token, req.body.password);

  return success(res, {
    message: 'Your password has been reset. Sign in with your new password.',
    data: null,
  });
}

async function getCurrentUser(req, res) {
  return success(res, {
    message: 'Current user retrieved.',
    data: { user: req.user },
  });
}

async function deactivateAccount(req, res) {
  await authService.deactivateAccount(req.user.id, req.body.password);
  res.clearCookie(config.cookie.name, clearRefreshCookieOptions());

  return success(res, {
    message: 'Your account has been deactivated. You have been signed out.',
    data: null,
  });
}

async function deleteAccount(req, res) {
  await authService.deleteAccount(req.user.id, req.body.password);
  res.clearCookie(config.cookie.name, clearRefreshCookieOptions());

  return success(res, {
    message: 'Your account and personal data have been deleted.',
    data: null,
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  deactivateAccount,
  deleteAccount,
};
