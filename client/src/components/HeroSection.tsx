import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Cpu, Award } from "lucide-react";

interface HeroSectionProps {
  onOpenQuote?: (productTitle?: string) => void;
  onQuickView?: (productId?: string) => void;
}

interface HeroCategorySlide {
  id: string;
  categoryLabel: string;
  imageUrl: string;
  fallbackUrl: string;
  categoryPath: string;
}

const HERO_CATEGORY_SLIDES: HeroCategorySlide[] = [
  {
    id: "electrosurgical-equipment",
    categoryLabel: "ELECTROSURGICAL EQUIPMENT",
    imageUrl:
      "https://res.cloudinary.com/mjqna8qi/image/upload/v1794563069/dr-medex/hero-showcase/01-electrosurgical-equipment.png",
    fallbackUrl: "/hero-showcase/01-electrosurgical-equipment.png",
    categoryPath: "/category/electrosurgical-units",
  },
  {
    id: "cryosurgical-equipment",
    categoryLabel: "CRYOSURGICAL EQUIPMENT",
    imageUrl:
      "https://res.cloudinary.com/mjqna8qi/image/upload/v1794563071/dr-medex/hero-showcase/02-cryosurgical-equipment.png",
    fallbackUrl: "/hero-showcase/02-cryosurgical-equipment.png",
    categoryPath: "/category/cryo-surgical",
  },
  {
    id: "ot-lights-equipment",
    categoryLabel: "OT LIGHTS EQUIPMENT",
    imageUrl:
      "https://res.cloudinary.com/mjqna8qi/image/upload/v1794563085/dr-medex/hero-showcase/03-ot-lights-equipment.png",
    fallbackUrl: "/hero-showcase/03-ot-lights-equipment.png",
    categoryPath: "/category/ot-lights",
  },
  {
    id: "ot-tables-equipment",
    categoryLabel: "OT TABLES EQUIPMENT",
    imageUrl:
      "https://res.cloudinary.com/mjqna8qi/image/upload/v1794563104/dr-medex/hero-showcase/04-ot-tables-equipment.png",
    fallbackUrl: "/hero-showcase/04-ot-tables-equipment.png",
    categoryPath: "/category/examination-ot-tables",
  },
  {
    id: "obg-equipment",
    categoryLabel: "OBG EQUIPMENT",
    imageUrl:
      "https://res.cloudinary.com/mjqna8qi/image/upload/v1794563111/dr-medex/hero-showcase/05-obg-equipment.png",
    fallbackUrl: "/hero-showcase/05-obg-equipment.png",
    categoryPath: "/category/obstetrics-and-gynaecology",
  },
  {
    id: "general-medical-equipment",
    categoryLabel: "GENERAL MEDICAL EQUIPMENT",
    imageUrl:
      "https://res.cloudinary.com/mjqna8qi/image/upload/v1794563133/dr-medex/hero-showcase/06-general-medical-equipment.png",
    fallbackUrl: "/hero-showcase/06-general-medical-equipment.png",
    categoryPath: "/category/medical-equipment",
  },
];

