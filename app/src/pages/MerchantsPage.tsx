import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { merchantAPI } from '@/lib/api';
import { Star, MapPin, Store, Package, Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    try {
      const response = await merchantAPI.getMerchants();
      setMerchants(response.data.merchants);
    } catch {
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  const filtered = merchants.filter(m =>
    m.shopName?.toLowerCase().includes(search.toLowerCase()) ||
    m.shopDescription?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Local Shops</h1>
        <p className="text-gray-500 max-w-xl mx-auto">
          Discover unique products from verified local merchants in your area.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search shops..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition outline-none"
          />
        </div>
      </div>

      {/* Merchants Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">No shops found</h2>
          <p className="text-gray-500">Try a different search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((merchant) => (
            <Link
              key={merchant._id}
              to={`/merchant/${merchant._id}`}
              className="group bg-white rounded-2xl border hover:shadow-lg transition-all duration-200 overflow-hidden"
            >
              {/* Banner */}
              <div className="relative h-32 bg-indigo-100 overflow-hidden">
                {merchant.shopBanner ? (
                  <img src={merchant.shopBanner} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full bg-indigo-600" />
                )}
                {/* Logo */}
                <div className="absolute -bottom-8 left-4">
                  <div className="w-16 h-16 rounded-xl border-4 border-white bg-white overflow-hidden shadow-sm">
                    {merchant.shopLogo ? (
                      <img src={merchant.shopLogo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-indigo-100 flex items-center justify-center">
                        <Store className="w-6 h-6 text-indigo-600" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="pt-10 px-5 pb-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg text-gray-900 group-hover:text-indigo-600 transition">
                    {merchant.shopName}
                  </h3>
                  {merchant.verificationStatus === 'verified' && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      Verified
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {merchant.shopDescription || 'No description available.'}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {merchant.rating || 'New'}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {merchant.address?.city}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    {merchant.categories?.length || 0} categories
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
