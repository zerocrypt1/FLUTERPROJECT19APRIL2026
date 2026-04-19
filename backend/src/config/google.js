// src/config/google.js
const dotenv = require('dotenv');
const { OAuth2Client } = require('google-auth-library');
const { Client } = require('@googlemaps/google-maps-services-js');
const logger = require('../utils/logger'); // Assuming this path is correct

// Load environment variables immediately
dotenv.config();

// --- Configuration Values ---
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// --- 1. Google OAuth Client ---
// Used for ID token verification, login via Google, etc.
const googleOAuthClient = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET
);

// --- 2. Google Maps Client ---
// Used for Geocoding, Distance Matrix, etc.
const googleMapsClient = new Client({
  // The Maps API key must be available here for requests
  apiKey: GOOGLE_MAPS_API_KEY, 
});

// --- Verification and Logging ---

// Verify Google OAuth configuration
if (!GOOGLE_CLIENT_ID) {
  logger.warn('⚠️  Google OAuth Client ID not configured. Google Sign-in will fail.');
} else {
  logger.info('✅ Google OAuth configured');
}

// Verify Google Maps API configuration
if (!GOOGLE_MAPS_API_KEY) {
  logger.warn('⚠️  Google Maps API Key not configured. Maps services will fail.');
} else {
  logger.info('✅ Google Maps API configured');
}

module.exports = {
  googleOAuthClient,
  googleMapsClient
};