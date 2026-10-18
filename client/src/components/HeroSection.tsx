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
      className="relative w-full overflow-hidden select-none bg-[#0D4C3C] m-0 p-0 border-0"
      aria-label="DR.MEDEX Hero Showcase"
    >
      {/* 
        HERO CONTAINER WITH SUPPLIED MEDICAL EQUIPMENT BACKGROUND IMAGE (PNG.png)
        Starts immediately below the navbar. Cover layout with top positioning
        so the image begins at the navbar's bottom edge and preserves visible equipment.
      */}
      <div
        className="relative w-full bg-cover bg-[position:top_right] sm:bg-[position:top_center] lg:bg-[position:top_right] bg-no-repeat overflow-hidden flex items-end min-h-[600px] sm:min-h-[660px] lg:min-h-[720px] xl:min-h-[740px]"
        style={{
          backgroundImage: `url('/PNG.png')`,
          backgroundPosition: "top right"
        }}
      >
        {/* 
          SUBTLE READABILITY OVERLAY
          Gentle dark gradient on the left ensuring the content card integrates smoothly
          without washing out, brightening, recoloring, or obscuring the background image.
        */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-r from-black/40 via-black/15 to-transparent"
        />

        {/* HERO CONTENT: EXACTLY ONE LEFT-ALIGNED TALL RECTANGULAR PANEL WITH SQUARE CORNERS ATTACHED TO BASE */}
        <div className="relative z-10 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 lg:pt-14 pb-0 flex items-end">
          <div className="w-full max-w-[440px] sm:max-w-[460px] lg:max-w-[470px] min-h-[520px] sm:min-h-[580px] lg:min-h-[640px] xl:min-h-[660px] flex flex-col justify-between bg-[#0D4C3C]/88 backdrop-blur-md rounded-none p-6 sm:p-8 lg:p-9 xl:p-10 pb-8 sm:pb-10 lg:pb-12 xl:pb-14 shadow-2xl border border-white/10 border-b-0 text-white">
            
            {/* Top section: Eyebrow, Heading, Supporting Paragraph */}
            <div>
              {/* Small eyebrow text */}
              <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-[#7AA05A] mb-3 sm:mb-4">
                <span className="w-2 h-2 rounded-full bg-[#7AA05A]" />
                <span>TRUSTED MEDICAL EQUIPMENT PARTNER</span>
              </div>

              {/* Main heading: Balanced lines with bold, premium typography */}
              <h1 className="text-3xl sm:text-4xl lg:text-[40px] font-black text-white tracking-tight leading-[1.12]">
                Advanced Medical<br />
                Technology for<br />
                Better Care
              </h1>

              {/* Supporting paragraph */}
              <p className="text-xs sm:text-sm md:text-[15px] text-white/90 leading-relaxed font-normal mt-4 sm:mt-5 max-w-sm">
                Precision-engineered medical equipment for hospitals, clinics and healthcare professionals worldwide.
              </p>
            </div>

            {/* Bottom section: Single CTA Button (Explore Products →) */}
            <div className="pt-8 sm:pt-10">
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
