import User from '../models/User.js';
import Merchant from '../models/Merchant.js';
import { generateToken, generateRefreshToken } from '../utils/generateToken.js';
import { createAndSendOTP, verifyOTPCode } from '../utils/sendOTP.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// ────────────────────────────────────────────────
// Helper: Build auth response
// ────────────────────────────────────────────────
const buildAuthResponse = (user, token = null, refreshToken = null) => {
  const userData = {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    profileImage: user.profileImage,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    walletBalance: user.walletBalance,
    merchantProfile: user.merchantProfile,
    addresses: user.addresses,
  };

  const response = {
    success: true,
    user: userData,
  };

  if (token) {
    response.token = token;
  }
  if (refreshToken) {
    response.refreshToken = refreshToken;
  }

  return response;
};

// ════════════════════════════════════════════════
// PHASE 1: AUTHENTICATION CONTROLLERS
// ════════════════════════════════════════════════

/**
 * @desc   Register a new user (Step 1: Create account)
 * @route  POST /api/auth/signup
 * @access Public
 */
export const signup = asyncHandler(async (req, res) => {
  const { fullName, email, password, role } = req.body;

  // Validation
  if (!fullName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide full name, email, and password.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long.',
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists. Please sign in instead.',
    });
  }

  // Create user with email not verified yet
  const userRole = role === 'merchant' ? 'buyer' : (role || 'buyer'); // Merchant role requires verification
  const user = await User.create({
    fullName,
    email,
    password,
    role: userRole,
    isEmailVerified: false,
  });

  // Send OTP for email verification
  const otpResult = await createAndSendOTP(email, 'signup', {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  if (!otpResult.success) {
    // Rollback user creation if OTP fails
    await User.findByIdAndDelete(user._id);
    return res.status(500).json(otpResult);
  }

  res.status(201).json({
    success: true,
    message: 'Account created. Please verify your email with the OTP sent to your inbox.',
    email,
    expiresIn: 60, // OTP expires in 60 seconds
  });
});

/**
 * @desc   Verify OTP (Step 2: Email verification)
 * @route  POST /api/auth/verify-otp
 * @access Public
 */
export const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp, purpose = 'signup' } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and OTP.',
    });
  }

  // Verify the OTP
  const verifyResult = await verifyOTPCode(email, otp, purpose);

  if (!verifyResult.success) {
    return res.status(400).json(verifyResult);
  }

  // Find and update user
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found.',
    });
  }

  // Mark email as verified
  user.isEmailVerified = true;
  await user.save();

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res.status(200).json({
    ...buildAuthResponse(user, token, refreshToken),
    message: 'Email verified successfully. You are now signed in.',
  });
});

/**
 * @desc   Resend OTP
 * @route  POST /api/auth/resend-otp
 * @access Public
 */
export const resendOTP = asyncHandler(async (req, res) => {
  const { email, purpose = 'signup' } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Please provide your email address.',
    });
  }

  // Check if user exists
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'No account found with this email.',
    });
  }

  // Send new OTP
  const otpResult = await createAndSendOTP(email, purpose, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(200).json(otpResult);
});

/**
 * @desc   Sign in with email and password (Step 1: Send OTP)
 * @route  POST /api/auth/signin
 * @access Public
 */
export const signin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password.',
    });
  }

  // Find user with password
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Check if user signed up with Google
  if (user.googleId && !user.password) {
    return res.status(400).json({
      success: false,
      message: 'This account uses Google Sign-In. Please sign in with Google.',
    });
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
    });
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    // Send OTP for verification
    const otpResult = await createAndSendOTP(email, 'signup', {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if (!otpResult.success) {
      return res.status(500).json(otpResult);
    }

    return res.status(403).json({
      success: false,
      message: 'Email not verified. An OTP has been sent to your email for verification.',
      requiresVerification: true,
      email,
    });
  }

  // Send OTP for signin verification (2FA step)
  const otpResult = await createAndSendOTP(email, 'signin', {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  if (!otpResult.success) {
    return res.status(500).json(otpResult);
  }

  res.status(200).json({
    success: true,
    message: 'OTP sent to your email. Please enter the code to complete sign in.',
    email,
    expiresIn: 60,
    requiresOTP: true,
  });
});

/**
 * @desc   Verify signin OTP (Step 2: Complete signin)
 * @route  POST /api/auth/verify-signin
 * @access Public
 */
export const verifySignin = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and OTP.',
    });
  }

  // Verify OTP
  const verifyResult = await verifyOTPCode(email, otp, 'signin');

  if (!verifyResult.success) {
    return res.status(400).json(verifyResult);
  }

  // Find user
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found.',
    });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res.status(200).json({
    ...buildAuthResponse(user, token, refreshToken),
    message: 'Signed in successfully.',
  });
});

/**
 * @desc   Get current user profile
 * @route  GET /api/auth/me
 * @access Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('merchantProfile', 'shopName verificationStatus shopLogo');

  res.status(200).json({
    success: true,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      profileImage: user.profileImage,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      walletBalance: user.walletBalance,
      merchantProfile: user.merchantProfile,
      addresses: user.addresses,
      savedPaymentMethods: user.savedPaymentMethods,
      wishlist: user.wishlist,
      createdAt: user.createdAt,
    },
  });
});

/**
 * @desc   Update user profile
 * @route  PUT /api/auth/profile
 * @access Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, profileImage } = req.body;
  const updates = {};

  if (fullName) updates.fullName = fullName;
  if (profileImage) updates.profileImage = profileImage;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      profileImage: user.profileImage,
      role: user.role,
    },
  });
});

/**
 * @desc   Add address to user profile
 * @route  POST /api/auth/address
 * @access Private
 */
