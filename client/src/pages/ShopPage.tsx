import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Filter, SlidersHorizontal, ChevronDown, Check, X, Search, RotateCcw } from "lucide-react";
import { Product, Category } from "../types";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import { B2BQuoteModal } from "../components/B2BQuoteModal";
import { useCurrency } from "../context/CurrencyContext";

export const ShopPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentCurrency, currentCountry, convertPrice, formatPrice } = useCurrency();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Modals
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  // Active filters from URL or local state
  const selectedCategory = searchParams.get("category") || "";
  const selectedSubcategory = searchParams.get("subcategory") || "";
  const searchQuery = searchParams.get("search") || "";
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState("featured");
  const [maxPriceUSD, setMaxPriceUSD] = useState<number>(7000);

  const handleOpenQuote = (prod: Product) => {
    setQuoteProduct(prod);
    setIsQuoteModalOpen(true);
  };

  // Load products & categories
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories")
        ]);

        if (prodRes.ok) {
          const pData = await prodRes.json();
          if (pData.success) setProducts(pData.products);
        }

        if (catRes.ok) {
          const cData = await catRes.json();
          if (cData.success) setCategories(cData.categories);
        }
      } catch (e) {
        console.error("Error loading shop data:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

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
      list = list.filter((p) => p.subcategory === selectedSubcategory);
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
    if (maxPriceUSD < 10000) {
      list = list.filter((p) => p.basePrice <= maxPriceUSD);
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
  }, [products, selectedCategory, selectedSubcategory, searchQuery, selectedRating, onlyInStock, maxPriceUSD, sortBy]);

  const handleCategoryClick = (catSlug: string) => {
    const params = new URLSearchParams(searchParams);
    if (selectedCategory === catSlug) {
      params.delete("category");
      params.delete("subcategory");
    } else {
      params.set("category", catSlug);
      params.delete("subcategory");
    }
    setSearchParams(params);
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
    setSearchParams(new URLSearchParams());
    setSelectedRating(null);
    setOnlyInStock(false);
    setMaxPriceUSD(7000);
    setSortBy("featured");
  };

  const activeCategoryObject = categories.find((c) => c.slug === selectedCategory);

  return (
    <div className="w-full bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb & Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Link to="/" className="hover:text-slate-700">Home</Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">
              {activeCategoryObject ? activeCategoryObject.name : "Shop All Equipment"}
            </span>
            {selectedSubcategory && (
              <>
                <span>/</span>
                <span className="text-sky-700 font-semibold">{selectedSubcategory}</span>
              </>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {activeCategoryObject ? activeCategoryObject.name : "Medical Equipment & Technology"}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Showing {filteredProducts.length} certified medical units in <strong>{currentCountry.name} ({currentCurrency})</strong>
              </p>
            </div>

            {/* Top Toolbar */}
            <div className="flex items-center gap-3">
              {/* Mobile Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs"
              >
                <SlidersHorizontal size={14} />
                <span>Filters</span>
              </button>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
                <span className="text-2xs font-bold uppercase text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
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

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Desktop Filters */}
          <aside className="hidden lg:block space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter size={14} className="text-sky-700" />
                  Filter Equipment
                </span>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-3xs text-sky-700 font-bold hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={11} />
                  Reset
                </button>
              </div>

              {/* Categories Accordion */}
              <div>
                <h4 className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
                  Categories
                </h4>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      <button
                        type="button"
                        onClick={() => handleCategoryClick(cat.slug)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                          selectedCategory === cat.slug
                            ? "bg-sky-50 text-sky-800 font-bold"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className="text-3xs font-mono text-slate-400">
                          {cat.subcategories.length}
                        </span>
                      </button>

                      {/* Subcategories (if category active) */}
                      {selectedCategory === cat.slug && (
                        <div className="pl-4 pr-1 py-1 space-y-1">
                          {cat.subcategories.map((sub) => (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => handleSubcategoryClick(sub.slug)}
                              className={`w-full text-left text-2xs py-1 px-2 rounded-md transition-colors ${
                                selectedSubcategory === sub.slug
                                  ? "bg-sky-100/70 text-sky-900 font-bold"
                                  : "text-slate-600 hover:text-sky-700"
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
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">
                    Maximum Budget
                  </h4>
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {formatPrice(maxPriceUSD)}
                  </span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="10000"
                  step="250"
                  value={maxPriceUSD}
                  onChange={(e) => setMaxPriceUSD(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-700"
                />
                <div className="flex justify-between text-3xs text-slate-400 font-mono mt-1">
                  <span>{formatPrice(100)}</span>
                  <span>{formatPrice(10000)}</span>
                </div>
              </div>

              {/* Availability & Rating */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="w-4 h-4 rounded-sm border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>Show Only In-Stock Equipment</span>
                </label>

                <div>
                  <h4 className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                    Minimum Rating
                  </h4>
                  <div className="flex gap-1.5">
                    {[4, 4.5, 4.8].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRating(selectedRating === r ? null : r)}
                        className={`px-2.5 py-1 text-2xs rounded-md border font-semibold ${
                          selectedRating === r
                            ? "bg-sky-50 border-sky-300 text-sky-800"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        ★ {r}+
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Institutional Tender Notice */}
              <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-sky-900">Hospital Procurement</div>
                <p className="text-3xs text-slate-600 leading-relaxed">
                  Need customized clinical tender specifications, CIF air freight pricing, or bulk discounts?
                </p>
                <Link
                  to="/request-quote"
                  className="inline-block text-3xs font-bold text-sky-700 hover:underline pt-0.5"
                >
                  Submit Official RFQ →
                </Link>
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <main className="lg:col-span-3">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-80 bg-white rounded-2xl animate-pulse border border-slate-200" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                  <Search size={24} />
                </div>
                <h3 className="text-base font-bold text-slate-800">No medical devices match your criteria</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try adjusting your category filter, increasing the price range, or searching for general terms like "cautery", "OT light", or "ultrasound".
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2 bg-slate-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full overflow-y-auto p-5 shadow-2xl flex flex-col justify-between">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-sm">Filter Equipment</span>
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="text-slate-400 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Categories */}
              <div>
                <h4 className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Categories</h4>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        handleCategoryClick(cat.slug);
                        setIsMobileFilterOpen(false);
                      }}
                      className={`w-full text-left text-xs py-1.5 px-2 rounded-lg ${
                        selectedCategory === cat.slug ? "bg-sky-50 text-sky-800 font-bold" : "text-slate-700"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
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
