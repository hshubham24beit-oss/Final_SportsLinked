const { MongoMemoryServer } = require('mongodb-memory-server');
const logger = require('../utils/logger');

async function main() {
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  logger.info('Starting an in-memory MongoDB for local development...');
  const mongod = await MongoMemoryServer.create({ instance: { dbName: 'sportlinked' } });
  process.env.MONGODB_URI = mongod.getUri('sportlinked');
  logger.info(`In-memory MongoDB ready at ${process.env.MONGODB_URI}`);
  logger.warn('In-memory data is deleted when this process stops. Use a real MongoDB for persistence.');

  const { startServer } = require('../server');
  const { disconnectDatabase } = require('../config/db');

  const server = await startServer();

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received. Stopping development services...`);

    await new Promise((resolve) => server.close(() => resolve()));
    await disconnectDatabase();
    await mongod.stop();
    process.exit(0);
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => {
    process.on(signal, () => {
      shutdown(signal).catch((error) => {
        logger.error('Failed to stop development services', error);
        process.exit(1);
      });
    });
  });
}

main().catch((error) => {
  logger.error('Could not start the in-memory development database', error);
  process.exit(1);
});
