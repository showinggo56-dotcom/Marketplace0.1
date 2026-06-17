import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  label: { type: String, default: 'Home' },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  postalCode: { type: String, required: true },
  country: { type: String, default: 'India' },
  isDefault: { type: Boolean, default: false },
  phone: { type: String },
}, { _id: true });

const paymentMethodSchema = new mongoose.Schema({
  type: { type: String, enum: ['card', 'upi'], required: true },
  label: { type: String },
  last4: { type: String },
  // In production, these would be encrypted or tokenized
  cardNumber: { type: String, select: false },
  expiryMonth: { type: String, select: false },
  expiryYear: { type: String, select: false },
  upiId: { type: String, select: false },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide your full name'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId; // Password required only for non-Google users
    },
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  profileImage: {
    type: String,
    default: '',
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  role: {
    type: String,
    enum: ['buyer', 'merchant', 'admin'],
    default: 'buyer',
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  addresses: [addressSchema],
  walletBalance: {
    type: Number,
    default: 0,
    min: 0,
  },
  savedPaymentMethods: [paymentMethodSchema],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  }],
  // Merchant profile reference (if user is a merchant)
  merchantProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Merchant',
    default: null,
  },
  // Account status
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for user's reviews
userSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'user',
});

// Virtual for user's orders
userSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'buyer',
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (this.password) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user has sufficient wallet balance
userSchema.methods.hasSufficientBalance = function (amount) {
  return this.walletBalance >= amount;
};

// Method to deduct from wallet
userSchema.methods.deductFromWallet = async function (amount) {
  if (this.walletBalance < amount) {
    throw new Error('Insufficient wallet balance');
  }
  this.walletBalance -= amount;
  await this.save();
};

// Method to add to wallet
userSchema.methods.addToWallet = async function (amount) {
  this.walletBalance += amount;
  await this.save();
};

const User = mongoose.model('User', userSchema);
export default User;
