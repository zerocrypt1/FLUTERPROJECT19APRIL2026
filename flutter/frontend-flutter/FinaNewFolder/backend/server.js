/**
 * =========================================================
 * Server Entry Point
 * File: server.js
 * =========================================================
 */

require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 5050;

// ---------------------------------------------------------
// Connect to MongoDB
// ---------------------------------------------------------
connectDB();

// ---------------------------------------------------------
// Start Server
// ---------------------------------------------------------
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  logger.info(`📡 API Version: ${process.env.API_VERSION || 'v1'}`);
});

// ---------------------------------------------------------
// Handle Unhandled Promise Rejections
// ---------------------------------------------------------
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// ---------------------------------------------------------
// Handle Uncaught Exceptions
// ---------------------------------------------------------
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// ---------------------------------------------------------
// Graceful Shutdown
// ---------------------------------------------------------
const shutdown = (signal) => {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
