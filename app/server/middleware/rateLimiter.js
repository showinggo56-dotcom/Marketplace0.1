import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for OTP generation - max 1 request per minute per email
 * This prevents abuse of the OTP system
 */
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 1, // 1 request per window
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 60 seconds before requesting a new OTP.',
    retryAfter: 60, // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use email from request body as the key
  keyGenerator: (req) => {
    return req.body?.email || req.ip;
  },
  // Skip successful requests (optional - we count all requests)
  skipSuccessfulRequests: false,
  // Handler for when limit is reached
  handler: (req, res, next, options) => {
    res.status(429).json({
      success: false,
      message: options.message.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
    });
  },
});

/**
 * Rate limiter for general API endpoints
 * 100 requests per 15 minutes per IP
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for authentication endpoints
 * 10 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for checkout/payment endpoints
 * 5 requests per 15 minutes per IP
 */
export const checkoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    success: false,
    message: 'Too many checkout attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export default { otpRateLimiter, apiRateLimiter, authRateLimiter, checkoutRateLimiter };
