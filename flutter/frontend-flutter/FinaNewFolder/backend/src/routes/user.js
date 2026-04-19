const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, checkOwnership } = require('../middleware/auth');
const validation = require('../middleware/validation');
const { body } = require('express-validator');

// Validation rules
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,15}$/).withMessage('Invalid phone number'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters')
];

const updateLocationValidation = [
  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number and special character')
];

const addFavoriteValidation = [
  body('applicantId')
    .notEmpty().withMessage('Applicant ID is required')
    .isMongoId().withMessage('Invalid applicant ID')
];

// All routes require authentication
router.use(protect);

// User profile routes
router.get('/:id', validation.validateMongoId, validation.handleValidationErrors, checkOwnership, userController.getUserProfile);
router.put('/:id', validation.validateMongoId, updateProfileValidation, validation.handleValidationErrors, checkOwnership, userController.updateUserProfile);
router.put('/:id/location', validation.validateMongoId, updateLocationValidation, validation.handleValidationErrors, checkOwnership, userController.updateUserLocation);
router.put('/:id/password', validation.validateMongoId, changePasswordValidation, validation.handleValidationErrors, checkOwnership, userController.changePassword);

// Favorites routes
router.post('/:userId/favorites', addFavoriteValidation, validation.handleValidationErrors, checkOwnership, userController.addToFavorites);
router.delete('/:userId/favorites/:applicantId', validation.validateMongoId, validation.handleValidationErrors, checkOwnership, userController.removeFromFavorites);
router.get('/:userId/favorites', validation.validateMongoId, validation.handleValidationErrors, checkOwnership, userController.getUserFavorites);

module.exports = router;