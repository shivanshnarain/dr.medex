import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Tag, ArrowLeft, Globe } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";

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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-20 h-20 bg-sky-50 rounded-full flex items-center justify-center mx-auto text-sky-700">
          <ShoppingCart size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Your Equipment Cart is Empty</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          You have not added any medical units to your cart. Explore our certified surgical lights, tables, and physiotherapy equipment.
        </p>
        <div className="pt-2">
          <Link
            to="/shop-all"
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-sky-800 text-white font-bold rounded-xl text-xs transition-colors"
          >
            <span>Explore Medical Equipment</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hospital & Clinical Equipment Cart
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Review line items and regional export shipping options for <strong>{currentCountry.name}</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-rose-600 hover:underline font-semibold"
          >
            Clear All Items
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Table (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-3xs pb-3">
                    <th className="pb-3">Medical Equipment</th>
                    <th className="pb-3 text-center">Unit Price</th>
                    <th className="pb-3 text-center">Quantity</th>
                    <th className="pb-3 text-right">Subtotal</th>
                    <th className="pb-3 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(({ product, quantity }) => (
                    <tr key={product.id} className="hover:bg-slate-50/50">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3.5">
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0"
                          />
                          <div>
                            <Link
                              to={`/product/${product.slug}`}
                              className="font-bold text-slate-900 hover:text-sky-700 line-clamp-2 text-xs"
                            >
                              {product.title}
                            </Link>
                            <div className="text-3xs text-slate-400 font-mono mt-0.5">SKU: {product.sku}</div>
                            <span className="inline-block mt-1 text-3xs font-semibold px-2 py-0.5 bg-sky-50 text-sky-800 rounded-md">
                              {product.brand}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 text-center font-semibold text-slate-700 whitespace-nowrap">
                        {formatPrice(product.basePrice)}
                      </td>

                      <td className="py-4 text-center">
                        <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-l-lg"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-slate-800">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-r-lg"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      <td className="py-4 text-right font-bold text-slate-900 whitespace-nowrap text-sm">
                        {formatPrice(product.basePrice * quantity)}
                      </td>

                      <td className="py-4 text-right pl-2">
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/shop-all"
                className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1.5"
              >
                <ArrowLeft size={14} />
                <span>Continue Browsing Catalog</span>
              </Link>
            </div>
          </div>

          {/* Order Summary Column (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Order Summary
              </h3>

              {/* Destination Country Quick Switcher */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-2xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Globe size={13} className="text-sky-600" />
                    Delivery Destination
                  </span>
                  <span>{currentCountry.flag} {currentCountry.name}</span>
                </div>
                <select
                  value={currentCountry.code}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-sky-500"
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
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Tag size={15} className="text-emerald-600" />
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
                      className="flex-1 p-2 text-xs border border-slate-300 rounded-xl uppercase font-mono focus:outline-none focus:border-sky-600"
                    />
                    <button
                      type="submit"
                      disabled={isApplying}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {isApplying ? "..." : "Apply"}
                    </button>
                  </form>
                )}
                {couponMsg && (
                  <p className={`text-3xs font-semibold ${couponMsg.isError ? "text-rose-600" : "text-emerald-600"}`}>
                    {couponMsg.text}
                  </p>
                )}
              </div>

              {/* Breakdown */}
              <div className="space-y-2.5 text-xs pt-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({itemCount} units)</span>
                  <span className="font-semibold text-slate-800">{formatPrice(baseSubtotalUSD)}</span>
                </div>

                {discountUSD > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount</span>
                    <span>-{formatPrice(discountUSD)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Estimated Air Cargo to {currentCountry.name}</span>
                  <span className="font-semibold text-slate-800">
                    {shippingUSD === 0 ? "FREE EXPORT" : formatPrice(shippingUSD)}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-200 flex justify-between text-base font-black text-slate-900">
                  <span>Payable Total</span>
                  <span className="text-sky-800 text-xl">{formatPrice(grandTotalUSD)}</span>
                </div>

                <div className="text-3xs text-slate-400 text-right">
                  Settled in <strong>{currentCurrency}</strong> with locked order-time exchange rate
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={() => navigate("/checkout")}
                className="w-full py-4 bg-sky-700 hover:bg-sky-800 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-900/10 transition-all hover:scale-[1.01]"
              >
                <span>Proceed to International Checkout</span>
                <ArrowRight size={16} />
              </button>

              <div className="flex items-center justify-center gap-2 text-2xs text-slate-400">
                <ShieldCheck size={14} className="text-emerald-600" />
                <span>256-Bit SSL Encrypted Healthcare Purchasing</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
