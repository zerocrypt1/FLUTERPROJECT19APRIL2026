const FormData = require('../models/FormData');
const User = require('../models/User');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');
const otpService = require('../services/otpService');
const admin = require('../config/firebaseAdmin');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} = require('../utils/constants');

// ─────────────────────────────────────────────────────────────────────────────
// OTP: Verify Firebase ID Token
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyFirebaseOtp = async (req, res) => {
  try {
    const { idToken, phoneNumber } = req.body;

    // ✅ VALIDATION: Check required fields
    if (!idToken) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Firebase ID token is required',
      });
    }

    if (!phoneNumber) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Phone number is required',
      });
    }

    // ✅ STEP 1: Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (firebaseError) {
      logger.error(`Firebase token verification failed: ${firebaseError.message}`);
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Invalid Firebase token',
      });
    }

    // ✅ STEP 2: Verify phone number matches
    if (decodedToken.phone_number) {
      const normalizedSent = phoneNumber.replace(/\D/g, '');
      const normalizedVerified = decodedToken.phone_number.replace(/\D/g, '');

      if (!normalizedVerified.endsWith(normalizedSent)) {
        logger.warn(`Phone mismatch - Sent: ${normalizedSent}, Verified: ${normalizedVerified}`);
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          status: 'error',
          message: 'Phone number mismatch with Firebase token',
        });
      }
    }

    logger.info(`✅ Firebase OTP verified for phone: ${decodedToken.phone_number}`);

    // ✅ STEP 3: Find or create user
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '').slice(-10); // Get last 10 digits
    
    let user = await User.findOne({ phone: cleanPhoneNumber });

    if (!user) {
      // 🔥 FIX 1: Generate temporary password for Firebase users
      const tempPassword = 'firebase_' + Math.random().toString(36).slice(2, 15) + Math.random().toString(36).slice(2, 15);
      
      // 🔥 FIX 2: Create placeholder email (can be updated later)
      const placeholderEmail = `phone_${cleanPhoneNumber}_${Date.now()}@firebase.temp`;

      try {
        user = new User({
          name: decodedToken.name || 'User', // Use Firebase name if available
          email: placeholderEmail, // ✅ Placeholder email (required by schema)
          phone: cleanPhoneNumber, // ✅ Phone number
          password: tempPassword, // ✅ Temporary password (required by schema)
          role: 'user', // ✅ FIXED: Changed from 'employee' to 'user' (valid enum)
          isVerified: true, // Mark as verified since Firebase verified it
          googleId: decodedToken.uid, // Store Firebase UID as reference
        });

        await user.save();
        logger.info(`✅ New user created via Firebase: ${user._id}`);

      } catch (createError) {
        logger.error(`User creation error: ${createError.message}`);
        
        // Handle validation errors specifically
        if (createError.name === 'ValidationError') {
          const messages = Object.entries(createError.errors)
            .map(([field, err]) => `${field}: ${err.message}`)
            .join(' | ');
          
          return res.status(HTTP_STATUS.BAD_REQUEST).json({
            status: 'error',
            message: `User creation failed: ${messages}`,
          });
        }

        throw createError;
      }
    } else {
      // ✅ Update existing user's verification status
      if (!user.isVerified) {
        user.isVerified = true;
        await user.save();
        logger.info(`✅ User verified: ${user._id}`);
      }
    }

    // ✅ STEP 4: Generate JWT token
    const jwtToken = jwt.sign(
      {
        userId: user._id,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '30d' }
    );

    logger.info(`✅ JWT token generated for user: ${user._id}`);

    // ✅ STEP 5: Return success response
    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      verified: true,
      message: 'Phone verified successfully',
      phone: decodedToken.phone_number,
      token: jwtToken, // JWT for frontend auth
      data: {
        user: {
          _id: user._id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      },
    });

  } catch (error) {
    logger.error(`Firebase OTP verify error: ${error.message}`);
    console.error('Full error:', error);
    
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      status: 'error',
      message: error.message || 'Invalid verification token',
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// OTP: Request OTP (fallback)
// ─────────────────────────────────────────────────────────────────────────────
exports.requestOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Phone number is required',
      });
    }

    const { tempToken, otp } = otpService.storeOTP(phoneNumber, { phone: phoneNumber });

    if (process.env.NODE_ENV === 'development') {
      logger.info(`[DEV] OTP for ${phoneNumber}: ${otp}`);
    }

    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'OTP sent successfully',
      tempToken,
      ...(process.env.NODE_ENV === 'development' && { otp }),
    });

  } catch (error) {
    logger.error(`Request OTP error: ${error.message}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// OTP: Verify OTP (fallback)
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { tempToken, otp, phoneNumber } = req.body;

    if (!tempToken || !otp) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'tempToken and otp are required',
      });
    }

    const result = otpService.verifyOTP(tempToken, otp, phoneNumber);

    if (!result.success) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        verified: false,
        message: result.message,
      });
    }

    otpService.deleteOTP(tempToken);

    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      verified: true,
      message: 'OTP verified successfully',
    });

  } catch (error) {
    logger.error(`Verify OTP error: ${error.message}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get all forms
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllForms = async (req, res) => {
  try {
    const {
      page = 1, limit = 10,
      status, verificationStatus,
      city, state, pinCode,
      search, gender,
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (verificationStatus) query.verificationStatus = verificationStatus;
    if (city) query.city = new RegExp(city, 'i');
    if (state) query.state = new RegExp(state, 'i');
    if (gender) query.gender = new RegExp(gender, 'i');
    if (pinCode) query.pinCode = pinCode;

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { phoneNumber: new RegExp(search, 'i') },
        { occupation: new RegExp(search, 'i') },
      ];
    }

    const { skip, limit: limitNum } = Helpers.paginate(page, limit);

    const [forms, total] = await Promise.all([
      FormData.find(query).skip(skip).limit(limitNum).sort({ createdAt: -1 }),
      FormData.countDocuments(query),
    ]);

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: forms,
      pagination: Helpers.getPaginationMeta(total, parseInt(page), limitNum),
    });

  } catch (error) {
    logger.error(`Get forms error: ${error.message}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get single form
// ───────────────────────────────────────────────────���─────────────────────────
exports.getFormById = async (req, res) => {
  try {
    const form = await FormData.findById(req.params.id);

    if (!form) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND,
      });
    }

    return res.status(HTTP_STATUS.OK).json({ success: true, data: form });

  } catch (error) {
    logger.error(`Get form error: ${error.message}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Normalize and validate form data
// ─────────────────────────────────────────────────────────────────────────────
const normalizeFormData = (data) => {
  const normalized = { ...data };

  // 🔥 FIX 1: occupation MUST be an array
  if (normalized.occupation) {
    if (Array.isArray(normalized.occupation)) {
      normalized.occupation = normalized.occupation.filter(o => o && typeof o === 'string').map(o => o.trim());
    } else if (typeof normalized.occupation === 'string') {
      normalized.occupation = [normalized.occupation.trim()];
    } else {
      throw new Error('occupation must be a string or array of strings');
    }
  } else {
    throw new Error('occupation is required');
  }

  if (!normalized.occupation.length) {
    throw new Error('At least one occupation must be selected');
  }

  // 🔥 FIX 2: timing array
  if (normalized.timing) {
    if (Array.isArray(normalized.timing)) {
      normalized.timing = normalized.timing.filter(t => t && typeof t === 'string');
    } else if (typeof normalized.timing === 'string') {
      normalized.timing = [normalized.timing];
    } else {
      normalized.timing = [];
    }
  } else {
    normalized.timing = [];
  }

  // 🔥 FIX 3: identityProof - normalize to lowercase
  if (normalized.identityProof) {
    const validProofs = ['aadhar', 'pan', 'voter', 'driving', 'passport'];
    let proofLower = normalized.identityProof.toLowerCase().trim();
    
    // Handle common variations
    if (proofLower === 'aadhaar') proofLower = 'aadhar';
    if (proofLower === 'driving license') proofLower = 'driving';
    if (proofLower === 'voter id') proofLower = 'voter';
    
    if (!validProofs.includes(proofLower)) {
      throw new Error(
        `identityProof: "${normalized.identityProof}" is invalid. ` +
        `Valid values: ${validProofs.join(', ')}`
      );
    }
    
    normalized.identityProof = proofLower;
  }

  // 🔥 FIX 4: location structure - handle GeoJSON format
  if (normalized.location) {
    const { latitude, longitude, formattedAddress, name, city, state, country, pinCode, placeId, coordinates } = normalized.location;

    // If coordinates already in GeoJSON format, keep it
    if (coordinates && coordinates.coordinates && Array.isArray(coordinates.coordinates)) {
      normalized.location = {
        type: 'Point',
        coordinates: coordinates.coordinates,
        formattedAddress: formattedAddress || '',
        name: name || '',
        city: city || '',
        state: state || '',
        country: country || '',
        pinCode: pinCode || '',
        placeId: placeId || null
      };
    } 
    // Convert lat/lng to GeoJSON [lng, lat]
    else if (latitude !== undefined && longitude !== undefined) {
      normalized.location = {
        type: 'Point',
        coordinates: [longitude, latitude],
        formattedAddress: formattedAddress || '',
        name: name || '',
        city: city || '',
        state: state || '',
        country: country || '',
        pinCode: pinCode || '',
        placeId: placeId || null
      };
    }
  }

  // 🔥 FIX 5: type conversion
  if (normalized.age) {
    const ageNum = Number(normalized.age);
    if (isNaN(ageNum)) {
      throw new Error('age must be a valid number');
    }
    normalized.age = ageNum;
  }

  if (normalized.pinCode) {
    normalized.pinCode = String(normalized.pinCode).trim();
  }

  return normalized;
};

// ─────────────────────────────────────────────────────────────────────────────
// Create form
// ─────────────────────────────────────────────────────────────────────────────
exports.createForm = async (req, res) => {
  try {
    console.log("📥 Incoming Data:", req.body);

    // Check if phone number already exists
    const existingForm = await FormData.findOne({ phoneNumber: req.body.phoneNumber });

    if (existingForm) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        status: 'error',
        message: 'Phone number already registered',
      });
    }

    // 🔥 NORMALIZE DATA BEFORE VALIDATION
    let normalizedData;
    try {
      normalizedData = normalizeFormData(req.body);
      console.log("✅ Normalized Data:", JSON.stringify(normalizedData, null, 2));
    } catch (normError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: normError.message,
      });
    }

    // 🔥 CREATE FORM WITH NORMALIZED DATA
    const formPayload = {
      ...normalizedData,
      submittedBy: req.user ? req.user._id : null,
    };

    const form = new FormData(formPayload);

    // 🔥 VALIDATE BEFORE SAVE
    await form.validate();

    // 🔥 SAVE TO DATABASE
    await form.save();

    console.log("✅ Form saved successfully:", form._id);

    return res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      message: 'Form submitted successfully',
      data: form,
    });

  } catch (error) {
    console.error("❌ FULL ERROR:", error);
    logger.error(`Create form error: ${error.message}`);

    // 🔥 HANDLE MONGOOSE VALIDATION ERRORS
    if (error.name === 'ValidationError') {
      const messages = Object.entries(error.errors)
        .map(([field, err]) => {
          if (err.kind === 'enum') {
            return `${field}: Invalid value "${err.value}". Allowed: ${err.enumValues?.join(', ') || 'N/A'}`;
          }
          return `${field}: ${err.message}`;
        });

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: messages.join(' | '),
        fields: Object.keys(error.errors),
      });
    }

    // 🔥 HANDLE DUPLICATE KEY ERROR
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(HTTP_STATUS.CONFLICT).json({
        status: 'error',
        message: `${field} already exists`,
      });
    }

    // 🔥 HANDLE CAST ERROR
    if (error.name === 'CastError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: `Invalid data type for field: ${error.path}`,
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Update form
// ─────────────────────────────────────────────────────────────────────────────
exports.updateForm = async (req, res) => {
  try {
    // 🔥 NORMALIZE DATA BEFORE UPDATE
    let normalizedData;
    try {
      normalizedData = normalizeFormData(req.body);
    } catch (normError) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: normError.message,
      });
    }

    const form = await FormData.findByIdAndUpdate(
      req.params.id,
      normalizedData,
      { new: true, runValidators: true }
    );

    if (!form) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND,
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: SUCCESS_MESSAGES.UPDATE_SUCCESS,
      data: form,
    });

  } catch (error) {
    console.error("❌ Update ERROR:", error);
    logger.error(`Update form error: ${error.message}`);

    if (error.name === 'ValidationError') {
      const messages = Object.entries(error.errors)
        .map(([field, err]) => `${field}: ${err.message}`);

      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: messages.join(' | '),
      });
    }

    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete form
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteForm = async (req, res) => {
  try {
    const form = await FormData.findByIdAndDelete(req.params.id);

    if (!form) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND,
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: SUCCESS_MESSAGES.DELETE_SUCCESS,
    });

  } catch (error) {
    logger.error(`Delete form error: ${error.message}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Check phone availability
// ─────────────────────────────────────────────────────────────────────────────
exports.checkPhoneAvailability = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const exists = await FormData.findOne({ phoneNumber });

    return res.status(HTTP_STATUS.OK).json({
      status: 'success',
      available: !exists,
    });

  } catch (error) {
    logger.error(`Check phone error: ${error.message}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR,
    });
  }
};