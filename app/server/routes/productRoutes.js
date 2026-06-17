import express from 'express';
import {
  getProducts,
  getProduct,
  getCategories,
  getAvailableFilters,
  createProduct,
  updateProduct,
  deleteProduct,
  getMyProducts,
} from '../controllers/productController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireMerchant, requireMerchantOwner } from '../middleware/rbac.js';

const router = express.Router();

// ─── Public Routes ────────────────────────────
router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/filters', getAvailableFilters);
router.get('/:id', optionalAuth, getProduct);

// ─── Merchant Routes ──────────────────────────
router.get('/merchant/my-products', authenticate, requireMerchantOwner(), getMyProducts);
router.post('/', authenticate, requireMerchantOwner(), createProduct);
router.put('/:id', authenticate, requireMerchantOwner(), updateProduct);
router.delete('/:id', authenticate, requireMerchantOwner(), deleteProduct);

export default router;
