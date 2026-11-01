import React, { createContext, useContext, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Product } from "../types";
import { useCart } from "./CartContext";
import { SmartLocationPrompt, ResolvedLocationData } from "../components/SmartLocationPrompt";
import { buyNowLocationController } from "../services/buyNowLocationController";

interface PendingBuyItem {
  product: Product;
  quantity: number;
}

interface BuyNowLocationContextValue {
  triggerBuyNow: (product: Product, quantity?: number) => void;
  isProcessing: boolean;
  isLocationModalOpen: boolean;
  closeLocationModal: () => void;
}

const BuyNowLocationContext = createContext<BuyNowLocationContextValue | undefined>(undefined);

export const BuyNowLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { addToCart, closeDrawer } = useCart();

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setPendingItem] = useState<PendingBuyItem | null>(null);

  // Helper to persist detected location into draft and session
  const saveLocationData = (data: ResolvedLocationData) => {
    try {
      sessionStorage.setItem("drmedex_detected_location", JSON.stringify(data));
      const savedDraftRaw = localStorage.getItem("drmedex_guest_checkout_draft");
      const draft = savedDraftRaw ? JSON.parse(savedDraftRaw) : {};
      draft.country = data.country;
      draft.countryCode = data.countryCode;
      draft.state = data.state;
      draft.stateCode = data.stateCode;
      draft.district = data.district;
      draft.city = data.city || data.district;
      draft.postalCode = data.postalCode;
      if (data.countryData?.dialCode) {
        draft.phoneCountryCode = data.countryData.dialCode;
        draft.phoneIso = data.countryCode;
      }
      localStorage.setItem("drmedex_guest_checkout_draft", JSON.stringify(draft));
    } catch (e) {
      // Ignore storage errors in restricted browser contexts
    }
  };

  const navigateToCheckout = useCallback((detectedLocation?: ResolvedLocationData | null) => {
    setIsProcessing(false);
    buyNowLocationController.releaseLock();
    navigate("/checkout", {
      state: {
        fromCheckoutIntent: true,
        fromBuyNow: true,
        locationPromptHandled: true,
        detectedLocation: detectedLocation || buyNowLocationController.getCachedLocation() || undefined
      }
    });
  }, [navigate]);

  const triggerBuyNow = useCallback((product: Product, quantity: number = 1) => {
    if (!product) return;

    // 1. Debounce rapid clicks to prevent race conditions or duplicate navigation
    if (!buyNowLocationController.acquireLock()) {
      return;
    }

    setIsProcessing(true);

    // 2. Add product with specified quantity to immediate checkout session without opening cart drawer
    addToCart(product, quantity, false);
    closeDrawer();

    // 3. Check if custom location modal has already been handled during this page load
    if (buyNowLocationController.isHandled()) {
      // Subsequent Buy Now in same page load: navigate directly to checkout using cached location
      navigateToCheckout(buyNowLocationController.getCachedLocation());
      return;
    }

    // 4. First Buy Now click of this page load: Open custom DR.MEDEX Location modal IMMEDIATELY
    setPendingItem({ product, quantity });
    setIsLocationModalOpen(true);
    setIsProcessing(false);
  }, [addToCart, closeDrawer, navigateToCheckout]);

  const handleLocationDetected = useCallback((data: ResolvedLocationData) => {
    // Mark handled in-memory for this page load
    buyNowLocationController.markHandled();
    buyNowLocationController.setCachedLocation(data);
    saveLocationData(data);
    setIsLocationModalOpen(false);
    setPendingItem(null);
    navigateToCheckout(data);
  }, [navigateToCheckout]);

  const handleManualEntryOrClose = useCallback(() => {
    // Mark handled in-memory so subsequent Buy Now clicks in this session don't re-prompt
    buyNowLocationController.markHandled();
    setIsLocationModalOpen(false);
    setPendingItem(null);
    navigateToCheckout(null);
  }, [navigateToCheckout]);

  return (
    <BuyNowLocationContext.Provider
      value={{
        triggerBuyNow,
        isProcessing,
        isLocationModalOpen,
        closeLocationModal: handleManualEntryOrClose
      }}
    >
      {children}

      {/* Global DR.MEDEX Location Permission Modal - Top-level z-[9999] */}
      <SmartLocationPrompt
        isOpen={isLocationModalOpen}
        onClose={handleManualEntryOrClose}
        onManualEntry={handleManualEntryOrClose}
        onLocationDetected={handleLocationDetected}
      />
    </BuyNowLocationContext.Provider>
  );
};

export const useBuyNow = () => {
  const context = useContext(BuyNowLocationContext);
  if (!context) {
    throw new Error("useBuyNow must be used within a BuyNowLocationProvider");
  }
  return context;
};

