import mongoose from 'mongoose';

const viewEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  // Guest tracking (when user is not logged in)
  sessionId: {
    type: String,
    index: true,
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
  },
  category: {
    type: String,
    index: true,
  },
  // View metadata
  viewDuration: {
    type: Number, // in seconds
    default: 0,
  },
  source: {
    type: String,
    enum: ['search', 'category', 'recommendation', 'direct', 'merchant_page'],
    default: 'direct',
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
}, {
  timestamps: true,
});

// Compound indexes for analytics queries
viewEventSchema.index({ product: 1, createdAt: -1 });
viewEventSchema.index({ user: 1, createdAt: -1 });
viewEventSchema.index({ category: 1, createdAt: -1 });
viewEventSchema.index({ merchant: 1, createdAt: -1 });
viewEventSchema.index({ createdAt: -1 });

// Static method to record a view
viewEventSchema.statics.recordView = async function (data) {
  return await this.create(data);
};

// Static method to get popular categories for a user
viewEventSchema.statics.getUserCategoryPreferences = async function (userId, limit = 5) {
  const results = await this.aggregate([
    { $match: { user: userId } },
    {
      $group: {
        _id: '$category',
        viewCount: { $sum: 1 },
        totalDuration: { $sum: '$viewDuration' },
      },
    },
    { $sort: { viewCount: -1, totalDuration: -1 } },
    { $limit: limit },
  ]);
  return results;
};

// Static method to get trending products
viewEventSchema.statics.getTrendingProducts = async function (hours = 24, limit = 20) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return await this.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: '$product',
        viewCount: { $sum: 1 },
        uniqueViewers: { $addToSet: '$user' },
      },
    },
    {
      $addFields: {
        uniqueViewerCount: { $size: '$uniqueViewers' },
      },
    },
    { $sort: { viewCount: -1, uniqueViewerCount: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $match: {
        'product.status': 'active',
      },
    },
    {
      $project: {
        _id: 0,
        product: 1,
        viewCount: 1,
        uniqueViewerCount: 1,
      },
    },
  ]);
};

// Static method to get frequently viewed products by similar users
viewEventSchema.statics.getCollaborativeRecommendations = async function (userId, limit = 10) {
  // Find users who viewed the same products
  const userProducts = await this.distinct('product', { user: userId });

  if (userProducts.length === 0) return [];

  // Find other users who viewed those products
  const similarUsers = await this.distinct('user', {
    product: { $in: userProducts },
    user: { $ne: userId },
  });

  if (similarUsers.length === 0) return [];

  // Get products viewed by similar users but not by current user
  return await this.aggregate([
    {
      $match: {
        user: { $in: similarUsers },
        product: { $nin: userProducts },
      },
    },
    {
      $group: {
        _id: '$product',
        score: { $sum: 1 },
      },
    },
    { $sort: { score: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product',
      },
    },
    { $unwind: '$product' },
    {
      $match: {
        'product.status': 'active',
      },
    },
    {
      $project: {
        _id: 0,
        product: 1,
        score: 1,
      },
    },
  ]);
};

const ViewTracker = mongoose.model('ViewTracker', viewEventSchema);
export default ViewTracker;
