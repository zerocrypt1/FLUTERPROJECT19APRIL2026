// src/routes/location.js (LOCATION SERVICES ROUTER)
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect } = require('../middleware/auth');
const validation = require('../middleware/validation');
const { body } = require('express-validator');

// Validation rules (No change needed, they are structurally sound)
const geocodeValidation = [
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isLength({ min: 5 }).withMessage('Address must be at least 5 characters')
];

const reverseGeocodeValidation = [
  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
];

const elevationValidation = [
  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude')
];

const distanceValidation = [
  body('origin')
    .trim()
    .notEmpty().withMessage('Origin is required'),
  body('destination')
    .trim()
    .notEmpty().withMessage('Destination is required')
];

// All location routes require authentication
router.use(protect);

// Location service routes
router.post('/geocode', geocodeValidation, validation.handleValidationErrors, locationController.geocodeAddress);
router.post('/reverse-geocode', reverseGeocodeValidation, validation.handleValidationErrors, locationController.reverseGeocode);
router.post('/elevation', elevationValidation, validation.handleValidationErrors, locationController.getElevation);
router.post('/distance', distanceValidation, validation.handleValidationErrors, locationController.calculateDistance);

module.exports = router;