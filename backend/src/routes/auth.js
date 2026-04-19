// src/routes/auth.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const { googleOAuthClient } = require('../config/google');
const validation = require('../middleware/validation');
const { otpLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const crypto = require('crypto'); 

// --- Token Generation Utility ---
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};
// ---------------------------------------------------------------------------------------------------------


// @route   POST /api/v1/auth/signup
// @desc    Register new user with OTP
// @access  Public
router.post('/signup', validation.validateSignup, validation.handleValidationErrors, async (req, res) => {
  try {
    const { name, email, address, phone, password } = req.body;

    // Check if user exists (by email)
    let user = await User.findOne({ email });
    if (user) {
      logger.warn('⚠️ [SIGNUP] User already exists', { email });
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Check if user exists (by phone)
    if (phone) {
      user = await User.findOne({ phone });
      if (user) {
        logger.warn('⚠️ [SIGNUP] Phone already registered', { phone });
        return res.status(400).json({
          status: 'error',
          message: 'Phone number already registered'
        });
      }
    }

    // Generate and store OTP (Storing full user data for future user creation)
    const { tempToken, otp } = otpService.storeOTP('signup', {
      name,
      email,
      phone,
      address,
      password
    });

    // Send OTP email
    await emailService.sendOTPEmail(email, otp, 'verification');
    logger.info('✅ [SIGNUP] OTP sent', { email });


    res.status(201).json({
      status: 'success',
      message: 'OTP sent to your email for verification',
      tempToken,
      expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 10} minutes`
    });

  } catch (error) {
    logger.error(`❌ Signup error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      status: 'error',
      message: 'Server error during signup'
    });
  }
});

