const ApiError = require('./ApiError');

function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    if (
      !parsed ||
      !Number.isFinite(parsed.score) ||
      !parsed.createdAt ||
      !parsed.id ||
      Number.isNaN(new Date(parsed.createdAt).getTime())
    ) {
      throw new Error('Invalid cursor payload');
    }
    return parsed;
  } catch {
    throw ApiError.badRequest('The feed cursor is invalid.', 'INVALID_CURSOR');
  }
}

module.exports = { encodeCursor, decodeCursor };
