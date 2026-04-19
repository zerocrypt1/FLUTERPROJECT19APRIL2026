const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const emailService = require('../services/emailService');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

// @desc    Admin signup - Sends credentials to super admin email
// @route   POST /api/v1/admin/signup
// @access  Public
exports.adminSignup = async (req, res) => {
  try {
    const { email, username } = req.body;

    // Check if admin already exists
    let admin = await Admin.findOne({ $or: [{ email }, { username }] });
    
    if (admin) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        status: 'error',
        message: 'Admin with this email or username already exists'
      });
    }

    // Generate secure random password
    const tempPassword = Helpers.generateSecurePassword(16);

    // Create new admin
    admin = new Admin({
      username,
      email,
      password: tempPassword, // Will be hashed by pre-save hook
      role: 'admin',
      isActive: true,
      permissions: ['read', 'write']
    });

    await admin.save();

    // Send credentials to super admin email
    await emailService.sendAdminSignupNotification(email, tempPassword);

    logger.info(`New admin created: ${email}`);

    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      message: 'Admin account created successfully. Credentials have been sent to the super admin email.',
      data: {
        email: admin.email,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    logger.error(`Admin signup error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// @desc    Admin login
// @route   POST /api/v1/admin/login
// @access  Public
exports.adminLogin = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Find admin by username or email
    const admin = await Admin.findOne({
      $or: [{ username }, { email }]
    }).select('+password');

    if (!admin) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: ERROR_MESSAGES.INVALID_CREDENTIALS
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: 'error',
        message: 'Admin account is deactivated. Contact super admin.'
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: ERROR_MESSAGES.INVALID_CREDENTIALS
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '30d' }
    );

    logger.info(`Admin logged in: ${admin.username}`);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
      token,
      admin: admin.toCleanObject()
    });

  } catch (error) {
    logger.error(`Admin login error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// @desc    Create new admin (Super admin only)
// @route   POST /api/v1/admin/create
// @access  Private (Super Admin)
exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password, role, permissions } = req.body;

    // Check if admin already exists
    let admin = await Admin.findOne({ $or: [{ email }, { username }] });
    
    if (admin) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        status: 'error',
        message: 'Admin with this email or username already exists'
      });
    }

    // Create new admin
    admin = new Admin({
      username,
      email,
      password, // Will be hashed by pre-save hook
      role: role || 'admin',
      permissions: permissions || ['read', 'write'],
      createdBy: req.admin._id
    });

    await admin.save();

    logger.info(`Admin created by super admin: ${admin.username}`);

    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      message: 'Admin created successfully',
      admin: admin.toCleanObject()
    });

  } catch (error) {
    logger.error(`Create admin error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// @desc    Get all admins
// @route   GET /api/v1/admin/list
// @access  Private (Admin)
exports.getAllAdmins = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Pagination
    const { skip, limit: limitNum } = Helpers.paginate(page, limit);

    // Fetch admins
    const admins = await Admin.find(query)
      .select('-password')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Admin.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: admins,
      pagination: Helpers.getPaginationMeta(total, parseInt(page), limitNum)
    });

  } catch (error) {
    logger.error(`Get admins error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// @desc    Get single admin
// @route   GET /api/v1/admin/:id
// @access  Private (Admin)
exports.getAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-password');

    if (!admin) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND
      });
    }

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: admin
    });

  } catch (error) {
    logger.error(`Get admin error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// @desc    Update admin
// @route   PUT /api/v1/admin/:id
// @access  Private (Super Admin)
exports.updateAdmin = async (req, res) => {
  try {
    const { username, email, role, permissions, isActive } = req.body;

    // Don't allow updating password through this endpoint
    const updateData = Helpers.removeEmpty({
      username,
      email,
      role,
      permissions,
      isActive
    });

    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND
      });
    }

    logger.info(`Admin updated: ${admin.username}`);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: SUCCESS_MESSAGES.UPDATE_SUCCESS,
      admin: admin.toCleanObject()
    });

  } catch (error) {
    logger.error(`Update admin error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// @desc    Delete admin
// @route   DELETE /api/v1/admin/:id
// @access  Private (Super Admin)
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND
      });
    }

    // Prevent deleting super admin
    if (admin.role === 'superadmin') {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: 'error',
        message: 'Cannot delete super admin account'
      });
    }

    await admin.deleteOne();

    logger.info(`Admin deleted: ${admin.username}`);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: SUCCESS_MESSAGES.DELETE_SUCCESS
    });

  } catch (error) {
    logger.error(`Delete admin error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// @desc    Change admin password
// @route   PUT /api/v1/admin/:id/password
// @access  Private (Admin - own account)
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const admin = await Admin.findById(req.params.id).select('+password');

    if (!admin) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND
      });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Update password
    admin.password = newPassword; // Will be hashed by pre-save hook
    await admin.save();

    logger.info(`Admin password changed: ${admin.username}`);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: SUCCESS_MESSAGES.PASSWORD_CHANGED
    });

  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};