const config = require('../config/env');
const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');

function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} was not found.`, 'ROUTE_NOT_FOUND'));
}

function errorHandler(err, req, res, _next) {
  let error = err;

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    error = ApiError.badRequest('The request body contains invalid JSON.', 'INVALID_JSON');
  } else if (error.type === 'entity.too.large') {
    error = new ApiError(413, 'The request body is too large.', 'PAYLOAD_TOO_LARGE');
  } else if (error.code === 11000) {
    const field = error.keyPattern ? Object.keys(error.keyPattern)[0] : 'value';
    error = ApiError.conflict(
      field === 'email'
        ? 'An account with this email already exists. Try signing in instead.'
        : 'That value is already in use.',
      'DUPLICATE_RESOURCE',
    );
  } else if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors || {}).map((issue) => ({
      field: issue.path,
      message: issue.message,
    }));
    error = new ApiError(400, 'Please correct the highlighted fields.', 'VALIDATION_ERROR', errors);
  } else if (error.name === 'CastError') {
    error = ApiError.badRequest('The requested resource identifier is invalid.', 'INVALID_IDENTIFIER');
  }

  const statusCode = error.statusCode || 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    logger.error(`${req.method} ${req.originalUrl} failed`, err);
  } else if (!config.isTest) {
    logger.warn(`${statusCode} ${req.method} ${req.originalUrl} - ${error.message}`);
  }

  let message = error.message || 'Something went wrong.';
  if (isServerError && config.isProduction) {
    message = 'Something went wrong on our end. Please try again later.';
  }

  const body = {
    success: false,
    data: null,
    message,
  };

  if (error.code) {
    body.code = error.code;
  }
  if (error.errors) {
    body.errors = error.errors;
  }

  if (res.headersSent) {
    return;
  }

  res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
