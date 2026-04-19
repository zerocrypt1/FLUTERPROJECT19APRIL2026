// src/routes/location.js (LOCATION SERVICES ROUTER)
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { protect } = require('../middleware/auth');
const validation = require('../middleware/validation');
const { body, query, param } = require('express-validator');

// ─── Validation Rules ─────────────────────────────────────────────────────────

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

const suggestionsValidation = [
  query('query')
    .trim()
    .notEmpty().withMessage('Search query is required')
    .isLength({ min: 2 }).withMessage('Query must be at least 2 characters'),
  query('sessionToken')
    .optional()
    .isString().withMessage('Session token must be a string')
];

const placeDetailsValidation = [
  param('placeId')
    .trim()
    .notEmpty().withMessage('Place ID is required')
    .isString().withMessage('Place ID must be a string')
];

// ─── Public Routes (No auth — used during registration) ───────────────────────

// GET /location/suggestions?query=delhi&sessionToken=optional-uuid
router.get(
  '/suggestions',
  suggestionsValidation,
  validation.handleValidationErrors,
  locationController.getLocationSuggestions
);

// GET /location/place-details/:placeId
router.get(
  '/place-details/:placeId',
  placeDetailsValidation,
  validation.handleValidationErrors,
  locationController.getPlaceDetails
);

// ─── Protected Routes (Auth required) ─────────────────────────────────────────

router.use(protect);

// POST /location/geocode
router.post(
  '/geocode',
  geocodeValidation,
  validation.handleValidationErrors,
  locationController.geocodeAddress
);

// POST /location/reverse-geocode
router.post(
  '/reverse-geocode',
  reverseGeocodeValidation,
  validation.handleValidationErrors,
  locationController.reverseGeocode
);

// POST /location/elevation
router.post(
  '/elevation',
  elevationValidation,
  validation.handleValidationErrors,
  locationController.getElevation
);

// POST /location/distance
router.post(
  '/distance',
  distanceValidation,
  validation.handleValidationErrors,
  locationController.calculateDistance
);

module.exports = router;