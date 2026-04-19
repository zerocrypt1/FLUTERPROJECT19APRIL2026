// ============================================
// src/services/directoryApi.js
// ============================================
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5050';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('x-auth-token');
};

const directoryAPI = {
  // Fetch all forms with authentication
  fetchForms: async () => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/forms`, {
        headers: {
          'x-auth-token': token
        }
      });
      return response.data;
    } catch (error) {
      console.error('Fetch forms error:', error);
      throw error;
    }
  },

  // Delete form
  deleteForm: async (formId) => {
    try {
      const token = getAuthToken();
      const response = await axios.delete(`${API_BASE_URL}/forms/${formId}`, {
        headers: {
          'x-auth-token': token
        }
      });
      return response.data;
    } catch (error) {
      console.error('Delete form error:', error);
      throw error;
    }
  },

  // Get single form
  getForm: async (formId) => {
    try {
      const token = getAuthToken();
      const response = await axios.get(`${API_BASE_URL}/forms/${formId}`, {
        headers: {
          'x-auth-token': token
        }
      });
      return response.data;
    } catch (error) {
      console.error('Get form error:', error);
      throw error;
    }
  }
};

export default directoryAPI;
