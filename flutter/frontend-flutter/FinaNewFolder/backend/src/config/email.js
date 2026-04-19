/**
 * =========================================================
 * Email Configuration (Nodemailer)
 * File: src/config/email.js
 * =========================================================
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ---------------------------------------------------------
// Create reusable transporter
// ---------------------------------------------------------
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // true only for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS   // ✅ MUST be Google App Password
  }
});

// ---------------------------------------------------------
// Verify transporter on startup
// ---------------------------------------------------------
transporter.verify((error) => {
  if (error) {
    logger.error(`Email transporter verification failed: ${error.message}`);
  } else {
    logger.info('✅ Email transporter is ready');
  }
});

module.exports = transporter;
