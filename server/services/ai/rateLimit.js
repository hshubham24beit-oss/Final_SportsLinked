const config = require('../../config/env');
const ApiError = require('../../utils/ApiError');

const buckets = new Map();

function cleanup(now) {
  for (const [userId, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(userId);
    }
  }
}

function consumeAiRequest(userId, now = Date.now()) {
  cleanup(now);

  const key = String(userId);
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = {
      count: 0,
      resetAt: now + config.ai.rateLimitWindowMs,
    };
    buckets.set(key, bucket);
  }

  if (bucket.count >= config.ai.rateLimitMax) {
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const error = ApiError.tooManyRequests(
      'The AI assistant request limit was reached. Please wait before trying again.',
      'AI_RATE_LIMITED',
    );
    error.errors = { retryAfterSeconds };
    throw error;
  }

  bucket.count += 1;

  return {
    remaining: Math.max(0, config.ai.rateLimitMax - bucket.count),
    resetAt: bucket.resetAt,
  };
}

function aiRateLimit(req, res, next) {
  try {
    const status = consumeAiRequest(req.user._id);
    res.setHeader('X-AI-RateLimit-Remaining', String(status.remaining));
    res.setHeader('X-AI-RateLimit-Reset', new Date(status.resetAt).toISOString());
    next();
  } catch (error) {
    if (error.errors?.retryAfterSeconds) {
      res.setHeader('Retry-After', String(error.errors.retryAfterSeconds));
    }
    next(error);
  }
}

function resetAiRateLimits() {
  buckets.clear();
}

module.exports = {
  aiRateLimit,
  consumeAiRequest,
  resetAiRateLimits,
};
