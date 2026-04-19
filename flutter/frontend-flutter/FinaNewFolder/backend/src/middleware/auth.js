const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.header('x-auth-token')) {
      token = req.header('x-auth-token');
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized to access this route. No token provided.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Handle different token formats
      const userId = decoded.id || decoded.user?.id || decoded.userId;

      if (!userId) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid token format'
        });
      }

      // Find user and attach to request
      const user = await User.findById(userId).select('-password');
      
      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'User not found or token is invalid'
        });
      }

      if (!user.isVerified) {
        return res.status(403).json({
          status: 'error',
          message: 'Please verify your account first'
        });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token has expired. Please login again.'
        });
      }
      
      return res.status(401).json({
        status: 'error',
        message: 'Token is not valid'
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Authentication error'
    });
  }
};

// Admin authentication middleware
exports.adminProtect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.header('x-auth-token')) {
      token = req.header('x-auth-token');
    }

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authorized. Admin access required.'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const adminId = decoded.id || decoded.user?.id || decoded.adminId;

      const admin = await Admin.findById(adminId).select('-password');

      if (!admin) {
        return res.status(401).json({
          status: 'error',
          message: 'Admin not found or token is invalid'
        });
      }

      if (admin.role !== 'admin' && admin.role !== 'superadmin') {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. Admin privileges required.'
        });
      }

      req.admin = admin;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token has expired. Please login again.'
        });
      }

      return res.status(401).json({
        status: 'error',
        message: 'Token is not valid'
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Authentication error'
    });
  }
};

// Super admin only middleware
exports.superAdminOnly = (req, res, next) => {
  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({
      status: 'error',
      message: 'Access denied. Super admin privileges required.'
    });
  }
  next();
};

// Check resource ownership
exports.checkOwnership = (req, res, next) => {
  const requestedUserId = req.params.id || req.params.userId;
  const authenticatedUserId = req.user._id.toString();

  if (requestedUserId !== authenticatedUserId) {
    return res.status(403).json({
      status: 'error',
      message: 'Not authorized to access this resource'
    });
  }

  next();
};