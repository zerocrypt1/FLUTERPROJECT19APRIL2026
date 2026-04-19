// ============================================
// src/controllers/userController.js
// ============================================
const User = require('../models/User');
const FormData = require('../models/FormData');
const Helpers = require('../utils/helpers');
const logger = require('../utils/logger');
const { HTTP_STATUS, ERROR_MESSAGES, SUCCESS_MESSAGES } = require('../utils/constants');

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('favorites');

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND
      });
    }

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: user.toCleanObject()
    });

  } catch (error) {
    logger.error(`Get user profile error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const updateData = Helpers.removeEmpty({ name, phone, address });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND
      });
    }

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: SUCCESS_MESSAGES.UPDATE_SUCCESS,
      data: user.toCleanObject()
    });

  } catch (error) {
    logger.error(`Update user profile error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// Update user location
exports.updateUserLocation = async (req, res) => {
  try {
    const { latitude, longitude, address, city, state, country, pinCode } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        location: Helpers.removeEmpty({
          latitude,
          longitude,
          address,
          city,
          state,
          country,
          pinCode
        })
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND
      });
    }

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'Location updated successfully',
      data: { location: user.location }
    });

  } catch (error) {
    logger.error(`Update location error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.params.id).select('+password');

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: ERROR_MESSAGES.NOT_FOUND
      });
    }

    // Verify current password
    if (user.password) {
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          status: 'error',
          message: 'Current password is incorrect'
        });
      }
    }

    // Update password
    user.password = newPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

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

// Add to favorites
exports.addToFavorites = async (req, res) => {
  try {
    const { applicantId } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }

    const applicant = await FormData.findById(applicantId);
    if (!applicant) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: 'Applicant not found'
      });
    }

    if (!user.favorites.includes(applicantId)) {
      user.favorites.push(applicantId);
      await user.save();
    }

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'Added to favorites',
      favorites: user.favorites
    });

  } catch (error) {
    logger.error(`Add to favorites error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// Remove from favorites
exports.removeFromFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }

    user.favorites = user.favorites.filter(
      id => id.toString() !== req.params.applicantId
    );
    await user.save();

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: 'Removed from favorites',
      favorites: user.favorites
    });

  } catch (error) {
    logger.error(`Remove from favorites error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};

// Get user favorites
exports.getUserFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('favorites');
    
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: user.favorites
    });

  } catch (error) {
    logger.error(`Get favorites error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};