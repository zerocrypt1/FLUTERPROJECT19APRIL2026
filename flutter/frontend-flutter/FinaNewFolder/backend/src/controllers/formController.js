// src/controllers/formController.js

// --- Backend Dependencies ---
const FormData = require('../models/FormData'); // Mongoose Model for employee data
const User = require('../models/User'); // Mongoose Model for general users (for favorite cleanup)
const Helpers = require('../utils/helpers'); // Pagination and utility helpers
const logger = require('../utils/logger'); // Centralized logger
const { 
  HTTP_STATUS, 
  ERROR_MESSAGES, 
  SUCCESS_MESSAGES 
} = require('../utils/constants'); // Status codes and messages
// ----------------------------

// ============================================
// Get all form data (Pagination, Search, Filter)
// @route GET /forms
// @access Private (Admin)
exports.getAllForms = async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        verificationStatus,
        city,
        state,
        pinCode,
        search,
        // ADDED GENDER FILTER for list queries
        gender
      } = req.query;
  
      // Build query object
      const query = {};
      if (status) query.status = status;
      if (verificationStatus) query.verificationStatus = verificationStatus;
      
      // Use case-insensitive regex for string filters
      if (city) query.city = new RegExp(city, 'i');
      if (state) query.state = new RegExp(state, 'i');
      if (gender) query.gender = new RegExp(gender, 'i'); // Apply gender filter
      if (pinCode) query.pinCode = pinCode;
      
      // Full-text search across multiple fields
      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { phoneNumber: new RegExp(search, 'i') },
          { occupation: new RegExp(search, 'i') }
        ];
      }
  
      // Pagination logic
      const { skip, limit: limitNum } = Helpers.paginate(page, limit);
  
      const forms = await FormData.find(query)
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 });
  
      const total = await FormData.countDocuments(query);
  
      res.status(HTTP_STATUS.OK).json({
        success: true, // Frontend expects a 'success' boolean
        data: forms,
        pagination: Helpers.getPaginationMeta(total, parseInt(page), limitNum)
      });
  
    } catch (error) {
      logger.error(`Get forms error: ${error.message}`);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
};
  
// Get single form
// @route GET /forms/:id
// @access Private (Admin)
exports.getFormById = async (req, res) => {
    try {
      const form = await FormData.findById(req.params.id);
  
      if (!form) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          status: 'error',
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }
  
      res.status(HTTP_STATUS.OK).json({
        success: true, // Frontend expects a 'success' boolean
        data: form
      });
  
    } catch (error) {
      logger.error(`Get form error: ${error.message}`);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
};
  
// Create form
// @route POST /forms
// @access Private (Admin)
exports.createForm = async (req, res) => {
    try {
      // 1. Check if phone number already exists
      const existingForm = await FormData.findOne({ phoneNumber: req.body.phoneNumber });
      
      if (existingForm) {
        return res.status(HTTP_STATUS.CONFLICT).json({
          status: 'error',
          message: 'Phone number already registered'
        });
      }
  
      // 2. Create the new form
      // NOTE: req.body contains all fields from the frontend, including 'gender' and 'timming'.
      // The spread operator ensures these fields are passed to the model.
      const form = new FormData({
        ...req.body,
        // Assuming the authentication middleware sets req.user (Admin/User)
        submittedBy: req.user ? req.user._id : null 
      });
  
      await form.save();
  
      res.status(HTTP_STATUS.CREATED).json({
        status: 'success',
        message: 'Form submitted successfully (including gender and time slots)',
        data: form
      });
  
    } catch (error) {
      logger.error(`Create form error: ${error.message}`);
      // Handle potential Mongoose validation errors
      const status = error.name === 'ValidationError' ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        status: 'error',
        message: error.message || ERROR_MESSAGES.SERVER_ERROR
      });
    }
};
  
// Update form
// @route PUT /forms/:id
// @access Private (Admin)
exports.updateForm = async (req, res) => {
    try {
      // 1. If updating phone number, check for conflicts
      if (req.body.phoneNumber) {
        const existingForm = await FormData.findOne({
          phoneNumber: req.body.phoneNumber,
          _id: { $ne: req.params.id } // Exclude current document
        });
  
        if (existingForm) {
          return res.status(HTTP_STATUS.CONFLICT).json({
            status: 'error',
            message: 'Phone number already registered'
          });
        }
      }
  
      // 2. Update the form
      // NOTE: req.body contains all fields from the frontend, including 'gender' and 'timming'.
      const form = await FormData.findByIdAndUpdate(
        req.params.id,
        req.body, // This handles saving gender and timming
        { new: true, runValidators: true } // Return the new document and run schema validators
      );
  
      if (!form) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          status: 'error',
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }
  
      res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: SUCCESS_MESSAGES.UPDATE_SUCCESS,
        data: form
      });
  
    } catch (error) {
      logger.error(`Update form error: ${error.message}`);
      const status = error.name === 'ValidationError' ? HTTP_STATUS.BAD_REQUEST : HTTP_STATUS.INTERNAL_SERVER_ERROR;
      res.status(status).json({
        status: 'error',
        message: error.message || ERROR_MESSAGES.SERVER_ERROR
      });
    }
};
  
// Delete form
// @route DELETE /forms/:id
// @access Private (Admin)
exports.deleteForm = async (req, res) => {
    try {
      const form = await FormData.findByIdAndDelete(req.params.id);
  
      if (!form) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          status: 'error',
          message: ERROR_MESSAGES.NOT_FOUND
        });
      }
  
      // Cleanup: Remove form ID from all users' favorites (Requires User model)
      if (User) {
        await User.updateMany(
          { favorites: req.params.id },
          { $pull: { favorites: req.params.id } }
        );
      }
  
      res.status(HTTP_STATUS.OK).json({
        status: 'success',
        message: SUCCESS_MESSAGES.DELETE_SUCCESS
      });
  
    } catch (error) {
      logger.error(`Delete form error: ${error.message}`);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
};
  
// Check phone availability
// @route POST /forms/check-phone
// @access Public
exports.checkPhoneAvailability = async (req, res) => {
    try {
      const { phoneNumber } = req.body;
  
      const exists = await FormData.findOne({ phoneNumber });
  
      res.status(HTTP_STATUS.OK).json({
        status: 'success',
        available: !exists,
        message: exists ? 'Phone number already registered' : 'Phone number available'
      });
  
    } catch (error) {
      logger.error(`Check phone error: ${error.message}`);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        status: 'error',
        message: ERROR_MESSAGES.SERVER_ERROR
      });
    }
};