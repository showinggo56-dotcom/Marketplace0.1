import mongoose from 'mongoose';
import crypto from 'crypto';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['signup', 'signin', 'password_reset', 'email_change'],
    default: 'signup',
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  attempts: {
    type: Number,
    default: 0,
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

// TTL index to auto-delete expired OTPs
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for email + purpose queries
otpSchema.index({ email: 1, purpose: 1 });

// Static method to generate OTP
otpSchema.statics.generateOTP = function () {
  // Generate a 6-digit numeric OTP
  return crypto.randomInt(100000, 999999).toString();
};

// Method to check if OTP is expired
otpSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

// Method to check if OTP is valid
otpSchema.methods.isValid = function () {
  return !this.verified && !this.isExpired() && this.attempts < 5;
};

// Method to verify OTP
otpSchema.methods.verifyOTP = async function (inputOTP) {
  this.attempts += 1;

  if (this.isExpired()) {
    await this.save();
    throw new Error('OTP has expired. Please request a new one.');
  }

  if (this.attempts >= 5) {
    await this.save();
    throw new Error('Too many failed attempts. Please request a new OTP.');
  }

  if (this.otp !== inputOTP) {
    await this.save();
    throw new Error('Invalid OTP. Please try again.');
  }

  this.verified = true;
  await this.save();
  return true;
};

const OTP = mongoose.model('OTP', otpSchema);
export default OTP;
