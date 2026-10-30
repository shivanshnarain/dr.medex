import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ChevronDown,
  Search,
  Check,
  AlertCircle,
  Loader2,
  X,
  Mail,
  User
} from "lucide-react";
import {
  GeoCountry,
  GeoSubdivision,
  GeoCity,
  getAllCountries,
  getCountryByCode,
  filterCountries,
  loadSubdivisions,
  loadCities,
  getPostalSuggestions,
  validatePostalCode,
  POPULAR_COUNTRY_CODES
} from "../data/geo/geoService";
import { InternationalPhoneInput } from "./InternationalPhoneInput";

export interface AddressFormData {
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  phoneCountryCode: string;
  phoneIso: string;
  country: string;
  countryCode: string;
  state: string;
  stateCode: string;
  city: string;
  postalCode: string;
  email: string;
  streetAddress: string;
  additionalAddress: string;
  companyName?: string;
  department?: string;
  professionalTitle?: string;
  taxId?: string;
}

interface AmazonCascadingAddressFormProps {
  data: AddressFormData;
  onChange: (updated: Partial<AddressFormData>) => void;
  onCountryChange?: (country: GeoCountry) => void;
  isGeolocating?: boolean;
  onDetectLocation?: () => void;
  locationNotice?: string | null;
  onDismissLocationNotice?: () => void;
}

