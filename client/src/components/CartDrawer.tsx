import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";

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
          <div className="px-6 py-5 border-b border-[#EAEAEA] flex items-center justify-between bg-[#FAFAFA]">
            <div className="flex items-center gap-2.5">
              <ShoppingCart size={20} className="text-[#111111]" />
              <h2 className="text-base font-bold text-[#111111]">
                Equipment Cart ({itemCount})
              </h2>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 text-neutral-400 hover:text-[#111111] hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-6 divide-y divide-[#EAEAEA]">
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
                  className="mt-6 px-6 py-2.5 text-xs font-semibold bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-lg transition-colors"
                >
                  Explore Medical Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="pt-4 first:pt-0 flex gap-4 items-start">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-16 h-16 object-contain p-1 rounded-lg border border-[#EAEAEA] bg-[#FAFAFA] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${product.slug}`}
                        onClick={closeDrawer}
                        className="text-xs font-semibold text-[#111111] hover:text-[#1F7A4D] line-clamp-2 transition-colors"
                      >
                        {product.title}
                      </Link>
                      <div className="text-3xs text-neutral-400 font-mono mt-0.5">SKU: {product.sku}</div>

                      <div className="flex items-center justify-between mt-3">
                        {/* Quantity Modifier */}
                        <div className="flex items-center border border-[#EAEAEA] rounded-md bg-white">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="p-1.5 text-neutral-500 hover:text-[#111111] hover:bg-[#F7F7F7]"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2.5 text-xs font-semibold text-[#111111]">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="p-1.5 text-neutral-500 hover:text-[#111111] hover:bg-[#F7F7F7]"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="text-xs font-bold text-[#111111]">
                            {formatPrice(product.basePrice * quantity)}
                          </div>
                          {quantity > 1 && (
                            <div className="text-3xs text-neutral-400">
                              {formatPrice(product.basePrice)} each
                            </div>
                          )}
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="text-neutral-400 hover:text-rose-600 p-1 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer & Checkout Breakdown */}
          {items.length > 0 && (
            <div className="border-t border-[#EAEAEA] bg-[#FAFAFA] p-6 space-y-4">
              {/* Promo Coupon Form */}
              <div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#EAF5EF] border border-[#1F7A4D]/20 rounded-lg text-xs text-[#145A38]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Tag size={14} className="text-[#1F7A4D]" />
                      <span>Applied: <strong>{appliedCoupon.code}</strong></span>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs text-rose-600 font-bold hover:underline"
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
                      className="flex-1 px-3 py-2 text-xs bg-white border border-[#EAEAEA] rounded-lg uppercase focus:outline-none focus:border-[#111111] font-mono text-[#111111]"
                    />
                    <button
                      type="submit"
                      disabled={isApplying}
                      className="px-4 py-2 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {isApplying ? "..." : "Apply"}
                    </button>
                  </form>
                )}
                {couponError && <p className="text-3xs text-rose-600 mt-1 font-medium">{couponError}</p>}
                {couponSuccess && <p className="text-3xs text-[#1F7A4D] mt-1 font-medium">{couponSuccess}</p>}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#111111]">{formatPrice(baseSubtotalUSD)}</span>
                </div>
                {discountUSD > 0 && (
                  <div className="flex justify-between text-[#1F7A4D] font-medium">
                    <span>Discount</span>
                    <span>-{formatPrice(discountUSD)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600">
                  <span>Export Air Freight to {currentCountry.name}</span>
                  <span className="font-medium text-neutral-700">Calculated at Checkout</span>
                </div>
                <div className="pt-2.5 border-t border-[#EAEAEA] flex justify-between text-sm font-bold text-[#111111]">
                  <span>Estimated Total</span>
                  <span className="text-[#111111] text-base font-extrabold">{formatPrice(finalSubtotalUSD)}</span>
                </div>
                <div className="text-3xs text-neutral-400 text-right">
                  Displayed in <strong>{currentCurrency}</strong> based on current exchange rate
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer();
                    navigate("/checkout");
                  }}
                  className="w-full py-3.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all"
                >
                  <span>Proceed to International Checkout</span>
                  <ArrowRight size={15} />
                </button>

                <div className="flex items-center justify-between text-2xs text-neutral-500 pt-1">
                  <Link
                    to="/cart"
                    onClick={closeDrawer}
                    className="hover:text-[#1F7A4D] font-medium underline"
                  >
                    View Full Cart Details
                  </Link>
                  <div className="flex items-center gap-1.5 text-neutral-500">
                    <ShieldCheck size={14} className="text-[#1F7A4D]" />
                    <span>Secure Checkout</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
