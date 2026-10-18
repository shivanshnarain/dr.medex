import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Globe, Headphones } from "lucide-react";

interface HeroSectionProps {
  onOpenQuote?: (productTitle?: string) => void;
  onQuickView?: (productId?: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenQuote }) => {
  const navigate = useNavigate();

  return (
    <section
      className="relative w-full overflow-hidden select-none bg-[#0D4C3C] m-0 p-0 border-0"
      aria-label="DR.MEDEX Hero Showcase"
    >
      {/* 
        HERO CONTAINER WITH SUPPLIED MEDICAL EQUIPMENT BACKGROUND IMAGE
        Using cover layout, sensible background position to preserve the visible medical equipment on the right.
      */}
      <div
        className="relative w-full bg-cover bg-[center_right] sm:bg-center overflow-hidden flex items-center min-h-[580px] sm:min-h-[640px] lg:min-h-[700px] xl:min-h-[720px]"
        style={{
          backgroundImage: `url('/hero-bg.jpg')`
        }}
      >
        {/* 
          SUBTLE READABILITY OVERLAY
          Gentle dark gradient on the left ensuring the content card integrates smoothly
          without washing out, brightening, recoloring, or obscuring the background image.
        */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/45 via-black/20 to-transparent"
        />

        {/* HERO CONTENT: EXACTLY ONE LEFT-ALIGNED CARD (FOLLOWING TRAVEL INSURANCE REFERENCE) */}
        <div className="relative z-10 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          <div className="w-full max-w-xl bg-[#0D4C3C]/85 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 shadow-2xl border border-white/10 text-white">
            
            {/* Small eyebrow text */}
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#7AA05A] mb-3 sm:mb-4">
              <span className="w-2 h-2 rounded-full bg-[#7AA05A]" />
              <span>TRUSTED MEDICAL EQUIPMENT PARTNER</span>
            </div>

            {/* Main heading: Balanced lines with bold, premium typography */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.12]">
              Advanced Medical<br />
              Technology for<br />
              Better Care
            </h1>

            {/* Supporting paragraph */}
            <p className="text-xs sm:text-sm md:text-base text-white/90 leading-relaxed font-normal mt-4 sm:mt-5 max-w-md">
              Precision-engineered medical equipment for hospitals, clinics and healthcare professionals worldwide.
            </p>

            {/* CTA Buttons: Primary (Explore Products →) and Secondary (Request a Quote) */}
            <div className="flex flex-wrap items-center gap-3 pt-6 sm:pt-7">
              <Link
                to="/shop-all"
                className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full bg-white hover:bg-neutral-100 text-[#111111] text-xs sm:text-sm font-bold shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer"
              >
                <span>Explore Products</span>
                <ArrowRight size={15} />
              </Link>

              <button
                type="button"
                onClick={() => {
                  if (onOpenQuote) {
                    onOpenQuote();
                  } else {
                    navigate("/request-quote");
                  }
                }}
                className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full bg-[#7AA05A] hover:bg-[#6e9250] text-white text-xs sm:text-sm font-bold shadow-md transition-all duration-200 hover:scale-[1.02] cursor-pointer border border-[#7AA05A]"
              >
                <span>Request a Quote</span>
              </button>
            </div>

            {/* Trust indicators: Reliable Performance, Global Standards, Expert Support */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-6 sm:pt-7 mt-6 sm:mt-7 border-t border-white/15 text-xs font-semibold text-white/90">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#7AA05A] shrink-0" />
                <span>Reliable Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-[#7AA05A] shrink-0" />
                <span>Global Standards</span>
              </div>
              <div className="flex items-center gap-2">
                <Headphones size={16} className="text-[#7AA05A] shrink-0" />
                <span>Expert Support</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
