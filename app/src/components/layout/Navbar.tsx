import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import {
  ShoppingCart, Search, User, Menu, X, Store, LogOut,
  ChevronDown, Package, ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function Navbar() {
  const { user, isAuthenticated, isMerchant, logout } = useAuth();
  const { summary } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const scrollToProducts = () => {
    if (location.pathname === '/') {
      document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/');
      setTimeout(() => {
        document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b'
          : 'bg-white border-b'
      }`}
    >
      {/* Top Bar */}
      <div className="bg-indigo-600 text-white text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            Free shipping on orders above Rs.500
          </span>
          <div className="hidden sm:flex items-center gap-4">
            <Link to="/merchants" className="hover:text-indigo-200 transition">Sell on MarketPlace</Link>
            <span className="text-indigo-300">|</span>
            <span>Customer Support: 1800-123-4567</span>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 hidden sm:block">
              Market<span className="text-indigo-600">Place</span>
            </span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for products, brands, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
          </form>

          {/* Right Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Cart */}
            <Link
              to="/cart"
              className="relative p-2 rounded-lg hover:bg-gray-100 transition"
            >
              <ShoppingCart className="w-5 h-5 text-gray-700" />
              {summary.selectedCount > 0 && (
                <Badge className="absolute -top-0.5 -right-0.5 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-indigo-600">
                  {summary.selectedCount}
                </Badge>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition">
                    {user?.profileImage ? (
                      <img src={user.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                    )}
                    <span className="hidden lg:block text-sm font-medium text-gray-700 max-w-[100px] truncate">
                      {user?.fullName?.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-400 hidden lg:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2 border-b">
                    <p className="font-medium text-sm">{user?.fullName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                    {isMerchant && (
                      <Badge variant="outline" className="mt-1 text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                        Merchant
                      </Badge>
                    )}
                  </div>
                  <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                    <User className="w-4 h-4 mr-2" /> My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/orders')} className="cursor-pointer">
                    <Package className="w-4 h-4 mr-2" /> My Orders
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/cart')} className="cursor-pointer">
                    <ShoppingCart className="w-4 h-4 mr-2" /> My Cart
                  </DropdownMenuItem>
                  {isMerchant ? (
                    <DropdownMenuItem onClick={() => navigate('/merchant-dashboard')} className="cursor-pointer">
                      <Store className="w-4 h-4 mr-2" /> Dashboard
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => navigate('/become-merchant')} className="cursor-pointer">
                      <Store className="w-4 h-4 mr-2" /> Become a Seller
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="hidden sm:flex">Sign In</Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">Sign Up</Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition md:hidden"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Category Nav */}
        <nav className="hidden md:flex items-center gap-6 h-10 text-sm text-gray-600 overflow-x-auto">
          <button onClick={scrollToProducts} className="hover:text-indigo-600 transition whitespace-nowrap font-medium">
            All Products
          </button>
          <button onClick={() => navigate('/?category=Clothing')} className="hover:text-indigo-600 transition whitespace-nowrap">
            Clothing
          </button>
          <button onClick={() => navigate('/?category=Electronics')} className="hover:text-indigo-600 transition whitespace-nowrap">
            Electronics
          </button>
          <button onClick={() => navigate('/?category=Home')} className="hover:text-indigo-600 transition whitespace-nowrap">
            Home & Living
          </button>
          <button onClick={() => navigate('/?category=Books')} className="hover:text-indigo-600 transition whitespace-nowrap">
            Books
          </button>
          <button onClick={() => navigate('/?category=Sports')} className="hover:text-indigo-600 transition whitespace-nowrap">
            Sports
          </button>
          <button onClick={() => navigate('/?category=Furniture')} className="hover:text-indigo-600 transition whitespace-nowrap">
            Furniture
          </button>
          <Link to="/merchants" className="hover:text-indigo-600 transition whitespace-nowrap ml-auto font-medium text-indigo-600">
            Browse Shops
          </Link>
        </nav>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          <div className="p-4 space-y-3">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </form>
            <div className="flex flex-col gap-2">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="py-2 text-gray-700">All Products</Link>
              <Link to="/?category=Clothing" onClick={() => setMobileMenuOpen(false)} className="py-2 text-gray-700">Clothing</Link>
              <Link to="/?category=Electronics" onClick={() => setMobileMenuOpen(false)} className="py-2 text-gray-700">Electronics</Link>
              <Link to="/?category=Home" onClick={() => setMobileMenuOpen(false)} className="py-2 text-gray-700">Home & Living</Link>
              <Link to="/merchants" onClick={() => setMobileMenuOpen(false)} className="py-2 text-indigo-600 font-medium">Browse Shops</Link>
              {isAuthenticated && (
                <>
                  <hr className="my-1" />
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="py-2 text-gray-700">My Profile</Link>
                  <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className="py-2 text-gray-700">My Orders</Link>
                  <Link to="/cart" onClick={() => setMobileMenuOpen(false)} className="py-2 text-gray-700">My Cart</Link>
                  {isMerchant && (
                    <Link to="/merchant-dashboard" onClick={() => setMobileMenuOpen(false)} className="py-2 text-gray-700">Dashboard</Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
