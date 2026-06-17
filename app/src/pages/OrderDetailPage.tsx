import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { orderAPI } from '@/lib/api';
import {
  ArrowLeft, Package, Star, MapPin, CreditCard, Truck,
  CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'accepted', label: 'Accepted', icon: CheckCircle },
  { key: 'packed', label: 'Packed', icon: Package },
  { key: 'shipping', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState({ rating: 5, text: '', images: [] });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await orderAPI.getOrder(id!);
      setOrder(response.data.order);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewData.text.trim()) {
      toast.error('Please write a review');
      return;
    }
    setSubmittingReview(true);
    try {
      await orderAPI.submitReview(id!, {
        rating: reviewData.rating,
        text: reviewData.text,
        images: reviewData.images,
      });
      toast.success('Review submitted!');
      setShowReviewForm(false);
      fetchOrder();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancelOrder = async () => {
    try {
      await orderAPI.cancelOrder(id!);
      toast.success('Order cancelled');
      fetchOrder();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">Order not found</h2>
        <Link to="/orders">
          <Button variant="outline">Back to Orders</Button>
        </Link>
      </div>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/orders')} className="p-2 hover:bg-gray-100 rounded-lg transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Order {order.orderNumber}</h1>
          <p className="text-sm text-gray-500">
            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Status Timeline */}
      {order.status !== 'cancelled' && order.status !== 'rejected' && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;

              return (
                <div key={step.key} className="flex flex-col items-center flex-1 relative">
                  {index < statusSteps.length - 1 && (
                    <div className={`absolute top-5 left-1/2 w-full h-0.5 ${
                      index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`} style={{ transform: 'translateX(50%)' }} />
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 z-10 ${
                    isCompleted ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}>
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Order Items</h2>
        <div className="space-y-4">
          {order.items.map((item: any, i: number) => (
            <div key={i} className="flex gap-4 py-3 border-b last:border-0">
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                <img
                  src={item.productSnapshot?.image || 'https://via.placeholder.com/80'}
                  alt={item.productSnapshot?.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{item.productSnapshot?.title}</h3>
                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                {item.variant?.color && <p className="text-xs text-gray-500">Color: {item.variant.color}</p>}
              </div>
              <div className="text-right">
                <p className="font-bold">Rs.{(item.priceAtPurchase * item.quantity).toLocaleString()}</p>
                <p className="text-xs text-gray-500">Rs.{item.priceAtPurchase} each</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery & Payment Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" /> Delivery Address
          </h2>
          <p className="font-medium">{order.deliveryAddress?.label || 'Home'}</p>
          <p className="text-gray-600 text-sm">{order.deliveryAddress?.street}</p>
          <p className="text-gray-600 text-sm">{order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.postalCode}</p>
          {order.deliveryAddress?.phone && <p className="text-gray-500 text-sm mt-1">{order.deliveryAddress.phone}</p>}
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" /> Payment Details
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Method</span>
              <span className="font-medium capitalize">{order.paymentMethod?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">Rs.{order.subtotal?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Shipping</span>
              <span className="font-medium">Rs.{order.shippingCost?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Platform Fee</span>
              <span className="font-medium">Rs.{order.platformFee?.toLocaleString()}</span>
            </div>
            {order.walletDeduction > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-indigo-600">Wallet Used</span>
                <span className="font-medium text-indigo-600">-Rs.{order.walletDeduction?.toLocaleString()}</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Discount</span>
                <span className="font-medium text-green-600">-Rs.{order.discount?.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between">
              <span className="font-bold">Total</span>
              <span className="font-bold text-lg">Rs.{order.totalPrice?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Section */}
      {order.isReviewable && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          {!showReviewForm ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-3">How was your experience with this order?</p>
              <Button onClick={() => setShowReviewForm(true)} className="bg-amber-500 hover:bg-amber-600 text-white">
                <Star className="w-4 h-4 mr-2" /> Write a Review
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-lg">Write a Review</h3>
              <div>
                <label className="text-sm font-medium mb-2 block">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                      className="p-1 transition"
                    >
                      <Star className={`w-8 h-8 ${
                        star <= reviewData.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Your Review</label>
                <textarea
                  value={reviewData.text}
                  onChange={(e) => setReviewData(prev => ({ ...prev, text: e.target.value }))}
                  placeholder="Share your experience with this product..."
                  className="w-full p-3 border rounded-xl text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button variant="outline" onClick={() => setShowReviewForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submitted Review */}
      {order.review && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <h2 className="text-lg font-bold mb-3">Your Review</h2>
          <div className="flex items-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className={`w-4 h-4 ${
                star <= order.review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
              }`} />
            ))}
          </div>
          <p className="text-gray-700">{order.review.text}</p>
        </div>
      )}

      {/* Actions */}
      {order.canCancel && (
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleCancelOrder} className="text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="w-4 h-4 mr-2" /> Cancel Order
          </Button>
        </div>
      )}
    </div>
  );
}