// @route   POST /api/v1/auth/verify-otp
// @desc    Verify OTP and finalize account (Signup) or confirm identity (Password Reset)
// @access  Public
router.post('/verify-otp', validation.validateOTP, validation.handleValidationErrors, async (req, res) => {
  try {
    const { email, otp, tempToken } = req.body;

    // Verify OTP
    const verification = otpService.verifyOTP(tempToken, otp, email);

    if (!verification.success) {
      logger.warn('⚠️ [VERIFY-OTP] Verification failed', { email });
      return res.status(400).json({
        status: 'error',
        message: verification.message
      });
    }

    const userData = verification.data;
    
    // --- CRITICAL FIX: Differentiate flows based on payload ---
    const isSignupFlow = userData.password && userData.name;

    if (isSignupFlow) {
        // --- FLOW 1: SIGNUP (Create User) ---
        
        const user = new User({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            address: userData.address,
            password: userData.password,
            isVerified: true,
            favorites: []
        });

        await user.save();
        otpService.deleteOTP(tempToken); // Delete token as user is created

        const token = generateToken(user._id);

        await emailService.sendWelcomeEmail(user.email, user.name);
        logger.info('✅ [VERIFY-OTP] User created (Signup Flow)', { userId: user._id });

        return res.status(200).json({
            status: 'success',
            message: 'Account verified successfully',
            token,
            user: user.toCleanObject()
        });
        
    } else if (userData.userId) {
        // --- FLOW 2: PASSWORD RESET (Validate identity, do NOT create user) ---
        
        logger.info('✅ [VERIFY-OTP] Identity confirmed (Password Reset Flow)', { userId: userData.userId });
        
        // Do NOT delete the OTP here; it's needed for the final reset-password endpoint.
        // Return a successful, minimal response for the client to proceed.
        return res.status(200).json({
            status: 'success',
            message: 'OTP verified. Proceed to password reset.',
        });
        
    } else {
        // Unexpected payload
        logger.error('❌ [VERIFY-OTP] Unexpected OTP data payload received.', { userData });
        return res.status(400).json({
            status: 'error',
            message: 'Invalid verification data payload.'
        });
    }

  } catch (error) {
    logger.error(`❌ OTP verification error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      status: 'error',
      message: 'Server error during verification'
    });
  }
});

// @route   POST /api/v1/auth/resend-otp
// @desc    Resend OTP
// @access  Public
router.post('/resend-otp', otpLimiter, validation.validateEmail, validation.handleValidationErrors, async (req, res) => {
  try {
    const { email, tempToken } = req.body;
    
    // NOTE: otpService.resendOTP handles finding the temp data (signup or password-reset)
    // and renewing its expiration timestamp.
    const result = otpService.resendOTP(tempToken); 

    if (!result.success) {
      logger.warn('⚠️ [RESEND-OTP] Failed', { email });
      return res.status(400).json({
        status: 'error',
        message: result.message
      });
    }

    // Send new OTP email
    await emailService.sendOTPEmail(email, result.otp, 'verification');
    logger.info('✅ [RESEND-OTP] New OTP sent', { email });

    res.status(200).json({
      status: 'success',
      message: 'OTP resent successfully'
    });

  } catch (error) {
    logger.error(`❌ Resend OTP error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST /api/v1/auth/forgot-password
// @desc    Request password reset OTP
// @access  Public
router.post('/forgot-password', validation.validateEmail, validation.handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    
    // SECURITY FIX: Return 200 success for non-existent users to prevent enumeration.
    if (!user) {
      logger.warn('⚠️ [FORGOT-PASSWORD] User not found, returning generic success.', { email });
      return res.status(200).json({
        status: 'success',
        message: 'If an account exists, a password reset OTP has been sent.'
      });
    }

    // Generate and store OTP (Storing only userId and email for reset)
    const { tempToken, otp } = otpService.storeOTP('password-reset', {
      userId: user._id,
      email
    });

    // Send OTP email
    await emailService.sendOTPEmail(email, otp, 'password-reset');
    logger.info('✅ [FORGOT-PASSWORD] OTP sent', { email });

    res.status(200).json({
      status: 'success',
      message: 'Password reset OTP sent to your email',
      tempToken
    });

  } catch (error) {
    logger.error(`❌ Forgot password error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// @route   POST /api/v1/auth/reset-password
// @desc    Reset password with OTP
// @access  Public
router.post('/reset-password', validation.validatePasswordReset, validation.handleValidationErrors, async (req, res) => {
  try {
    const { email, otp, tempToken, newPassword } = req.body;

    // Verify OTP (Requires OTP verification success from the previous step)
    const verification = otpService.verifyOTP(tempToken, otp, email);

    if (!verification.success) {
      logger.warn('⚠️ [RESET-PASSWORD] OTP verification failed', { email });
      return res.status(400).json({
        status: 'error',
        message: verification.message
      });
    }

    const userData = verification.data;

    // Find user
    const user = await User.findById(userData.userId);
    
    if (!user) {
      logger.error('❌ [RESET-PASSWORD] User not found in DB after OTP success', { userId: userData.userId });
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    // Delete OTP (Now the process is complete)
    otpService.deleteOTP(tempToken);

    // Send confirmation email (Enhancement)
    // NOTE: You must ensure 'emailService.sendPasswordChangedEmail' is implemented.
    await emailService.sendPasswordChangedEmail(user.email, user.name); 

    logger.info('✅ [RESET-PASSWORD] Password updated', { userId: user._id });

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful'
    });

  } catch (error) {
    logger.error(`❌ Reset password error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
});

// --- Other Routes (SignIn, GoogleAuth, etc.) remain unchanged ---

// @route   POST /api/v1/auth/signin
// @desc    Sign in with phone/password
// @access  Public
router.post('/signin', validation.validateLogin, validation.handleValidationErrors, async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await User.findOne({ phone }).select('+password');
    
    if (!user) {
      logger.warn('⚠️ [SIGNIN-PHONE] Invalid credentials attempt (User not found)', { phone });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    if (!user.isVerified) {
      logger.warn('⚠️ [SIGNIN-PHONE] Unverified account access attempt', { phone });
      return res.status(401).json({
        status: 'error',
        message: 'Please verify your account first'
      });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      logger.warn('⚠️ [SIGNIN-PHONE] Invalid password attempt', { phone });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    logger.info('✅ [SIGNIN-PHONE] Login successful', { userId: user._id, phone });
    
    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      user: user.toCleanObject()
    });

  } catch (error) {
    logger.error(`❌ Signin error (phone): ${error.message}`, { stack: error.stack });
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
});

// @route   POST /api/v1/auth/signin-email
// @desc    Sign in with email/password
// @access  Public
router.post('/signin-email', validation.validateLogin, validation.handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      logger.warn('⚠️ [SIGNIN-EMAIL] Invalid credentials attempt (User not found)', { email });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    if (!user.isVerified) {
      logger.warn('⚠️ [SIGNIN-EMAIL] Unverified account access attempt', { email });
      return res.status(401).json({
        status: 'error',
        message: 'Please verify your account first'
      });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      logger.warn('⚠️ [SIGNIN-EMAIL] Invalid password attempt', { email });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    logger.info('✅ [SIGNIN-EMAIL] Login successful', { userId: user._id, email });

    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      user: user.toCleanObject()
    });

  } catch (error) {
    logger.error(`❌ Email signin error: ${error.message}`, { stack: error.stack });
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
});

// @route   POST /api/v1/auth/google
// @desc    Google OAuth authentication
// @access  Public
router.post('/google', async (req, res) => {
    try {
      const { idToken } = req.body;
      
      if (!idToken) {
          return res.status(400).json({ status: 'error', message: 'Google ID token is required.' });
      }

      // Verify Google token
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID
      });
  
      const payload = ticket.getPayload();
      const googleId = payload.sub;
      const email = payload.email;
      const name = payload.name;
  
      logger.info('🔐 [GOOGLE-AUTH] Token verified', { email });

      // Find or create user
      let user = await User.findOne({ googleId });
  
      if (!user) {
        user = await User.findOne({ email });
        
        if (user && !user.googleId) {
          // Link existing account
          user.googleId = googleId;
          user.isVerified = true;
          await user.save();
          logger.info('🔗 [GOOGLE-AUTH] Linked existing account', { userId: user._id });
        }
      }
  
      if (!user) {
        // Create new user
        const randomPassword = crypto.randomBytes(16).toString('hex');
        
        user = new User({
          name,
          email,
          googleId,
          password: randomPassword,
          isVerified: true,
          favorites: []
        });
  
        await user.save();
        logger.info('👤 [GOOGLE-AUTH] New user created', { userId: user._id });
      }
  
      user.lastLogin = new Date();
      await user.save();
  
      const token = generateToken(user._id);
  
      res.status(200).json({
        status: 'success',
        message: 'Google authentication successful',
        token,
        user: user.toCleanObject()
      });
    } catch (error) {
      logger.error(`❌ Google auth error: ${error.message}`, { stack: error.stack });
      res.status(500).json({
        status: 'error',
        message: 'Google authentication failed'
      });
    }
  });

module.exports = router;