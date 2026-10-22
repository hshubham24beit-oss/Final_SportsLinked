const ApiError = require('../utils/ApiError');

function validate(schema, source = 'body') {
  return function validateRequest(req, _res, next) {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.length ? issue.path.join('.') : 'form',
        message: issue.message,
      }));

      return next(
        new ApiError(400, 'Please correct the highlighted fields.', 'VALIDATION_ERROR', errors),
      );
    }

    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
