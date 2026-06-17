import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Review from '../models/Review.js';
import Merchant from '../models/Merchant.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// ─── Valid status transitions ──────────────────
const validTransitions = {
  pending: ['accepted', 'rejected', 'cancelled'],
  accepted: ['packed', 'cancelled'],
  rejected: [], // Terminal state
  packed: ['shipping', 'cancelled'],
  shipping: ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered: ['returned'],
  cancelled: [], // Terminal state
  returned: [], // Terminal state
};

// ─── Helper: Check if status transition is valid ───
const isValidTransition = (currentStatus, newStatus) => {
  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

// ─── Helper: Get status timeline display ─────────
const getStatusDisplay = (status) => {
  const displays = {
    pending: { label: 'Pending', description: 'Waiting for merchant confirmation', color: 'yellow' },
    accepted: { label: 'Accepted', description: 'Merchant has accepted your order', color: 'blue' },
    rejected: { label: 'Rejected', description: 'Merchant rejected the order', color: 'red' },
    packed: { label: 'Packed', description: 'Order has been packed', color: 'indigo' },
    shipping: { label: 'Shipping', description: 'Order is on the way', color: 'purple' },
    out_for_delivery: { label: 'Out for Delivery', description: 'Arriving today', color: 'orange' },
    delivered: { label: 'Delivered', description: 'Order delivered successfully', color: 'green' },
    cancelled: { label: 'Cancelled', description: 'Order was cancelled', color: 'gray' },
    returned: { label: 'Returned', description: 'Order has been returned', color: 'gray' },
  };
  return displays[status] || { label: status, description: '', color: 'gray' };
};

// ════════════════════════════════════════════════
// PHASE 4: ORDER MANAGEMENT
// ════════════════════════════════════════════════

// ─── Buyer Order APIs ─────────────────────────

/**
 * @desc   Get buyer's orders with status-based grouping
 * @route  GET /api/orders
 * @access Private (Buyer)
 */
export const getMyOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = { buyer: req.user._id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, totalCount] = await Promise.all([
    Order.find(filter)
      .populate('merchant', 'shopName shopLogo')
      .populate('items.product', 'title images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(filter),
  ]);

  // Enhance orders with status display and delivery estimates
  const enhancedOrders = orders.map(order => ({
    ...order,
    statusDisplay: getStatusDisplay(order.status),
    isReviewable: order.status === 'delivered' && !order.review,
    canCancel: ['pending', 'accepted'].includes(order.status),
    deliveryEstimate: order.estimatedDeliveryDate
      ? getDeliveryEstimateText(order.estimatedDeliveryDate)
      : null,
  }));

  // Group by status for UI tabs
  const statusCounts = await Order.aggregate([
    { $match: { buyer: req.user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const groupedCounts = {
    all: totalCount,
    pending: 0,
    active: 0, // accepted + packed + shipping + out_for_delivery
    delivered: 0,
    cancelled: 0,
    returned: 0,
  };

  statusCounts.forEach(s => {
    groupedCounts[s._id] = s.count;
    if (['accepted', 'packed', 'shipping', 'out_for_delivery'].includes(s._id)) {
      groupedCounts.active += s.count;
    }
  });

  res.status(200).json({
    success: true,
    orders: enhancedOrders,
    statusCounts: groupedCounts,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      totalCount,
      limit: Number(limit),
    },
  });
});

/**
 * @desc   Get single order details
 * @route  GET /api/orders/:id
 * @access Private (Buyer)
 */
export const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({
    _id: req.params.id,
    buyer: req.user._id,
  })
    .populate('merchant', 'shopName shopLogo contactInfo address')
    .populate('items.product', 'title images price rating')
    .populate('buyer', 'fullName email phone');

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found.',
    });
  }

  res.status(200).json({
    success: true,
    order: {
      ...order.toObject(),
      statusDisplay: getStatusDisplay(order.status),
      isReviewable: order.status === 'delivered' && !order.review,
      canCancel: ['pending', 'accepted'].includes(order.status),
      deliveryEstimate: order.estimatedDeliveryDate
        ? getDeliveryEstimateText(order.estimatedDeliveryDate)
        : null,
    },
  });
});

/**
 * @desc   Cancel order (Buyer)
 * @route  PATCH /api/orders/:id/cancel
 * @access Private (Buyer)
 */
