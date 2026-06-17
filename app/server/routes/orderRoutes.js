import express from 'express';
import {
  getMyOrders,
  getOrder,
  cancelOrder,
  submitReview,
  getMerchantOrders,
  updateOrderStatus,
  getMerchantStats,
} from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';
import { requireBuyer, requireMerchantOwner } from '../middleware/rbac.js';

const router = express.Router();

// ─── Buyer Routes ─────────────────────────────
router.get('/', authenticate, requireBuyer, getMyOrders);
router.get('/:id', authenticate, requireBuyer, getOrder);
router.patch('/:id/cancel', authenticate, requireBuyer, cancelOrder);
router.post('/:id/review', authenticate, requireBuyer, submitReview);

// ─── Merchant Routes ──────────────────────────
router.get('/merchant/orders', authenticate, requireMerchantOwner(), getMerchantOrders);
router.get('/merchant/stats', authenticate, requireMerchantOwner(), getMerchantStats);
router.patch('/merchant/:orderId/status', authenticate, requireMerchantOwner(), updateOrderStatus);

export default router;
