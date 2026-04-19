// src/services/googleMapsService.js
const { googleMapsClient } = require('../config/google');
const logger = require('../utils/logger');

class GoogleMapsService {
  
  // 🔍 Location Autocomplete Suggestions (for search during registration)
  async getLocationSuggestions(query, sessionToken = null) {
    try {
      const params = {
        input: query,
        key: process.env.GOOGLE_MAPS_API_KEY,
        language: 'en',
        // India bias kar sakte ho agar mostly Indian users hain
        // components: 'country:in',
      };

      if (sessionToken) {
        params.sessiontoken = sessionToken;
      }

      const response = await googleMapsClient.placeAutocomplete({ params })
        .catch(err => {
          throw new Error(`Google Maps Client Error: ${err.message}`);
        });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new Error(`Places API error: ${response.data.status}`);
      }

      // Return clean suggestion list
      return (response.data.predictions || []).map(prediction => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting?.main_text || '',
        secondaryText: prediction.structured_formatting?.secondary_text || '',
        types: prediction.types || []
      }));

    } catch (error) {
      logger.error(`Location suggestions failed for "${query}": ${error.message}`);
      throw new Error(error.message || 'Failed to get location suggestions');
    }
  }

  // 📍 Get full place details from placeId (geocode + address components)
  async getPlaceDetails(placeId) {
    try {
      const response = await googleMapsClient.placeDetails({
        params: {
          place_id: placeId,
          key: process.env.GOOGLE_MAPS_API_KEY,
          fields: [
            'geometry',
            'formatted_address',
            'address_components',
            'name',
            'place_id'
          ]
        }
      }).catch(err => {
        throw new Error(`Google Maps Client Error: ${err.message}`);
      });

      if (response.data.status !== 'OK') {
        throw new Error(`Place Details API error: ${response.data.status}`);
      }

      const place = response.data.result;
      const addressComponents = place.address_components || [];

      const getComponent = (type) => {
        const component = addressComponents.find(c => c.types.includes(type));
        return component ? component.long_name : '';
      };

      return {
        placeId,
        name: place.name || '',
        formattedAddress: place.formatted_address || '',
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        city: getComponent('locality') || getComponent('administrative_area_level_2'),
        state: getComponent('administrative_area_level_1'),
        country: getComponent('country'),
        pinCode: getComponent('postal_code'),
        addressComponents
      };

    } catch (error) {
      logger.error(`Place details failed for placeId "${placeId}": ${error.message}`);
      throw new Error(error.message || 'Failed to get place details');
    }
  }

  // Geocode address to coordinates
  async geocodeAddress(address) {
    try {
      const response = await googleMapsClient.geocode({
        params: {
          address,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }).catch(err => {
        throw new Error(`Google Maps Client Error: ${err.message}`);
      });

      if (response.data.results.length === 0) {
        throw new Error('Address not found');
      }

      const result = response.data.results[0];
      return {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components
      };
    } catch (error) {
      logger.error(`Geocoding failed for ${address}: ${error.message}`);
      throw new Error(error.message || 'Failed to geocode address');
    }
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await googleMapsClient.reverseGeocode({
        params: {
          latlng: `${latitude},${longitude}`,
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }).catch(err => {
        throw new Error(`Google Maps Client Error: ${err.message}`);
      });

      if (response.data.results.length === 0) {
        throw new Error('Location not found');
      }

      const result = response.data.results[0];
      const addressComponents = result.address_components;

      const getComponent = (type) => {
        const component = addressComponents.find(c => c.types.includes(type));
        return component ? component.long_name : '';
      };

      return {
        formattedAddress: result.formatted_address,
        city: getComponent('locality') || getComponent('administrative_area_level_2'),
        state: getComponent('administrative_area_level_1'),
        country: getComponent('country'),
        pinCode: getComponent('postal_code'),
        latitude,
        longitude
      };
    } catch (error) {
      logger.error(`Reverse geocoding failed for ${latitude},${longitude}: ${error.message}`);
      throw new Error(error.message || 'Failed to reverse geocode coordinates');
    }
  }

  // Get elevation for coordinates
  async getElevation(latitude, longitude) {
    try {
      const response = await googleMapsClient.elevation({
        params: {
          locations: [`${latitude},${longitude}`],
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }).catch(err => {
        throw new Error(`Google Maps Client Error: ${err.message}`);
      });

      if (response.data.results.length === 0) {
        throw new Error('Elevation data not found');
      }

      return {
        elevation: response.data.results[0].elevation,
        resolution: response.data.results[0].resolution
      };
    } catch (error) {
      logger.error(`Elevation fetch failed for ${latitude},${longitude}: ${error.message}`);
      throw new Error(error.message || 'Failed to get elevation data');
    }
  }

  // Calculate distance between two points
  async calculateDistance(origin, destination) {
    try {
      const response = await googleMapsClient.distancematrix({
        params: {
          origins: [origin],
          destinations: [destination],
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      }).catch(err => {
        throw new Error(`Google Maps Client Error: ${err.message}`);
      });

      const element = response.data.rows[0].elements[0];

      if (element.status !== 'OK') {
        throw new Error('Distance calculation failed: ' + element.status);
      }

      return {
        distance: element.distance.value,
        distanceText: element.distance.text,
        duration: element.duration.value,
        durationText: element.duration.text
      };
    } catch (error) {
      logger.error(`Distance calculation failed for ${origin} to ${destination}: ${error.message}`);
      throw new Error(error.message || 'Failed to calculate distance');
    }
  }

  // Validate coordinates
  isValidCoordinates(latitude, longitude) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    return (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }
}

module.exports = new GoogleMapsService();