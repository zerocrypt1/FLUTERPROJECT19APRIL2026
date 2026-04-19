const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'razorpay', 'paypal', 'card', 'upi', 'netbanking'],
    required: [true, 'Payment method is required']
  },
  paymentGateway: {
    type: String,
    enum: ['stripe', 'razorpay'],
    required: [true, 'Payment gateway is required']
  },
  gatewayPaymentId: {
    type: String,
    required: [true, 'Gateway payment ID is required'],
    unique: true
  },
  gatewayOrderId: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  receiptUrl: {
    type: String
  },
  refundId: {
    type: String
  },
  refundAmount: {
    type: Number
  },
  refundReason: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  customerDetails: {
    name: String,
    email: String,
    phone: String
  },
  billingAddress: {
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from creation
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ userId: 1 });
paymentSchema.index({ gatewayPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `${this.currency} ${this.amount.toFixed(2)}`;
});

// Check if payment is expired
paymentSchema.methods.isExpired = function() {
  return this.expiresAt < new Date() && this.status === 'pending';
};

module.exports = mongoose.model('Payment', paymentSchema);