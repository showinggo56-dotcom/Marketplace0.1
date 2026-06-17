import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import {
  ShoppingCart, Minus, Plus, Trash2, Package, ArrowRight,
  Tag, X, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
// Toast notifications handled by cart context

export default function CartPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const {
    items, summary, isLoading, couponCode, couponDiscount,
    updateQuantity, removeItem, toggleSelection,
    selectAll, applyCoupon, removeCoupon, clearCart,
  } = useCart();

  const [couponInput, setCouponInput] = useState('');

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">Please sign in to view your cart</h2>
        <p className="text-gray-500 mb-4">Your cart items will be saved to your account.</p>
        <Link to="/login">
          <Button className="bg-indigo-600">Sign In</Button>
        </Link>
      </div>
    );
  }

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    applyCoupon(couponInput.trim());
    setCouponInput('');
  };

  const selectedItems = items.filter(item => item.selected);
  const canCheckout = selectedItems.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <ShoppingCart className="w-6 h-6" /> Shopping Cart
      </h1>

      {isLoading && items.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">Your cart is empty</h2>
          <p className="text-gray-500 mb-4">Looks like you haven't added anything yet.</p>
          <Link to="/">
            <Button className="bg-indigo-600">Start Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {/* Select All */}
            <div className="flex items-center justify-between mb-4 bg-white rounded-xl border p-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={items.length > 0 && items.every(item => item.selected)}
                  onCheckedChange={(checked) => selectAll(!!checked)}
                />
                <span className="text-sm font-medium">
                  Select All ({items.length} items)
                </span>
              </div>
              <button
                onClick={clearCart}
                className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> Clear Cart
              </button>
            </div>

            {/* Items List */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item._id}
                  className={`bg-white rounded-xl border p-4 transition ${
                    item.selected ? 'border-indigo-200 ring-1 ring-indigo-100' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {/* Checkbox */}
                    <div className="flex items-start pt-1">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleSelection(item._id)}
                      />
                    </div>

                    {/* Image */}
                    <Link to={`/product/${item.product._id}`} className="shrink-0">
                      <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={item.product.images?.[0] || 'https://via.placeholder.com/100'}
                          alt={item.product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/product/${item.product._id}`}>
                        <h3 className="font-medium text-gray-900 line-clamp-2 hover:text-indigo-600 transition">
                          {item.product.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-500 mt-0.5">{item.product.merchant?.shopName}</p>
                      {item.variant?.color && (
                        <p className="text-xs text-gray-500">Color: {item.variant.color}</p>
                      )}
                      {item.variant?.size && (
                        <p className="text-xs text-gray-500">Size: {item.variant.size}</p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item._id, item.quantity - 1)}
                            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item._id, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-gray-50"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price & Remove */}
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-gray-900">
                            Rs.{(item.product.price * item.quantity).toLocaleString()}
                          </span>
                          <button
                            onClick={() => removeItem(item._id)}
                            className="text-gray-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border p-6 sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

              {/* Price Breakdown */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal ({summary.selectedCount} items)</span>
                  <span className="font-medium">Rs.{summary.subtotal.toLocaleString()}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Discount ({couponCode})
                      <button onClick={removeCoupon} className="text-red-400 hover:text-red-600 ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                    <span className="font-medium text-green-600">-Rs.{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className="font-medium text-green-600">
                    {summary.subtotal > 500 ? 'Free' : 'Rs.40'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Platform Fee</span>
                  <span className="font-medium">Rs.{Math.round(summary.subtotal * 0.025).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <div className="flex justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-xl text-gray-900">
                    Rs.{(summary.subtotal - couponDiscount + (summary.subtotal > 500 ? 0 : 40) + Math.round(summary.subtotal * 0.025)).toLocaleString()}
                  </span>
                </div>
                {summary.subtotal > 0 && summary.subtotal <= 500 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Add Rs.{(500 - summary.subtotal).toLocaleString()} more for free shipping
                  </p>
                )}
              </div>

              {/* Coupon Input */}
              {!couponCode && (
                <div className="mb-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyCoupon}
                      className="shrink-0"
                    >
                      Apply
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Try: SAVE10, FLAT100, WELCOME</p>
                </div>
              )}

              {/* Checkout Button */}
              <Button
                onClick={() => canCheckout && navigate('/checkout')}
                disabled={!canCheckout}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base"
              >
                Proceed to Checkout <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              {!canCheckout && (
                <p className="text-xs text-amber-600 text-center mt-2">
                  Select at least one item to checkout
                </p>
              )}

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> Secure</span>
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-500" /> 7-day returns</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
