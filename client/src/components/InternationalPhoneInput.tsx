import React, { useState, useRef, useEffect } from "react";
import { useCurrency } from "../context/CurrencyContext";
import { ChevronDown, Search } from "lucide-react";

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
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value,
  onChange,
  countryCode,
  countriesList,
  required = false,
  className = "",
  placeholder = "Enter your phone number"
}) => {
  const { countries: contextCountries, currentCountry } = useCurrency();
  const [allCountries, setAllCountries] = useState<PhoneCountryItem[]>(countriesList || []);
  const [selectedDialCode, setSelectedDialCode] = useState<string>("+1");
  const [selectedFlag, setSelectedFlag] = useState<string>("🇺🇸");
  const [localNumber, setLocalNumber] = useState<string>("");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all 250 countries if countriesList not provided
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
        } else if (isMounted && contextCountries && contextCountries.length > 0) {
          setAllCountries(contextCountries);
        }
      })
      .catch(() => {
        if (isMounted && contextCountries && contextCountries.length > 0) {
          setAllCountries(contextCountries);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [countriesList, contextCountries]);

  // Synchronize with countryCode prop (e.g. when user changes shipping destination country)
  useEffect(() => {
    const listToSearch = allCountries.length > 0 ? allCountries : contextCountries;
    if (countryCode && listToSearch.length > 0) {
      const matched = listToSearch.find(
        (c) => c.code.toUpperCase() === countryCode.toUpperCase()
      );
      if (matched && matched.dialCode) {
        setSelectedDialCode(matched.dialCode);
        setSelectedFlag(matched.flag);
        if (localNumber) {
          onChange(`${matched.dialCode} ${localNumber}`.trim());
        }
      }
    }
  }, [countryCode, allCountries]);

  // Fallback initial sync with currentCountry if no countryCode provided
  useEffect(() => {
    if (!countryCode && currentCountry && !localNumber && !value) {
      if (currentCountry.dialCode) setSelectedDialCode(currentCountry.dialCode);
      if (currentCountry.flag) setSelectedFlag(currentCountry.flag);
    }
  }, [currentCountry, countryCode]);

  // Parse existing value if passed
  useEffect(() => {
    if (value && value.includes(" ")) {
      const parts = value.split(" ");
      const dial = parts[0];
      const num = parts.slice(1).join(" ");
      const listToSearch = allCountries.length > 0 ? allCountries : contextCountries;
      const found = listToSearch.find((c) => c.dialCode === dial);
      if (found) {
        setSelectedDialCode(dial);
        setSelectedFlag(found.flag);
      }
      setLocalNumber(num);
    } else if (value && !localNumber) {
      setLocalNumber(value);
    }
  }, [value, allCountries, contextCountries]);

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

  const activeCountryList = allCountries.length > 0 ? allCountries : contextCountries;
  const filteredCountries = activeCountryList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className={`relative flex rounded-md border border-neutral-300 bg-white transition-all duration-150 focus-within:border-[#7AA05A] focus-within:ring-2 focus-within:ring-[#7AA05A]/20 ${className}`}
    >
      {/* Country Dial Code Dropdown Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-2 bg-neutral-50 border-r border-neutral-200 rounded-l-md hover:bg-neutral-100 transition-colors text-neutral-800 text-sm font-medium focus:outline-none"
        title="Select Country Calling Code"
      >
        <span className="text-base leading-none">{selectedFlag}</span>
        <span className="text-xs text-neutral-800 font-semibold">{selectedDialCode}</span>
        <ChevronDown size={13} className="text-neutral-400" />
      </button>

      {/* Phone Number Input */}
      <input
        type="tel"
        value={localNumber}
        onChange={handleNumberChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 text-sm text-[#171717] placeholder-neutral-400 rounded-r-md focus:outline-none bg-transparent"
      />

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-1.5 w-72 max-h-64 overflow-y-auto bg-white border border-neutral-200 rounded-lg shadow-xl z-50 py-2 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 pb-2 border-b border-neutral-100 sticky top-0 bg-white">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country or code..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded focus:outline-none focus:border-[#7AA05A] focus:ring-1 focus:ring-[#7AA05A]/30 text-neutral-800 placeholder-neutral-400"
                autoFocus
              />
            </div>
          </div>

          <div className="pt-1 max-h-48 overflow-y-auto">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-3 text-xs text-neutral-500 text-center">
                No matching countries found
              </div>
            ) : (
              filteredCountries.map((c) => (
                <button
                  key={`${c.code}-${c.dialCode}`}
                  type="button"
                  onClick={() => handleCountrySelect(c.dialCode, c.flag)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#F4F7F2] text-left transition-colors text-xs ${
                    selectedDialCode === c.dialCode ? "bg-[#7AA05A]/10 font-semibold text-[#2D5A4A]" : "text-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <span className="text-sm">{c.flag}</span>
                    <span className="truncate">{c.name}</span>
                  </div>
                  <span className="font-mono text-neutral-500 text-[11px] shrink-0">{c.dialCode}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
