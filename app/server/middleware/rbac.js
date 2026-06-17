/**
 * Role-Based Access Control (RBAC) Middleware
 * Controls access to routes based on user roles
 */

/**
 * Middleware to restrict access to specific roles
 * @param  {...String} roles - Allowed roles ('buyer', 'merchant', 'admin')
 * @returns {Function} Express middleware
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to access this resource.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}.`,
      });
    }

    next();
  };
};

/**
 * Middleware to ensure user is a buyer
 */
export const requireBuyer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'buyer' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'This resource is only accessible to buyers.',
    });
  }

  next();
};

/**
 * Middleware to ensure user is a merchant
 * Also allows admin access
 */
export const requireMerchant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'merchant' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'This resource is only accessible to merchants. Please register as a merchant.',
    });
  }

  next();
};

/**
 * Middleware to ensure user is an admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
    });
  }

  next();
};

/**
 * Middleware to check if user owns a resource or is admin
 * Used for routes where users can only access their own data
 * @param {Function} getOwnerId - Function that extracts owner ID from req
 */
export const requireOwnerOrAdmin = (getOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // Admin can access anything
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const ownerId = await getOwnerId(req);

      if (!ownerId || req.user._id.toString() !== ownerId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access this resource.',
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership.',
      });
    }
  };
};

/**
 * Middleware to check if merchant owns the resource
 * For product/order routes where merchant should only access their own data
 */
export const requireMerchantOwner = () => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.role !== 'merchant') {
      return res.status(403).json({
        success: false,
        message: 'Merchant access required.',
      });
    }

    // Check if user has a merchant profile
    if (!req.user.merchantProfile) {
      return res.status(403).json({
        success: false,
        message: 'You do not have a merchant profile. Please complete merchant registration.',
      });
    }

    // Attach merchant ID to request for use in controllers
    req.merchantId = req.user.merchantProfile;
    next();
  };
};

export default { requireRole, requireBuyer, requireMerchant, requireAdmin, requireOwnerOrAdmin, requireMerchantOwner };