export const HeroSection: React.FC<HeroSectionProps> = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isManualPause, setIsManualPause] = useState(false);
  const manualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto rotation timer
  useEffect(() => {
    // Respect prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    if (isHovered || isManualPause) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_CATEGORY_SLIDES.length);
    }, 4800);

    return () => clearInterval(interval);
  }, [isHovered, isManualPause]);

  const handleSelectThumbnail = useCallback((index: number) => {
    setActiveIndex(index);
    setIsManualPause(true);
    if (manualTimerRef.current) {
      clearTimeout(manualTimerRef.current);
    }
    // Resume auto-rotation after 7s idle
    manualTimerRef.current = setTimeout(() => {
      setIsManualPause(false);
    }, 7000);
  }, []);

  useEffect(() => {
    return () => {
      if (manualTimerRef.current) {
        clearTimeout(manualTimerRef.current);
      }
    };
  }, []);

  const activeSlide = HERO_CATEGORY_SLIDES[activeIndex];

  // 3 smaller thumbnails displayed at a time, cycling through remaining items
  const visibleThumbnailIndices = [
    (activeIndex + 1) % HERO_CATEGORY_SLIDES.length,
    (activeIndex + 2) % HERO_CATEGORY_SLIDES.length,
    (activeIndex + 3) % HERO_CATEGORY_SLIDES.length,
  ];

  return (
    <section
      className="relative w-full bg-white select-none pt-8 sm:pt-12 lg:pt-14 pb-12 sm:pb-16"
      aria-label="DR.MEDEX Hero Showcase"
    >
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* TWO-COLUMN HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
          
          {/* LEFT COLUMN: HERO CONTENT (PRESERVED EXACTLY) */}
          <div className="lg:col-span-5 flex flex-col items-start">
            {/* Eyebrow text */}
            <div className="inline-flex items-center gap-2 text-xs sm:text-xs font-bold uppercase tracking-[0.18em] text-[#7AA05A] mb-4 sm:mb-5">
              <span className="w-2 h-2 rounded-full bg-[#7AA05A] shrink-0" />
              <span>TRUSTED MEDICAL EQUIPMENT PARTNER</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] xl:text-[56px] font-black text-[#111111] tracking-tight leading-[1.08] mb-5 sm:mb-6">
              Advanced
              <br />
              Medical
              <br />
              Technology for
              <br />
              <span className="text-[#7AA05A]" style={{ color: "#7AA05A" }}>
                Better Care
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-sm sm:text-base lg:text-[17px] text-[#333333] leading-relaxed font-normal max-w-md mb-7 sm:mb-8">
              Precision-engineered medical equipment for hospitals, clinics and healthcare professionals worldwide.
            </p>

            {/* Explore Products CTA Button */}
            <div>
              <Link
                to="/shop-all"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#C62828] hover:bg-[#B71C1C] text-white text-sm sm:text-base font-bold border-2 border-white shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer animate-hero-float"
                style={{ backgroundColor: "#C62828" }}
              >
                <span>Explore Products</span>
                <ArrowRight
                  size={17}
                  className="text-white transition-transform duration-200 ease-out group-hover:translate-x-1.5 shrink-0"
                />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: HERO PRODUCT SHOWCASE (UPDATED WITH 6 USER IMAGES & LABELS) */}
          <div
            className="lg:col-span-7 w-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch">
              
              {/* LARGE PRIMARY IMAGE CONTAINER */}
              <div className="relative flex-1 bg-[#F8F9FA] rounded-2xl border border-neutral-200/90 overflow-hidden min-h-[320px] sm:min-h-[420px] lg:min-h-[460px] xl:min-h-[480px] flex items-center justify-center p-6 sm:p-8">
                
                {/* Top Badge: Category Label (NO slide counter) */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="inline-flex items-center px-3.5 py-1.5 rounded-full text-[11px] sm:text-xs font-extrabold uppercase tracking-wider bg-white/95 backdrop-blur-xs text-[#2D5A4A] border border-[#2D5A4A]/25 shadow-xs">
                    {activeSlide.categoryLabel}
                  </span>
                </div>

                {/* Stack of 6 Crossfade Images (Exact 6 provided images, object-contain, no distortion) */}
                <div className="relative w-full h-[240px] sm:h-[320px] lg:h-[360px] flex items-center justify-center">
                  {HERO_CATEGORY_SLIDES.map((slide, idx) => {
                    const isActive = idx === activeIndex;
                    return (
                      <div
                        key={slide.id}
                        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out ${
                          isActive
                            ? "opacity-100 z-10 pointer-events-auto"
                            : "opacity-0 z-0 pointer-events-none"
                        }`}
                        aria-hidden={!isActive}
                      >
                        <img
                          src={slide.imageUrl}
                          alt={slide.categoryLabel}
                          className="max-h-full max-w-full object-contain drop-shadow-sm select-none"
                          loading={idx === 0 ? "eager" : "lazy"}
                          decoding="async"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== slide.fallbackUrl) {
                              target.src = slide.fallbackUrl;
                            }
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Caption Bar: Category Label & View Category Action (NO individual product names) */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-white via-white/90 to-transparent p-4 sm:p-5 pt-8 z-20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="truncate">
                    <span className="text-xs sm:text-sm font-extrabold text-[#111111] uppercase tracking-wider block truncate">
                      {activeSlide.categoryLabel}
                    </span>
                  </div>
                  <Link
                    to={activeSlide.categoryPath}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#2D5A4A] hover:text-[#1F3F34] hover:underline shrink-0 group transition-colors"
                  >
                    <span>View Category</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* THREE THUMBNAILS (VERTICAL ON SM+, HORIZONTAL ON MOBILE) */}
              <div className="flex flex-row sm:flex-col gap-2.5 sm:gap-3 w-full sm:w-28 md:w-32 lg:w-36 shrink-0 justify-between">
                {visibleThumbnailIndices.map((thumbIdx) => {
                  const thumbSlide = HERO_CATEGORY_SLIDES[thumbIdx];
                  return (
                    <button
                      key={thumbSlide.id}
                      type="button"
                      onClick={() => handleSelectThumbnail(thumbIdx)}
                      className="group relative flex-1 flex flex-col items-center justify-center p-2 sm:p-2.5 bg-[#F8F9FA] hover:bg-[#F0F2F1] rounded-xl border border-neutral-200/90 hover:border-[#2D5A4A]/50 transition-all cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#2D5A4A]/30"
                      aria-label={`View ${thumbSlide.categoryLabel}`}
                    >
                      <div className="w-full h-14 sm:h-20 lg:h-22 flex items-center justify-center mb-1 overflow-hidden">
                        <img
                          src={thumbSlide.imageUrl}
                          alt={thumbSlide.categoryLabel}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== thumbSlide.fallbackUrl) {
                              target.src = thumbSlide.fallbackUrl;
                            }
                          }}
                        />
                      </div>
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-700 group-hover:text-[#2D5A4A] text-center line-clamp-1 w-full block transition-colors">
                        {thumbSlide.categoryLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>

        </div>

        {/* THREE FEATURE CARDS DIRECTLY BELOW THE HERO (PRESERVED EXACTLY) */}
        <div className="mt-12 sm:mt-16 lg:mt-20 bg-[#2D5A4A] rounded-2xl overflow-hidden shadow-xs grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-white/20">
          
          {/* Card 1 */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 mb-4 sm:mb-5 shadow-xs">
                <ShieldCheck size={26} className="text-[#F4B400]" style={{ color: "#F4B400" }} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Trusted Medical Equipment
              </h3>
              <p className="text-white/85 text-xs sm:text-sm leading-relaxed">
                Reliable medical equipment designed to support hospitals, clinics and healthcare professionals with confidence.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 mb-4 sm:mb-5 shadow-xs">
                <Cpu size={26} className="text-[#F4B400]" style={{ color: "#F4B400" }} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Advanced Medical Technology
              </h3>
              <p className="text-white/85 text-xs sm:text-sm leading-relaxed">
                Explore precision-engineered medical solutions built for modern healthcare environments and clinical requirements.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 mb-4 sm:mb-5 shadow-xs">
                <Award size={26} className="text-[#F4B400]" style={{ color: "#F4B400" }} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Healthcare Excellence
              </h3>
              <p className="text-white/85 text-xs sm:text-sm leading-relaxed">
                Supporting healthcare professionals with dependable equipment, professional service and quality-focused solutions.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
