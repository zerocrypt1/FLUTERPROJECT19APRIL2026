const rateLimit = require('express-rate-limit');

// General API rate limiter
exports.apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Strict rate limiter for authentication routes
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: false,
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again after 15 minutes.'
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many login attempts. Please try again after 15 minutes.',
      retryAfter: new Date(Date.now() + 15 * 60 * 1000)
    });
  }
});

// Password reset rate limiter
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    status: 'error',
    message: 'Too many password reset attempts, please try again after an hour.'
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many password reset requests. Please try again after an hour.',
      retryAfter: new Date(Date.now() + 60 * 60 * 1000)
    });
  }
});

// OTP request rate limiter
exports.otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Max 3 OTP requests per 10 minutes
  message: {
    status: 'error',
    message: 'Too many OTP requests, please try again later.'
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Too many OTP requests. Please wait 10 minutes before requesting again.',
      retryAfter: new Date(Date.now() + 10 * 60 * 1000)
    });
  }
});

// Payment rate limiter
exports.paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Max 3 payment requests per minute
  message: {
    status: 'error',
    message: 'Too many payment requests, please slow down.'
  },
  handler: (req, res) => {
    res.status(429).json({
      status: 'error',
      message: 'Please wait before making another payment request.',
      retryAfter: new Date(Date.now() + 60 * 1000)
    });
  }
});