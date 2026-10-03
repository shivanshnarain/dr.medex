import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  User,
  Globe,
  ChevronDown,
  Menu,
  X,
  Home,
  LayoutGrid,
  Activity,
  Zap,
  Snowflake,
  Sun,
  Bed,
  UserCheck,
  Accessibility,
  HeartPulse,
  Check,
  ArrowRight
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { Product } from "../types";
import { Logo } from "./Logo";

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const { currentCountry, currentCurrency, countries, setCountry, exchangeRates, formatPrice } = useCurrency();
  const { itemCount, openDrawer } = useCart();
  const { user } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const countryModalRef = useRef<HTMLDivElement>(null);

  // Live search handler
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        if (data.success) {
          setSearchResults(data.products.slice(0, 5));
          setShowSearchDropdown(true);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside to close search and country modal
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (countryModalRef.current && !countryModalRef.current.contains(e.target as Node)) {
        setIsCountryModalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      navigate(`/shop-all?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Filter countries for modal
  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.currency.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const navItems = [
    {
      id: "home",
      label: "Home",
      to: "/",
      icon: Home,
      isActive: isHome,
    },
    {
      id: "shop-all",
      label: "Shop All",
      to: "/shop-all",
      icon: LayoutGrid,
      isActive: location.pathname === "/shop-all" && !location.search,
    },
    {
      id: "physiotherapy",
      label: "Physiotherapy",
      to: "/shop-all?category=physiotherapy",
      icon: Activity,
      isActive: location.search.includes("category=physiotherapy"),
    },
    {
      id: "electro-surgical",
      label: "Electro Surgical",
      to: "/shop-all?category=electrosurgical",
      icon: Zap,
      isActive: location.search.includes("category=electrosurgical"),
    },
    {
      id: "cryo-surgical",
      label: "Cryo Surgical",
      to: "/shop-all?category=cryosurgery",
      icon: Snowflake,
      isActive: location.search.includes("category=cryosurgery"),
    },
    {
      id: "ot-lights",
      label: "OT Lights",
      to: "/shop-all?category=ot-lights",
      icon: Sun,
      isActive: location.search.includes("category=ot-lights"),
    },
    {
      id: "ot-tables",
      label: "OT Tables",
      to: "/shop-all?category=tables",
      icon: Bed,
      isActive: location.search.includes("category=tables"),
    },
    {
      id: "obs",
      label: "OBS",
      to: "/shop-all?category=ob-gyn",
      icon: UserCheck,
      isActive: location.search.includes("category=ob-gyn") && !location.search.includes("gyn"),
    },
    {
      id: "tetri",
      label: "TETRI",
      to: "/shop-all?tag=tetri",
      icon: Accessibility,
      isActive: location.search.includes("tag=tetri"),
    },
    {
      id: "cs-and-gyn",
      label: "CS and GYN",
      to: "/shop-all?category=ob-gyn",
      icon: HeartPulse,
      isActive: location.search.includes("category=ob-gyn") && location.search.includes("gyn"),
    },
  ];

  return (
    <header className="w-full z-40 sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#eaeaea] shadow-2xs transition-colors duration-200">
      {/* SECTION 1 — TOP UTILITY & BRAND ROW */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4 sm:gap-6">
          {/* Brand Logo on the left */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors focus:outline-none"
              aria-label="Toggle Navigation"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <Logo variant="light-bg" />
          </div>

          {/* Centered Search Bar with Clean Neutral Styling */}
          <div ref={searchContainerRef} className="flex-1 max-w-xl mx-2 sm:mx-6 relative">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div className="relative flex items-center">
                <Search
                  size={17}
                  className="absolute left-4 text-neutral-400 pointer-events-none transition-colors"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchDropdown(true);
                  }}
                  placeholder="Search medical equipment, models, specifications..."
                  className="w-full pl-11 pr-4 py-2.5 bg-neutral-50 hover:bg-neutral-100/70 focus:bg-white text-neutral-900 placeholder-neutral-400 text-xs sm:text-sm font-medium rounded-full border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]/30 focus:border-[#1F7A4D] transition-all"
                />
                {isSearching && (
                  <div className="absolute right-4 w-4 h-4 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </form>

            {/* Live Autocomplete Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-3 border-b border-neutral-100 bg-neutral-50 flex items-center justify-between text-3xs font-bold text-neutral-500 uppercase tracking-wider">
                  <span>Suggested Clinical Equipment</span>
                  <span>{searchResults.length} Results</span>
                </div>
                <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto">
                  {searchResults.map((prod) => (
                    <Link
                      key={prod.id}
                      to={`/product/${prod.slug}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="p-3 flex items-center gap-3 hover:bg-neutral-50 transition-colors group"
                    >
                      <img
                        src={prod.images?.[0] || "/placeholder.jpg"}
                        alt={prod.title}
                        className="w-11 h-11 rounded-lg object-cover bg-neutral-100 shrink-0 border border-neutral-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-neutral-900 truncate group-hover:text-[#1F7A4D] transition-colors">
                          {prod.title}
                        </div>
                        <div className="text-3xs text-neutral-500 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold uppercase tracking-wider text-neutral-400">{prod.brand}</span>
                          <span>•</span>
                          <span className="capitalize">{prod.category.replace("-", " ")}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 font-mono text-xs font-black text-neutral-900">
                        {formatPrice(prod.basePrice)}
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="p-2.5 bg-neutral-50 border-t border-neutral-100 text-center">
                  <button
                    onClick={handleSearchSubmit}
                    className="text-xs font-bold text-[#1F7A4D] hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    <span>View all matching catalogue results</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Utility Icons: Globe/Currency, Account, Cart */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-neutral-800">
            {/* Globe / Currency Selector */}
            <button
              onClick={() => setIsCountryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-neutral-100 text-neutral-800 transition-all text-xs font-semibold group cursor-pointer border border-transparent hover:border-neutral-200"
              title="Change Country / Currency"
            >
              <Globe size={16} className="text-neutral-600 group-hover:text-black transition-colors" />
              <span className="tracking-wide font-mono text-xs">{currentCurrency}</span>
              <ChevronDown size={13} className="text-neutral-400 group-hover:text-neutral-700 transition-transform" />
            </button>

            {/* Subtle Divider */}
            <span className="w-px h-5 bg-neutral-200 hidden sm:block" />

            {/* Account Icon */}
            <Link
              to="/account"
              className="p-2 rounded-full hover:bg-neutral-100 text-neutral-700 hover:text-black transition-all"
              title={user ? `Account (${user.fullName})` : "Login / Account"}
            >
              <User size={18} />
            </Link>

            {/* Subtle Divider */}
            <span className="w-px h-5 bg-neutral-200 hidden sm:block" />

            {/* Shopping Cart Icon with Circular Quantity Badge */}
            <button
              onClick={openDrawer}
              className="relative p-2 rounded-full hover:bg-neutral-100 text-neutral-800 hover:text-black transition-all cursor-pointer"
              title="Shopping Cart"
              aria-label="View Shopping Cart"
            >
              <ShoppingCart size={19} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#111111] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2 — CLEAN HORIZONTAL NAVIGATION BAR */}
      <div className="border-t border-neutral-100 hidden lg:block bg-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            className="flex items-center justify-between py-1.5 text-neutral-800"
            aria-label="Main Navigation"
          >
            {navItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  className={`group relative flex items-center gap-1.5 py-2 px-3 text-xs font-semibold transition-all rounded-lg ${
                    item.isActive
                      ? "text-[#111111] font-bold"
                      : "text-neutral-600 hover:text-[#111111] hover:bg-neutral-50"
                  }`}
                >
                  <IconComponent
                    size={15}
                    className={`transition-colors ${
                      item.isActive
                        ? "text-[#1F7A4D]"
                        : "text-neutral-400 group-hover:text-neutral-700"
                    }`}
                  />
                  <span className="tracking-tight whitespace-nowrap">{item.label}</span>

                  {/* Minimal Green Underline for Active Item */}
                  {item.isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#1F7A4D] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* MOBILE RESPONSIVE DRAWER */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-sm bg-white h-full overflow-y-auto p-5 shadow-2xl flex flex-col justify-between border-r border-neutral-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <Logo variant="light-bg" showTagline={false} />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Search */}
              <form
                onSubmit={(e) => {
                  handleSearchSubmit(e);
                  setIsMobileMenuOpen(false);
                }}
                className="mt-4 mb-4"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search equipment..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-100 border border-neutral-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#1F7A4D]"
                  />
                  <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
                </div>
              </form>

              {/* Nav Items in Mobile Drawer */}
              <div className="space-y-1 text-xs font-semibold text-neutral-800">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${
                        item.isActive
                          ? "bg-[#EAF5EF] text-[#1F7A4D] font-bold"
                          : "hover:bg-neutral-50 text-neutral-700"
                      }`}
                    >
                      <Icon
                        size={17}
                        className={item.isActive ? "text-[#1F7A4D]" : "text-neutral-500"}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Mobile Footer Area */}
            <div className="pt-4 border-t border-neutral-100 space-y-3">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsCountryModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-100"
              >
                <span className="flex items-center gap-2">
                  <Globe size={16} className="text-[#1F7A4D]" />
                  <span>Country & Currency</span>
                </span>
                <span className="text-[#1F7A4D] font-mono">{currentCurrency}</span>
              </button>

              <Link
                to="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full block py-2.5 text-center bg-[#111111] hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Customer Portal / Account
              </Link>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* GLOBAL COUNTRY & CURRENCY SELECTION MODAL */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            ref={countryModalRef}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
                  <Globe size={18} className="text-[#1F7A4D]" />
                  <span>Select Destination Country & Currency</span>
                </h3>
                <p className="text-2xs text-neutral-500 mt-0.5">
                  Real-time exchange rates calculated against master USD base pricing.
                </p>
              </div>
              <button
                onClick={() => setIsCountryModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Country Search Bar */}
            <div className="my-4 relative">
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search country or currency code (e.g. India, INR, USD, EUR)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1F7A4D] text-neutral-900"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
            </div>

            {/* Country List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredCountries.map((c) => {
                const isSelected = currentCountry.code === c.code;
                const rate = exchangeRates[c.currency] || 1;
                return (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCountry(c.code);
                      setIsCountryModalOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? "bg-[#EAF5EF] border border-[#1F7A4D]/30 text-[#1F7A4D]"
                        : "hover:bg-neutral-50 border border-transparent text-neutral-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{c.flag}</span>
                      <div>
                        <div className="text-xs font-bold text-neutral-900">{c.name}</div>
                        <div className="text-3xs text-neutral-500">
                          Currency: <span className="font-semibold text-neutral-700">{c.currency}</span> ({c.symbol})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-3xs font-mono text-neutral-400">
                        1 USD ≈ {rate.toFixed(2)} {c.currency}
                      </div>
                      {isSelected && <Check size={16} className="text-[#1F7A4D]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 mt-2 border-t border-neutral-100 flex items-center justify-between text-2xs text-neutral-500">
              <span>Automatic freight & regulatory compliance calculated at checkout.</span>
              <button
                onClick={() => setIsCountryModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#111111] hover:bg-black text-white font-bold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
