import React from "react";

/**
 * Renders DR.MEDEX with strict brand guidelines:
 * DR. in #2D5A4A, MEDEX in #7AA05A, on the same baseline.
 */
export const BrandWordmark: React.FC<{ className?: string }> = ({ className = "" }) => (
  <span className={`inline-flex items-baseline ${className}`}>
    <span className="text-[#2D5A4A] font-extrabold">DR.</span>
    <span className="text-[#7AA05A] font-extrabold ml-0.5">MEDEX</span>
  </span>
);

/**
 * Parses and renders product titles or strings containing "DR.MEDEX" or "DR. MEDEX",
 * styling "DR." in #2D5A4A and "MEDEX" in #7AA05A while preserving the rest of the text.
 */
export function renderBrandTitle(rawTitle: string | null | undefined): React.ReactNode {
  if (!rawTitle) return "";
  const text = String(rawTitle).trim();
  
  // Match prefix like "DR.MEDEX ...", "DR. MEDEX - ...", "DR.MEDEX: ..."
  const prefixRegex = /^(DR\.?)\s*(MEDEX)\s*[-–—:]*\s*(.*)$/i;
  const match = text.match(prefixRegex);
  if (match) {
    return (
      <span className="inline-flex items-baseline flex-wrap">
        <span className="text-[#2D5A4A] font-extrabold">DR.</span>
        <span className="text-[#7AA05A] font-extrabold ml-0.5">MEDEX</span>
        {match[3] ? <span className="ml-1 text-inherit">{match[3]}</span> : null}
      </span>
    );
  }

  // Handle mid-sentence occurrences
  const parts = text.split(/(DR\.?\s*MEDEX)/gi);
  if (parts.length > 1) {
    return (
      <>
        {parts.map((part, idx) => {
          if (/^DR\.?\s*MEDEX$/i.test(part.trim())) {
            return (
              <span key={idx} className="inline-flex items-baseline font-extrabold">
                <span className="text-[#2D5A4A]">DR.</span>
                <span className="text-[#7AA05A] ml-0.5">MEDEX</span>
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </>
    );
  }

  return text;
}

