import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, ShoppingCart, ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { CartItemCard } from "./cart/CartItemCard";

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    itemCount,
    removeFromCart,
    updateQuantity,
    isDrawerOpen,
    closeDrawer,
    baseSubtotalUSD,
    discountUSD
  } = useCart();
  const { formatPrice, currentCurrency } = useCurrency();

  if (!isDrawerOpen) return null;

  const finalSubtotalUSD = Math.max(0, baseSubtotalUSD - discountUSD);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className="absolute inset-0 bg-[#000000]/60 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-full max-w-md bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 border-b border-[#EAEAEA] bg-[#FAFAFA]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingCart size={20} className="text-[#2D5A4A]" />
                <h2 className="text-base font-bold text-[#111111]">
                  Equipment Cart ({itemCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={closeDrawer}
                className="p-1.5 text-neutral-400 hover:text-[#111111] hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Close cart drawer"
              >
                <X size={20} />
              </button>
            </div>
            {/* View Full Cart Details immediately below the Equipment Cart heading */}
            <div className="mt-1 pl-7">
              <Link
                to="/cart"
                onClick={closeDrawer}
                className="text-2xs font-semibold text-[#7AA05A] hover:text-[#2D5A4A] hover:underline transition-colors inline-flex items-center gap-1"
              >
                <span>View Full Cart Details</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6">
            {items.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-[#F7F7F7] border border-[#EAEAEA] rounded-full flex items-center justify-center mx-auto mb-4 text-[#111111]">
                  <ShoppingCart size={26} />
                </div>
                <h3 className="text-sm font-bold text-[#111111]">Your equipment cart is empty</h3>
                <p className="text-xs text-neutral-500 mt-1.5 max-w-xs mx-auto leading-relaxed">
                  Browse our certified surgical lights, physiotherapy devices, and electrosurgical generators.
                </p>
                <button
                  onClick={() => {
                    closeDrawer();
                    navigate("/shop-all");
                  }}
                  className="mt-6 px-6 py-2.5 text-xs font-semibold bg-[#7AA05A] hover:bg-[#2D5A4A] text-white rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  Explore Medical Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {items.map((item, idx) => (
                  <React.Fragment key={item.product.id}>
                    {idx > 0 && (
                      <div className="border-b border-dashed border-[#7AA05A]/30 my-2.5" />
                    )}
                    <CartItemCard
                      item={item}
                      onUpdateQuantity={updateQuantity}
                      onRemove={removeFromCart}
                      onItemClick={closeDrawer}
                    />
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Footer & Checkout Breakdown */}
          {items.length > 0 && (
            <div className="border-t border-[#EAEAEA] bg-[#FAFAFA] p-5 sm:p-6 space-y-4">
              {/* Pricing breakdown */}
              <div className="space-y-2 text-xs">
                {discountUSD > 0 && (
                  <div className="flex justify-between text-[#2D5A4A] font-medium">
                    <span>Discount</span>
                    <span>-{formatPrice(discountUSD)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-bold text-[#111111]">
                  <span>Total</span>
                  <span className="text-[#2D5A4A] text-lg font-black font-sans">{formatPrice(finalSubtotalUSD)}</span>
                </div>
                {/* Horizontally centered currency exchange rate message */}
                <div className="text-3xs text-neutral-400 text-center pt-1">
                  Displayed in <strong className="text-neutral-600">{currentCurrency}</strong> based on current exchange rate
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer();
                    navigate("/checkout?initiateLocation=1", { state: { fromCheckoutIntent: true } });
                  }}
                  className="w-full py-3.5 bg-[#7AA05A] hover:bg-[#2D5A4A] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                >
                  <span>Checkout</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
