// src/services/mapApi.js
import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
const BASE_URL = process.env.REACT_APP_API_BASE_URL; // tera backend URL

const mapAPI = {

  // 🔍 Autocomplete suggestions - backend se (recommended, key safe rehti hai)
  getLocationSuggestions: async (query, sessionToken = null) => {
    try {
      const params = { query };
      if (sessionToken) params.sessionToken = sessionToken;

      const response = await axios.get(`${BASE_URL}/location/suggestions`, { params });
      return response.data.data; // Array of { placeId, description, mainText, secondaryText }
    } catch (error) {
      console.error('Location suggestions error:', error);
      throw error;
    }
  },

  // 📍 Place details from placeId - backend se
  getPlaceDetails: async (placeId) => {
    try {
      const response = await axios.get(`${BASE_URL}/location/place-details/${placeId}`);
      return response.data.data;
      // Returns: { placeId, formattedAddress, latitude, longitude, city, state, country, pinCode }
    } catch (error) {
      console.error('Place details error:', error);
      throw error;
    }
  },

  // Reverse geocode - backend se
  reverseGeocode: async (lat, lng) => {
    try {
      const response = await axios.post(`${BASE_URL}/location/reverse-geocode`, {
        latitude: lat,
        longitude: lng
      });
      return response.data.data;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      throw error;
    }
  },

  // Direct Google API calls (agar kabhi frontend se directly karna pade)
  _direct: {
    searchLocations: async (query) => {
      if (!GOOGLE_MAPS_API_KEY) throw new Error('Google Maps API key not configured');
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: { address: query, sensor: true, key: GOOGLE_MAPS_API_KEY }
      });
      if (response.data.results?.length > 0) return response.data.results;
      throw new Error('No locations found');
    },

    getPlaceDetails: async (placeId) => {
      if (!GOOGLE_MAPS_API_KEY) throw new Error('Google Maps API key not configured');
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
        params: { place_id: placeId, key: GOOGLE_MAPS_API_KEY }
      });
      return response.data.result;
    }
  }
};

export default mapAPI;