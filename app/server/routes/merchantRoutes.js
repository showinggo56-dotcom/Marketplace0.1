import express from 'express';
import {
  getMerchantProfile,
  updateMerchantProfile,
  updateBankDetails,
  getMerchants,
  getMerchant,
  uploadDocuments,
} from '../controllers/merchantController.js';
import { authenticate } from '../middleware/auth.js';
import { requireMerchantOwner, requireRole } from '../middleware/rbac.js';

const router = express.Router();

// ─── Public Routes ────────────────────────────
router.get('/', getMerchants);
router.get('/:id', getMerchant);

// ─── Merchant Protected Routes ────────────────
router.get('/profile/me', authenticate, requireMerchantOwner(), getMerchantProfile);
router.put('/profile/me', authenticate, requireMerchantOwner(), updateMerchantProfile);
router.put('/bank-details', authenticate, requireMerchantOwner(), updateBankDetails);
router.post('/documents', authenticate, requireMerchantOwner(), uploadDocuments);

export default router;
