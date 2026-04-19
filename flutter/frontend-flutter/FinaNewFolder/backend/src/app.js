/**
 * =========================================================
 * Express App Configuration
 * File: src/app.js
 * Final Code - Working Condition
 * =========================================================
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');

// Custom Middleware and Utilities
const rateLimiter = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const securityMiddleware = require('./middleware/security');
const requestLogger = require('./middleware/requestLogger'); // Custom enhanced logger for dev
const logger = require('./utils/logger'); // Centralized logger utility

// Routes (Ensure all these files export 'module.exports = router;')
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const userRoutes = require('./routes/user');
const formRoutes = require('./routes/form');
const paymentRoutes = require('./routes/payment');
const locationRoutes = require('./routes/location');

const app = express();

/* =========================================================
   1. CORS Configuration (MUST BE FIRST)
   ========================================================= */

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., Postman, server-to-server, mobile)
      if (!origin) return callback(null, true); 
      
      // Allow specified origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Default to allowing the request if origin is not explicitly blocked (safer for development)
      return callback(null, true); 
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    exposedHeaders: ['Authorization', 'x-auth-token'],
  })
);

// Preflight request handler for all routes
app.options('*', cors()); 

/* =========================================================
   2. Core Settings
   ========================================================= */

app.set('trust proxy', 1); // Required if running behind a proxy (like Nginx, Heroku, etc.)
app.disable('x-powered-by'); // Security best practice

/* =========================================================
   3. Security Headers
   ========================================================= */

app.use(helmet({ 
    // Disabling Content Security Policy here, assuming you manage it elsewhere or don't need it yet.
    contentSecurityPolicy: false 
})); 

/* =========================================================
   4. Body Parsers (Raw data access)
   ========================================================= */

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   5. Data Sanitization (Protection against DB/XSS attacks)
   ========================================================= */

app.use(mongoSanitize()); // Prevent MongoDB operator injection
app.use(xss());           // Prevent Cross-Site Scripting (XSS)
app.use(hpp());           // Prevent HTTP Parameter Pollution

/* =========================================================
   6. Custom Security & Logging Middleware
   ========================================================= */

app.use(securityMiddleware.preventClickjacking);
app.use(securityMiddleware.preventMIMESniffing);
app.use(securityMiddleware.applySecurityHeaders);
app.use(securityMiddleware.detectSuspiciousPatterns);

// Enhanced Request Logging
if (process.env.NODE_ENV === 'development') {
  app.use(requestLogger); // Use custom enhanced development logger
} else {
  // Production logging with Morgan streaming to your centralized logger
  app.use(
    morgan('combined', {
      stream: {
        write: (msg) => logger.info(msg.trim()),
      },
      skip: (req, res) => res.statusCode < 400 // Skip successful requests in production Morgan log
    })
  );
}

/* =========================================================
   7. Health Check (Non-API, non-rate limited)
   ========================================================= */

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/* =========================================================
   8. Rate Limiting (Applied to all API routes)
   ========================================================= */

app.use('/api', rateLimiter.apiLimiter);

/* =========================================================
   9. API Routes (The core of the application)
   ========================================================= */

const API_VERSION = process.env.API_VERSION || 'v1';

logger.info(`🔗 API Version: ${API_VERSION}`);
logger.info(`📡 Registering routes under /api/${API_VERSION}`);

// Mount all route handlers
app.use(`/api/${API_VERSION}/auth`, authRoutes);       // Line 152: The previously error-prone line
app.use(`/api/${API_VERSION}/admin`, adminRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/forms`, formRoutes);
app.use(`/api/${API_VERSION}/payments`, paymentRoutes);
app.use(`/api/${API_VERSION}/location`, locationRoutes);



app.use('/api/auth', (req, res) => {
  const newPath = `/api/v1/auth${req.originalUrl.replace('/api/auth', '')}`;
  logger.warn(`🔁 Redirecting legacy route ${req.originalUrl} → ${newPath}`);
  return res.redirect(307, newPath);
});

/* =========================================================
   10. 404 Handler (Catch-all for unhandled requests)
   ========================================================= */

app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    availableVersions: ['v1'],
    // This hint is crucial for debugging client-side path errors!
    hint: `Did you mean /api/${API_VERSION}${req.originalUrl.startsWith('/api') ? req.originalUrl.substring(4) : req.originalUrl}?`
  });
});

/* =========================================================
   11. Global Error Handler (The last line of defense)
   ========================================================= */

app.use(errorHandler);

module.exports = app;