const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/tokens');
const { USER_STATUS } = require('../config/constants');

function requireActiveAccount(req, _res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }
  if (req.user.status === USER_STATUS.SUSPENDED) {
    return next(
      new ApiError(
        403,
        'This account is suspended. Contact SportLinked support if you believe this is a mistake.',
        'ACCOUNT_SUSPENDED',
      ),
    );
  }
  if (req.user.status === USER_STATUS.DEACTIVATED) {
    return next(
      new ApiError(
        403,
        'This account has been deactivated and can no longer be used.',
        'ACCOUNT_DEACTIVATED',
      ),
    );
  }
  return next();
}

const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Authentication required.', 'AUTH_REQUIRED');
  }

  const token = header.slice(7).trim();
  if (!token) {
    throw ApiError.unauthorized('Authentication required.', 'AUTH_REQUIRED');
  }

  const payload = verifyAccessToken(token);
  const user = await User.findById(payload.sub);

  if (!user) {
    throw ApiError.unauthorized(
      'Your session is no longer valid. Please sign in again.',
      'USER_NOT_FOUND',
    );
  }

  req.user = user;
  req.auth = payload;
  return requireActiveAccount(req, _res, next);
});

const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.slice(7).trim();
  if (!token) {
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (
      user &&
      [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED].includes(user.status)
    ) {
      req.user = user;
      req.auth = payload;
    }
  } catch {
    // Public resources remain accessible when a stale or invalid token is supplied.
  }

  return next();
});

function requireUnrestrictedAccount(req, _res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized());
  }
  if (req.user.status === USER_STATUS.RESTRICTED) {
    return next(
      new ApiError(
        403,
        'This account is restricted from posting or submitting content.',
        'ACCOUNT_RESTRICTED',
      ),
    );
  }
  return next();
}

function authorizeRoles(...roles) {
  return function authorizeRolesMiddleware(req, _res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required.', 'AUTH_REQUIRED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden('You do not have permission to perform this action.', 'ROLE_FORBIDDEN'),
      );
    }
    return next();
  };
}

function requireVerifiedEmail(req, _res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required.', 'AUTH_REQUIRED'));
  }
  if (!req.user.isEmailVerified) {
    return next(
      new ApiError(
        403,
        'Verify your email address before using this feature.',
        'EMAIL_NOT_VERIFIED',
      ),
    );
  }
  return next();
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorizeRoles,
  requireVerifiedEmail,
  requireActiveAccount,
  requireUnrestrictedAccount,
};
