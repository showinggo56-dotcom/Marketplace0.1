import { Routes, Route } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { useEffect } from 'react';

// Layout
import MainLayout from '@/components/layout/MainLayout';

// Pages
import HomePage from '@/pages/HomePage';
import ProductPage from '@/pages/ProductPage';
import CartPage from '@/pages/CartPage';
import CheckoutPage from '@/pages/CheckoutPage';
import OrdersPage from '@/pages/OrdersPage';
import OrderDetailPage from '@/pages/OrderDetailPage';
import MerchantDashboardPage from '@/pages/MerchantDashboardPage';
import MerchantsPage from '@/pages/MerchantsPage';
import MerchantStorePage from '@/pages/MerchantStorePage';
import ProfilePage from '@/pages/ProfilePage';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import VerifyOTPPage from '@/pages/VerifyOTPPage';
import BecomeMerchantPage from '@/pages/BecomeMerchantPage';
import NotFoundPage from '@/pages/NotFoundPage';

function App() {
  const { isAuthenticated } = useAuth();
  const { fetchCart } = useCart();

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    }
  }, [isAuthenticated, fetchCart]);

  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/merchants" element={<MerchantsPage />} />
        <Route path="/merchant/:id" element={<MerchantStorePage />} />

        {/* Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-otp" element={<VerifyOTPPage />} />

        {/* Protected Routes */}
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/become-merchant" element={<BecomeMerchantPage />} />
        <Route path="/merchant-dashboard" element={<MerchantDashboardPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
