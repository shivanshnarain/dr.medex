import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { CartItemCard } from "../components/cart/CartItemCard";

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    items,
    removeFromCart,
    updateQuantity,
    clearCart,
    baseSubtotalUSD,
    discountUSD
  } = useCart();
  const { formatPrice } = useCurrency();

  const finalSubtotalUSD = Math.max(0, baseSubtotalUSD - discountUSD);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center space-y-4">
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
    <div className="w-full bg-[#FAFAFA] py-8 sm:py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Heading & Minimal Red Clear All Items on right */}
        <div className="flex flex-row items-center justify-between gap-3 mb-6 pb-3 border-b border-dotted border-[#7AA05A]/40">
          <h1 className="text-base sm:text-xl md:text-2xl font-black text-[#2D5A4A] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
            Hospital &amp; Clinical Equipment Cart
          </h1>

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

        {/* Product rows directly on page background separated by light-green dotted dividers */}
        <div className="space-y-1">
          {items.map((item, idx) => (
            <React.Fragment key={item.product.id}>
              {idx > 0 && (
                <div className="border-b border-dotted border-[#7AA05A]/40 my-3" />
              )}
              <CartItemCard
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
            </React.Fragment>
          ))}
        </div>

        {/* Dotted separator above total section */}
        <div className="border-b border-dotted border-[#7AA05A]/40 my-5" />

        {/* Clean Order Summary & Checkout directly beneath products */}
        <div className="space-y-4 pt-1">
          {/* Total row: Total on LEFT, calculated amount on RIGHT */}
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-lg font-bold text-[#2D5A4A]">Total</span>
            <span className="text-xl sm:text-2xl font-black text-[#111111] font-mono">
              {formatPrice(finalSubtotalUSD)}
            </span>
          </div>

          {/* Checkout button directly below */}
          <button
            type="button"
            onClick={() => navigate("/checkout?initiateLocation=1", { state: { fromCheckoutIntent: true } })}
            className="w-full py-3.5 bg-[#7AA05A] hover:bg-[#688a4c] active:bg-[#5b7a42] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.99] cursor-pointer"
          >
            <span>Checkout</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
