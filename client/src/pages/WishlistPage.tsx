import React from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, ArrowRight, Trash2, ArrowLeft } from "lucide-react";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";

export const WishlistPage: React.FC = () => {
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { formatPrice } = useCurrency();

  return (
    <div className="w-full min-h-[70vh] bg-white text-neutral-900 py-8 sm:py-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link to="/" className="hover:text-black transition-colors">Home</Link>
          <span>/</span>
          <span className="font-semibold text-neutral-900">Wishlist</span>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight flex items-center gap-3">
              <span>Saved Equipment</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[#EAF5EF] text-[#167A4A] font-bold">
                {wishlist.length} {wishlist.length === 1 ? "Item" : "Items"}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1">
              Review your saved clinical systems, models, and specifications.
            </p>
          </div>

          <Link
            to="/shop-all"
            className="inline-flex items-center gap-2 text-xs font-bold text-neutral-700 hover:text-black transition-colors self-start sm:self-auto"
          >
            <ArrowLeft size={14} />
            <span>Continue Browsing</span>
          </Link>
        </div>

        {/* Wishlist Items Grid or Empty State */}
        {wishlist.length === 0 ? (
          <div className="py-20 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-400">
              <Heart size={28} />
            </div>
            <h2 className="text-lg font-bold text-neutral-900">Your wishlist is currently empty</h2>
            <p className="text-xs text-neutral-500 mt-2 mb-6">
              Save equipment while exploring our catalog by clicking the heart icon on any product.
            </p>
            <Link
              to="/shop-all"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#111111] hover:bg-black text-white text-xs font-bold transition-all shadow-sm"
            >
              <span>Explore Products</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-8">
            {wishlist.map((product) => {
              const mainImg = product.images?.[0] || "/placeholder.jpg";
              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    {/* Image Area */}
                    <div className="relative aspect-4/3 bg-neutral-50 p-4 overflow-hidden border-b border-neutral-100">
                      <img
                        src={mainImg}
                        alt={product.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=400&q=80";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => toggleWishlist(product)}
                        className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-neutral-600 hover:text-red-600 shadow-xs transition-colors"
                        title="Remove from Wishlist"
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <div className="text-3xs uppercase font-bold text-neutral-400 tracking-wider">
                        {product.category?.replace(/-/g, " ")}
                      </div>
                      <Link
                        to={`/product/${product.slug}`}
                        className="block text-sm font-bold text-neutral-900 group-hover:text-[#167A4A] transition-colors mt-1 line-clamp-2"
                      >
                        {product.title}
                      </Link>
                      {product.sku && (
                        <div className="text-3xs font-mono text-neutral-400 mt-1">
                          SKU: {product.sku}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing and Actions */}
                  <div className="p-4 pt-0">
                    <div className="flex items-baseline justify-between py-2 border-t border-neutral-100 mb-3">
                      <span className="text-xs text-neutral-500 font-medium">Price</span>
                      <span className="text-base font-black text-neutral-900 font-mono">
                        {formatPrice(product.basePrice)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => addToCart(product, 1)}
                        className="w-full py-2.5 px-3 rounded-xl bg-[#111111] hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ShoppingBag size={14} />
                        <span>Add to Cart</span>
                      </button>

                      <Link
                        to={`/product/${product.slug}`}
                        className="w-full py-2.5 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs font-bold flex items-center justify-center gap-1 transition-colors text-center"
                      >
                        <span>Details</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
