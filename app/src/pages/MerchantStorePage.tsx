import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { merchantAPI } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import { Star, MapPin, Phone, ShoppingCart, Store, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function MerchantStorePage() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchMerchant();
  }, [id]);

  const fetchMerchant = async () => {
    try {
      const response = await merchantAPI.getMerchant(id!);
      setMerchant(response.data.merchant);
    } catch {
      toast.error('Failed to load shop');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Skeleton className="h-48 w-full mb-6" />
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">Shop not found</h2>
        <Link to="/merchants">
          <Button variant="outline">Browse Shops</Button>
        </Link>
      </div>
    );
  }

  const products = merchant.products || [];

  return (
    <div>
      {/* Shop Header */}
      <div className="relative bg-indigo-600 h-48 md:h-64 overflow-hidden">
        {merchant.shopBanner ? (
          <img src={merchant.shopBanner} alt="" className="w-full h-full object-cover opacity-30" />
        ) : (
          <div className="w-full h-full bg-indigo-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 pb-6">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-4 border-white bg-white overflow-hidden shadow-lg">
              {merchant.shopLogo ? (
                <img src={merchant.shopLogo} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                  <Store className="w-10 h-10 text-indigo-600" />
                </div>
              )}
            </div>
            <div className="text-white pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold">{merchant.shopName}</h1>
                {merchant.verificationStatus === 'verified' && (
                  <Badge className="bg-green-500 text-white border-0">Verified</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-indigo-100">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {merchant.rating || 'New'}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {merchant.address?.city}, {merchant.address?.state}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" /> {merchant.contactInfo?.phone}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* About */}
        {merchant.shopDescription && (
          <div className="bg-white rounded-xl border p-5 mb-6">
            <h2 className="font-bold text-gray-900 mb-2">About Shop</h2>
            <p className="text-gray-600 text-sm">{merchant.shopDescription}</p>
          </div>
        )}

        {/* Categories */}
        {merchant.categories?.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer">All</Badge>
            {merchant.categories.map((cat: string) => (
              <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-gray-50">{cat}</Badge>
            ))}
          </div>
        )}

        {/* Products */}
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-600" /> Products ({products.length})
        </h2>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No products listed yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {products.map((product: any) => (
              <Link
                key={product._id}
                to={`/product/${product._id}`}
                className="group bg-white rounded-xl border hover:shadow-lg transition-all overflow-hidden"
              >
                <div className="aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.images?.[0] || 'https://via.placeholder.com/300'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 min-h-[2.5rem]">
                    {product.title}
                  </h3>
                  <div className="flex items-center gap-1 mb-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs">{product.rating || 'New'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">Rs.{product.price}</span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        addToCart(product._id, 1);
                      }}
                      className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center hover:bg-indigo-100 transition"
                    >
                      <ShoppingCart className="w-4 h-4 text-indigo-600" />
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
