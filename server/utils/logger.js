const isProduction = process.env.NODE_ENV === 'production';

function write(level, message, meta) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (meta !== undefined) {
    console[level](`${prefix} ${message}`, meta);
  } else {
    console[level](`${prefix} ${message}`);
  }
}

const logger = {
  info(message, meta) {
    write('info', message, meta);
  },
  warn(message, meta) {
    write('warn', message, meta);
  },
  error(message, meta) {
    if (meta instanceof Error) {
      write('error', message, isProduction ? meta.message : meta.stack || meta);
      return;
    }
    write('error', message, meta);
  },
  debug(message, meta) {
    if (!isProduction) {
      write('debug', message, meta);
    }
  },
};

module.exports = logger;
