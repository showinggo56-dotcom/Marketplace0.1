import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Order from '../models/Order.js';
import Merchant from '../models/Merchant.js';
import { asyncHandler } from '../middleware/errorHandler.js';

// ─── Helper: Calculate order totals server-side ───
const calculateOrderTotals = (items, walletBalance = 0, couponDiscount = 0) => {
  // Calculate subtotal from actual product prices (server-side, tamper-proof)
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.productSnapshot.price * item.quantity);
  }, 0);

  // Platform fee (2.5%)
  const platformFee = Math.round(subtotal * 0.025);

  // Shipping cost (free above 500)
  const shippingCost = subtotal > 500 ? 0 : 40;

  // Apply coupon discount
  const discount = couponDiscount || 0;

  // Calculate total
  const totalBeforeWallet = subtotal + platformFee + shippingCost - discount;

  // Calculate wallet deduction (use wallet balance if available)
  const walletDeduction = Math.min(walletBalance, totalBeforeWallet);

  // Final amount to be paid via other payment methods
  const amountPaid = totalBeforeWallet - walletDeduction;

  return {
    subtotal,
    platformFee,
    shippingCost,
    discount,
    totalPrice: totalBeforeWallet,
    walletDeduction,
    amountPaid,
  };
};

// ─── Helper: Validate cart items against database ───
const validateCartItems = async (cartItems) => {
  const validatedItems = [];
  const errors = [];

  for (const item of cartItems) {
    const product = await Product.findById(item.product);

    if (!product) {
      errors.push(`Product not found: ${item.product}`);
      continue;
    }

    if (!product.isAvailable(item.quantity)) {
      errors.push(`Insufficient stock for "${product.title}". Available: ${product.totalStock}, Requested: ${item.quantity}`);
      continue;
    }

    validatedItems.push({
      product: product._id,
      productSnapshot: {
        title: product.title,
        image: product.images[0] || '',
        price: product.price, // Server-side price (tamper-proof)
      },
      quantity: item.quantity,
      priceAtPurchase: product.price,
      variant: item.variant || {},
    });
  }

  return { validatedItems, errors };
};

// ════════════════════════════════════════════════
// PHASE 3: SECURE CHECKOUT ENGINE
// ════════════════════════════════════════════════

/**
 * @desc   Get checkout summary (server-side calculated)
 * @route  POST /api/checkout/summary
 * @access Private (Buyer)
 */
export const getCheckoutSummary = asyncHandler(async (req, res) => {
  const { cartItems, couponCode, deliveryAddressId } = req.body;

  // Validate input
  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No items provided for checkout.',
    });
  }

  // Validate items against database
  const { validatedItems, errors } = await validateCartItems(cartItems);

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Some items are invalid.',
      errors,
    });
  }

  // Get user's wallet balance
  const user = await User.findById(req.user._id);

  // Calculate coupon discount
  let couponDiscount = 0;
  if (couponCode) {
    const validCoupons = {
      'SAVE10': { discount: 10, type: 'percentage', maxDiscount: 500 },
      'SAVE20': { discount: 20, type: 'percentage', maxDiscount: 1000 },
      'FLAT100': { discount: 100, type: 'fixed' },
      'FLAT500': { discount: 500, type: 'fixed' },
      'WELCOME': { discount: 15, type: 'percentage', maxDiscount: 300 },
    };

    const coupon = validCoupons[couponCode.toUpperCase()];
    if (coupon) {
      const subtotalForCoupon = validatedItems.reduce((sum, item) =>
        sum + (item.productSnapshot.price * item.quantity), 0);

      if (coupon.type === 'percentage') {
        couponDiscount = Math.round((subtotalForCoupon * coupon.discount) / 100);
        if (coupon.maxDiscount) {
          couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
        }
      } else {
        couponDiscount = coupon.discount;
      }
      couponDiscount = Math.min(couponDiscount, subtotalForCoupon);
    }
  }

  // Calculate totals (SERVER-SIDE, tamper-proof)
  const totals = calculateOrderTotals(validatedItems, user.walletBalance, couponDiscount);

  res.status(200).json({
    success: true,
    items: validatedItems,
    totals,
    walletBalance: user.walletBalance,
    canUseWallet: user.walletBalance > 0,
  });
});

