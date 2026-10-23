import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Headphones,
  Sun,
  Zap,
  Activity,
  Bed,
  ThermometerSnowflake,
  HeartPulse
} from "lucide-react";
import { Product, BlogArticle } from "../types";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import { B2BQuoteModal } from "../components/B2BQuoteModal";
import { HeroSection } from "../components/HeroSection";
import { getProducts } from "../services/productService";

interface CategorySectionDef {
  id: string;
  slug: string;
  title: string;
  description: string;
  viewAllLink: string;
}

interface ActiveCategoryCard {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  textPosition: "top" | "bottom";
}

const SIX_ACTIVE_CATEGORIES: ActiveCategoryCard[] = [
  {
    id: "electrosurgical-units",
    slug: "electrosurgical-units",
    name: "Electro Surgical Unit",
    description: "High-frequency precision electrosurgical generators, RF cautery units and smoke evacuation systems.",
    image: "/category-cards/card-1-electrosurgical.png",
    textPosition: "top"
  },
  {
    id: "cryo-surgical",
    slug: "cryo-surgical",
    name: "Cryo Surgical Equipment",
    description: "Liquid nitrogen cryotherapy guns, multi-nozzle spray sets, and surgical cryo systems.",
    image: "/category-cards/card-2-cryosurgical.png",
    textPosition: "bottom"
  },
  {
    id: "ot-lights",
    slug: "ot-lights",
    name: "OT Surgical Lights",
    description: "Shadowless LED surgical illumination systems engineered with high CRI and cold-light optics.",
    image: "/category-cards/card-3-ot-lights.png",
    textPosition: "bottom"
  },
  {
    id: "examination-ot-tables",
    slug: "examination-ot-tables",
    name: "Examination and OT Tables",
    description: "Heavy-duty electric operating theatre tables, hydraulic surgical couches, and clinical examination beds.",
    image: "/category-cards/card-4-examination-tables.png",
    textPosition: "top"
  },
  {
    id: "obstetrics-and-gynaecology",
    slug: "obstetrics-and-gynaecology",
    name: "Obstetric and Gynecologist",
    description: "Specialized maternal delivery tables, gynaecological examination beds, and fetal monitoring instruments.",
    image: "/category-cards/card-5-obstetrics.png",
    textPosition: "bottom"
  },
  {
    id: "medical-equipment",
    slug: "medical-equipment",
    name: "General Medical Equipment",
    description: "Hospital diagnostic instruments, surgical headlights, medical equipment trolleys, and emergency systems.",
    image: "/category-cards/card-6-general-medical.png",
    textPosition: "bottom"
  }
];

const CATEGORY_SECTIONS: CategorySectionDef[] = [
  {
    id: "electrosurgical-units",
    slug: "electrosurgical-units",
    title: "Electrosurgical",
    description: "High-performance electrosurgical generators, RF cautery units and smoke evacuation systems.",
    viewAllLink: "/category/electrosurgical-units"
  },
  {
    id: "cryo-surgical",
    slug: "cryo-surgical",
    title: "Cryo Surgical",
    description: "Precision liquid nitrogen cryo spray guns, dermatological cryotherapy devices and specialized extraction probes.",
    viewAllLink: "/category/cryo-surgical"
  },
  {
    id: "ot-lights",
    slug: "ot-lights",
    title: "OT Lights",
    description: "Ceiling-mounted single & double dome surgical lights, mobile LED operating theatre lamps and shadowless illumination.",
    viewAllLink: "/category/ot-lights"
  },
  {
    id: "examination-ot-tables",
    slug: "examination-ot-tables",
    title: "OT Tables",
    description: "Durable and ergonomic operating tables, treatment beds and motorized procedure chairs for surgical suites.",
    viewAllLink: "/category/examination-ot-tables"
  },
  {
    id: "obstetrics-and-gynaecology",
    slug: "obstetrics-and-gynaecology",
    title: "Obstetrics & Gynaecology",
    description: "Specialized clinical gynecology equipment, digital optical colposcopes and thermal ablation coagulators.",
    viewAllLink: "/category/obstetrics-and-gynaecology"
  },
  {
    id: "medical-equipment",
    slug: "medical-equipment",
    title: "General Medical Equipment",
    description: "Hospital diagnostic instruments, clinical visual acuity monitors and specialized medical equipment.",
    viewAllLink: "/category/medical-equipment"
  }
];

