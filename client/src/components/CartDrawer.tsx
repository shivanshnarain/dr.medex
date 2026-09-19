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
  const { formatPrice, convertPrice, currentCurrency, currentCountry } = useCurrency();

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
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-sky-700" />
              <h2 className="text-base font-bold text-slate-900">
                Equipment Cart ({itemCount})
              </h2>
            </div>
            <button
              onClick={closeDrawer}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center mx-auto mb-4 text-sky-600">
                  <ShoppingCart size={28} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Your equipment cart is empty</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Browse our certified surgical lights, physiotherapy devices, and electrosurgical generators.
                </p>
                <button
                  onClick={() => {
                    closeDrawer();
                    navigate("/shop-all");
                  }}
                  className="mt-5 px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-sky-700 text-white rounded-lg transition-colors"
                >
                  Explore Medical Catalog
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="pt-3 first:pt-0 flex gap-3.5 items-start">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-16 h-16 object-cover rounded-lg border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${product.slug}`}
                        onClick={closeDrawer}
                        className="text-xs font-bold text-slate-900 hover:text-sky-700 line-clamp-2"
                      >
                        {product.title}
                      </Link>
                      <div className="text-3xs text-slate-400 font-mono mt-0.5">SKU: {product.sku}</div>

                      <div className="flex items-center justify-between mt-2.5">
                        {/* Quantity Modifier */}
                        <div className="flex items-center border border-slate-200 rounded-md">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="p-1 text-slate-500 hover:bg-slate-100"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2 text-xs font-semibold text-slate-800">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="p-1 text-slate-500 hover:bg-slate-100"
                          >
                            <Plus size={12} />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-900">
                            {formatPrice(product.basePrice * quantity)}
                          </div>
                          {quantity > 1 && (
                            <div className="text-3xs text-slate-400">
                              {formatPrice(product.basePrice)} each
                            </div>
                          )}
                        </div>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
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
            <div className="border-t border-slate-100 bg-slate-50 p-5 space-y-4">
              {/* Promo Coupon Form */}
              <div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Tag size={14} className="text-emerald-600" />
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
                      placeholder="Coupon (e.g. MEDICURO10)"
                      className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg uppercase focus:outline-none focus:border-sky-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isApplying}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {isApplying ? "..." : "Apply"}
                    </button>
                  </form>
                )}
                {couponError && <p className="text-3xs text-rose-600 mt-1 font-medium">{couponError}</p>}
                {couponSuccess && <p className="text-3xs text-emerald-600 mt-1 font-medium">{couponSuccess}</p>}
              </div>

              {/* Pricing breakdown */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-800">{formatPrice(baseSubtotalUSD)}</span>
                </div>
                {discountUSD > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount</span>
                    <span>-{formatPrice(discountUSD)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Export Air Freight to {currentCountry.name}</span>
                  <span className="font-medium text-slate-700">Calculated at Checkout</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Estimated Total</span>
                  <span className="text-sky-800 text-base">{formatPrice(finalSubtotalUSD)}</span>
                </div>
                <div className="text-3xs text-slate-400 text-right">
                  Displayed in <strong>{currentCurrency}</strong> based on current exchange rate
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    closeDrawer();
                    navigate("/checkout");
                  }}
                  className="w-full py-3 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-900/10 transition-all hover:shadow-lg"
                >
                  <span>Proceed to International Checkout</span>
                  <ArrowRight size={15} />
                </button>

                <div className="flex items-center justify-between text-2xs text-slate-500">
                  <Link
                    to="/cart"
                    onClick={closeDrawer}
                    className="hover:text-sky-700 font-medium underline"
                  >
                    View Full Cart Details
                  </Link>
                  <div className="flex items-center gap-1 text-slate-400">
                    <ShieldCheck size={13} className="text-emerald-600" />
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
