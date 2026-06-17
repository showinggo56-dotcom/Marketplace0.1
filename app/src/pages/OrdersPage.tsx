import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { orderAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package, Clock, Truck, CheckCircle, XCircle, Star,
  ChevronRight, ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  packed: { label: 'Packed', color: 'bg-indigo-100 text-indigo-700', icon: Package },
  shipping: { label: 'Shipping', color: 'bg-purple-100 text-purple-700', icon: Truck },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-orange-100 text-orange-700', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  returned: { label: 'Returned', color: 'bg-gray-100 text-gray-700', icon: XCircle },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (activeTab !== 'all') {
        if (activeTab === 'active') {
          // Active includes multiple statuses - fetch all and filter client-side
        } else {
          params.status = activeTab;
        }
      }

      const response = await orderAPI.getMyOrders(params);
      let filteredOrders = response.data.orders;

      if (activeTab === 'active') {
        filteredOrders = filteredOrders.filter((o: any) =>
          ['accepted', 'packed', 'shipping', 'out_for_delivery'].includes(o.status)
        );
      }

      setOrders(filteredOrders);
      setStatusCounts(response.data.statusCounts);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    try {
      await orderAPI.cancelOrder(orderId, 'Cancelled by user');
      toast.success('Order cancelled successfully');
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">Please sign in to view your orders</h2>
        <Link to="/login">
          <Button className="bg-indigo-600">Sign In</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
        {[
          { key: 'all', label: 'All', count: statusCounts.all },
          { key: 'pending', label: 'Pending', count: statusCounts.pending },
          { key: 'active', label: 'Active', count: statusCounts.active },
          { key: 'delivered', label: 'Delivered', count: statusCounts.delivered },
          { key: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            {tab.label} ({tab.count || 0})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">No orders found</h2>
          <p className="text-gray-500 mb-4">
            {activeTab === 'all' ? 'You haven\'t placed any orders yet.' : 'No orders in this category.'}
          </p>
          <Link to="/">
            <Button className="bg-indigo-600">Start Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = config.icon;

            return (
              <div key={order._id} className="bg-white rounded-xl border p-5 hover:shadow-md transition">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{order.orderNumber}</span>
                    <Badge className={`${config.color} text-xs`}>
                      <StatusIcon className="w-3 h-3 mr-1" /> {config.label}
                    </Badge>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </div>

                {/* Items Preview */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 3).map((item: any, i: number) => (
                      <div key={i} className="w-12 h-12 rounded-lg border-2 border-white bg-gray-100 overflow-hidden">
                        <img
                          src={item.productSnapshot?.image || 'https://via.placeholder.com/48'}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="w-12 h-12 rounded-lg border-2 border-white bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''} from {order.merchant?.shopName}
                    </p>
                    {order.deliveryEstimate && (
                      <p className="text-xs text-indigo-600 font-medium mt-0.5">
                        {order.deliveryEstimate.text}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">Rs.{order.totalPrice?.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 capitalize">{order.paymentMethod}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex gap-2">
                    {order.canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelOrder(order._id)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    )}
                    {order.isReviewable && (
                      <Button
                        size="sm"
                        onClick={() => navigate(`/orders/${order._id}`)}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                      >
                        <Star className="w-3 h-3 mr-1" /> Write Review
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/orders/${order._id}`)}
                    className="text-indigo-600"
                  >
                    View Details <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
