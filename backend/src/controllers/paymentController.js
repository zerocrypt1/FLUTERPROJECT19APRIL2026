
// ============================================
// src/controllers/paymentController.js
// ============================================
const paymentService = require('../services/paymentService');
const Payment = require('../models/Payment');

// Create Stripe payment
exports.createStripePayment = async (req, res) => {
  try {
    const { amount, currency = 'USD', description } = req.body;

    const result = await paymentService.createStripePayment(amount, currency, {
      userId: req.user._id.toString(),
      description
    });

    // Save payment record
    const payment = await paymentService.savePayment({
      userId: req.user._id,
      amount,
      currency,
      paymentMethod: 'card',
      paymentGateway: 'stripe',
      gatewayPaymentId: result.paymentIntentId,
      status: 'pending',
      description,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      data: {
        clientSecret: result.clientSecret,
        paymentId: payment._id
      }
    });

  } catch (error) {
    logger.error(`Stripe payment error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Payment creation failed'
    });
  }
};

// Create Razorpay order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;

    const receipt = Helpers.generateReceiptNumber('ORD');
    const result = await paymentService.createRazorpayOrder(amount, currency, receipt);

    // Save payment record
    const payment = await paymentService.savePayment({
      userId: req.user._id,
      amount,
      currency,
      paymentMethod: 'razorpay',
      paymentGateway: 'razorpay',
      gatewayPaymentId: result.orderId,
      gatewayOrderId: result.orderId,
      status: 'pending',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      data: {
        orderId: result.orderId,
        amount: result.amount,
        currency: result.currency,
        paymentId: payment._id,
        keyId: process.env.RAZORPAY_KEY_ID
      }
    });

  } catch (error) {
    logger.error(`Razorpay order error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Order creation failed'
    });
  }
};

// Verify Razorpay payment
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { orderId, paymentId, signature } = req.body;

    const isValid = paymentService.verifyRazorpaySignature(orderId, paymentId, signature);

    if (!isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: 'error',
        message: 'Invalid payment signature'
      });
    }

    // Update payment status
    const payment = await Payment.findOneAndUpdate(
      { gatewayOrderId: orderId },
      {
        status: 'completed',
        gatewayPaymentId: paymentId,
        paymentDate: new Date()
      },
      { new: true }
    );

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      message: SUCCESS_MESSAGES.PAYMENT_SUCCESS,
      data: payment
    });

  } catch (error) {
    logger.error(`Verify payment error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Payment verification failed'
    });
  }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId: req.user._id };
    if (status) query.status = status;

    const { skip, limit: limitNum } = Helpers.paginate(page, limit);

    const payments = await Payment.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Payment.countDocuments(query);

    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      data: payments,
      pagination: Helpers.getPaginationMeta(total, parseInt(page), limitNum)
    });

  } catch (error) {
    logger.error(`Get payment history error: ${error.message}`);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: ERROR_MESSAGES.SERVER_ERROR
    });
  }
};