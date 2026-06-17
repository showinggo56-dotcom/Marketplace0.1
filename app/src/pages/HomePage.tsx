import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router';
import { productAPI } from '@/lib/api';
import {
  SlidersHorizontal, Star, Heart,
  ArrowUpDown, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Product {
  _id: string;
  title: string;
  subtitle?: string;
  images: string[];
  price: number;
  comparePrice?: number;
  rating: number;
  ratingCount: number;
  stockStatus: string;
  category: string;
  colors: string[];
  merchant: { shopName: string; shopLogo?: string };
}

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Auth context available for future use

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalCount: 0 });

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedRating, setSelectedRating] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);
  const [availableColors, setAvailableColors] = useState<string[]>([]);

  const currentPage = Number(searchParams.get('page')) || 1;

  useEffect(() => {
    fetchCategories();
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [searchParams, sortBy, currentPage]);

  const fetchCategories = async () => {
    try {
      const response = await productAPI.getCategories();
      setCategories(response.data.categories);
    } catch {
      // Silently handle
    }
  };

  const fetchFilters = async () => {
    try {
      const response = await productAPI.getFilters();
      setAvailableColors(response.data.filters.colors || []);
    } catch {
      // Silently handle
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: 24,
        sortBy,
      };

      if (selectedCategory) params.category = selectedCategory;
      if (selectedSubcategory) params.subcategory = selectedSubcategory;
      if (priceRange.min) params.minPrice = priceRange.min;
      if (priceRange.max) params.maxPrice = priceRange.max;
      if (selectedRating) params.minRating = selectedRating;
      if (selectedColor) params.color = selectedColor;
      if (searchQuery) params.search = searchQuery;

      const response = await productAPI.getProducts(params);
      setProducts(response.data.products);
      setPagination(response.data.pagination);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    const params: any = { page: '1' };
    if (selectedCategory) params.category = selectedCategory;
    if (selectedSubcategory) params.subcategory = selectedSubcategory;
    if (priceRange.min) params.minPrice = priceRange.min;
    if (priceRange.max) params.maxPrice = priceRange.max;
    if (selectedRating) params.minRating = selectedRating;
    if (selectedColor) params.color = selectedColor;
    if (searchQuery) params.search = searchQuery;
    if (sortBy !== 'newest') params.sortBy = sortBy;
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedSubcategory('');
    setPriceRange({ min: '', max: '' });
    setSelectedRating(0);
    setSelectedColor('');
    setSearchQuery('');
    setSortBy('newest');
    setSearchParams({});
  };

  const handlePageChange = (page: number) => {
    const params = Object.fromEntries(searchParams.entries());
    params.page = page.toString();
    setSearchParams(params);
  };

  const discountPercent = (price: number, compare?: number) => {
    if (!compare || compare <= price) return 0;
    return Math.round(((compare - price) / compare) * 100);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-indigo-600 mb-8">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80')] bg-cover bg-center opacity-20" />
        <div className="relative px-6 py-12 md:px-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Discover Local Excellence
          </h1>
          <p className="text-indigo-100 text-lg max-w-xl mb-6">
            Shop from verified local merchants. Unique products, authentic quality, delivered to your doorstep.
          </p>
          <div className="flex gap-3">
            <Link to="/merchants">
              <Button className="bg-white text-indigo-600 hover:bg-gray-100">Browse Shops</Button>
            </Link>
            <Link to="/become-merchant">
              <Button variant="outline" className="border-white text-white hover:bg-white/10">
                Start Selling
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        <button
          onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); }}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
            !selectedCategory ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'
          }`}
        >
          All Products
        </button>
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => { setSelectedCategory(cat.name); setSelectedSubcategory(''); }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              selectedCategory === cat.name ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Filters & Sort Bar */}
      <div id="products-section" className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'border-indigo-600 text-indigo-600' : ''}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" /> Filters
          </Button>
          {selectedCategory && (
            <Badge variant="secondary" className="gap-1">
              {selectedCategory}
              <button onClick={() => { setSelectedCategory(''); }} className="ml-1 hover:text-red-500">&times;</button>
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <button onClick={() => { setSearchQuery(''); }} className="ml-1 hover:text-red-500">&times;</button>
            </Badge>
          )}
          {(selectedCategory || priceRange.min || selectedRating || selectedColor || searchQuery) && (
            <button onClick={clearFilters} className="text-sm text-indigo-600 hover:underline">
              Clear all
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{pagination.totalCount} products</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="newest">Newest</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
            <ArrowUpDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border p-6 mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {/* Price Range */}
          <div>
            <h4 className="font-medium text-sm mb-3">Price Range</h4>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <h4 className="font-medium text-sm mb-3">Minimum Rating</h4>
            <div className="flex gap-1">
              {[4, 3, 2, 1].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setSelectedRating(selectedRating === rating ? 0 : rating)}
                  className={`flex items-center gap-0.5 px-2 py-1.5 rounded-lg text-xs border transition ${
                    selectedRating === rating ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" /> {rating}+
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          {availableColors.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-3">Color</h4>
              <div className="flex flex-wrap gap-1.5">
                {availableColors.slice(0, 8).map((color) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(selectedColor === color ? '' : color)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
                      selectedColor === color ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subcategories */}
          {selectedCategory && categories.find(c => c.name === selectedCategory)?.subcategories.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-3">Subcategory</h4>
              <div className="flex flex-wrap gap-1.5">
                {categories.find(c => c.name === selectedCategory)?.subcategories.map((sub: string) => (
                  <button
                    key={sub}
                    onClick={() => setSelectedSubcategory(selectedSubcategory === sub ? '' : sub)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs border transition ${
                      selectedSubcategory === sub ? 'bg-indigo-600 text-white border-indigo-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Apply Button */}
          <div className="flex items-end">
            <Button onClick={applyFilters} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
              Apply Filters
            </Button>
          </div>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-3">
              <Skeleton className="aspect-square rounded-lg mb-3" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-2" />
              <Skeleton className="h-5 w-1/3" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your filters or search query.</p>
          <Button onClick={clearFilters} variant="outline">Clear Filters</Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {products.map((product) => (
              <Link
                key={product._id}
                to={`/product/${product._id}`}
                className="group bg-white rounded-xl border hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                {/* Image */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.images[0] || 'https://via.placeholder.com/300'}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {discountPercent(product.price, product.comparePrice) > 0 && (
                    <Badge className="absolute top-2 left-2 bg-red-500 text-white text-[10px]">
                      -{discountPercent(product.price, product.comparePrice)}%
                    </Badge>
                  )}
                  {product.stockStatus === 'low_stock' && (
                    <Badge variant="outline" className="absolute top-2 right-2 bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                      Low Stock
                    </Badge>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); toast.info('Added to wishlist'); }}
                    className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-white"
                  >
                    <Heart className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs text-indigo-600 font-medium mb-0.5 truncate">{product.merchant?.shopName}</p>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1 min-h-[2.5rem]">
                    {product.title}
                  </h3>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium">{product.rating || 'New'}</span>
                    {product.ratingCount > 0 && (
                      <span className="text-xs text-gray-400">({product.ratingCount})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-gray-900">Rs.{product.price}</span>
                    {product.comparePrice && product.comparePrice > product.price && (
                      <span className="text-xs text-gray-400 line-through">Rs.{product.comparePrice}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage === 1}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
              >
                Previous
              </Button>
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let page = i + 1;
                if (pagination.totalPages > 5 && pagination.currentPage > 3) {
                  page = pagination.currentPage - 2 + i;
                }
                if (page > pagination.totalPages) return null;
                return (
                  <Button
                    key={page}
                    variant={pagination.currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className={pagination.currentPage === page ? 'bg-indigo-600' : ''}
                  >
                    {page}
                  </Button>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.currentPage === pagination.totalPages}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
