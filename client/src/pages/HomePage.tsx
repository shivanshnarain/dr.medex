import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Product, BlogArticle } from "../types";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import { B2BQuoteModal } from "../components/B2BQuoteModal";
import { HeroSection } from "../components/HeroSection";
import { ServiceBenefitsBanner } from "../components/Footer";
import { getRandomShowcaseProducts, getCachedRandomShowcaseSync } from "../services/productService";

const SHOWCASE_COUNT = 12;

export const HomePage: React.FC = () => {
  const [showcaseProducts, setShowcaseProducts] = useState<Product[]>(() => {
    return getCachedRandomShowcaseSync() || [];
  });
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [isLoadingShowcase, setIsLoadingShowcase] = useState(() => !getCachedRandomShowcaseSync());

  // Modals state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadHomeData() {
      // 1. Fetch lightweight randomized active showcase products asynchronously (non-blocking)
      getRandomShowcaseProducts(SHOWCASE_COUNT)
        .then((picked) => {
          if (isMounted && Array.isArray(picked)) {
            setShowcaseProducts(picked);
          }
        })
        .catch((err) => console.warn("[HomePage] Random showcase fetch notice:", err))
        .finally(() => {
          if (isMounted) setIsLoadingShowcase(false);
        });

      // 2. Fetch clinical blogs independently
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
            ? showcaseProducts.find((p) => p.title.toLowerCase().includes(productTitle.toLowerCase())) || showcaseProducts[0]
            : showcaseProducts[0];
          setQuoteProduct(match || null);
          setIsQuoteModalOpen(true);
        }}
        onQuickView={(productId?: string) => {
          const match = showcaseProducts.find((p) => p.id === productId) || showcaseProducts[0];
          if (match) setQuickViewProduct(match);
        }}
      />

      {/* 2. RANDOMLY SELECTED ACTIVE PRODUCT SHOWCASE */}
      <section className="py-12 sm:py-16 bg-white" aria-label="Featured Medical Equipment">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-[#E8E8E8] gap-3">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#2D5A4A] block mb-1.5">
                Live Hospital &amp; Clinical Catalogue
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
                Featured Medical Equipment
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                A curated selection of verified medical instruments, surgical systems, and operating theatre devices.
              </p>
            </div>
            <Link
              to="/shop-all"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111111] hover:text-[#2D5A4A] transition-colors shrink-0 group uppercase tracking-wider"
            >
              <span>Explore Full Catalogue</span>
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-transform text-[#2D5A4A]"
              />
            </Link>
          </div>

          {isLoadingShowcase && showcaseProducts.length === 0 ? (
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
          ) : showcaseProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {showcaseProducts.map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onQuickView={setQuickViewProduct}
                  onOpenQuote={handleOpenQuote}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6 py-10 text-center">
              <p className="text-sm font-semibold text-neutral-800">
                Browse our complete certified medical equipment range.
              </p>
              <Link
                to="/shop-all"
                className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#7AA05A] hover:bg-[#688a4c] text-white text-xs font-bold transition-colors"
              >
                <span>View All Products</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 4. GREEN SERVICE-BENEFITS SECTION (DIRECTLY BELOW RANDOM PRODUCT SHOWCASE) */}
      <ServiceBenefitsBanner />

      {/* 5. CLINICAL BLOG & EDUCATIONAL GUIDES */}
      {blogs.length > 0 && (
        <section className="py-20 sm:py-24 bg-white border-t border-[#E8E8E8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
              <div>
                <span className="text-3xs font-extrabold uppercase tracking-widest text-[#2D5A4A] block mb-2">
                  Medical Knowledge
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                  Clinical Technology Guides & Resources
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
