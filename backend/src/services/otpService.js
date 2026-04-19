// src/services/otpService.js
const NodeCache = require('node-cache');
const crypto = require('crypto');
const admin = require('firebase-admin');
const logger = require('../utils/logger');

// ─── Firebase Admin Init ──────────────────────────────────────────────────────
// Make sure FIREBASE_SERVICE_ACCOUNT_KEY env variable has the JSON stringified key
// OR use a path to the service account JSON file

if (!admin.apps.length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : require('../../firebase-service-account.json'); // fallback to file

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info('✅ Firebase Admin initialized');
  } catch (err) {
    logger.error(`❌ Firebase Admin init failed: ${err.message}`);
  }
}

// ─── OTP Cache (for session tracking + fallback) ──────────────────────────────

const otpCache = new NodeCache({
  stdTTL: parseInt(process.env.OTP_EXPIRY_MINUTES) * 60 || 600, // 10 min default
  checkperiod: 120,
  useClones: false,
});

// ─── OTPService ───────────────────────────────────────────────────────────────

class OTPService {

  // ── Helpers ──────────────────────────────────────────────────────────────────

  generateOTP() {
    const length = parseInt(process.env.OTP_LENGTH) || 6;
    return crypto.randomInt(
      Math.pow(10, length - 1),
      Math.pow(10, length)
    ).toString();
  }

  generateTempToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // ── Firebase: Verify ID Token sent from frontend after phone OTP ─────────────
  //
  // Flow:
  //   1. Frontend uses Firebase Client SDK to send OTP to phone (signInWithPhoneNumber)
  //   2. User enters OTP → Firebase returns an idToken on the frontend
  //   3. Frontend sends idToken to your backend: POST /forms/otp/verify-firebase
  //   4. Backend calls this method to verify the token with Firebase Admin SDK
  //   5. If valid, phone number is confirmed ✅
  //
  async verifyFirebaseIdToken(idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      // decodedToken.phone_number is the verified phone number
      return {
        success: true,
        phone: decodedToken.phone_number || null,
        uid: decodedToken.uid,
        data: decodedToken,
      };
    } catch (err) {
      logger.error(`Firebase token verification failed: ${err.message}`);
      return {
        success: false,
        message: err.code === 'auth/id-token-expired'
          ? 'Verification session expired. Please try again.'
          : 'Invalid verification token. Please try again.',
      };
    }
  }

  // ── Fallback: Store OTP in cache (for non-Firebase flows / testing) ───────────

  storeOTP(identifier, data) {
    const tempToken = this.generateTempToken();
    const otp = this.generateOTP();

    const otpData = {
      ...data,
      otp,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: 3,
    };

    otpCache.set(tempToken, otpData);

    return { tempToken, otp };
  }

  // ── Fallback: Verify cached OTP ───────────────────────────────────────────────

  verifyOTP(tempToken, enteredOTP, identifier) {
    const data = otpCache.get(tempToken);

    if (!data) {
      return { success: false, message: 'Invalid or expired verification session' };
    }

    if (data.attempts >= data.maxAttempts) {
      otpCache.del(tempToken);
      return { success: false, message: 'Too many incorrect attempts. Please request a new OTP.' };
    }

    if (data.otp !== enteredOTP) {
      data.attempts += 1;
      otpCache.set(tempToken, data);
      return {
        success: false,
        message: `Invalid OTP. ${data.maxAttempts - data.attempts} attempts remaining.`,
      };
    }

    if (identifier && data.email !== identifier && data.phone !== identifier) {
      return { success: false, message: 'Invalid verification data' };
    }

    return { success: true, data };
  }

  // ── Cache utilities ───────────────────────────────────────────────────────────

  getOTPData(tempToken) {
    return otpCache.get(tempToken);
  }

  deleteOTP(tempToken) {
    return otpCache.del(tempToken);
  }

  isExpired(tempToken) {
    const data = otpCache.get(tempToken);
    if (!data) return true;

    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
    const expired = Date.now() - data.createdAt > expiryMinutes * 60 * 1000;

    if (expired) otpCache.del(tempToken);

    return expired;
  }

  resendOTP(tempToken) {
    const data = otpCache.get(tempToken);

    if (!data) return { success: false, message: 'Invalid session' };

    const newOTP = this.generateOTP();
    data.otp = newOTP;
    data.createdAt = Date.now();
    data.attempts = 0;
    otpCache.set(tempToken, data);

    return { success: true, otp: newOTP, data };
  }

  getStats() {
    return { keys: otpCache.keys().length, stats: otpCache.getStats() };
  }

  clearAll() {
    otpCache.flushAll();
  }
}

module.exports = new OTPService();