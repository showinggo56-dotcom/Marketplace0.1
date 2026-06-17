import express from 'express';
import {
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
  googleAuthToken,
  becomeMerchant,
  logout,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { otpRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ─── Public Routes ────────────────────────────

// Signup: Create account (Step 1)
router.post('/signup', signup);

// Verify OTP (Step 2)
router.post('/verify-otp', verifyOTP);

// Resend OTP (Rate limited: max 1 per minute)
router.post('/resend-otp', otpRateLimiter, resendOTP);

// Signin: Send OTP after password verification (Step 1)
router.post('/signin', signin);

// Verify Signin OTP (Step 2)
router.post('/verify-signin', verifySignin);

// Refresh Token
router.post('/refresh', refreshToken);

// Google OAuth Token Exchange (for frontend Google Sign-In)
router.post('/google/token', googleAuthToken);

// ─── Protected Routes ─────────────────────────

// Get current user
router.get('/me', authenticate, getMe);

// Update profile
router.put('/profile', authenticate, updateProfile);

// Address management
router.post('/address', authenticate, addAddress);
router.delete('/address/:addressId', authenticate, removeAddress);

// Become a merchant
router.post('/become-merchant', authenticate, becomeMerchant);

// Logout
router.post('/logout', authenticate, logout);

export default router;
