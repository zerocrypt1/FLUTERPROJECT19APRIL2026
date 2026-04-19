/**
 * Request Logger Middleware
 * File: src/middleware/requestLogger.js
 * 
 * Beautiful, structured request/response logging
 */

const logger = require('../utils/logger');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

// HTTP method colors
const methodColors = {
  GET: colors.green,
  POST: colors.cyan,
  PUT: colors.yellow,
  PATCH: colors.yellow,
  DELETE: colors.red,
};

// Status code colors
const getStatusColor = (statusCode) => {
  if (statusCode >= 500) return colors.red;
  if (statusCode >= 400) return colors.yellow;
  if (statusCode >= 300) return colors.cyan;
  if (statusCode >= 200) return colors.green;
  return colors.reset;
};

// Format duration with color
const formatDuration = (duration) => {
  if (duration < 100) return `${colors.green}${duration}ms${colors.reset}`;
  if (duration < 500) return `${colors.yellow}${duration}ms${colors.reset}`;
  return `${colors.red}${duration}ms${colors.reset}`;
};

// Request logger middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request
  const methodColor = methodColors[req.method] || colors.reset;
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  
  console.log(
    `\n${colors.dim}┌─────────────────────────────────────────────────────${colors.reset}`
  );
  console.log(
    `${colors.dim}│${colors.reset} ${colors.bright}${methodColor}${req.method}${colors.reset} ${colors.cyan}${req.originalUrl}${colors.reset}`
  );
  console.log(
    `${colors.dim}│${colors.reset} ${colors.dim}Time: ${timestamp} | IP: ${req.ip}${colors.reset}`
  );
  
  // Log request body for POST/PUT/PATCH (excluding sensitive data)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const sanitizedBody = { ...req.body };
    // Remove sensitive fields
    ['password', 'newPassword', 'currentPassword', 'token', 'tempToken'].forEach(
      field => {
        if (sanitizedBody[field]) {
          sanitizedBody[field] = '***REDACTED***';
        }
      }
    );
    
    if (Object.keys(sanitizedBody).length > 0) {
      console.log(
        `${colors.dim}│${colors.reset} ${colors.dim}Body:${colors.reset} ${JSON.stringify(sanitizedBody, null, 2).replace(/\n/g, `\n${colors.dim}│${colors.reset}       `)}`
      );
    }
  }
  
  // Capture response
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data) {
    logResponse(req, res, startTime, data);
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    logResponse(req, res, startTime, data);
    return originalJson.call(this, data);
  };
  
  next();
};

// Log response
const logResponse = (req, res, startTime, data) => {
  const duration = Date.now() - startTime;
  const statusColor = getStatusColor(res.statusCode);
  const durationFormatted = formatDuration(duration);
  
  console.log(`${colors.dim}├─────────────────────────────────────────────────────${colors.reset}`);
  console.log(
    `${colors.dim}│${colors.reset} ${colors.bright}${statusColor}${res.statusCode}${colors.reset} ${getStatusText(res.statusCode)} ${colors.dim}in${colors.reset} ${durationFormatted}`
  );
  
  // Try to parse and show response data (excluding sensitive info)
  try {
    let responseData = typeof data === 'string' ? JSON.parse(data) : data;
    
    if (responseData && typeof responseData === 'object') {
      // Remove sensitive fields from response
      const sanitizedResponse = { ...responseData };
      ['token', 'password', 'tempToken'].forEach(field => {
        if (sanitizedResponse[field]) {
          sanitizedResponse[field] = '***REDACTED***';
        }
        if (sanitizedResponse.user && sanitizedResponse.user[field]) {
          sanitizedResponse.user[field] = '***REDACTED***';
        }
      });
      
      console.log(
        `${colors.dim}│${colors.reset} ${colors.dim}Response:${colors.reset} ${JSON.stringify(sanitizedResponse, null, 2).substring(0, 300).replace(/\n/g, `\n${colors.dim}│${colors.reset}          `)}...`
      );
    }
  } catch (e) {
    // Ignore JSON parse errors
  }
  
  console.log(
    `${colors.dim}└─────────────────────────────────────────────────────${colors.reset}\n`
  );
  
  // Also log to winston logger
  logger.info('Request completed', {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
};

// Get status text
const getStatusText = (statusCode) => {
  const statusTexts = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  return statusTexts[statusCode] || '';
};

module.exports = requestLogger;