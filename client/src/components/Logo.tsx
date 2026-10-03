import React from "react";
import { Link } from "react-router-dom";

interface LogoProps {
  variant?: "dark-bg" | "light-bg";
  className?: string;
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = "dark-bg",
  className = "",
  showTagline = true,
}) => {
  const isLightBg = variant === "light-bg";

  return (
    <Link to="/" className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {/* Precision Medical Cross Icon */}
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center rounded-xl overflow-hidden shadow-md shadow-black/10 group-hover:scale-105 transition-transform duration-200">
        <svg viewBox="0 0 40 40" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Base rounded square */}
          <rect width="40" height="40" rx="10" fill="#111111" />

          {/* Symmetrical Layered Medical Cross */}
          {/* Vertical stem */}
          <rect x="16" y="7" width="8" height="26" rx="2.5" fill="#FFFFFF" />
          {/* Horizontal crossbar */}
          <rect x="7" y="16" width="26" height="8" rx="2.5" fill="#FFFFFF" />

          {/* Red Accent on Core Cross - Brand Identity */}
          <rect x="17.5" y="8.5" width="5" height="11" rx="1.5" fill="#EF4444" />
          <rect x="8.5" y="17.5" width="11" height="5" rx="1.5" fill="#EF4444" />

          {/* Medical Technology Center Accent */}
          <rect x="17.5" y="17.5" width="5" height="5" rx="1" fill="#1F7A4D" />
          <circle cx="20" cy="20" r="1.5" fill="#FFFFFF" />
        </svg>
      </div>

      {/* DR.MEDEX Wordmark */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline tracking-tight font-black text-xl sm:text-2xl">
          <span className="text-[#EF4444] transition-colors">DR.</span>
          <span className={`${isLightBg ? "text-[#111111]" : "text-white"} transition-colors tracking-wide`}>
            MEDEX
          </span>
        </div>
        {showTagline && (
          <span
            className={`text-[8px] sm:text-[9px] font-bold tracking-[0.18em] uppercase mt-1 ${
              isLightBg ? "text-neutral-500" : "text-neutral-400"
            }`}
          >
            ADVANCING HEALTHCARE GLOBALLY
          </span>
        )}
      </div>
    </Link>
  );
};
