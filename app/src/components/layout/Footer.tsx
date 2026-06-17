import { Link } from 'react-router';
import { Store, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Market<span className="text-indigo-400">Place</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              Your local multi-merchant marketplace. Discover unique products from verified local sellers.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span>support@marketplace.com</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-400" />
                <span>1800-123-4567</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                <span>Bangalore, India</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/" className="hover:text-indigo-400 transition">Home</Link></li>
              <li><Link to="/merchants" className="hover:text-indigo-400 transition">Browse Shops</Link></li>
              <li><Link to="/cart" className="hover:text-indigo-400 transition">My Cart</Link></li>
              <li><Link to="/orders" className="hover:text-indigo-400 transition">My Orders</Link></li>
              <li><Link to="/profile" className="hover:text-indigo-400 transition">My Profile</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold mb-4">Categories</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/?category=Clothing" className="hover:text-indigo-400 transition">Clothing</Link></li>
              <li><Link to="/?category=Electronics" className="hover:text-indigo-400 transition">Electronics</Link></li>
              <li><Link to="/?category=Home" className="hover:text-indigo-400 transition">Home & Living</Link></li>
              <li><Link to="/?category=Books" className="hover:text-indigo-400 transition">Books</Link></li>
              <li><Link to="/?category=Sports" className="hover:text-indigo-400 transition">Sports</Link></li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h3 className="text-white font-semibold mb-4">For Sellers</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/become-merchant" className="hover:text-indigo-400 transition">Become a Seller</Link></li>
              <li><Link to="/merchants" className="hover:text-indigo-400 transition">Seller Stories</Link></li>
              <li><span className="hover:text-indigo-400 transition cursor-pointer">Seller Guidelines</span></li>
              <li><span className="hover:text-indigo-400 transition cursor-pointer">Shipping & Returns</span></li>
              <li><span className="hover:text-indigo-400 transition cursor-pointer">FAQ</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            &copy; 2025 MarketPlace. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-gray-500">
            <span className="hover:text-gray-300 cursor-pointer transition">Privacy Policy</span>
            <span className="hover:text-gray-300 cursor-pointer transition">Terms of Service</span>
            <span className="hover:text-gray-300 cursor-pointer transition">Cookie Policy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
