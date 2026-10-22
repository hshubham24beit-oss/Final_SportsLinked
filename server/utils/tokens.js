const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('./ApiError');

function generateOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function safeCompareHash(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') {
    return false;
  }
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  if (leftBuffer.length !== rightBuffer.length || leftBuffer.length === 0) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, type: 'access' },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn },
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, type: 'refresh', jti: crypto.randomUUID() },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn },
  );
}

function issueTokenPair(user) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

function verifyAccessToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.accessSecret);
  } catch {
    throw ApiError.unauthorized('Your session is invalid or has expired.', 'ACCESS_TOKEN_INVALID');
  }
  if (payload.type !== 'access' || !payload.sub) {
    throw ApiError.unauthorized('Your session is invalid or has expired.', 'ACCESS_TOKEN_INVALID');
  }
  return payload;
}

function verifyRefreshToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.refreshSecret);
  } catch {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.', 'REFRESH_TOKEN_INVALID');
  }
  if (payload.type !== 'refresh' || !payload.sub) {
    throw ApiError.unauthorized('Your session has expired. Please sign in again.', 'REFRESH_TOKEN_INVALID');
  }
  return payload;
}

module.exports = {
  generateOpaqueToken,
  hashToken,
  safeCompareHash,
  issueTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
};
