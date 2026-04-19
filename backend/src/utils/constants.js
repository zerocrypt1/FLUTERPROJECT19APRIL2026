// HTTP Status Codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
  };
  
  // User Roles
  const USER_ROLES = {
    USER: 'user',
    PREMIUM: 'premium',
    ADMIN: 'admin',
    SUPER_ADMIN: 'superadmin'
  };
  
  // Payment Status
  const PAYMENT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
  };
  
  // Payment Methods
  const PAYMENT_METHODS = {
    STRIPE: 'stripe',
    RAZORPAY: 'razorpay',
    PAYPAL: 'paypal',
    CARD: 'card',
    UPI: 'upi',
    NET_BANKING: 'netbanking'
  };
  
  // Supported Currencies
  const CURRENCIES = {
    INR: 'INR',
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP'
  };
  
  // Form Status
  const FORM_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
  };
  
  // Verification Status
  const VERIFICATION_STATUS = {
    UNVERIFIED: 'unverified',
    VERIFIED: 'verified',
    FLAGGED: 'flagged'
  };
  
  // Identity Proof Types
  const IDENTITY_PROOF_TYPES = {
    AADHAR: 'Aadhar',
    PAN: 'PAN',
    PASSPORT: 'Passport',
    DRIVING_LICENSE: 'Driving License',
    VOTER_ID: 'Voter ID'
  };
  
  // Gender Options
  const GENDER = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other'
  };
  
  // Timing Options
  const TIMING = {
    MORNING: 'Morning',
    AFTERNOON: 'Afternoon',
    EVENING: 'Evening',
    NIGHT: 'Night',
    ANYTIME: 'Anytime'
  };
  
  // OTP Purposes
  const OTP_PURPOSE = {
    SIGNUP: 'signup',
    LOGIN: 'login',
    PASSWORD_RESET: 'password-reset',
    PHONE_VERIFICATION: 'phone-verification',
    EMAIL_VERIFICATION: 'email-verification'
  };
  
  // Email Templates
  const EMAIL_TEMPLATES = {
    OTP_VERIFICATION: 'otp-verification',
    WELCOME: 'welcome',
    PASSWORD_RESET: 'password-reset',
    ADMIN_NOTIFICATION: 'admin-notification',
    PAYMENT_SUCCESS: 'payment-success',
    PAYMENT_FAILED: 'payment-failed'
  };
  
  // Error Messages
  const ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid credentials provided',
    UNAUTHORIZED: 'You are not authorized to access this resource',
    NOT_FOUND: 'Resource not found',
    VALIDATION_ERROR: 'Validation error',
    SERVER_ERROR: 'Internal server error',
    DUPLICATE_ENTRY: 'Duplicate entry found',
    INVALID_TOKEN: 'Invalid or expired token',
    ACCOUNT_NOT_VERIFIED: 'Please verify your account first',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
    PAYMENT_FAILED: 'Payment processing failed',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions'
  };
  
  // Success Messages
  const SUCCESS_MESSAGES = {
    SIGNUP_SUCCESS: 'Account created successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    UPDATE_SUCCESS: 'Updated successfully',
    DELETE_SUCCESS: 'Deleted successfully',
    OTP_SENT: 'OTP sent successfully',
    VERIFICATION_SUCCESS: 'Verification successful',
    PASSWORD_CHANGED: 'Password changed successfully',
    PAYMENT_SUCCESS: 'Payment completed successfully'
  };
  
  // Regex Patterns
  const REGEX = {
    EMAIL: /^\S+@\S+\.\S+$/,
    PHONE: /^[0-9]{10,15}$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    PIN_CODE: /^[0-9]{6}$/,
    AADHAR: /^[0-9]{12}$/,
    PAN: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
    ALPHA_ONLY: /^[a-zA-Z\s]+$/,
    ALPHANUMERIC: /^[a-zA-Z0-9]+$/
  };
  
  // File Upload Limits
  const FILE_UPLOAD = {
    MAX_SIZE_MB: 5,
    ALLOWED_IMAGE_TYPES: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    ALLOWED_DOCUMENT_TYPES: ['pdf', 'doc', 'docx'],
    MAX_FILES: 5
  };
  
  // Pagination Defaults
  const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_LIMIT: 100
  };
  
  // Cache TTL (Time To Live in seconds)
  const CACHE_TTL = {
    SHORT: 60,        // 1 minute
    MEDIUM: 300,      // 5 minutes
    LONG: 3600,       // 1 hour
    VERY_LONG: 86400  // 24 hours
  };
  
  // Rate Limiting
  const RATE_LIMITS = {
    GENERAL: {
      WINDOW_MS: 15 * 60 * 1000,  // 15 minutes
      MAX_REQUESTS: 100
    },
    AUTH: {
      WINDOW_MS: 15 * 60 * 1000,  // 15 minutes
      MAX_REQUESTS: 5
    },
    PASSWORD_RESET: {
      WINDOW_MS: 60 * 60 * 1000,  // 1 hour
      MAX_REQUESTS: 3
    },
    OTP: {
      WINDOW_MS: 10 * 60 * 1000,  // 10 minutes
      MAX_REQUESTS: 3
    }
  };
  
  // Token Expiry
  const TOKEN_EXPIRY = {
    ACCESS_TOKEN: '30d',
    REFRESH_TOKEN: '90d',
    OTP: 10 * 60 * 1000,  // 10 minutes in milliseconds
    PASSWORD_RESET: 30 * 60 * 1000  // 30 minutes
  };
  
  // Database Collections
  const COLLECTIONS = {
    USERS: 'users',
    ADMINS: 'admins',
    FORM_DATA: 'formdatas',
    PAYMENTS: 'payments',
    SESSIONS: 'sessions'
  };
  
  // Admin Permissions
  const ADMIN_PERMISSIONS = {
    READ: 'read',
    WRITE: 'write',
    DELETE: 'delete',
    MANAGE_USERS: 'manage_users',
    MANAGE_PAYMENTS: 'manage_payments',
    VIEW_ANALYTICS: 'view_analytics'
  };
  
  // Notification Types
  const NOTIFICATION_TYPES = {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
    IN_APP: 'in_app'
  };
  
  // Log Levels
  const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  };
  
  module.exports = {
    HTTP_STATUS,
    USER_ROLES,
    PAYMENT_STATUS,
    PAYMENT_METHODS,
    CURRENCIES,
    FORM_STATUS,
    VERIFICATION_STATUS,
    IDENTITY_PROOF_TYPES,
    GENDER,
    TIMING,
    OTP_PURPOSE,
    EMAIL_TEMPLATES,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    REGEX,
    FILE_UPLOAD,
    PAGINATION,
    CACHE_TTL,
    RATE_LIMITS,
    TOKEN_EXPIRY,
    COLLECTIONS,
    ADMIN_PERMISSIONS,
    NOTIFICATION_TYPES,
    LOG_LEVELS
  };