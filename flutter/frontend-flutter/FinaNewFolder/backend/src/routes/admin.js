const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminProtect, superAdminOnly } = require('../middleware/auth');
const validation = require('../middleware/validation');
const { body } = require('express-validator');

// Validation rules
const adminSignupValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email'),
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')
];

const adminLoginValidation = [
  body('password')
    .notEmpty().withMessage('Password is required')
];

const createAdminValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email'),
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters'),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role')
    .optional()
    .isIn(['admin', 'superadmin']).withMessage('Invalid role')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

// Public routes
router.post('/signup', adminSignupValidation, validation.handleValidationErrors, adminController.adminSignup);
router.post('/login', adminLoginValidation, validation.handleValidationErrors, adminController.adminLogin);

// Protected admin routes
router.get('/list', adminProtect, adminController.getAllAdmins);
router.get('/:id', adminProtect, validation.validateMongoId, validation.handleValidationErrors, adminController.getAdmin);

// Super admin only routes
router.post('/create', adminProtect, superAdminOnly, createAdminValidation, validation.handleValidationErrors, adminController.createAdmin);
router.put('/:id', adminProtect, superAdminOnly, validation.validateMongoId, validation.handleValidationErrors, adminController.updateAdmin);
router.delete('/:id', adminProtect, superAdminOnly, validation.validateMongoId, validation.handleValidationErrors, adminController.deleteAdmin);

// Change own password
router.put('/:id/password', adminProtect, validation.validateMongoId, changePasswordValidation, validation.handleValidationErrors, adminController.changePassword);

module.exports = router;