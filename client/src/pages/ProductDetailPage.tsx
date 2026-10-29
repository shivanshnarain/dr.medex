import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Check,
  Star,
  Package,
  ShieldCheck,
  Shield,
  Award,
  AlertCircle,
  RotateCcw,
  Zap,
  Plug,
  Wrench,
  CheckCircle,
  Share2
} from "lucide-react";
import { Product, Review } from "../types";
import { useCurrency } from "../context/CurrencyContext";
import { useCart } from "../context/CartContext";
import { ProductCard } from "../components/ProductCard";
import { B2BQuoteModal } from "../components/B2BQuoteModal";
import { ProductReviewsSection } from "../components/reviews/ProductReviewsSection";
import { getProductBySlug, fallbackProducts } from "../services/productService";

/**
 * Pure title parser: separates brand prefix from descriptive title
 */
function parseProductTitle(rawTitle: string) {
  const cleanTitle = (rawTitle || "Medical Equipment").trim();
  const drMedexRegex = /^(DR\.?)\s*(MEDEX)\s*[-–—:]*\s*(.*)$/i;
  const match = cleanTitle.match(drMedexRegex);
  if (match) {
    return {
      hasBrandPrefix: true,
      dr: "DR.",
      medex: "MEDEX",
      descriptiveName: match[3].trim()
    };
  }

  const drRegex = /^(DR\.?)\s*[-–—:]*\s*(.*)$/i;
  const drMatch = cleanTitle.match(drRegex);
  if (drMatch) {
    return {
      hasBrandPrefix: true,
      dr: "DR.",
      medex: "MEDEX",
      descriptiveName: drMatch[2].trim()
    };
  }

  return {
    hasBrandPrefix: false,
    dr: "DR.",
    medex: "MEDEX",
    descriptiveName: cleanTitle
  };
}

interface NormalizedSpec {
  key: string;
  value: string;
  unit?: string;
}

/**
 * Normalizes technical specifications across objects, arrays, and strings
 */
function normalizeSpecs(rawSpecs: any): NormalizedSpec[] {
  if (!rawSpecs) return [];
  if (Array.isArray(rawSpecs)) {
    const list: NormalizedSpec[] = [];
    for (const item of rawSpecs) {
      if (!item) continue;
      if (typeof item === "string") {
        const parts = item.split(":");
        list.push({
          key: parts[0]?.trim() || "Specification",
          value: parts.slice(1).join(":")?.trim() || item
        });
      } else if (typeof item === "object") {
        const key = item.parameter || item.key || item.name || item.title || "";
        const value = item.specification || item.value || item.val || "";
        const unit = item.unit || "";
        if (!key && !value) continue;
        list.push({
          key: String(key || "Specification"),
          value: typeof value === "object" ? JSON.stringify(value) : String(value),
          ...(unit ? { unit: String(unit) } : {})
        });
      }
    }
    return list;
  }

  if (typeof rawSpecs === "object") {
    return Object.entries(rawSpecs).map(([k, v]) => ({
      key: k,
      value: typeof v === "object" ? JSON.stringify(v) : String(v)
    }));
  }

  if (typeof rawSpecs === "string") {
    try {
      const parsed = JSON.parse(rawSpecs);
      return normalizeSpecs(parsed);
    } catch {
      return rawSpecs
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => {
          const parts = l.split(":");
          return {
            key: parts[0]?.trim() || "Specification",
            value: parts.slice(1).join(":")?.trim() || l
          };
        });
    }
  }

  return [];
}

/**
 * Normalizes array-like fields that might be strings or arrays
 */