/**
 * @desc   Process checkout and create order
 * @route  POST /api/checkout
 * @access Private (Buyer)
 */
export const processCheckout = asyncHandler(async (req, res) => {
  const {
    cartItemIds,
    deliveryAddressId,
    paymentMethod,
    useWallet = true,
    couponCode,
  } = req.body;

  // ─── 1. Validation ──────────────────────────
  if (!paymentMethod) {
    return res.status(400).json({
      success: false,
      message: 'Payment method is required.',
    });
  }

  const validPaymentMethods = ['upi', 'card', 'cod', 'wallet', 'gift_voucher'];
  if (!validPaymentMethods.includes(paymentMethod)) {
    return res.status(400).json({
      success: false,
      message: `Invalid payment method. Accepted: ${validPaymentMethods.join(', ')}`,
    });
  }

  // ─── 2. Get cart and selected items ─────────
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({ path: 'items.product', select: 'title images price merchant totalStock stockStatus' });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Your cart is empty.',
    });
  }

  // Filter selected items (or specific item IDs if provided)
  let selectedItems = cart.items.filter(item => item.selected);
  if (cartItemIds && cartItemIds.length > 0) {
    selectedItems = cart.items.filter(item => cartItemIds.includes(item._id.toString()));
  }

  if (selectedItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No items selected for checkout.',
    });
  }

  // ─── 3. Validate items and build order items ─
  const { validatedItems, errors } = await validateCartItems(selectedItems);

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Some items are invalid.',
      errors,
    });
  }

  // ─── 4. Get delivery address ────────────────
  const user = await User.findById(req.user._id);
  let deliveryAddress;

  if (deliveryAddressId) {
    deliveryAddress = user.addresses.id(deliveryAddressId);
    if (!deliveryAddress) {
      return res.status(404).json({
        success: false,
        message: 'Delivery address not found.',
      });
    }
  } else {
    // Use default address
    deliveryAddress = user.addresses.find(a => a.isDefault) || user.addresses[0];
  }

  if (!deliveryAddress) {
    return res.status(400).json({
      success: false,
      message: 'Please add a delivery address.',
    });
  }

  // ─── 5. Calculate totals SERVER-SIDE ────────
  let couponDiscount = cart.couponDiscount || 0;
  if (couponCode) {
    // Re-validate coupon
    const validCoupons = {
      'SAVE10': { discount: 10, type: 'percentage', maxDiscount: 500 },
      'SAVE20': { discount: 20, type: 'percentage', maxDiscount: 1000 },
      'FLAT100': { discount: 100, type: 'fixed' },
      'FLAT500': { discount: 500, type: 'fixed' },
      'WELCOME': { discount: 15, type: 'percentage', maxDiscount: 300 },
    };
    const coupon = validCoupons[couponCode.toUpperCase()];
    if (coupon) {
      const subtotalForCoupon = validatedItems.reduce((sum, item) =>
        sum + (item.productSnapshot.price * item.quantity), 0);
      if (coupon.type === 'percentage') {
        couponDiscount = Math.round((subtotalForCoupon * coupon.discount) / 100);
        if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, coupon.maxDiscount);
      } else {
        couponDiscount = coupon.discount;
      }
      couponDiscount = Math.min(couponDiscount, subtotalForCoupon);
    }
  }

  const totals = calculateOrderTotals(validatedItems, useWallet ? user.walletBalance : 0, couponDiscount);

  // ─── 6. Payment validation ──────────────────
  // For COD, check if amount is within limit
  if (paymentMethod === 'cod' && totals.totalPrice > 5000) {
    return res.status(400).json({
      success: false,
      message: 'Cash on Delivery is only available for orders below Rs.5,000.',
    });
  }

  // For wallet-only payment
  if (paymentMethod === 'wallet' && totals.amountPaid > 0) {
    return res.status(400).json({
      success: false,
      message: 'Insufficient wallet balance. Please add funds or choose another payment method.',
    });
  }

  // Mock payment processing for non-COD, non-wallet methods
  if (paymentMethod === 'card' || paymentMethod === 'upi' || paymentMethod === 'gift_voucher') {
    // In production, integrate with Stripe, Razorpay, etc.
    // For now, we simulate a successful payment
    const mockPaymentSuccess = true;
    if (!mockPaymentSuccess) {
      return res.status(400).json({
        success: false,
        message: 'Payment processing failed. Please try again.',
      });
    }
  }

  // ─── 7. Deduct from wallet ──────────────────
  if (totals.walletDeduction > 0) {
    try {
      await user.deductFromWallet(totals.walletDeduction);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ─── 8. Group items by merchant ─────────────
  const itemsByMerchant = {};
  for (const item of validatedItems) {
    const product = await Product.findById(item.product).select('merchant');
    const merchantId = product.merchant.toString();
    if (!itemsByMerchant[merchantId]) {
      itemsByMerchant[merchantId] = [];
    }
    itemsByMerchant[merchantId].push(item);
  }

  // ─── 9. Create orders per merchant ──────────
  const createdOrders = [];

  for (const [merchantId, items] of Object.entries(itemsByMerchant)) {
    // Calculate merchant-specific totals
    const merchantSubtotal = items.reduce((sum, item) =>
      sum + (item.productSnapshot.price * item.quantity), 0);
    const merchantProportion = merchantSubtotal / totals.subtotal;
    const merchantShipping = Math.round(totals.shippingCost * merchantProportion);
    const merchantPlatformFee = Math.round(totals.platformFee * merchantProportion);
    const merchantDiscount = Math.round(couponDiscount * merchantProportion);
    const merchantTotal = merchantSubtotal + merchantShipping + merchantPlatformFee - merchantDiscount;
    const merchantWalletDeduction = Math.round(totals.walletDeduction * merchantProportion);

    const order = await Order.create({
      buyer: req.user._id,
      merchant: merchantId,
      items,
      deliveryAddress: {
        label: deliveryAddress.label,
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        postalCode: deliveryAddress.postalCode,
        country: deliveryAddress.country || 'India',
        phone: deliveryAddress.phone,
      },
      subtotal: merchantSubtotal,
      shippingCost: merchantShipping,
      platformFee: merchantPlatformFee,
      discount: merchantDiscount,
      totalPrice: merchantTotal,
      walletDeduction: merchantWalletDeduction,
      amountPaid: merchantTotal - merchantWalletDeduction,
      paymentMethod: totals.walletDeduction > 0 && merchantWalletDeduction > 0
        ? (totals.amountPaid > 0 ? 'mixed' : 'wallet')
        : paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'completed',
      status: 'pending',
    });

    // Decrement product stock
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        await product.decrementStock(item.quantity);
      }
    }

    createdOrders.push(order);
  }

  // ─── 10. Clear selected items from cart ─────
  await cart.clearSelected();

  res.status(201).json({
    success: true,
    message: `Order${createdOrders.length > 1 ? 's' : ''} placed successfully!`,
    orders: createdOrders.map(order => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalPrice: order.totalPrice,
      estimatedDelivery: order.estimatedDeliveryDate,
      itemCount: order.items.length,
    })),
    totals,
    walletUsed: totals.walletDeduction,
    remainingWallet: user.walletBalance,
  });
});

