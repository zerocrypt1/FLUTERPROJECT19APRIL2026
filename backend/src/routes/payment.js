// src/routes/payment.js
// ============================================
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const validation = require('../middleware/validation');
const { body, query } = require('express-validator');

// Validation rules
const createPaymentValidation = [
  body('amount')
    .notEmpty().withMessage('Amount is required')
    .isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('currency')
    .optional()
    .isIn(['USD', 'INR', 'EUR', 'GBP']).withMessage('Invalid currency'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters')
];

const verifyRazorpayValidation = [
  body('orderId')
    .notEmpty().withMessage('Order ID is required'),
  body('paymentId')
    .notEmpty().withMessage('Payment ID is required'),
  body('signature')
    .notEmpty().withMessage('Signature is required')
];

const getHistoryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'])
    .withMessage('Invalid status')
];

// All payment routes require authentication
router.use(protect);

// Stripe routes
router.post('/stripe/create', paymentLimiter, createPaymentValidation, validation.handleValidationErrors, paymentController.createStripePayment);

// Razorpay routes
router.post('/razorpay/create', paymentLimiter, createPaymentValidation, validation.handleValidationErrors, paymentController.createRazorpayOrder);
router.post('/razorpay/verify', verifyRazorpayValidation, validation.handleValidationErrors, paymentController.verifyRazorpayPayment);

// Payment history
router.get('/history', getHistoryValidation, validation.handleValidationErrors, paymentController.getPaymentHistory);

// Webhook routes (public - but verified by signature)
// These should be in separate route file or handled differently
// router.post('/stripe/webhook', paymentController.stripeWebhook);
// router.post('/razorpay/webhook', paymentController.razorpayWebhook);

module.exports = router;