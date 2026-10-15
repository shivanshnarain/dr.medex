import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useParams, Link, useNavigate } from "react-router-dom";
import { Filter, SlidersHorizontal, X, Search, RotateCcw, AlertCircle, ArrowRight, RefreshCw } from "lucide-react";
import { Product, Category } from "../types";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import { B2BQuoteModal } from "../components/B2BQuoteModal";
import { useCurrency } from "../context/CurrencyContext";
import { getProducts, getCategories } from "../services/productService";

export const ShopPage: React.FC = () => {
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentCurrency, currentCountry, formatPrice } = useCurrency();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Modals
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Active filters from URL or local state
  const rawCategory = categorySlug || searchParams.get("category") || "";
  const isPhysioInactiveRequested = rawCategory === "physiotherapy";
  const selectedCategory = isPhysioInactiveRequested ? "" : rawCategory;
  const selectedSubcategory = searchParams.get("subcategory") || "";
  const searchQuery = searchParams.get("search") || "";
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [maxPriceINR, setMaxPriceINR] = useState<number>(700000);

  const handleOpenQuote = (prod: Product) => {
    setQuoteProduct(prod);
    setIsQuoteModalOpen(true);
  };

  // Load products & categories via resilient product service
  const loadData = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        getProducts(),
        getCategories()
      ]);

      setProducts(prodRes.products);
      setCategories(catRes.categories);

      if (prodRes.products.length === 0) {
        setApiError("No product catalog records are currently available.");
      }
    } catch (e: any) {
      console.error("Error loading shop data:", e);
      setApiError("Unable to establish connection with medical catalog service.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reconcile stale subcategory filter when switching category
  useEffect(() => {
    if (selectedCategory && selectedSubcategory && categories.length > 0) {
      const activeCat = categories.find(
        (c) => c.slug === selectedCategory || c.id === selectedCategory
      );
      if (activeCat) {
        const subcategoryBelongs = activeCat.subcategories.some(
          (s) => s.slug === selectedSubcategory || s.id === selectedSubcategory
        );
        if (!subcategoryBelongs) {
          const params = new URLSearchParams(searchParams);
          params.delete("subcategory");
          setSearchParams(params, { replace: true });
        }
      }
    }
  }, [selectedCategory, selectedSubcategory, categories, searchParams, setSearchParams]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory) {
      const activeCat = categories.find(
        (c) => c.slug === selectedCategory || c.id === selectedCategory
      );
      const catId = activeCat ? activeCat.id : selectedCategory;
      const catSlug = activeCat ? activeCat.slug : selectedCategory;
      list = list.filter((p) => p.category === catId || p.category === catSlug);
    }

    if (selectedSubcategory) {
      const directMatches = list.filter((p) => p.subcategory === selectedSubcategory);
      if (directMatches.length > 0) {
        list = directMatches;
      } else {
        const cleanSub = selectedSubcategory.replace(/-/g, " ").toLowerCase();
        const subTokens = cleanSub
          .split(/\s+/)
          .filter(
            (w) =>
              w.length > 2 &&
              !["equipment", "machines", "systems", "medical", "surgical"].includes(w)
          );
        const fuzzyMatches = list.filter((p) => {
          const pSub = (p.subcategory || "").replace(/-/g, " ").toLowerCase();
          const pTitle = (p.title || "").toLowerCase();
          return subTokens.some((t) => pSub.includes(t) || pTitle.includes(t));
        });
        if (fuzzyMatches.length > 0) {
          list = fuzzyMatches;
        }
      }
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.shortDescription.toLowerCase().includes(q) ||
          (p.applications && p.applications.some((a) => a.toLowerCase().includes(q)))
      );
    }
    if (selectedRating) {
      list = list.filter((p) => p.rating >= selectedRating);
    }
    if (onlyInStock) {
      list = list.filter((p) => p.stock > 0);
    }
    if (maxPriceINR < 700000) {
      list = list.filter((p) => p.basePrice <= maxPriceINR);
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        list.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case "price-high":
        list.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        list.sort((a, b) => b.id.localeCompare(a.id));
        break;
      case "best-seller":
        list.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
        break;
      default:
        // featured default
        break;
    }

    return list;
  }, [products, selectedCategory, selectedSubcategory, searchQuery, selectedRating, onlyInStock, maxPriceINR, sortBy, categories]);

  const handleCategoryClick = (catSlug: string) => {
    if (selectedCategory === catSlug) {
      navigate("/shop-all");
    } else {
      navigate(`/category/${catSlug}`);
    }
  };

  const handleSubcategoryClick = (subSlug: string) => {
    const params = new URLSearchParams(searchParams);
    if (selectedSubcategory === subSlug) {
      params.delete("subcategory");
    } else {
      params.set("subcategory", subSlug);
    }
    setSearchParams(params);
  };

  const handleResetFilters = () => {
    setSelectedRating(null);
    setOnlyInStock(false);
    setMaxPriceINR(700000);
    setSortBy("featured");
    navigate("/shop-all");
  };

  const activeCategoryObject = categories.find((c) => c.slug === selectedCategory);

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb & Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-3">
            <Link to="/" className="hover:text-[#111111] transition-colors">Home</Link>
            <span>/</span>
            <span className="text-[#111111] font-semibold">
              {activeCategoryObject ? activeCategoryObject.name : "Shop All Equipment"}
            </span>
            {selectedSubcategory && (
              <>
                <span>/</span>
                <span className="text-[#1F7A4D] font-semibold">{selectedSubcategory}</span>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3.5xl font-black text-[#111111] tracking-tight">
                {activeCategoryObject ? activeCategoryObject.name : "Medical Equipment & Technology"}
              </h1>
              <p className="text-xs text-neutral-500 mt-1.5">
                Showing {filteredProducts.length} certified medical units in <strong>{currentCountry.name} ({currentCurrency})</strong>
              </p>
            </div>

            {/* Top Toolbar */}
            <div className="flex items-center gap-3">
              {/* Mobile Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold text-[#111111] shadow-2xs"
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
              </button>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-white border border-[#EAEAEA] rounded-xl px-3.5 py-2 shadow-2xs">
                <span className="text-2xs font-bold uppercase text-neutral-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs font-semibold text-[#111111] bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value="featured">Featured Standards</option>
                  <option value="best-seller">Best Selling</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Clinical Rating</option>
                  <option value="newest">Newest Additions</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {isPhysioInactiveRequested && (
          <div className="mb-10 p-8 bg-white border border-[#E8E8E8] rounded-2xl shadow-sm">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-3xs font-bold uppercase tracking-wider bg-neutral-100 text-neutral-800 border border-neutral-300 mb-4">
                <span>Catalogue Status: Temporarily Inactive</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#111111]">
                Physiotherapy Machines Category Temporarily Inactive
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                The Physiotherapy Machines equipment catalogue is temporarily inactive for customer-facing online browsing during this phase. All product specifications, clinical assets, and institutional pricing records remain safely preserved in our central medical system.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/"
                  className="px-5 py-2.5 bg-[#111111] hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <span>Explore 6 Active Categories</span>
                  <ArrowRight size={14} className="text-[#167A4A]" />
                </Link>
                <Link
                  to="/request-quote"
                  className="px-5 py-2.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-900 text-xs font-bold rounded-lg transition-colors"
                >
                  <span>Institutional Procurement Inquiry</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Sidebar Desktop Filters */}
          <aside className="hidden lg:block space-y-6">
            <div className="bg-white p-6 rounded-xl border border-[#EAEAEA] shadow-2xs space-y-6 sticky top-24">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEAEA]">
                <span className="text-xs font-bold text-[#111111] uppercase tracking-wider flex items-center gap-2">
                  <Filter size={14} className="text-[#1F7A4D]" />
                  Filter Equipment
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-3xs text-neutral-500 hover:text-[#111111] font-bold flex items-center gap-1 transition-colors"
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              </div>

              {/* Categories Accordion */}
              <div>
                <h4 className="text-2xs font-extrabold text-neutral-400 uppercase tracking-wider mb-3">
                  Categories
                </h4>
                <div className="space-y-1.5">
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      <button
                        type="button"
                        onClick={() => handleCategoryClick(cat.slug)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                          selectedCategory === cat.slug
                            ? "bg-[#111111] text-white font-bold"
                            : "text-neutral-700 hover:bg-[#F7F7F7]"
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className={`text-3xs font-mono ${selectedCategory === cat.slug ? "text-neutral-300" : "text-neutral-400"}`}>
                          {cat.subcategories.length}
                        </span>
                      </button>

                      {/* Subcategories (if category active) */}
                      {selectedCategory === cat.slug && (
                        <div className="pl-3 pr-1 py-1.5 space-y-1">
                          {cat.subcategories.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleSubcategoryClick(sub.slug)}
                              className={`w-full text-left text-2xs py-1.5 px-2.5 rounded-md transition-colors ${
                                selectedSubcategory === sub.slug
                                  ? "bg-[#EAF5EF] text-[#145A38] font-bold border border-[#1F7A4D]/20"
                                  : "text-neutral-600 hover:text-[#111111]"
                              }`}
                            >
                              • {sub.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range Slider in Active Currency */}
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <h4 className="text-2xs font-extrabold text-neutral-400 uppercase tracking-wider">
                    Maximum Budget
                  </h4>
                  <span className="text-xs font-bold text-[#111111] font-mono">
                    {formatPrice(maxPriceINR)}
                  </span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="700000"
                  step="10000"
                  value={maxPriceINR}
                  onChange={(e) => setMaxPriceINR(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#EAEAEA] rounded-lg appearance-none cursor-pointer accent-[#111111]"
                />
                <div className="flex justify-between text-3xs text-neutral-400 font-mono mt-1.5">
                  <span>{formatPrice(5000)}</span>
                  <span>{formatPrice(700000)}</span>
                </div>
              </div>

              {/* Availability & Rating */}
              <div className="space-y-4 pt-4 border-t border-[#EAEAEA]">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-700">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-[#EAEAEA] text-[#111111] focus:ring-[#111111]"
                  />
                  <span>Show Only In-Stock Equipment</span>
                </label>

                <div>
                  <h4 className="text-2xs font-extrabold text-neutral-400 uppercase tracking-wider mb-2">
                    Minimum Rating
                  </h4>
                  <div className="flex gap-2">
                    {[4, 4.5, 4.8].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRating(selectedRating === r ? null : r)}
                        className={`px-3 py-1.5 text-2xs rounded-md border font-semibold transition-all ${
                          selectedRating === r
                            ? "bg-[#111111] border-[#111111] text-white"
                            : "border-[#EAEAEA] text-neutral-600 hover:bg-[#F7F7F7]"
                        }`}
                      >
                        ★ {r}+
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Institutional Tender Notice */}
              <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-[#111111]">Hospital Procurement</div>
                <p className="text-3xs text-neutral-500 leading-relaxed">
                  Need customized clinical tender specifications, CIF air freight pricing, or bulk discounts?
                </p>
                <Link
                  to="/request-quote"
                  className="inline-block text-3xs font-bold text-[#111111] hover:text-[#1F7A4D] hover:underline pt-1 transition-colors"
                >
                  Submit Official RFQ →
                </Link>
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-80 bg-white rounded-xl animate-pulse border border-[#EAEAEA]" />
                ))}
              </div>
            ) : apiError && products.length === 0 ? (
              <div className="bg-white rounded-xl border border-red-200 p-16 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full border border-red-200 flex items-center justify-center mx-auto">
                  <AlertCircle size={28} />
                </div>
                <h3 className="text-base font-bold text-[#111111]">Catalogue Service Unavailable</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  {apiError}
                </p>
                <button
                  type="button"
                  onClick={loadData}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#167A4A] hover:bg-[#13673e] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>Retry Connection</span>
                </button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#EAEAEA] p-16 text-center space-y-4">
                <div className="w-16 h-16 bg-[#FAFAFA] rounded-full border border-[#EAEAEA] flex items-center justify-center mx-auto text-neutral-400">
                  <Search size={24} />
                </div>
                <h3 className="text-base font-bold text-[#111111]">No medical devices match your criteria</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Try adjusting your category filter, increasing the price range, or searching for general terms like "cautery", "OT light", or "ultrasound".
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-6 py-2.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onQuickView={setQuickViewProduct}
                    onOpenQuote={handleOpenQuote}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Mobile Filters Slide-over */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden flex">
          <div
            onClick={() => setIsMobileFilterOpen(false)}
            className="fixed inset-0 bg-[#000000]/60 backdrop-blur-xs"
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEAEA]">
                <span className="font-bold text-[#111111] text-sm">Filter Equipment</span>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="text-neutral-400 hover:text-[#111111]"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Categories */}
              <div>
                <h4 className="text-2xs font-extrabold text-neutral-400 uppercase tracking-wider mb-2.5">Categories</h4>
                <div className="space-y-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        handleCategoryClick(cat.slug);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`w-full text-left text-xs py-2 px-3 rounded-lg transition-colors ${
                        selectedCategory === cat.slug ? "bg-[#111111] text-white font-bold" : "text-neutral-700 hover:bg-[#F7F7F7]"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EAEAEA]">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-3 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
        onOpenQuote={handleOpenQuote}
      />

      <B2BQuoteModal
        product={quoteProduct}
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
      />
    </div>
  );
};
