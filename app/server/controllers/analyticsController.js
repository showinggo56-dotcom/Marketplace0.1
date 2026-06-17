import ViewTracker from '../models/ViewTracker.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Merchant from '../models/Merchant.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import mongoose from 'mongoose';

// ════════════════════════════════════════════════
// PHASE 5: ANALYTICS & RECOMMENDATIONS
// ════════════════════════════════════════════════

/**
 * @desc   Get personalized product suggestions
 * @route  GET /api/suggestions
 * @access Private (uses user ID) or Public
 */
export const getSuggestions = asyncHandler(async (req, res) => {
  const { type = 'personalized', limit = 20 } = req.query;

  let suggestions = [];

  if (type === 'personalized' && req.user) {
    // Get user-specific recommendations
    suggestions = await getPersonalizedRecommendations(req.user._id, Number(limit));
  } else if (type === 'trending') {
    // Get trending products
    suggestions = await ViewTracker.getTrendingProducts(24, Number(limit));
  } else if (type === 'collaborative' && req.user) {
    // Collaborative filtering
    suggestions = await ViewTracker.getCollaborativeRecommendations(req.user._id, Number(limit));
  } else {
    // Fallback to popular products
    suggestions = await getPopularProducts(Number(limit));
  }

  // If we don't have enough suggestions, fill with popular products
  if (suggestions.length < Number(limit)) {
    const existingIds = suggestions.map(s => s.product?._id?.toString() || s._id?.toString());
    const popularProducts = await getPopularProducts(Number(limit) - suggestions.length);

    for (const product of popularProducts) {
      const id = product._id?.toString();
      if (!existingIds.includes(id)) {
        suggestions.push(product);
      }
    }
  }

  res.status(200).json({
    success: true,
    type: type || 'popular',
    count: suggestions.length,
    suggestions: suggestions.map(s => ({
      ...s.product,
      score: s.score,
      reason: s.reason,
      viewCount: s.viewCount,
    })),
  });
});

/**
 * @desc   Record a product view (called when viewing product)
 * @route  POST /api/analytics/view
 * @access Public (optional auth)
 */
export const recordView = asyncHandler(async (req, res) => {
  const { productId, category, source, viewDuration } = req.body;

  if (!productId) {
    return res.status(400).json({
      success: false,
      message: 'Product ID is required.',
    });
  }

  const product = await Product.findById(productId).select('merchant category');

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found.',
    });
  }

  await ViewTracker.recordView({
    user: req.user?._id,
    sessionId: req.sessionId || req.body.sessionId,
    product: productId,
    merchant: product.merchant,
    category: category || product.category,
    source: source || 'direct',
    viewDuration: viewDuration || 0,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Increment product view count
  await Product.findByIdAndUpdate(productId, { $inc: { viewCount: 1 } });

  res.status(200).json({
    success: true,
    message: 'View recorded.',
  });
});

/**
 * @desc   Get platform analytics (admin only)
 * @route  GET /api/analytics/platform
 * @access Private (Admin)
 */
export const getPlatformAnalytics = asyncHandler(async (req, res) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers,
    totalMerchants,
    totalProducts,
    totalOrders,
    ordersToday,
    revenueStats,
    topCategories,
    recentSignups,
  ] = await Promise.all([
    // Total users
    mongoose.model('User').countDocuments({ isActive: true }),

    // Total merchants
    Merchant.countDocuments({ isActive: true }),

    // Total products
    Product.countDocuments({ status: 'active' }),

    // Total orders
    Order.countDocuments(),

    // Orders today
    Order.countDocuments({ createdAt: { $gte: today } }),

    // Revenue stats
    Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalPrice' },
          walletRevenue: { $sum: '$walletDeduction' },
        },
      },
    ]),

    // Top categories by views
    ViewTracker.aggregate([
      { $match: { createdAt: { $gte: thisMonth } } },
      {
        $group: {
          _id: '$category',
          views: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
      {
        $addFields: {
          uniqueUserCount: { $size: '$uniqueUsers' },
        },
      },
    ]),

    // Recent user signups
    mongoose.model('User').find({})
      .select('fullName email createdAt role')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
  ]);

  // Weekly order trend
  const weeklyTrend = await Order.aggregate([
    { $match: { createdAt: { $gte: thisWeek } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        orders: { $sum: 1 },
        revenue: { $sum: '$totalPrice' },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  res.status(200).json({
    success: true,
    analytics: {
      overview: {
        totalUsers,
        totalMerchants,
        totalProducts,
        totalOrders,
        ordersToday,
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        avgOrderValue: Math.round(revenueStats[0]?.avgOrderValue || 0),
        walletRevenue: revenueStats[0]?.walletRevenue || 0,
      },
      topCategories: topCategories.map(c => ({
        category: c._id,
        views: c.views,
        uniqueUsers: c.uniqueUserCount,
      })),
      weeklyTrend,
      recentSignups,
    },
  });
});

/**
 * @desc   Get user's browsing history
 * @route  GET /api/analytics/my-history
 * @access Private
 */
export const getMyBrowsingHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [views, totalCount] = await Promise.all([
    ViewTracker.find({ user: req.user._id })
      .populate('product', 'title images price rating stockStatus')
      .populate('merchant', 'shopName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ViewTracker.countDocuments({ user: req.user._id }),
  ]);

  // Get category preferences
  const preferences = await ViewTracker.getUserCategoryPreferences(req.user._id, 10);

  res.status(200).json({
    success: true,
    views,
    preferences: preferences.map(p => ({
      category: p._id,
      viewCount: p.viewCount,
      totalDuration: p.totalDuration,
    })),
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      totalCount,
    },
  });
});

// ─── Helper Functions ─────────────────────────

async function getPersonalizedRecommendations(userId, limit = 20) {
  // Get user's most viewed categories
  const categoryPreferences = await ViewTracker.getUserCategoryPreferences(userId, 5);

  if (categoryPreferences.length === 0) {
    return getPopularProducts(limit);
  }

  // Find products in preferred categories
  const topCategories = categoryPreferences.map(c => c._id);

  const products = await Product.find({
    category: { $in: topCategories },
    status: 'active',
  })
    .populate('merchant', 'shopName shopLogo rating')
    .sort({ rating: -1, viewCount: -1 })
    .limit(limit * 2)
    .lean();

  // Get products the user has already viewed
  const viewedProductIds = await ViewTracker.distinct('product', { user: userId });
  const viewedSet = new Set(viewedProductIds.map(id => id.toString()));

  // Filter out viewed products and score
  const scoredProducts = products
    .filter(p => !viewedSet.has(p._id.toString()))
    .map(product => {
      const categoryRank = topCategories.indexOf(product.category);
      const score = Math.max(1, 5 - categoryRank) * (product.rating || 3);
      return { product, score, reason: 'Based on your browsing' };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scoredProducts;
}

async function getPopularProducts(limit = 20) {
  const products = await Product.find({ status: 'active' })
    .populate('merchant', 'shopName shopLogo rating')
    .sort({ viewCount: -1, rating: -1 })
    .limit(limit)
    .lean();

  return products.map(product => ({
    product,
    score: product.viewCount,
    reason: 'Popular',
    viewCount: product.viewCount,
  }));
}

export default {
  getSuggestions,
  recordView,
  getPlatformAnalytics,
  getMyBrowsingHistory,
};
