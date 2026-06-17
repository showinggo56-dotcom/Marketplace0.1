import express from 'express';
import {
  getProductReviews,
  getMerchantReviews,
  markHelpful,
  addMerchantResponse,
} from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';
import { requireMerchantOwner } from '../middleware/rbac.js';

const router = express.Router();

// ─── Public Routes ────────────────────────────
router.get('/product/:productId', getProductReviews);
router.get('/merchant/:merchantId', getMerchantReviews);

// ─── Protected Routes ─────────────────────────
router.post('/:reviewId/helpful', authenticate, markHelpful);
router.post('/:reviewId/response', authenticate, requireMerchantOwner(), addMerchantResponse);

export default router;
