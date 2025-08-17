const http = require('http');
const mongoose = require('mongoose');
const app = require('./app');
const initializeSocket = require('./socket');
const config = require('./config');
const { logger } = require('./config/logger');
const initializeFirebase = require('./config/firebase');

const server = http.createServer(app);
initializeFirebase(config);
// Socket.IO'yu başlat
initializeSocket(server);

mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
  logger.info('Connected to MongoDB');
  server.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`);
  });
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});