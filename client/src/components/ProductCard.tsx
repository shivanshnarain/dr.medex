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
    <div className="group relative bg-white rounded-xl border border-[#EAEAEA] hover:border-[#111111] hover:shadow-lg transition-all duration-300 flex flex-col justify-between overflow-hidden">
      {/* Badges and Wishlist */}
      <div className="relative aspect-square bg-[#F9F9F9] overflow-hidden p-3 flex items-center justify-center">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <img
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </Link>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10 pointer-events-none">
          {product.isBestSeller && (
            <span className="px-2.5 py-1 text-3xs font-bold uppercase bg-[#111111] text-white rounded-md tracking-wider shadow-xs">
              BEST SELLER
            </span>
          )}
          {product.originalPrice && product.originalPrice > product.basePrice && (
            <span className="px-2.5 py-1 text-3xs font-bold uppercase bg-[#1F7A4D] text-white rounded-md tracking-wider shadow-xs">
              SALE
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          type="button"
          onClick={handleWishlist}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-xs transition-colors z-10 ${
            isSaved
              ? "bg-rose-50 text-rose-600"
              : "bg-white/95 text-neutral-400 hover:text-rose-600 hover:bg-white border border-[#EAEAEA]"
          }`}
          title="Save to favorites"
        >
          <Heart size={14} fill={isSaved ? "currentColor" : "none"} />
        </button>

        {/* Hover Quick Actions overlay */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex gap-2 z-10">
          {onQuickView && (
            <button
              type="button"
              onClick={() => onQuickView(product)}
              className="flex-1 py-2 bg-white hover:bg-[#111111] text-[#111111] hover:text-white border border-[#EAEAEA] rounded-lg text-2xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
            >
              <Eye size={13} />
              <span>Quick View</span>
            </button>
          )}
          {onOpenQuote && (
            <button
              type="button"
              onClick={() => onOpenQuote(product)}
              className="px-3 py-2 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-lg text-2xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
              title="Request Quote"
            >
              <FileText size={13} />
              <span>Quote</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Metadata Row */}
          <div className="flex items-center justify-between text-3xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">
            <span className="text-[#111111] font-bold">{product.brand}</span>
            <span className="font-mono text-neutral-400">SKU: {product.sku}</span>
          </div>

          {/* Title */}
          <h3 className="text-xs sm:text-sm font-semibold text-[#111111] leading-snug line-clamp-2 hover:text-[#1F7A4D] transition-colors">
            <Link to={`/product/${product.slug}`}>{product.title}</Link>
          </h3>

          {/* Ratings */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={11}
                  fill={i < Math.floor(product.rating) ? "#111111" : "none"}
                  className={i < Math.floor(product.rating) ? "text-[#111111]" : "text-neutral-200"}
                />
              ))}
            </div>
            <span className="text-3xs text-neutral-500 font-medium">({product.reviewCount})</span>
          </div>
        </div>

        {/* Price and Cart Footer */}
        <div className="mt-4 pt-3.5 border-t border-[#EAEAEA] flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-extrabold text-[#111111]">
                {formatPrice(product.basePrice)}
              </span>
              {product.originalPrice && product.originalPrice > product.basePrice && (
                <span className="text-3xs text-neutral-400 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            <span className="text-3xs text-[#1F7A4D] font-medium flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1F7A4D] inline-block"></span>
              In Stock • Ships Air
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            className={`p-2.5 rounded-xl transition-all ${
              isAdded
                ? "bg-[#1F7A4D] text-white"
                : "bg-[#111111] text-white hover:bg-[#1F7A4D]"
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
