import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Award,
  Truck,
  FileText,
  ShoppingCart,
  Zap,
  Heart,
  Check,
  Star,
  ChevronRight,
  Download,
  Share2,
  Clock,
  Package,
  Wrench,
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
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="aspect-square bg-slate-200 animate-pulse rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-200 animate-pulse rounded-lg w-3/4" />
            <div className="h-4 bg-slate-200 animate-pulse rounded-lg w-1/2" />
            <div className="h-24 bg-slate-200 animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Medical Product Not Found</h2>
        <p className="text-xs text-slate-500">The requested equipment model or SKU could not be located in our clinical database.</p>
        <Link to="/shop-all" className="inline-block px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold">
          Browse Full Catalog
        </Link>
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

  return (
    <div className="w-full bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-6 flex-wrap">
          <Link to="/" className="hover:text-slate-700">Home</Link>
          <span>/</span>
          <Link to="/shop-all" className="hover:text-slate-700">Equipment</Link>
          <span>/</span>
          <Link to={`/shop-all?category=${product.category}`} className="hover:text-slate-700 capitalize">
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-slate-800 font-semibold truncate max-w-xs sm:max-w-md">{product.title}</span>
        </div>

        {/* Product Hero: Gallery + Buying Details */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Gallery Column */}
            <div className="lg:col-span-6 space-y-4">
              <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 relative group">
                <img
                  src={product.images[activeImageIndex] || product.images[0]}
                  alt={product.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 cursor-zoom-in"
                />
                <div className="absolute top-4 left-4 flex flex-col gap-1.5 pointer-events-none">
                  <span className="px-2.5 py-1 text-3xs font-extrabold uppercase bg-sky-900 text-white rounded-md tracking-wider shadow-sm">
                    ISO 13485:2016
                  </span>
                  <span className="px-2.5 py-1 text-3xs font-extrabold uppercase bg-emerald-700 text-white rounded-md tracking-wider shadow-sm">
                    CE MARKED
                  </span>
                </div>
              </div>

              {/* Multi-angle Thumbnails */}
              {product.images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-18 h-18 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activeImageIndex === idx ? "border-sky-600 ring-2 ring-sky-100" : "border-slate-200 opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt="Angle" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Meta & Purchase Column */}
            <div className="lg:col-span-6 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Meta Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-2xs uppercase tracking-wider font-semibold text-slate-500">
                    <span className="text-sky-700 font-extrabold">{product.brand}</span>
                    <span>•</span>
                    <span className="font-mono">SKU: {product.sku}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleWishlist(product)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border transition-colors ${
                      isSaved ? "bg-rose-50 border-rose-200 text-rose-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    <Heart size={14} fill={isSaved ? "currentColor" : "none"} />
                    <span>{isSaved ? "Saved" : "Save"}</span>
                  </button>
                </div>

                <h1 className="text-xl sm:text-2.5xl font-black text-slate-900 tracking-tight leading-snug">
                  {product.title}
                </h1>

                {/* Rating summary */}
                <div className="flex items-center gap-2 text-amber-500 text-xs">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        fill={i < Math.floor(product.rating) ? "currentColor" : "none"}
                        className={i < Math.floor(product.rating) ? "text-amber-400" : "text-slate-200"}
                      />
                    ))}
                  </div>
                  <span className="font-bold text-slate-800">{product.rating}</span>
                  <span className="text-slate-400">•</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("reviews")}
                    className="text-sky-700 hover:underline font-medium"
                  >
                    ({reviews.length || product.reviewCount} Verified Clinical Reviews)
                  </button>
                </div>

                {/* Pricing Box with Live Currency */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2.5xl sm:text-3xl font-black text-slate-900 font-mono">
                      {formatPrice(product.basePrice)}
                    </span>
                    {product.originalPrice && (
                      <span className="text-sm text-slate-400 line-through font-mono">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                    <span className="px-2 py-0.5 text-3xs font-extrabold uppercase bg-emerald-100 text-emerald-800 rounded-md">
                      SAVE {Math.round(((product.originalPrice! - product.basePrice) / product.originalPrice!) * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-2xs text-slate-500 mt-2 pt-2 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>In Stock ({product.stock} units ready for crating)</span>
                    </div>
                    <div className="text-slate-400 font-mono">
                      Settlement in <strong>{currentCurrency}</strong>
                    </div>
                  </div>
                </div>

                {/* Short Description */}
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {product.shortDescription}
                </p>

                {/* Technical Highlights bullets */}
                <div className="space-y-2 py-1 text-xs text-slate-700">
                  {product.features.slice(0, 4).map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check size={15} className="text-sky-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>

                {/* Trust mini-grid */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center text-3xs font-semibold text-slate-600">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <Truck size={16} className="mx-auto text-sky-700 mb-1" />
                    <span>{product.shippingLeadTime || "3–5 Days Air Freight"}</span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <Award size={16} className="mx-auto text-sky-700 mb-1" />
                    <span>{product.warranty || "5-Year OEM Warranty"}</span>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <ShieldCheck size={16} className="mx-auto text-sky-700 mb-1" />
                    <span>9-Stage QC Tested</span>
                  </div>
                </div>
              </div>

              {/* Purchase Actions Block */}
              <div className="pt-6 border-t border-slate-200 space-y-3">
                <div className="flex items-center gap-3">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-slate-300 rounded-xl bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3.5 py-3 text-slate-600 hover:bg-slate-200 rounded-l-xl font-bold text-sm"
                    >
                      -
                    </button>
                    <span className="px-4 py-3 text-sm font-bold text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-3.5 py-3 text-slate-600 hover:bg-slate-200 rounded-r-xl font-bold text-sm"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1 py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    {isAdded ? <Check size={18} /> : <ShoppingCart size={18} />}
                    <span>{isAdded ? "Added to Cart" : "Add to Cart"}</span>
                  </button>

                  {/* Buy Now */}
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="py-3.5 px-6 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors"
                  >
                    Buy Now
                  </button>
                </div>

                {/* Institutional Quote CTA */}
                <button
                  type="button"
                  onClick={() => setIsQuoteModalOpen(true)}
                  className="w-full py-3 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Building size={16} className="text-sky-700" />
                  <span>Request Institutional B2B Quote / Tender Pricing</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Structured Tabs Section */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-12">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pb-2 mb-6">
            <button
              onClick={() => setActiveTab("specs")}
              className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "specs"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Technical Specifications
            </button>
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "overview"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Clinical Overview
            </button>
            <button
              onClick={() => setActiveTab("applications")}
              className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "applications"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Clinical Applications
            </button>
            <button
              onClick={() => setActiveTab("package")}
              className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "package"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Package Contents
            </button>
            <button
              onClick={() => setActiveTab("warranty")}
              className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "warranty"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Quality & Warranty
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`px-4 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === "reviews"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Reviews ({reviews.length})
            </button>
          </div>

          {/* Tab 1: Structured Technical Specifications Table */}
          {activeTab === "specs" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Engineering & Technical Specifications Table
                </h3>
                <button
                  type="button"
                  onClick={() => alert("Downloading official technical datasheet PDF (Simulated).")}
                  className="flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900"
                >
                  <Download size={14} />
                  <span>Download Spec Sheet (PDF)</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-3xs">
                      <th className="p-3.5 w-1/3">Technical Parameter</th>
                      <th className="p-3.5">Factory Verified Specification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {Object.entries(product.specifications).map(([key, val], idx) => (
                      <tr key={key} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                        <td className="p-3.5 font-bold text-slate-900">{key}</td>
                        <td className="p-3.5 font-mono text-slate-800">{val}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50/50">
                      <td className="p-3.5 font-bold text-slate-900">Power Supply Requirements</td>
                      <td className="p-3.5 font-mono text-slate-800">{product.powerRequirements || "Universal 100–240V AC"}</td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-slate-900">Manufacturing Quality Standard</td>
                      <td className="p-3.5 font-mono text-slate-800">ISO 13485:2016 / CE Medical Device Directive</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-slate-900">Clinical Overview & Purpose</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
                {product.overview}
              </p>

              <div className="mt-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Comprehensive Feature Set
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                  {product.features.map((f, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-2.5">
                      <Check size={16} className="text-sky-600 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Applications */}
          {activeTab === "applications" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-slate-900">Clinical Indications & Surgical Procedures</h3>
              <p className="text-xs text-slate-500">
                Validated for hospital departments, outpatient surgical centers, and physical rehabilitation wards:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {product.applications.map((app, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-3xs shrink-0">
                      {idx + 1}
                    </div>
                    <span className="font-semibold text-slate-800">{app}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Package Contents */}
          {activeTab === "package" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <h3 className="text-base font-bold text-slate-900">Standard Included Package & Accessories</h3>
              <p className="text-xs text-slate-500">
                Every unit arrives sealed in export wooden crating with all standard sterilizable accessories:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {product.packageContents.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <Package size={16} className="text-sky-600 shrink-0 mt-0.5" />
                    <span className="font-medium text-slate-800">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: Warranty & Logistics */}
          {activeTab === "warranty" && (
            <div className="space-y-6 animate-in fade-in duration-200 text-xs text-slate-700">
              <h3 className="text-base font-bold text-slate-900">Quality, Warranty & Export Crating</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <Award size={20} className="text-sky-700" />
                  <div className="font-bold text-slate-900">5-Year OEM Warranty</div>
                  <p className="text-slate-500 text-2xs leading-relaxed">
                    Direct coverage on LED arrays, motors, generators, and chassis components with rapid air shipment of genuine replacement assemblies.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <ShieldCheck size={20} className="text-sky-700" />
                  <div className="font-bold text-slate-900">ISO 13485:2016 Compliant</div>
                  <p className="text-slate-500 text-2xs leading-relaxed">
                    Manufactured under international medical device standards with complete batch traceability and test certificates included in crate.
                  </p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <Truck size={20} className="text-sky-700" />
                  <div className="font-bold text-slate-900">Shockproof Export Crate</div>
                  <p className="text-slate-500 text-2xs leading-relaxed">
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
                  <h3 className="text-base font-bold text-slate-900">Verified Clinical Reviews</h3>
                  <p className="text-xs text-slate-500">From healthcare facilities and practicing biomedical teams.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-sky-800 transition-colors"
                >
                  Write a Review
                </button>
              </div>

              {reviewSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
                  Thank you! Your verified review has been recorded.
                </div>
              )}

              {/* Review submission form */}
              {showReviewForm && (
                <form onSubmit={handleReviewSubmit} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-xs">
                  <h4 className="font-bold text-slate-900">Submit Practitioner Review</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Your Name & Title *</label>
                      <input
                        type="text"
                        required
                        value={reviewAuthor}
                        onChange={(e) => setReviewAuthor(e.target.value)}
                        placeholder="e.g. Dr. Sarah Jenkins"
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Hospital / Clinic *</label>
                      <input
                        type="text"
                        required
                        value={reviewFacility}
                        onChange={(e) => setReviewFacility(e.target.value)}
                        placeholder="e.g. Memorial Hospital, London"
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Rating</label>
                      <select
                        value={reviewRating}
                        onChange={(e) => setReviewRating(Number(e.target.value))}
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value={5}>5 Stars (Excellent)</option>
                        <option value={4}>4 Stars (Very Good)</option>
                        <option value={3}>3 Stars (Satisfactory)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Clinical Experience Feedback *</label>
                    <textarea
                      rows={3}
                      required
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Comment on equipment reliability, optics, precision, or clinic usability..."
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg"
                    >
                      Post Review
                    </button>
                  </div>
                </form>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <p className="text-xs text-slate-500">No customer reviews yet. Be the first to review this equipment.</p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-slate-900">{rev.author}</span>
                          <span className="text-3xs text-slate-500 ml-2 font-medium">({rev.facility})</span>
                        </div>
                        <span className="text-3xs text-slate-400">{rev.date}</span>
                      </div>
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={13} fill={i < rev.rating ? "currentColor" : "none"} />
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 italic leading-relaxed">"{rev.comment}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Related Medical Equipment */}
        {relatedProducts.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Complementary & Related Medical Equipment
              </h3>
              <Link to={`/shop-all?category=${product.category}`} className="text-xs font-bold text-sky-700 hover:underline">
                View Category →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
