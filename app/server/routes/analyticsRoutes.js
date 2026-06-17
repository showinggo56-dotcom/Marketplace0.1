import express from 'express';
import {
  getSuggestions,
  recordView,
  getPlatformAnalytics,
  getMyBrowsingHistory,
} from '../controllers/analyticsController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = express.Router();

// ─── Public/Optional Auth Routes ──────────────
router.get('/suggestions', optionalAuth, getSuggestions);
router.post('/view', optionalAuth, recordView);

// ─── Protected Routes ─────────────────────────
router.get('/my-history', authenticate, getMyBrowsingHistory);
router.get('/platform', authenticate, requireAdmin, getPlatformAnalytics);

export default router;
