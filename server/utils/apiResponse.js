function success(res, { statusCode = 200, data = null, message = 'OK', meta } = {}) {
  const body = { success: true, data, message };
  if (meta) {
    body.meta = meta;
  }
  return res.status(statusCode).json(body);
}

function paginated(res, { data, page, limit, total, message = 'OK' }) {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return success(res, {
    data,
    message,
    meta: { page, limit, total, totalPages },
  });
}

module.exports = { success, paginated };
