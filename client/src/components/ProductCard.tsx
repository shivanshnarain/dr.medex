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

  // Authoritative Primary Image selection (prioritize admin-selected primaryImage flag / field)
  const resolvePrimaryImage = (): string => {
    if (product.primaryImage && typeof product.primaryImage === "string" && product.primaryImage.trim()) {
      return product.primaryImage;
    }
    if (Array.isArray(product.images) && product.images.length > 0) {
      // Check for object format with isPrimary flag
      for (const img of product.images) {
        if (typeof img === "object" && img !== null && (img as any).isPrimary && (img as any).url) {
          return (img as any).url;
        }
      }
      // Fallback to first image item
      const first = product.images[0];
      if (typeof first === "string" && first.trim()) return first;
      if (typeof first === "object" && first !== null && (first as any).url) return (first as any).url;
    }
    if (Array.isArray(product.galleryImages) && product.galleryImages.length > 0) {
      const first = product.galleryImages[0];
      if (typeof first === "string" && first.trim()) return first;
      if (typeof first === "object" && first !== null && (first as any).url) return (first as any).url;
    }
    return "/placeholder-medical.png";
  };

  const primaryImage = resolvePrimaryImage();

  const productUrl = `/product/${product.slug || product.id}`;

  return (
    <div className="group relative bg-white rounded-2xl border border-neutral-200/90 hover:border-neutral-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full p-3 sm:p-4">
      {/* 1. SQUARE PRODUCT IMAGE AREA (1:1 aspect ratio across all viewports, clean container without inner grey border, object-cover for true edge-to-edge square presentation) */}
      <div
        className="product-card-image relative w-full aspect-square shrink-0 rounded-[16px] overflow-hidden bg-white border-none select-none p-0"
        style={{ aspectRatio: "1 / 1" }}
      >
        <Link
          to={productUrl}
          className="relative w-full h-full block overflow-hidden rounded-[16px] border-none"
          aria-label={displayTitle}
        >
          <img
            src={primaryImage}
            alt={displayTitle}
            className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-300 ease-out group-hover:scale-105 block border-none rounded-[16px]"
            style={{ objectFit: "cover", objectPosition: "center" }}
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
          className={`absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 cursor-pointer ${
            isSaved
              ? "bg-white text-[#7AA05A] shadow-xs border border-[#7AA05A]/30 scale-105"
              : "bg-white/95 backdrop-blur-xs text-neutral-600 hover:text-[#7AA05A] border border-neutral-200/80 shadow-2xs hover:scale-105"
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

      {/* 3. PRODUCT INFORMATION & ACTION (dark moss green category, black name, moss-green button) */}
      <div className="pt-3 sm:pt-3.5 px-0.5 pb-0.5 flex-1 flex flex-col justify-between">
        <div className="flex-1 flex flex-col">
          {/* Category / Subcategory Label in Dark Moss Green (#7AA05A) */}
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#7AA05A] mb-1.5 shrink-0">
            {categoryLabel}
          </div>

          {/* Product Name in Solid Black — expanded vertical space (+2 lines), natural wrapping without clipping */}
          <h3 className="text-xs sm:text-sm md:text-[14px] font-bold text-black leading-snug min-h-[4.25rem] sm:min-h-[4.75rem] hover:text-[#7AA05A] transition-colors break-words flex-1">
            <Link to={productUrl} title={displayTitle} className="hover:underline">
              {displayTitle}
            </Link>
          </h3>
        </div>

        {/* 4. SINGLE PROMINENT MOSS-GREEN SHOW DETAILS BUTTON — consistently aligned at bottom */}
        <div className="mt-auto pt-3 shrink-0">
          <Link
            to={productUrl}
            className="w-full py-2.5 sm:py-3 px-4 bg-[#7AA05A] hover:bg-[#688a4c] active:bg-[#5a7842] focus:outline-none focus:ring-2 focus:ring-[#7AA05A]/40 text-white rounded-full text-xs sm:text-sm font-bold tracking-wide transition-colors duration-200 flex items-center justify-center text-center shadow-2xs cursor-pointer block"
          >
            Show Details
          </Link>
        </div>
      </div>
    </div>
  );
};
