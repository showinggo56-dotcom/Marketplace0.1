import mongoose from 'mongoose';

const bankDetailsSchema = new mongoose.Schema({
  accountHolderName: { type: String, required: true },
  accountNumber: { type: String, required: true },
  ifscCode: { type: String, required: true },
  bankName: { type: String, required: true },
  branchName: { type: String },
}, { _id: true });

const documentSchema = new mongoose.Schema({
  type: { type: String, enum: ['gst', 'pan', 'business_license', 'identity_proof'], required: true },
  url: { type: String, required: true },
  verified: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const merchantSchema = new mongoose.Schema({
  // Reference to the User who owns this shop
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  shopName: {
    type: String,
    required: [true, 'Shop name is required'],
    trim: true,
    maxlength: [100, 'Shop name cannot exceed 100 characters'],
  },
  shopDescription: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  shopLogo: {
    type: String,
    default: '',
  },
  shopBanner: {
    type: String,
    default: '',
  },
  // Location / Address
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, default: 'India' },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },
  contactInfo: {
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: { type: String },
  },
  // Business category/tags
  categories: [{
    type: String,
    trim: true,
  }],
  // Verification Status
  verificationStatus: {
    type: String,
    enum: ['pending', 'under_review', 'verified', 'rejected'],
    default: 'pending',
  },
  verificationNotes: {
    type: String,
  },
  verifiedAt: {
    type: Date,
  },
  // Bank Details for payouts
  bankDetails: bankDetailsSchema,
  // Documents
  documents: [documentSchema],
  // Shop settings
  isActive: {
    type: Boolean,
    default: true,
  },
  // Average rating
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
  // Business hours
  businessHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } },
  },
  // Commission/Fee settings (platform takes a percentage)
  platformFee: {
    type: Number,
    default: 2.5, // 2.5% platform fee
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for products
merchantSchema.virtual('products', {
  ref: 'Product',
  localField: '_id',
  foreignField: 'merchant',
});

// Virtual for orders
merchantSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'merchant',
});

// Index for geospatial queries
merchantSchema.index({ 'address.coordinates': '2dsphere' });

const Merchant = mongoose.model('Merchant', merchantSchema);
export default Merchant;
