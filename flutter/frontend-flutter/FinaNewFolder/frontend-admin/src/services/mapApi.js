// ============================================
// src/services/mapApi.js
// ============================================
import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const mapAPI = {
  // Search locations using Google Geocoding API
  searchLocations: async (query) => {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        throw new Error('Google Maps API key is not configured');
      }

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            address: query,
            sensor: true,
            key: GOOGLE_MAPS_API_KEY
          }
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results;
      } else {
        throw new Error('No locations found');
      }
    } catch (error) {
      console.error('Search locations error:', error);
      throw error;
    }
  },

  // Reverse geocode coordinates to address
  reverseGeocode: async (lat, lng) => {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        throw new Error('Google Maps API key is not configured');
      }

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: {
            latlng: `${lat},${lng}`,
            key: GOOGLE_MAPS_API_KEY
          }
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].formatted_address;
      } else {
        throw new Error('Address not found');
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
      throw error;
    }
  },

  // Get place details
  getPlaceDetails: async (placeId) => {
    try {
      if (!GOOGLE_MAPS_API_KEY) {
        throw new Error('Google Maps API key is not configured');
      }

      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/place/details/json`,
        {
          params: {
            place_id: placeId,
            key: GOOGLE_MAPS_API_KEY
          }
        }
      );

      return response.data.result;
    } catch (error) {
      console.error('Get place details error:', error);
      throw error;
    }
  }
};

export default mapAPI;
