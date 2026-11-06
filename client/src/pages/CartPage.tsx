import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ArrowLeft, Globe } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { renderBrandTitle } from "../components/BrandTitle";

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
          <div className="min-w-0">
            <h1 className="text-lg xs:text-xl sm:text-2xl lg:text-3xl font-black text-[#2D5A4A] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              Hospital &amp; Clinical Equipment Cart
            </h1>
            <p className="text-xs text-neutral-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
              Review line items and regional export shipping options for India.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all items from your cart?")) {
                clearCart();
              }
            }}
            className="text-xs text-rose-600 hover:text-rose-800 hover:underline font-semibold cursor-pointer shrink-0 self-end sm:self-center"
          >
            Clear All Items
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Cart Products List (8 cols) - Individual Responsive Cards */}
          <div className="lg:col-span-8 space-y-4">
            {items.map(({ product, quantity }) => {
              const itemImage =
                (Array.isArray(product.images) && product.images[0]) ||
                product.primaryImage ||
                (Array.isArray(product.galleryImages) && product.galleryImages[0]) ||
                "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80";
              const availableStock = typeof product.stockQuantity === "number" ? product.stockQuantity : 999;
              const maxQty = Math.min(50, Math.max(1, availableStock));

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-neutral-200 hover:border-[#7AA05A]/50 p-4 sm:p-5 shadow-2xs transition-all flex items-start gap-4 sm:gap-6"
                >
                  {/* LEFT SIDE: Product Image inside rectangular frame with light green outline (#7AA05A) */}
                  <div className="shrink-0 w-24 sm:w-32 md:w-36 rounded-xl border border-[#7AA05A] p-2 bg-neutral-50/60 flex items-center justify-center">
                    <img
                      src={itemImage}
                      alt={product.title}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80";
                      }}
                      className="max-h-24 sm:max-h-28 w-auto h-auto max-w-full object-contain"
                    />
                  </div>

                  {/* RIGHT SIDE: Product Information */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                    <div>
                      {/* 1. DR.MEDEX brand label */}
                      <span className="text-3xs font-extrabold uppercase tracking-wider text-[#7AA05A] block">
                        {product.brand || "DR.MEDEX"}
                      </span>

                      {/* 2. Complete product name */}
                      <div className="flex items-start justify-between gap-2 mt-0.5">
                        <Link
                          to={`/product/${product.slug}`}
                          className="font-bold text-xs sm:text-sm text-[#111111] hover:text-[#2D5A4A] transition-colors leading-snug line-clamp-2"
                        >
                          {renderBrandTitle(product.title)}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="text-neutral-400 hover:text-rose-600 p-1 -mr-1 -mt-0.5 transition-colors cursor-pointer shrink-0"
                          title="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* 3. Unit price clearly displayed below product name */}
                      <div className="mt-1 text-xs text-neutral-600">
                        Unit Price: <span className="font-bold text-[#2D5A4A]">{formatPrice(product.basePrice)}</span>
                      </div>
                    </div>

                    {/* 4. Quantity Selector & 5. Updated line-item total */}
                    <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between gap-3 flex-wrap">
                      <div className="inline-flex items-center border border-neutral-200 rounded-lg bg-neutral-50 overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() => {
                            if (quantity > 1) {
                              updateQuantity(product.id, quantity - 1);
                            }
                          }}
                          disabled={quantity <= 1}
                          className="p-1.5 px-2.5 text-neutral-600 hover:text-[#2D5A4A] hover:bg-neutral-200/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Decrease quantity"
                        >
                          <Minus size={12} strokeWidth={2.5} />
                        </button>
                        <span className="px-3 text-xs font-bold text-[#111111] font-mono select-none">
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
                          className="p-1.5 px-2.5 text-neutral-600 hover:text-[#2D5A4A] hover:bg-neutral-200/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                          title="Increase quantity"
                        >
                          <Plus size={12} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-3xs text-neutral-400 uppercase tracking-wider block">Line Total</span>
                        <span className="font-black text-sm sm:text-base text-[#111111] font-mono">
                          {formatPrice(product.basePrice * quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pt-4 flex items-center justify-between">
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
