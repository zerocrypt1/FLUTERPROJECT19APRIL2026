// ============================================
// src/services/paymentService.js
// ============================================
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Razorpay = require('razorpay');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

class PaymentService {
  // Create Stripe payment intent
  async createStripePayment(amount, currency, metadata) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: { enabled: true }
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      logger.error(`Stripe payment creation failed: ${error.message}`);
      throw error;
    }
  }

  // Create Razorpay order
  async createRazorpayOrder(amount, currency, receipt) {
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: currency.toUpperCase(),
        receipt,
        payment_capture: 1
      });

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      };
    } catch (error) {
      logger.error(`Razorpay order creation failed: ${error.message}`);
      throw error;
    }
  }

  // Verify Razorpay payment signature
  verifyRazorpaySignature(orderId, paymentId, signature) {
    const crypto = require('crypto');
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return generated_signature === signature;
  }

  // Save payment record
  async savePayment(paymentData) {
    try {
      const payment = new Payment(paymentData);
      await payment.save();
      return payment;
    } catch (error) {
      logger.error(`Failed to save payment: ${error.message}`);
      throw error;
    }
  }

  // Process refund
  async processRefund(paymentId, amount, reason) {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Only completed payments can be refunded');
      }

      let refund;
      
      if (payment.paymentGateway === 'stripe') {
        refund = await stripe.refunds.create({
          payment_intent: payment.gatewayPaymentId,
          amount: amount ? Math.round(amount * 100) : undefined
        });
      } else if (payment.paymentGateway === 'razorpay') {
        refund = await razorpay.payments.refund(payment.gatewayPaymentId, {
          amount: amount ? Math.round(amount * 100) : undefined
        });
      }

      // Update payment record
      payment.status = 'refunded';
      payment.refundId = refund.id;
      payment.refundAmount = amount || payment.amount;
      payment.refundReason = reason;
      await payment.save();

      return { success: true, refund, payment };
    } catch (error) {
      logger.error(`Refund processing failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new PaymentService();