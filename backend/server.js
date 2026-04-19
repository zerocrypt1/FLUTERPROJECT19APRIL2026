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
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = process.env.API_VERSION || 'v1';
const BASE = `/api/${API_VERSION}`;

// ─── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ─── Start Server ──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${NODE_ENV} mode on port ${PORT}`);
  logger.info(`📡 API Version: ${API_VERSION}`);
  logger.info('');
  logger.info('─── Auth ────────────────────────────────────────────');
  logger.info(`🔐  Register          : POST   ${BASE}/auth/register`);
  logger.info(`🔐  Login             : POST   ${BASE}/auth/login`);
  logger.info('');
  logger.info('─── OTP (Firebase + Fallback) ───────────────────────');
  logger.info(`📱  Firebase Verify   : POST   ${BASE}/forms/otp/verify-firebase`);
  logger.info(`📱  Request OTP       : POST   ${BASE}/forms/otp/request`);
  logger.info(`📱  Verify OTP        : POST   ${BASE}/forms/otp/verify`);
  logger.info('');
  logger.info('─── Forms ───────────────────────────────────────────');
  logger.info(`📋  Check Phone       : POST   ${BASE}/forms/check-phone`);
  logger.info(`📋  Get All Forms     : GET    ${BASE}/forms`);
  logger.info(`📋  Get Form by ID    : GET    ${BASE}/forms/:id`);
  logger.info(`📋  Create Form       : POST   ${BASE}/forms`);
  logger.info(`📋  Update Form       : PUT    ${BASE}/forms/:id`);
  logger.info(`📋  Delete Form       : DELETE ${BASE}/forms/:id`);
  logger.info('');
  logger.info('─── Location ────────────────────────────────────────');
  logger.info(`🗺️   Suggestions      : GET    ${BASE}/location/suggestions?query=...`);
  logger.info(`🗺️   Place Details    : GET    ${BASE}/location/place-details/:placeId`);
  logger.info(`🗺️   Geocode          : POST   ${BASE}/location/geocode`);
  logger.info(`🗺️   Reverse Geocode  : POST   ${BASE}/location/reverse-geocode`);
  logger.info(`🗺️   Elevation        : POST   ${BASE}/location/elevation`);
  logger.info(`🗺️   Distance         : POST   ${BASE}/location/distance`);
  logger.info('');
  logger.info('─── Health ──────────────────────────────────────────');
  logger.info(`❤️   Health Check     : GET    /health`);
  logger.info('─────────────────────────────────────────────────────');
});

// ─── Unhandled Promise Rejections ─────────────────────────────────────────────
process.on('unhandledRejection', (err) => {
  logger.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

// ─── Uncaught Exceptions ───────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  logger.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

// ─── Graceful Shutdown ─────────────────────────────────────────────────────────
const shutdown = (signal) => {
  logger.info(`⚠️  ${signal} received, shutting down gracefully`);
  server.close(() => {
    logger.info('✅ Process terminated');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));