function normalizeList(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String).filter((s) => s.trim().length > 0);
  if (typeof val === "string") {
    return val.split(/\r?\n|;/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Helper to safely extract Card 1: Power Supply
 */
function getPowerSupplyValue(product: Product | null | undefined, specs: NormalizedSpec[]): string {
  if (!product) return "Not specified";
  // 1. Direct powerRequirements if present as a non-empty string
  if (product.powerRequirements && typeof product.powerRequirements === "string" && product.powerRequirements.trim()) {
    return product.powerRequirements.trim();
  }
  // 2. Direct technicalSpecifications or specifications lookup
  const techSpecs = product.technicalSpecifications || product.specifications;
  if (techSpecs && typeof techSpecs === "object") {
    for (const [key, val] of Object.entries(techSpecs)) {
      if (/power\s*supply|power\s*requirements|input\s*voltage|voltage\s*rating|operating\s*voltage/i.test(key)) {
        if (typeof val === "string" && val.trim()) return val.trim();
        if (typeof val === "number") return String(val);
      }
    }
  }
  // 3. Search normalized specs
  const specific = specs.find((s) =>
    /power\s*supply|input\s*voltage|voltage\s*rating|operating\s*voltage|power\s*requirements/i.test(s.key)
  );
  if (specific && specific.value && String(specific.value).trim()) {
    return `${specific.value}${specific.unit ? ` ${specific.unit}` : ""}`.trim();
  }
  const general = specs.find((s) => /power|supply|voltage|input/i.test(s.key));
  if (general && general.value && String(general.value).trim()) {
    return `${general.value}${general.unit ? ` ${general.unit}` : ""}`.trim();
  }
  return "Not specified";
}

/**
 * Helper to safely extract Card 2: Quality Standard
 */
function getQualityStandardValue(product: Product | null | undefined, specs: NormalizedSpec[]): string {
  if (!product) return "Not specified";
  // 1. Direct technicalSpecifications or specifications lookup
  const techSpecs = product.technicalSpecifications || product.specifications;
  if (techSpecs && typeof techSpecs === "object") {
    for (const [key, val] of Object.entries(techSpecs)) {
      if (/quality\s*standard|quality\s*system|iso\b/i.test(key)) {
        if (typeof val === "string" && val.trim()) return val.trim();
        if (typeof val === "number") return String(val);
      }
    }
  }
  // 2. Search normalized specs
  const specific = specs.find((s) => /quality\s*standard|quality\s*system|iso\b/i.test(s.key));
  if (specific && specific.value && String(specific.value).trim()) {
    return `${specific.value}${specific.unit ? ` ${specific.unit}` : ""}`.trim();
  }
  // 3. Check certifications array (e.g. ISO certifications)
  const certs = normalizeList(product.certifications);
  const isoCert = certs.find((c) => /iso/i.test(c));
  if (isoCert) return isoCert;
  if (certs.length > 0) return certs[0];
  return "Not specified";
}

/**
 * Helper to safely extract Card 3: Regulatory Status
 */
function getRegulatoryStatusValue(product: Product | null | undefined, specs: NormalizedSpec[]): string {
  if (!product) return "Not specified";
  // 1. Direct technicalSpecifications or specifications lookup
  const techSpecs = product.technicalSpecifications || product.specifications;
  if (techSpecs && typeof techSpecs === "object") {
    for (const [key, val] of Object.entries(techSpecs)) {
      if (/regulatory\s*status|regulatory\s*compliance|regulatory\s*approval|ce\s*mark|fda\b/i.test(key)) {
        if (typeof val === "string" && val.trim()) return val.trim();
        if (typeof val === "number") return String(val);
      }
    }
  }
  // 2. Search normalized specs
  const specific = specs.find((s) => /regulatory\s*status|regulatory|compliance|approval|ce\s*mark|fda/i.test(s.key));
  if (specific && specific.value && String(specific.value).trim()) {
    return `${specific.value}${specific.unit ? ` ${specific.unit}` : ""}`.trim();
  }
  // 3. Direct product fields
  const reg = (product as any).regulatoryClassification || (product as any).regulatoryStatus;
  if (reg && typeof reg === "string" && reg.trim()) {
    return reg.trim();
  }
  // 4. Certifications
  const certs = normalizeList(product.certifications);
  const ceCert = certs.find((c) => /ce|fda|regulatory|compliance/i.test(c));
  if (ceCert) return ceCert;
  return "Not specified";
}

/**
 * Helper to safely extract Card 4: Warranty
 */
function getWarrantyValue(product: Product | null | undefined, specs: NormalizedSpec[]): string {
  if (!product) return "Not specified";
  // 1. Product direct warranty field (contains full duration and coverage details)
  if (product.warranty && typeof product.warranty === "string" && product.warranty.trim()) {
    return product.warranty.trim();
  }
  // 2. Direct technicalSpecifications or specifications lookup
  const techSpecs = product.technicalSpecifications || product.specifications;
  if (techSpecs && typeof techSpecs === "object") {
    for (const [key, val] of Object.entries(techSpecs)) {
      if (/warranty|guarantee|service\s*contract/i.test(key)) {
        if (typeof val === "string" && val.trim()) return val.trim();
        if (typeof val === "number") return String(val);
      }
    }
  }
  // 3. Search normalized specs
  const specific = specs.find((s) => /warranty|guarantee|service\s*contract/i.test(s.key));
  if (specific && specific.value && String(specific.value).trim()) {
    return `${specific.value}${specific.unit ? ` ${specific.unit}` : ""}`.trim();
  }
  return "Not specified";
}

/**
 * White line crossed-tools icon matching DR.MEDEX specification reference
 */
const CrossedToolsIcon: React.FC<{ size?: number; className?: string; strokeWidth?: number }> = ({
  size = 24,
  className,
  strokeWidth = 2
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1c.3-.3.9-.2 1 .2a6 6 0 0 1-8.3 7.1l-7.9 7.9a1 1 0 0 1-3-3l7.9-7.9a6 6 0 0 1 7.1-8.3c.4.1.5.7.2 1z" />
    <path d="m4.5 19.5 4.5-4.5" />
    <path d="m15 9 4.5-4.5" />
    <path d="m18 3 3 3" />
  </svg>
);

/**
 * Safely extracts verified key factors and highlights from product data.
 * Adheres strictly to factual claims in database without inventing specs.
 */
function isNonEngineeringBoilerplate(str: string): boolean {
  return /delivered within|delivery within|business days|return or replace|exchange within|return within|replacement within|refund policy|within 30 days/i.test(
    str
  );
}

/**
 * Safely extracts verified key factors and highlights from product data.
 * Adheres strictly to factual claims in database without inventing specs.
 */
function getProductKeyFactors(product: Product | null | undefined): string[] {
  if (!product) return [];

  // 1. Structured keyFeatures or features (filtered against delivery/return boilerplate)
  const rawFeatures = normalizeList(product.keyFeatures || product.features);
  const cleanFeatures = rawFeatures.filter((s) => !isNonEngineeringBoilerplate(s));
  if (cleanFeatures.length > 0) return cleanFeatures;

  // 2. Benefits (filtered)
  const rawBenefits = normalizeList(product.benefits);
  const cleanBenefits = rawBenefits.filter((s) => !isNonEngineeringBoilerplate(s));
  if (cleanBenefits.length > 0) return cleanBenefits;

  // 3. Structured technical specifications from database
  const rawSpecs = product.technicalSpecifications || product.specifications;
  if (rawSpecs && Array.isArray(rawSpecs)) {
    const specLines = rawSpecs
      .map((s: any) => {
        const k = s.parameter || s.key || s.name || "";
        const v = s.specification || s.value || "";
        const unit = s.unit ? ` ${s.unit}` : "";
        if (!k || !v || k.toLowerCase() === "item" || String(v).toLowerCase() === "value") return null;
        return `${k}: ${v}${unit}`;
      })
      .filter(Boolean) as string[];
    if (specLines.length > 0) return specLines.slice(0, 8);
  } else if (rawSpecs && typeof rawSpecs === "object") {
    const specLines = Object.entries(rawSpecs)
      .map(([k, v]) => {
        if (!k || !v || k.toLowerCase() === "item" || String(v).toLowerCase() === "value") return null;
        return `${k}: ${String(v)}`;
      })
      .filter(Boolean) as string[];
    if (specLines.length > 0) return specLines.slice(0, 8);
  }

  // 4. Factual highlights derived only from existing description
  const desc = product.fullDescription || product.overview || product.shortDescription || "";
  if (desc) {
    const lines = desc
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*•\t]+\s*/, "").trim())
      .filter((l) => l.length > 15 && !isNonEngineeringBoilerplate(l));
    if (lines.length >= 2) {
      return lines.slice(0, 8);
    }
    const sentences = desc
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && !isNonEngineeringBoilerplate(s));
    if (sentences.length > 0) {
      return sentences.slice(0, 6);
    }
  }

  return [];
}

