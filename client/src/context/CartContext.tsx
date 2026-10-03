import React, { createContext, useContext, useState, useEffect } from "react";
import { Product, CartItem, Coupon } from "../types";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  baseSubtotalUSD: number;
  appliedCoupon: Coupon | null;
  discountUSD: number;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCoupon: () => void;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem("drmedex_cart");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    try {
      const saved = localStorage.getItem("drmedex_coupon");
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem("drmedex_cart", JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (appliedCoupon) {
      localStorage.setItem("drmedex_coupon", JSON.stringify(appliedCoupon));
    } else {
      localStorage.removeItem("drmedex_coupon");
    }
  }, [appliedCoupon]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setIsDrawerOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const baseSubtotalUSD = items.reduce(
    (sum, item) => sum + item.product.basePrice * item.quantity,
    0
  );

  let discountUSD = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountPercent) {
      discountUSD = (baseSubtotalUSD * appliedCoupon.discountPercent) / 100;
      if (appliedCoupon.maxDiscountUSD && discountUSD > appliedCoupon.maxDiscountUSD) {
        discountUSD = appliedCoupon.maxDiscountUSD;
      }
    } else if (appliedCoupon.discountAmountUSD) {
      discountUSD = appliedCoupon.discountAmountUSD;
    }
  }

  const applyCoupon = async (code: string) => {
    try {
      const res = await fetch("/api/coupons/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotalUSD: baseSubtotalUSD })
      });
      const data = await res.json();
      if (data.success && data.coupon) {
        setAppliedCoupon(data.coupon);
        return { success: true, message: `Coupon ${data.coupon.code} applied successfully!` };
      }
      return { success: false, message: data.message || "Invalid coupon code" };
    } catch (e) {
      return { success: false, message: "Error validating coupon code" };
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        baseSubtotalUSD,
        appliedCoupon,
        discountUSD,
        applyCoupon,
        removeCoupon,
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false)
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
