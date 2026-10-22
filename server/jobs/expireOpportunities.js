const cron = require('node-cron');
const logger = require('../utils/logger');
const { expireDueOpportunities } = require('../services/opportunity.service');

let running = false;
let task = null;

async function expireOpportunities() {
  if (running) {
    return { skipped: true };
  }

  running = true;
  try {
    const result = await expireDueOpportunities();
    if (result.expired > 0) {
      logger.info(`Expired ${result.expired} opportunit${result.expired === 1 ? 'y' : 'ies'}.`);
    }
    return result;
  } catch (error) {
    logger.error('Opportunity expiry job failed', error);
    return { expired: 0, failed: true };
  } finally {
    running = false;
  }
}

function startOpportunityExpiryJob() {
  if (task) {
    return task;
  }

  task = cron.schedule('*/5 * * * *', () => {
    expireOpportunities();
  });
  return task;
}

module.exports = { expireOpportunities, startOpportunityExpiryJob };
