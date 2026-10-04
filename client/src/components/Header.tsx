import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Globe,
  ChevronDown,
  Menu,
  X,
  ArrowRight,
  Check,
  ChevronRight
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { Product } from "../types";
import { Logo } from "./Logo";

interface SearchCategoryMatch {
  id: string;
  name: string;
  slug: string;
  isSubcategory?: boolean;
  parentCategory?: string;
  link: string;
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { currentCountry, currentCurrency, countries, setCountry, formatPrice } = useCurrency();
  const { itemCount, openDrawer } = useCart();
  const { wishlistCount } = useWishlist();
  const { user } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchCategories, setSearchCategories] = useState<SearchCategoryMatch[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const countryModalRef = useRef<HTMLDivElement>(null);

  // Mega menu hover state
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const megaMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile menu accordion state
  const [expandedMobileCategory, setExpandedMobileCategory] = useState<string | null>(null);

  // Live search handler (fetches on ANY input, even single characters like 'F', 'OT', etc.)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchCategories([]);
      setTotalMatches(0);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search/live?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSearchResults(data.products || []);
            setSearchCategories(data.categories || []);
            setTotalMatches(data.totalCount || 0);
            setShowSearchDropdown(true);
          }
        }
      } catch (err) {
        console.error("Live search fetch error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

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

  const handleMegaMenuEnter = (id: string) => {
    if (megaMenuTimeoutRef.current) {
      clearTimeout(megaMenuTimeoutRef.current);
    }
    setActiveMegaMenu(id);
  };

  const handleMegaMenuLeave = () => {
    megaMenuTimeoutRef.current = setTimeout(() => {
      setActiveMegaMenu(null);
    }, 150);
  };

  // Second row category items and their subcategories
  const navCategories = [
    {
      id: "home",
      label: "Home",
      to: "/",
      isHome: true,
      hasSubmenu: false
    },
    {
      id: "shop-all",
      label: "Shop All",
      to: "/shop-all",
      hasSubmenu: false
    },
    {
      id: "physiotherapy",
      label: "Physiotherapy",
      to: "/shop-all?category=physiotherapy",
      categorySlug: "physiotherapy",
      hasSubmenu: true,
      subcategories: [
        { label: "Ultrasound Therapy Machines", to: "/shop-all?category=physiotherapy&subcategory=ultrasound-therapy-machines" },
        { label: "TENS Machines", to: "/shop-all?category=physiotherapy&subcategory=tens-machines" },
        { label: "Laser Therapy Machines", to: "/shop-all?category=physiotherapy&subcategory=laser-therapy-machine" },
        { label: "CPM Machines", to: "/shop-all?category=physiotherapy&subcategory=cpm" },
        { label: "Shortwave Diathermy", to: "/shop-all?category=physiotherapy&subcategory=shortwave-diathermy-machine" },
        { label: "Longwave Diathermy", to: "/shop-all?category=physiotherapy&subcategory=longwave-diathermy-machine" },
        { label: "Shockwave Therapy", to: "/shop-all?category=physiotherapy&subcategory=shockwave-therapy-machine" },
        { label: "Electronic Traction", to: "/shop-all?category=physiotherapy&subcategory=electronic-traction-machine" },
        { label: "Muscle Stimulators", to: "/shop-all?category=physiotherapy&subcategory=electric-muscle-stimulator" }
      ]
    },
    {
      id: "electrosurgical",
      label: "Electrosurgical",
      to: "/shop-all?category=electrosurgical-units",
      categorySlug: "electrosurgical-units",
      hasSubmenu: true,
      subcategories: [
        { label: "Electrosurgical Cautery", to: "/shop-all?category=electrosurgical-units&subcategory=electro-surgical-skin-cautery" },
        { label: "Electrosurgical Generators", to: "/shop-all?category=electrosurgical-units&subcategory=electrosurgical-generator" },
        { label: "Surgical Electrodes & Accessories", to: "/shop-all?category=electrosurgical-units&subcategory=surgical-accessories" }
      ]
    },
    {
      id: "cryo-surgical",
      label: "Cryo Surgical",
      to: "/shop-all?category=cryo-surgical",
      categorySlug: "cryo-surgical",
      hasSubmenu: true,
      subcategories: [
        { label: "Cryo Surgical Guns", to: "/shop-all?category=cryo-surgical&subcategory=cryo-gun" },
        { label: "Cryotherapy Systems", to: "/shop-all?category=cryo-surgical&subcategory=cryotherapy-systems" },
        { label: "Replacement Nozzles & Accessories", to: "/shop-all?category=cryo-surgical&subcategory=cryo-replacement-nozzles" }
      ]
    },
    {
      id: "ot-lights",
      label: "OT Lights",
      to: "/shop-all?category=ot-lights",
      categorySlug: "ot-lights",
      hasSubmenu: true,
      subcategories: [
        { label: "Single Dome OT Lights", to: "/shop-all?category=ot-lights&subcategory=single-dome-ot-lights" },
        { label: "Double Dome OT Lights", to: "/shop-all?category=ot-lights&subcategory=ot-surgical-lights-double-dome" },
        { label: "Mobile OT Lights", to: "/shop-all?category=ot-lights&subcategory=mobile-led-ot-lights" },
        { label: "Ceiling-Mounted Systems", to: "/shop-all?category=ot-lights&subcategory=ceiling-mounted-systems" }
      ]
    },
    {
      id: "ot-tables",
      label: "OT Tables",
      to: "/shop-all?category=examination-ot-tables",
      categorySlug: "examination-ot-tables",
      hasSubmenu: true,
      subcategories: [
        { label: "Operating Tables", to: "/shop-all?category=examination-ot-tables&subcategory=operating-tables" },
        { label: "Examination Tables", to: "/shop-all?category=examination-ot-tables&subcategory=examination-tables" },
        { label: "Treatment & Rehabilitation Couches", to: "/shop-all?category=examination-ot-tables&subcategory=treatment-tables" }
      ]
    },
    {
      id: "obg",
      label: "OBG",
      to: "/shop-all?category=obstetrics-and-gynaecology",
      categorySlug: "obstetrics-and-gynaecology",
      hasSubmenu: true,
      subcategories: [
        { label: "Obstetric Delivery Tables", to: "/shop-all?category=obstetrics-and-gynaecology&subcategory=obstetric-tables" },
        { label: "Gynaecology Examination Tables", to: "/shop-all?category=obstetrics-and-gynaecology&subcategory=gynaecology-examination-tables" },
        { label: "Fetal Doppler & Monitoring", to: "/shop-all?category=obstetrics-and-gynaecology&subcategory=fetal-monitoring-equipment" }
      ]
    }
  ];

  // Check active state
  const isNavActive = (item: (typeof navCategories)[0]) => {
    if (item.isHome) {
      return location.pathname === "/";
    }
    if (item.id === "shop-all") {
      return location.pathname === "/shop-all" && !location.search;
    }
    if (item.categorySlug) {
      return (
        location.search.includes(`category=${item.categorySlug}`) ||
        location.pathname.includes(`/category/${item.categorySlug}`)
      );
    }
    return false;
  };

  // Filter countries for modal
  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.currency.toLowerCase().includes(countrySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  return (
    <header className="w-full z-40 sticky top-0 bg-white border-b border-[#E5E5E5] shadow-xs select-none">
      {/* ==============================================================
          TOP ROW: LOGO (LEFT) | CENTERED SEARCH BAR | UTILITY ICONS (RIGHT)
      ============================================================== */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4 lg:gap-8">
          
          {/* LEFT: DR.MEDEX Logo & Mobile Hamburger */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-neutral-700 hover:text-black hover:bg-neutral-100 rounded-xl transition-colors focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <Logo variant="light-bg" />
          </div>

          {/* CENTER: Large Rounded Search Bar with Green Action Button */}
          <div ref={searchContainerRef} className="flex-1 max-w-2xl mx-auto relative hidden sm:block">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <div className="relative flex items-center bg-[#F7F7F7] hover:bg-[#F2F2F2] focus-within:bg-white rounded-full border border-[#E5E5E5] focus-within:border-[#167A4A] focus-within:ring-2 focus-within:ring-[#167A4A]/20 transition-all pl-4 pr-1.5 py-1">
                <Search
                  size={18}
                  className="text-neutral-400 shrink-0 mr-3 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0 || searchCategories.length > 0) {
                      setShowSearchDropdown(true);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setShowSearchDropdown(false);
                    }
                  }}
                  placeholder="Search medical equipment, models, specifications..."
                  className="w-full bg-transparent py-1.5 text-xs sm:text-sm text-neutral-900 placeholder-neutral-500 font-medium focus:outline-none"
                />

                {isSearching ? (
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <div className="w-4 h-4 border-2 border-[#167A4A] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <button
                    type="submit"
                    aria-label="Search Catalog"
                    className="w-8 h-8 rounded-full bg-[#167A4A] hover:bg-[#13673e] text-white flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
                  >
                    <Search size={15} />
                  </button>
                )}
              </div>
            </form>

            {/* LIVE SEARCH RESULTS DROPDOWN */}
            {showSearchDropdown && (searchResults.length > 0 || searchCategories.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-[#E5E5E5] overflow-hidden z-50 animate-in fade-in duration-150">
                <div className="p-3 border-b border-neutral-100 bg-[#F7F7F7] flex items-center justify-between text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                  <span>Search Results</span>
                  <span>{totalMatches} matching items</span>
                </div>

                <div className="max-h-96 overflow-y-auto divide-y divide-neutral-100">
                  {/* Products Section */}
                  {searchResults.length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-white">
                        Products
                      </div>
                      {searchResults.map((prod) => (
                        <Link
                          key={prod.id}
                          to={`/product/${prod.slug}`}
                          onClick={() => setShowSearchDropdown(false)}
                          className="px-4 py-3 flex items-center gap-3 hover:bg-neutral-50 transition-colors group"
                        >
                          <img
                            src={prod.images?.[0] || "/placeholder.jpg"}
                            alt={prod.title}
                            className="w-11 h-11 rounded-lg object-contain bg-neutral-50 shrink-0 border border-neutral-200 p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80";
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-neutral-900 truncate group-hover:text-[#167A4A] transition-colors">
                              {prod.title}
                            </div>
                            <div className="text-[11px] text-neutral-500 flex items-center gap-2 mt-0.5">
                              <span className="font-semibold text-neutral-400 uppercase text-[10px]">
                                {prod.brand || "DR.MEDEX"}
                              </span>
                              <span>•</span>
                              <span className="capitalize text-neutral-600">
                                {prod.category?.replace(/-/g, " ")}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 font-mono text-xs font-black text-neutral-900">
                            {formatPrice(prod.basePrice)}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Categories Section */}
                  {searchCategories.length > 0 && (
                    <div className="bg-[#FAFAFA] border-t border-neutral-100">
                      <div className="px-4 py-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                        Categories
                      </div>
                      <div className="px-3 pb-3 flex flex-wrap gap-2">
                        {searchCategories.map((cat) => (
                          <Link
                            key={cat.id}
                            to={cat.link}
                            onClick={() => setShowSearchDropdown(false)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#EAF5EF] border border-neutral-200 hover:border-[#167A4A]/40 text-xs font-semibold text-neutral-800 hover:text-[#167A4A] transition-colors"
                          >
                            <span>{cat.name}</span>
                            <ArrowRight size={12} className="text-neutral-400 group-hover:text-[#167A4A]" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-neutral-50 border-t border-neutral-100 text-center">
                  <button
                    onClick={handleSearchSubmit}
                    className="text-xs font-bold text-[#167A4A] hover:text-[#13673e] hover:underline flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <span>View all search results</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Country/Currency Selector, Account, Wishlist, Cart */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 text-neutral-800">
            {/* Country / Currency Selector */}
            <button
              onClick={() => setIsCountryModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-neutral-100 text-neutral-800 transition-all text-xs font-semibold group cursor-pointer border border-transparent hover:border-neutral-200"
              title="Select Country & Currency"
              aria-label="Country and Currency Selector"
            >
              <Globe size={16} className="text-neutral-600 group-hover:text-black transition-colors" />
              <span className="tracking-wide font-mono text-xs font-bold">{currentCurrency}</span>
              <ChevronDown size={13} className="text-neutral-400 group-hover:text-neutral-700 transition-transform" />
            </button>

            {/* Subtle Divider */}
            <span className="w-px h-4 bg-neutral-200 hidden sm:block mx-1" />

            {/* Account Icon */}
            <Link
              to="/account"
              className="p-2 rounded-full hover:bg-neutral-100 text-neutral-800 hover:text-black transition-all"
              title={user ? `Account (${user.fullName})` : "Login / Customer Portal"}
              aria-label="User Account"
            >
              <User size={18} />
            </Link>

            {/* Wishlist / Favorite Icon with Count Badge */}
            <Link
              to="/wishlist"
              className={`relative p-2 rounded-full hover:bg-neutral-100 transition-all ${
                location.pathname === "/wishlist" ? "text-[#167A4A]" : "text-neutral-800 hover:text-black"
              }`}
              title="Saved Equipment (Wishlist)"
              aria-label="Wishlist"
            >
              <Heart size={18} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#167A4A] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Shopping Cart Icon with Circular Quantity Badge */}
            <button
              onClick={openDrawer}
              className="relative p-2 rounded-full hover:bg-neutral-100 text-neutral-800 hover:text-black transition-all cursor-pointer"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingCart size={19} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#111111] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (Only shown on small screens under top row) */}
        <div className="mt-2.5 sm:hidden">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <div className="flex items-center bg-[#F7F7F7] rounded-full border border-[#E5E5E5] pl-3.5 pr-1 py-1">
              <Search size={16} className="text-neutral-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medical equipment..."
                className="w-full bg-transparent text-xs text-neutral-900 placeholder-neutral-500 focus:outline-none font-medium py-1"
              />
              <button
                type="submit"
                className="w-7 h-7 rounded-full bg-[#167A4A] text-white flex items-center justify-center shrink-0"
              >
                <Search size={13} />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ==============================================================
          SECOND ROW: HORIZONTALLY CENTERED CATEGORY NAVIGATION + MEGA MENUS
      ============================================================== */}
      <div className="border-t border-[#E5E5E5] hidden lg:block bg-white relative">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            className="flex items-center justify-center gap-1 xl:gap-2 py-1"
            aria-label="Product Categories Navigation"
          >
            {navCategories.map((item) => {
              const active = isNavActive(item);
              const isMegaOpen = activeMegaMenu === item.id && item.hasSubmenu;

              return (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => item.hasSubmenu && handleMegaMenuEnter(item.id)}
                  onMouseLeave={() => item.hasSubmenu && handleMegaMenuLeave()}
                >
                  <Link
                    to={item.to}
                    className={`relative inline-flex items-center gap-1 px-3 py-2 text-xs font-medium tracking-normal transition-colors rounded-md ${
                      active
                        ? "text-[#111111] font-bold"
                        : "text-neutral-800 hover:text-black hover:bg-neutral-50"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.hasSubmenu && (
                      <ChevronDown
                        size={12}
                        className={`text-neutral-400 transition-transform duration-200 ${
                          isMegaOpen ? "rotate-180 text-neutral-700" : ""
                        }`}
                      />
                    )}

                    {/* Reference-style active underline */}
                    {active && (
                      <span className="absolute bottom-0 left-2.5 right-2.5 h-[2px] bg-[#167A4A] rounded-full" />
                    )}
                  </Link>

                  {/* MEGA MENU HOVER DROPDOWN */}
                  {item.hasSubmenu && isMegaOpen && item.subcategories && (
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 pt-1 w-72 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                      onMouseEnter={() => handleMegaMenuEnter(item.id)}
                      onMouseLeave={handleMegaMenuLeave}
                    >
                      <div className="bg-white rounded-2xl shadow-xl border border-[#E5E5E5] p-2.5 overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider border-b border-neutral-100 mb-1 flex items-center justify-between">
                          <span>{item.label} Subcategories</span>
                        </div>
                        <div className="space-y-0.5">
                          {item.subcategories.map((sub) => (
                            <Link
                              key={sub.to}
                              to={sub.to}
                              onClick={() => setActiveMegaMenu(null)}
                              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-neutral-800 hover:text-[#167A4A] hover:bg-[#EAF5EF] transition-colors group"
                            >
                              <span>{sub.label}</span>
                              <ChevronRight size={13} className="text-neutral-300 group-hover:text-[#167A4A] transition-colors" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* ==============================================================
          MOBILE NAVIGATION DRAWER
      ============================================================== */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-sm bg-white h-full overflow-y-auto p-5 shadow-2xl flex flex-col justify-between border-r border-[#E5E5E5]">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
                <Logo variant="light-bg" showTagline={false} />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg"
                  aria-label="Close Navigation"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation Items with Accordions */}
              <div className="space-y-1 py-4 text-xs font-semibold text-neutral-800">
                {navCategories.map((item) => {
                  const active = isNavActive(item);
                  const isExpanded = expandedMobileCategory === item.id;

                  return (
                    <div key={item.id} className="border-b border-neutral-100 pb-1">
                      <div className="flex items-center justify-between">
                        <Link
                          to={item.to}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex-1 py-2 px-3 rounded-xl transition-colors ${
                            active
                              ? "bg-[#EAF5EF] text-[#167A4A] font-bold"
                              : "hover:bg-neutral-50 text-neutral-800"
                          }`}
                        >
                          {item.label}
                        </Link>
                        {item.hasSubmenu && (
                          <button
                            type="button"
                            onClick={() => setExpandedMobileCategory(isExpanded ? null : item.id)}
                            className="p-2 text-neutral-400 hover:text-neutral-700"
                            aria-label={`Toggle ${item.label} subcategories`}
                          >
                            <ChevronDown
                              size={16}
                              className={`transition-transform duration-200 ${isExpanded ? "rotate-180 text-[#167A4A]" : ""}`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Mobile Submenu Accordion */}
                      {item.hasSubmenu && isExpanded && item.subcategories && (
                        <div className="pl-4 pr-2 py-1 space-y-1 bg-neutral-50 rounded-xl my-1">
                          {item.subcategories.map((sub) => (
                            <Link
                              key={sub.to}
                              to={sub.to}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="block py-1.5 px-2 text-[11px] font-medium text-neutral-700 hover:text-[#167A4A] transition-colors"
                            >
                              • {sub.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Additional Links */}
                <Link
                  to="/wishlist"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-neutral-50 text-neutral-800"
                >
                  <span className="flex items-center gap-2">
                    <Heart size={16} className="text-[#167A4A]" />
                    <span>Saved Equipment</span>
                  </span>
                  {wishlistCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#EAF5EF] text-[#167A4A]">
                      {wishlistCount}
                    </span>
                  )}
                </Link>
              </div>
            </div>

            {/* Mobile Footer Area */}
            <div className="pt-4 border-t border-neutral-100 space-y-2.5">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsCountryModalOpen(true);
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-bold text-neutral-800 hover:bg-neutral-100"
              >
                <span className="flex items-center gap-2">
                  <Globe size={16} className="text-[#167A4A]" />
                  <span>Country & Currency</span>
                </span>
                <span className="text-[#167A4A] font-mono font-bold">
                  {currentCountry.flag} {currentCurrency}
                </span>
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

      {/* ==============================================================
          GLOBAL COUNTRY & CURRENCY SELECTION MODAL
      ============================================================== */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            ref={countryModalRef}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div>
                <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
                  <Globe size={18} className="text-[#167A4A]" />
                  <span>Select Destination Country & Currency</span>
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Base prices are stored in INR and converted dynamically using current live exchange rates.
                </p>
              </div>
              <button
                onClick={() => setIsCountryModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors"
                aria-label="Close Modal"
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
                placeholder="Search country or currency (e.g. India, INR, United States, USD, EUR)..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#167A4A] text-neutral-900"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-neutral-400" />
            </div>

            {/* Country List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredCountries.map((c) => {
                const isSelected = currentCountry.code === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCountry(c.code);
                      setIsCountryModalOpen(false);
                    }}
                    className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all ${
                      isSelected
                        ? "bg-[#EAF5EF] border border-[#167A4A]/30 text-[#167A4A]"
                        : "hover:bg-neutral-50 border border-transparent text-neutral-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{c.flag}</span>
                      <div>
                        <div className="text-xs font-bold text-neutral-900">{c.name}</div>
                        <div className="text-[11px] text-neutral-500">
                          Currency: <span className="font-semibold text-neutral-700">{c.currency}</span> ({c.symbol})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSelected && <Check size={16} className="text-[#167A4A]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 mt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
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
