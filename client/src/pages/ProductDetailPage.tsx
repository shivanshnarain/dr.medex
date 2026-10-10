import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Award,
  Truck,
  ShoppingCart,
  Heart,
  Check,
  Star,
  Download,
  Package,
  Building
} from "lucide-react";
import { Product, Review } from "../types";
import { useCurrency } from "../context/CurrencyContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { ProductCard } from "../components/ProductCard";
import { B2BQuoteModal } from "../components/B2BQuoteModal";

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { formatPrice, currentCountry, currentCurrency } = useCurrency();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "applications" | "package" | "warranty" | "reviews">("specs");
  const [isAdded, setIsAdded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Quote modal
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewFacility, setReviewFacility] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products/${slug}`);
        const data = await res.json();
        if (data.success && data.product) {
          setProduct(data.product);
          setActiveImageIndex(0);

          // Fetch related in same category
          const relRes = await fetch(`/api/products?category=${data.product.category}`);
          const relData = await relRes.json();
          if (relData.success) {
            setRelatedProducts(relData.products.filter((p: Product) => p.id !== data.product.id).slice(0, 4));
          }

          // Fetch reviews
          const revRes = await fetch(`/api/reviews/${data.product.id}`);
          const revData = await revRes.json();
          if (revData.success) {
            setReviews(revData.reviews);
          }
        }
      } catch (e) {
        console.error("Failed to load product detail:", e);
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) {
      loadProduct();
      window.scrollTo(0, 0);
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-[#F7F7F7] animate-pulse rounded-2xl border border-[#EAEAEA]" />
          <div className="space-y-6">
            <div className="h-9 bg-[#F7F7F7] animate-pulse rounded-lg w-3/4" />
            <div className="h-5 bg-[#F7F7F7] animate-pulse rounded-lg w-1/2" />
            <div className="h-32 bg-[#F7F7F7] animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="text-2xl font-bold text-[#111111]">Equipment Currently Unavailable</h2>
        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
          The requested medical device could not be found or belongs to a category that is temporarily inactive for online customer access during this catalogue phase. All institutional records remain preserved in our central system.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link to="/" className="inline-block px-7 py-3 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-black transition-colors">
            Explore Active Categories
          </Link>
          <Link to="/request-quote" className="inline-block px-6 py-3 bg-white border border-neutral-300 text-neutral-900 rounded-xl text-xs font-bold hover:bg-neutral-50 transition-colors">
            Request Institutional RFQ
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    addToCart(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity);
    navigate("/checkout");
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        productId: product.id,
        author: reviewAuthor,
        facility: reviewFacility,
        rating: reviewRating,
        comment: reviewComment
      };
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.review) {
        setReviews([data.review, ...reviews]);
        setShowReviewForm(false);
        setReviewSuccess(true);
        setReviewAuthor("");
        setReviewFacility("");
        setReviewComment("");
      }
    } catch (e) {
      console.error("Error submitting review:", e);
    }
  };

  const isSaved = isInWishlist(product.id);

  const productImages =
    product.images && product.images.length > 0
      ? product.images
      : ["https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80"];
  const productTitle = product.title || product.productName || "Medical Equipment";
  const productSpecs = product.technicalSpecifications || product.specifications || {};
  const productFeatures = product.features || product.keyFeatures || [];
  const productApplications = product.applications || [];
  const productPackage = product.packageContents || [];
  const productOverview = product.fullDescription || product.overview || product.shortDescription || "";
  const productCerts =
    product.certifications && product.certifications.length > 0
      ? product.certifications
      : ["ISO 13485:2016", "CE MARKED"];

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-8 flex-wrap">
          <Link to="/" className="hover:text-[#111111] transition-colors">Home</Link>
          <span>/</span>
          <Link to="/shop-all" className="hover:text-[#111111] transition-colors">Equipment</Link>
          <span>/</span>
          <Link to={`/shop-all?category=${product.category}`} className="hover:text-[#111111] capitalize transition-colors">
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-[#111111] font-semibold truncate max-w-xs sm:max-w-md">{productTitle}</span>
        </div>

        {/* Product Hero: Gallery + Buying Details */}
        <div className="bg-white rounded-2xl border border-[#EAEAEA] p-6 sm:p-10 shadow-2xs mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            {/* Gallery Column */}
            <div className="lg:col-span-6 space-y-4">
              <div className="aspect-square bg-[#F9F9F9] rounded-xl overflow-hidden border border-[#EAEAEA] relative group flex items-center justify-center p-6">
                <img
                  src={productImages[activeImageIndex] || productImages[0]}
                  alt={productTitle}
                  className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80";
                  }}
                />
                <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">
                  {productCerts.slice(0, 2).map((cert, cIdx) => (
                    <span
                      key={cIdx}
                      className="px-2.5 py-1 text-3xs font-extrabold uppercase bg-[#111111] text-white rounded-md tracking-wider shadow-xs"
                    >
                      {cert}
                    </span>
                  ))}
                </div>
              </div>

              {/* Multi-angle Thumbnails */}
              {productImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {productImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 p-1.5 bg-[#F9F9F9] ${
                        activeImageIndex === idx ? "border-[#111111] ring-1 ring-[#111111]" : "border-[#EAEAEA] opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        alt="Angle"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80";
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta & Purchase Column */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div className="space-y-5">
                {/* Meta Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-2xs uppercase tracking-wider font-semibold text-neutral-500">
                    <span className="text-[#111111] font-extrabold">{product.brand}</span>
                    <span>•</span>
                    <span className="font-mono text-neutral-400">SKU: {product.sku}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      isSaved ? "bg-rose-50 border-rose-200 text-rose-600" : "border-[#EAEAEA] text-neutral-600 hover:bg-[#F7F7F7]"
                    }`}
                  >
                    <Heart size={14} fill={isSaved ? "currentColor" : "none"} />
                    <span>{isSaved ? "Saved" : "Save"}</span>
                  </button>
                </div>

                <h1 className="text-xl sm:text-2.5xl font-black text-[#111111] tracking-tight leading-snug">
                  {product.title}
                </h1>

                {/* Rating summary */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex text-[#111111]">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < Math.floor(product.rating) ? "currentColor" : "none"}
                        className={i < Math.floor(product.rating) ? "text-[#111111]" : "text-neutral-200"}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-[#111111]">{product.rating}</span>
                  <span className="text-neutral-300">•</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("reviews")}
                    className="text-neutral-600 hover:text-[#1F7A4D] hover:underline font-medium transition-colors"
                  >
                    ({reviews.length || product.reviewCount} Verified Clinical Reviews)
                  </button>
                </div>

                {/* Pricing Box with Live Currency */}
                <div className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2.5xl sm:text-3xl font-black text-[#111111] font-mono">
                      {formatPrice(product.basePrice)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-neutral-400 line-through font-mono">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                    {((product.originalPrice && product.originalPrice > product.basePrice) || (product.discountPercentage && product.discountPercentage > 0)) && (
                      <span className="px-2.5 py-1 text-3xs font-extrabold uppercase bg-[#EAF5EF] text-[#145A38] rounded-md border border-[#1F7A4D]/20">
                        SAVE {product.discountPercentage || Math.round(((product.originalPrice! - product.basePrice) / product.originalPrice!) * 100)}%
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-2xs text-neutral-500 mt-3 pt-3 border-t border-[#EAEAEA]">
                    <div className="flex items-center gap-2 text-[#1F7A4D] font-semibold">
                      <span className="w-2 h-2 rounded-full bg-[#1F7A4D]" />
                      <span>In Stock ({product.stock} units ready for crating)</span>
                    </div>
                    <div className="text-neutral-400 font-mono">
                      Settlement in <strong>{currentCurrency}</strong>
                    </div>
                  </div>
                </div>

                {/* Short Description */}
                <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                  {product.shortDescription}
                </p>

                {/* Technical Highlights bullets */}
                <div className="space-y-2.5 py-1 text-xs text-neutral-700">
                  {productFeatures.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check size={15} className="text-[#1F7A4D] shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {/* Trust mini-grid */}
                <div className="grid grid-cols-3 gap-3 pt-2 text-center text-3xs font-semibold text-neutral-700">
                  <div className="p-3 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl">
                    <Truck size={16} className="mx-auto text-[#111111] mb-1.5" />
                    <span>{product.shippingLeadTime || "3–5 Days Air Freight"}</span>
                  </div>
                  <div className="p-3 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl">
                    <Award size={16} className="mx-auto text-[#111111] mb-1.5" />
                    <span>{product.warranty || "5-Year OEM Warranty"}</span>
                  </div>
                  <div className="p-3 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl">
                    <ShieldCheck size={16} className="mx-auto text-[#1F7A4D] mb-1.5" />
                    <span>9-Stage QC Tested</span>
                  </div>
                </div>
              </div>

              {/* Purchase Actions Block */}
              <div className="pt-6 border-t border-[#EAEAEA] space-y-3.5">
                <div className="flex items-center gap-3">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-[#EAEAEA] rounded-xl bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-3 text-neutral-600 hover:text-[#111111] hover:bg-[#F7F7F7] rounded-l-xl font-bold text-sm"
                    >
                      -
                    </button>
                    <span className="px-4 py-3 text-sm font-bold text-[#111111]">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-4 py-3 text-neutral-600 hover:text-[#111111] hover:bg-[#F7F7F7] rounded-r-xl font-bold text-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1 py-3.5 px-6 bg-[#111111] hover:bg-neutral-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
                  >
                    {isAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
                    <span>{isAdded ? "Added to Cart" : "Add to Cart"}</span>
                  </button>

                  {/* Buy Now */}
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="py-3.5 px-7 bg-[#1F7A4D] hover:bg-[#145A38] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors"
                  >
                    Buy Now
                  </button>
                </div>

                {/* Institutional Quote CTA */}
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(true)}
                  className="w-full py-3.5 bg-[#FAFAFA] hover:bg-neutral-100 text-[#111111] border border-[#EAEAEA] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Building size={16} className="text-[#111111]" />
                  <span>Request Institutional B2B Quote / Tender Pricing</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Structured Tabs Section */}
        <div className="bg-white rounded-2xl border border-[#EAEAEA] p-6 sm:p-10 shadow-2xs mb-14">
          {/* Tab Navigation */}
          <div className="flex border-b border-[#EAEAEA] overflow-x-auto gap-2 pb-3 mb-8">
            <button
              onClick={() => setActiveTab("specs")}
              className={`px-5 py-2.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "specs"
                  ? "bg-[#111111] text-white"
                  : "text-neutral-600 hover:text-[#111111] hover:bg-[#F7F7F7]"
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-5 py-2.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "overview"
                  ? "bg-[#111111] text-white"
                  : "text-neutral-600 hover:text-[#111111] hover:bg-[#F7F7F7]"
              }`}
            >
              Clinical Overview
            </button>
            <button
              onClick={() => setActiveTab("applications")}
              className={`px-5 py-2.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "applications"
                  ? "bg-[#111111] text-white"
                  : "text-neutral-600 hover:text-[#111111] hover:bg-[#F7F7F7]"
              }`}
            >
              Clinical Applications
            </button>
            <button
              onClick={() => setActiveTab("package")}
              className={`px-5 py-2.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "package"
                  ? "bg-[#111111] text-white"
                  : "text-neutral-600 hover:text-[#111111] hover:bg-[#F7F7F7]"
              }`}
            >
              Package Contents
            </button>
            <button
              onClick={() => setActiveTab("warranty")}
              className={`px-5 py-2.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "warranty"
                  ? "bg-[#111111] text-white"
                  : "text-neutral-600 hover:text-[#111111] hover:bg-[#F7F7F7]"
              }`}
            >
              Quality & Warranty
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-5 py-2.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "reviews"
                  ? "bg-[#111111] text-white"
                  : "text-neutral-600 hover:text-[#111111] hover:bg-[#F7F7F7]"
              }`}
            >
              Reviews ({reviews.length})
            </button>
          </div>

          {/* Tab 1: Structured Technical Specifications Table */}
          {activeTab === "specs" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#111111]">
                  Engineering & Technical Specifications Table
                </h3>
                <button
                  type="button"
                  onClick={() => alert("Downloading official technical datasheet PDF (Simulated).")}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#111111] hover:text-[#1F7A4D] transition-colors"
                >
                  <Download size={14} />
                  <span>Download Spec Sheet (PDF)</span>
                </button>
              </div>

              <div className="border border-[#EAEAEA] rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAFA] border-b border-[#EAEAEA] text-neutral-700 font-bold uppercase tracking-wider text-3xs">
                      <th className="p-4 w-1/3">Technical Parameter</th>
                      <th className="p-4">Factory Verified Specification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EAEAEA] font-medium text-neutral-700">
                    {Object.entries(productSpecs).length > 0 ? (
                      Object.entries(productSpecs).map(([key, val], idx) => (
                        <tr key={key} className={idx % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}>
                          <td className="p-4 font-bold text-[#111111]">{key}</td>
                          <td className="p-4 font-mono text-neutral-800">{String(val)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="p-6 text-center text-neutral-400">
                          Contact DR.MEDEX engineering team for detailed technical specification documentation.
                        </td>
                      </tr>
                    )}
                    <tr className="bg-[#FAFAFA]">
                      <td className="p-4 font-bold text-[#111111]">Power Supply Requirements</td>
                      <td className="p-4 font-mono text-neutral-800">{product.powerRequirements || "Universal 100–240V AC"}</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-[#111111]">Manufacturing Quality Standard</td>
                      <td className="p-4 font-mono text-neutral-800">ISO 13485:2016 / CE Medical Device Directive</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-[#111111]">Clinical Overview & Purpose</h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-3xl whitespace-pre-line">
                {productOverview}
              </p>

              {productFeatures.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-4">
                    Comprehensive Feature Set
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-neutral-700">
                    {productFeatures.map((f, i) => (
                      <div key={i} className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl flex items-start gap-3">
                        <Check size={16} className="text-[#1F7A4D] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Applications */}
          {activeTab === "applications" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-[#111111]">Clinical Indications & Surgical Procedures</h3>
              <p className="text-xs text-neutral-500">
                Validated for hospital departments, outpatient surgical centers, and physical rehabilitation wards:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {productApplications.length > 0 ? (
                  productApplications.map((app, idx) => (
                    <div key={idx} className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] flex items-center gap-3.5">
                      <div className="w-7 h-7 rounded-full bg-white border border-[#EAEAEA] text-[#111111] flex items-center justify-center font-bold text-3xs shrink-0 shadow-2xs">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-neutral-800">{app}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-xs text-neutral-400">General hospital and clinic installations.</div>
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Package Contents */}
          {activeTab === "package" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-[#111111]">Standard Included Package & Accessories</h3>
              <p className="text-xs text-neutral-500">
                Every unit arrives sealed in export wooden crating with all standard sterilizable accessories:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {productPackage.map((item, idx) => (
                  <div key={idx} className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] flex items-start gap-3">
                    <Package size={16} className="text-[#111111] shrink-0 mt-0.5" />
                    <span className="font-medium text-neutral-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Warranty & Logistics */}
          {activeTab === "warranty" && (
            <div className="space-y-6 animate-in fade-in duration-200 text-xs text-neutral-700">
              <h3 className="text-base font-bold text-[#111111]">Quality, Warranty & Export Crating</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-2.5">
                  <Award size={20} className="text-[#111111]" />
                  <div className="font-bold text-[#111111]">5-Year OEM Warranty</div>
                  <p className="text-neutral-500 text-2xs leading-relaxed">
                    Direct coverage on LED arrays, motors, generators, and chassis components with rapid air shipment of genuine replacement assemblies.
                  </p>
                </div>
                <div className="p-5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-2.5">
                  <ShieldCheck size={20} className="text-[#1F7A4D]" />
                  <div className="font-bold text-[#111111]">ISO 13485:2016 Compliant</div>
                  <p className="text-neutral-500 text-2xs leading-relaxed">
                    Manufactured under international medical device standards with complete batch traceability and test certificates included in crate.
                  </p>
                </div>
                <div className="p-5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-2.5">
                  <Truck size={20} className="text-[#111111]" />
                  <div className="font-bold text-[#111111]">Shockproof Export Crate</div>
                  <p className="text-neutral-500 text-2xs leading-relaxed">
                    Custom molded foam lining inside heat-treated ISPM-15 export wooden crates protects delicate optical and electronic circuits during air cargo.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab 6: Reviews */}
          {activeTab === "reviews" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[#111111]">Verified Clinical Reviews</h3>
                  <p className="text-xs text-neutral-500">From healthcare facilities and practicing biomedical teams.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-5 py-2.5 bg-[#111111] text-white rounded-xl text-xs font-bold hover:bg-[#1F7A4D] transition-colors"
                >
                  Write a Review
                </button>
              </div>

              {reviewSuccess && (
                <div className="p-3.5 bg-[#EAF5EF] border border-[#1F7A4D]/20 rounded-xl text-xs text-[#145A38] font-semibold">
                  Thank you! Your verified review has been recorded.
                </div>
              )}

              {/* Review submission form */}
              {showReviewForm && (
                <form onSubmit={handleReviewSubmit} className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl space-y-4 text-xs">
                  <h4 className="font-bold text-[#111111]">Submit Practitioner Review</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1.5">Your Name & Title *</label>
                      <input
                        type="text"
                        required
                        value={reviewAuthor}
                        onChange={(e) => setReviewAuthor(e.target.value)}
                        placeholder="e.g. Dr. Sarah Jenkins"
                        className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1.5">Hospital / Clinic *</label>
                      <input
                        type="text"
                        required
                        value={reviewFacility}
                        onChange={(e) => setReviewFacility(e.target.value)}
                        placeholder="e.g. Memorial Hospital, London"
                        className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1.5">Rating</label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                      >
                        <option value={5}>5 Stars (Excellent)</option>
                        <option value={4}>4 Stars (Very Good)</option>
                        <option value={3}>3 Stars (Satisfactory)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Clinical Experience Feedback *</label>
                    <textarea
                      rows={3}
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Comment on equipment reliability, optics, precision, or clinic usability..."
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-5 py-2.5 border border-[#EAEAEA] rounded-lg text-neutral-600 hover:bg-[#F7F7F7]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#111111] hover:bg-[#1F7A4D] text-white font-bold rounded-lg transition-colors"
                    >
                      Post Review
                    </button>
                  </div>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-xs text-neutral-500">No customer reviews yet. Be the first to review this equipment.</p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-[#111111]">{rev.author}</span>
                          <span className="text-3xs text-neutral-500 ml-2 font-medium">({rev.facility})</span>
                        </div>
                        <span className="text-3xs text-neutral-400">{rev.date}</span>
                      </div>
                      <div className="flex text-[#111111]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={13} fill={i < rev.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                      <p className="text-xs text-neutral-600 italic leading-relaxed">"{rev.comment}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Related Medical Equipment */}
        {relatedProducts.length > 0 && (
          <div className="mb-14">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-[#111111] tracking-tight">
                Complementary & Related Medical Equipment
              </h3>
              <Link to={`/shop-all?category=${product.category}`} className="text-xs font-bold text-[#111111] hover:text-[#1F7A4D] transition-colors">
                View Category →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} onOpenQuote={() => setIsQuoteModalOpen(true)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* B2B Quote Modal */}
      <B2BQuoteModal
        product={product}
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
      />
    </div>
  );
};
