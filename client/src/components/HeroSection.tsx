import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Globe, Headphones } from "lucide-react";

interface HeroSectionProps {
  onOpenQuote?: (productTitle?: string) => void;
  onQuickView?: (productId?: string) => void;
}

interface HeroCategoryCard {
  id: string;
  name: string;
  description: string;
  image: string;
  link: string;
}

const HERO_CATEGORY_CARDS: HeroCategoryCard[] = [
  {
    id: "electrosurgical",
    name: "Electrosurgical Units",
    description: "High-performance electrosurgical solutions for safe procedures.",
    image: "/products-hero/electrosurgical_generator.jpg",
    link: "/category/electrosurgical-units"
  },
  {
    id: "cryo-surgical",
    name: "Cryo Surgical",
    description: "Liquid nitrogen sprayers & precision cryo equipment.",
    image: "/products-hero/cryo_surgical_gun.jpg",
    link: "/category/cryo-surgical"
  },
  {
    id: "ot-lights",
    name: "OT Lights",
    description: "Advanced LED OT lights for precise and shadow-free illumination.",
    image: "/products-hero/ot_light_petal.jpg",
    link: "/category/ot-lights"
  },
  {
    id: "ot-tables",
    name: "OT Tables",
    description: "Durable and ergonomic tables for modern surgical & clinical needs.",
    image: "/products-hero/ot_surgical_table.jpg",
    link: "/category/examination-ot-tables"
  },
  {
    id: "obstetrics",
    name: "Obstetrics & Gynae",
    description: "Maternal delivery tables, examination beds and monitoring.",
    image: "/products-hero/examination_table.jpg",
    link: "/category/obstetrics-and-gynaecology"
  }
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenQuote }) => {
  const navigate = useNavigate();

  return (
    <section className="relative w-full overflow-hidden select-none bg-neutral-900" aria-label="DR.MEDEX Hero Showcase">
      {/* 
        HERO CONTAINER WITH 16:9 COMPOSITION AND PROVIDED HOSPITAL IMAGE
        Using the full authentic provided image without distortion.
      */}
      <div
        className="relative w-full bg-cover bg-center overflow-hidden flex flex-col justify-between"
        style={{
          backgroundImage: `url('/hero-bg.png')`,
          minHeight: "clamp(560px, 56.25vw, 760px)"
        }}
      >
        {/* 
          CINEMATIC GRADIENT / FILM OVERLAY
          Strongest on left (100% intensity ~ 0.72 alpha), smoothly reducing towards center/right.
          Zero blue, clean neutral tone.
        */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.60) 28%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.00) 80%)"
          }}
        />

        {/* TOP / MAIN CONTENT ROW (LEFT SIDE ALIGNED) */}
        <div className="relative z-10 max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-20">
          <div className="max-w-xl lg:max-w-2xl space-y-4 sm:space-y-5">
            {/* Small Eyebrow */}
            <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-[0.2em] text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-[#167A4A]" />
              <span>Trusted Medical Equipment Partner</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[52px] font-black tracking-tight leading-[1.08] text-white">
              Advanced Medical <br />
              Technology for <br />
              Better Care
            </h1>

            {/* Supporting Text */}
            <p className="text-xs sm:text-sm md:text-base text-neutral-200/90 max-w-lg leading-relaxed font-normal">
              Precision-engineered medical equipment for hospitals, clinics and healthcare professionals worldwide.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/shop-all"
                className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full bg-[#111111] hover:bg-black text-white text-xs sm:text-sm font-bold shadow-lg transition-all duration-200 group border border-white/20 hover:scale-[1.02]"
              >
                <span>Explore Products</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
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
                className="inline-flex items-center gap-2 px-6 sm:px-7 py-3 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-200 text-xs sm:text-sm font-bold shadow-xs transition-all duration-200 hover:scale-[1.02] cursor-pointer"
              >
                <span>Request a Quote</span>
              </button>
            </div>

            {/* Trust Badges matching reference layout */}
            <div className="flex flex-wrap items-center gap-5 sm:gap-7 pt-4 text-xs font-semibold text-neutral-300">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#167A4A] shrink-0" />
                <span>Reliable Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={18} className="text-[#167A4A] shrink-0" />
                <span>Global Standards</span>
              </div>
              <div className="flex items-center gap-2">
                <Headphones size={18} className="text-[#167A4A] shrink-0" />
                <span>Expert Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* 
          EXACTLY 5 PRODUCT CATEGORY CARDS
          Positioned resting at the lower section of the hero.
          Desktop: Single horizontal row of 5 cards with equal height and spacing.
          Tablet/Mobile: Clean responsive horizontal scroll or grid.
        */}
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 pt-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 xl:gap-4">
            {HERO_CATEGORY_CARDS.map((card) => (
              <Link
                key={card.id}
                to={card.link}
                className="group bg-white rounded-2xl p-4 border border-[#E5E5E5] shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between min-h-[145px] hover:-translate-y-1 hover:border-[#167A4A]/40"
              >
                {/* Upper row: Title + Description */}
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-neutral-900 leading-snug group-hover:text-[#167A4A] transition-colors">
                    {card.name}
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed">
                    {card.description}
                  </p>
                </div>

                {/* Lower row: Green Arrow Icon + Real Product Image */}
                <div className="flex items-end justify-between gap-2 mt-3 pt-2">
                  <div className="w-7 h-7 rounded-full bg-[#167A4A] group-hover:bg-[#13673e] text-white flex items-center justify-center shrink-0 shadow-xs transition-all duration-200 group-hover:scale-105">
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  <div className="w-16 h-14 sm:w-20 sm:h-16 shrink-0 flex items-center justify-center overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80";
                      }}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
