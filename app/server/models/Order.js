import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productSnapshot: {
    title: { type: String, required: true },
    image: { type: String },
    price: { type: Number, required: true },
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  priceAtPurchase: {
    type: Number,
    required: true,
  },
  variant: {
    color: { type: String },
    size: { type: String },
  },
}, { _id: true });

const trackingEventSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'packed', 'shipping', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  note: {
    type: String,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, { _id: true });

const orderReviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  text: {
    type: String,
    maxlength: [2000, 'Review text cannot exceed 2000 characters'],
  },
  images: [{
    type: String,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { _id: true });

const orderSchema = new mongoose.Schema({
  // Order number for display
  orderNumber: {
    type: String,
    unique: true,
    index: true,
  },
  // Buyer
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Merchant
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true,
  },
  // Items
  items: [orderItemSchema],
  // Delivery Address
  deliveryAddress: {
    label: { type: String },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'India' },
    phone: { type: String },
  },
  // Price Breakdown
  subtotal: {
    type: Number,
    required: true,
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  platformFee: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
  },
  // Wallet
  walletDeduction: {
    type: Number,
    default: 0,
  },
  amountPaid: {
    type: Number,
    required: true,
  },
  // Payment
  paymentMethod: {
    type: String,
    enum: ['upi', 'card', 'cod', 'wallet', 'gift_voucher', 'mixed'],
    required: true,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
  },
  // Order Status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'packed', 'shipping', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
    default: 'pending',
    index: true,
  },
  // Tracking Timeline
  trackingTimeline: [trackingEventSchema],
  // Estimated delivery
  estimatedDeliveryDate: {
    type: Date,
  },
  // Actual delivery
  deliveredAt: {
    type: Date,
  },
  // Review (submitted after delivery)
  review: orderReviewSchema,
  // Cancellation reason
  cancellationReason: {
    type: String,
  },
  cancelledAt: {
    type: Date,
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Return request
  returnRequest: {
    reason: { type: String },
    requestedAt: { type: Date },
    status: { type: String, enum: ['requested', 'approved', 'rejected', 'completed'] },
    refundAmount: { type: Number },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for common queries
orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ merchant: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware to generate order number
orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const date = new Date();
    const prefix = 'ORD';
    const timestamp = date.getTime().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.orderNumber = `${prefix}-${timestamp}-${random}`;
  }

  // Initialize tracking timeline if new order
  if (this.isNew) {
    this.trackingTimeline.push({
      status: 'pending',
      timestamp: new Date(),
      note: 'Order placed successfully',
    });

    // Set estimated delivery (3-5 days from now)
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + Math.floor(Math.random() * 3) + 3);
    this.estimatedDeliveryDate = estDate;
  }

  next();
});

// Method to update order status
orderSchema.methods.updateStatus = async function (newStatus, note, updatedBy) {
  this.status = newStatus;
  this.trackingTimeline.push({
    status: newStatus,
    timestamp: new Date(),
    note,
    updatedBy,
  });

  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
    this.paymentStatus = 'completed';
  }

  if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
  }

  await this.save();
};

// Virtual for checking if reviewable
orderSchema.virtual('isReviewable').get(function () {
  return this.status === 'delivered' && !this.review;
});

// Virtual for delivery estimate text
orderSchema.virtual('deliveryEstimate').get(function () {
  if (!this.estimatedDeliveryDate) return null;
  const now = new Date();
  const est = new Date(this.estimatedDeliveryDate);
  const diffTime = est - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'Arriving today';
  if (diffDays === 1) return 'Arriving tomorrow';
  if (diffDays <= 3) return `Arriving in ${diffDays} days`;
  return est.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
