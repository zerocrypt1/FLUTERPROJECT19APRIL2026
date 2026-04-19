// src/utils/constants.js

// HTTP Status Codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409, // Used in formController.js
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500, // Used in formController.js and locationController.js
    SERVICE_UNAVAILABLE: 503
};

// User Roles (Referenced but not fully used in controllers)
const USER_ROLES = {
    USER: 'user',
    PREMIUM: 'premium',
    ADMIN: 'admin',
    SUPER_ADMIN: 'superadmin'
};

// Error Messages (Used in formController.js and locationController.js)
const ERROR_MESSAGES = {
    INVALID_CREDENTIALS: 'Invalid credentials provided',
    UNAUTHORIZED: 'You are not authorized to access this resource',
    NOT_FOUND: 'Resource not found', // Used in formController.js
    VALIDATION_ERROR: 'Validation error',
    SERVER_ERROR: 'An unexpected error occurred.', // Used in formController.js and locationController.js
    DUPLICATE_ENTRY: 'Duplicate entry found',
    INVALID_TOKEN: 'Invalid or expired token',
    ACCOUNT_NOT_VERIFIED: 'Please verify your account first',
    RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
    PAYMENT_FAILED: 'Payment processing failed',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions'
};

// Success Messages (Used in formController.js)
const SUCCESS_MESSAGES = {
    SIGNUP_SUCCESS: 'Account created successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    UPDATE_SUCCESS: 'Record updated successfully.', // Used in formController.js
    DELETE_SUCCESS: 'Deleted successfully', // Used in formController.js
    OTP_SENT: 'OTP sent successfully',
    VERIFICATION_SUCCESS: 'Verification successful',
    PASSWORD_CHANGED: 'Password changed successfully',
    PAYMENT_SUCCESS: 'Payment completed successfully'
};

// Form Status (Referenced in formController.js for filtering)
const FORM_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

// Verification Status (Referenced in formController.js for filtering)
const VERIFICATION_STATUS = {
    UNVERIFIED: 'unverified',
    VERIFIED: 'verified',
    FLAGGED: 'flagged'
};

// Identity Proof Types (Referenced in the Mongoose schema)
const IDENTITY_PROOF_TYPES = {
    AADHAR: 'Aadhar',
    PAN: 'PAN',
    PASSPORT: 'Passport',
    DRIVING_LICENSE: 'Driving License',
    VOTER_ID: 'Voter ID'
};

// Gender Options (Referenced in the Mongoose schema)
const GENDER = {
    MALE: 'Male',
    FEMALE: 'Female',
    OTHER: 'Other'
};

// Timing Options (Referenced in the Mongoose schema, though the frontend uses specific time slots)
const TIMING = {
    MORNING: 'Morning',
    AFTERNOON: 'Afternoon',
    EVENING: 'Evening',
    NIGHT: 'Night',
    ANYTIME: 'Anytime'
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

// Other Constants (Included for completeness based on context)
const PAYMENT_STATUS = { PENDING: 'pending', COMPLETED: 'completed', FAILED: 'failed' };
const PAYMENT_METHODS = { STRIPE: 'stripe', UPI: 'upi' };
const CURRENCIES = { INR: 'INR', USD: 'USD' };
const OTP_PURPOSE = { PHONE_VERIFICATION: 'phone-verification' };
const EMAIL_TEMPLATES = { WELCOME: 'welcome' };
const FILE_UPLOAD = { MAX_SIZE_MB: 5 };
const PAGINATION = { DEFAULT_PAGE: 1, DEFAULT_LIMIT: 10 };
const RATE_LIMITS = { GENERAL: { MAX_REQUESTS: 100 } };
const TOKEN_EXPIRY = { ACCESS_TOKEN: '30d' };
const COLLECTIONS = { USERS: 'users' };
const ADMIN_PERMISSIONS = { READ: 'read' };
const NOTIFICATION_TYPES = { EMAIL: 'email' };
const LOG_LEVELS = { ERROR: 'error', INFO: 'info' };


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
    RATE_LIMITS,
    TOKEN_EXPIRY,
    COLLECTIONS,
    ADMIN_PERMISSIONS,
    NOTIFICATION_TYPES,
    LOG_LEVELS
};