/**
 * @desc   Mock payment verification (UPI/Card/Gift Voucher)
 * @route  POST /api/checkout/verify-payment
 * @access Private (Buyer)
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { paymentMethod, paymentDetails } = req.body;

  // Mock payment verification for different methods
  const paymentHandlers = {
    upi: (details) => {
      const validUpiApps = ['google_pay', 'phonepe', 'paytm', 'amazon_pay'];
      if (!validUpiApps.includes(details?.upiApp)) {
        return { success: false, message: 'Invalid UPI app selected.' };
      }
      // Mock UPI verification
      return { success: true, transactionId: `UPI-${Date.now()}`, message: 'UPI payment verified.' };
    },
    card: (details) => {
      if (!details?.cardNumber || !details?.expiry || !details?.cvv) {
        return { success: false, message: 'Incomplete card details.' };
      }
      // Mock card validation (Luhn check would go here in production)
      const cardNumber = details.cardNumber.replace(/\s/g, '');
      if (cardNumber.length < 13 || cardNumber.length > 19) {
        return { success: false, message: 'Invalid card number.' };
      }
      return { success: true, transactionId: `CARD-${Date.now()}`, message: 'Card payment verified.' };
    },
    gift_voucher: (details) => {
      if (!details?.voucherCode) {
        return { success: false, message: 'Voucher code is required.' };
      }
      // Mock voucher validation
      const validVouchers = ['GIFT100', 'GIFT500', 'WELCOME2025'];
      if (!validVouchers.includes(details.voucherCode.toUpperCase())) {
        return { success: false, message: 'Invalid or expired voucher code.' };
      }
      return { success: true, transactionId: `VOUCHER-${Date.now()}`, message: 'Voucher applied successfully.' };
    },
  };

  const handler = paymentHandlers[paymentMethod];
  if (!handler) {
    return res.status(400).json({
      success: false,
      message: 'Unsupported payment method for verification.',
    });
  }

  const result = handler(paymentDetails);
  res.status(result.success ? 200 : 400).json(result);
});

/**
 * @desc   Get available payment methods
 * @route  GET /api/checkout/payment-methods
 * @access Private (Buyer)
 */