export const cancelOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const order = await Order.findOne({
    _id: req.params.id,
    buyer: req.user._id,
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found.',
    });
  }

  if (!['pending', 'accepted'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot cancel order in "${order.status}" status.`,
    });
  }

  // Restore stock
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      product.totalStock += item.quantity;
      if (product.stockStatus === 'out_of_stock' && product.totalStock > 0) {
        product.stockStatus = 'in_stock';
      }
      await product.save();
    }
  }

  // Refund wallet amount
  if (order.walletDeduction > 0) {
    const user = await User.findById(req.user._id);
    await user.addToWallet(order.walletDeduction);
  }

  await order.updateStatus('cancelled', reason || 'Cancelled by buyer', req.user._id);

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully.',
    refundAmount: order.walletDeduction,
  });
});

/**
 * @desc   Submit review for delivered order
 * @route  POST /api/orders/:id/review
 * @access Private (Buyer)
 */
export const submitReview = asyncHandler(async (req, res) => {
  const { rating, title, text, images } = req.body;

  if (!rating || !text) {
    return res.status(400).json({
      success: false,
      message: 'Rating and review text are required.',
    });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({
      success: false,
      message: 'Rating must be between 1 and 5.',
    });
  }

  const order = await Order.findOne({
    _id: req.params.id,
    buyer: req.user._id,
    status: 'delivered',
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Delivered order not found.',
    });
  }

  if (order.review) {
    return res.status(400).json({
      success: false,
      message: 'You have already reviewed this order.',
    });
  }

  // Save review to order
  order.review = {
    rating,
    text,
    images: images || [],
    createdAt: new Date(),
  };
  await order.save();

  // Create separate review entries for each product in the order
  for (const item of order.items) {
    await Review.create({
      product: item.product,
      user: req.user._id,
      order: order._id,
      merchant: order.merchant,
      rating,
      title: title || '',
      text,
      images: images || [],
    });
  }

  res.status(201).json({
    success: true,
    message: 'Review submitted successfully.',
    review: order.review,
  });
});

// ─── Merchant Dashboard APIs ──────────────────

/**
 * @desc   Get merchant's orders (dashboard)
 * @route  GET /api/orders/merchant/orders
 * @access Private (Merchant)
 */
export const getMerchantOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const merchantId = req.merchantId;

  const filter = { merchant: merchantId };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, totalCount] = await Promise.all([
    Order.find(filter)
      .populate('buyer', 'fullName email')
      .populate('items.product', 'title images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Order.countDocuments(filter),
  ]);

  // Status counts for dashboard stats
  const statusCounts = await Order.aggregate([
    { $match: { merchant: merchantId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts = {
    all: totalCount,
    pending: 0, accepted: 0, packed: 0, shipping: 0,
    out_for_delivery: 0, delivered: 0, rejected: 0, cancelled: 0, returned: 0,
  };
  statusCounts.forEach(s => { counts[s._id] = s.count; });

  res.status(200).json({
    success: true,
    orders: orders.map(order => ({
      ...order,
      statusDisplay: getStatusDisplay(order.status),
    })),
    counts,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      totalCount,
    },
  });
});

/**
 * @desc   Update order status (Accept/Reject/Packed/Shipping/Delivered)
 * @route  PATCH /api/orders/merchant/:orderId/status
 * @access Private (Merchant)
 */
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const merchantId = req.merchantId;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'New status is required.',
    });
  }

  const order = await Order.findOne({
    _id: req.params.orderId,
    merchant: merchantId,
  });

  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found.',
    });
  }

  // Validate status transition
  if (!isValidTransition(order.status, status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot transition from "${order.status}" to "${status}".`,
    });
  }

  // Handle rejection - restore stock
  if (status === 'rejected') {
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.totalStock += item.quantity;
        await product.save();
      }
    }
  }

  // Handle delivery - complete payment for COD
  if (status === 'delivered') {
    if (order.paymentMethod === 'cod') {
      order.paymentStatus = 'completed';
    }
    order.deliveredAt = new Date();
  }

  const statusNotes = {
    accepted: 'Order accepted by merchant',
    rejected: note || 'Order rejected by merchant',
    packed: 'Order has been packed',
    shipping: 'Order dispatched for delivery',
    out_for_delivery: 'Order is out for delivery today',
    delivered: 'Order delivered successfully',
  };

  await order.updateStatus(status, note || statusNotes[status], req.user._id);

  res.status(200).json({
    success: true,
    message: `Order status updated to "${getStatusDisplay(status).label}".`,
    order: {
      id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      statusDisplay: getStatusDisplay(order.status),
      trackingTimeline: order.trackingTimeline,
    },
  });
});

/**
 * @desc   Get merchant dashboard stats
 * @route  GET /api/orders/merchant/stats
 * @access Private (Merchant)
 */
export const getMerchantStats = asyncHandler(async (req, res) => {
  const merchantId = req.merchantId;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOrders,
    todayOrders,
    monthOrders,
    pendingOrders,
    revenueStats,
    statusBreakdown,
  ] = await Promise.all([
    Order.countDocuments({ merchant: merchantId }),
    Order.countDocuments({ merchant: merchantId, createdAt: { $gte: today } }),
    Order.countDocuments({ merchant: merchantId, createdAt: { $gte: thisMonth } }),
    Order.countDocuments({ merchant: merchantId, status: 'pending' }),
    Order.aggregate([
      { $match: { merchant: merchantId, paymentStatus: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalSales: { $sum: 1 },
          avgOrderValue: { $avg: '$totalPrice' },
        },
      },
    ]),
    Order.aggregate([
      { $match: { merchant: merchantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const stats = {
    totalOrders,
    todayOrders,
    monthOrders,
    pendingOrders,
    totalRevenue: revenueStats[0]?.totalRevenue || 0,
    totalSales: revenueStats[0]?.totalSales || 0,
    avgOrderValue: Math.round(revenueStats[0]?.avgOrderValue || 0),
    statusBreakdown: statusBreakdown.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {}),
  };

  res.status(200).json({
    success: true,
    stats,
  });
});

// ─── Helper Functions ─────────────────────────

function getDeliveryEstimateText(estimatedDate) {
  const now = new Date();
  const est = new Date(estimatedDate);
  const diffMs = est - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffHours <= 0) return { text: 'Arriving today', urgency: 'high' };
  if (diffDays === 1) return { text: 'Arriving tomorrow', urgency: 'medium' };
  if (diffDays <= 3) return { text: `Arriving in ${diffDays} days`, urgency: 'medium' };
  return {
    text: est.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    urgency: 'low',
  };
}

export default {
  getMyOrders,
  getOrder,
  cancelOrder,
  submitReview,
  getMerchantOrders,
  updateOrderStatus,
  getMerchantStats,
};
