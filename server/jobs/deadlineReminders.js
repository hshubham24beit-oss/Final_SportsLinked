const cron = require('node-cron');
const config = require('../config/env');
const logger = require('../utils/logger');
const SavedOpportunity = require('../models/SavedOpportunity');
const notificationService = require('../services/notification.service');

let running = false;
let task = null;

function formatDeadline(deadline) {
  return new Date(deadline).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
}

async function runDeadlineReminders({ now = new Date() } = {}) {
  if (running) {
    return { skipped: true, reminded: 0 };
  }

  running = true;
  try {
    const windowEnd = new Date(
      now.getTime() + config.deadlineReminderHours * 60 * 60 * 1000,
    );
    const saved = await SavedOpportunity.find({ reminderSentAt: null })
      .populate({
        path: 'opportunity',
        match: {
          status: 'published',
          deadline: { $gt: now, $lte: windowEnd },
        },
        select: 'title deadline',
      })
      .limit(1000);

    let reminded = 0;
    for (const record of saved) {
      if (!record.opportunity) {
        continue;
      }

      await notificationService.createNotification({
        userId: record.user,
        type: 'opportunity_deadline',
        title: 'Saved opportunity deadline approaching',
        message: `${record.opportunity.title} closes on ${formatDeadline(
          record.opportunity.deadline,
        )} (UTC).`,
        link: `/opportunities/${record.opportunity._id.toString()}`,
        metadata: {
          opportunityId: record.opportunity._id.toString(),
          deadline: record.opportunity.deadline,
        },
      });

      record.reminderSentAt = new Date();
      await record.save();
      reminded += 1;
    }

    if (reminded > 0) {
      logger.info(
        `Sent ${reminded} saved opportunity deadline reminder${reminded === 1 ? '' : 's'}.`,
      );
    }
    return { skipped: false, reminded };
  } catch (error) {
    logger.error('Saved opportunity deadline reminder job failed', error);
    return { skipped: false, reminded: 0, failed: true };
  } finally {
    running = false;
  }
}

function startDeadlineReminderJob() {
  if (task) {
    return task;
  }

  task = cron.schedule('0 * * * *', () => {
    runDeadlineReminders();
  });
  return task;
}

module.exports = { runDeadlineReminders, startDeadlineReminderJob };
