const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function connectDatabase(uri) {
  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  logger.info(`MongoDB connected (${mongoose.connection.name})`);

  mongoose.connection.on('error', (error) => {
    logger.error('MongoDB connection error', error);
  });

  return mongoose.connection;
}

async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  }
}

module.exports = { connectDatabase, disconnectDatabase };
