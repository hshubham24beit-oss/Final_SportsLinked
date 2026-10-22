const cron = require('node-cron');
const logger = require('../utils/logger');
const { expireVerificationRequests } = require('../services/verification.service');

let running = false;
let task = null;

async function expireVerifications() {
  if (running) {
    return { skipped: true };
  }

  running = true;
  try {
    const result = await expireVerificationRequests();
    if (result.expired > 0) {
      logger.info(`Expired ${result.expired} verification${result.expired === 1 ? '' : 's'}.`);
    }
    return result;
  } catch (error) {
    logger.error('Verification expiry job failed', error);
    return { expired: 0, failed: true };
  } finally {
    running = false;
  }
}

function startVerificationExpiryJob() {
  if (task) {
    return task;
  }

  task = cron.schedule('0 * * * *', () => {
    expireVerifications();
  });
  return task;
}

module.exports = { expireVerifications, startVerificationExpiryJob };
