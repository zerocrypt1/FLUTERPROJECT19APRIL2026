const jwt = require('jsonwebtoken');
const User = require('../models/User');
const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const { googleOAuthClient } = require('../config/google');
const logger = require('../utils/logger');
const crypto = require('crypto');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// @desc    Register new user with OTP
// @route   POST /api/v1/auth/signup
exports.signup = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('📝 [SIGNUP] Request received', {
      email: req.body.email,
      phone: req.body.phone,
      ip: req.ip
    });

    const { name, email, address, phone, password } = req.body;

    // Check if user exists (by email)
    let user = await User.findOne({ email });
    if (user) {
      logger.warn('⚠️  [SIGNUP] User already exists', { email });
      return res.status(400).json({
        status: 'error',
        message: 'User already exists with this email'
      });
    }

    // Check if user exists (by phone)
    if (phone) {
      user = await User.findOne({ phone });
      if (user) {
        logger.warn('⚠️  [SIGNUP] Phone already registered', { phone });
        return res.status(400).json({
          status: 'error',
          message: 'Phone number already registered'
        });
      }
    }

    // Generate and store OTP (Storing full user data temporarily for creation later)
    const { tempToken, otp } = otpService.storeOTP('signup', {
      name,
      email,
      phone,
      address,
      password
    });

    logger.info('🔐 [SIGNUP] OTP generated', { 
      email, 
      tempToken: tempToken.substring(0, 10) + '...' 
    });

    // Send OTP email
    try {
      await emailService.sendOTPEmail(email, otp, 'verification');
      logger.info('✅ [SIGNUP] OTP email sent successfully', { email });
    } catch (emailError) {
      logger.error('❌ [SIGNUP] Failed to send OTP email', {
        email,
        error: emailError.message
      });
      // Non-critical failure, continue response
    }

    const duration = Date.now() - startTime;
    logger.info(`⏱️  [SIGNUP] Completed in ${duration}ms`, { email });

    res.status(201).json({
      status: 'success',
      message: 'OTP sent to your email for verification',
      tempToken,
      expiresIn: `${process.env.OTP_EXPIRY_MINUTES || 10} minutes`
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ [SIGNUP] Error', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Server error during signup'
    });
  }
};

// @desc    Verify OTP and create user (SIGNUP) or validate reset request (FORGOT PASSWORD)
// @route   POST /api/v1/auth/verify-otp
exports.verifyOTP = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('🔍 [VERIFY-OTP] Request received', {
      email: req.body.email,
      tempToken: req.body.tempToken?.substring(0, 10) + '...',
      ip: req.ip
    });

    const { email, otp, tempToken } = req.body;

    // Verify OTP
    const verification = otpService.verifyOTP(tempToken, otp, email);

    if (!verification.success) {
      logger.warn('⚠️  [VERIFY-OTP] Verification failed', {
        email,
        reason: verification.message
      });
      
      return res.status(400).json({
        status: 'error',
        message: verification.message
      });
    }

    const userData = verification.data;
    
    // --- CRITICAL FIX: Determine flow based on stored data payload ---
    const isSignupFlow = userData.password && userData.name;

    if (isSignupFlow) {
        // --- FLOW 1: SIGNUP AND USER CREATION ---
        
        // Create user
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
        logger.info('✅ [VERIFY-OTP] User created (Signup Flow)', {
            userId: user._id,
            email: user.email
        });

        // Delete OTP
        otpService.deleteOTP(tempToken);

        // Generate JWT
        const token = generateToken(user._id);

        // Send welcome email
        try {
            await emailService.sendWelcomeEmail(user.email, user.name);
            logger.info('📧 [VERIFY-OTP] Welcome email sent', { email: user.email });
        } catch (emailError) {
            logger.error('❌ [VERIFY-OTP] Failed to send welcome email', {
                email: user.email,
                error: emailError.message
            });
        }

        const duration = Date.now() - startTime;
        logger.info(`⏱️  [VERIFY-OTP] Signup completed in ${duration}ms`, {
            userId: user._id,
            email: user.email
        });

        return res.status(200).json({
            status: 'success',
            message: 'Account verified successfully',
            token,
            user: user.toCleanObject()
        });
        
    } else if (userData.userId) {
        // --- FLOW 2: PASSWORD RESET/OTHER VERIFICATION ---
        
        logger.info('✅ [VERIFY-OTP] Password reset verification successful (Reset Flow)', {
            userId: userData.userId,
            email: userData.email
        });
        
        const duration = Date.now() - startTime;
        logger.info(`⏱️  [VERIFY-OTP] Verification completed in ${duration}ms`, {
            userId: userData.userId,
            email: userData.email
        });
        
        // Return success for Flutter to proceed to the ResetPasswordPage.
        // The token is deleted in the final resetPassword step.
        return res.status(200).json({
            status: 'success',
            message: 'OTP verified. Proceed to password reset.'
        });

    } else {
        // Fallback for an unexpected payload structure
        logger.error('❌ [VERIFY-OTP] Invalid OTP data payload', { userData });
        return res.status(400).json({
            status: 'error',
            message: 'Invalid verification data payload.'
        });
    }

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ [VERIFY-OTP] Error', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Server error during verification'
    });
  }
};


