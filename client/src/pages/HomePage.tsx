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

interface ActiveCategoryCard {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  textPosition: "top" | "bottom";
  objectPosition: string;
}

const SIX_ACTIVE_CATEGORIES: ActiveCategoryCard[] = [
  {
    id: "electrosurgical-units",
    slug: "electrosurgical-units",
    name: "Electro Surgical Unit",
    description: "High-frequency precision electrosurgical generators, RF cautery units and smoke evacuation systems.",
    image: "/category-cards/card-1-electrosurgical.png",
    textPosition: "top",
    objectPosition: "center 86%"
  },
  {
    id: "cryo-surgical",
    slug: "cryo-surgical",
    name: "Cryo Surgical Equipment",
    description: "Liquid nitrogen cryotherapy guns, multi-nozzle spray sets, and surgical cryo systems.",
    image: "/category-cards/card-2-cryosurgical.png",
    textPosition: "bottom",
    objectPosition: "center top"
  },
  {
    id: "ot-lights",
    slug: "ot-lights",
    name: "OT Surgical Lights",
    description: "Shadowless LED surgical illumination systems engineered with high CRI and cold-light optics.",
    image: "/category-cards/card-3-ot-lights.png",
    textPosition: "bottom",
    objectPosition: "center top"
  },
  {
    id: "examination-ot-tables",
    slug: "examination-ot-tables",
    name: "Examination and OT Tables",
    description: "Heavy-duty electric operating theatre tables, hydraulic surgical couches, and clinical examination beds.",
    image: "/category-cards/card-4-examination-tables.png",
    textPosition: "top",
    objectPosition: "center bottom"
  },
  {
    id: "obstetrics-and-gynaecology",
    slug: "obstetrics-and-gynaecology",
    name: "Obstetric and Gynecologist",
    description: "Specialized maternal delivery tables, gynaecological examination beds, and fetal monitoring instruments.",
    image: "/category-cards/card-5-obstetrics.png",
    textPosition: "bottom",
    objectPosition: "center top"
  },
  {
    id: "medical-equipment",
    slug: "medical-equipment",
    name: "General Medical Equipment",
    description: "Hospital diagnostic instruments, surgical headlights, medical equipment trolleys, and emergency systems.",
    image: "/category-cards/card-6-general-medical.png",
    textPosition: "bottom",
    objectPosition: "center top"
  }
];

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

      {/* 2. EXPLORE MEDICAL EQUIPMENT CATEGORIES (SIX CATEGORY CARDS) */}
      <section className="py-14 sm:py-20 bg-white border-b border-[#E8E8E8]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#E8E8E8] gap-3">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#2D5A4A] block mb-2">
                Certified Healthcare Technology
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                Explore Medical Equipment Categories
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1.5">
                Precision-engineered medical devices for hospitals, surgical centres, and clinical healthcare providers worldwide.
              </p>
            </div>
            <Link
              to="/shop-all"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111111] hover:text-[#2D5A4A] transition-colors shrink-0 group uppercase tracking-wider"
            >
              <span>View All Products</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-[#2D5A4A]" />
            </Link>
          </div>

          {/* Grid: Desktop 3 cards per row (2 rows), Tablet 2 cards per row, Mobile 1 card per row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
            {SIX_ACTIVE_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className={`group relative flex flex-col ${
                  cat.textPosition === "top" ? "justify-start" : "justify-end"
                } overflow-hidden rounded-[20px] aspect-[20/23] bg-[#F4F1EB] shadow-xs hover:shadow-xl transition-all duration-300 select-none hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7AA05A] focus-visible:ring-offset-2`}
                style={{ borderRadius: "20px", aspectRatio: "20 / 23" }}
              >
                <picture className="pointer-events-none">
                  <source type="image/webp" srcSet={cat.image.replace(/\.png$/i, ".webp")} />
                  <img
                    src={cat.image}
                    alt={cat.name}
                    width={820}
                    height={943}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                    style={{ objectPosition: cat.objectPosition }}
                    loading="lazy"
                    decoding="async"
                  />
                </picture>

                <div className="relative z-10 p-4 sm:p-5 lg:p-5.5 flex flex-col items-start gap-2 sm:gap-2.5">
                  <h3
                    className="text-sm sm:text-base lg:text-[17px] font-bold tracking-tight leading-snug"
                    style={{ color: "#7AA05A" }}
                  >
                    {cat.name}
                  </h3>

                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold tracking-wide transition-all duration-200 border group-hover:bg-[#7AA05A]/10"
                    style={{
                      borderColor: "#7AA05A",
                      color: "#7AA05A",
                      backgroundColor: "transparent"
                    }}
                  >
                    <span>Explore Product</span>
                    <ArrowRight
                      size={10}
                      strokeWidth={2.4}
                      style={{ color: "#7AA05A" }}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. RANDOMLY SELECTED ACTIVE PRODUCT SHOWCASE */}
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
