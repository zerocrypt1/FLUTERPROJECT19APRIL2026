// src/services/profileApi.js (FINAL, SYNTAX-CORRECT VERSION)
import axios from 'axios';

// API_BASE_URL is assumed to be: http://localhost:5050/api/v1
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5050/api/v1';

const getAuthToken = () => {
  return localStorage.getItem('token') || localStorage.getItem('x-auth-token');
};

const profileAPI = {
  // 1. Get user profile: Correctly constructed for /api/v1/admin/{userId}
  getProfile: async (userId) => {
    try {
      const token = getAuthToken();
      // Uses API_BASE_URL (http://.../api/v1) + /admin/{userId}
      const response = await axios.get(`${API_BASE_URL}/admin/${userId}`, { 
        headers: {
          'x-auth-token': token
        }
      });
      return response.data; // Returns the profile object directly
    } catch (error) {
      console.error(`Get profile for ID ${userId} error:`, error.response?.data || error.message);
      throw error; 
    }
  },

  // 2. Get pending admin requests: Correctly constructed for /api/v1/admin/pending-requests
  getPendingRequests: async () => {
    try {
      const token = getAuthToken();
      // Uses API_BASE_URL (http://.../api/v1) + /admin/pending-requests
      const response = await axios.get(`${API_BASE_URL}/admin/pending-requests`, {
        headers: {
          'x-auth-token': token
        }
      });
      return response.data; 
    } catch (error) {
      console.error('Get pending requests error:', error);
      throw error; 
    }
  },

  // 3. Process admin request: Correctly constructed for /api/v1/admin/process-request
  processAdminRequest: async (requestId, action) => {
    try {
      const token = getAuthToken();
      // Uses API_BASE_URL (http://.../api/v1) + /admin/process-request
      const response = await axios.post(
        `${API_BASE_URL}/admin/process-request`,
        { requestId, action },
        {
          headers: {
            'x-auth-token': token
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Process request error:', error);
      throw error;
    }
  }
};

export default profileAPI;