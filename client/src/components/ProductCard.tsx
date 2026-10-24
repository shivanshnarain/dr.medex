import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { Product } from "../types";
import { useCurrency } from "../context/CurrencyContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

interface ProductCardProps {
  product: Product;
  onQuickView?: (product: Product) => void;
  onOpenQuote?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenQuote }) => {
  const navigate = useNavigate();
  const { formatProductPrice } = useCurrency();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isSaved = isInWishlist(product.id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.priceStatus === "PRICE_NOT_AVAILABLE") {
      if (onOpenQuote) {
        onOpenQuote(product);
      } else {
        navigate(`/product/${product.slug}`);
      }
      return;
    }
    addToCart(product, 1);
    navigate("/checkout");
  };

  // Determine category display label
  const categoryLabel = (
    product.category ? product.category.replace(/-/g, " ") : "MEDICAL EQUIPMENT"
  ).toUpperCase();

  // Price calculations
  const isUnpriced = product.priceStatus === "PRICE_NOT_AVAILABLE";
  const regularPriceStr = formatProductPrice(product, "regular");
  const salePriceStr = formatProductPrice(product, "sale");
  
  const hasDiscount = Boolean(
    !isUnpriced &&
    (product.discountPercentage && product.discountPercentage > 0) ||
    (product.regularPrice && product.salePrice && product.salePrice < product.regularPrice) ||
    (product.referencePricing?.hasDiscount)
  );

  const discountPct = product.discountPercentage || product.referencePricing?.discountPercentage || 12;

  // Clean title display (remove duplicate brand prefix for cleaner layout if already displayed)
  const displayTitle = product.title || product.productName || "Medical Equipment";
  const primaryImage =
    (product.images && product.images.length > 0 && product.images[0]) ||
    product.primaryImage ||
    "/placeholder-medical.png";

  return (
    <div
      className="group relative bg-white rounded-xl border border-[#E5E0D8] hover:border-neutral-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden hover:-translate-y-1 h-full"
    >
      {/* 1. PRODUCT IMAGE AREA */}
      <div className="relative w-full aspect-square bg-[#FAFAFA] flex items-center justify-center p-4 overflow-hidden border-b border-[#F0F0F0]">
        <Link
          to={`/product/${product.slug}`}
          className="w-full h-full flex items-center justify-center"
          aria-label={displayTitle}
        >
          <img
            src={primaryImage}
            alt={displayTitle}
            className="w-full h-full object-contain object-center transition-transform duration-250 ease-out group-hover:scale-[1.03]"
            loading="lazy"
            onError={(e) => {
              // Graceful fallback to approved medical asset placeholder
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80";
            }}
          />
        </Link>

        {/* Favorite Heart (top-right of image container) */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 ${
            isSaved
              ? "bg-white text-[#2D5A4A] shadow-xs border border-[#2D5A4A]/20 scale-105"
              : "bg-white/90 text-neutral-400 hover:text-[#2D5A4A] hover:bg-white border border-[#E5E0D8] shadow-2xs hover:scale-105"
          }`}
        >
          <Heart
            size={15}
            strokeWidth={1.8}
            className={`transition-colors ${isSaved ? "fill-[#2D5A4A] text-[#2D5A4A]" : "text-neutral-500 hover:text-[#2D5A4A]"}`}
          />
        </button>

        {/* Optional model ribbon badge if available */}
        {product.ribbon && product.ribbon !== "New" && (
          <div className="absolute bottom-2 left-2.5 z-10 pointer-events-none">
            <span className="px-2 py-0.5 text-3xs font-bold tracking-wider uppercase bg-[#111111]/80 backdrop-blur-xs text-white rounded">
              {product.ribbon}
            </span>
          </div>
        )}
      </div>

      {/* 2. CARD CONTENT HIERARCHY */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* CATEGORY / SMALL LABEL */}
          <div className="text-3xs font-semibold uppercase tracking-wider text-neutral-500 mb-1 line-clamp-1">
            {categoryLabel}
          </div>

          {/* PRODUCT NAME (2-line clamped with fixed minimum height for row alignment) */}
          <h3 className="text-xs sm:text-sm font-semibold text-[#111111] leading-snug line-clamp-2 min-h-[2.5rem] hover:text-[#2D5A4A] transition-colors mb-2.5">
            <Link to={`/product/${product.slug}`}>{displayTitle}</Link>
          </h3>
        </div>

        {/* 3. PRICING & BUY NOW BUTTON */}
        <div className="pt-2">
          {/* PRICING AREA */}
          <div className="min-h-[2.75rem] flex flex-col justify-end mb-3">
            {isUnpriced ? (
              <div>
                <span className="text-xs sm:text-sm font-bold text-neutral-700">Contact for Price</span>
                <span className="block text-3xs text-neutral-400">Institutional Quote</span>
              </div>
            ) : hasDiscount ? (
              <div className="flex flex-col">
                {/* Sale Price: Large & Black */}
                <span className="text-sm sm:text-base font-bold text-[#111111] tracking-tight leading-none">
                  {salePriceStr}
                </span>
                {/* Old Price + Green Saving Badge */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xs sm:text-2xs text-neutral-400 line-through">
                    {regularPriceStr}
                  </span>
                  <span className="text-3xs font-bold text-[#2D5A4A] tracking-wider uppercase">
                    SAVE {discountPct}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-bold text-[#111111] tracking-tight leading-none">
                  {salePriceStr}
                </span>
                <span className="text-3xs text-neutral-400 mt-1">Standard Reference Price</span>
              </div>
            )}
          </div>

          {/* 4. BUY NOW BUTTON */}
          <button
            type="button"
            onClick={handleBuyNow}
            className="w-full py-2.5 px-4 bg-[#111111] hover:bg-[#2D5A4A] active:bg-[#0D4C3C] text-white rounded-lg text-2xs sm:text-xs font-bold tracking-wider uppercase transition-colors duration-200 flex items-center justify-center gap-1.5 shadow-2xs"
          >
            {isUnpriced ? "Request Quote" : "Buy Now"}
          </button>
        </div>
      </div>
    </div>
  );
};
