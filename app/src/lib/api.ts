import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      // Don't redirect here - let the auth context handle it
    }
    return Promise.reject(error);
  }
);

// ═══════════════════════════════════════════
// Auth API
// ═══════════════════════════════════════════
export const authAPI = {
  signup: (data: { fullName: string; email: string; password: string; role?: string }) =>
    api.post('/auth/signup', data),

  verifyOTP: (data: { email: string; otp: string; purpose?: string }) =>
    api.post('/auth/verify-otp', data),

  resendOTP: (data: { email: string; purpose?: string }) =>
    api.post('/auth/resend-otp', data),

  signin: (data: { email: string; password: string }) =>
    api.post('/auth/signin', data),

  verifySignin: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-signin', data),

  googleAuth: (data: { googleId: string; email: string; fullName: string; profileImage?: string }) =>
    api.post('/auth/google/token', data),

  getMe: () => api.get('/auth/me'),

  updateProfile: (data: { fullName?: string; profileImage?: string }) =>
    api.put('/auth/profile', data),

  addAddress: (data: any) => api.post('/auth/address', data),
  removeAddress: (addressId: string) => api.delete(`/auth/address/${addressId}`),

  becomeMerchant: (data: any) => api.post('/auth/become-merchant', data),

  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: () => api.post('/auth/logout'),
};

// ═══════════════════════════════════════════
// Product API
// ═══════════════════════════════════════════
export const productAPI = {
  getProducts: (params?: any) => api.get('/products', { params }),
  getProduct: (id: string) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getFilters: (params?: any) => api.get('/products/filters', { params }),

  // Merchant only
  getMyProducts: () => api.get('/products/merchant/my-products'),
  createProduct: (data: any) => api.post('/products', data),
  updateProduct: (id: string, data: any) => api.put(`/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),
};

// ═══════════════════════════════════════════
// Cart API
// ═══════════════════════════════════════════
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (data: { productId: string; quantity?: number; variant?: any }) =>
    api.post('/cart/items', data),
  updateQuantity: (itemId: string, quantity: number) =>
    api.put(`/cart/items/${itemId}`, { quantity }),
  removeItem: (itemId: string) => api.delete(`/cart/items/${itemId}`),
  toggleSelection: (itemId: string) => api.patch(`/cart/items/${itemId}/select`),
  selectAll: (selected: boolean) => api.patch('/cart/select-all', { selected }),
  clearCart: () => api.delete('/cart'),
  applyCoupon: (couponCode: string) => api.post('/cart/coupon', { couponCode }),
  removeCoupon: () => api.delete('/cart/coupon'),
};

// ═══════════════════════════════════════════
// Checkout API
// ═══════════════════════════════════════════
export const checkoutAPI = {
  getSummary: (data: any) => api.post('/checkout/summary', data),
  processCheckout: (data: any) => api.post('/checkout', data),
  verifyPayment: (data: any) => api.post('/checkout/verify-payment', data),
  getPaymentMethods: () => api.get('/checkout/payment-methods'),
  addToWallet: (data: { amount: number; paymentMethod: string }) =>
    api.post('/checkout/wallet/add', data),
};

// ═══════════════════════════════════════════
// Order API
// ═══════════════════════════════════════════
export const orderAPI = {
  getMyOrders: (params?: any) => api.get('/orders', { params }),
  getOrder: (id: string) => api.get(`/orders/${id}`),
  cancelOrder: (id: string, reason?: string) =>
    api.patch(`/orders/${id}/cancel`, { reason }),
  submitReview: (id: string, data: { rating: number; title?: string; text: string; images?: string[] }) =>
    api.post(`/orders/${id}/review`, data),

  // Merchant
  getMerchantOrders: (params?: any) => api.get('/orders/merchant/orders', { params }),
  getMerchantStats: () => api.get('/orders/merchant/stats'),
  updateOrderStatus: (orderId: string, data: { status: string; note?: string }) =>
    api.patch(`/orders/merchant/${orderId}/status`, data),
};

// ═══════════════════════════════════════════
// Merchant API
// ═══════════════════════════════════════════
export const merchantAPI = {
  getMerchants: (params?: any) => api.get('/merchants', { params }),
  getMerchant: (id: string) => api.get(`/merchants/${id}`),
  getMyProfile: () => api.get('/merchants/profile/me'),
  updateProfile: (data: any) => api.put('/merchants/profile/me', data),
  updateBankDetails: (data: any) => api.put('/merchants/bank-details', data),
  uploadDocuments: (data: any) => api.post('/merchants/documents', data),
};

// ═══════════════════════════════════════════
// Review API
// ═══════════════════════════════════════════
export const reviewAPI = {
  getProductReviews: (productId: string, params?: any) =>
    api.get(`/reviews/product/${productId}`, { params }),
  getMerchantReviews: (merchantId: string, params?: any) =>
    api.get(`/reviews/merchant/${merchantId}`, { params }),
  markHelpful: (reviewId: string) =>
    api.post(`/reviews/${reviewId}/helpful`),
  addResponse: (reviewId: string, data: { text: string }) =>
    api.post(`/reviews/${reviewId}/response`, data),
};

// ═══════════════════════════════════════════
// Analytics API
// ═══════════════════════════════════════════
export const analyticsAPI = {
  getSuggestions: (params?: any) => api.get('/analytics/suggestions', { params }),
  recordView: (data: { productId: string; category?: string; source?: string; viewDuration?: number }) =>
    api.post('/analytics/view', data),
  getMyHistory: (params?: any) => api.get('/analytics/my-history', { params }),
  getPlatformAnalytics: () => api.get('/analytics/platform'),
};

export default api;
