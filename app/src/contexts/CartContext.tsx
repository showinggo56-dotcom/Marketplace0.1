import React, { createContext, useContext, useState, useCallback } from 'react';
import { cartAPI } from '@/lib/api';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface CartItem {
  _id: string;
  product: {
    _id: string;
    title: string;
    subtitle?: string;
    images: string[];
    price: number;
    stockStatus: string;
    rating: number;
    merchant: { shopName: string };
  };
  quantity: number;
  selected: boolean;
  variant?: { color?: string; size?: string };
}

interface CartSummary {
  totalItems: number;
  selectedCount: number;
  subtotal: number;
  discount: number;
  estimatedTotal: number;
}

interface CartContextType {
  items: CartItem[];
  summary: CartSummary;
  isLoading: boolean;
  couponCode: string | null;
  couponDiscount: number;
  fetchCart: () => Promise<void>;
  addToCart: (productId: string, quantity?: number, variant?: any) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  toggleSelection: (itemId: string) => Promise<void>;
  selectAll: (selected: boolean) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [summary, setSummary] = useState<CartSummary>({
    totalItems: 0, selectedCount: 0, subtotal: 0, discount: 0, estimatedTotal: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const response = await cartAPI.getCart();
      setItems(response.data.cart.items);
      setSummary(response.data.summary);
      setCouponCode(response.data.cart.couponCode);
      setCouponDiscount(response.data.cart.couponDiscount);
    } catch {
      // Silently handle
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const addToCart = useCallback(async (productId: string, quantity = 1, variant?: any) => {
    setIsLoading(true);
    try {
      const response = await cartAPI.addToCart({ productId, quantity, variant });
      setItems(response.data.cart.items);
      setSummary(response.data.summary);
      toast.success('Added to cart');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add to cart');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    setIsLoading(true);
    try {
      const response = await cartAPI.updateQuantity(itemId, quantity);
      setItems(response.data.cart.items);
      setSummary(response.data.summary);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeItem = useCallback(async (itemId: string) => {
    setIsLoading(true);
    try {
      const response = await cartAPI.removeItem(itemId);
      setItems(response.data.cart.items);
      setSummary(response.data.summary);
      toast.success('Item removed');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleSelection = useCallback(async (itemId: string) => {
    try {
      const response = await cartAPI.toggleSelection(itemId);
      setItems(response.data.cart.items);
      setSummary(prev => ({
        ...prev,
        selectedCount: response.data.cart.items.filter((i: CartItem) => i.selected).reduce((s: number, i: CartItem) => s + i.quantity, 0),
        subtotal: response.data.selectedSubtotal,
        estimatedTotal: response.data.selectedSubtotal - couponDiscount,
      }));
    } catch {
      // Silently handle
    }
  }, [couponDiscount]);

  const selectAll = useCallback(async (selected: boolean) => {
    try {
      const response = await cartAPI.selectAll(selected);
      setItems(response.data.cart.items);
      setSummary(prev => ({
        ...prev,
        selectedCount: response.data.cart.items.filter((i: CartItem) => i.selected).reduce((s: number, i: CartItem) => s + i.quantity, 0),
        subtotal: response.data.selectedSubtotal,
        estimatedTotal: response.data.selectedSubtotal - couponDiscount,
      }));
    } catch {
      // Silently handle
    }
  }, [couponDiscount]);

  const applyCoupon = useCallback(async (code: string) => {
    try {
      const response = await cartAPI.applyCoupon(code);
      setCouponCode(code.toUpperCase());
      setCouponDiscount(response.data.coupon.discount);
      setSummary(prev => ({ ...prev, discount: response.data.coupon.discount, estimatedTotal: prev.subtotal - response.data.coupon.discount }));
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Invalid coupon');
    }
  }, []);

  const removeCoupon = useCallback(async () => {
    try {
      await cartAPI.removeCoupon();
      setCouponCode(null);
      setCouponDiscount(0);
      setSummary(prev => ({ ...prev, discount: 0, estimatedTotal: prev.subtotal }));
    } catch {
      // Silently handle
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      await cartAPI.clearCart();
      setItems([]);
      setSummary({ totalItems: 0, selectedCount: 0, subtotal: 0, discount: 0, estimatedTotal: 0 });
    } catch {
      // Silently handle
    }
  }, []);

  return (
    <CartContext.Provider value={{
      items, summary, isLoading, couponCode, couponDiscount,
      fetchCart, addToCart, updateQuantity, removeItem,
      toggleSelection, selectAll, applyCoupon, removeCoupon, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export default CartContext;
