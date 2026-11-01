import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, ShoppingCart, Plus, Minus, ArrowRight, ShieldCheck, Tag } from "lucide-react";
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
                {items.map(({ product, quantity }, idx) => {
                  const itemImage =
                    (Array.isArray(product.images) && product.images[0]) ||
                    product.primaryImage ||
                    (Array.isArray(product.galleryImages) && product.galleryImages[0]) ||
                    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80";

                  const availableStock =
                    typeof product.stock === "number"
                      ? product.stock
                      : (typeof (product as any).stockQuantity === "number" ? (product as any).stockQuantity : 100);
                  const maxQty = Math.min(50, Math.max(1, availableStock));

                  return (
                    <React.Fragment key={product.id}>
                      {/* Subtle green dotted/dashed separator ONLY between consecutive products */}
                      {idx > 0 && (
                        <div className="border-b border-dashed border-[#7AA05A]/40 my-3.5" />
                      )}

                      <div className="flex gap-3.5 sm:gap-4 items-start py-1">
                        {/* LEFT SIDE — PRODUCT IMAGE (Natural Aspect Ratio, Rounded Corners, No Box) */}
                        <Link
                          to={`/product/${product.slug}`}
                          onClick={closeDrawer}
                          className="shrink-0 block self-start p-0 m-0 border-0 bg-transparent shadow-none outline-none"
                        >
                          <img
                            src={itemImage}
                            alt={product.title}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80";
                            }}
                            className="w-20 sm:w-24 max-h-28 object-contain rounded-xl border-0 shadow-none outline-none bg-transparent"
                          />
                        </Link>

                        {/* RIGHT SIDE — PRODUCT INFORMATION */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                          {/* Top: Product Name & Remove (×) Button */}
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/product/${product.slug}`}
                              onClick={closeDrawer}
                              className="text-xs sm:text-sm font-bold text-[#111111] hover:text-[#2D5A4A] leading-snug transition-colors flex-1 break-words whitespace-normal"
                            >
                              {renderBrandTitle(product.title)}
                            </Link>

                            {/* Minimal × close/remove button at top-right corner */}
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="p-1 -mr-1 -mt-0.5 text-neutral-400 hover:text-[#C62828] hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                              title="Remove item"
                              aria-label={`Remove ${product.title} from cart`}
                            >
                              <X size={16} strokeWidth={2.2} />
                            </button>
                          </div>

                          {/* Middle: Prominent Selling Price (Dark Green #2D5A4A) - Single row total only */}
                          <div className="mt-1.5 flex items-baseline">
                            <span className="text-sm sm:text-base font-extrabold text-[#2D5A4A] font-sans">
                              {formatPrice(product.basePrice * quantity)}
                            </span>
                          </div>

                          {/* Bottom: Quantity Selector Stepper */}
                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            <div className="inline-flex items-center border border-neutral-300 rounded-lg bg-neutral-50/80 overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => {
                                  if (quantity > 1) {
                                    updateQuantity(product.id, quantity - 1);
                                  }
                                }}
                                disabled={quantity <= 1}
                                className="px-2 py-1 text-neutral-600 hover:text-[#2D5A4A] hover:bg-neutral-200/60 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title={quantity <= 1 ? "Minimum quantity is 1" : "Decrease quantity"}
                                aria-label="Decrease quantity"
                              >
                                <Minus size={12} strokeWidth={2.5} />
                              </button>
                              <span className="px-2.5 py-0.5 text-xs font-bold text-[#111111] min-w-[28px] text-center select-none font-mono">
                                {quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (quantity < maxQty) {
                                    updateQuantity(product.id, quantity + 1);
                                  }
                                }}
                                disabled={quantity >= maxQty}
                                className="px-2 py-1 text-neutral-600 hover:text-[#2D5A4A] hover:bg-neutral-200/60 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title={
                                  quantity >= maxQty
                                    ? availableStock < 50
                                      ? `Only ${availableStock} in stock`
                                      : "Maximum allowed quantity is 50"
                                    : "Increase quantity"
                                }
                                aria-label="Increase quantity"
                              >
                                <Plus size={12} strokeWidth={2.5} />
                              </button>
                            </div>

                            {/* Stock warning if near or at limit */}
                            {availableStock < 50 && quantity >= availableStock ? (
                              <span className="text-[10px] text-amber-700 font-semibold font-mono">
                                Only {availableStock} in stock
                              </span>
                            ) : quantity >= 50 ? (
                              <span className="text-[10px] text-neutral-500 font-medium font-mono">
                                Max limit (50)
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
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