export const HomePage: React.FC = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [, setIsLoading] = useState(true);

  // Modals state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [prodResult, blogRes] = await Promise.all([
          getProducts(),
          fetch("/api/blogs").catch(() => null)
        ]);

        if (prodResult && prodResult.products) {
          setAllProducts(prodResult.products);
        }

        if (blogRes && blogRes.ok) {
          const bData = await blogRes.json();
          if (bData.success && Array.isArray(bData.blogs)) {
            setBlogs(bData.blogs.slice(0, 3));
          }
        }
      } catch (err) {
        console.error("Failed to load homepage data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadHomeData();
  }, []);

  const handleOpenQuote = (product: Product) => {
    setQuoteProduct(product);
    setIsQuoteModalOpen(true);
  };

  // Group products by category
  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const section of CATEGORY_SECTIONS) {
      map[section.slug] = allProducts.filter((p) => p.category === section.slug);
    }
    return map;
  }, [allProducts]);

  return (
    <div className="w-full bg-white">
      {/* 1. HERO SECTION WITH CINEMATIC LIGHTING & CATEGORY TILES */}
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

      {/* 2.5. EXPLORE MEDICAL EQUIPMENT CATEGORIES (6 ACTIVE CATEGORIES) */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
            {SIX_ACTIVE_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className={`group relative flex flex-col ${
                  cat.textPosition === "top" ? "justify-start" : "justify-end"
                } overflow-hidden rounded-[20px] aspect-[2/3] bg-[#F4F1EB] shadow-xs hover:shadow-xl transition-all duration-300 select-none hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7AA05A] focus-visible:ring-offset-2`}
                style={{ borderRadius: "20px" }}
              >
                {/* 1. Original category product image filling the full card */}
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                  loading="lazy"
                />

                {/* 2. Positioned heading and outlined Explore Product button in negative space */}
                <div className="relative z-10 p-6 sm:p-7 lg:p-8 flex flex-col items-start gap-3 sm:gap-3.5">
                  <h3
                    className="text-xl sm:text-2xl lg:text-[24px] font-bold tracking-tight leading-snug"
                    style={{ color: "#7AA05A" }}
                  >
                    {cat.name}
                  </h3>

                  <span
                    className="inline-flex items-center gap-2 px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 border group-hover:bg-[#7AA05A]/10"
                    style={{
                      borderColor: "#7AA05A",
                      color: "#7AA05A",
                      backgroundColor: "transparent"
                    }}
                  >
                    <span>Explore Product</span>
                    <ArrowRight
                      size={14}
                      strokeWidth={2.2}
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

      {/* 3. CATEGORY-WISE PRODUCT SECTIONS (SYSTEMATIC ORDER) */}
      <div className="w-full bg-white divide-y divide-[#F0F0F0]">
        {CATEGORY_SECTIONS.map((section) => {
          const categoryProducts = productsByCategory[section.slug] || [];
          if (categoryProducts.length === 0) return null;

          // Display 4 products per row (or up to 4 on desktop)
          const displayProducts = categoryProducts.slice(0, 4);

          return (
            <section key={section.id} className="py-12 sm:py-16">
              <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                {/* CATEGORY SECTION HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 pb-4 border-b border-[#E8E8E8] gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-[#111111] uppercase tracking-wider">
                      {section.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                      {section.description}
                    </p>
                  </div>
                  <Link
                    to={section.viewAllLink}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#111111] hover:text-[#2D5A4A] transition-colors shrink-0 group uppercase tracking-wider"
                  >
                    <span>View All {section.title}</span>
                    <ArrowRight
                      size={14}
                      className="group-hover:translate-x-1 transition-transform text-[#2D5A4A]"
                    />
                  </Link>
                </div>

                {/* PRODUCT GRID: 4 cards per row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {displayProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onQuickView={setQuickViewProduct}
                      onOpenQuote={handleOpenQuote}
                    />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      {/* 4. CLINICAL TECHNOLOGY & INNOVATION PILLARS */}
      <section className="py-20 sm:py-24 bg-[#FAFAFA] border-t border-[#E8E8E8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-[#2D5A4A] block mb-2">
              Engineering Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              Medical Technology & Innovation Pillars
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2.5">
              Every medical device is subjected to rigorous biomedical verification and electronic isolation protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-7 rounded-xl border border-[#E8E8E8] shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-[#FAFAFA] border border-[#E8E8E8] text-[#111111] flex items-center justify-center mb-5">
                <Sun size={22} className="text-[#2D5A4A]" />
              </div>
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
                Shadowless Optical Design
              </h3>
              <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed">
                Computer-simulated faceted lenses converge multiple light beams into a continuous surgical column, eliminating visual dead zones even during deep abdominal interventions.
              </p>
            </div>

            <div className="bg-white p-7 rounded-xl border border-[#E8E8E8] shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-[#FAFAFA] border border-[#E8E8E8] text-[#111111] flex items-center justify-center mb-5">
                <Zap size={22} className="text-[#2D5A4A]" />
              </div>
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
                Microprocessor High-Frequency HF
              </h3>
              <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed">
                Dynamic tissue-sensing feedback modulates electrosurgical cut and coagulation arcs in real-time, preventing neuromuscular excitation and unintended thermal spread.
              </p>
            </div>

            <div className="bg-white p-7 rounded-xl border border-[#E8E8E8] shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-[#FAFAFA] border border-[#E8E8E8] text-[#111111] flex items-center justify-center mb-5">
                <Activity size={22} className="text-[#2D5A4A]" />
              </div>
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
                Biomedical Safety Isolation
              </h3>
              <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed">
                Full compliance with IEC 60601-1 electrical safety standards. Type CF defibrillation-proof patient isolation ensures zero stray currents in critical care setups.
              </p>
            </div>
          </div>
        </div>
      </section>

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
