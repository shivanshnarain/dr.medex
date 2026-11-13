import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { Product, BlogArticle } from "../types";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import { B2BQuoteModal } from "../components/B2BQuoteModal";
import { HeroSection } from "../components/HeroSection";
import { ServiceBenefitsBanner } from "../components/Footer";
import { getProducts, getCachedProductsSync } from "../services/productService";

const CANONICAL_CATEGORY_MAP: Record<string, string[]> = {
  "electrosurgical": [
    "electrosurgical",
    "electrosurgical-units",
    "electrosurgical units",
    "electrosurgical surgery",
    "electrosurgical generators"
  ],
  "electrosurgical-units": [
    "electrosurgical",
    "electrosurgical-units",
    "electrosurgical units",
    "electrosurgical surgery",
    "electrosurgical generators"
  ],
  "cryo-surgical": [
    "cryo-surgical",
    "cryosurgical",
    "cryosurgical-equipment",
    "cryo surgical",
    "cryosurgical equipment"
  ],
  "cryosurgical-equipment": [
    "cryo-surgical",
    "cryosurgical",
    "cryosurgical-equipment",
    "cryo surgical",
    "cryosurgical equipment"
  ],
  "ot-lights": [
    "ot-lights",
    "ot / surgical lights",
    "ot lights",
    "surgical lights",
    "single-dome",
    "double-dome",
    "mobile-lights"
  ],
  "examination-ot-tables": [
    "examination-ot-tables",
    "ot-tables",
    "examination & ot tables",
    "examination tables",
    "operating tables",
    "treatment-tables"
  ],
  "ot-tables": [
    "examination-ot-tables",
    "ot-tables",
    "examination & ot tables",
    "examination tables",
    "operating tables",
    "treatment-tables"
  ],
  "obstetrics-and-gynaecology": [
    "obstetrics-and-gynaecology",
    "obg",
    "obstetrics & gynaecology",
    "obstetric-tables",
    "gynae-tables",
    "fetal-care"
  ],
  "obg": [
    "obstetrics-and-gynaecology",
    "obg",
    "obstetrics & gynaecology",
    "obstetric-tables",
    "gynae-tables",
    "fetal-care"
  ],
  "medical-equipment": [
    "medical-equipment",
    "general-medical-equipment",
    "general medical equipment",
    "medical equipment",
    "diagnostic",
    "headlights",
    "trolleys",
    "insufflators",
    "biopsy-instruments"
  ],
  "general-medical-equipment": [
    "medical-equipment",
    "general-medical-equipment",
    "general medical equipment",
    "medical equipment",
    "diagnostic",
    "headlights",
    "trolleys",
    "insufflators",
    "biopsy-instruments"
  ]
};

function matchProductCategory(product: Product, categorySlugOrId: string): boolean {
  if (!categorySlugOrId) return true;
  const target = categorySlugOrId.toLowerCase().trim();
  const allowed = CANONICAL_CATEGORY_MAP[target] || [target];

  const pCat = (product.category || "").toLowerCase().trim();
  const pCatName = (product.categoryName || "").toLowerCase().trim();
  const pSub = (product.subcategory || "").toLowerCase().trim();
  const pSubName = (product.subcategoryName || "").toLowerCase().trim();
  const rawCats = (product as any).categories;
  const pCats: string[] = Array.isArray(rawCats)
    ? rawCats.map((c: any) => String(c).toLowerCase().trim())
    : [];
  const pSubs: string[] = Array.isArray(product.subcategories)
    ? product.subcategories.map((s: string) => String(s).toLowerCase().trim())
    : [];

  if (allowed.includes(pCat)) return true;
  if (allowed.includes(pCatName)) return true;
  if (allowed.includes(pSub)) return true;
  if (allowed.includes(pSubName)) return true;
  if (pCats.some((c: string) => allowed.includes(c))) return true;
  if (pSubs.some((s: string) => allowed.includes(s))) return true;

  for (const token of allowed) {
    if (pCat === token || pCatName === token) return true;
  }

  return false;
}