export const addAddress = asyncHandler(async (req, res) => {
  const { label, street, city, state, postalCode, country, phone, isDefault } = req.body;

  if (!street || !city || !state || !postalCode) {
    return res.status(400).json({
      success: false,
      message: 'Please provide street, city, state, and postal code.',
    });
  }

  const user = await User.findById(req.user._id);

  // If setting as default, unset other defaults
  if (isDefault) {
    user.addresses.forEach(addr => { addr.isDefault = false; });
  }

  user.addresses.push({
    label: label || 'Home',
    street,
    city,
    state,
    postalCode,
    country: country || 'India',
    phone,
    isDefault: isDefault || user.addresses.length === 0,
  });

  await user.save();

  res.status(201).json({
    success: true,
    message: 'Address added successfully.',
    addresses: user.addresses,
  });
});

/**
 * @desc   Remove address from user profile
 * @route  DELETE /api/auth/address/:addressId
 * @access Private
 */
export const removeAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter(addr => addr._id.toString() !== addressId);
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Address removed successfully.',
    addresses: user.addresses,
  });
});

/**
 * @desc   Refresh access token
 * @route  POST /api/auth/refresh
 * @access Public (requires refresh token)
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Refresh token is required.',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.',
      });
    }

    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or account deactivated.',
      });
    }

    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token.',
    });
  }
});

/**
 * @desc   Google OAuth callback handler
 * @route  GET /api/auth/google/callback
 * @access Public
 */
export const googleAuthCallback = asyncHandler(async (req, res) => {
  // This is handled by Passport.js Google Strategy
  // The user object is attached by Passport
  const user = req.user;

  if (!user) {
    return res.redirect(`${process.env.CLIENT_URL}/signin?error=google_auth_failed`);
  }

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  // Redirect to frontend with tokens
  res.redirect(
    `${process.env.CLIENT_URL}/auth/callback?token=${token}&refreshToken=${refreshToken}`
  );
});

/**
 * @desc   Handle Google auth success (called after Passport authenticates)
 * @route  POST /api/auth/google/token
 * @access Public
 */
export const googleAuthToken = asyncHandler(async (req, res) => {
  const { googleId, email, fullName, profileImage } = req.body;

  if (!googleId || !email) {
    return res.status(400).json({
      success: false,
      message: 'Google ID and email are required.',
    });
  }

  // Find or create user
  let user = await User.findOne({ googleId });

  if (!user) {
    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Link Google account to existing user
      existingUser.googleId = googleId;
      if (profileImage && !existingUser.profileImage) {
        existingUser.profileImage = profileImage;
      }
      await existingUser.save();
      user = existingUser;
    } else {
      // Create new user
      user = await User.create({
        fullName: fullName || email.split('@')[0],
        email,
        googleId,
        profileImage: profileImage || '',
        isEmailVerified: true, // Google emails are pre-verified
        role: 'buyer',
      });
    }
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save();

  // Generate tokens
  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  res.status(200).json({
    ...buildAuthResponse(user, token, refreshToken),
    message: 'Signed in with Google successfully.',
  });
});

/**
 * @desc   Register as a merchant
 * @route  POST /api/auth/become-merchant
 * @access Private
 */
export const becomeMerchant = asyncHandler(async (req, res) => {
  const {
    shopName,
    shopDescription,
    address,
    contactInfo,
    bankDetails,
    categories,
  } = req.body;

  if (!shopName || !address || !contactInfo || !bankDetails) {
    return res.status(400).json({
      success: false,
      message: 'Please provide shop name, address, contact info, and bank details.',
    });
  }

  // Check if user already has a merchant profile
  if (req.user.role === 'merchant' && req.user.merchantProfile) {
    return res.status(400).json({
      success: false,
      message: 'You are already registered as a merchant.',
    });
  }

  // Create merchant profile
  const merchant = await Merchant.create({
    owner: req.user._id,
    shopName,
    shopDescription,
    address,
    contactInfo,
    bankDetails,
    categories: categories || [],
    verificationStatus: 'pending',
  });

  // Update user role and merchant profile reference
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      role: 'merchant',
      merchantProfile: merchant._id,
    },
    { new: true }
  );

  // Generate new token with updated role
  const token = generateToken(user);

  res.status(201).json({
    success: true,
    message: 'Merchant profile created successfully. Your shop is pending verification.',
    merchant: {
      id: merchant._id,
      shopName: merchant.shopName,
      verificationStatus: merchant.verificationStatus,
    },
    token,
  });
});

/**
 * @desc   Logout user
 * @route  POST /api/auth/logout
 * @access Private
 */
export const logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

export default {
  signup,
  verifyOTP,
  resendOTP,
  signin,
  verifySignin,
  getMe,
  updateProfile,
  addAddress,
  removeAddress,
  refreshToken,
  googleAuthCallback,
  googleAuthToken,
  becomeMerchant,
  logout,
};