export const AmazonCascadingAddressForm: React.FC<AmazonCascadingAddressFormProps> = ({
  data,
  onChange,
  onCountryChange,
  isGeolocating = false,
  onDetectLocation,
  locationNotice,
  onDismissLocationNotice
}) => {
  const allCountries = useMemo(() => getAllCountries(), []);

  // Country selector dropdown state
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // State / Subdivision dropdown state
  const [subdivisions, setSubdivisions] = useState<GeoSubdivision[]>([]);
  const [isLoadingSubdivisions, setIsLoadingSubdivisions] = useState(false);
  const [isStateOpen, setIsStateOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  // City / Locality dropdown state
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [isManualCityMode, setIsManualCityMode] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  // Postal suggestions state
  const [postalSuggestions, setPostalSuggestions] = useState<string[]>([]);
  const [postalError, setPostalError] = useState<string | null>(null);

  // Phone calling code synchronization:
  // Selecting delivery country automatically updates phone code, unless customer explicitly changed phone country
  const [hasUserOverriddenPhoneCountry, setHasUserOverriddenPhoneCountry] = useState(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(
    data.phoneIso || data.countryCode || "IN"
  );

  useEffect(() => {
    if (!hasUserOverriddenPhoneCountry && data.countryCode) {
      setPhoneCountryCode(data.countryCode);
    }
  }, [data.countryCode, hasUserOverriddenPhoneCountry]);

  // Active country resolution
  const activeCountry = useMemo<GeoCountry>(() => {
    return getCountryByCode(data.countryCode || "IN") || allCountries.find((c) => c.code === "IN") || allCountries[0];
  }, [allCountries, data.countryCode]);

  // Filtered countries for search
  const filteredCountries = useMemo(() => {
    return filterCountries(countrySearch, allCountries);
  }, [countrySearch, allCountries]);

  // Popular countries list
  const popularCountries = useMemo(() => {
    return POPULAR_COUNTRY_CODES.map((code) => allCountries.find((c) => c.code === code)).filter(Boolean) as GeoCountry[];
  }, [allCountries]);

  // Filtered subdivisions
  const filteredSubdivisions = useMemo(() => {
    if (!stateSearch.trim()) return subdivisions;
    const q = stateSearch.toLowerCase();
    return subdivisions.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [subdivisions, stateSearch]);

  // Filtered cities
  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return cities.slice(0, 150);
    const q = citySearch.toLowerCase();
    return cities.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 150);
  }, [cities, citySearch]);

  // 1. Load Subdivisions whenever country changes
  useEffect(() => {
    let isCancelled = false;
    async function fetchSubdivisions() {
      if (!data.countryCode) return;
      setIsLoadingSubdivisions(true);
      const list = await loadSubdivisions(data.countryCode);
      if (!isCancelled) {
        setSubdivisions(list);
        setIsLoadingSubdivisions(false);
      }
    }
    fetchSubdivisions();
    return () => {
      isCancelled = true;
    };
  }, [data.countryCode]);

  // 2. Load Cities whenever country or stateCode changes
  useEffect(() => {
    let isCancelled = false;
    async function fetchCities() {
      if (!data.countryCode) return;
      setIsLoadingCities(true);
      const list = await loadCities(data.countryCode, data.stateCode);
      if (!isCancelled) {
        setCities(list);
        setIsLoadingCities(false);
        setIsManualCityMode(list.length === 0);
      }
    }
    fetchCities();
    return () => {
      isCancelled = true;
    };
  }, [data.countryCode, data.stateCode]);

  // 3. Load Postal Suggestions whenever city changes
  useEffect(() => {
    let isCancelled = false;
    async function fetchPostal() {
      if (!data.countryCode || !data.city) {
        setPostalSuggestions([]);
        return;
      }
      const suggestions = await getPostalSuggestions(data.countryCode, data.stateCode, data.city);
      if (!isCancelled) {
        setPostalSuggestions(suggestions);
      }
    }
    fetchPostal();
    return () => {
      isCancelled = true;
    };
  }, [data.countryCode, data.stateCode, data.city]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryOpen(false);
      }
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(e.target as Node)) {
        setIsStateOpen(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setIsCityOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Country Selection
  const handleSelectCountry = (country: GeoCountry) => {
    setIsCountryOpen(false);
    setCountrySearch("");
    setStateSearch("");
    setCitySearch("");
    setIsManualCityMode(false);
    setPostalError(null);

    // If customer has not explicitly changed the phone country, sync phone code with delivery country
    if (!hasUserOverriddenPhoneCountry) {
      setPhoneCountryCode(country.code);
    }

    // Cascading reset: clear state, city, and postal code
    onChange({
      country: country.name,
      countryCode: country.code,
      state: "",
      stateCode: "",
      city: "",
      postalCode: "",
      ...(!hasUserOverriddenPhoneCountry
        ? {
            phoneCountryCode: country.dialCode,
            phoneIso: country.code
          }
        : {})
    });

    if (onCountryChange) {
      onCountryChange(country);
    }
  };

  // Handle State Selection
  const handleSelectState = (sub: GeoSubdivision) => {
    setIsStateOpen(false);
    setStateSearch("");
    setCitySearch("");
    setIsManualCityMode(false);
    setPostalError(null);

    // Cascading reset: clear city and postal code
    onChange({
      state: sub.name,
      stateCode: sub.code,
      city: "",
      postalCode: ""
    });
  };

  // Handle City Selection
  const handleSelectCity = (cityItem: GeoCity) => {
    setIsCityOpen(false);
    setCitySearch("");
    setPostalError(null);

    // Suggest first postal code if single exact match, otherwise let customer choose
    const suggestions = cityItem.postalCodes || [];
    setPostalSuggestions(suggestions);

    onChange({
      city: cityItem.name,
      postalCode: suggestions.length === 1 ? suggestions[0] : (data.postalCode || "")
    });
  };

  // Validate postal code on blur or change
  const handlePostalChange = (val: string) => {
    onChange({ postalCode: val });
    if (activeCountry.hasPostalCode && val.trim().length > 0) {
      const result = validatePostalCode(activeCountry.code, val);
      setPostalError(result.valid ? null : (result.message || "Invalid postal format"));
    } else {
      setPostalError(null);
    }
  };

  // Synchronize first & last name with fullName
  const handleFirstNameChange = (val: string) => {
    const newFull = `${val} ${data.lastName || ""}`.trim();
    onChange({ firstName: val, fullName: newFull });
  };

  const handleLastNameChange = (val: string) => {
    const newFull = `${data.firstName || ""} ${val}`.trim();
    onChange({ lastName: val, fullName: newFull });
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-7 shadow-xs">
      {/* Geolocation Notice Banner */}
      {locationNotice && (
        <div className="mb-4 flex items-center justify-between p-3 rounded-xl bg-[#F0F7ED] border border-[#7AA05A]/40 text-xs font-semibold text-[#2D5A4A] animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-[#7AA05A] shrink-0" />
            <span>{locationNotice}</span>
          </div>
          {onDismissLocationNotice && (
            <button
              type="button"
              onClick={onDismissLocationNotice}
              className="text-neutral-400 hover:text-neutral-700 p-1 rounded hover:bg-black/5 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* ========================================================
          CASCADING ADDRESS FORM (EXACT FIELD ORDER 1 TO 11)
         ======================================================== */}
      <div className="space-y-4 text-xs">
        
        {/* 1. First Name * & 2. Last Name * */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-[#171717] mb-1.5">
              First Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={data.firstName || ""}
                onChange={(e) => handleFirstNameChange(e.target.value)}
                placeholder="Enter first name"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
              />
              <User size={15} className="absolute left-3 top-3 text-neutral-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#171717] mb-1.5">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={data.lastName || ""}
              onChange={(e) => handleLastNameChange(e.target.value)}
              placeholder="Enter last name"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
            />
          </div>
        </div>

        {/* 3. Email Address * */}
        <div>
          <label className="block font-bold text-[#171717] mb-1.5">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="email"
              required
              value={data.email || ""}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="Enter your email address (personal or institutional)"
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
            />
            <Mail size={15} className="absolute left-3 top-3 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* 4. Phone Number * (Country Flag Selector, Calling Code Selector, Phone Number Input) */}
        <div>
          <label className="block font-bold text-[#171717] mb-1.5">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <InternationalPhoneInput
            value={data.phone || ""}
            onChange={(val) => onChange({ phone: val })}
            countryCode={phoneCountryCode}
            onCountryChange={(code) => {
              setHasUserOverriddenPhoneCountry(true);
              setPhoneCountryCode(code);
            }}
            required
            placeholder="Enter phone number"
          />
        </div>

        {/* 5. Country * (195 Sovereign Countries Dropdown) */}
        <div className="relative" ref={countryDropdownRef}>
          <label className="block font-bold text-[#171717] mb-1.5">
            Country <span className="text-red-500">*</span>
          </label>

          <button
            type="button"
            onClick={() => setIsCountryOpen(!isCountryOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-semibold hover:border-neutral-400 focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 truncate">
              <span className="text-lg leading-none">{activeCountry.flag}</span>
              <span className="font-bold text-sm text-[#171717] truncate">{activeCountry.name}</span>
              <span className="text-2xs font-mono text-neutral-400">({activeCountry.code})</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-2xs font-bold text-[#2D5A4A] bg-[#F4F7F2] px-2 py-0.5 rounded">
                {activeCountry.dialCode}
              </span>
              <span className="text-2xs text-neutral-500 font-mono">
                {activeCountry.currency} ({activeCountry.symbol})
              </span>
              <ChevronDown size={15} className={`text-neutral-400 transition-transform ${isCountryOpen ? "rotate-180" : ""}`} />
            </div>
          </button>

          {/* Searchable Country Menu */}
          {isCountryOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 py-2 max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 pb-2 border-b border-neutral-100">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Search by country, dial code (+91, +1, 44), or ISO..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#7AA05A] text-neutral-800"
                    autoFocus
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-64 divide-y divide-neutral-50">
                {/* Popular Procurement Hubs */}
                {!countrySearch && (
                  <div>
                    <div className="px-3.5 py-1 text-3xs font-extrabold uppercase tracking-wider text-neutral-400 bg-neutral-50">
                      Popular Procurement Hubs
                    </div>
                    {popularCountries.map((c) => (
                      <button
                        key={`pop-${c.code}`}
                        type="button"
                        onClick={() => handleSelectCountry(c)}
                        className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#F4F7F2] text-left transition-colors text-xs cursor-pointer ${
                          c.code === data.countryCode ? "bg-[#7AA05A]/10 font-bold text-[#2D5A4A]" : "text-neutral-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <span className="text-base">{c.flag}</span>
                          <span className="truncate">{c.name}</span>
                          <span className="text-3xs font-mono text-neutral-400">({c.code})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-2xs text-neutral-500 font-semibold">{c.dialCode}</span>
                          <span className="text-3xs font-semibold text-neutral-400">{c.currency}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* All 195 Countries List */}
                <div>
                  {!countrySearch && (
                    <div className="px-3.5 py-1 text-3xs font-extrabold uppercase tracking-wider text-neutral-400 bg-neutral-50">
                      All 195 Sovereign Countries
                    </div>
                  )}
                  {filteredCountries.length === 0 ? (
                    <div className="px-4 py-4 text-xs text-neutral-500 text-center">
                      No country or calling code matched.
                    </div>
                  ) : (
                    filteredCountries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleSelectCountry(c)}
                        className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#F4F7F2] text-left transition-colors text-xs cursor-pointer ${
                          c.code === data.countryCode ? "bg-[#7AA05A]/10 font-bold text-[#2D5A4A]" : "text-neutral-800"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <span className="text-base">{c.flag}</span>
                          <span className="truncate">{c.name}</span>
                          <span className="text-3xs font-mono text-neutral-400">({c.code})</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-2xs text-neutral-500 font-semibold">{c.dialCode}</span>
                          <span className="text-3xs font-semibold text-neutral-400">{c.currency}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 6. State / Province / Region * */}
        {activeCountry.hasStates !== false && (
          <div className="relative" ref={stateDropdownRef}>
            <label className="block font-bold text-[#171717] mb-1.5">
              {activeCountry.stateLabel || "State / Province / Region"} <span className="text-red-500">*</span>
            </label>

            {isLoadingSubdivisions ? (
              <div className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400 flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-[#7AA05A]" />
                <span>Loading subdivisions for {activeCountry.name}...</span>
              </div>
            ) : subdivisions.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsStateOpen(!isStateOpen)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-medium hover:border-neutral-400 focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all text-left cursor-pointer"
                >
                  <span className={data.state ? "font-semibold text-[#171717]" : "text-neutral-400"}>
                    {data.state || `Select ${activeCountry.stateLabel || "state/province"}...`}
                  </span>
                  <ChevronDown size={15} className={`text-neutral-400 transition-transform ${isStateOpen ? "rotate-180" : ""}`} />
                </button>

                {isStateOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-40 py-2 max-h-64 flex flex-col animate-in fade-in duration-100">
                    <div className="px-3 pb-2 border-b border-neutral-100">
                      <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                        <input
                          type="text"
                          value={stateSearch}
                          onChange={(e) => setStateSearch(e.target.value)}
                          placeholder={`Search in ${subdivisions.length} subdivisions...`}
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#7AA05A] text-neutral-800"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-48 divide-y divide-neutral-50">
                      {filteredSubdivisions.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-neutral-500 text-center">
                          No matching subdivision found.
                        </div>
                      ) : (
                        filteredSubdivisions.map((s) => (
                          <button
                            key={s.code}
                            type="button"
                            onClick={() => handleSelectState(s)}
                            className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#F4F7F2] text-left transition-colors text-xs cursor-pointer ${
                              s.name === data.state ? "bg-[#7AA05A]/10 font-bold text-[#2D5A4A]" : "text-neutral-800"
                            }`}
                          >
                            <span className="truncate">{s.name}</span>
                            <span className="text-3xs font-mono text-neutral-400">{s.code}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <input
                type="text"
                required
                value={data.state || ""}
                onChange={(e) => onChange({ state: e.target.value, stateCode: "" })}
                placeholder={`Enter ${activeCountry.stateLabel || "state or region"}`}
                className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
              />
            )}
          </div>
        )}

        {/* 7. City / Locality * */}
        <div className="relative" ref={cityDropdownRef}>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-bold text-[#171717]">
              City / Locality <span className="text-red-500">*</span>
            </label>
            {cities.length > 0 && (
              <button
                type="button"
                onClick={() => setIsManualCityMode(!isManualCityMode)}
                className="text-3xs text-[#2D5A4A] hover:underline cursor-pointer font-medium"
              >
                {isManualCityMode ? "Select from city list" : "Enter manually"}
              </button>
            )}
          </div>

          {isLoadingCities ? (
            <div className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400 flex items-center gap-2">
              <Loader2 size={13} className="animate-spin text-[#7AA05A]" />
              <span>Loading cities...</span>
            </div>
          ) : !isManualCityMode && cities.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setIsCityOpen(!isCityOpen)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-medium hover:border-neutral-400 focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all text-left cursor-pointer"
              >
                <span className={data.city ? "font-semibold text-[#171717]" : "text-neutral-400"}>
                  {data.city || (data.state ? `Select city in ${data.state}...` : `Select city in ${activeCountry.name}...`)}
                </span>
                <ChevronDown size={15} className={`text-neutral-400 transition-transform ${isCityOpen ? "rotate-180" : ""}`} />
              </button>

              {isCityOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-xl z-40 py-2 max-h-64 flex flex-col animate-in fade-in duration-100">
                  <div className="px-3 pb-2 border-b border-neutral-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                      <input
                        type="text"
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        placeholder={`Search in ${cities.length} localities...`}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-[#7AA05A] text-neutral-800"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto max-h-48 divide-y divide-neutral-50">
                    {filteredCities.length === 0 ? (
                      <div className="p-3 text-center space-y-2">
                        <div className="text-xs text-neutral-500">City not found in list.</div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualCityMode(true);
                            setIsCityOpen(false);
                            onChange({ city: citySearch });
                          }}
                          className="text-xs text-[#2D5A4A] font-bold underline"
                        >
                          Use "{citySearch}" as city
                        </button>
                      </div>
                    ) : (
                      filteredCities.map((c, idx) => (
                        <button
                          key={`${c.name}-${idx}`}
                          type="button"
                          onClick={() => handleSelectCity(c)}
                          className={`w-full flex items-center justify-between px-3.5 py-2 hover:bg-[#F4F7F2] text-left transition-colors text-xs cursor-pointer ${
                            c.name === data.city ? "bg-[#7AA05A]/10 font-bold text-[#2D5A4A]" : "text-neutral-800"
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          {c.postalCodes && c.postalCodes.length > 0 && (
                            <span className="text-3xs font-mono text-[#2D5A4A] bg-[#EBF3E8] px-1.5 py-0.5 rounded">
                              {c.postalCodes[0]}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <input
              type="text"
              required
              value={data.city || ""}
              onChange={(e) => onChange({ city: e.target.value })}
              placeholder="Enter your city / locality"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
            />
          )}
        </div>

        {/* 8. ZIP / Postal Code (with Suggestion Pills & Validation) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-bold text-[#171717]">
              {activeCountry.postalLabel || "Postal Code"}{" "}
              {activeCountry.hasPostalCode ? (
                <span className="text-red-500">*</span>
              ) : (
                <span className="text-neutral-400 font-normal">(Optional / Not Required in {activeCountry.name})</span>
              )}
            </label>
            {activeCountry.hasPostalCode && (
              <span className="text-3xs text-neutral-400 font-mono">
                {activeCountry.postalPlaceholder}
              </span>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              required={activeCountry.hasPostalCode}
              value={data.postalCode || ""}
              onChange={(e) => handlePostalChange(e.target.value)}
              placeholder={activeCountry.postalPlaceholder}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-[#171717] font-medium focus:outline-none transition-all placeholder:text-neutral-400 ${
                postalError
                  ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  : "border-neutral-300 bg-white focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20"
              }`}
            />
            {postalError && (
              <div className="flex items-center gap-1.5 mt-1 text-2xs text-red-600 font-medium">
                <AlertCircle size={12} className="shrink-0" />
                <span>{postalError}</span>
              </div>
            )}
          </div>

          {/* Postal Code Suggestion Pills for Selected City */}
          {postalSuggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-3xs text-neutral-400 font-semibold uppercase tracking-wider mr-1">
                Suggested for {data.city}:
              </span>
              {postalSuggestions.map((pCode) => (
                <button
                  key={pCode}
                  type="button"
                  onClick={() => handlePostalChange(pCode)}
                  className={`text-2xs font-mono px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                    data.postalCode === pCode
                      ? "bg-[#2D5A4A] text-white border-[#2D5A4A] font-bold"
                      : "bg-[#F4F7F2] text-[#2D5A4A] border-[#7AA05A]/30 hover:bg-[#EBF3E8]"
                  }`}
                  title={`Use postal code ${pCode}`}
                >
                  {pCode}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 9. Street Address * */}
        <div>
          <label className="block font-bold text-[#171717] mb-1.5">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={data.streetAddress || ""}
            onChange={(e) => onChange({ streetAddress: e.target.value })}
            placeholder="Building number, street name, hospital ward, or clinic suite"
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
          />
        </div>

        {/* 10. Apartment / Suite / Building (Optional) */}
        <div>
          <label className="block font-bold text-[#171717] mb-1.5">
            Apartment / Suite / Building <span className="text-neutral-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={data.additionalAddress || ""}
            onChange={(e) => onChange({ additionalAddress: e.target.value })}
            placeholder="Floor, suite, building, surgical wing, receiving dock"
            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
          />
        </div>

        {/* 11. Optional Hospital & Medical B2B Details */}
        <div className="pt-2 border-t border-neutral-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-[#171717] mb-1 text-3xs">
                Hospital / Organization <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={data.companyName || ""}
                onChange={(e) => onChange({ companyName: e.target.value })}
                placeholder="Hospital or clinic name"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs text-[#171717] focus:outline-none focus:border-[#7AA05A]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#171717] mb-1 text-3xs">
                Clinical Department <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={data.department || ""}
                onChange={(e) => onChange({ department: e.target.value })}
                placeholder="e.g. Operating Theatre"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs text-[#171717] focus:outline-none focus:border-[#7AA05A]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#171717] mb-1 text-3xs">
                VAT / GST / Tax ID <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={data.taxId || ""}
                onChange={(e) => onChange({ taxId: e.target.value })}
                placeholder="e.g. GSTIN, EU VAT"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-xs text-[#171717] focus:outline-none focus:border-[#7AA05A] uppercase"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

