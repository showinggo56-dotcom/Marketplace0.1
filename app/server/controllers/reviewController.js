import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc   Get reviews for a product
 * @route  GET /api/reviews/product/:productId
 * @access Public
 */
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, sortBy = 'newest' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  // Build sort
  let sort = {};
  switch (sortBy) {
    case 'newest': sort = { createdAt: -1 }; break;
    case 'oldest': sort = { createdAt: 1 }; break;
    case 'highest': sort = { rating: -1 }; break;
    case 'lowest': sort = { rating: 1 }; break;
    case 'helpful': sort = { helpful: -1 }; break;
    default: sort = { createdAt: -1 };
  }

  const [reviews, totalCount, ratingStats] = await Promise.all([
    Review.find({ product: productId, isApproved: true })
      .populate('user', 'fullName profileImage')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Review.countDocuments({ product: productId, isApproved: true }),
    Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(productId), isApproved: true } },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]),
  ]);

  // Calculate rating distribution
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalRatingSum = 0;
  ratingStats.forEach(stat => {
    distribution[stat._id] = stat.count;
    totalRatingSum += stat._id * stat.count;
  });

  const avgRating = totalCount > 0 ? (totalRatingSum / totalCount).toFixed(1) : 0;

  res.status(200).json({
    success: true,
    reviews,
    ratingSummary: {
      average: Number(avgRating),
      total: totalCount,
      distribution,
    },
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      totalCount,
    },
  });
});

/**
 * @desc   Get reviews for a merchant
 * @route  GET /api/reviews/merchant/:merchantId
 * @access Public
 */
export const getMerchantReviews = asyncHandler(async (req, res) => {
  const { merchantId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);

  const [reviews, totalCount] = await Promise.all([
    Review.find({ merchant: merchantId, isApproved: true })
      .populate('user', 'fullName profileImage')
      .populate('product', 'title images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Review.countDocuments({ merchant: merchantId, isApproved: true }),
  ]);

  res.status(200).json({
    success: true,
    reviews,
    pagination: {
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
      totalCount,
    },
  });
});

/**
 * @desc   Mark review as helpful
 * @route  POST /api/reviews/:reviewId/helpful
 * @access Private
 */
export const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.reviewId);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found.',
    });
  }

  // Check if user already voted
  if (review.helpfulVoters.includes(req.user._id)) {
    // Remove vote
    review.helpfulVoters = review.helpfulVoters.filter(
      id => id.toString() !== req.user._id.toString()
    );
    review.helpful -= 1;
  } else {
    // Add vote
    review.helpfulVoters.push(req.user._id);
    review.helpful += 1;
  }

  await review.save();

  res.status(200).json({
    success: true,
    message: 'Review marked as helpful.',
    helpful: review.helpful,
  });
});

/**
 * @desc   Merchant response to a review
 * @route  POST /api/reviews/:reviewId/response
 * @access Private (Merchant)
 */
export const addMerchantResponse = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Response text is required.',
    });
  }

  const review = await Review.findById(req.params.reviewId);

  if (!review) {
    return res.status(404).json({
      success: false,
      message: 'Review not found.',
    });
  }

  // Verify the review belongs to this merchant
  if (review.merchant.toString() !== req.merchantId?.toString()) {
    return res.status(403).json({
      success: false,
      message: 'You can only respond to reviews of your own products.',
    });
  }

  review.merchantResponse = {
    text,
    respondedAt: new Date(),
  };

  await review.save();

  res.status(200).json({
    success: true,
    message: 'Response added successfully.',
    merchantResponse: review.merchantResponse,
  });
});

export default {
  getProductReviews,
  getMerchantReviews,
  markHelpful,
  addMerchantResponse,
};
