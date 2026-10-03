import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Award,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  FileText
} from "lucide-react";

interface HeroProduct {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  modelCode: string;
  category: string;
  badge: string;
  image: string;
  specs: {
    primaryMetric: string;
    primaryLabel: string;
    secondaryMetric: string;
    secondaryLabel: string;
    tertiaryMetric: string;
    tertiaryLabel: string;
  };
  features: string[];
  description: string;
  priceEstimate: string;
  inStock: boolean;
  accentColor: string;
  associatedProductId?: string;
}

const HERO_PRODUCTS: HeroProduct[] = [
  {
    id: "hero-hex-90-or",
    slug: "ceiling-mounted-led-ot-light-single-dome-hex-design-for-surgical-use",
    title: "MI HEX 90 Ceiling-Mounted LED Surgical OT Suite",
    shortTitle: "MI HEX 90 Surgical Light",
    modelCode: "DRM-OT-HEX90",
    category: "Operating Theatre Illumination",
    badge: "Hospital Flagship",
    image: "/products-hero/ot_light_single_hex.jpg",
    specs: {
      primaryMetric: "160,000",
      primaryLabel: "Lux Output",
      secondaryMetric: "94 RA",
      secondaryLabel: "Color Rendering",
      tertiaryMetric: "< 1°C",
      tertiaryLabel: "Field Temp Rise"
    },
    features: [
      "Aerodynamic hexagonal dome minimizes laminar flow disruption",
      "Endo mode for minimally invasive & laparoscopic surgery",
      "Sterilizable central handle with precision focus control",
      "50,000-hour rated OSRAM medical-grade LED matrix"
    ],
    description:
      "State-of-the-art shadowless surgical lighting engineered with natural daylight LEDs, 360° spring-loaded balance arm, and digital touch console for precision operations.",
    priceEstimate: "$1,650.00",
    inStock: true,
    accentColor: "#1F7A4D",
    associatedProductId: "prod-ot-02"
  },
  {
    id: "hero-es-gen-400",
    slug: "electrosurgical-generator-400w-monopolar-bipolar",
    title: "ElectroPulse 400W High-Frequency Surgical Generator",
    shortTitle: "400W Electrosurgical Unit",
    modelCode: "DRM-ES-GEN400",
    category: "Electrosurgery",
    badge: "Clinical Generator",
    image: "/products-hero/electrosurgical_generator.jpg",
    specs: {
      primaryMetric: "400 W",
      primaryLabel: "Max Cut Power",
      secondaryMetric: "120 W",
      secondaryLabel: "Bipolar Coag",
      tertiaryMetric: "512 kHz",
      tertiaryLabel: "Operating Freq"
    },
    features: [
      "Microprocessor tissue impedance monitoring",
      "Simultaneous dual monopolar & bipolar outputs",
      "Smoke evacuation synchronizer port",
      "Neutral electrode contact quality monitor (CQM)"
    ],
    description:
      "Precision microprocessor electrosurgical unit with automated tissue-sensing feedback, delivering clean cuts with minimal thermal spread.",
    priceEstimate: "$2,850.00",
    inStock: true,
    accentColor: "#1F7A4D",
    associatedProductId: "prod-es-01"
  },
  {
    id: "hero-ot-double-dome",
    slug: "double-dome-led-surgical-ot-light-160k-lux",
    title: "Lumina 700+500 Dual Dome Shadowless OT System",
    shortTitle: "Lumina 700+500 Dual Dome",
    modelCode: "DRM-OT-LUM750",
    category: "Surgical Illumination",
    badge: "Major Surgery Suite",
    image: "/products-hero/ot_light_double_dome.jpg",
    specs: {
      primaryMetric: "160,000",
      primaryLabel: "Major Dome Lux",
      secondaryMetric: "120,000",
      secondaryLabel: "Satellite Lux",
      tertiaryMetric: "3,800-5000K",
      tertiaryLabel: "Color Temp"
    },
    features: [
      "German Ondal-style 360° articulating balance arms",
      "Laparoscopy green Endo-light background mode",
      "Aerodynamic open-ring contour for laminar airflow",
      "Dual touchscreens with synchronized dimming"
    ],
    description:
      "Flagship dual dome surgical illumination for cardiovascular, neurosurgery, and major trauma suites demanding superior depth penetration.",
    priceEstimate: "$2,490.00",
    inStock: true,
    accentColor: "#1F7A4D",
    associatedProductId: "prod-ot-01"
  },
  {
    id: "hero-ot-table-pro",
    slug: "electric-operating-table-universal-surgical",
    title: "OptiCare Multi-Position Electro-Hydraulic Table",
    shortTitle: "Electro-Hydraulic Table",
    modelCode: "DRM-TBL-OPT500",
    category: "Operating Tables",
    badge: "Universal Surgery",
    image: "/products-hero/electric_operating_table.jpg",
    specs: {
      primaryMetric: "350 kg",
      primaryLabel: "Safe Weight Load",
      secondaryMetric: "650-1050",
      secondaryLabel: "Height Adj (mm)",
      tertiaryMetric: "C-Arm",
      tertiaryLabel: "Radiolucent Ready"
    },
    features: [
      "Micro-touch handheld wired remote with auto-leveling return",
      "Built-in multi-axial kidney bridge elevator",
      "Full radiolucent carbon fiber table deck for intraoperative X-ray",
      "Integrated emergency manual hydraulic backup system"
    ],
    description:
      "Heavy-duty hospital operating table with multi-segment articulation, anti-static memory mattress, and seamless C-arm radiolucent coverage.",
    priceEstimate: "$3,650.00",
    inStock: true,
    accentColor: "#1F7A4D",
    associatedProductId: "prod-tbl-01"
  },
  {
    id: "hero-cautery-300",
    slug: "electrosurgical-cautery-unit-300w",
    title: "SurgiCut 300 Compact Electrocautery Unit",
    shortTitle: "300W Cautery System",
    modelCode: "DRM-ES-CAUT300",
    category: "Electrosurgery",
    badge: "Specialty Clinic",
    image: "/products-hero/electrosurgical_generator.jpg",
    specs: {
      primaryMetric: "300 W",
      primaryLabel: "Cut Output",
      secondaryMetric: "100 W",
      secondaryLabel: "Coag Power",
      tertiaryMetric: "IPX8",
      tertiaryLabel: "Waterproof Pedal"
    },
    features: [
      "Pure cut, blend cut, fulguration, and spray coagulation",
      "Independent bipolar micro-coagulation channel",
      "Audible pitch-tone output safety feedback alerts",
      "Medical grade splashproof dual foot switch pedal"
    ],
    description:
      "Reliable 300W electrosurgical cautery machine suited for day-surgery centers, ENT, plastic surgery, and dermatology procedures.",
    priceEstimate: "$1,890.00",
    inStock: true,
    accentColor: "#1F7A4D",
    associatedProductId: "prod-es-02"
  },
  {
    id: "hero-mobile-ot-light",
    slug: "mobile-surgical-ot-light-battery-backup",
    title: "PortaLux Mobile LED Surgical Light with Battery",
    shortTitle: "PortaLux Mobile OT Light",
    modelCode: "DRM-OT-MOB60",
    category: "Surgical Illumination",
    badge: "Emergency & ICU",
    image: "/products-hero/ot_light_single_hex.jpg",
    specs: {
      primaryMetric: "120,000",
      primaryLabel: "Lux Output",
      secondaryMetric: "4 Hours",
      secondaryLabel: "Battery Backup",
      tertiaryMetric: "4 Wheel",
      tertiaryLabel: "Anti-Static Base"
    },
    features: [
      "Four heavy-duty anti-static swivel casters with dual foot brakes",
      "Deep-cycle integrated lithium emergency battery pack",
      "Adjustable spring arm with 180° dome tilt and rotation",
      "Cold-light optical design prevents surgical tissue desiccation"
    ],
    description:
      "Portable hospital-grade surgical illumination with integrated rechargeable battery backup for emergency theaters, trauma rooms, and ICU suites.",
    priceEstimate: "$1,250.00",
    inStock: true,
    accentColor: "#1F7A4D",
    associatedProductId: "prod-ot-03"
  }
];

