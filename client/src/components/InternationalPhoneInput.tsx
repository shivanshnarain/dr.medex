import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search } from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";

export interface PhoneCountryItem {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

interface InternationalPhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  countryCode?: string;
  countriesList?: PhoneCountryItem[];
  required?: boolean;
  className?: string;
  placeholder?: string;
  onCountryChange?: (countryCode: string) => void;
}

/**
 * Strips any calling code (+91, +92, +1, +1 268, etc.) from the local subscriber number
 * so the right-side text input NEVER displays duplicate country calling codes.
 */
function cleanSubscriberNumber(raw: string, dialCode: string): string {
  if (!raw) return "";
  let s = String(raw).trim();

  // Strip leading plus
  if (s.startsWith("+")) {
    s = s.substring(1);
  }

  // Strip dial code digits whether space-separated, hyphenated, or concatenated
  const dialDigits = (dialCode || "").replace(/[^0-9]/g, "");
  const digitsOnly = s.replace(/[^0-9]/g, "");
  if (dialDigits && digitsOnly.startsWith(dialDigits)) {
    let count = 0;
    let idx = 0;
    while (idx < s.length && count < dialDigits.length) {
      if (/[0-9]/.test(s[idx])) {
        count++;
      }
      idx++;
    }
    s = s.substring(idx);
  }

  // Strip any remaining non-digit symbols from the prefix
  s = s.replace(/^[+\s-]+/, "").replace(/[^\d\s-]/g, "").trim();
  return s;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value,
  onChange,
  countryCode,
  countriesList,
  required = false,
  className = "",
  placeholder = "Enter your phone number",
  onCountryChange
}) => {
  const [allCountries, setAllCountries] = useState<PhoneCountryItem[]>(countriesList || []);
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(countryCode || "IN");
  const [selectedDialCode, setSelectedDialCode] = useState<string>("+91");
  const [selectedFlag, setSelectedFlag] = useState<string>("🇮🇳");
  const [localNumber, setLocalNumber] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all 195 countries from API if not provided via props
  useEffect(() => {
    if (countriesList && countriesList.length > 0) {
      setAllCountries(countriesList);
      return;
    }

    let isMounted = true;
    fetch("/api/location/countries")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.countries) && data.countries.length > 0) {
          setAllCountries(data.countries);
        }
      })
      .catch((err) => console.warn("Failed to load countries in phone input:", err));

    return () => {
      isMounted = false;
    };
  }, [countriesList]);

  // Synchronize with countryCode prop (e.g. when destination country changes in checkout)
  useEffect(() => {
    if (!countryCode || allCountries.length === 0) return;
    const matched = allCountries.find(
      (c) => c.code.toUpperCase() === countryCode.toUpperCase()
    );
    if (matched) {
      setSelectedCountryCode(matched.code);
      setSelectedDialCode(matched.dialCode);
      setSelectedFlag(matched.flag);

      // Clean local number and emit synchronized phone number
      const cleaned = cleanSubscriberNumber(localNumber, matched.dialCode);
      if (cleaned) {
        onChange(`${matched.dialCode} ${cleaned}`.trim());
      }
    }
  }, [countryCode, allCountries]);

  // Parse existing value when passed into component:
  // Strictly extracts ONLY the subscriber number for the right input!
  useEffect(() => {
    if (!value) {
      setLocalNumber("");
      return;
    }

    // Try finding dial code match from the 195 countries
    if (value.startsWith("+") && allCountries.length > 0) {
      // Find matching country by dial code
      const matched = allCountries
        .filter((c) => value.startsWith(c.dialCode.replace(/\s+/g, "")))
        .sort((a, b) => b.dialCode.length - a.dialCode.length)[0];

      if (matched) {
        setSelectedCountryCode(matched.code);
        setSelectedDialCode(matched.dialCode);
        setSelectedFlag(matched.flag);
        const cleaned = cleanSubscriberNumber(value, matched.dialCode);
        setLocalNumber(cleaned);
        return;
      }
    }

    const cleaned = cleanSubscriberNumber(value, selectedDialCode);
    setLocalNumber(cleaned);
  }, [value, allCountries]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCountrySelect = (c: PhoneCountryItem) => {
    setSelectedCountryCode(c.code);
    setSelectedDialCode(c.dialCode);
    setSelectedFlag(c.flag);
    setIsOpen(false);
    setSearchQuery("");

    // Notify parent if country selector changed
    if (onCountryChange) {
      onCountryChange(c.code);
    }

    // Sanitize local number with newly selected dial code
    const cleaned = cleanSubscriberNumber(localNumber, c.dialCode);
    setLocalNumber(cleaned);
    const fullNumber = cleaned ? `${c.dialCode} ${cleaned}`.trim() : "";
    onChange(fullNumber);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip any calling code or non-digit input
    const cleaned = cleanSubscriberNumber(e.target.value, selectedDialCode);
    setLocalNumber(cleaned);
    const fullNumber = cleaned ? `${selectedDialCode} ${cleaned}`.trim() : "";
    onChange(fullNumber);
  };

  const filteredCountries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return allCountries;
    return allCountries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.replace(/\s+/g, "").includes(q)
    );
  }, [allCountries, searchQuery]);

  return (
    <div
      className={`relative flex rounded-xl border border-neutral-300 bg-white transition-all duration-150 focus-within:border-[#7AA05A] focus-within:ring-2 focus-within:ring-[#7AA05A]/20 ${className}`}
    >
      {/* LEFT SIDE: Country Flag, Calling Code, and Searchable Selector */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2.5 bg-neutral-50 border-r border-neutral-200 rounded-l-xl hover:bg-neutral-100 transition-colors text-neutral-800 text-xs font-semibold focus:outline-none shrink-0"
        title={`Selected: ${selectedFlag} ${selectedCountryCode} (${selectedDialCode})`}
      >
        <span className="text-base leading-none">{selectedFlag}</span>
        <span className="font-mono text-neutral-800 font-bold">{selectedDialCode}</span>
        <ChevronDown size={13} className="text-neutral-400" />
      </button>

      {/* RIGHT SIDE: ONLY Subscriber Phone Number (Calling code is NEVER duplicated here) */}
      <input
        type="tel"
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3.5 py-2.5 text-xs text-[#171717] font-medium placeholder-neutral-400 rounded-r-xl focus:outline-none bg-transparent"
      />

      {/* Dropdown Menu for All 195 Countries */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1.5 w-80 max-h-72 overflow-y-auto bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 pb-2 border-b border-neutral-100 sticky top-0 bg-white z-10">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country, ISO code, or dial code (+91, +92, +1)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#7AA05A] text-neutral-800 placeholder-neutral-400"
                autoFocus
              />
            </div>
          </div>

          <div className="pt-1 max-h-56 overflow-y-auto divide-y divide-neutral-50">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-4 text-xs text-neutral-500 text-center">
                No matching country found
              </div>
            ) : (
              filteredCountries.map((c) => (
                <button
                  key={`${c.code}-${c.dialCode}`}
                  type="button"
                  onClick={() => handleCountrySelect(c)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#F4F7F2] text-left transition-colors text-xs ${
                    selectedCountryCode === c.code ? "bg-[#7AA05A]/10 font-bold text-[#2D5A4A]" : "text-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate pr-2">
                    <span className="text-base leading-none">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="text-3xs font-mono text-neutral-400">({c.code})</span>
                  </div>
                  <span className="font-mono text-neutral-500 text-xs shrink-0 font-semibold">{c.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
