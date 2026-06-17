import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  merchant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    required: true,
    index: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Review title cannot exceed 200 characters'],
  },
  text: {
    type: String,
    required: true,
    maxlength: [2000, 'Review text cannot exceed 2000 characters'],
  },
  images: [{
    type: String,
  }],
  // Helpful votes
  helpful: {
    type: Number,
    default: 0,
  },
  helpfulVoters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Moderation
  isApproved: {
    type: Boolean,
    default: true,
  },
  isEdited: {
    type: Boolean,
    default: false,
  },
  editedAt: {
    type: Date,
  },
  // Merchant response
  merchantResponse: {
    text: { type: String, maxlength: 1000 },
    respondedAt: { type: Date },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound index: one review per user per product per order
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

// Indexes for common queries
reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ merchant: 1, isApproved: 1 });
reviewSchema.index({ rating: 1 });

// Post-save hook to update product average rating
reviewSchema.post('save', async function () {
  try {
    const Product = mongoose.model('Product');
    await Product.updateAverageRating(this.product);
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
});

// Post-remove hook to update product average rating
reviewSchema.post('remove', async function () {
  try {
    const Product = mongoose.model('Product');
    await Product.updateAverageRating(this.product);
  } catch (error) {
    console.error('Error updating product rating:', error);
  }
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
