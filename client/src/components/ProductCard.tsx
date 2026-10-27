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

// Category display mapping for DR.MEDEX taxonomy
const CATEGORY_NAMES: Record<string, string> = {
  "electrosurgical-units": "ELECTROSURGICAL UNITS",
  "electrosurgical units": "ELECTROSURGICAL UNITS",
  "cryo-surgical": "CRYOSURGICAL EQUIPMENT",
  "cryosurgical-equipment": "CRYOSURGICAL EQUIPMENT",
  "cryosurgical equipment": "CRYOSURGICAL EQUIPMENT",
  "ot-lights": "OT / SURGICAL LIGHTS",
  "ot / surgical lights": "OT / SURGICAL LIGHTS",
  "examination-ot-tables": "EXAMINATION & OT TABLES",
  "examination & ot tables": "EXAMINATION & OT TABLES",
  "obstetrics-and-gynaecology": "OBSTETRICS & GYNAECOLOGY",
  "obstetrics & gynaecology": "OBSTETRICS & GYNAECOLOGY",
  "physiotherapy": "PHYSIOTHERAPY MACHINES",
  "physiotherapy machines": "PHYSIOTHERAPY MACHINES",
  "medical-equipment": "GENERAL MEDICAL EQUIPMENT",
  "general medical equipment": "GENERAL MEDICAL EQUIPMENT",
};

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();

  const isSaved = isInWishlist(product.id);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  // Category display label in dark green
  const getCategoryLabel = (): string => {
    if (product.categoryName) return product.categoryName.toUpperCase();
    const rawCat = (product.category || "").toLowerCase().trim();
    if (CATEGORY_NAMES[rawCat]) return CATEGORY_NAMES[rawCat];
    if (product.category) return product.category.replace(/-/g, " ").toUpperCase();
    if (product.subcategory) return product.subcategory.replace(/-/g, " ").toUpperCase();
    return "MEDICAL EQUIPMENT";
  };

  const categoryLabel = getCategoryLabel();

  // Clean title display
  const displayTitle = product.title || product.productName || "Medical Equipment";
  const primaryImage =
    (product.images && product.images.length > 0 && product.images[0]) ||
    product.primaryImage ||
    "/placeholder-medical.png";

  const productUrl = `/product/${product.slug || product.id}`;

  return (
    <div className="group relative bg-white rounded-2xl border border-neutral-200 hover:border-neutral-300 hover:shadow-sm transition-all duration-200 flex flex-col justify-between overflow-hidden h-full">
      {/* 1. SQUARE PRODUCT IMAGE AREA (1:1 aspect ratio, edge-to-edge of card width, no side panels) */}
      <div
        className="relative w-full aspect-square bg-white flex items-center justify-center overflow-hidden"
        style={{ aspectRatio: "1 / 1" }}
      >
        <Link
          to={productUrl}
          className="w-full h-full flex items-center justify-center p-2.5 sm:p-3"
          aria-label={displayTitle}
        >
          <img
            src={primaryImage}
            alt={displayTitle}
            className="w-full h-full object-contain object-center transition-transform duration-250 ease-out group-hover:scale-[1.02]"
            style={{ objectFit: "contain", objectPosition: "center" }}
            loading="lazy"
            onError={(e) => {
              // Graceful fallback to approved medical asset placeholder
              (e.currentTarget as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80";
            }}
          />
        </Link>

        {/* 2. FAVOURITE / WISHLIST HEART ICON (upper-right corner of square image container) */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isSaved ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 cursor-pointer ${
            isSaved
              ? "bg-white text-[#7AA05A] shadow-xs border border-[#7AA05A]/30 scale-105"
              : "bg-white/90 backdrop-blur-xs text-neutral-600 hover:text-[#7AA05A] border border-neutral-200/90 shadow-2xs hover:scale-105"
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
      <div className="p-3.5 sm:p-4 pt-3 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Category / Subcategory Label in Dark Green */}
          <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#1F7A4D] mb-1 line-clamp-1">
            {categoryLabel}
          </div>

          {/* Product Name */}
          <h3 className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug line-clamp-2 min-h-[2.5rem] hover:text-[#7AA05A] transition-colors">
            <Link to={productUrl} title={displayTitle}>
              {displayTitle}
            </Link>
          </h3>
        </div>

        {/* 4. SINGLE PROMINENT SHOW DETAILS BUTTON */}
        <div>
          <Link
            to={productUrl}
            className="w-full py-2.5 sm:py-3 px-4 bg-[#7AA05A] hover:bg-[#6C8F4E] active:bg-[#5E7E43] focus:outline-none focus:ring-2 focus:ring-[#7AA05A]/40 text-white rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-colors duration-200 flex items-center justify-center text-center shadow-2xs cursor-pointer block"
          >
            Show Details
          </Link>
        </div>
      </div>
    </div>
  );
};
