import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { checkoutAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import {
  CreditCard, Wallet, Truck, ShieldCheck, Loader2, MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, couponCode, clearCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const selectedItems = items.filter(item => item.selected);

  useEffect(() => {
    if (selectedItems.length === 0) {
      navigate('/cart');
      return;
    }
    fetchCheckoutSummary();
    fetchPaymentMethods();
  }, []);

  const fetchCheckoutSummary = async () => {
    try {
      const cartItems = selectedItems.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        variant: item.variant,
      }));

      const response = await checkoutAPI.getSummary({
        cartItems,
        couponCode,
      });

      setCheckoutData(response.data);
      setLoading(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load checkout');
      navigate('/cart');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await checkoutAPI.getPaymentMethods();
      setPaymentMethods(response.data.methods);
    } catch {
      // Silently handle
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress && user?.addresses?.length === 0) {
      toast.error('Please add a delivery address');
      return;
    }

    setProcessing(true);
    try {
      const cartItemIds = selectedItems.map(item => item._id);

      const response = await checkoutAPI.processCheckout({
        cartItemIds,
        deliveryAddressId: selectedAddress || undefined,
        paymentMethod,
        useWallet: true,
        couponCode,
      });

      toast.success(response.data.message);
      clearCart();
      navigate('/orders');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
        <p className="mt-2 text-gray-500">Preparing your checkout...</p>
      </div>
    );
  }

  const totals = checkoutData?.totals || {};
  const addresses = user?.addresses || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Address */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" /> Delivery Address
            </h2>

            {addresses.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">No saved addresses</p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/profile')}
                >
                  Add Address
                </Button>
              </div>
            ) : (
              <RadioGroup
                value={selectedAddress}
                onValueChange={setSelectedAddress}
                className="space-y-3"
              >
                {addresses.map((addr: any) => (
                  <div
                    key={addr._id}
                    className={`flex items-start gap-3 p-4 rounded-xl border transition ${
                      selectedAddress === addr._id ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <RadioGroupItem value={addr._id} id={addr._id} className="mt-1" />
                    <Label htmlFor={addr._id} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Default</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{addr.street}</p>
                      <p className="text-sm text-gray-600">{addr.city}, {addr.state} {addr.postalCode}</p>
                      {addr.phone && <p className="text-sm text-gray-500">{addr.phone}</p>}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" /> Payment Method
            </h2>

            <RadioGroup
              value={paymentMethod}
              onValueChange={setPaymentMethod}
              className="space-y-3"
            >
              {paymentMethods.filter((m: any) => m.enabled).map((method: any) => (
                <div
                  key={method.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition ${
                    paymentMethod === method.id ? 'border-indigo-600 bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <RadioGroupItem value={method.id} id={method.id} className="mt-1" />
                  <Label htmlFor={method.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{method.name}</span>
                      {method.balance !== undefined && (
                        <span className="text-sm text-gray-500">Rs.{method.balance}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{method.description}</p>
                    {method.restrictions?.maxOrderValue && totals.totalPrice > method.restrictions.maxOrderValue && (
                      <p className="text-xs text-red-500 mt-1">
                        Not available for orders above Rs.{method.restrictions.maxOrderValue}
                      </p>
                    )}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Order Items */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Order Items ({selectedItems.length})
            </h2>
            <div className="space-y-3">
              {selectedItems.map((item) => (
                <div key={item._id} className="flex gap-4 py-3 border-b last:border-0">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    <img
                      src={item.product.images?.[0] || 'https://via.placeholder.com/64'}
                      alt={item.product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium line-clamp-1">{item.product.title}</h3>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    {item.variant?.color && <p className="text-xs text-gray-500">Color: {item.variant.color}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">Rs.{(item.product.price * item.quantity).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-6 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Summary</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">Rs.{totals.subtotal?.toLocaleString()}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Discount</span>
                  <span className="font-medium text-green-600">-Rs.{totals.discount?.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Platform Fee</span>
                <span className="font-medium">Rs.{totals.platformFee?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Shipping</span>
                <span className="font-medium">Rs.{totals.shippingCost?.toLocaleString()}</span>
              </div>
              {totals.walletDeduction > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-indigo-600 flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Wallet Used
                  </span>
                  <span className="font-medium text-indigo-600">-Rs.{totals.walletDeduction?.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between mb-1">
                <span className="font-bold text-gray-900">Total Payable</span>
                <span className="font-bold text-xl text-gray-900">Rs.{totals.amountPaid?.toLocaleString()}</span>
              </div>
              {totals.walletDeduction > 0 && (
                <p className="text-xs text-gray-500 text-right">
                  You saved Rs.{totals.walletDeduction?.toLocaleString()} using wallet
                </p>
              )}
            </div>

            {/* Trust */}
            <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-green-500" /> SSL Secure</span>
              <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-indigo-500" /> Fast Delivery</span>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={processing || addresses.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-base"
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...
                </>
              ) : (
                <>Place Order</>
              )}
            </Button>

            {addresses.length === 0 && (
              <p className="text-xs text-amber-600 text-center mt-2">Please add a delivery address</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
