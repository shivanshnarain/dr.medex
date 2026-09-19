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
  Award,
  Globe,
  Truck,
  CheckCircle2,
  FileText,
  Clock,
  Wrench,
  Headphones,
  Star,
  Quote
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { Product, Category, BlogArticle } from "../types";
import { ProductCard } from "../components/ProductCard";
import { QuickViewModal } from "../components/QuickViewModal";
import { B2BQuoteModal } from "../components/B2BQuoteModal";

export const HomePage: React.FC = () => {
  const { currentCountry, currentCurrency, formatPrice } = useCurrency();

  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      case "Activity": return <Activity className="text-sky-600" size={24} />;
      case "Zap": return <Zap className="text-amber-500" size={24} />;
      case "ThermometerSnowflake": return <ThermometerSnowflake className="text-cyan-500" size={24} />;
      case "Sun": return <Sun className="text-amber-500" size={24} />;
      case "Bed": return <Bed className="text-blue-600" size={24} />;
      case "HeartPulse": return <HeartPulse className="text-rose-500" size={24} />;
      default: return <Activity className="text-sky-600" size={24} />;
    }
  };

  return (
    <div className="w-full bg-white">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50/60 via-white to-white py-14 sm:py-20 border-b border-slate-100">
        <div className="absolute inset-0 bg-medical-grid pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-900 text-xs font-bold tracking-wide">
                <ShieldCheck size={16} className="text-sky-700" />
                <span>OEM Certified Medical Technology & Global Supplier</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-5.5xl font-black text-slate-900 tracking-tight leading-tight">
                Global Medical Equipment & <span className="text-sky-700">Advanced Healthcare</span> Technology
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Precision engineering for operating rooms, physical therapy centers, and clinical facilities worldwide. Sourced directly from our ISO 13485:2016 manufacturing hubs with international air-freight and localized currency settlement.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link
                  to="/shop-all"
                  className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 transition-all hover:scale-[1.02]"
                >
                  <span>Explore Equipment Catalog</span>
                  <ArrowRight size={16} />
                </Link>

                <Link
                  to="/request-quote"
                  className="w-full sm:w-auto px-8 py-3.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <FileText size={16} className="text-sky-700" />
                  <span>Request Institutional B2B Quote</span>
                </Link>
              </div>

              {/* Live Trust Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-200/80">
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-slate-900 font-mono">50+</div>
                  <div className="text-3xs font-semibold uppercase tracking-wider text-slate-500">Countries Served</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-sky-700 font-mono">15,000+</div>
                  <div className="text-3xs font-semibold uppercase tracking-wider text-slate-500">Installed Units</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-slate-900 font-mono">99.8%</div>
                  <div className="text-3xs font-semibold uppercase tracking-wider text-slate-500">Clinical Reliability</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl font-black text-emerald-600 font-mono">5-Year</div>
                  <div className="text-3xs font-semibold uppercase tracking-wider text-slate-500">OEM Warranty</div>
                </div>
              </div>
            </div>

            {/* Right Hero Visual Column */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Hero Main Card */}
                <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-2xl p-4">
                  <img
                    src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80"
                    alt="Operating Theatre Illumination"
                    className="w-full h-80 object-cover rounded-2xl"
                  />

                  {/* Floating Medical Feature Tag */}
                  <div className="mt-4 p-3 bg-sky-50/80 rounded-xl border border-sky-100 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                        <Sun size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">MediCuro Lumina 700/500</div>
                        <div className="text-3xs text-slate-500 font-medium">160,000 Lux Shadowless LED</div>
                      </div>
                    </div>
                    <Link
                      to="/product/double-dome-led-surgical-ot-light-160k-lux"
                      className="text-xs font-bold text-sky-700 hover:text-sky-900"
                    >
                      View Specs →
                    </Link>
                  </div>
                </div>

                {/* Floating Trust Badge */}
                <div className="absolute -bottom-6 -left-6 bg-slate-900 text-white p-4 rounded-2xl shadow-xl hidden sm:flex items-center gap-3 border border-slate-800">
                  <ShieldCheck size={28} className="text-sky-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">ISO 13485:2016 Certified</div>
                    <div className="text-3xs text-slate-400">Medical Device Quality Management</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PRIMARY MEDICAL CATEGORIES */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-700 block mb-1">
                Medical Product Taxonomy
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Core Equipment Categories
              </h2>
            </div>
            <Link
              to="/shop-all"
              className="mt-3 sm:mt-0 text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
            >
              <span>Explore All Products</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="group relative bg-slate-50/50 hover:bg-white rounded-2xl border border-slate-200/80 hover:border-sky-300 p-6 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform mb-4">
                    {getCategoryIcon(cat.icon)}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {cat.shortDescription}
                  </p>

                  {/* Subcategories list snippet */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1.5">
                    {cat.subcategories.slice(0, 3).map((sub) => (
                      <Link
                        key={sub.id}
                        to={`/shop-all?subcategory=${sub.slug}`}
                        className="block text-2xs text-slate-600 hover:text-sky-700 font-medium truncate"
                      >
                        • {sub.name}
                      </Link>
                    ))}
                    {cat.subcategories.length > 3 && (
                      <span className="text-3xs text-sky-600 font-semibold block">
                        +{cat.subcategories.length - 3} more sub-specialties
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/shop-all?category=${cat.slug}`}
                    className="text-xs font-bold text-slate-900 group-hover:text-sky-700 flex items-center gap-1"
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
      <section className="py-16 bg-sky-50/40 border-y border-sky-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-5">
              <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-700 block">
                Physical Medicine & Orthopedics
              </span>
              <h2 className="text-2xl sm:text-3.5xl font-black text-slate-900 tracking-tight leading-tight">
                Advanced Physiotherapy & Clinical Rehabilitation Systems
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                From high-power Class 4 cold lasers to dual-frequency ultrasound and ballistic radial shockwave generators, MediCuro delivers non-invasive therapeutic solutions for accelerated musculoskeletal healing.
              </p>

              <div className="space-y-2.5 pt-1 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
                  <span>Dual 1 MHz & 3 MHz Ultrasound with IPX7 waterproof soundheads</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
                  <span>Pneumatic Radial Shockwave up to 5.0 Bar for chronic calcifications</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-sky-600 shrink-0" />
                  <span>Continuous Passive Motion (CPM) for total knee rehabilitation</span>
                </div>
              </div>

              <div className="pt-3">
                <Link
                  to="/shop-all?category=physiotherapy"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  <span>Explore Physiotherapy Range</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-700 block mb-1">
                Precision Engineering
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Featured Medical Devices
              </h2>
            </div>
            <div className="mt-2 sm:mt-0 text-xs text-slate-500">
              Settlement in <strong>{currentCurrency} ({currentCountry.name})</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <section className="py-16 bg-slate-950 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-400 block">
                Surgical Illumination Standards
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Shadowless Operating Theatre Illumination: 160,000 Lux Precision
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                MediCuro surgical lights integrate multi-faceted optical lenses and German counterbalance articulation to deliver uniform deep-cavity light fields with CRI ≥ 96, zero thermal rise at the surgeon's cranial level, and dedicated laparoscopic Endo-lighting.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <div className="text-lg font-black text-sky-400 font-mono">160,000 Lux</div>
                  <div className="text-3xs text-slate-400 uppercase font-semibold">Maximum Field Illumination</div>
                </div>
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <div className="text-lg font-black text-sky-400 font-mono">≥ 96 CRI (Ra)</div>
                  <div className="text-3xs text-slate-400 uppercase font-semibold">Color Differentiation</div>
                </div>
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <div className="text-lg font-black text-sky-400 font-mono">&lt; 1°C</div>
                  <div className="text-3xs text-slate-400 uppercase font-semibold">Cold Light Temperature Rise</div>
                </div>
                <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                  <div className="text-lg font-black text-sky-400 font-mono">60,000+ Hrs</div>
                  <div className="text-3xs text-slate-400 uppercase font-semibold">Solid-State LED Lifespan</div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Link
                  to="/shop-all?category=ot-lights"
                  className="px-6 py-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Explore Surgical Lights
                </Link>
                <Link
                  to="/request-quote"
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Request OR Illumination Tender
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
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
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-700 block mb-1">
                Hospital Procurement Favorites
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Best Selling Medical Equipment
              </h2>
            </div>
            <Link
              to="/shop-all"
              className="mt-2 sm:mt-0 text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
            >
              <span>View Full Inventory</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <section className="py-16 bg-slate-50 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-700 block mb-1">
              Engineering Architecture
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Medical Technology & Innovation Pillars
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Every medical device is subjected to rigorous biomedical verification and electronic isolation protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center mb-4">
                <Sun size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Shadowless Optical Design
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Computer-simulated faceted lenses converge multiple light beams into a continuous surgical column, eliminating visual dead zones even during deep abdominal interventions.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Zap size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Micro-Feedback RF Generators
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Instant tissue-impedance sensing circuitry samples electrical resistance 5,000 times per second, automatically adjusting RF wattage to minimize lateral thermal margin damage.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center mb-4">
                <ThermometerSnowflake size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                -196°C Vacuum Cryogenics
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Double-walled vacuum insulated surgical flasks preserve cryogenic liquid nitrogen for over 24 hours without external power, delivering controlled freeze-thaw cycles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. WORLDWIDE NETWORK & LOGISTICS */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-tr from-slate-900 via-slate-800 to-sky-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 space-y-4">
                <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-400 block">
                  International Supply Chain
                </span>
                <h2 className="text-2xl sm:text-3.5xl font-black tracking-tight leading-tight">
                  Global Air Express Logistics to 50+ Countries
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Our certified logistics network delivers medical devices with full export documentation, AWB tracking, shockproof crating, and seamless customs clearance across North America, Europe, Middle East, Asia, and Africa.
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1 bg-slate-800/80 rounded-lg text-2xs font-semibold border border-slate-700">
                    🇺🇸 USA (3–5 Days)
                  </span>
                  <span className="px-3 py-1 bg-slate-800/80 rounded-lg text-2xs font-semibold border border-slate-700">
                    🇬🇧 UK & Europe (3–6 Days)
                  </span>
                  <span className="px-3 py-1 bg-slate-800/80 rounded-lg text-2xs font-semibold border border-slate-700">
                    🇦🇪 UAE & Gulf (2–4 Days)
                  </span>
                  <span className="px-3 py-1 bg-slate-800/80 rounded-lg text-2xs font-semibold border border-slate-700">
                    🇮🇳 India (2–4 Days)
                  </span>
                  <span className="px-3 py-1 bg-slate-800/80 rounded-lg text-2xs font-semibold border border-slate-700">
                    🇿🇦 South Africa (5–8 Days)
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 text-center lg:text-right">
                <Link
                  to="/worldwide-network"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-xl transition-colors"
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
      <section className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-700 block">
                Quality Assurance Protocols
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                9-Stage Quality Verification Protocol
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Before any surgical light, table, or therapy generator is approved for international crating, our biomedical engineers execute a 9-stage verification protocol covering component integrity, electrical leakage, acoustic/lux calibration, and thermal burn-in testing.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-2xs font-semibold text-slate-700">
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">1. Raw Material Spectrometry</div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">2. SMD Component Verification</div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">3. SMT Soldering Inspection</div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">4. High-Pot Electrical Safety</div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">5. Functional Lux / Wattage Test</div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">6. Thermal Chamber Analysis</div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">7. 48-Hour Continuous Burn-In</div>
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg">8. Mechanical Load & Articulation</div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <div className="text-3xl font-black text-sky-700 font-mono mb-1">ISO 13485</div>
                <div className="text-xs font-bold text-slate-800">Quality Management</div>
                <p className="text-3xs text-slate-400 mt-1">Medical Device Manufacturing Directive</p>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <div className="text-3xl font-black text-sky-700 font-mono mb-1">CE 0123</div>
                <div className="text-xs font-bold text-slate-800">European Conformity</div>
                <p className="text-3xs text-slate-400 mt-1">Medical Device Regulation Compliant</p>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <div className="text-3xl font-black text-sky-700 font-mono mb-1">IEC 60601</div>
                <div className="text-xs font-bold text-slate-800">Electrical Safety</div>
                <p className="text-3xs text-slate-400 mt-1">Medical Electrical Equipment Standards</p>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center shadow-xs">
                <div className="text-3xl font-black text-sky-700 font-mono mb-1">5 YEARS</div>
                <div className="text-xs font-bold text-slate-800">OEM Warranty</div>
                <p className="text-3xs text-slate-400 mt-1">Direct Manufacturer Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 10. B2B / INSTITUTIONAL QUOTE CALLOUT */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-sky-50 rounded-3xl p-8 sm:p-12 shadow-sm text-center max-w-4xl mx-auto space-y-5">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-700 block">
              Equip Entire Hospitals & Clinics
            </span>
            <h2 className="text-2xl sm:text-3.5xl font-black text-slate-900 tracking-tight">
              Institutional B2B Procurement & Tender Support
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Are you outfitting a new surgical center, physical therapy clinic, or hospital ward? MediCuro provides factory-direct bulk pricing, customized voltage/plug adaptations, comprehensive tender documentation, and dedicated project management.
            </p>
            <div className="pt-2">
              <Link
                to="/request-quote"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-sky-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors"
              >
                <FileText size={16} />
                <span>Submit Institutional RFP / Request a Quote</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 11. HOSPITAL & CLINICAL REVIEWS */}
      <section className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-700 block mb-1">
              Clinical Trust
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Trusted by Surgeons & Clinical Directors
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                "The Lumina 700+500 surgical light system exceeded our surgical team's expectations. The depth of illumination during open cardiac surgeries is exceptional, and the cold-light technology prevents surgeon fatigue during 8-hour procedures."
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">Prof. G. Dupont, Surgical Director</div>
                  <div className="text-3xs text-slate-400">Hôpital Européen Lyon, France</div>
                </div>
                <span className="text-3xs text-emerald-600 font-semibold px-2 py-0.5 bg-emerald-50 rounded-md">
                  Verified Purchase
                </span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs text-slate-600 italic leading-relaxed">
                "We procured 6 units of the UltraSound Pro 1000 and 4 Radial Shockwave machines for our sports medicine center. The build quality and microprocessor accuracy have provided outstanding therapeutic results for our athletes."
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">Dr. K. Narang, Head of Physical Medicine</div>
                  <div className="text-3xs text-slate-400">Apollo Specialty Clinics, India</div>
                </div>
                <span className="text-3xs text-emerald-600 font-semibold px-2 py-0.5 bg-emerald-50 rounded-md">
                  Verified Purchase
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. CLINICAL BLOG & EDUCATIONAL RESOURCES */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
            <div>
              <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-700 block mb-1">
                Medical Knowledge
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Clinical Technology Guides & Resources
              </h2>
            </div>
            <Link
              to="/blog"
              className="mt-2 sm:mt-0 text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
            >
              <span>View All Articles</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {blogs.map((b) => (
              <div
                key={b.id}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-slate-100 overflow-hidden">
                    <img
                      src={b.image}
                      alt={b.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5">
                    <div className="text-3xs font-bold uppercase tracking-wider text-sky-700 mb-1.5">
                      {b.category} • {b.readTime}
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-sky-700 transition-colors">
                      <Link to={`/blog/${b.slug}`}>{b.title}</Link>
                    </h3>
                    <p className="text-2xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {b.excerpt}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-0">
                  <Link
                    to={`/blog/${b.slug}`}
                    className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1"
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
