// src/routes/form.js (FORM MANAGEMENT ROUTER)
const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const { protect } = require('../middleware/auth');
const validation = require('../middleware/validation');
const { body, query } = require('express-validator');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const createFormValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('occupation')
    .trim()
    .notEmpty().withMessage('Occupation is required')
    .isLength({ max: 100 }).withMessage('Occupation must not exceed 100 characters'),
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10,15}$/).withMessage('Invalid phone number'),
  body('age')
    .notEmpty().withMessage('Age is required')
    .isInt({ min: 18, max: 100 }).withMessage('Age must be between 18-100'),
  body('gender')
    .notEmpty().withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('timming')
    .optional()
    .isArray().withMessage('Timming must be an array'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email'),
  body('pinCode')
    .optional()
    .trim()
    .matches(/^[0-9]{6}$/).withMessage('Invalid pin code'),
  // New location object validation
  body('location.coordinates.coordinates')
    .optional()
    .isArray({ min: 2, max: 2 }).withMessage('Coordinates must be [longitude, latitude]'),
  body('location.coordinates.coordinates.*')
    .optional()
    .isFloat().withMessage('Coordinate values must be numbers'),
  // Legacy flat coordinates support
  body('coordinates.lat')
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('coordinates.lng')
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

const updateFormValidation = [
  body('name')
    .optional().trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('occupation')
    .optional().trim()
    .isLength({ max: 100 }).withMessage('Occupation must not exceed 100 characters'),
  body('phoneNumber')
    .optional().trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Invalid phone number'),
  body('age')
    .optional()
    .isInt({ min: 18, max: 100 }).withMessage('Age must be between 18-100'),
  body('gender')
    .optional()
    .isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('email')
    .optional().trim()
    .isEmail().withMessage('Invalid email'),
  body('pinCode')
    .optional().trim()
    .matches(/^[0-9]{6}$/).withMessage('Invalid pin code'),
];

const checkPhoneValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10,15}$/).withMessage('Invalid phone number'),
];

// Firebase OTP verify validation
const firebaseOtpValidation = [
  body('idToken')
    .trim()
    .notEmpty().withMessage('Firebase ID token is required'),
  body('phoneNumber')
    .optional()
    .trim(),
];

// Fallback OTP request validation
const requestOtpValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required'),
];

// Fallback OTP verify validation
const verifyOtpValidation = [
  body('tempToken')
    .trim()
    .notEmpty().withMessage('Temp token is required'),
  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .isLength({ min: 4, max: 8 }).withMessage('Invalid OTP length'),
];

const getAllFormsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected']).withMessage('Invalid status'),
  query('verificationStatus')
    .optional()
    .isIn(['unverified', 'verified', 'flagged']).withMessage('Invalid verification status'),
];

// ─── OTP Routes (Public — no auth needed) ────────────────────────────────────

// PRIMARY: Firebase phone OTP — frontend verifies OTP, sends idToken here
// POST /forms/otp/verify-firebase  { idToken, phoneNumber? }
router.post(
  '/otp/verify-firebase',
  firebaseOtpValidation,
  validation.handleValidationErrors,
  formController.verifyFirebaseOtp
);

// FALLBACK: Cache-based OTP — request
// POST /forms/otp/request  { phoneNumber }
router.post(
  '/otp/request',
  requestOtpValidation,
  validation.handleValidationErrors,
  formController.requestOtp
);

// FALLBACK: Cache-based OTP — verify
// POST /forms/otp/verify  { tempToken, otp, phoneNumber? }
router.post(
  '/otp/verify',
  verifyOtpValidation,
  validation.handleValidationErrors,
  formController.verifyOtp
);

// ─── Utility Routes (Public) ──────────────────────────────────────────────────

// POST /forms/check-phone  { phoneNumber }
router.post(
  '/check-phone',
  checkPhoneValidation,
  validation.handleValidationErrors,
  formController.checkPhoneAvailability
);

// ─── Public Read Routes ───────────────────────────────────────────────────────

// GET /forms?page=1&limit=10&city=delhi&search=...
router.get(
  '/',
  getAllFormsValidation,
  validation.handleValidationErrors,
  formController.getAllForms
);

// GET /forms/:id
router.get(
  '/:id',
  validation.validateMongoId,
  validation.handleValidationErrors,
  formController.getFormById
);

// ─── Protected Routes (Auth required) ────────────────────────────────────────

// POST /forms
router.post(
  '/',
  createFormValidation,
  validation.handleValidationErrors,
  formController.createForm
);

// PUT /forms/:id
router.put(
  '/:id',
  protect,
  validation.validateMongoId,
  updateFormValidation,
  validation.handleValidationErrors,
  formController.updateForm
);

// DELETE /forms/:id
router.delete(
  '/:id',
  protect,
  validation.validateMongoId,
  validation.handleValidationErrors,
  formController.deleteForm
);

module.exports = router;