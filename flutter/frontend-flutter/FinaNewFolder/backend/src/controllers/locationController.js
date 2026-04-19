// src/controllers/locationController.js

// --- Backend Dependencies ---
const googleMapsService = require('../services/googleMapsService'); // Service wrapper for Google Maps API
const logger = require('../utils/logger');
const { 
  HTTP_STATUS, 
  ERROR_MESSAGES 
} = require('../utils/constants'); 
// ----------------------------

// Geocode address (Address to Coordinates)
// @route POST /location/geocode
// @access Private (Admin)
exports.geocodeAddress = async (req, res) => {
  try {
    const { address } = req.body;

    const result = await googleMapsService.geocodeAddress(address);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: result
    });

  } catch (error) {
    logger.error(`Geocode error: ${error.message}`);
    // Use the error message from the service if available
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: error.message || 'Failed to geocode address'
    });
  }
};

// Reverse geocode (Coordinates to Address)
// @route POST /location/reverse-geocode
// @access Private (Admin)
exports.reverseGeocode = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!googleMapsService.isValidCoordinates(latitude, longitude)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Invalid coordinates'
      });
    }

    const result = await googleMapsService.reverseGeocode(latitude, longitude);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: result
    });

  } catch (error) {
    logger.error(`Reverse geocode error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: error.message || 'Failed to reverse geocode'
    });
  }
};

// Get elevation
// @route POST /location/elevation
// @access Private (Admin)
exports.getElevation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!googleMapsService.isValidCoordinates(latitude, longitude)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Invalid coordinates'
      });
    }

    const result = await googleMapsService.getElevation(latitude, longitude);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: result
    });

  } catch (error) {
    logger.error(`Get elevation error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: error.message || 'Failed to get elevation data'
    });
  }
};

// Calculate distance
// @route POST /location/distance
// @access Private (Admin)
exports.calculateDistance = async (req, res) => {
  try {
    const { origin, destination } = req.body;

    const result = await googleMapsService.calculateDistance(origin, destination);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: result
    });

  } catch (error) {
    logger.error(`Calculate distance error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: error.message || 'Failed to calculate distance'
    });
  }
};