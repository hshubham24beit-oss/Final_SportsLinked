const http = require('http');
const app = require('./app');
const config = require('./config/env');
const logger = require('./utils/logger');
const { connectDatabase, disconnectDatabase } = require('./config/db');
const { startOpportunityExpiryJob } = require('./jobs/expireOpportunities');
const { startVerificationExpiryJob } = require('./jobs/expireVerifications');
const { startDeadlineReminderJob } = require('./jobs/deadlineReminders');
const { initializeSocket, closeSocket } = require('./sockets');

async function startServer() {
  await connectDatabase(config.mongodbUri);

  if (!config.isTest) {
    startOpportunityExpiryJob();
    startVerificationExpiryJob();
    startDeadlineReminderJob();
  }

  const server = http.createServer(app);
  initializeSocket(server);

  server.listen(config.port, () => {
    logger.info(`SportLinked API listening on http://localhost:${config.port} (${config.env})`);
    logger.info(`CORS origins: ${config.corsOrigins.join(', ')}`);
  });

  return server;
}

async function shutdown(signal, server) {
  logger.info(`${signal} received. Shutting down gracefully...`);
  await closeSocket();
  await new Promise((resolve) => {
    server.close(() => resolve());
  });
  await disconnectDatabase();
  process.exit(0);
}

if (require.main === module) {
  startServer()
    .then((server) => {
      ['SIGTERM', 'SIGINT'].forEach((signal) => {
        process.on(signal, () => {
          shutdown(signal, server).catch((error) => {
            logger.error('Graceful shutdown failed', error);
            process.exit(1);
          });
        });
      });
    })
    .catch((error) => {
      logger.error('Failed to start the API', error);
      process.exit(1);
    });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
    process.exit(1);
  });
}

module.exports = { startServer, app };