// @desc    Resend OTP
// @route   POST /api/v1/auth/resend-otp
exports.resendOTP = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('🔄 [RESEND-OTP] Request received', {
      email: req.body.email,
      ip: req.ip
    });

    const { email, tempToken } = req.body;

    // Resend OTP
    const result = otpService.resendOTP(tempToken);

    if (!result.success) {
      logger.warn('⚠️  [RESEND-OTP] Failed', {
        email,
        reason: result.message
      });
      
      return res.status(400).json({
        status: 'error',
        message: result.message
      });
    }

    // Send new OTP email
    try {
      await emailService.sendOTPEmail(email, result.otp, 'verification'); 
      logger.info('✅ [RESEND-OTP] New OTP sent', { email });
    } catch (emailError) {
      logger.error('❌ [RESEND-OTP] Email send failed', {
        email,
        error: emailError.message
      });
    }

    const duration = Date.now() - startTime;
    logger.info(`⏱️  [RESEND-OTP] Completed in ${duration}ms`, { email });

    res.status(200).json({
      status: 'success',
      message: 'OTP resent successfully'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ [RESEND-OTP] Error', {
      error: error.message,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Sign in with phone/password
// @route   POST /api/v1/auth/signin
exports.signInPhone = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('🔑 [SIGNIN] Request received', {
      phone: req.body.phone,
      ip: req.ip
    });

    const { phone, password } = req.body;

    const user = await User.findOne({ phone }).select('+password');
    
    if (!user || !(await user.comparePassword(password))) {
      logger.warn('⚠️  [SIGNIN] Invalid credentials', { phone });
      return res.status(400).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    if (!user.isVerified) {
      logger.warn('⚠️  [SIGNIN] Unverified account', {
        userId: user._id,
        phone
      });
      
      // If the account is unverified, inform the client they need to verify
      return res.status(401).json({
        status: 'error',
        message: 'Please verify your account first',
        emailVerificationRequired: true,
        email: user.email,
        // NOTE: If your backend generates a tempToken on unverified sign-in, 
        // you should return it here as well.
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    const duration = Date.now() - startTime;
    logger.info(`✅ [SIGNIN] Success in ${duration}ms`, {
      userId: user._id,
      phone
    });

    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      user: user.toCleanObject()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ [SIGNIN] Error', {
      error: error.message,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Server error during login'
    });
  }
};

// @desc    Google OAuth authentication
// @route   POST /api/v1/auth/google
exports.googleAuth = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('🔐 [GOOGLE-AUTH] Request received', { ip: req.ip });

    const { idToken } = req.body;

    // Verify Google token
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;

    logger.info('✅ [GOOGLE-AUTH] Token verified', { email, googleId });

    // Find or create user
    let user = await User.findOne({ googleId });

    if (!user) {
      user = await User.findOne({ email });
      
      if (user && !user.googleId) {
        user.googleId = googleId;
        user.isVerified = true;
        await user.save();
        logger.info('🔗 [GOOGLE-AUTH] Linked existing account', {
          userId: user._id,
          email
        });
      }
    }

    if (!user) {
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
      logger.info('👤 [GOOGLE-AUTH] New user created', {
        userId: user._id,
        email
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    const duration = Date.now() - startTime;
    logger.info(`✅ [GOOGLE-AUTH] Success in ${duration}ms`, {
      userId: user._id,
      email
    });

    res.status(200).json({
      status: 'success',
      message: 'Google authentication successful',
      token,
      user: user.toCleanObject()
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ [GOOGLE-AUTH] Error', {
      error: error.message,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Google authentication failed'
    });
  }
};

// @desc    Request password reset OTP
// @route   POST /api/v1/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('🔒 [FORGOT-PASSWORD] Request received', {
      email: req.body.email,
      ip: req.ip
    });

    const { email } = req.body;

    const user = await User.findOne({ email });
    
    if (!user) {
      logger.warn('⚠️  [FORGOT-PASSWORD] User not found', { email });
      // Security: Don't reveal if user exists
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

    logger.info('🔐 [FORGOT-PASSWORD] OTP generated', {
      userId: user._id,
      email,
      tempToken: tempToken.substring(0, 10) + '...'
    });

    // Send OTP email
    try {
      await emailService.sendOTPEmail(email, otp, 'password-reset');
      logger.info('✅ [FORGOT-PASSWORD] OTP email sent', { email });
    } catch (emailError) {
      logger.error('❌ [FORGOT-PASSWORD] Email send failed', {
        email,
        error: emailError.message
      });
    }

    const duration = Date.now() - startTime;
    logger.info(`⏱️  [FORGOT-PASSWORD] Completed in ${duration}ms`, { email });

    res.status(200).json({
      status: 'success',
      message: 'Password reset OTP sent to your email',
      tempToken
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ [FORGOT-PASSWORD] Error', {
      error: error.message,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};

// @desc    Reset password with OTP
// @route   POST /api/v1/auth/reset-password
exports.resetPassword = async (req, res) => {
  const startTime = Date.now();
  
  try {
    logger.info('🔄 [RESET-PASSWORD] Request received', {
      email: req.body.email,
      ip: req.ip
    });

    const { email, otp, tempToken, newPassword } = req.body;

    // Verify OTP
    const verification = otpService.verifyOTP(tempToken, otp, email);

    if (!verification.success) {
      logger.warn('⚠️  [RESET-PASSWORD] OTP verification failed', {
        email,
        reason: verification.message
      });
      
      return res.status(400).json({
        status: 'error',
        message: verification.message
      });
    }

    const userData = verification.data;

    // Find user
    const user = await User.findById(userData.userId);
    
    if (!user) {
      logger.error('❌ [RESET-PASSWORD] User not found', {
        userId: userData.userId
      });
      
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    logger.info('✅ [RESET-PASSWORD] Password updated', {
      userId: user._id,
      email
    });

    // Delete OTP
    otpService.deleteOTP(tempToken);
    
    // --- ENHANCEMENT: Send Password Change Notification ---
    try {
      await emailService.sendPasswordChangedEmail(user.email, user.name); 
      logger.info('📧 [RESET-PASSWORD] Password change email sent', { email: user.email });
    } catch (emailError) {
      logger.error('❌ [RESET-PASSWORD] Failed to send password change email', {
        email: user.email,
        error: emailError.message
      });
    }
    // --- END ENHANCEMENT ---

    const duration = Date.now() - startTime;
    logger.info(`⏱️  [RESET-PASSWORD] Completed in ${duration}ms`, {
      userId: user._id,
      email
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ [RESET-PASSWORD] Error', {
      error: error.message,
      duration: `${duration}ms`
    });
    
    res.status(500).json({
      status: 'error',
      message: 'Server error'
    });
  }
};