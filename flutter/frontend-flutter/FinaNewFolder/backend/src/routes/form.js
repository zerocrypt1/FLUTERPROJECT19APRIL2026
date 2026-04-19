// src/routes/form.js (FORM MANAGEMENT ROUTER)
const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const { protect } = require('../middleware/auth');
const validation = require('../middleware/validation');
const { body, query } = require('express-validator');

// Validation rules
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
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email'),
  body('pinCode')
    .optional()
    .trim()
    .matches(/^[0-9]{6}$/).withMessage('Invalid pin code'),
  // Ensure coordinates exist if they were provided by the frontend map
  body('coordinates.lat') 
    .optional()
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('coordinates.lng') 
    .optional()
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
];

// FIX: Separate validation for updates to allow partial data (e.g., only updating name)
const updateFormValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Occupation must not exceed 100 characters'),
  body('phoneNumber')
    .optional()
    .trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Invalid phone number'),
  body('age')
    .optional()
    .isInt({ min: 18, max: 100 }).withMessage('Age must be between 18-100'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email'),
  body('pinCode')
    .optional()
    .trim()
    .matches(/^[0-9]{6}$/).withMessage('Invalid pin code'),
];


const checkPhoneValidation = [
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[0-9]{10,15}$/).withMessage('Invalid phone number')
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
    .isIn(['unverified', 'verified', 'flagged']).withMessage('Invalid verification status')
];

// Utility routes (No protection needed)
router.post('/check-phone', checkPhoneValidation, validation.handleValidationErrors, formController.checkPhoneAvailability);

// Public routes (Read-only access, usually restricted to logged-in users in a real app, 
// but kept public here based on your initial structure for the Directory view)
router.get('/', getAllFormsValidation, validation.handleValidationErrors, formController.getAllForms);
router.get('/:id', validation.validateMongoId, validation.handleValidationErrors, formController.getFormById);


// Protected routes (CRUD operations require login/token)
router.post('/', protect, createFormValidation, validation.handleValidationErrors, formController.createForm);
router.put('/:id', protect, validation.validateMongoId, updateFormValidation, validation.handleValidationErrors, formController.updateForm); // FIX: Using updateFormValidation
router.delete('/:id', protect, validation.validateMongoId, validation.handleValidationErrors, formController.deleteForm);

module.exports = router;