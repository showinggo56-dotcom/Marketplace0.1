import express from 'express';
import {
  getCheckoutSummary,
  processCheckout,
  verifyPayment,
  getPaymentMethods,
  addToWallet,
} from '../controllers/checkoutController.js';
import { authenticate } from '../middleware/auth.js';
import { requireBuyer } from '../middleware/rbac.js';
import { checkoutRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticate);
router.use(requireBuyer);

router.post('/summary', getCheckoutSummary);
router.post('/', checkoutRateLimiter, processCheckout);
router.post('/verify-payment', verifyPayment);
router.get('/payment-methods', getPaymentMethods);
router.post('/wallet/add', addToWallet);

export default router;