export const HomePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCategory = searchParams.get("category") || "";

  const [allProducts, setAllProducts] = useState<Product[]>(() => {
    return getCachedProductsSync() || [];
  });
  const [isLoading, setIsLoading] = useState(() => !getCachedProductsSync());
  const [visibleCount, setVisibleCount] = useState(24);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);

  // Modals state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 1. Fetch complete products collection and clinical blogs on mount
  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      if (allProducts.length === 0) {
        setIsLoading(true);
      }

      getProducts()
        .then((res) => {
          if (isMounted && res && Array.isArray(res.products) && res.products.length > 0) {
            setAllProducts(res.products);
          }
        })
        .catch((err) => console.warn("[HomePage] Products fetch notice:", err))
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      // Fetch clinical blogs independently
      fetch("/api/blogs")
        .then((res) => (res.ok ? res.json() : null))
        .then((bData) => {
          if (isMounted && bData && bData.success && Array.isArray(bData.blogs)) {
            setBlogs(bData.blogs.slice(0, 3));
          }
        })
        .catch(() => {});
    }

    loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for live catalogue updates
  useEffect(() => {
    const handleUpdate = () => {
      getProducts(true).then((res) => {
        if (res && Array.isArray(res.products)) {
          setAllProducts(res.products);
        }
      });
    };
    window.addEventListener("drmedex_catalogue_updated", handleUpdate);
    return () => window.removeEventListener("drmedex_catalogue_updated", handleUpdate);
  }, []);

  // Filter products by selected category (only published/active/correct products)
  const filteredProducts = useMemo(() => {
    let list = allProducts.filter(
      (p) =>
        (p.status || "ACTIVE") === "ACTIVE" &&
        p.status !== "ARCHIVED" &&
        !p.isRetired &&
        p.reviewStatus === "CORRECT"
    );

    if (selectedCategory) {
      list = list.filter((p) => matchProductCategory(p, selectedCategory));
    }

    return list;
  }, [allProducts, selectedCategory]);

  // Reset pagination count when category changes
  useEffect(() => {
    setVisibleCount(24);
  }, [selectedCategory]);

  // Smooth scroll to catalogue when navbar category filter is engaged
  useEffect(() => {
    if (selectedCategory) {
      const el = document.getElementById("catalogue");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [selectedCategory]);

  // Continuous infinite scroll observer
  useEffect(() => {
    if (visibleCount >= filteredProducts.length) return;
    const sentinel = loadMoreRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 24, filteredProducts.length));
        }
      },
      { rootMargin: "350px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [visibleCount, filteredProducts.length]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const activeCategoryName = useMemo(() => {
    if (!selectedCategory) return "";
    const clean = selectedCategory.toLowerCase().trim();
    if (clean.includes("electro")) return "Electrosurgical";
    if (clean.includes("cryo")) return "Cryo Surgical";
    if (clean.includes("light")) return "OT Lights";
    if (clean.includes("table")) return "OT Tables";
    if (clean.includes("obg") || clean.includes("obstetric")) return "OBG";
    if (clean.includes("medical")) return "General Medical";
    return selectedCategory;
  }, [selectedCategory]);

  const handleClearCategoryFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("category");
    params.delete("subcategory");
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleOpenQuote = useCallback((product: Product) => {
    setQuoteProduct(product);
    setIsQuoteModalOpen(true);
  }, []);

  return (
    <div className="w-full bg-white">
      {/* 1. HERO SECTION (TOP PRIORITY) */}
      <HeroSection
        onOpenQuote={(productTitle?: string) => {
          const match = productTitle
            ? allProducts.find((p) => p.title.toLowerCase().includes(productTitle.toLowerCase())) || allProducts[0]
            : allProducts[0];
          setQuoteProduct(match || null);
          setIsQuoteModalOpen(true);
        }}
        onQuickView={(productId?: string) => {
          const match = allProducts.find((p) => p.id === productId) || allProducts[0];
          if (match) setQuickViewProduct(match);
        }}
      />

      {/* 2. OUR PRODUCTS — SINGLE CONTINUOUS CATALOGUE */}
      <section id="catalogue" className="py-12 sm:py-16 bg-white scroll-mt-20" aria-label="Explore Our Medical Equipment">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header: Exact required text and typography */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-[#E8E8E8] gap-3">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#2D5A4A] block mb-1.5">
                OUR PRODUCTS
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#111111] tracking-tight">
                Explore Our Medical Equipment
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-3xl leading-relaxed">
                Discover our complete range of precision-engineered medical equipment and healthcare solutions for hospitals, clinics and healthcare professionals worldwide.
              </p>
            </div>

            {/* Active category filter pill with clear button */}
            {selectedCategory && (
              <div className="flex items-center gap-2 self-start sm:self-end shrink-0">
                <span className="text-xs font-semibold text-neutral-600">
                  Filtering: <strong className="text-[#2D5A4A]">{activeCategoryName}</strong> ({filteredProducts.length})
                </span>
                <button
                  type="button"
                  onClick={handleClearCategoryFilter}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#7AA05A]/15 hover:bg-[#7AA05A]/25 text-[#2D5A4A] text-xs font-bold transition-colors cursor-pointer"
                  title="Show all products"
                  aria-label="Show all products"
                >
                  <span>Show All</span>
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Product Cards Grid: All products rendered continuously */}
          {isLoading && displayedProducts.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-neutral-200 p-3 sm:p-4 flex flex-col gap-3 animate-pulse"
                >
                  <div className="w-full aspect-square rounded-[16px] bg-neutral-100" />
                  <div className="h-3 w-1/2 rounded bg-neutral-100" />
                  <div className="h-4 w-5/6 rounded bg-neutral-100" />
                  <div className="h-4 w-1/3 rounded bg-neutral-100 mt-auto" />
                  <div className="h-9 w-full rounded-full bg-neutral-100" />
                </div>
              ))}
            </div>
          ) : displayedProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {displayedProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onQuickView={setQuickViewProduct}
                    onOpenQuote={handleOpenQuote}
                  />
                ))}
              </div>

              {/* Incremental loading indicator sentinel */}
              {visibleCount < filteredProducts.length && (
                <div ref={loadMoreRef} className="py-10 flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-[#7AA05A] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-neutral-500 font-medium">
                    Loading more medical equipment ({displayedProducts.length} of {filteredProducts.length})...
                  </span>
                </div>
              )}

              {/* End of collection indicator */}
              {visibleCount >= filteredProducts.length && filteredProducts.length > 0 && (
                <div className="pt-10 pb-4 text-center">
                  <span className="text-xs text-neutral-400 font-medium">
                    Showing all {filteredProducts.length} certified medical equipment products
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-neutral-800">
                No medical equipment found matching {selectedCategory ? `“${activeCategoryName}”` : "the selected criteria"}.
              </p>
              <button
                type="button"
                onClick={handleClearCategoryFilter}
                className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#7AA05A] hover:bg-[#688a4c] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <span>View All Products</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. GREEN SERVICE-BENEFITS SECTION */}
      <ServiceBenefitsBanner />

      {/* 4. CLINICAL BLOG & EDUCATIONAL GUIDES */}
      {blogs.length > 0 && (
        <section className="py-20 sm:py-24 bg-white border-t border-[#E8E8E8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
              <div>
                <span className="text-3xs font-extrabold uppercase tracking-widest text-[#2D5A4A] block mb-2">
                  Medical Knowledge
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                  Clinical Technology Guides &amp; Resources
                </h2>
              </div>
              <Link
                to="/blog"
                className="mt-2 sm:mt-0 text-xs font-bold text-[#111111] hover:text-[#2D5A4A] flex items-center gap-1.5 transition-colors uppercase tracking-wider"
              >
                <span>View All Articles</span>
                <ArrowRight size={14} className="text-[#2D5A4A]" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogs.map((b) => (
                <div
                  key={b.id}
                  className="group bg-white rounded-xl border border-[#E8E8E8] overflow-hidden hover:border-[#111111] hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-video bg-[#FAFAFA] overflow-hidden">
                      <img
                        src={b.image}
                        alt={b.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-6">
                      <div className="text-3xs font-bold uppercase tracking-wider text-[#2D5A4A] mb-2">
                        {b.category} • {b.readTime}
                      </div>
                      <h3 className="text-xs font-bold text-[#111111] leading-snug line-clamp-2 group-hover:text-[#2D5A4A] transition-colors">
                        <Link to={`/blog/${b.slug}`}>{b.title}</Link>
                      </h3>
                      <p className="text-2xs text-neutral-500 mt-2.5 line-clamp-2 leading-relaxed">
                        {b.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="px-6 pb-6 pt-0">
                    <Link
                      to={`/blog/${b.slug}`}
                      className="text-xs font-bold text-[#111111] hover:text-[#2D5A4A] flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                    >
                      <span>Read Guide</span>
                      <ArrowRight size={13} className="text-[#2D5A4A]" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quick View and B2B Quote Modals */}
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
