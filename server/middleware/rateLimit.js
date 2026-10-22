const rateLimit = require('express-rate-limit');
const config = require('../config/env');

function rateLimitHandler(req, res, _next, options) {
  res.status(options.statusCode).json({
    success: false,
    data: null,
    message: 'Too many requests. Please wait a moment before trying again.',
  });
}

function createLimiter({ windowMs, limit }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: rateLimitHandler,
  });
}

const globalLimiter = createLimiter({ windowMs: 15 * 60 * 1000, limit: 600 });
const authLimiter = createLimiter({ windowMs: 15 * 60 * 1000, limit: 30 });
const verificationLimiter = createLimiter({ windowMs: 15 * 60 * 1000, limit: 10 });
const passwordLimiter = createLimiter({ windowMs: 15 * 60 * 1000, limit: 8 });
const uploadLimiter = createLimiter({ windowMs: 15 * 60 * 1000, limit: 40 });

module.exports = {
  globalLimiter,
  authLimiter,
  verificationLimiter,
  passwordLimiter,
  uploadLimiter,
};
