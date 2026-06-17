import mongoose from 'mongoose';

const qualityDetailSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
}, { _id: true });

const variantSchema = new mongoose.Schema({
  color: { type: String, required: true },
  size: { type: String },
  sku: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, default: 0, min: 0 },
  images: [{ type: String }],
}, { _id: true });

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
    index: 'text',
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [500, 'Subtitle cannot exceed 500 characters'],
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [10000, 'Description cannot exceed 10000 characters'],
  },
  images: [{
    type: String,
    required: true,
  }],
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative'],
  },
  comparePrice: {
    type: Number,
    min: [0, 'Compare price cannot be negative'],
  },
  currency: {
    type: String,
    default: 'INR',
  },
  // Category system: e.g., "Clothing > Shirts > Long Sleeve"
  category: {
    type: String,
    required: [true, 'Category is required'],
    index: true,
  },
  subcategory: {
    type: String,
    index: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  // Quality details (material, fabric, etc.)
  qualityDetails: [qualityDetailSchema],
  // Color options
  colors: [{
    type: String,
    trim: true,
  }],
  // Sizes
  sizes: [{
    type: String,
    trim: true,
  }],
  // Variants (color + size combinations)
  variants: [variantSchema],
  // Average rating
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  ratingCount: {
    type: Number,
    default: 0,
  },
  // Stock/Inventory
  totalStock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  stockStatus: {
    type: String,
    enum: ['in_stock', 'low_stock', 'out_of_stock'],
    default: 'in_stock',
  },
  lowStockThreshold: {
    type: Number,
    default: 5,
  },
  // Merchant reference
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true,
  },
  // Product status
  status: {
    type: String,
    enum: ['draft', 'active', 'inactive', 'suspended'],
    default: 'draft',
  },
  // SEO
  slug: {
    type: String,
    unique: true,
    sparse: true,
  },
  metaTitle: {
    type: String,
    maxlength: 60,
  },
  metaDescription: {
    type: String,
    maxlength: 160,
  },
  // View count for analytics
  viewCount: {
    type: Number,
    default: 0,
  },
  // Weight (for shipping calculations)
  weight: {
    value: { type: Number, default: 0 },
    unit: { type: String, default: 'kg' },
  },
  // Return policy
  returnPolicy: {
    eligible: { type: Boolean, default: true },
    days: { type: Number, default: 7 },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for reviews
productSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'product',
});

// Text index for search
productSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Compound indexes for common queries
productSchema.index({ category: 1, status: 1, rating: -1 });
productSchema.index({ merchant: 1, status: 1 });
productSchema.index({ price: 1, status: 1 });
productSchema.index({ createdAt: -1 });

// Pre-save middleware to update stock status
productSchema.pre('save', function (next) {
  if (this.totalStock <= 0) {
    this.stockStatus = 'out_of_stock';
  } else if (this.totalStock <= this.lowStockThreshold) {
    this.stockStatus = 'low_stock';
  } else {
    this.stockStatus = 'in_stock';
  }
  next();
});

// Method to check availability
productSchema.methods.isAvailable = function (requestedQuantity = 1) {
  return this.status === 'active' && this.totalStock >= requestedQuantity;
};

// Method to decrement stock
productSchema.methods.decrementStock = async function (quantity) {
  if (this.totalStock < quantity) {
    throw new Error('Insufficient stock');
  }
  this.totalStock -= quantity;
  if (this.totalStock <= 0) {
    this.stockStatus = 'out_of_stock';
  } else if (this.totalStock <= this.lowStockThreshold) {
    this.stockStatus = 'low_stock';
  }
  await this.save();
};

// Static method to update average rating
productSchema.statics.updateAverageRating = async function (productId) {
  const Review = mongoose.model('Review');
  const result = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await this.findByIdAndUpdate(productId, {
      rating: Math.round(result[0].avgRating * 10) / 10,
      ratingCount: result[0].count,
    });
  } else {
    await this.findByIdAndUpdate(productId, {
      rating: 0,
      ratingCount: 0,
    });
  }
};

const Product = mongoose.model('Product', productSchema);
export default Product;
