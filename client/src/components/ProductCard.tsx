import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Heart, Eye, Check, FileText, Star } from "lucide-react";
import { Product } from "../types";
import { useCurrency } from "../context/CurrencyContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  onOpenQuote?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onQuickView, onOpenQuote }) => {
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [isAdded, setIsAdded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const isSaved = isInWishlist(product.id);

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 hover:border-sky-300 hover:shadow-xl transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Badges and Wishlist */}
      <div className="relative aspect-square bg-slate-50 overflow-hidden">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
          {product.isBestSeller && (
            <span className="px-2 py-0.5 text-3xs font-extrabold uppercase bg-sky-900 text-white rounded-md tracking-wider shadow-xs">
              BEST SELLER
            </span>
          )}
          {product.originalPrice && product.originalPrice > product.basePrice && (
            <span className="px-2 py-0.5 text-3xs font-extrabold uppercase bg-amber-500 text-white rounded-md tracking-wider shadow-xs">
              SALE
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          type="button"
          onClick={handleWishlist}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-md backdrop-blur-xs transition-colors z-10 ${
            isSaved
              ? "bg-rose-50 text-rose-600"
              : "bg-white/90 text-slate-400 hover:text-rose-600 hover:bg-white"
          }`}
          title="Save to favorites"
        >
          <Heart size={15} fill={isSaved ? "currentColor" : "none"} />
        </button>

        {/* Hover Quick Actions overlay */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex gap-2 z-10">
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="flex-1 py-2 bg-white/95 hover:bg-white text-slate-800 rounded-lg text-2xs font-bold shadow-md flex items-center justify-center gap-1.5 transition-colors"
            >
              <Eye size={13} />
              <span>Quick View</span>
            </button>
          )}
          {onOpenQuote && (
            <button
              type="button"
              onClick={() => onOpenQuote(product)}
              className="px-2.5 py-2 bg-sky-900 hover:bg-sky-800 text-white rounded-lg text-2xs font-bold shadow-md flex items-center justify-center gap-1 transition-colors"
              title="Request Quote"
            >
              <FileText size={13} />
              <span>Quote</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata Row */}
          <div className="flex items-center justify-between text-3xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
            <span className="text-sky-700 font-bold">{product.brand}</span>
            <span className="font-mono">SKU: {product.sku}</span>
          </div>

          {/* Title */}
          <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 hover:text-sky-700 transition-colors">
            <Link to={`/product/${product.slug}`}>{product.title}</Link>
          </h3>

          {/* Ratings */}
          <div className="flex items-center gap-1.5 mt-1.5 text-amber-500">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={11}
                  fill={i < Math.floor(product.rating) ? "currentColor" : "none"}
                  className={i < Math.floor(product.rating) ? "text-amber-400" : "text-slate-200"}
                />
              ))}
            </div>
            <span className="text-3xs text-slate-500 font-medium">({product.reviewCount})</span>
          </div>
        </div>

        {/* Price and Cart Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-black text-slate-900">
                {formatPrice(product.basePrice)}
              </span>
              {product.originalPrice && product.originalPrice > product.basePrice && (
                <span className="text-3xs text-slate-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            <span className="text-3xs text-emerald-600 font-medium block">
              In Stock • Ships Air
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`p-2.5 rounded-xl transition-all ${
              isAdded
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-sky-700 hover:text-white"
            }`}
            title="Add to cart"
          >
            {isAdded ? <Check size={16} /> : <ShoppingCart size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
};
