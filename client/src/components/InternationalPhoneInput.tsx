import React, { useState, useRef, useEffect } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { ChevronDown, Search } from "lucide-react";

interface InternationalPhoneInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value,
  onChange,
  required = false,
  className = "",
  placeholder = "Phone number"
}) => {
  const { countries, currentCountry } = useCurrency();
  const [selectedDialCode, setSelectedDialCode] = useState<string>(currentCountry.dialCode || "+1");
  const [selectedFlag, setSelectedFlag] = useState<string>(currentCountry.flag || "🇺🇸");
  const [localNumber, setLocalNumber] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync with currentCountry on initial mount or switch
  useEffect(() => {
    if (currentCountry && !localNumber) {
      setSelectedDialCode(currentCountry.dialCode);
      setSelectedFlag(currentCountry.flag);
    }
  }, [currentCountry]);

  // Parse existing value if passed
  useEffect(() => {
    if (value && value.includes(" ")) {
      const parts = value.split(" ");
      const dial = parts[0];
      const num = parts.slice(1).join(" ");
      const found = countries.find((c) => c.dialCode === dial);
      if (found) {
        setSelectedDialCode(dial);
        setSelectedFlag(found.flag);
      }
      setLocalNumber(num);
    }
  }, [value, countries]);

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

  const handleCountrySelect = (dialCode: string, flag: string) => {
    setSelectedDialCode(dialCode);
    setSelectedFlag(flag);
    setIsOpen(false);
    onChange(`${dialCode} ${localNumber}`.trim());
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d\s-]/g, "");
    setLocalNumber(raw);
    onChange(`${selectedDialCode} ${raw}`.trim());
  };

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`relative flex rounded-lg border border-[#EAEAEA] bg-white focus-within:border-[#111111] focus-within:ring-1 focus-within:ring-[#111111] ${className}`}>
      {/* Country Dial Code Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-[#FAFAFA] border-r border-[#EAEAEA] rounded-l-lg hover:bg-neutral-100 transition-colors text-neutral-700 text-sm font-medium focus:outline-none"
      >
        <span className="text-base">{selectedFlag}</span>
        <span className="text-xs text-neutral-700 font-semibold">{selectedDialCode}</span>
        <ChevronDown size={14} className="text-neutral-400" />
      </button>

      {/* Phone Number Input */}
      <input
        type="tel"
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 text-sm text-[#111111] placeholder-neutral-400 rounded-r-lg focus:outline-none"
      />

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1.5 w-72 max-h-64 overflow-y-auto bg-white border border-[#EAEAEA] rounded-lg shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 pb-2 border-b border-[#EAEAEA] sticky top-0 bg-white">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAFAFA] border border-[#EAEAEA] rounded-md focus:outline-none focus:border-[#111111] text-[#111111]"
                autoFocus
              />
            </div>
          </div>

          <div className="pt-1">
            {filteredCountries.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => handleCountrySelect(c.dialCode, c.flag)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#F7F7F7] text-left transition-colors text-xs text-[#111111]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{c.flag}</span>
                  <span className="font-medium text-neutral-800">{c.name}</span>
                </div>
                <span className="font-mono text-neutral-400 text-2xs">{c.dialCode}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
