import Product from '../models/Product.js';
import Merchant from '../models/Merchant.js';
import ViewTracker from '../models/ViewTracker.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// ─── Helper: Build filter object ──────────────────
const buildProductFilter = (query) => {
  const filter = { status: 'active' };

  // Category filter
  if (query.category) {
    filter.category = query.category;
  }
  if (query.subcategory) {
    filter.subcategory = query.subcategory;
  }

  // Price range filter
  if (query.minPrice || query.maxPrice) {
    filter.price = {};
    if (query.minPrice) filter.price.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
  }

  // Rating filter
  if (query.minRating) {
    filter.rating = { $gte: Number(query.minRating) };
  }

  // Color filter
  if (query.color) {
    filter.colors = { $in: [query.color] };
  }

  // Size filter
  if (query.size) {
    filter.sizes = { $in: [query.size] };
  }

  // Quality/Material filter
  if (query.material) {
    filter['qualityDetails.value'] = { $regex: query.material, $options: 'i' };
  }

  // Merchant filter
  if (query.merchantId) {
    filter.merchant = query.merchantId;
  }

  // Stock filter
  if (query.inStock === 'true') {
    filter.stockStatus = { $in: ['in_stock', 'low_stock'] };
  }

  // Text search
  if (query.search) {
    filter.$text = { $search: query.search };
  }

  // Tags filter
  if (query.tags) {
    const tags = query.tags.split(',').map(t => t.trim());
    filter.tags = { $in: tags };
  }

  return filter;
};

// ─── Helper: Build sort object ────────────────────
const buildProductSort = (sortBy) => {
  switch (sortBy) {
    case 'price_low':
      return { price: 1 };
    case 'price_high':
      return { price: -1 };
    case 'rating':
      return { rating: -1, ratingCount: -1 };
    case 'newest':
      return { createdAt: -1 };
    case 'popular':
      return { viewCount: -1 };
    case 'name_asc':
      return { title: 1 };
    case 'name_desc':
      return { title: -1 };
    default:
      return { createdAt: -1 }; // Default: newest first
  }
};

// ════════════════════════════════════════════════
// PHASE 2: PRODUCT FEED & FILTERING ENGINE
// ════════════════════════════════════════════════

/**
 * @desc   Get product feed with advanced filtering
 * @route  GET /api/products
 * @access Public
 */
export const getProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = buildProductFilter(req.query);
  const sort = buildProductSort(req.query.sortBy);

  // Execute query with pagination
  const [products, totalCount] = await Promise.all([
    Product.find(filter)
      .populate('merchant', 'shopName shopLogo rating verificationStatus')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter),
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.status(200).json({
    success: true,
    products,
    pagination: {
      currentPage: page,
      totalPages,
      totalCount,
      limit,
      hasNextPage,
      hasPrevPage,
    },
  });
});

/**
 * @desc   Get single product with full details
 * @route  GET /api/products/:id
 * @access Public
 */
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('merchant', 'shopName shopLogo rating verificationStatus contactInfo address')
    .populate({
      path: 'reviews',
      populate: {
        path: 'user',
        select: 'fullName profileImage',
      },
      options: { sort: { createdAt: -1 } },
    });

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found.',
    });
  }

  // Increment view count
  product.viewCount += 1;
  await product.save();

  // Record view for analytics
  if (req.user || req.sessionId) {
    try {
      await ViewTracker.recordView({
        user: req.user?._id,
        sessionId: req.sessionId,
        product: product._id,
        merchant: product.merchant._id,
        category: product.category,
        source: req.query.source || 'direct',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    } catch (err) {
      console.error('View tracking error:', err);
    }
  }

  // Calculate share link
  const shareLink = `${process.env.CLIENT_URL}/product/${product._id}`;

  // Average rating calculation (already computed, but ensure accuracy)
  const avgRating = product.rating || 0;
  const reviewCount = product.reviews?.length || product.ratingCount || 0;

  res.status(200).json({
    success: true,
    product: {
      ...product.toObject(),
      shareLink,
      avgRating,
      reviewCount,
    },
  });
});

