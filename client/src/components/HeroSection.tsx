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
    categoryLabel: "ELECTRO SURGICAL EQUIPMENT",
    imageUrl:
      "https://res.cloudinary.com/mjqna8qi/image/upload/v1794563069/dr-medex/hero-showcase/01-electrosurgical-equipment.png",
    fallbackUrl: "/hero-showcase/01-electrosurgical-equipment.png",
    categoryPath: "/category/electrosurgical-units",
  },
  {
    id: "cryosurgical-equipment",
    categoryLabel: "CRYO SURGICAL EQUIPMENT",
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
  const [isTabHidden, setIsTabHidden] = useState(false);
  const manualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preload next image to eliminate flicker during rotation
  useEffect(() => {
    const nextIdx = (activeIndex + 1) % HERO_CATEGORY_SLIDES.length;
    const img = new Image();
    img.src = HERO_CATEGORY_SLIDES[nextIdx].imageUrl;
  }, [activeIndex]);

  // Tab visibility listener to pause/resume cleanly
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabHidden(document.visibilityState === "hidden");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Automatic image rotation: every 3 seconds (3000ms)
  useEffect(() => {
    // Respect prefers-reduced-motion
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    if (isHovered || isManualPause || isTabHidden) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_CATEGORY_SLIDES.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isHovered, isManualPause, isTabHidden]);

  // Manual thumbnail selection: updates immediately and resumes auto-rotation from selected index
  const handleSelectThumbnail = useCallback((index: number) => {
    setActiveIndex(index);
    setIsManualPause(true);
    if (manualTimerRef.current) {
      clearTimeout(manualTimerRef.current);
    }
    // Resume auto-rotation after 4s idle from the selected image
    manualTimerRef.current = setTimeout(() => {
      setIsManualPause(false);
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (manualTimerRef.current) {
        clearTimeout(manualTimerRef.current);
      }
    };
  }, []);

  const activeSlide = HERO_CATEGORY_SLIDES[activeIndex];

  // Exactly 3 secondary images displayed beside main image, cycling sequentially
  const secondaryIndices = [
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
        {/* TWO-COLUMN HERO SECTION: TEXT ON LEFT, SHOWCASE ON RIGHT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-12 items-center">
          
          {/* LEFT COLUMN: HERO CONTENT (ON THE LEFT) */}
          <div className="lg:col-span-5 flex flex-col items-start order-2 lg:order-1">
            {/* Eyebrow text with dark-green text and matching dark-green dot */}
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#2D5A4A] mb-4 sm:mb-5">
              <span className="w-2 h-2 rounded-full bg-[#2D5A4A] shrink-0" />
              <span>TRUSTED MEDICAL EQUIPMENT PARTNER</span>
            </div>

            {/* Main Heading: Consistent font family, weight, and size across all lines */}
            <h1 className="text-4xl sm:text-5xl lg:text-[50px] xl:text-[54px] font-black leading-[1.08] mb-5 sm:mb-6">
              <span
                className="hero-heading-outline inline-block tracking-[0.035em]"
                style={{
                  color: "#FFFFFF",
                  WebkitTextFillColor: "#FFFFFF",
                  WebkitTextStroke: "1.8px #2D5A4A",
                  paintOrder: "stroke fill",
                  strokeLinejoin: "round",
                  strokeMiterlimit: 2,
                  letterSpacing: "0.035em",
                  wordSpacing: "0.1em",
                  textRendering: "geometricPrecision",
                }}
              >
                Advanced
                <br />
                Medical
                <br />
                Technology for
              </span>
              <br />
              <span
                className="text-[#7AA05A] inline-block mt-0.5 tracking-tight"
                style={{ color: "#7AA05A" }}
              >
                Better Care
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-sm sm:text-base lg:text-[17px] text-[#333333] leading-relaxed font-normal max-w-md mb-7 sm:mb-8">
              Precision-engineered medical equipment for hospitals, clinics and healthcare professionals worldwide.
            </p>

            {/* Explore Products CTA Button with white outline and red background */}
            <div>
              <Link
                to="/shop-all"
                className="group inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-[#C62828] hover:bg-[#B71C1C] text-white text-sm sm:text-base font-bold border-2 border-white cta-shadow-enhanced transition-all duration-200 cursor-pointer animate-hero-float"
                style={{ backgroundColor: "#C62828" }}
              >
                <span className="text-white">Explore Products</span>
                <ArrowRight
                  size={17}
                  className="text-white transition-transform duration-200 ease-out group-hover:translate-x-1.5 shrink-0"
                />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: MEDICAL PRODUCT IMAGE SHOWCASE (ON THE RIGHT) */}
          <div
            className="lg:col-span-7 w-full order-1 lg:order-2"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="flex flex-col-reverse sm:flex-row gap-4 sm:gap-6 md:gap-7 lg:gap-8 items-center sm:items-stretch">
              
              {/* THREE SECONDARY THUMBNAILS: CLEAN THUMBNAILS, NO TEXT, NO OVERLAYS, VISIBLE CLEAR SPACING */}
              <div className="relative z-10 flex flex-row sm:flex-col gap-2.5 sm:gap-3.5 md:gap-4 w-full sm:w-[88px] md:w-[96px] lg:w-[104px] shrink-0 justify-between items-center sm:items-stretch">
                {secondaryIndices.map((secIdx) => {
                  const secSlide = HERO_CATEGORY_SLIDES[secIdx];
                  return (
                    <button
                      key={secSlide.id}
                      type="button"
                      onClick={() => handleSelectThumbnail(secIdx)}
                      className="group relative flex-1 sm:flex-none w-full max-w-full aspect-[10/13.8] rounded-lg p-[5px] bg-white border-[1.5px] border-[#2D5A4A] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2D5A4A]/40 transition-all duration-200 select-none shadow-xs hover:shadow-md"
                      aria-label={`View ${secSlide.categoryLabel}`}
                    >
                      <div className="w-full h-full rounded-[4px] overflow-hidden relative">
                        <img
                          src={secSlide.imageUrl}
                          alt={secSlide.categoryLabel}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 rounded-[4px]"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src !== secSlide.fallbackUrl) {
                              target.src = secSlide.fallbackUrl;
                            }
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* LARGE MAIN IMAGE (TO THE RIGHT OF THUMBNAILS): COMPLETELY BORDERLESS & SHADOWLESS */}
              <div className="relative z-0 flex-1 w-full rounded-2xl overflow-hidden group min-h-[340px] sm:min-h-[420px] lg:min-h-[460px] xl:min-h-[480px]">
                
                {/* 6 Crossfading Images */}
                {HERO_CATEGORY_SLIDES.map((slide, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <div
                      key={slide.id}
                      className={`absolute inset-0 transition-opacity duration-500 ease-in-out ${
                        isActive
                          ? "opacity-100 z-10 pointer-events-auto"
                          : "opacity-0 z-0 pointer-events-none"
                      }`}
                      aria-hidden={!isActive}
                    >
                      <img
                        src={slide.imageUrl}
                        alt={slide.categoryLabel}
                        className="w-full h-full object-cover select-none"
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

                {/* Subtle localized gradient ONLY behind upper-left category text */}
                <div
                  className="absolute top-0 left-0 w-64 max-w-[60%] h-20 pointer-events-none z-10 rounded-tl-2xl"
                  style={{
                    background:
                      "radial-gradient(ellipse at top left, rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.12) 40%, rgba(255, 255, 255, 0) 75%)",
                  }}
                />

                {/* Category Name: Light green matching the DR.MEDEX logo text (MEDEX) */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none">
                  <span
                    className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#7AA05A]"
                    style={{ color: "#7AA05A" }}
                  >
                    {activeSlide.categoryLabel}
                  </span>
                </div>

                {/* View Category Link: Bottom-Right, Pure White Text & Arrow, NO red, NO shadow, NO button/box */}
                <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-20">
                  <Link
                    to={activeSlide.categoryPath}
                    className="group/link inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white hover:text-white/85 transition-all duration-200 hover:underline"
                  >
                    <span>View Category</span>
                    <ArrowRight
                      size={14}
                      className="text-white group-hover/link:translate-x-1 transition-transform"
                    />
                  </Link>
                </div>

              </div>

            </div>
          </div>

        </div>

        {/* THREE BENEFIT CARDS DIRECTLY BELOW THE HERO: CONTINUOUS DARK-GREEN BG, SQUARE EDGES, CRISP WHITE SEPARATORS */}
        <div className="mt-12 sm:mt-16 lg:mt-20 bg-[#2D5A4A] rounded-none overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y-2 md:divide-y-0 md:divide-x-2 divide-white">
          
          {/* Card 1 */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#2D5A4A]">
            <div>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 mb-4 sm:mb-5 shadow-xs">
                <ShieldCheck size={26} className="text-[#F4B400]" style={{ color: "#F4B400" }} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Trusted Medical Equipment
              </h3>
              <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                Reliable medical equipment designed to support hospitals, clinics and healthcare professionals with confidence.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#2D5A4A]">
            <div>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 mb-4 sm:mb-5 shadow-xs">
                <Cpu size={26} className="text-[#F4B400]" style={{ color: "#F4B400" }} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Advanced Medical Technology
              </h3>
              <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                Explore precision-engineered medical solutions built for modern healthcare environments and clinical requirements.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#2D5A4A]">
            <div>
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 mb-4 sm:mb-5 shadow-xs">
                <Award size={26} className="text-[#F4B400]" style={{ color: "#F4B400" }} />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Healthcare Excellence
              </h3>
              <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                Supporting healthcare professionals with dependable equipment, professional service and quality-focused solutions.
              </p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
