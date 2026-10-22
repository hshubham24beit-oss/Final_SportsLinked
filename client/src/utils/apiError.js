export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error || !error.response) {
    if (error && error.code === 'ERR_NETWORK') {
      return 'We could not reach the SportLinked server. Check your connection and try again.';
    }
    return fallback;
  }

  const data = error.response.data;
  if (data && typeof data.message === 'string' && data.message) {
    return data.message;
  }

  return fallback;
}

export function getErrorCode(error) {
  return error && error.response && error.response.data ? error.response.data.code : undefined;
}

export function getFieldErrors(error) {
  const errors = error && error.response && error.response.data && error.response.data.errors;
  if (!Array.isArray(errors)) {
    return {};
  }

  return errors.reduce((accumulator, item) => {
    if (item && item.field && !accumulator[item.field]) {
      accumulator[item.field] = item.message;
    }
    return accumulator;
  }, {});
}
