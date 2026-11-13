import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, Package } from "lucide-react";
import { Product } from "../types";
import { useWishlist } from "../context/WishlistContext";
import { useCurrency } from "../context/CurrencyContext";
import { renderBrandTitle } from "./BrandTitle";
import { optimizeCloudinaryUrl } from "../lib/imageUtils";
import { prewarmProduct } from "../services/productService";

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

export const ProductCard: React.FC<ProductCardProps> = React.memo(({ product }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { formatProductPrice } = useCurrency();

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

  const [imageFailed, setImageFailed] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Authoritative Full Image List Resolution
  const allImages = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addUrl = (raw: any) => {
      if (!raw) return;
      let u = "";
      if (typeof raw === "string") u = raw.trim();
      else if (typeof raw === "object" && raw !== null && raw.url) u = String(raw.url).trim();
      if (u && u !== "/placeholder-medical.png" && !seen.has(u)) {
        seen.add(u);
        list.push(optimizeCloudinaryUrl(u, 600));
      }
    };

    // Primary image always first
    if (product.primaryImage && typeof product.primaryImage === "string" && product.primaryImage.trim()) {
      addUrl(product.primaryImage);
    }
    // Check images array for isPrimary first
    if (Array.isArray(product.images)) {
      for (const img of product.images) {
        if (typeof img === "object" && img !== null && (img as any).isPrimary && (img as any).url) {
          addUrl((img as any).url);
        }
      }
      for (const img of product.images) {
        addUrl(img);
      }
    }
    // Check galleryImages array
    if (Array.isArray(product.galleryImages)) {
      for (const img of product.galleryImages) {
        addUrl(img);
      }
    }

    return list;
  }, [product]);

  const hasValidImage = allImages.length > 0 && !imageFailed;
  const primaryImage = allImages[0] || "";

  // IntersectionObserver to pause carousel when out of viewport
  useEffect(() => {
    if (allImages.length <= 1) return;
    const el = cardRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsIntersecting(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [allImages.length]);

  // Automatic image carousel rotation (3.2 seconds)
  useEffect(() => {
    if (allImages.length <= 1 || !isIntersecting) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
    }, 3200);

    return () => clearInterval(timer);
  }, [allImages.length, isIntersecting]);

  const productUrl = `/product/${product.slug || product.id}`;

  const saleAmount = Number(product.salePrice || product.basePrice || 0);
  const regularAmount = Number(product.regularPrice || product.originalPrice || 0);
  const computedDiscount =
    product.discountPercentage && product.discountPercentage > 0
      ? Math.round(product.discountPercentage)
      : regularAmount > saleAmount && saleAmount > 0
      ? Math.round(((regularAmount - saleAmount) / regularAmount) * 100)
      : 0;
  const hasDiscount = computedDiscount > 0 && regularAmount > saleAmount && saleAmount > 0;
  const formattedSale = formatProductPrice(product, "sale");
  const formattedRegular = hasDiscount ? formatProductPrice(product, "regular") : "";

  const handleMouseEnter = () => {
    prewarmProduct(product);
    if (primaryImage) {
      const img = new Image();
      img.src = primaryImage;
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      className="group relative bg-white rounded-2xl border border-neutral-200/90 hover:border-neutral-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full p-3 sm:p-4"
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 450px" }}
    >
      {/* 1. SQUARE PRODUCT IMAGE AREA (1:1 aspect ratio across all viewports, clean container without inner grey border, object-cover for true edge-to-edge square presentation) */}
      <div
        className="product-card-image relative w-full aspect-square shrink-0 rounded-[16px] overflow-hidden bg-white border-none select-none p-0"
        style={{ aspectRatio: "1 / 1" }}
      >
        <Link
          to={productUrl}
          state={{ initialProduct: product }}
          className="relative w-full h-full block overflow-hidden rounded-[16px] border-none"
          aria-label={displayTitle}
        >
          {hasValidImage ? (
            <>
              {allImages.map((imgUrl, idx) => (
                <img
                  key={imgUrl}
                  src={imgUrl}
                  alt={`${displayTitle} - View ${idx + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ease-in-out group-hover:scale-105 block border-none rounded-[16px] ${
                    idx === currentImageIndex ? "opacity-100 z-1" : "opacity-0 z-0 pointer-events-none"
                  }`}
                  style={{ objectFit: "cover", objectPosition: "center" }}
                  loading={idx === 0 ? "lazy" : "lazy"}
                  decoding="async"
                  onError={() => {
                    if (idx === 0 && allImages.length === 1) setImageFailed(true);
                  }}
                />
              ))}
            </>
          ) : (
            <div className="absolute inset-0 w-full h-full bg-neutral-50 flex flex-col items-center justify-center text-neutral-400 p-4 border border-dashed border-neutral-200 rounded-[16px]">
              <Package className="w-10 h-10 stroke-[1.2] text-neutral-300 mb-1.5" />
              <span className="text-xs font-semibold text-neutral-600 text-center break-words">{product.brand || "DR.MEDEX"}</span>
              <span className="text-[10px] text-neutral-400 mt-0.5">Image Pending</span>
            </div>
          )}
        </Link>

        {/* Position indicator dots (placed near bottom-center inside image container) */}
        {hasValidImage && allImages.length > 1 && (
          <div
            className="absolute bottom-2.5 left-0 right-0 z-10 flex items-center justify-center gap-1.5 pointer-events-none"
            aria-hidden="true"
          >
            {allImages.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentImageIndex
                    ? "w-5 bg-[#7AA05A] shadow-xs"
                    : "w-1.5 bg-black/35 backdrop-blur-xs"
                }`}
              />
            ))}
          </div>
        )}

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
            <Link
              to={productUrl}
              state={{ initialProduct: product }}
              title={displayTitle}
              className="hover:underline"
            >
              {renderBrandTitle(displayTitle)}
            </Link>
          </h3>
        </div>

        {/* 4. PRICE, DISCOUNT & PROMINENT MOSS-GREEN SHOW DETAILS BUTTON — consistently aligned at bottom */}
        <div className="mt-auto pt-2.5 shrink-0 space-y-2.5">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 min-h-[1.5rem]">
            <span className="text-sm sm:text-[15px] font-extrabold text-[#111111] tracking-tight">
              {formattedSale}
            </span>
            {hasDiscount && (
              <>
                <span className="text-[11px] sm:text-xs text-neutral-400 line-through font-medium">
                  {formattedRegular}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#7AA05A]/15 text-[#2D5A4A] text-[10px] font-bold tracking-tight">
                  {computedDiscount}% OFF
                </span>
              </>
            )}
          </div>

          <Link
            to={productUrl}
            state={{ initialProduct: product }}
            className="w-full py-2.5 sm:py-3 px-4 bg-[#7AA05A] hover:bg-[#688a4c] active:bg-[#5a7842] focus:outline-none focus:ring-2 focus:ring-[#7AA05A]/40 text-white rounded-full text-xs sm:text-sm font-bold tracking-wide transition-colors duration-200 flex items-center justify-center text-center shadow-2xs cursor-pointer block"
          >
            Show Details
          </Link>
        </div>
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";
