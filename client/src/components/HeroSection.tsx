import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onOpenQuote?: (productTitle?: string) => void;
  onQuickView?: (productId?: string) => void;
}
export const HeroSection: React.FC<HeroSectionProps> = () => {
  return (
    <section
      className="relative w-full overflow-hidden select-none bg-[#0D4C3C] m-0 p-0 border-0 min-h-[600px] sm:min-h-[660px] lg:min-h-[720px] xl:min-h-[740px] flex items-end"
      aria-label="DR.MEDEX Hero Showcase"
    >
      {/* 
        HERO BACKGROUND LAYER WITH FIXED PARALLAX SCROLLING
        The background image stays visually static while scrolling through the hero area,
        while the foreground hero card scrolls upward naturally with the page.
      */}
      <div
        className="hero-fixed-bg absolute inset-0 w-full h-full bg-cover bg-no-repeat bg-[position:top_right] sm:bg-[position:top_center] lg:bg-[position:top_right] sm:bg-fixed pointer-events-none z-0"
        style={{
          backgroundImage: `url('/PNG.png')`,
          backgroundPosition: "top right"
        }}
      />

      {/* 
        SUBTLE READABILITY OVERLAY
        Gentle dark gradient on the left ensuring the content card integrates smoothly
        without washing out, brightening, recoloring, or obscuring the background image.
      */}
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/40 via-black/15 to-transparent z-1"
      />

      {/* HERO CONTENT: FOREGROUND CARD SCROLLS UPWARD NATURALLY WITH PAGE */}
      <div className="relative z-10 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20 pb-0 flex items-end">
        <div className="relative overflow-hidden w-full max-w-[440px] sm:max-w-[470px] lg:max-w-[490px] min-h-[500px] sm:min-h-[540px] lg:min-h-[580px] xl:min-h-[600px] flex flex-col justify-center bg-[#0D4C3C]/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-6 sm:p-8 lg:p-10 xl:p-11 pb-8 sm:pb-10 lg:pb-12 xl:pb-14 shadow-2xl border border-white/10 border-b-0 text-white">
          
          {/* Subtle premium glossy highlight gradient on the upper portion with restrained rounding */}
          <div
            className="absolute inset-x-0 top-0 pointer-events-none bg-gradient-to-b from-white/[0.12] via-white/[0.04] to-transparent border-t border-white/25 rounded-t-xl sm:rounded-t-2xl"
            style={{ height: "42%" }}
          />

          {/* Inner Content with Consistent Vertical Spacing */}
          <div className="relative z-10 flex flex-col items-start gap-5 sm:gap-6 lg:gap-6">
            {/* 1. Eyebrow text at the top */}
            <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#7AA05A]">
              <span className="w-2 h-2 rounded-full bg-[#7AA05A]" />
              <span>TRUSTED MEDICAL EQUIPMENT PARTNER</span>
            </div>

            {/* 2. Main 4-line Heading with increased font size & light-green "Better Care" */}
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] xl:text-[56px] font-black text-white tracking-tight leading-[1.08]">
              <span>Advanced</span>
              <br />
              <span>Medical</span>
              <br />
              <span>Technology for</span>
              <br />
              <span className="text-[#7AA05A]">Better Care</span>
            </h1>

            {/* 3. Supporting 3-line Description on desktop */}
            <p className="text-sm sm:text-[15px] lg:text-base text-white/90 leading-relaxed font-normal max-w-sm">
              Precision-engineered medical equipment{" "}
              <br className="hidden sm:inline" />
              for hospitals, clinics and healthcare{" "}
              <br className="hidden sm:inline" />
              professionals worldwide.
            </p>

            {/* 4. Single CTA Button (Explore Products →) */}
            <div className="pt-1 sm:pt-2">
              <Link
                to="/shop-all"
                className="group inline-flex items-center gap-2.5 px-6 sm:px-7 py-3.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-bold border border-white shadow-lg transition-all duration-200 cursor-pointer"
              >
                <span>Explore Products</span>
                <ArrowRight
                  size={15}
                  className="text-white transition-transform duration-200 ease-out group-hover:translate-x-1.5 shrink-0"
                />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