export const getPaymentMethods = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  const methods = [
    {
      id: 'upi',
      name: 'UPI',
      description: 'Pay using Google Pay, PhonePe, Paytm',
      icon: 'upi',
      enabled: true,
      options: [
        { id: 'google_pay', name: 'Google Pay' },
        { id: 'phonepe', name: 'PhonePe' },
        { id: 'paytm', name: 'Paytm' },
        { id: 'amazon_pay', name: 'Amazon Pay' },
      ],
    },
    {
      id: 'card',
      name: 'Credit / Debit Card',
      description: 'Visa, Mastercard, RuPay',
      icon: 'card',
      enabled: true,
      options: [],
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      description: 'Pay when you receive',
      icon: 'cod',
      enabled: true,
      options: [],
      restrictions: {
        maxOrderValue: 5000,
      },
    },
    {
      id: 'wallet',
      name: 'Wallet',
      description: `Balance: Rs.${user.walletBalance}`,
      icon: 'wallet',
      enabled: user.walletBalance > 0,
      balance: user.walletBalance,
    },
    {
      id: 'gift_voucher',
      name: 'Gift Voucher',
      description: 'Redeem a gift voucher',
      icon: 'gift',
      enabled: true,
      options: [],
    },
  ];

  res.status(200).json({
    success: true,
    methods,
  });
});

/**
 * @desc   Add money to wallet (mock)
 * @route  POST /api/checkout/wallet/add
 * @access Private (Buyer)
 */
export const addToWallet = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, paymentDetails } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid amount.',
    });
  }

  if (amount > 50000) {
    return res.status(400).json({
      success: false,
      message: 'Maximum wallet top-up is Rs.50,000.',
    });
  }

  // Mock payment processing for wallet top-up
  // In production, integrate with payment gateway
  const mockTransactionId = `WALLET-ADD-${Date.now()}`;

  // Add to user's wallet
  const user = await User.findById(req.user._id);
  await user.addToWallet(amount);

  res.status(200).json({
    success: true,
    message: `Rs.${amount} added to your wallet successfully.`,
    transactionId: mockTransactionId,
    newBalance: user.walletBalance,
  });
});

export default {
  getCheckoutSummary,
  processCheckout,
  verifyPayment,
  getPaymentMethods,
  addToWallet,
};