/**
 * @desc   Get product categories
 * @route  GET /api/products/categories
 * @access Public
 */
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Product.distinct('category', { status: 'active' });

  // Get subcategories for each category
  const categoryData = await Promise.all(
    categories.map(async (cat) => {
      const subcategories = await Product.distinct('subcategory', {
        category: cat,
        status: 'active',
      });
      const count = await Product.countDocuments({
        category: cat,
        status: 'active',
      });
      return {
        name: cat,
        count,
        subcategories: subcategories.filter(Boolean),
      };
    })
  );

  res.status(200).json({
    success: true,
    categories: categoryData,
  });
});

/**
 * @desc   Get available filters (colors, sizes, price ranges)
 * @route  GET /api/products/filters
 * @access Public
 */
export const getAvailableFilters = asyncHandler(async (req, res) => {
  const { category, subcategory } = req.query;
  const baseFilter = { status: 'active' };
  if (category) baseFilter.category = category;
  if (subcategory) baseFilter.subcategory = subcategory;

  const [colors, sizes, priceStats] = await Promise.all([
    Product.distinct('colors', baseFilter),
    Product.distinct('sizes', baseFilter),
    Product.aggregate([
      { $match: baseFilter },
      {
        $group: {
          _id: null,
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' },
          avgPrice: { $avg: '$price' },
        },
      },
    ]),
  ]);

  res.status(200).json({
    success: true,
    filters: {
      colors: colors.filter(Boolean),
      sizes: sizes.filter(Boolean),
      priceRange: priceStats[0] || { minPrice: 0, maxPrice: 0, avgPrice: 0 },
    },
  });
});

/**
 * @desc   Create a new product (Merchant only)
 * @route  POST /api/products
 * @access Private (Merchant)
 */
export const createProduct = asyncHandler(async (req, res) => {
  const merchantId = req.merchantId || req.body.merchantId;

  if (!merchantId) {
    return res.status(403).json({
      success: false,
      message: 'Merchant ID is required.',
    });
  }

  // Verify merchant exists and is verified
  const merchant = await Merchant.findById(merchantId);
  if (!merchant) {
    return res.status(404).json({
      success: false,
      message: 'Merchant not found.',
    });
  }

  if (merchant.verificationStatus !== 'verified') {
    return res.status(403).json({
      success: false,
      message: 'Your merchant account must be verified before adding products.',
    });
  }

  const productData = {
    ...req.body,
    merchant: merchantId,
    status: req.body.status || 'active',
  };

  // Auto-generate slug if not provided
  if (!productData.slug && productData.title) {
    productData.slug = productData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  const product = await Product.create(productData);

  res.status(201).json({
    success: true,
    message: 'Product created successfully.',
    product: await Product.findById(product._id)
      .populate('merchant', 'shopName shopLogo'),
  });
});

/**
 * @desc   Update a product (Merchant only)
 * @route  PUT /api/products/:id
 * @access Private (Merchant)
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found.',
    });
  }

  // Check ownership
  if (product.merchant.toString() !== req.merchantId?.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You can only update your own products.',
    });
  }

  // Update slug if title changed
  if (req.body.title && !req.body.slug) {
    req.body.slug = req.body.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('merchant', 'shopName shopLogo');

  res.status(200).json({
    success: true,
    message: 'Product updated successfully.',
    product: updatedProduct,
  });
});

/**
 * @desc   Delete a product (Merchant only)
 * @route  DELETE /api/products/:id
 * @access Private (Merchant)
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found.',
    });
  }

  // Check ownership
  if (product.merchant.toString() !== req.merchantId?.toString() && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You can only delete your own products.',
    });
  }

  await Product.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully.',
  });
});

/**
 * @desc   Get merchant's own products
 * @route  GET /api/products/my-products
 * @access Private (Merchant)
 */
export const getMyProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const merchantId = req.merchantId;

  if (!merchantId) {
    return res.status(403).json({
      success: false,
      message: 'Merchant profile not found.',
    });
  }

  const [products, totalCount] = await Promise.all([
    Product.find({ merchant: merchantId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments({ merchant: merchantId }),
  ]);

  res.status(200).json({
    success: true,
    products,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      limit,
    },
  });
});

export default {
  getProducts,
  getProduct,
  getCategories,
  getAvailableFilters,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
};
