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
  const selectedCategory = rawCategory;
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

    // Review-gated publishing rule: unreviewed products in physiotherapy remain unpublished from customer storefront
    list = list.filter((p) => {
      if (p.category === "physiotherapy" && p.reviewStatus !== "CORRECT") {
        return false;
      }
      return true;
    });

    if (selectedCategory) {
      const activeCat = categories.find(
        (c) => c.slug === selectedCategory || c.id === selectedCategory
      );
      const catId = activeCat ? activeCat.id : selectedCategory;
      const catSlug = activeCat ? activeCat.slug : selectedCategory;
      list = list.filter((p) => p.category === catId || p.category === catSlug);
    }

    if (selectedSubcategory) {
      const isSurgery =
        selectedSubcategory === "electrosurgical-surgery" ||
        selectedSubcategory === "electro-surgical-skin-cautery" ||
        selectedSubcategory === "cautery";
      const isGen =
        selectedSubcategory === "electrosurgical-generator" ||
        selectedSubcategory === "generators" ||
        selectedSubcategory === "electrosurgical-generators";

      list = list.filter((p) => {
        if (isSurgery) {
          return (
            p.subcategory === "electrosurgical-surgery" ||
            p.subcategory === "electro-surgical-skin-cautery" ||
            p.subcategory === "cautery"
          );
        }
        if (isGen) {
          return (
            p.subcategory === "electrosurgical-generator" ||
            p.subcategory === "generators" ||
            p.subcategory === "electrosurgical-generators"
          );
        }
        return (
          p.subcategory === selectedSubcategory ||
          p.subcategory === selectedSubcategory.replace(/-/g, " ") ||
          (Array.isArray(p.subcategories) && p.subcategories.includes(selectedSubcategory))
        );
      });
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
    // Only apply range & availability filters when on global shop-all (filters removed from category pages)
    if (!selectedCategory) {
      if (selectedRating) {
        list = list.filter((p) => p.rating >= selectedRating);
      }
      if (onlyInStock) {
        list = list.filter((p) => p.stock > 0);
      }
      if (maxPriceINR < 700000) {
        list = list.filter((p) => p.basePrice <= maxPriceINR);
      }
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
              {/* Mobile Filter Toggle Button (Only on generic Shop All, hidden on clean Category pages) */}
              {!selectedCategory && (
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-[#EAEAEA] rounded-xl text-xs font-bold text-[#111111] shadow-2xs"
                >
                  <SlidersHorizontal size={14} />
                  <span>Filters</span>
                </button>
              )}

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



        {/* Subcategory Navigation on Category Pages */}
        {activeCategoryObject && activeCategoryObject.subcategories && activeCategoryObject.subcategories.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.delete("subcategory");
                setSearchParams(params);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                !selectedSubcategory
                  ? "bg-[#111111] text-white"
                  : "bg-white text-neutral-700 hover:text-black hover:bg-neutral-50 border border-[#EAEAEA]"
              }`}
            >
              <span>All {activeCategoryObject.name.replace(/Equipment|Machines|Units/i, "").trim()}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${!selectedSubcategory ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                {products.filter(p => p.category === activeCategoryObject.slug || p.category === activeCategoryObject.id).length}
              </span>
            </button>
            {activeCategoryObject.subcategories.map((sub) => {
              const isSelected = selectedSubcategory === sub.slug || selectedSubcategory === sub.id;
              const subCount = products.filter(p => {
                const inCat = p.category === activeCategoryObject.slug || p.category === activeCategoryObject.id;
                if (!inCat) return false;
                if (sub.slug === "electrosurgical-surgery" || sub.slug === "electro-surgical-skin-cautery") {
                  return p.subcategory === "electrosurgical-surgery" || p.subcategory === "electro-surgical-skin-cautery" || p.subcategory === "cautery";
                }
                if (sub.slug === "electrosurgical-generator" || sub.slug === "generators") {
                  return p.subcategory === "electrosurgical-generator" || p.subcategory === "generators" || p.subcategory === "electrosurgical-generators";
                }
                return p.subcategory === sub.slug || p.subcategory === sub.id || (Array.isArray(p.subcategories) && p.subcategories.includes(sub.slug));
              }).length;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => handleSubcategoryClick(sub.slug)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                    isSelected
                      ? "bg-[#7AA05A] text-white"
                      : "bg-white text-neutral-700 hover:text-black hover:bg-neutral-50 border border-[#EAEAEA]"
                  }`}
                >
                  <span>{sub.name}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                    {subCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main Layout: Full-width for specific category listings (unwanted filters removed); 2-column sidebar for generic shop-all */}
        <div className={selectedCategory ? "w-full" : "grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-10"}>
          {/* Sidebar Desktop Filters - only displayed on generic /shop-all browse */}
          {!selectedCategory && (
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
          )}

          {/* Product Grid Area: Full width on category pages, 3 cols on shop-all */}
          <main className={selectedCategory ? "w-full" : "lg:col-span-3"}>
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
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
            ) : selectedCategory === "ot-lights" && !selectedSubcategory ? (
              <div className="space-y-12">
                {/* Quick Anchor Navigation */}
                <div className="p-4 bg-white rounded-xl border border-[#EAEAEA] shadow-2xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-400">
                      Sections:
                    </span>
                    {[
                      { id: "single-dome-ot-lights", slug: "single-dome-ot-lights", name: "Single Dome OT Lights" },
                      { id: "ot-surgical-lights-double-dome", slug: "ot-surgical-lights-double-dome", name: "Double Dome OT Lights" },
                      { id: "mobile-led-ot-lights", slug: "mobile-led-ot-lights", name: "Mobile OT Lights" }
                    ].map((sec) => {
                      const count = products.filter(
                        (p) => (p.category === "ot-lights" || p.category === "OT / Surgical Lights") && p.subcategory === sec.slug
                      ).length;
                      return (
                        <a
                          key={sec.id}
                          href={`#${sec.id}`}
                          className="px-3 py-1.5 rounded-lg bg-[#FAFAFA] hover:bg-[#111111] text-[#111111] hover:text-white border border-[#EAEAEA] text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{sec.name}</span>
                          <span className="text-3xs font-mono px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-800">
                            {count}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                  <div className="text-xs font-mono text-neutral-500">
                    <span className="font-bold text-[#111111]">
                      {products.filter((p) => p.category === "ot-lights" || p.category === "OT / Surgical Lights").length}
                    </span>{" "}
                    Total Products
                  </div>
                </div>

                {/* 3 Distinct Vertically Stacked Sections */}
                {[
                  {
                    id: "single-dome-ot-lights",
                    slug: "single-dome-ot-lights",
                    title: "Single Dome OT Lights",
                    description: "Ceiling and wall-mounted single dome shadowless surgical lighting systems engineered for focused operating theatre visibility."
                  },
                  {
                    id: "ot-surgical-lights-double-dome",
                    slug: "ot-surgical-lights-double-dome",
                    title: "Double Dome OT Lights",
                    description: "Dual-head and twin dome surgical illumination systems with balanced articulated suspension for advanced operating suites."
                  },
                  {
                    id: "mobile-led-ot-lights",
                    slug: "mobile-led-ot-lights",
                    title: "Mobile OT Lights",
                    description: "Floor-standing mobile LED operating theatre lights with smooth castors and optional emergency battery backup."
                  }
                ].map((sec) => {
                  const secProducts = filteredProducts.filter((p) => p.subcategory === sec.slug);
                  const dbTotal = products.filter(
                    (p) => (p.category === "ot-lights" || p.category === "OT / Surgical Lights") && p.subcategory === sec.slug
                  ).length;

                  return (
                    <section key={sec.id} id={sec.id} className="scroll-mt-24 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#EAEAEA] gap-2">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
                              {sec.title}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-[#EAF5EF] text-[#145A38] border border-[#1F7A4D]/20">
                              {dbTotal} Certified Products
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
                            {sec.description}
                          </p>
                        </div>
                        {secProducts.length !== dbTotal && (
                          <span className="text-2xs font-mono text-neutral-400">
                            Showing {secProducts.length} of {dbTotal}
                          </span>
                        )}
                      </div>

                      {secProducts.length === 0 ? (
                        <div className="p-8 bg-white rounded-xl border border-dashed border-[#EAEAEA] text-center text-xs text-neutral-500">
                          No products match active filters in {sec.title}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                          {secProducts.map((p) => (
                            <ProductCard
                              key={p.id}
                              product={p}
                              onQuickView={setQuickViewProduct}
                              onOpenQuote={handleOpenQuote}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : selectedCategory === "physiotherapy" && !selectedSubcategory ? (
              <div className="space-y-12">
                {/* Quick Anchor Navigation */}
                <div className="p-4 bg-white rounded-xl border border-[#EAEAEA] shadow-2xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xs font-extrabold uppercase tracking-wider text-neutral-400">
                      Sections:
                    </span>
                    {[
                      { id: "ultrasound-therapy-machines", slug: "ultrasound-therapy-machines", name: "Ultrasound Therapy Machines" },
                      { id: "tens-machines", slug: "tens-machines", name: "TENS Machines" },
                      { id: "laser-therapy-machine", slug: "laser-therapy-machine", name: "Laser Therapy Machines" },
                      { id: "cpm", slug: "cpm", name: "CPM Machines" },
                      { id: "shortwave-diathermy-machine", slug: "shortwave-diathermy-machine", name: "Short Wave Diathermy Machines" },
                      { id: "longwave-diathermy-machine", slug: "longwave-diathermy-machine", name: "Long Wave Diathermy Machines" },
                      { id: "shockwave-therapy-machine", slug: "shockwave-therapy-machine", name: "Shock Wave Therapy Machines" },
                      { id: "electronic-traction-machine", slug: "electronic-traction-machine", name: "Electronic Traction Machines" },
                      { id: "electric-muscle-stimulator", slug: "electric-muscle-stimulator", name: "Electric Muscle Stimulators" }
                    ].map((sec) => {
                      const count = products.filter(
                        (p) =>
                          (p.category === "physiotherapy" || p.category === "Physiotherapy Machines") &&
                          (p.subcategory === sec.slug || (Array.isArray(p.subcategories) && p.subcategories.includes(sec.slug))) &&
                          p.reviewStatus === "CORRECT"
                      ).length;
                      return (
                        <a
                          key={sec.id}
                          href={`#${sec.id}`}
                          className="px-3 py-1.5 rounded-lg bg-[#FAFAFA] hover:bg-[#111111] text-[#111111] hover:text-white border border-[#EAEAEA] text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>{sec.name}</span>
                          <span className="text-3xs font-mono px-1.5 py-0.2 rounded bg-neutral-200 text-neutral-800">
                            {count}
                          </span>
                        </a>
                      );
                    })}
                  </div>
                  <div className="text-xs font-mono text-neutral-500">
                    <span className="font-bold text-[#111111]">
                      {products.filter((p) => (p.category === "physiotherapy" || p.category === "Physiotherapy Machines") && p.reviewStatus === "CORRECT").length}
                    </span>{" "}
                    Published Products
                  </div>
                </div>

                {/* 9 Distinct Vertically Stacked Sections in Exact Order */}
                {[
                  {
                    id: "ultrasound-therapy-machines",
                    slug: "ultrasound-therapy-machines",
                    title: "1. Ultrasound Therapy Machines",
                    description: "High-frequency therapeutic ultrasound systems engineered for deep-tissue heating, soft tissue rehabilitation, and pain management."
                  },
                  {
                    id: "tens-machines",
                    slug: "tens-machines",
                    title: "2. TENS Machines",
                    description: "Transcutaneous Electrical Nerve Stimulation devices for effective non-invasive electro-analgesia and chronic pain relief."
                  },
                  {
                    id: "laser-therapy-machine",
                    slug: "laser-therapy-machine",
                    title: "3. Laser Therapy Machines",
                    description: "Clinical cold laser and photobiomodulation therapy units for accelerated tissue healing, anti-inflammatory therapy, and rehabilitation."
                  },
                  {
                    id: "cpm",
                    slug: "cpm",
                    title: "4. CPM Machines",
                    description: "Continuous Passive Motion rehabilitation equipment for post-operative joint recovery of knee, hip, shoulder, and ankle joints."
                  },
                  {
                    id: "shortwave-diathermy-machine",
                    slug: "shortwave-diathermy-machine",
                    title: "5. Short Wave Diathermy Machines",
                    description: "High-frequency solid-state 500W shortwave diathermy generators delivering deep heating for extensive muscle and tendon conditions."
                  },
                  {
                    id: "longwave-diathermy-machine",
                    slug: "longwave-diathermy-machine",
                    title: "6. Long Wave Diathermy Machines",
                    description: "Targeted longwave RF capacitive/resistive diathermy systems designed for deep pain relief and localized physiological recovery."
                  },
                  {
                    id: "shockwave-therapy-machine",
                    slug: "shockwave-therapy-machine",
                    title: "7. Shock Wave Therapy Machines",
                    description: "Extracorporeal Shock Wave Therapy (ESWT) ballistic and radial devices for musculoskeletal conditions and plantar fasciitis."
                  },
                  {
                    id: "electronic-traction-machine",
                    slug: "electronic-traction-machine",
                    title: "8. Electronic Traction Machines",
                    description: "Microprocessor-controlled decompression and electronic traction systems for cervical and lumbar spinal rehabilitation."
                  },
                  {
                    id: "electric-muscle-stimulator",
                    slug: "electric-muscle-stimulator",
                    title: "9. Electric Muscle Stimulators",
                    description: "Neuromuscular electrical stimulation (NMES), galvanic, and faradic current units for muscle re-education and atrophy prevention."
                  }
                ].map((sec) => {
                  const secProducts = filteredProducts.filter((p) => p.subcategory === sec.slug || (Array.isArray(p.subcategories) && p.subcategories.includes(sec.slug)));
                  const dbTotal = products.filter(
                    (p) =>
                      (p.category === "physiotherapy" || p.category === "Physiotherapy Machines") &&
                      (p.subcategory === sec.slug || (Array.isArray(p.subcategories) && p.subcategories.includes(sec.slug))) &&
                      p.reviewStatus === "CORRECT"
                  ).length;

                  return (
                    <section key={sec.id} id={sec.id} className="scroll-mt-24 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#EAEAEA] gap-2">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
                              {sec.title}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-2xs font-mono font-bold bg-[#EAF5EF] text-[#145A38] border border-[#1F7A4D]/20">
                              {dbTotal} Verified Products
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
                            {sec.description}
                          </p>
                        </div>
                        {secProducts.length !== dbTotal && (
                          <span className="text-2xs font-mono text-neutral-400">
                            Showing {secProducts.length} of {dbTotal}
                          </span>
                        )}
                      </div>

                      {secProducts.length === 0 ? (
                        <div className="p-8 bg-white rounded-xl border border-dashed border-[#EAEAEA] text-center text-xs text-neutral-500">
                          No reviewed products are currently published in {sec.title}.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                          {secProducts.map((p) => (
                            <ProductCard
                              key={p.id}
                              product={p}
                              onQuickView={setQuickViewProduct}
                              onOpenQuote={handleOpenQuote}
                            />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
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
