import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { Product, CartItem, Coupon } from "../types";
import { useAuth } from "./AuthContext";

const CART_STORAGE_KEY_V1 = "drmedex_cart_v1";
const CART_STORAGE_KEY_LEGACY = "drmedex_cart";
const COUPON_STORAGE_KEY = "drmedex_coupon";

/**
 * Validates and sanitizes a raw cart item, guaranteeing safe structural integrity
 */
function sanitizeCartItem(item: any): CartItem | null {
  if (!item || typeof item !== "object") return null;
  const rawProduct = item.product;
  if (!rawProduct || typeof rawProduct !== "object") return null;

  const id = String(rawProduct.id || rawProduct._id || item.productId || "").trim();
  if (!id) return null;

  const quantity =
    typeof item.quantity === "number" && !isNaN(item.quantity)
      ? Math.max(1, Math.floor(item.quantity))
      : 1;

  // Extract valid image array with graceful fallback
  let images: string[] = [];
  if (Array.isArray(rawProduct.images)) {
    images = rawProduct.images.filter(
      (img: any) => typeof img === "string" && img.trim().length > 0
    );
  }
  if (images.length === 0 && rawProduct.primaryImage && typeof rawProduct.primaryImage === "string") {
    images = [rawProduct.primaryImage.trim()];
  }
  if (images.length === 0 && Array.isArray(rawProduct.galleryImages)) {
    images = rawProduct.galleryImages.filter(
      (img: any) => typeof img === "string" && img.trim().length > 0
    );
  }
  if (images.length === 0) {
    images = [
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80"
    ];
  }

  const basePrice =
    typeof rawProduct.basePrice === "number" && !isNaN(rawProduct.basePrice)
      ? rawProduct.basePrice
      : Number(rawProduct.basePrice) || 0;

  const product: Product = {
    ...rawProduct,
    id,
    title: String(rawProduct.title || rawProduct.productName || "Medical Equipment").trim(),
    slug: String(rawProduct.slug || id).trim(),
    sku: String(rawProduct.sku || `MED-${id.slice(-6).toUpperCase()}`).trim(),
    basePrice,
    images,
    primaryImage: images[0]
  };

  return { product, quantity };
}

/**
 * Loads and validates persisted cart items from localStorage
 */
function loadStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      localStorage.getItem(CART_STORAGE_KEY_V1) ||
      localStorage.getItem(CART_STORAGE_KEY_LEGACY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeCartItem)
      .filter((item): item is CartItem => item !== null);
  } catch (err) {
    console.error("DR.MEDEX Cart: Error loading persisted cart", err);
    return [];
  }
}

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
  const { user } = useAuth();

  // 1. Initial State: Synchronously load persisted items to prevent empty flash
  const [items, setItems] = useState<CartItem[]>(() => loadStoredCart());

  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(COUPON_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // 2. Persist to localStorage whenever items change
  useEffect(() => {
    try {
      const serialized = JSON.stringify(items);
      localStorage.setItem(CART_STORAGE_KEY_V1, serialized);
      localStorage.setItem(CART_STORAGE_KEY_LEGACY, serialized);
      if (user?.id) {
        localStorage.setItem(`drmedex_user_cart_${user.id}`, serialized);
      }
    } catch (err) {
      console.error("DR.MEDEX Cart: Error persisting cart", err);
    }
  }, [items, user?.id]);

  // 3. Persist applied coupon
  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch (err) {
      console.error("DR.MEDEX Cart: Error persisting coupon", err);
    }
  }, [appliedCoupon]);

  // 4. Multi-tab synchronization via StorageEvent
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CART_STORAGE_KEY_V1 || e.key === CART_STORAGE_KEY_LEGACY) {
        const reloaded = loadStoredCart();
        setItems(reloaded);
      } else if (e.key === COUPON_STORAGE_KEY) {
        try {
          setAppliedCoupon(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setAppliedCoupon(null);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // 5. Merge guest cart with authenticated user cart upon login
  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (user?.id && user.id !== lastUserIdRef.current) {
      lastUserIdRef.current = user.id;
      try {
        const userSavedRaw = localStorage.getItem(`drmedex_user_cart_${user.id}`);
        if (userSavedRaw) {
          const userItems = JSON.parse(userSavedRaw)
            .map(sanitizeCartItem)
            .filter((it: any): it is CartItem => it !== null);
          if (Array.isArray(userItems) && userItems.length > 0) {
            setItems((guestItems) => {
              const mergedMap = new Map<string, CartItem>();
              userItems.forEach((it) => mergedMap.set(it.product.id, { ...it }));
              guestItems.forEach((gIt) => {
                const existing = mergedMap.get(gIt.product.id);
                if (existing) {
                  mergedMap.set(gIt.product.id, {
                    ...existing,
                    quantity: existing.quantity + gIt.quantity
                  });
                } else {
                  mergedMap.set(gIt.product.id, { ...gIt });
                }
              });
              return Array.from(mergedMap.values());
            });
          }
        }
      } catch (err) {
        console.error("DR.MEDEX Cart: Error merging account cart on login", err);
      }
    } else if (!user) {
      lastUserIdRef.current = null;
    }
  }, [user]);

  // 6. Asynchronous price and availability reconciliation against trusted catalogue
  useEffect(() => {
    let isCancelled = false;
    const revalidateCatalogPrices = async () => {
      if (items.length === 0) return;
      try {
        const res = await fetch("/api/products");
        if (!res.ok) return;
        const data = await res.json();
        if (isCancelled || !data?.success || !Array.isArray(data.products)) return;

        const liveProducts = new Map<string, Product>();
        data.products.forEach((p: Product) => liveProducts.set(p.id, p));

        setItems((current) => {
          let hasChanges = false;
          const updated = current.map((item) => {
            const live = liveProducts.get(item.product.id);
            if (live && live.basePrice !== item.product.basePrice) {
              hasChanges = true;
              return {
                ...item,
                product: {
                  ...item.product,
                  basePrice: live.basePrice,
                  title: live.title || item.product.title,
                  images:
                    Array.isArray(live.images) && live.images.length > 0
                      ? live.images
                      : item.product.images
                }
              };
            }
            return item;
          });
          return hasChanges ? updated : current;
        });
      } catch {
        // Fallback gracefully on network error or offline browsing
      }
    };

    revalidateCatalogPrices();
    return () => {
      isCancelled = true;
    };
  }, []);

  const addToCart = (product: Product, quantity: number = 1) => {
    const validQty = Math.max(1, Math.floor(quantity));
    setItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + validQty }
            : item
        );
      }
      return [...prev, { product, quantity: validQty }];
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
    const validQty = Math.max(1, Math.floor(quantity));
    setItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: validQty } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    try {
      localStorage.removeItem(CART_STORAGE_KEY_V1);
      localStorage.removeItem(CART_STORAGE_KEY_LEGACY);
      localStorage.removeItem(COUPON_STORAGE_KEY);
      if (user?.id) {
        localStorage.removeItem(`drmedex_user_cart_${user.id}`);
      }
    } catch {}
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
