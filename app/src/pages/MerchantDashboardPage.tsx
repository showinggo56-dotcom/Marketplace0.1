import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { orderAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Store, Package, DollarSign, ShoppingBag, TrendingUp,
  Clock, CheckCircle, Truck, Loader2, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { label: 'Accepted', color: 'bg-blue-100 text-blue-700' },
  packed: { label: 'Packed', color: 'bg-indigo-100 text-indigo-700' },
  shipping: { label: 'Shipping', color: 'bg-purple-100 text-purple-700' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
};

const statusActions: Record<string, string[]> = {
  pending: ['accepted', 'rejected'],
  accepted: ['packed'],
  packed: ['shipping'],
};

export default function MerchantDashboardPage() {
  const { user, isMerchant } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isMerchant) {
      fetchStats();
      fetchOrders();
    }
  }, [isMerchant]);

  const fetchStats = async () => {
    try {
      const response = await orderAPI.getMerchantStats();
      setStats(response.data.stats);
    } catch {
      // Silently handle
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await orderAPI.getMerchantOrders({ limit: 20 });
      setOrders(response.data.orders);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    setActionLoading(orderId);
    try {
      await orderAPI.updateOrderStatus(orderId, { status });
      toast.success(`Order ${status}`);
      fetchOrders();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isMerchant) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">Merchant Access Required</h2>
        <p className="text-gray-500 mb-4">You need to register as a merchant to access this page.</p>
        <Link to="/become-merchant">
          <Button className="bg-indigo-600">Become a Seller</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Store className="w-7 h-7 text-indigo-600" /> Merchant Dashboard
          </h1>
          <p className="text-gray-500">{user?.merchantProfile?.shopName}</p>
        </div>
        <Link to="/profile">
          <Button variant="outline">Manage Shop</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingBag, color: 'bg-blue-50 text-blue-600' },
          { label: 'Pending', value: stats?.pendingOrders || 0, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Revenue', value: `Rs.${(stats?.totalRevenue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-green-50 text-green-600' },
          { label: 'Avg Order', value: `Rs.${stats?.avgOrderValue || 0}`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border p-5">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Orders Section */}
      <div className="bg-white rounded-xl border">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
          <div className="flex gap-2">
            {['pending', 'accepted', 'packed', 'shipping', 'delivered'].map((s) => (
              <Badge key={s} variant="outline" className="capitalize text-xs">
                {s}: {stats?.statusBreakdown?.[s] || 0}
              </Badge>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y">
            {orders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const availableActions = statusActions[order.status] || [];

              return (
                <div key={order._id} className="p-5 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.orderNumber}</span>
                        <Badge className={`${config.color} text-xs`}>{config.label}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {order.items.length} items - Rs.{order.totalPrice?.toLocaleString()}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="flex gap-2 mb-3">
                    {order.items.slice(0, 4).map((item: any, i: number) => (
                      <div key={i} className="w-10 h-10 bg-gray-100 rounded overflow-hidden">
                        <img src={item.productSnapshot?.image || ''} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>

                  {/* Status Actions */}
                  {availableActions.length > 0 && (
                    <div className="flex gap-2">
                      {availableActions.map((action) => (
                        <Button
                          key={action}
                          size="sm"
                          variant={action === 'rejected' ? 'outline' : 'default'}
                          disabled={!!actionLoading}
                          onClick={() => handleStatusUpdate(order._id, action)}
                          className={action === 'rejected' ? 'text-red-600 border-red-200' : 'bg-indigo-600'}
                        >
                          {actionLoading === order._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              {action === 'accepted' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {action === 'packed' && <Package className="w-3 h-3 mr-1" />}
                              {action === 'shipping' && <Truck className="w-3 h-3 mr-1" />}
                              {action.charAt(0).toUpperCase() + action.slice(1)}
                            </>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
