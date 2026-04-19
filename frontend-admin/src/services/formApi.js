// src/services/formApi.js

import axios from 'axios';
import { auth } from "../firebase";

// ✅ Firebase SDK imports (VERY IMPORTANT)
import {
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "firebase/auth";

// ─── Axios Instance ───────────────────────────────────────────────────────────

const API_VERSION = process.env.REACT_APP_API_VERSION || 'v1';
const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request Interceptor ─────────────────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Something went wrong';

    console.error(`[API Error] ${error.config?.url}: ${message}`);
    return Promise.reject(new Error(message));
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Firebase OTP STATE
// ─────────────────────────────────────────────────────────────────────────────

let confirmationResultRef = null;
let recaptchaVerifierRef = null;

// ─────────────────────────────────────────────────────────────────────────────

const formAPI = {

  // ══════════════════════════════════════════════════════════════════════════
  // SEND OTP (Firebase)
  // ══════════════════════════════════════════════════════════════════════════

  sendFirebaseOtp: async (phoneNumber) => {

    try {
      // ✅ Clean phone number
      const clean = phoneNumber.replace(/\D/g, '');

      // ✅ Format to +91
      const formatted = clean.startsWith('91')
        ? `+${clean}`
        : `+91${clean}`;

      // ✅ Create recaptcha ONLY ONCE
      if (!recaptchaVerifierRef) {
        recaptchaVerifierRef = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          {
            size: 'invisible'
          }
        );

        await recaptchaVerifierRef.render();
      }

      // ✅ Send OTP
      confirmationResultRef = await signInWithPhoneNumber(
        auth,
        formatted,
        recaptchaVerifierRef
      );

      return {
        success: true,
        message: 'OTP sent successfully'
      };

    } catch (error) {
      console.error("OTP SEND ERROR:", error);
      throw new Error(error.message);
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VERIFY OTP (Firebase)
  // ══════════════════════════════════════════════════════════════════════════

  confirmFirebaseOtp: async (otp, phoneNumber) => {

    if (!confirmationResultRef) {
      throw new Error('No active OTP session. Please request OTP again.');
    }

    try {
      // ✅ Verify OTP
      const credential = await confirmationResultRef.confirm(otp);

      // ✅ Get Firebase token
      const idToken = await credential.user.getIdToken();

      // ✅ Send to backend
      const response = await api.post('/forms/otp/verify-firebase', {
        idToken,
        phoneNumber,
      });

      // ✅ Reset session
      confirmationResultRef = null;

      return response.data;

    } catch (error) {
      console.error("OTP VERIFY ERROR:", error);
      throw new Error(error.message);
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FALLBACK OTP (optional)
  // ══════════════════════════════════════════════════════════════════════════

  requestOtp: async (phoneNumber) => {
    const response = await api.post('/forms/otp/request', { phoneNumber });
    return response.data;
  },

  verifyOtp: async (tempToken, otp, phoneNumber) => {
    const response = await api.post('/forms/otp/verify', {
      tempToken,
      otp,
      phoneNumber,
    });
    return response.data;
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FORMS CRUD
  // ══════════════════════════════════════════════════════════════════════════

  submitForm: async (formData) => {
    const response = await api.post('/forms', formData);
    return response.data;
  },

  getAllForms: async (params = {}) => {
    const response = await api.get('/forms', { params });
    return response.data;
  },

  getFormById: async (id) => {
    const response = await api.get(`/forms/${id}`);
    return response.data;
  },

  updateForm: async (id, formData) => {
    const response = await api.put(`/forms/${id}`, formData);
    return response.data;
  },

  deleteForm: async (id) => {
    const response = await api.delete(`/forms/${id}`);
    return response.data;
  },

  checkPhone: async (phoneNumber) => {
    const response = await api.post('/forms/check-phone', { phoneNumber });
    return response.data;
  },
};

export default formAPI;