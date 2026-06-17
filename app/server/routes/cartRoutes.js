import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  toggleItemSelection,
  selectAllItems,
  clearCart,
  applyCoupon,
  removeCoupon,
} from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';
import { requireBuyer } from '../middleware/rbac.js';

const router = express.Router();

// All cart routes require authentication
router.use(authenticate);
router.use(requireBuyer);

router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeFromCart);
router.patch('/items/:itemId/select', toggleItemSelection);
router.patch('/select-all', selectAllItems);
router.delete('/', clearCart);
router.post('/coupon', applyCoupon);
router.delete('/coupon', removeCoupon);

export default router;
