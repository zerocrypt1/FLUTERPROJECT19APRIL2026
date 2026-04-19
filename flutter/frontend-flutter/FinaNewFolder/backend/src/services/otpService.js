const NodeCache = require('node-cache');
const crypto = require('crypto');

// Create OTP cache with TTL
const otpCache = new NodeCache({
  stdTTL: parseInt(process.env.OTP_EXPIRY_MINUTES) * 60 || 600, // 10 minutes default
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false
});

class OTPService {
  // Generate OTP
  generateOTP() {
    const length = parseInt(process.env.OTP_LENGTH) || 6;
    const otp = crypto.randomInt(Math.pow(10, length - 1), Math.pow(10, length)).toString();
    return otp;
  }

  // Generate temp token
  generateTempToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Store OTP with associated data
  storeOTP(identifier, data) {
    const tempToken = this.generateTempToken();
    const otp = this.generateOTP();
    
    const otpData = {
      ...data,
      otp,
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: 3
    };

    otpCache.set(tempToken, otpData);
    
    return { tempToken, otp };
  }

  // Verify OTP
  verifyOTP(tempToken, enteredOTP, identifier) {
    const data = otpCache.get(tempToken);

    if (!data) {
      return {
        success: false,
        message: 'Invalid or expired verification session'
      };
    }

    // Check if too many attempts
    if (data.attempts >= data.maxAttempts) {
      otpCache.del(tempToken);
      return {
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.'
      };
    }

    // Check if OTP matches
    if (data.otp !== enteredOTP) {
      data.attempts += 1;
      otpCache.set(tempToken, data);
      
      return {
        success: false,
        message: `Invalid OTP. ${data.maxAttempts - data.attempts} attempts remaining.`
      };
    }

    // Verify identifier if provided
    if (identifier && data.email !== identifier && data.phone !== identifier) {
      return {
        success: false,
        message: 'Invalid verification data'
      };
    }

    return {
      success: true,
      data
    };
  }

  // Get OTP data
  getOTPData(tempToken) {
    return otpCache.get(tempToken);
  }

  // Delete OTP data
  deleteOTP(tempToken) {
    return otpCache.del(tempToken);
  }

  // Check if OTP is expired
  isExpired(tempToken) {
    const data = otpCache.get(tempToken);
    if (!data) return true;

    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
    const isExpired = Date.now() - data.createdAt > expiryMinutes * 60 * 1000;
    
    if (isExpired) {
      otpCache.del(tempToken);
    }

    return isExpired;
  }

  // Resend OTP
  resendOTP(tempToken) {
    const data = otpCache.get(tempToken);
    
    if (!data) {
      return {
        success: false,
        message: 'Invalid session'
      };
    }

    // Generate new OTP
    const newOTP = this.generateOTP();
    
    // Reset attempts and update timestamp
    data.otp = newOTP;
    data.createdAt = Date.now();
    data.attempts = 0;
    
    otpCache.set(tempToken, data);

    return {
      success: true,
      otp: newOTP,
      data
    };
  }

  // Get cache statistics
  getStats() {
    return {
      keys: otpCache.keys().length,
      stats: otpCache.getStats()
    };
  }

  // Clear all OTPs (for testing/admin purposes)
  clearAll() {
    otpCache.flushAll();
  }
}

module.exports = new OTPService();