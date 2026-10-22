const config = require('../config/env');

function parseDurationMs(value, fallbackMs) {
  if (typeof value !== 'string') {
    return fallbackMs;
  }
  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    return fallbackMs;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * multipliers[unit];
}

const refreshCookieMaxAgeMs = parseDurationMs(
  config.jwt.refreshExpiresIn,
  7 * 24 * 60 * 60 * 1000,
);

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    maxAge: refreshCookieMaxAgeMs,
    ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
  };
}

function clearRefreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
  };
}

module.exports = {
  parseDurationMs,
  refreshCookieMaxAgeMs,
  refreshCookieOptions,
  clearRefreshCookieOptions,
};
