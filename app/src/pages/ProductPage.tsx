import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { productAPI, reviewAPI, analyticsAPI } from '@/lib/api';
import { useCart } from '@/contexts/CartContext';
import {
  Star, ShoppingCart, Heart, Share2, Truck, ShieldCheck,
  Package, Minus, Plus, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // Auth context available for future use
  const { addToCart } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [reviewsLoading, setReviewsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
      recordView();
    }
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const response = await productAPI.getProduct(id!);
      setProduct(response.data.product);
      if (response.data.product.colors?.length > 0) {
        setSelectedColor(response.data.product.colors[0]);
      }
      if (response.data.product.sizes?.length > 0) {
        setSelectedSize(response.data.product.sizes[0]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await reviewAPI.getProductReviews(id!);
      setReviews(response.data.reviews);
    } catch {
      // Silently handle
    } finally {
      setReviewsLoading(false);
    }
  };

  const recordView = async () => {
    try {
      await analyticsAPI.recordView({ productId: id!, source: 'direct' });
    } catch {
      // Silently handle
    }
  };

  const handleAddToCart = async () => {
    try {
      await addToCart(id!, quantity, {
        color: selectedColor,
        size: selectedSize,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate('/checkout');
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/product/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-medium mb-2">Product not found</h2>
        <Link to="/" className="text-indigo-600 hover:underline">Back to home</Link>
      </div>
    );
  }

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-indigo-600">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-indigo-600">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden mb-4">
            <img
              src={product.images[selectedImage] || 'https://via.placeholder.com/600'}
              alt={product.title}
              className="w-full h-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 flex-shrink-0 ${
                    selectedImage === i ? 'border-indigo-600' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <Link to={`/merchant/${product.merchant?._id}`} className="text-sm text-indigo-600 font-medium hover:underline">
            {product.merchant?.shopName}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1 mb-2">{product.title}</h1>
          {product.subtitle && <p className="text-gray-500 mb-4">{product.subtitle}</p>}

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-lg">
              <Star className="w-4 h-4 fill-green-600 text-green-600" />
              <span className="text-sm font-medium text-green-700">{product.rating || 'New'}</span>
            </div>
            {product.ratingCount > 0 && (
              <span className="text-sm text-gray-500">{product.ratingCount} reviews</span>
            )}
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl font-bold text-gray-900">Rs.{product.price}</span>
            {discount > 0 && (
              <>
                <span className="text-lg text-gray-400 line-through">Rs.{product.comparePrice}</span>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{discount}% OFF</Badge>
              </>
            )}
          </div>

          {/* Colors */}
          {product.colors?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Color: <span className="text-gray-500">{selectedColor}</span></h3>
              <div className="flex gap-2">
                {product.colors.map((color: string) => (
                  <button
                    key={color}
                    onClick={() => setSelectedColor(color)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                      selectedColor === color ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {product.sizes?.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-2">Size: <span className="text-gray-500">{selectedSize}</span></h3>
              <div className="flex gap-2">
                {product.sizes.map((size: string) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-10 h-10 rounded-lg text-sm border transition flex items-center justify-center ${
                      selectedSize === size ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Quantity</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg border flex items-center justify-center hover:bg-gray-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-medium">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 rounded-lg border flex items-center justify-center hover:bg-gray-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mb-6">
            <Button
              onClick={handleAddToCart}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-12"
            >
              <ShoppingCart className="w-5 h-5 mr-2" /> Add to Cart
            </Button>
            <Button
              onClick={handleBuyNow}
              variant="outline"
              className="flex-1 h-12 border-indigo-600 text-indigo-600 hover:bg-indigo-50"
            >
              Buy Now
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => toast.info('Added to wishlist')}
              className="h-12 w-12"
            >
              <Heart className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="h-12 w-12"
            >
              <Share2 className="w-5 h-5" />
            </Button>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
              <Truck className="w-5 h-5 text-indigo-600 mb-1" />
              <span className="text-xs text-gray-600">Free Delivery<br/>Rs.500+</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-indigo-600 mb-1" />
              <span className="text-xs text-gray-600">Secure<br/>Payment</span>
            </div>
            <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
              <Package className="w-5 h-5 text-indigo-600 mb-1" />
              <span className="text-xs text-gray-600">7-Day<br/>Returns</span>
            </div>
          </div>

          {/* Quality Details */}
          {product.qualityDetails?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium mb-2">Quality Details</h3>
              <div className="grid grid-cols-2 gap-2">
                {product.qualityDetails.map((q: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="text-gray-500">{q.label}</span>
                    <span className="font-medium">{q.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs: Description & Reviews */}
      <div className="mt-12">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
            <TabsTrigger value="description" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-4">
              Description
            </TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 px-4">
              Reviews ({reviews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="pt-6">
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="pt-6">
            {reviewsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review: any) => (
                  <div key={review._id} className="border rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {review.user?.profileImage ? (
                          <img src={review.user.profileImage} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium">{review.user?.fullName?.[0]}</span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{review.user?.fullName}</p>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3 h-3 ${i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="mt-3 text-gray-700 text-sm">{review.text}</p>
                    {review.images?.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {review.images.map((img: string, i: number) => (
                          <img key={i} src={img} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
