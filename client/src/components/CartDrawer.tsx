import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { renderBrandTitle } from "./BrandTitle";

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
    appliedCoupon,
    discountUSD,
    applyCoupon,
    removeCoupon
  } = useCart();
  const { formatPrice, currentCurrency, currentCountry } = useCurrency();

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  if (!isDrawerOpen) return null;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    setCouponSuccess("");
    if (!couponCode.trim()) return;

    setIsApplying(true);
    const result = await applyCoupon(couponCode.trim());
    setIsApplying(false);

    if (result.success) {
      setCouponSuccess(result.message);
      setCouponCode("");
    } else {
      setCouponError(result.message);
    }
  };

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
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 divide-y divide-[#EAEAEA]">
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
              <div className="space-y-4">
                {items.map(({ product, quantity }) => {
                  const itemImage =
                    (Array.isArray(product.images) && product.images[0]) ||
                    product.primaryImage ||
                    (Array.isArray(product.galleryImages) && product.galleryImages[0]) ||
                    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80";

                  return (
                    <div key={product.id} className="pt-4 first:pt-0 pb-4 border-b border-[#EAEAEA] last:border-b-0">
                      <div className="flex gap-3 sm:gap-4 items-start">
                        {/* Left section: Product image and quantity selector below it */}
                        <div className="flex flex-col items-center shrink-0 w-20 sm:w-24">
                          <Link
                            to={`/product/${product.slug}`}
                            onClick={closeDrawer}
                            className="block w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] p-1.5 hover:border-[#7AA05A]/40 transition-colors"
                          >
                            <img
                              src={itemImage}
                              alt={product.title}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src =
                                  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80";
                              }}
                              className="w-full h-full object-contain"
                            />
                          </Link>

                          {/* Below product image: Quantity selector [ - ] [ qty ] [ + ] */}
                          <div className="flex items-center justify-between w-full mt-2 border border-[#EAEAEA] rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => {
                                if (quantity > 1) {
                                  updateQuantity(product.id, quantity - 1);
                                }
                              }}
                              disabled={quantity <= 1}
                              className="p-1 sm:p-1.5 text-neutral-600 hover:text-[#2D5A4A] hover:bg-[#F4F7F2] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              title={quantity <= 1 ? "Minimum quantity is 1 (use delete icon to remove)" : "Decrease quantity"}
                              aria-label="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-1 text-xs font-bold text-[#111111] select-none">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, quantity + 1)}
                              className="p-1 sm:p-1.5 text-neutral-600 hover:text-[#2D5A4A] hover:bg-[#F4F7F2] transition-colors cursor-pointer"
                              title="Increase quantity"
                              aria-label="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        {/* Right section: Product Name, Prices in Dark Green #2D5A4A, Red Delete Icon */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                          <div>
                            <Link
                              to={`/product/${product.slug}`}
                              onClick={closeDrawer}
                              className="text-xs sm:text-sm font-bold text-[#111111] hover:text-[#2D5A4A] line-clamp-2 leading-snug transition-colors block"
                            >
                              {renderBrandTitle(product.title)}
                            </Link>
                            {/* SKU is completely removed from visible cart UI */}
                          </div>

                          <div className="mt-2 flex flex-col gap-0.5">
                            {/* Product total price: Dark Green #2D5A4A */}
                            <div className="text-sm sm:text-base font-extrabold text-[#2D5A4A]">
                              {formatPrice(product.basePrice * quantity)}
                            </div>

                            {/* Per-unit price: Dark Green #2D5A4A, clearly labelled Each */}
                            <div className="text-2xs sm:text-xs font-semibold text-[#2D5A4A]">
                              {formatPrice(product.basePrice)} <span className="font-normal text-neutral-500">Each</span>
                            </div>
                          </div>

                          {/* Red delete/trash icon for removing the product with clear clickable area */}
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="p-2 -mr-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                              title="Remove product from cart"
                              aria-label="Remove product"
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer & Checkout Breakdown */}
          {items.length > 0 && (
            <div className="border-t border-[#EAEAEA] bg-[#FAFAFA] p-5 sm:p-6 space-y-4">
              {/* Promo Coupon Form */}
              <div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#F4F8F1] border border-[#7AA05A]/30 rounded-lg text-xs text-[#2D5A4A]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Tag size={14} className="text-[#7AA05A]" />
                      <span>Applied: <strong>{appliedCoupon.code}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon (e.g. DRMEDEX10)"
                      className="flex-1 px-3 py-2 text-xs bg-white border border-[#EAEAEA] rounded-lg uppercase focus:outline-none focus:border-[#7AA05A] focus:ring-1 focus:ring-[#7AA05A]/30 font-mono text-[#111111]"
                    />
                    <button
                      type="submit"
                      disabled={isApplying}
                      className="px-4 py-2 bg-[#7AA05A] hover:bg-[#2D5A4A] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                    >
                      {isApplying ? "..." : "Apply"}
                    </button>
                  </form>
                )}
                {couponError && <p className="text-3xs text-rose-600 mt-1 font-medium">{couponError}</p>}
                {couponSuccess && <p className="text-3xs text-[#2D5A4A] mt-1 font-medium">{couponSuccess}</p>}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#111111]">{formatPrice(baseSubtotalUSD)}</span>
                </div>
                {discountUSD > 0 && (
                  <div className="flex justify-between text-[#2D5A4A] font-medium">
                    <span>Discount</span>
                    <span>-{formatPrice(discountUSD)}</span>
                  </div>
                )}
                <div className="pt-2.5 border-t border-[#EAEAEA] flex justify-between text-sm font-bold text-[#111111]">
                  <span>Estimated Total</span>
                  <span className="text-[#2D5A4A] text-base font-extrabold">{formatPrice(finalSubtotalUSD)}</span>
                </div>
                {/* Horizontally centered currency exchange rate message */}
                <div className="text-3xs text-neutral-400 text-center pt-1">
                  Displayed in <strong className="text-neutral-600">{currentCurrency}</strong> based on current exchange rate
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer();
                    navigate("/checkout?initiateLocation=1", { state: { fromCheckoutIntent: true } });
                  }}
                  className="w-full py-3.5 bg-[#7AA05A] hover:bg-[#2D5A4A] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
                >
                  <span>Proceed to International Checkout</span>
                  <ArrowRight size={15} />
                </button>

                {/* Secure Checkout indication */}
                <div className="flex items-center justify-center gap-1.5 text-2xs text-neutral-500 pt-1">
                  <ShieldCheck size={14} className="text-[#7AA05A]" />
                  <span>Secure Checkout</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
