import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Zap,
  ThermometerSnowflake,
  Sun,
  Bed,
  HeartPulse,
  ArrowRight,
  ShieldCheck,
  Globe,
  Truck,
  CheckCircle2,
  FileText,
  Headphones,
  Star,
  Users
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { Product, Category, BlogArticle } from "../types";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import { B2BQuoteModal } from "../components/B2BQuoteModal";
import { HeroSection } from "../components/HeroSection";

export const HomePage: React.FC = () => {
  const { currentCountry, currentCurrency } = useCurrency();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [, setIsLoading] = useState(true);

  // Modals state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [catRes, prodRes, blogRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products"),
          fetch("/api/blogs")
        ]);

        if (catRes.ok) {
          const cData = await catRes.json();
          if (cData.success) setCategories(cData.categories);
        }

        if (prodRes.ok) {
          const pData = await prodRes.json();
          if (pData.success) {
            setFeaturedProducts(pData.products.filter((p: Product) => p.isFeatured).slice(0, 4));
            setBestSellers(pData.products.filter((p: Product) => p.isBestSeller).slice(0, 4));
          }
        }

        if (blogRes.ok) {
          const bData = await blogRes.json();
          if (bData.success) setBlogs(bData.blogs.slice(0, 3));
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

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "Activity": return <Activity className="text-[#111111]" size={22} />;
      case "Zap": return <Zap className="text-[#111111]" size={22} />;
      case "ThermometerSnowflake": return <ThermometerSnowflake className="text-[#111111]" size={22} />;
      case "Sun": return <Sun className="text-[#111111]" size={22} />;
      case "Bed": return <Bed className="text-[#111111]" size={22} />;
      case "HeartPulse": return <HeartPulse className="text-[#111111]" size={22} />;
      default: return <Activity className="text-[#111111]" size={22} />;
    }
  };

  return (
    <div className="w-full bg-white">
      {/* 1. HERO SECTION & 3D MEDICAL EQUIPMENT CAROUSEL */}
      <HeroSection
        onOpenQuote={(productTitle?: string) => {
          const match = productTitle
            ? featuredProducts.find((p) => p.title.toLowerCase().includes(productTitle.toLowerCase())) || featuredProducts[0]
            : featuredProducts[0];
          setQuoteProduct(match || null);
          setIsQuoteModalOpen(true);
        }}
        onQuickView={(productId?: string) => {
          const match = featuredProducts.find((p) => p.id === productId) || featuredProducts[0];
          if (match) setQuickViewProduct(match);
        }}
      />

      {/* =========================================================================
          BOTTOM TRUST / FEATURE STRIP
          Clean dark medical-tech foundation with subtle green accents
      ========================================================================= */}
      <div className="relative z-20 w-full bg-[#111111] border-t border-[#222222] py-6 sm:py-7">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-center">
            {/* Block 1: Worldwide Shipping */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                <Truck size={20} className="text-[#1F7A4D]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">Worldwide Shipping</div>
                <div className="text-xs text-neutral-400 mt-0.5">To 100+ Countries Via Air Cargo</div>
              </div>
            </div>

            {/* Block 2: Certified Products */}
            <div className="flex items-center gap-4 lg:border-l lg:border-[#262626] lg:pl-8">
              <div className="w-11 h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                <ShieldCheck size={20} className="text-[#1F7A4D]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">Certified Products</div>
                <div className="text-xs text-neutral-400 mt-0.5">ISO 13485 & CE Verified</div>
              </div>
            </div>

            {/* Block 3: Expert Support */}
            <div className="flex items-center gap-4 lg:border-l lg:border-[#262626] lg:pl-8">
              <div className="w-11 h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                <Headphones size={20} className="text-[#1F7A4D]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">Bio-Medical Support</div>
                <div className="text-xs text-neutral-400 mt-0.5">Direct Engineering Assistance</div>
              </div>
            </div>

            {/* Block 4: Trusted by Professionals */}
            <div className="flex items-center gap-4 lg:border-l lg:border-[#262626] lg:pl-8">
              <div className="w-11 h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center shrink-0">
                <Users size={20} className="text-[#1F7A4D]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white leading-tight">Institutional Procurement</div>
                <div className="text-xs text-neutral-400 mt-0.5">Hospitals | Clinics | Distributors</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY MEDICAL CATEGORIES */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block mb-2">
                Medical Product Taxonomy
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                Core Equipment Categories
              </h2>
            </div>
            <Link
              to="/shop-all"
              className="mt-3 sm:mt-0 text-xs font-bold text-[#111111] hover:text-[#1F7A4D] flex items-center gap-1.5 transition-colors"
            >
              <span>Explore All Products</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="group relative bg-[#FAFAFA] hover:bg-white rounded-xl border border-[#EAEAEA] hover:border-[#111111] p-7 transition-all duration-300 hover:shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white border border-[#EAEAEA] flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform mb-5">
                    {getCategoryIcon(cat.icon)}
                  </div>
                  <h3 className="text-base font-bold text-[#111111] group-hover:text-[#1F7A4D] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-2.5 line-clamp-2 leading-relaxed">
                    {cat.shortDescription}
                  </p>

                  {/* Subcategories list snippet */}
                  <div className="mt-5 pt-4 border-t border-[#EAEAEA] space-y-2">
                    {cat.subcategories.slice(0, 3).map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/shop-all?subcategory=${sub.slug}`}
                        className="block text-2xs text-neutral-600 hover:text-[#111111] font-medium truncate transition-colors"
                      >
                        • {sub.name}
                      </Link>
                    ))}
                    {cat.subcategories.length > 3 && (
                      <span className="text-3xs text-[#1F7A4D] font-semibold block">
                        +{cat.subcategories.length - 3} more sub-specialties
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-7 pt-4 border-t border-[#EAEAEA] flex items-center justify-between">
                  <Link
                    to={`/shop-all?category=${cat.slug}`}
                    className="text-xs font-bold text-[#111111] group-hover:text-[#1F7A4D] flex items-center gap-1.5 transition-colors"
                  >
                    <span>Browse {cat.name}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SPOTLIGHT 1: PHYSIOTHERAPY & REHABILITATION */}
      <section className="py-20 sm:py-28 bg-[#FAFAFA] border-y border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-6">
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block">
                Physical Medicine & Orthopedics
              </span>
              <h2 className="text-2xl sm:text-3.5xl font-black text-[#111111] tracking-tight leading-tight">
                Advanced Physiotherapy & Clinical Rehabilitation Systems
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                From high-power Class 4 cold lasers to dual-frequency ultrasound and ballistic radial shockwave generators, DR.MEDEX delivers non-invasive therapeutic solutions for accelerated musculoskeletal healing.
              </p>

              <div className="space-y-3 pt-1 text-xs text-neutral-700">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1F7A4D] shrink-0" />
                  <span>Dual 1 MHz & 3 MHz Ultrasound with IPX7 waterproof soundheads</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1F7A4D] shrink-0" />
                  <span>Pneumatic Radial Shockwave up to 5.0 Bar for chronic calcifications</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1F7A4D] shrink-0" />
                  <span>Continuous Passive Motion (CPM) for total knee rehabilitation</span>
                </div>
              </div>

              <div className="pt-3">
                <Link
                  to="/shop-all?category=physiotherapy"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <span>Explore Physiotherapy Range</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {featuredProducts.slice(0, 2).map((prod) => (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  onQuickView={setQuickViewProduct}
                  onOpenQuote={handleOpenQuote}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED PRODUCTS GRID */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block mb-2">
                Precision Engineering
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                Featured Medical Devices
              </h2>
            </div>
            <div className="mt-2 sm:mt-0 text-xs text-neutral-500">
              Settlement in <strong>{currentCurrency} ({currentCountry.name})</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map((prod) => (
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

      {/* 5. SPOTLIGHT 2: OPERATING THEATRE & SURGICAL LIGHTING */}
      <section className="py-20 sm:py-28 bg-[#111111] text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block">
                Surgical Illumination Standards
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Shadowless Operating Theatre Illumination: 160,000 Lux Precision
              </h2>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                DR.MEDEX surgical lights integrate multi-faceted optical lenses and German counterbalance articulation to deliver uniform deep-cavity light fields with CRI ≥ 96, zero thermal rise at the surgeon's cranial level, and dedicated laparoscopic Endo-lighting.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl">
                  <div className="text-xl font-black text-white font-mono">160,000 Lux</div>
                  <div className="text-3xs text-neutral-400 uppercase font-semibold mt-1">Maximum Field Illumination</div>
                </div>
                <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl">
                  <div className="text-xl font-black text-white font-mono">≥ 96 CRI (Ra)</div>
                  <div className="text-3xs text-neutral-400 uppercase font-semibold mt-1">Color Differentiation</div>
                </div>
                <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl">
                  <div className="text-xl font-black text-white font-mono">&lt; 1°C</div>
                  <div className="text-3xs text-neutral-400 uppercase font-semibold mt-1">Cold Light Temperature Rise</div>
                </div>
                <div className="p-4 bg-[#181818] border border-[#262626] rounded-xl">
                  <div className="text-xl font-black text-white font-mono">60,000+ Hrs</div>
                  <div className="text-3xs text-neutral-400 uppercase font-semibold mt-1">Solid-State LED Lifespan</div>
                </div>
              </div>

              <div className="pt-3 flex flex-wrap gap-4">
                <Link
                  to="/shop-all?category=ot-lights"
                  className="px-7 py-3.5 bg-white hover:bg-neutral-200 text-[#111111] rounded-xl text-xs font-bold transition-colors"
                >
                  Explore Surgical Lights
                </Link>
                <Link
                  to="/request-quote"
                  className="px-7 py-3.5 bg-[#181818] hover:bg-[#222222] border border-[#333333] text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Request OR Illumination Tender
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-2xl overflow-hidden border border-[#262626] shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80"
                  alt="Operating Theatre Surgery"
                  className="w-full h-96 object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. BEST SELLERS SHOWCASE */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block mb-2">
                Hospital Procurement Favorites
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                Best Selling Medical Equipment
              </h2>
            </div>
            <Link
              to="/shop-all"
              className="mt-2 sm:mt-0 text-xs font-bold text-[#111111] hover:text-[#1F7A4D] flex items-center gap-1.5 transition-colors"
            >
              <span>View Full Inventory</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {bestSellers.map((prod) => (
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

      {/* 7. MEDICAL TECHNOLOGY & INNOVATION */}
      <section className="py-20 sm:py-28 bg-[#FAFAFA] border-t border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block mb-2">
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
            <div className="bg-white p-7 rounded-xl border border-[#EAEAEA] shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] text-[#111111] flex items-center justify-center mb-5">
                <Sun size={22} />
              </div>
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
                Shadowless Optical Design
              </h3>
              <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed">
                Computer-simulated faceted lenses converge multiple light beams into a continuous surgical column, eliminating visual dead zones even during deep abdominal interventions.
              </p>
            </div>

            <div className="bg-white p-7 rounded-xl border border-[#EAEAEA] shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] text-[#111111] flex items-center justify-center mb-5">
                <Zap size={22} />
              </div>
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
                Micro-Feedback RF Generators
              </h3>
              <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed">
                Instant tissue-impedance sensing circuitry samples electrical resistance 5,000 times per second, automatically adjusting RF wattage to minimize lateral thermal margin damage.
              </p>
            </div>

            <div className="bg-white p-7 rounded-xl border border-[#EAEAEA] shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-[#FAFAFA] border border-[#EAEAEA] text-[#111111] flex items-center justify-center mb-5">
                <ThermometerSnowflake size={22} />
              </div>
              <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">
                -196°C Vacuum Cryogenics
              </h3>
              <p className="text-xs text-neutral-500 mt-2.5 leading-relaxed">
                Double-walled vacuum insulated surgical flasks preserve cryogenic liquid nitrogen for over 24 hours without external power, delivering controlled freeze-thaw cycles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. WORLDWIDE NETWORK & LOGISTICS */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-[#111111] text-white rounded-2xl p-8 sm:p-14 border border-[#222222] shadow-xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 space-y-5">
                <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block">
                  International Supply Chain
                </span>
                <h2 className="text-2xl sm:text-3.5xl font-black tracking-tight leading-tight">
                  Global Air Express Logistics to 50+ Countries
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  Our certified logistics network delivers medical devices with full export documentation, AWB tracking, shockproof crating, and seamless customs clearance across North America, Europe, Middle East, Asia, and Africa.
                </p>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <span className="px-3 py-1.5 bg-[#1c1c1c] rounded-lg text-2xs font-semibold border border-[#2a2a2a] text-neutral-300">
                    🇺🇸 USA (3–5 Days)
                  </span>
                  <span className="px-3 py-1.5 bg-[#1c1c1c] rounded-lg text-2xs font-semibold border border-[#2a2a2a] text-neutral-300">
                    🇬🇧 UK & Europe (3–6 Days)
                  </span>
                  <span className="px-3 py-1.5 bg-[#1c1c1c] rounded-lg text-2xs font-semibold border border-[#2a2a2a] text-neutral-300">
                    🇦🇪 UAE & Gulf (2–4 Days)
                  </span>
                  <span className="px-3 py-1.5 bg-[#1c1c1c] rounded-lg text-2xs font-semibold border border-[#2a2a2a] text-neutral-300">
                    🇮🇳 India (2–4 Days)
                  </span>
                  <span className="px-3 py-1.5 bg-[#1c1c1c] rounded-lg text-2xs font-semibold border border-[#2a2a2a] text-neutral-300">
                    🇿🇦 South Africa (5–8 Days)
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 text-center lg:text-right">
                <Link
                  to="/worldwide-network"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-neutral-200 text-[#111111] font-bold rounded-xl text-xs sm:text-sm shadow-md transition-colors"
                >
                  <Globe size={18} />
                  <span>View Global Network Map</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. CERTIFICATIONS & 9-STAGE QUALITY CONTROL */}
      <section className="py-20 sm:py-28 bg-[#FAFAFA] border-t border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block">
                Quality Assurance Protocols
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                9-Stage Quality Verification Protocol
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                Before any surgical light, table, or therapy generator is approved for international crating, our biomedical engineers execute a 9-stage verification protocol covering component integrity, electrical leakage, acoustic/lux calibration, and thermal burn-in testing.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-2xs font-semibold text-neutral-700">
                <div className="p-3 bg-white border border-[#EAEAEA] rounded-lg">1. Raw Material Spectrometry</div>
                <div className="p-3 bg-white border border-[#EAEAEA] rounded-lg">2. SMD Component Verification</div>
                <div className="p-3 bg-white border border-[#EAEAEA] rounded-lg">3. SMT Soldering Inspection</div>
                <div className="p-3 bg-white border border-[#EAEAEA] rounded-lg">4. High-Pot Electrical Safety</div>
                <div className="p-3 bg-white border border-[#EAEAEA] rounded-lg">5. Functional Lux / Wattage Test</div>
                <div className="p-3 bg-white border border-[#EAEAEA] rounded-lg">6. Thermal Chamber Analysis</div>
                <div className="p-3 bg-white border border-[#EAEAEA] rounded-lg">7. 48-Hour Continuous Burn-In</div>
                <div className="p-3 bg-white border border-[#EAEAEA] rounded-lg">8. Mechanical Load & Articulation</div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 gap-5">
              <div className="p-7 bg-white rounded-xl border border-[#EAEAEA] text-center shadow-2xs">
                <div className="text-3xl font-black text-[#111111] font-mono mb-1.5">ISO 13485</div>
                <div className="text-xs font-bold text-[#111111]">Quality Management</div>
                <p className="text-3xs text-neutral-400 mt-1">Medical Device Manufacturing Directive</p>
              </div>

              <div className="p-7 bg-white rounded-xl border border-[#EAEAEA] text-center shadow-2xs">
                <div className="text-3xl font-black text-[#111111] font-mono mb-1.5">CE 0123</div>
                <div className="text-xs font-bold text-[#111111]">European Conformity</div>
                <p className="text-3xs text-neutral-400 mt-1">Medical Device Regulation Compliant</p>
              </div>

              <div className="p-7 bg-white rounded-xl border border-[#EAEAEA] text-center shadow-2xs">
                <div className="text-3xl font-black text-[#111111] font-mono mb-1.5">IEC 60601</div>
                <div className="text-xs font-bold text-[#111111]">Electrical Safety</div>
                <p className="text-3xs text-neutral-400 mt-1">Medical Electrical Equipment Standards</p>
              </div>

              <div className="p-7 bg-white rounded-xl border border-[#EAEAEA] text-center shadow-2xs">
                <div className="text-3xl font-black text-[#111111] font-mono mb-1.5">5 YEARS</div>
                <div className="text-xs font-bold text-[#111111]">OEM Warranty</div>
                <p className="text-3xs text-neutral-400 mt-1">Direct Manufacturer Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. B2B / INSTITUTIONAL QUOTE CALLOUT */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="border border-[#EAEAEA] bg-[#FAFAFA] rounded-2xl p-8 sm:p-14 text-center max-w-4xl mx-auto space-y-6">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block">
              Equip Entire Hospitals & Clinics
            </span>
            <h2 className="text-2xl sm:text-3.5xl font-black text-[#111111] tracking-tight">
              Institutional B2B Procurement & Tender Support
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 max-w-2xl mx-auto leading-relaxed">
              Are you outfitting a new surgical center, physical therapy clinic, or hospital ward? DR.MEDEX provides factory-direct bulk pricing, customized voltage/plug adaptations, comprehensive tender documentation, and dedicated project management.
            </p>
            <div className="pt-2">
              <Link
                to="/request-quote"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors"
              >
                <FileText size={16} />
                <span>Submit Institutional RFP / Request a Quote</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 11. HOSPITAL & CLINICAL REVIEWS */}
      <section className="py-20 sm:py-28 bg-[#FAFAFA] border-t border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block mb-2">
              Clinical Trust
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              Trusted by Surgeons & Clinical Directors
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-7 rounded-xl border border-[#EAEAEA] shadow-2xs space-y-5">
              <div className="flex text-[#111111]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs text-neutral-600 italic leading-relaxed">
                "The Lumina 700+500 surgical light system exceeded our surgical team's expectations. The depth of illumination during open cardiac surgeries is exceptional, and the cold-light technology prevents surgeon fatigue during 8-hour procedures."
              </p>
              <div className="pt-3 border-t border-[#EAEAEA] flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#111111]">Prof. G. Dupont, Surgical Director</div>
                  <div className="text-3xs text-neutral-400">Hôpital Européen Lyon, France</div>
                </div>
                <span className="text-3xs text-[#145A38] font-semibold px-2.5 py-1 bg-[#EAF5EF] border border-[#1F7A4D]/20 rounded-md">
                  Verified Purchase
                </span>
              </div>
            </div>

            <div className="bg-white p-7 rounded-xl border border-[#EAEAEA] shadow-2xs space-y-5">
              <div className="flex text-[#111111]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs text-neutral-600 italic leading-relaxed">
                "We procured 6 units of the UltraSound Pro 1000 and 4 Radial Shockwave machines for our sports medicine center. The build quality and microprocessor accuracy have provided outstanding therapeutic results for our athletes."
              </p>
              <div className="pt-3 border-t border-[#EAEAEA] flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-[#111111]">Dr. K. Narang, Head of Physical Medicine</div>
                  <div className="text-3xs text-neutral-400">Apollo Specialty Clinics, India</div>
                </div>
                <span className="text-3xs text-[#145A38] font-semibold px-2.5 py-1 bg-[#EAF5EF] border border-[#1F7A4D]/20 rounded-md">
                  Verified Purchase
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. CLINICAL BLOG & EDUCATIONAL RESOURCES */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block mb-2">
                Medical Knowledge
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                Clinical Technology Guides & Resources
              </h2>
            </div>
            <Link
              to="/blog"
              className="mt-2 sm:mt-0 text-xs font-bold text-[#111111] hover:text-[#1F7A4D] flex items-center gap-1.5 transition-colors"
            >
              <span>View All Articles</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {blogs.map((b) => (
              <div
                key={b.id}
                className="group bg-white rounded-xl border border-[#EAEAEA] overflow-hidden hover:border-[#111111] hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-[#FAFAFA] overflow-hidden">
                    <img
                      src={b.image}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <div className="text-3xs font-bold uppercase tracking-wider text-[#1F7A4D] mb-2">
                      {b.category} • {b.readTime}
                    </div>
                    <h3 className="text-xs font-bold text-[#111111] leading-snug line-clamp-2 group-hover:text-[#1F7A4D] transition-colors">
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
                    className="text-xs font-bold text-[#111111] hover:text-[#1F7A4D] flex items-center gap-1.5 transition-colors"
                  >
                    <span>Read Guide</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
