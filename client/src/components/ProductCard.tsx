import React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Product } from "../types";
import { useWishlist } from "../context/WishlistContext";

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  onOpenQuote?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isSaved = isInWishlist(product.id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  // Clean title display
  const displayTitle = product.title || product.productName || "Medical Equipment";
  const primaryImage =
    (product.images && product.images.length > 0 && product.images[0]) ||
    product.primaryImage ||
    "/placeholder-medical.png";

  const productUrl = `/product/${product.slug || product.id}`;

  return (
    <div className="group relative bg-white rounded-2xl border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between overflow-hidden h-full p-3 sm:p-3.5">
      {/* 1. SQUARE PRODUCT IMAGE AREA (1:1 aspect ratio, centered, contain, white bg) */}
      <div className="relative w-full aspect-square rounded-xl bg-white flex items-center justify-center p-3 sm:p-4 overflow-hidden">
        <Link
          to={productUrl}
          className="w-full h-full flex items-center justify-center"
          aria-label={displayTitle}
        >
          <img
            src={primaryImage}
            alt={displayTitle}
            className="w-full h-full object-contain object-center transition-transform duration-250 ease-out group-hover:scale-[1.02]"
            loading="lazy"
            onError={(e) => {
              // Graceful fallback to approved medical asset placeholder
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80";
            }}
          />
        </Link>

        {/* 2. FAVOURITE / WISHLIST HEART ICON (upper-right corner of image container) */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 cursor-pointer ${
            isSaved
              ? "bg-white text-[#7AA05A] shadow-xs border border-[#7AA05A]/30 scale-105"
              : "bg-white text-neutral-600 hover:text-[#7AA05A] border border-neutral-200/90 shadow-2xs hover:scale-105"
          }`}
        >
          <Heart
            size={16}
            strokeWidth={1.8}
            className={`transition-colors ${
              isSaved ? "fill-[#7AA05A] text-[#7AA05A]" : "text-neutral-700 hover:text-[#7AA05A]"
            }`}
          />
        </button>
      </div>

      {/* 3. PRODUCT INFORMATION & ACTION */}
      <div className="pt-3 sm:pt-3.5 pb-0.5 px-0.5 flex-1 flex flex-col justify-between gap-3">
        {/* Product Name */}
        <div className="min-h-[2.5rem] flex items-start">
          <h3 className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug line-clamp-2 hover:text-[#7AA05A] transition-colors">
            <Link to={productUrl} title={displayTitle}>
              {displayTitle}
            </Link>
          </h3>
        </div>

        {/* 4. SINGLE PROMINENT SHOW DETAILS BUTTON */}
        <div>
          <Link
            to={productUrl}
            className="w-full py-2.5 sm:py-3 px-4 bg-[#7AA05A] hover:bg-[#6C8F4E] active:bg-[#5E7E43] focus:outline-none focus:ring-2 focus:ring-[#7AA05A]/40 text-white rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-colors duration-200 flex items-center justify-center text-center shadow-2xs cursor-pointer"
          >
            Show Details
          </Link>
        </div>
      </div>
    </div>
  );
};
