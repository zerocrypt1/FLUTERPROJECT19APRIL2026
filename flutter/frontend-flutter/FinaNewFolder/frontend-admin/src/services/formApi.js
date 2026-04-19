// ============================================
// src/services/formApi.js
// ============================================
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5050';

const formAPI = {
  // Request OTP for phone verification
  requestOtp: async (phoneNumber) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/send-otp`, { phoneNumber });
      return response.data;
    } catch (error) {
      console.error('Request OTP error:', error);
      throw error;
    }
  },

  // Verify OTP
  verifyOtp: async (phoneNumber, enteredOtp) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/verify-otp`, {
        phoneNumber,
        enteredOtp
      });
      return response.data;
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  },

  // Submit form data
  submitForm: async (formData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/forms`, formData);
      return response.data;
    } catch (error) {
      console.error('Submit form error:', error);
      throw error;
    }
  },

  // Get all forms
  getAllForms: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/forms`);
      return response.data;
    } catch (error) {
      console.error('Get forms error:', error);
      throw error;
    }
  },

  // Get single form by ID
  getFormById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/forms/${id}`);
      return response.data;
    } catch (error) {
      console.error('Get form error:', error);
      throw error;
    }
  },

  // Update form
  updateForm: async (id, formData) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/forms/${id}`, formData);
      return response.data;
    } catch (error) {
      console.error('Update form error:', error);
      throw error;
    }
  },

  // Delete form
  deleteForm: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/forms/${id}`);
      return response.data;
    } catch (error) {
      console.error('Delete form error:', error);
      throw error;
    }
  },

  // Check phone availability
  checkPhone: async (phoneNumber) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/check-phone`, { phoneNumber });
      return response.data;
    } catch (error) {
      console.error('Check phone error:', error);
      throw error;
    }
  }
};

export default formAPI;