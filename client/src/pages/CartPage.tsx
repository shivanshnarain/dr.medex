import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ArrowLeft, Globe } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { renderBrandTitle } from "../components/BrandTitle";
import { CartItemCard } from "../components/cart/CartItemCard";

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    itemCount,
    removeFromCart,
    updateQuantity,
    clearCart,
    baseSubtotalUSD,
    appliedCoupon,
    discountUSD,
    applyCoupon,
    removeCoupon
  } = useCart();
  const { formatPrice, currentCountry, currentCurrency, countries, setCountry } = useCurrency();

  const [couponCode, setCouponCode] = useState("");
  const [couponMsg, setCouponMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsApplying(true);
    setCouponMsg(null);
    const res = await applyCoupon(couponCode.trim());
    setIsApplying(false);
    setCouponMsg({ text: res.message, isError: !res.success });
    if (res.success) setCouponCode("");
  };

  // Base shipping estimation (e.g. flat $120 or free if > $2000)
  const shippingUSD = baseSubtotalUSD > 2000 ? 0 : 120;
  const finalSubtotalUSD = Math.max(0, baseSubtotalUSD - discountUSD);
  const grandTotalUSD = finalSubtotalUSD + (items.length > 0 ? shippingUSD : 0);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-20 h-20 bg-[#FAFAFA] border border-[#EAEAEA] rounded-full flex items-center justify-center mx-auto text-[#111111]">
          <ShoppingCart size={32} />
        </div>
        <h2 className="text-2xl font-bold text-[#111111]">Your Equipment Cart is Empty</h2>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
          You have not added any medical units to your cart. Explore our certified surgical lights, tables, and physiotherapy equipment.
        </p>
        <div className="pt-3">
          <Link
            to="/shop-all"
            className="inline-flex items-center gap-2 px-7 py-3 bg-[#7AA05A] hover:bg-[#2D5A4A] text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
          >
            <span>Explore Medical Equipment</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-row items-center justify-between gap-3 mb-6 sm:mb-8 pb-3 border-b border-neutral-200">
          <div className="min-w-0 flex-1">
            <h1 className="text-sm xs:text-base sm:text-xl md:text-2xl font-black text-[#2D5A4A] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              Hospital &amp; Clinical Equipment Cart
            </h1>
            <p className="text-3xs sm:text-xs text-neutral-500 mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
              Review line items and regional export shipping options for {currentCountry.name}.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all items from your cart?")) {
                clearCart();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-semibold cursor-pointer shrink-0 ml-2"
          >
            Clear All Items
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Cart Products List (8 cols) - Using Unified CartItemCard */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-6 shadow-2xs divide-y divide-neutral-100">
              {items.map((item, idx) => (
                <div key={item.product.id} className={idx > 0 ? "pt-4" : ""}>
                  <CartItemCard
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeFromCart}
                  />
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Link
                to="/shop-all"
                className="text-xs font-bold text-[#111111] hover:text-[#2D5A4A] flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Continue Browsing Catalog</span>
              </Link>
            </div>
          </div>

          {/* Order Summary Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-7 shadow-2xs space-y-5">
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider border-b border-[#EAEAEA] pb-3">
                Order Summary
              </h3>

              {/* Destination Country Quick Switcher */}
              <div className="p-3.5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-2">
                <div className="flex items-center justify-between text-2xs font-bold text-neutral-700">
                  <span className="flex items-center gap-1.5">
                    <Globe size={13} className="text-[#7AA05A]" />
                    Delivery Destination
                  </span>
                  <span>{currentCountry.flag} {currentCountry.name}</span>
                </div>
                <select
                  value={currentCountry.code}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full p-2 text-xs border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#7AA05A]"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Coupon input */}
              <div className="space-y-1.5">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-2.5 bg-[#F4F8F1] border border-[#7AA05A]/30 rounded-xl text-xs text-[#2D5A4A]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Tag size={15} className="text-[#7AA05A]" />
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
                      placeholder="Promo / Tender Code"
                      className="flex-1 p-2 text-xs border border-[#EAEAEA] rounded-lg uppercase font-mono focus:outline-none focus:border-[#7AA05A] focus:ring-1 focus:ring-[#7AA05A]/30 text-[#111111]"
                    />
                    <button
                      type="submit"
                      disabled={isApplying}
                      className="px-4 py-2 bg-[#7AA05A] hover:bg-[#2D5A4A] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-2xs"
                    >
                      {isApplying ? "..." : "Apply"}
                    </button>
                  </form>
                )}
                {couponMsg && (
                  <p className={`text-3xs font-semibold ${couponMsg.isError ? "text-rose-600" : "text-[#2D5A4A]"}`}>
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-2.5 text-xs pt-2">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal ({itemCount} units)</span>
                  <span className="font-semibold text-[#111111]">{formatPrice(baseSubtotalUSD)}</span>
                </div>

                {discountUSD > 0 && (
                  <div className="flex justify-between text-[#2D5A4A] font-medium">
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(discountUSD)}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-[#EAEAEA] flex justify-between text-base font-black text-[#111111]">
                  <span>Payable Total</span>
                  <span className="text-[#111111] text-xl font-extrabold">{formatPrice(grandTotalUSD)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={() => navigate("/checkout?initiateLocation=1", { state: { fromCheckoutIntent: true } })}
                className="w-full py-3.5 bg-[#7AA05A] hover:bg-[#2D5A4A] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
              >
                <span>Proceed to International Checkout</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
