import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc   Get user's cart
 * @route  GET /api/cart
 * @access Private (Buyer)
 */
export const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.product',
      select: 'title subtitle images price stockStatus rating merchant',
      populate: {
        path: 'merchant',
        select: 'shopName',
      },
    });

  if (!cart) {
    cart = await Cart.create({ user: req.user._id, items: [] });
  }

  // Calculate totals
  const selectedItems = cart.items.filter(item => item.selected);
  const subtotal = selectedItems.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + (price * item.quantity);
  }, 0);

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  res.status(200).json({
    success: true,
    cart: {
      items: cart.items,
      couponCode: cart.couponCode,
      couponDiscount: cart.couponDiscount,
    },
    summary: {
      totalItems,
      selectedCount,
      subtotal,
      discount: cart.couponDiscount || 0,
      estimatedTotal: subtotal - (cart.couponDiscount || 0),
    },
  });
});

/**
 * @desc   Add item to cart
 * @route  POST /api/cart/items
 * @access Private (Buyer)
 */
export const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1, variant = {} } = req.body;

  if (!productId) {
    return res.status(400).json({
      success: false,
      message: 'Product ID is required.',
    });
  }

  // Check if product exists and is available
  const product = await Product.findById(productId);

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found.',
    });
  }

  if (!product.isAvailable(quantity)) {
    return res.status(400).json({
      success: false,
      message: `Product is not available in the requested quantity. Available stock: ${product.totalStock}`,
    });
  }

  // Find or create cart
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // Add item to cart
  await cart.addItem(productId, quantity, variant);

  // Re-fetch with populated products
  const updatedCart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.product',
      select: 'title subtitle images price stockStatus rating merchant',
      populate: { path: 'merchant', select: 'shopName' },
    });

  res.status(200).json({
    success: true,
    message: 'Item added to cart.',
    cart: updatedCart,
  });
});

/**
 * @desc   Update cart item quantity
 * @route  PUT /api/cart/items/:itemId
 * @access Private (Buyer)
 */
export const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (quantity === undefined || quantity < 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid quantity is required.',
    });
  }

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found.',
    });
  }

  // Find the item
  const item = cart.items.id(itemId);
  if (!item) {
    return res.status(404).json({
      success: false,
      message: 'Cart item not found.',
    });
  }

  // Check stock if increasing quantity
  if (quantity > item.quantity) {
    const product = await Product.findById(item.product);
    if (product && !product.isAvailable(quantity)) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.totalStock} items available in stock.`,
      });
    }
  }

  await cart.updateQuantity(itemId, quantity);

  const updatedCart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.product',
      select: 'title subtitle images price stockStatus rating merchant',
      populate: { path: 'merchant', select: 'shopName' },
    });

  res.status(200).json({
    success: true,
    message: quantity === 0 ? 'Item removed from cart.' : 'Cart updated.',
    cart: updatedCart,
  });
});

/**
 * @desc   Remove item from cart
 * @route  DELETE /api/cart/items/:itemId
 * @access Private (Buyer)
 */
export const removeFromCart = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found.',
    });
  }

  await cart.removeItem(itemId);

  const updatedCart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.product',
      select: 'title subtitle images price stockStatus rating merchant',
      populate: { path: 'merchant', select: 'shopName' },
    });

  res.status(200).json({
    success: true,
    message: 'Item removed from cart.',
    cart: updatedCart,
  });
});

/**
 * @desc   Toggle item selection (checkbox)
 * @route  PATCH /api/cart/items/:itemId/select
 * @access Private (Buyer)
 */
export const toggleItemSelection = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found.',
    });
  }

  await cart.toggleSelection(itemId);

  const updatedCart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.product',
      select: 'title subtitle images price stockStatus rating merchant',
      populate: { path: 'merchant', select: 'shopName' },
    });

  // Calculate selected subtotal
  const selectedItems = updatedCart.items.filter(item => item.selected);
  const subtotal = selectedItems.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + (price * item.quantity);
  }, 0);

  res.status(200).json({
    success: true,
    cart: updatedCart,
    selectedSubtotal: subtotal,
  });
});

/**
 * @desc   Select/Deselect all items
 * @route  PATCH /api/cart/select-all
 * @access Private (Buyer)
 */
export const selectAllItems = asyncHandler(async (req, res) => {
  const { selected } = req.body;

  const cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    return res.status(404).json({
      success: false,
      message: 'Cart not found.',
    });
  }

  await cart.setAllSelection(selected);

  const updatedCart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.product',
      select: 'title subtitle images price stockStatus rating merchant',
      populate: { path: 'merchant', select: 'shopName' },
    });

  const selectedItems = updatedCart.items.filter(item => item.selected);
  const subtotal = selectedItems.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + (price * item.quantity);
  }, 0);

  res.status(200).json({
    success: true,
    cart: updatedCart,
    selectedSubtotal: subtotal,
  });
});

/**
 * @desc   Clear cart
 * @route  DELETE /api/cart
 * @access Private (Buyer)
 */
export const clearCart = asyncHandler(async (req, res) => {
  await Cart.findOneAndDelete({ user: req.user._id });

  res.status(200).json({
    success: true,
    message: 'Cart cleared successfully.',
  });
});

/**
 * @desc   Apply coupon to cart
 * @route  POST /api/cart/coupon
 * @access Private (Buyer)
 */
export const applyCoupon = asyncHandler(async (req, res) => {
  const { couponCode } = req.body;

  // Mock coupon validation - in production, this would check against a Coupon collection
  const validCoupons = {
    'SAVE10': { discount: 10, type: 'percentage', maxDiscount: 500 },
    'SAVE20': { discount: 20, type: 'percentage', maxDiscount: 1000 },
    'FLAT100': { discount: 100, type: 'fixed' },
    'FLAT500': { discount: 500, type: 'fixed' },
    'WELCOME': { discount: 15, type: 'percentage', maxDiscount: 300 },
  };

  const coupon = validCoupons[couponCode?.toUpperCase()];

  if (!coupon) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or expired coupon code.',
    });
  }

  const cart = await Cart.findOne({ user: req.user._id })
    .populate({ path: 'items.product', select: 'price' });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Your cart is empty.',
    });
  }

  // Calculate subtotal of selected items
  const subtotal = cart.items
    .filter(item => item.selected)
    .reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.round((subtotal * coupon.discount) / 100);
    if (coupon.maxDiscount) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = coupon.discount;
  }

  discount = Math.min(discount, subtotal);

  cart.couponCode = couponCode.toUpperCase();
  cart.couponDiscount = discount;
  await cart.save();

  res.status(200).json({
    success: true,
    message: `Coupon applied! You saved Rs.${discount}.`,
    coupon: {
      code: couponCode.toUpperCase(),
      discount,
      type: coupon.type,
    },
  });
});

/**
 * @desc   Remove coupon from cart
 * @route  DELETE /api/cart/coupon
 * @access Private (Buyer)
 */
export const removeCoupon = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });

  if (cart) {
    cart.couponCode = null;
    cart.couponDiscount = 0;
    await cart.save();
  }

  res.status(200).json({
    success: true,
    message: 'Coupon removed.',
  });
});

export default {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  toggleItemSelection,
  selectAllItems,
  clearCart,
  applyCoupon,
  removeCoupon,
};
