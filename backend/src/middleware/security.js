/**
 * =========================================================
 * Security Middleware
 * File: src/middleware/security.js
 * =========================================================
 */

const logger = require('../utils/logger');
const net = require('net');

/**
 * ---------------------------------------------------------
 * Disable X-Powered-By header (handled better in app.js)
 * ---------------------------------------------------------
 */
exports.removeServerHeader = (req, res, next) => {
  res.removeHeader('X-Powered-By');
  next();
};

/**
 * ---------------------------------------------------------
 * Prevent Clickjacking
 * ---------------------------------------------------------
 */
exports.preventClickjacking = (req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
};

/**
 * ---------------------------------------------------------
 * Prevent MIME Type Sniffing
 * ---------------------------------------------------------
 */
exports.preventMIMESniffing = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

/**
 * ---------------------------------------------------------
 * SSRF Protection – Validate external URLs
 * ---------------------------------------------------------
 */
exports.validateURL = (url) => {
  try {
    const parsedURL = new URL(url);

    // Allow only HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsedURL.protocol)) {
      logger.warn(`Blocked non-http protocol: ${parsedURL.protocol}`);
      return false;
    }

    // Block localhost & metadata endpoints
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '169.254.169.254' // AWS metadata
    ];

    if (blockedHosts.includes(parsedURL.hostname)) {
      logger.warn(`SSRF attempt detected (blocked host): ${url}`);
      return false;
    }

    // Block private IP ranges
    if (net.isIP(parsedURL.hostname)) {
      if (
        parsedURL.hostname.startsWith('10.') ||
        parsedURL.hostname.startsWith('192.168.') ||
        parsedURL.hostname.startsWith('172.')
      ) {
        logger.warn(`SSRF attempt detected (private IP): ${url}`);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error(`URL validation failed: ${error.message}`);
    return false;
  }
};

/**
 * ---------------------------------------------------------
 * Sanitize file paths (directory traversal protection)
 * ---------------------------------------------------------
 */
exports.sanitizePath = (filePath) => {
  if (!filePath) return '';
  return filePath
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '');
};

/**
 * ---------------------------------------------------------
 * Sanitize search query (SQL / NoSQL injection)
 * ---------------------------------------------------------
 */
exports.sanitizeSearchQuery = (query) => {
  if (!query) return '';
  return query
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .slice(0, 100);
};

/**
 * ---------------------------------------------------------
 * CSP Violation Logger
 * ---------------------------------------------------------
 */
exports.logCSPViolation = (req, res, next) => {
  if (req.path === '/csp-violation-report') {
    logger.warn('CSP Violation', JSON.stringify(req.body));
    return res.status(204).end();
  }
  next();
};

/**
 * ---------------------------------------------------------
 * Detect suspicious payload patterns (XSS, injections)
 * ---------------------------------------------------------
 */
exports.detectSuspiciousPatterns = (req, res, next) => {
  const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /eval\(/gi,
    /expression\(/gi
  ];

  const scanObject = (obj) => {
    for (const key in obj) {
      const value = obj[key];

      if (typeof value === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            logger.warn(
              `Suspicious payload detected | key=${key} | value=${value}`
            );
            return true;
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        if (scanObject(value)) return true;
      }
    }
    return false;
  };

  if (req.body && scanObject(req.body)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid or malicious request payload detected'
    });
  }

  next();
};

/**
 * ---------------------------------------------------------
 * Apply common security headers
 * ---------------------------------------------------------
 */
exports.applySecurityHeaders = (req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), camera=(), microphone=()'
  );
  next();
};