interface HeroSectionProps {
  onOpenQuote?: (productName?: string) => void;
  onQuickView?: (productId?: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenQuote, onQuickView }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragDeltaX, setDragDeltaX] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const totalItems = HERO_PRODUCTS.length;
  const activeProduct = HERO_PRODUCTS[activeIndex];

  // Auto-rotation (Right -> Left every 4.8 seconds)
  useEffect(() => {
    if (isPaused || isDragging) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalItems);
    }, 4800);

    return () => clearInterval(interval);
  }, [isPaused, isDragging, totalItems]);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % totalItems);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
  };

  // Drag interaction
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    setDragStartX(clientX);
    setDragDeltaX(0);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const delta = clientX - dragStartX;
    setDragDeltaX(delta);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragDeltaX < -50) {
      nextSlide();
    } else if (dragDeltaX > 50) {
      prevSlide();
    }
    setDragDeltaX(0);
  };

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0d0f12] text-white select-none"
      aria-label="DR.MEDEX Medical Equipment Hero Showcase"
    >
      {/* AUTHENTIC HOSPITAL ENVIRONMENT BACKGROUND (Neutral Scrim, Zero Blue) */}
      <div
        className="absolute inset-0 bg-cover bg-center pointer-events-none transition-transform duration-1000 ease-out"
        style={{
          backgroundImage: `url('/hospital-hero-bg.jpg')`,
          transform: `scale(1.02) translateX(${-dragDeltaX * 0.03}px)`
        }}
      >
        {/* Layer 1: Neutral dark scrim for high contrast readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0d0f12] via-[#0d0f12]/85 to-[#0d0f12]/50 lg:via-[#0d0f12]/80 lg:to-[#0d0f12]/30" />

        {/* Layer 2: Top & bottom vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f12] via-transparent to-[#0d0f12]/70" />
      </div>

      {/* Engineering Standards Watermark */}
      <div className="hidden 2xl:flex flex-col text-right absolute right-10 top-36 text-white/20 font-bold text-[11px] tracking-[0.28em] leading-relaxed select-none pointer-events-none z-10 font-mono">
        <span>ISO 13485:2016</span>
        <span>CE MEDICAL COMPLIANT</span>
        <span>GLOBAL SURGICAL STANDARD</span>
        <span>PRECISION FOR LIFE</span>
      </div>

      {/* Main Hero Container with generous spacious padding */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 sm:pt-32 lg:pt-36 pb-20 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          
          {/* LEFT COLUMN: HERO CONTENT */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-6 lg:pr-4">
            
            {/* Live Indicator Pill & Eyebrow */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold tracking-wide text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-[#1F7A4D] animate-pulse" />
              <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-300">
                DR.MEDEX Global Catalog
              </span>
              <span className="w-1 h-1 rounded-full bg-white/40" />
              <span className="text-white font-bold text-[11px]">2026 Edition</span>
            </div>

            {/* Impactful Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] xl:text-[58px] font-black tracking-tight leading-[1.05] text-white uppercase">
              ADVANCED MEDICAL <br />
              <span className="text-[#2E8B57]">TECHNOLOGY</span> FOR <br />
              <span className="text-white">BETTER CARE</span>
            </h1>

            {/* Supporting Text */}
            <p className="text-neutral-300 text-base sm:text-lg max-w-xl leading-relaxed font-normal">
              Precision surgical and clinical equipment engineered for hospitals, outpatient theaters, and medical professionals worldwide. Built for dependable everyday utility and global regulatory compliance.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              {/* Primary CTA (High-contrast white button with black text) */}
              <Link
                to="/shop-all"
                className="px-8 py-4 rounded-full bg-white hover:bg-neutral-100 active:bg-neutral-200 text-neutral-950 text-sm font-bold shadow-lg shadow-black/30 flex items-center gap-2.5 group transition-all duration-200 hover:scale-[1.02] cursor-pointer"
              >
                <span>Explore Products</span>
                <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
              </Link>

              {/* Secondary CTA (Clean transparent with white border) */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenQuote) {
                    onOpenQuote(activeProduct.title);
                  } else {
                    window.location.href = "/request-quote";
                  }
                }}
                className="px-8 py-4 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/5 text-white border border-white/30 hover:border-white text-sm font-bold backdrop-blur-sm flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] cursor-pointer"
              >
                <FileText size={16} className="text-neutral-300" />
                <span>Request a Quote</span>
              </button>
            </div>

            {/* Live Active Product Quick Glance */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 font-mono">
                <span className="flex items-center gap-1.5 text-neutral-300">
                  <Activity size={14} className="text-[#1F7A4D]" />
                  <span>CURRENTLY SHOWCASED:</span>
                </span>
                <span className="text-white font-bold">{activeProduct.modelCode}</span>
              </div>
              <div className="text-sm font-bold text-white line-clamp-1">
                {activeProduct.title}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-neutral-300">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-[#2E8B57]" />
                  <span>{activeProduct.specs.primaryMetric} {activeProduct.specs.primaryLabel}</span>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-[#2E8B57]" />
                  <span>{activeProduct.specs.secondaryMetric} {activeProduct.specs.secondaryLabel}</span>
                </span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="flex items-center gap-6 pt-1 text-neutral-400 text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#1F7A4D] shrink-0" />
                <span>ISO 13485 & CE</span>
              </div>
              <div className="flex items-center gap-2">
                <Award size={16} className="text-white/80 shrink-0" />
                <span>5-Year OEM Warranty</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white font-mono">200+</span>
                <span>Countries Shipped</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: 3D HORIZONTAL PRODUCT CAROUSEL */}
          <div className="lg:col-span-7 xl:col-span-7 relative flex flex-col items-center">
            
            {/* Carousel Stage Container */}
            <div
              ref={containerRef}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseMove={handleTouchMove}
              onMouseUp={handleTouchEnd}
              className="relative w-full h-[480px] sm:h-[530px] flex items-center justify-center cursor-grab active:cursor-grabbing perspective-[1400px]"
            >
              {HERO_PRODUCTS.map((product, index) => {
                let offset = (index - activeIndex + totalItems) % totalItems;
                if (offset > totalItems / 2) {
                  offset -= totalItems;
                }

                const isCenter = offset === 0;
                const isLeft = offset < 0;
                const isRight = offset > 0;
                const absOffset = Math.abs(offset);

                if (absOffset > 2) return null;

                const baseDistance = typeof window !== "undefined" && window.innerWidth < 640 ? 170 : 250;
                const translateX = offset * baseDistance + dragDeltaX * 0.45;
                const translateZ = isCenter ? 40 : -140 * absOffset;
                const rotateY = isCenter ? 0 : isLeft ? 14 : -14;
                const scale = isCenter ? 1.0 : 0.88 - absOffset * 0.05;
                const opacity = isCenter ? 1 : Math.max(0.2, 0.7 - absOffset * 0.25);
                const zIndex = 20 - absOffset * 5;

                return (
                  <div
                    key={product.id}
                    onClick={() => {
                      if (!isCenter) {
                        setActiveIndex(index);
                      }
                    }}
                    style={{
                      transform: `translateX(${translateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                      zIndex,
                      opacity,
                      transition: isDragging
                        ? "none"
                        : "transform 650ms cubic-bezier(0.22, 1, 0.36, 1), opacity 650ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 650ms ease"
                    }}
                    className={`absolute top-1/2 -translate-y-1/2 w-[280px] sm:w-[340px] lg:w-[380px] rounded-3xl overflow-hidden transition-all duration-300 ${
                      isCenter
                        ? "bg-[#16181d]/95 border-2 border-[#1F7A4D] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)] ring-1 ring-[#1F7A4D]/30"
                        : "bg-[#131519]/85 border border-white/10 shadow-2xl hover:border-white/25 cursor-pointer"
                    }`}
                  >
                    {/* Top Panel Header */}
                    <div className="relative px-5 pt-4 pb-2 flex items-center justify-between z-10">
                      <span
                        className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                          isCenter
                            ? "bg-[#1F7A4D] text-white shadow-xs"
                            : "bg-white/10 text-neutral-300"
                        }`}
                      >
                        {product.badge}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2E8B57]" />
                        <span className="text-[11px] font-mono text-neutral-300 font-semibold">
                          {product.modelCode}
                        </span>
                      </div>
                    </div>

                    {/* Product Photograph Area */}
                    <div className="relative w-full h-[230px] sm:h-[260px] bg-gradient-to-b from-white/5 to-transparent flex items-center justify-center p-3 overflow-hidden group">
                      {/* Specular light reflection */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

                      {/* Product Image */}
                      <img
                        src={product.image}
                        alt={product.title}
                        loading={index <= 2 ? "eager" : "lazy"}
                        className={`w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)] transition-transform duration-500 ${
                          isCenter ? "scale-100 group-hover:scale-105" : "scale-95"
                        }`}
                      />

                      {/* Floating Status Tag for Center Featured Model */}
                      {isCenter && (
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 text-white text-xs">
                          <span className="font-semibold text-neutral-200 text-[11px]">
                            {product.category}
                          </span>
                          <span className="text-[#2E8B57] font-black text-xs font-mono">
                            {product.specs.primaryMetric} {product.specs.primaryLabel}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Information Card Area */}
                    <div className="p-5 bg-[#111317] border-t border-white/10 space-y-3">
                      <div>
                        <div className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                          {product.category}
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-white leading-tight line-clamp-1 mt-0.5">
                          {product.title}
                        </h3>
                      </div>

                      {/* Key Technical Specs Grid */}
                      <div className="grid grid-cols-3 gap-2 py-1 text-center bg-white/5 rounded-xl p-2 border border-white/5">
                        <div>
                          <div className="text-white font-black text-xs font-mono">
                            {product.specs.primaryMetric}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-medium">
                            {product.specs.primaryLabel}
                          </div>
                        </div>
                        <div className="border-x border-white/10">
                          <div className="text-white font-black text-xs font-mono">
                            {product.specs.secondaryMetric}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-medium">
                            {product.specs.secondaryLabel}
                          </div>
                        </div>
                        <div>
                          <div className="text-white font-black text-xs font-mono">
                            {product.specs.tertiaryMetric}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-medium">
                            {product.specs.tertiaryLabel}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1">
                        <Link
                          to={`/product/${product.slug}`}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all ${
                            isCenter
                              ? "bg-white hover:bg-neutral-100 text-black shadow-md"
                              : "bg-white/10 hover:bg-white/20 text-white"
                          }`}
                        >
                          <span>View Details</span>
                          <ArrowRight size={13} />
                        </Link>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onOpenQuote) {
                              onOpenQuote(product.title);
                            } else {
                              window.location.href = "/request-quote";
                            }
                          }}
                          className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-neutral-200 hover:text-white border border-white/15 text-xs font-semibold transition-colors"
                          title="Request B2B Quote"
                        >
                          Quote
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CAROUSEL CONTROLS */}
            <div className="relative z-20 flex flex-col items-center gap-3 mt-4 w-full max-w-md">
              <div className="flex items-center justify-between w-full px-4">
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={prevSlide}
                  aria-label="Previous Medical Equipment"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 cursor-pointer shadow-lg"
                >
                  <ChevronLeft size={20} />
                </button>

                {/* Progress Indicators */}
                <div className="flex items-center gap-2">
                  {HERO_PRODUCTS.map((prod, idx) => (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      aria-label={`Go to ${prod.shortTitle}`}
                      className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                        idx === activeIndex
                          ? "w-8 bg-white shadow-xs"
                          : "w-2 bg-white/30 hover:bg-white/50"
                      }`}
                    />
                  ))}
                </div>

                {/* Next Button */}
                <button
                  type="button"
                  onClick={nextSlide}
                  aria-label="Next Medical Equipment"
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all hover:scale-105 cursor-pointer shadow-lg"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Interaction Hint */}
              <div className="text-[11px] text-neutral-400 flex items-center gap-2 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1F7A4D] animate-ping" />
                <span>Drag to explore • Hover to pause • Click side panels</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