/**
 * Parses a key factor item into an important highlight phrase and supporting details.
 */
function parseKeyFactor(raw: string): { title: string; detail: string } {
  let text = (raw || "").trim();
  // Fix cases where title merges into sentence without space (e.g. TechnologyIdeal -> Technology: Ideal)
  text = text.replace(/([a-z0-9])([A-Z][a-z]{2,})/g, "$1: $2");

  // 1. Check for colon separator
  const colonIdx = text.indexOf(":");
  if (colonIdx > 2 && colonIdx < 55) {
    return {
      title: text.substring(0, colonIdx).trim() + ":",
      detail: text.substring(colonIdx + 1).trim()
    };
  }

  // 2. Check for spaced hyphen/dash separator (avoiding hyphenated words like "medical-grade")
  const dashMatch = text.match(/^([^–—\n]{3,45}?)\s+(?:[–—]|-)\s+(.+)$/);
  if (dashMatch) {
    return {
      title: dashMatch[1].trim() + " –",
      detail: dashMatch[2].trim()
    };
  }

  // 3. Fallback: split leading phrase (first 3 to 4 words or before key prepositions)
  const words = text.split(/\s+/);
  if (words.length <= 4) {
    return { title: text, detail: "" };
  }

  const breakWords = ["for", "with", "to", "that", "conforming", "engineered", "designed", "including"];
  let breakIdx = -1;
  for (let i = 2; i < Math.min(words.length - 1, 6); i++) {
    if (breakWords.includes(words[i].toLowerCase())) {
      breakIdx = i;
      break;
    }
  }
  if (breakIdx === -1) {
    breakIdx = 3;
  }

  return {
    title: words.slice(0, breakIdx).join(" "),
    detail: words.slice(breakIdx).join(" ")
  };
}

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [hoveredThumbnailIndex, setHoveredThumbnailIndex] = useState<number | null>(null);
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isSubmittingBuy, setIsSubmittingBuy] = useState(false);

  // Gallery autoplay & interaction state
  const [isGalleryPaused, setIsGalleryPaused] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isMobileStripHidden, setIsMobileStripHidden] = useState(false);
  const slideshowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shareToast, setShareToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Dynamic measurement of product gallery height to coordinate with right column
  const galleryRef = useRef<HTMLDivElement>(null);
  const mainImageRef = useRef<HTMLImageElement>(null);
  const [galleryHeight, setGalleryHeight] = useState<number | null>(null);

  const updateGalleryHeight = useCallback(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      if (galleryRef.current && galleryRef.current.offsetHeight > 0) {
        setGalleryHeight(Math.round(galleryRef.current.offsetHeight));
      } else if (mainImageRef.current && mainImageRef.current.offsetHeight > 0) {
        setGalleryHeight(Math.round(mainImageRef.current.offsetHeight));
      }
    } else {
      setGalleryHeight(null);
    }
  }, []);

  useEffect(() => {
    updateGalleryHeight();

    const handleResize = () => updateGalleryHeight();
    window.addEventListener("resize", handleResize);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateGalleryHeight();
      });
      if (mainImageRef.current) {
        resizeObserver.observe(mainImageRef.current);
      }
      if (galleryRef.current) {
        resizeObserver.observe(galleryRef.current);
      }
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [updateGalleryHeight, activeImageIndex, product?.id]);

  // Quote modal (for related product cards)
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Fetch product data
  const loadProduct = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const { product: prod } = await getProductBySlug(slug);
      if (prod) {
        setProduct(prod);
        setActiveImageIndex(0);

        // Fetch related products in the same category
        if (prod.category) {
          let relatedLoaded = false;
          try {
            const relRes = await fetch(`/api/products?category=${encodeURIComponent(prod.category)}`);
            if (relRes.ok) {
              const relData = await relRes.json();
              if (relData.success && Array.isArray(relData.products)) {
                setRelatedProducts(
                  relData.products
                    .filter((p: Product) => p.id !== prod.id && p.slug !== prod.slug)
                    .slice(0, 4)
                );
                relatedLoaded = true;
              }
            }
          } catch {
            // fallback handled below
          }

          if (!relatedLoaded) {
            const relFallback = fallbackProducts
              .filter((p) => p.category === prod.category && p.id !== prod.id && p.slug !== prod.slug)
              .slice(0, 4);
            setRelatedProducts(relFallback);
          }
        }
      } else {
        setProduct(null);
      }
    } catch (e: any) {
      console.error("Failed to load product detail:", e);
      setFetchError(e.message || "Failed to load product information.");
      setProduct(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProduct();
    window.scrollTo(0, 0);
  }, [loadProduct]);

  // Page visibility listener for gallery autoplay pausing
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Authoritative canonical current gallery resolution: include every saved photograph preserving order
  const productImages = React.useMemo(() => {
    if (!product) return [];
    const extractUrl = (item: any): string => {
      if (!item) return "";
      if (typeof item === "string") return item.trim();
      if (typeof item === "object") {
        const u = item.secureUrl || item.secure_url || item.url || item.src || "";
        return typeof u === "string" ? u.trim() : "";
      }
      return "";
    };

    const seenUrls = new Set<string>();
    const imgs: string[] = [];

    const addImageUrl = (raw: any) => {
      const u = extractUrl(raw);
      if (u && !u.startsWith("blob:") && !u.startsWith("data:") && !seenUrls.has(u)) {
        seenUrls.add(u);
        imgs.push(u);
      }
    };

    if (product.primaryImage) {
      addImageUrl(product.primaryImage);
    }
    if (Array.isArray(product.images)) {
      product.images.forEach(addImageUrl);
    }
    if (Array.isArray(product.galleryImages)) {
      product.galleryImages.forEach(addImageUrl);
    }
    if (imgs.length === 0) {
      imgs.push("https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80");
    }
    return imgs;
  }, [product]);

  // Up to five real product-image thumbnails for gallery display
  const galleryThumbnails = React.useMemo(() => {
    return productImages.slice(0, 5);
  }, [productImages]);

  // Single controlled slideshow timer: Exactly 5,000ms per image sequential rotation
  useEffect(() => {
    // 1. Clean up any existing active timer
    if (slideshowTimerRef.current) {
      clearTimeout(slideshowTimerRef.current);
      slideshowTimerRef.current = null;
    }

    // 2. Disable if only one image, user paused via tap, or page hidden
    if (galleryThumbnails.length <= 1 || isGalleryPaused || !isPageVisible) {
      return;
    }

    // 3. Exactly 5,000 milliseconds before advancing sequentially
    slideshowTimerRef.current = setTimeout(() => {
      setActiveImageIndex((prev) => (prev + 1) % galleryThumbnails.length);
    }, 5000);

    // 4. Cleanup on unmount or before next image/state change
    return () => {
      if (slideshowTimerRef.current) {
        clearTimeout(slideshowTimerRef.current);
        slideshowTimerRef.current = null;
      }
    };
  }, [activeImageIndex, isGalleryPaused, isPageVisible, galleryThumbnails.length]);

  // Main image tap toggle (Mobile tap-to-pause & toggle thumbnail overlay)
  const handleMainImageTap = () => {
    setIsGalleryPaused((prev) => !prev);
    setIsMobileStripHidden((prev) => !prev);
  };

  // Thumbnail manual selection: immediately updates main image and resets the 5-second timer
  const handleSelectThumbnail = (idx: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setActiveImageIndex(idx);
  };

  // Share product handler (Web Share API with clipboard fallback)
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    const shareTitle = productTitle;
    const shareText = `Check out ${productTitle} on DR.MEDEX Global`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        setShareToast({ message: "Product link shared successfully!", type: "success" });
        setTimeout(() => setShareToast(null), 2500);
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          return;
        }
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast({ message: "Product link copied to clipboard!", type: "success" });
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = shareUrl;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setShareToast({ message: "Product link copied to clipboard!", type: "success" });
      }
      setTimeout(() => setShareToast(null), 2500);
    } catch {
      setShareToast({ message: "Failed to copy product link", type: "error" });
      setTimeout(() => setShareToast(null), 2500);
    }
  };

  // Dynamic SEO Metadata Management (Meta Title & Description with fallback hierarchy and stale cleanup)
  useEffect(() => {
    if (!product) return;

    // 1. Resolve SEO Meta Title with safe fallback hierarchy:
    // metaTitle -> seoTitle -> storefrontProductTitle -> title -> productName -> fallback
    const customTitle = (product.metaTitle || product.seoTitle || "").trim();
    const fallbackTitle = (
      product.storefrontProductTitle ||
      product.title ||
      product.productName ||
      "Medical Equipment"
    ).trim();

    const baseTitle = customTitle || fallbackTitle;
    const documentTitle = baseTitle.toLowerCase().includes("dr.medex")
      ? baseTitle
      : `${baseTitle} | DR.MEDEX Global`;

    const previousTitle = document.title;
    document.title = documentTitle;

    // 2. Resolve SEO Meta Description with safe fallback hierarchy:
    // metaDescription -> seoDescription -> shortDescription -> overview -> fullDescription -> fallback
    const customDesc = (product.metaDescription || product.seoDescription || "").trim();
    const fallbackDesc = (
      product.shortDescription ||
      product.overview ||
      product.fullDescription ||
      "Certified hospital-grade medical equipment and specialized surgical technology from DR.MEDEX Global."
    ).trim();

    const rawDesc = customDesc || fallbackDesc;
    // Strip HTML tags and normalize whitespace to prevent raw HTML injection
    const cleanDesc = rawDesc
      .replace(/<[^>]*>?/gm, "")
      .replace(/\s+/g, " ")
      .slice(0, 320)
      .trim();

    // 3. Update or inject <meta name="description">
    let descMeta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    let createdDescMeta = false;
    let prevDescContent = "";

    if (!descMeta) {
      descMeta = document.createElement("meta");
      descMeta.name = "description";
      document.head.appendChild(descMeta);
      createdDescMeta = true;
    } else {
      prevDescContent = descMeta.getAttribute("content") || "";
    }
    descMeta.setAttribute("content", cleanDesc);

    // 4. Update OpenGraph tags
    const ogTitle = document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null;
    let prevOgTitle = "";
    if (ogTitle) {
      prevOgTitle = ogTitle.getAttribute("content") || "";
      ogTitle.setAttribute("content", documentTitle);
    }

    const ogDesc = document.querySelector('meta[property="og:description"]') as HTMLMetaElement | null;
    let prevOgDesc = "";
    if (ogDesc) {
      prevOgDesc = ogDesc.getAttribute("content") || "";
      ogDesc.setAttribute("content", cleanDesc);
    }

    // 5. Cleanup on unmount or product transition so metadata from product A does NOT leak into product B
    return () => {
      document.title = previousTitle || "DR.MEDEX — Medical Equipment";
      if (descMeta) {
        if (createdDescMeta && descMeta.parentNode) {
          descMeta.parentNode.removeChild(descMeta);
        } else if (prevDescContent) {
          descMeta.setAttribute("content", prevDescContent);
        }
      }
      if (ogTitle && prevOgTitle) {
        ogTitle.setAttribute("content", prevOgTitle);
      }
      if (ogDesc && prevOgDesc) {
        ogDesc.setAttribute("content", prevOgDesc);
      }
    };
  }, [product]);


  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-white">
        <div className="h-4 bg-neutral-100 animate-pulse rounded w-48 mb-4 sm:mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
          <div className="flex gap-4">
            <div className="hidden sm:flex flex-col gap-3">
              <div className="w-16 h-16 bg-neutral-100 animate-pulse rounded-lg" />
              <div className="w-16 h-16 bg-neutral-100 animate-pulse rounded-lg" />
              <div className="w-16 h-16 bg-neutral-100 animate-pulse rounded-lg" />
            </div>
            <div className="flex-1 h-[520px] bg-neutral-50 animate-pulse rounded-xl" />
          </div>
          <div className="space-y-4 pt-2 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="h-8 bg-neutral-100 animate-pulse rounded w-3/4" />
              <div className="h-6 bg-neutral-100 animate-pulse rounded w-1/4" />
              <div className="h-px bg-neutral-200 my-4" />
              <div className="h-44 bg-neutral-100 animate-pulse rounded" />
              <div className="h-px bg-neutral-200 my-4" />
            </div>
            <div className="h-12 bg-neutral-100 animate-pulse rounded w-full mt-auto" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 sm:mt-12 pt-2">
          <div className="h-16 bg-neutral-100 animate-pulse rounded-lg" />
          <div className="h-16 bg-neutral-100 animate-pulse rounded-lg" />
          <div className="h-16 bg-neutral-100 animate-pulse rounded-lg" />
          <div className="h-16 bg-neutral-100 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-28 text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <AlertCircle size={24} />
        </div>
        <h2 className="text-2xl font-extrabold text-[#2D5A4A]">Catalogue Connection Interrupted</h2>
        <p className="text-sm text-neutral-600 leading-relaxed">
          A temporary network error prevented retrieval of this medical equipment record.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={loadProduct}
            className="px-6 py-3 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-2"
          >
            <RotateCcw size={14} />
            <span>Retry Connection</span>
          </button>
          <Link
            to="/shop-all"
            className="px-6 py-3 bg-white border border-[#E5E7EB] text-[#2D5A4A] rounded-xl text-xs font-bold hover:bg-[#F3F4F6] transition-colors shadow-2xs"
          >
            Explore Active Catalogue
          </Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-28 text-center space-y-5">
        <div className="w-12 h-12 mx-auto rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center text-[#2D5A4A]">
          <Package size={24} />
        </div>
        <h2 className="text-2xl font-extrabold text-[#2D5A4A]">Equipment Currently Unavailable</h2>
        <p className="text-sm text-neutral-600 leading-relaxed">
          The requested medical device could not be found or belongs to a catalogue category currently reserved for direct institutional requisition.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/shop-all"
            className="inline-block px-6 py-3 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            Explore Active Catalogue
          </Link>
          <Link
            to="/request-quote"
            className="inline-block px-6 py-3 bg-white border border-[#E5E7EB] text-[#2D5A4A] rounded-xl text-xs font-bold hover:bg-[#F3F4F6] transition-colors shadow-2xs"
          >
            Request Institutional RFQ
          </Link>
        </div>
      </div>
    );
  }

  const productTitle = product.title || product.productName || "Medical Equipment";
  const titleParts = parseProductTitle(productTitle);
  const originalPrice = product.originalPrice || product.regularPrice;
  const discountPercentage =
    product.discountPercentage && product.discountPercentage > 0
      ? product.discountPercentage
      : originalPrice && originalPrice > product.basePrice
      ? Math.round(((originalPrice - product.basePrice) / originalPrice) * 100)
      : 0;

  const normalizedSpecs = normalizeSpecs(product.technicalSpecifications || product.specifications);
  const productKeyFactors = getProductKeyFactors(product);
  const productApplications = normalizeList(
    (product as any).clinicalIndications ||
    product.applications ||
    (product as any).indications ||
    (product as any).specialtyProcedures
  );
  const productPackage = normalizeList(
    product.packageContents ||
    (product as any).package ||
    (product as any).standardIncluded ||
    (product as any).includedAccessories
  );
  const productOverview = product.fullDescription || product.overview || product.shortDescription || "";

  // Cart and purchase handlers
  const handleAddToCart = () => {
    addToCart(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1600);
  };

  const handleBuyNow = () => {
    setIsSubmittingBuy(true);
    addToCart(product, 1);
    navigate("/checkout");
  };

  // Exactly Four Technical Specification Cards
  const specCards = [
    {
      id: "power",
      title: "Power Supply",
      value: getPowerSupplyValue(product, normalizedSpecs),
      icon: Plug
    },
    {
      id: "quality",
      title: "Quality Standard",
      value: getQualityStandardValue(product, normalizedSpecs),
      icon: Award
    },
    {
      id: "regulatory",
      title: "Regulatory Status",
      value: getRegulatoryStatusValue(product, normalizedSpecs),
      icon: ShieldCheck
    },
    {
      id: "warranty",
      title: "Warranty",
      value: getWarrantyValue(product, normalizedSpecs),
      icon: CrossedToolsIcon
    }
  ];

  return (
    <div className="w-full bg-white min-h-screen text-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* ========================================================= */}
        {/* TOP SECTION: 50/50 SPLIT GALLERY & DETAILS                */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
          {/* ------------------------------------------------------- */}
          {/* LEFT 50%: PRODUCT IMAGE GALLERY                          */}
          {/* ------------------------------------------------------- */}
          <div
            ref={galleryRef}
            className="w-full flex items-start gap-3 lg:gap-4 select-none"
            aria-label="Product Image Gallery"
          >
            {/* Desktop Vertical Thumbnail Rail (Far left, up to 5 real images) */}
            {galleryThumbnails.length > 1 && (
              <div
                className="hidden lg:flex flex-col items-center gap-2.5 shrink-0 max-h-[600px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="tablist"
                aria-label="Product gallery thumbnail rail"
              >
                {galleryThumbnails.map((img, idx) => {
                  const isSelected = activeImageIndex === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      aria-label={`View photo ${idx + 1} of ${galleryThumbnails.length}`}
                      onClick={(e) => handleSelectThumbnail(idx, e)}
                      className="relative inline-flex items-center justify-center shrink-0 cursor-pointer p-0 bg-transparent border-0 focus:outline-none"
                    >
                      <img
                        src={img}
                        alt={`${productTitle} thumbnail ${idx + 1}`}
                        className={`block h-16 xl:h-20 w-auto max-w-[76px] xl:max-w-[92px] object-contain rounded-[6px] bg-white select-none pointer-events-none transition-all duration-200 ${
                          isSelected
                            ? "border-2 border-[#7AA05A] opacity-100"
                            : "border-2 border-transparent opacity-65 hover:opacity-100 hover:border-neutral-200"
                        }`}
                        loading="lazy"
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Product Image Container — Natural aspect ratio, relative for mobile overlay & share */}
            <div
              className="relative flex-1 min-w-0 w-full cursor-pointer lg:cursor-default"
              onClick={handleMainImageTap}
            >
              <img
                ref={mainImageRef}
                src={productImages[activeImageIndex] || productImages[0]}
                alt={`${productTitle} - Angle ${activeImageIndex + 1}`}
                onLoad={updateGalleryHeight}
                className="product-gallery-main-image block w-full h-auto max-w-full object-contain object-center rounded-[8px] border-none select-none"
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto",
                  maxWidth: "100%",
                  objectFit: "contain",
                  objectPosition: "center",
                  borderRadius: "8px",
                  border: "none",
                  boxSizing: "border-box"
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80";
                }}
              />

              {/* Dark-Green Circular Share Button (Top-Right inside image area, shadow-none, white icon) */}
              <div className="absolute top-3 right-3 z-30">
                <button
                  type="button"
                  onClick={handleShare}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#2D5A4A] hover:bg-[#23473a] text-white flex items-center justify-center transition-all duration-150 border-none cursor-pointer focus:outline-none shadow-none hover:shadow-none focus:shadow-none active:scale-95"
                  style={{ borderRadius: "50%" }}
                  title="Share product"
                  aria-label="Share product"
                >
                  <Share2 size={16} className="text-white" />
                </button>
                {shareToast && (
                  <div
                    role="status"
                    className={`absolute right-0 top-full mt-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-none whitespace-nowrap animate-in fade-in duration-150 z-40 ${
                      shareToast.type === "success"
                        ? "bg-[#2D5A4A] text-white"
                        : "bg-rose-600 text-white"
                    }`}
                  >
                    {shareToast.message}
                  </div>
                )}
              </div>

              {/* Mobile Floating Thumbnail Strip Overlay (Near bottom, tap toggles visibility) */}
              {galleryThumbnails.length > 1 && !isMobileStripHidden && (
                <div
                  className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[92%] sm:max-w-[85%] bg-white/95 sm:bg-white/90 backdrop-blur-md rounded-2xl p-1.5 shadow-md border border-neutral-200/80 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  role="tablist"
                  aria-label="Product image gallery thumbnails"
                  onClick={(e) => e.stopPropagation()}
                >
                  {galleryThumbnails.map((img, idx) => {
                    const isSelected = activeImageIndex === idx;

                    return (
                      <button
                        key={idx}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        aria-label={`View photo ${idx + 1} of ${galleryThumbnails.length}`}
                        onClick={(e) => handleSelectThumbnail(idx, e)}
                        className="relative inline-flex items-center justify-center shrink-0 cursor-pointer p-0 bg-transparent border-0 focus:outline-none"
                      >
                        <img
                          src={img}
                          alt={`${productTitle} thumbnail ${idx + 1}`}
                          className={`block h-11 sm:h-12 w-auto max-w-[62px] sm:max-w-[72px] object-contain rounded-[6px] bg-white select-none pointer-events-none transition-all duration-200 ${
                            isSelected
                              ? "border-2 border-[#7AA05A] opacity-100 scale-105"
                              : "border-2 border-transparent opacity-70 hover:opacity-100 scale-100"
                          }`}
                          loading="lazy"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* RIGHT 50%: PRODUCT DETAILS & ACTIONS                    */}
          {/* ------------------------------------------------------- */}
          <div
            style={galleryHeight ? { height: `${galleryHeight}px` } : undefined}
            className="w-full flex flex-col justify-between min-w-0"
          >
            {/* A. Fixed Top Section (flex-shrink: 0) */}
            <div className="shrink-0 space-y-2">
              {/* 1. Breadcrumb navigation */}
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1 sm:mb-1.5"
              >
                <Link to="/" className="hover:text-[#171717] transition-colors">
                  Home
                </Link>
                <span className="text-neutral-400">&gt;</span>
                <Link
                  to={product.category ? `/shop-all?category=${product.category}` : "/shop-all"}
                  className="hover:text-[#171717] transition-colors font-medium text-neutral-600"
                >
                  {product.categoryName || "Examination & OT Tables"}
                </Link>
              </nav>

              {/* 2. Product title and DR.MEDEX branding */}
              <div className="shrink-0">
                <h1 className="text-xl sm:text-2xl lg:text-[1.65rem] tracking-tight leading-snug">
                  <span className="font-extrabold text-[#2D5A4A]">{titleParts.dr}</span>
                  <span className="font-extrabold text-[#7AA05A] ml-0.5">{titleParts.medex}</span>{" "}
                  <span className="font-normal text-[#171717]">{titleParts.descriptiveName}</span>
                </h1>
              </div>

              {/* 3. Rating, when available */}
              {typeof product.rating === "number" && product.rating > 0 && (
                <div className="flex items-center gap-1.5 pt-0.5 text-xs text-neutral-600 shrink-0">
                  <div className="flex items-center text-amber-500">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span className="font-bold ml-1 text-neutral-800">{product.rating.toFixed(1)}</span>
                  </div>
                  {product.reviewCount ? (
                    <span className="text-neutral-400">({product.reviewCount} {product.reviewCount === 1 ? "review" : "reviews"})</span>
                  ) : null}
                </div>
              )}

              {/* 4. Selling price, original price, and discount badge */}
              <div className="flex items-baseline gap-3 pt-0.5 flex-wrap shrink-0">
                <span className="text-2xl sm:text-3xl font-extrabold text-[#171717] font-mono tracking-tight">
                  {formatPrice(product.basePrice)}
                </span>
                {originalPrice && originalPrice > product.basePrice && (
                  <span className="text-base sm:text-lg text-neutral-400 line-through font-mono">
                    {formatPrice(originalPrice)}
                  </span>
                )}
                {discountPercentage > 0 && (
                  <span className="px-2.5 py-1 text-xs font-bold uppercase bg-[#D92D32] text-white rounded tracking-wide shadow-2xs">
                    {discountPercentage}% OFF
                  </span>
                )}
              </div>

              {/* 5. Thin horizontal divider immediately below the pricing section */}
              <hr className="border-t border-neutral-200 my-1.5 shrink-0" />
            </div>

            {/* B. Middle Description Section — flex: 1; min-height: 0; overflow-y: auto */}
            <div className="flex-1 min-h-0 flex flex-col py-1 overflow-hidden my-0.5">
              <h2 className="text-sm font-bold text-[#2D5A4A] tracking-tight mb-1 shrink-0">
                Description
              </h2>
              <div className="flex-1 min-h-0 lg:overflow-y-auto pr-3 text-xs sm:text-[13px] text-neutral-600 leading-relaxed product-description-scrollbar [scrollbar-color:#7AA05A_#F3F4F6] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#F3F4F6] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#7AA05A] hover:[&::-webkit-scrollbar-thumb]:bg-[#6B8F4E] [&::-webkit-scrollbar-thumb]:rounded-full">
                {productOverview ? (
                  <p className="whitespace-pre-line pb-1">{productOverview}</p>
                ) : (
                  <p className="text-xs text-neutral-400 italic">No description provided for this equipment.</p>
                )}
              </div>
            </div>

            {/* C. Fixed Bottom Section — flex-shrink: 0; margin-top: auto */}
            <div className="shrink-0 mt-auto pt-1 space-y-3">
              {/* 1. Thin horizontal divider immediately above purchase actions */}
              <hr className="border-t border-neutral-200 mb-3 shrink-0" />

              {/* 2. Purchase Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                {/* Add to Cart button: Filled Moss Green #7AA05A bg, white text & cart icon */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-full sm:flex-1 h-11 sm:h-12 px-4 bg-[#7AA05A] hover:bg-[#6b8f4e] text-white border border-[#7AA05A] rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors duration-200 shadow-2xs cursor-pointer select-none"
                >
                  {isAdded ? (
                    <Check size={18} className="text-white" />
                  ) : (
                    <ShoppingCart size={18} className="text-white" />
                  )}
                  <span>{isAdded ? "Added to Cart" : "Add to Cart"}</span>
                </button>

                {/* Buy Now button: Solid Slate Green #2D5A4A bg, white text */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isSubmittingBuy}
                  className="w-full sm:flex-1 h-11 sm:h-12 px-4 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition-colors duration-200 shadow-2xs cursor-pointer select-none disabled:opacity-50"
                >
                  {isSubmittingBuy ? "Processing..." : "Buy Now"}
                </button>
              </div>

              {/* 3-6. Benefits: Power Supply, Quality Standard, Regulatory Status, Warranty */}
              <div className="pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 sm:gap-0 gap-y-3">
                  {specCards.map((card, idx) => {
                    const IconComponent = card.icon;
                    const isLeftCol = idx % 2 === 0;
                    const isTopRow = idx < 2;
                    const isLastMobile = idx === specCards.length - 1;

                    return (
                      <div
                        key={card.id}
                        className={`flex items-start gap-3 min-w-0 ${
                          !isLastMobile ? "border-b border-neutral-100 pb-2.5" : "pb-0"
                        } ${
                          isLeftCol
                            ? "sm:border-r sm:border-[#7AA05A]/50 sm:pr-4"
                            : "sm:border-r-0 sm:pl-4"
                        } ${
                          isTopRow
                            ? "sm:border-b sm:border-[#7AA05A]/50 sm:pb-3 sm:pt-0"
                            : "sm:border-b-0 sm:pt-3 sm:pb-0"
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-[#2D5A4A] flex items-center justify-center text-white shrink-0 shadow-2xs mt-0.5">
                          <IconComponent size={20} strokeWidth={2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xs sm:text-[13px] font-bold text-[#171717] tracking-tight leading-tight">
                            {card.title}
                          </h3>
                          <p className="text-[11px] sm:text-xs font-normal text-[#6B7280] leading-snug break-words whitespace-pre-line mt-0.5">
                            {card.value}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* LOWER PRODUCT INFORMATION: STRUCTURED MEDICAL CATALOGUE   */}
        {/* Alternating Left - Right - Left Layout on Desktop         */}
        {/* 1. Clinical Indications & Specialty Procedures (Left)     */}
        {/* 2. Standard Included Package Contents (Right)             */}
        {/* 3. Key Factors & Engineering Highlights (Left)           */}
        {/* ========================================================= */}
        <div className="mt-12 sm:mt-16 space-y-8 sm:space-y-10">
          {/* 1. Clinical Indications & Specialty Procedures (Row 1 - Left Aligned) */}
          <section className="w-full lg:max-w-2xl lg:mr-auto">
            <div className="mb-3.5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#2D5A4A] shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-[#2D5A4A] tracking-tight">
                  Clinical Indications & Specialty Procedures
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] text-[#7AA05A] ml-4">
                Verified clinical indications, departmental applications, and specialty procedure protocols.
              </p>
            </div>

            {productApplications.length > 0 ? (
              <ul className="ml-4 space-y-2.5">
                {productApplications.map((app, idx) => (
                  <li key={`app-${idx}`} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7AA05A] shrink-0 mt-2" />
                    <span className="text-xs sm:text-[13px] leading-relaxed text-[#171717]">
                      {app}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ml-4 text-xs text-neutral-500 italic">
                Clinical application guidelines and specialty procedure protocols available on request.
              </p>
            )}
          </section>

          {/* Subtle separator */}
          <hr className="border-t border-[#E5E7EB]" />

          {/* 2. Standard Included Package Contents (Row 2 - Right Aligned Block) */}
          <section className="w-full lg:max-w-2xl lg:ml-auto">
            <div className="mb-3.5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#2D5A4A] shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-[#2D5A4A] tracking-tight">
                  Standard Included Package Contents
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] text-[#7AA05A] ml-4">
                Standard accessories, documentation, and included assemblies.
              </p>
            </div>

            {productPackage.length > 0 ? (
              <ul className="ml-4 space-y-2.5">
                {productPackage.map((item, idx) => (
                  <li key={`pkg-${idx}`} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#7AA05A] shrink-0 mt-2" />
                    <span className="text-xs sm:text-[13px] leading-relaxed text-[#171717]">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ml-4 text-xs text-neutral-500 italic">
                Standard package accessories and certified documentation available upon request.
              </p>
            )}
          </section>

          {/* Subtle separator */}
          <hr className="border-t border-[#E5E7EB]" />

          {/* 3. Key Factors & Engineering Highlights (Row 3 - Left Aligned) */}
          <section className="w-full lg:max-w-2xl lg:mr-auto">
            <div className="mb-3.5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#2D5A4A] shrink-0" />
                <h3 className="text-base sm:text-lg font-bold text-[#2D5A4A] tracking-tight">
                  Key Factors & Engineering Highlights
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] text-[#7AA05A] ml-4">
                Verified operational capabilities, safety mechanisms, and performance highlights.
              </p>
            </div>

            {productKeyFactors.length > 0 ? (
              <ul className="ml-4 space-y-3">
                {productKeyFactors.map((item, idx) => {
                  const parsed = parseKeyFactor(item);
                  return (
                    <li key={`kf-${idx}`} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7AA05A] shrink-0 mt-2" />
                      <div className="text-xs sm:text-[13px] leading-relaxed text-[#171717]">
                        <span className="font-bold text-[#2D5A4A]">{parsed.title} </span>
                        {parsed.detail && (
                          <span className="font-normal text-[#171717]">{parsed.detail}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="ml-4 text-xs text-neutral-500 italic">
                Technical specifications, operating parameters, and engineering dossier available upon request.
              </p>
            )}
          </section>
        </div>

        {/* ========================================================= */}
        {/* CLINICAL EVALUATIONS & VERIFIED PRACTITIONER REVIEWS      */}
        {/* Cloud Firestore Powered with Grounded Gemini AI Assistant  */}
        {/* ========================================================= */}
        <ProductReviewsSection
          productId={product.id || (product as any)._id || product.slug || slug || "product"}
          productSlug={product.slug || slug || product.id}
          productTitle={product.title || product.productName || "Medical Device"}
          productImage={(product.images && product.images[0]) || (product as any).image || (product as any).imageUrl || ""}
          category={product.category}
        />

        {/* ========================================================= */}
        {/* RELATED MEDICAL EQUIPMENT (Compact Card Row)              */}
        {/* ========================================================= */}
        {relatedProducts.length > 0 && (
          <div className="mt-14 sm:mt-20 border-t border-[#E5E1DD] pt-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-[#7AA05A]">Clinical Complement</span>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#2D5A4A] tracking-tight">
                  Related Medical Equipment
                </h3>
              </div>
              <Link
                to={`/shop-all?category=${product.category}`}
                className="text-xs font-bold text-[#2D5A4A] hover:text-[#7AA05A] transition-colors"
              >
                View Category →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} onOpenQuote={() => setIsQuoteModalOpen(true)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* B2B Institutional Quote Modal */}
      <B2BQuoteModal
        product={product}
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
      />
    </div>
  );
};
