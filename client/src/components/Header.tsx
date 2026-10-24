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
  ChevronRight,
  Package,
  LogOut,
  ShieldCheck
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { CustomerAuthModal } from "./auth/CustomerAuthModal";
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
  const { user, logout } = useAuth();
  const { isAuthenticated: isAdminAuthenticated, adminUser } = useAdminAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // Customer Authentication Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"signin" | "signup">("signin");
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Check if current route is a product detail page
  const isProductDetailPage =
    location.pathname.startsWith("/product/") || location.pathname.startsWith("/products/");

  // Scroll direction state for hiding header on scroll down (product detail page only)
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!isProductDetailPage) {
      setIsHeaderHidden(false);
      return;
    }

    // Always reset to visible on route change
    setIsHeaderHidden(false);
    lastScrollYRef.current = window.scrollY;

    const SCROLL_THRESHOLD = 8;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const prevScrollY = lastScrollYRef.current;
          const diff = currentScrollY - prevScrollY;

          // Keep header visible at the top when page is at its initial position
          if (currentScrollY <= 20) {
            setIsHeaderHidden(false);
          } else if (Math.abs(diff) >= SCROLL_THRESHOLD) {
            if (diff > 0 && currentScrollY > 60) {
              // Scrolling downward: smoothly hide header
              setIsHeaderHidden(true);
            } else if (diff < 0) {
              // Scrolling upward: smoothly reveal header
              setIsHeaderHidden(false);
            }
          }

          lastScrollYRef.current = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isProductDetailPage, location.pathname]);

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
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
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

  // Second row category items and their verified subcategories
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
      id: "electrosurgical",
      label: "Electrosurgical",
      to: "/category/electrosurgical-units",
      categorySlug: "electrosurgical-units",
      hasSubmenu: true,
      subcategories: [
        { label: "Electrosurgical Cautery", to: "/shop-all?category=electrosurgical-units&subcategory=electro-surgical-skin-cautery" },
        { label: "Electrosurgical Generators", to: "/shop-all?category=electrosurgical-units&subcategory=electrosurgical-generator" }
      ]
    },
    {
      id: "cryo-surgical",
      label: "Cryo Surgical",
      to: "/category/cryo-surgical",
      categorySlug: "cryo-surgical",
      hasSubmenu: true,
      subcategories: [
        { label: "Cryo Surgical Guns", to: "/shop-all?category=cryo-surgical&subcategory=cryo-gun" },
        { label: "Cryo Skin Cautery Units", to: "/shop-all?category=cryo-surgical&subcategory=electro-surgical-skin-cautery" }
      ]
    },
    {
      id: "ot-lights",
      label: "OT Lights",
      to: "/category/ot-lights",
      categorySlug: "ot-lights",
      hasSubmenu: true,
      subcategories: [
        { label: "Single Dome OT Lights", to: "/shop-all?category=ot-lights&subcategory=single-dome-ot-lights" },
        { label: "Double Dome OT Lights", to: "/shop-all?category=ot-lights&subcategory=ot-surgical-lights-double-dome" },
        { label: "Mobile LED OT Lights", to: "/shop-all?category=ot-lights&subcategory=mobile-led-ot-lights" }
      ]
    },
    {
      id: "ot-tables",
      label: "OT Tables",
      to: "/category/examination-ot-tables",
      categorySlug: "examination-ot-tables",
      hasSubmenu: true,
      subcategories: [
        { label: "Operating OT Tables", to: "/shop-all?category=examination-ot-tables&subcategory=examination-ot-tables" },
        { label: "Clinical Chairs & Exam Tables", to: "/shop-all?category=examination-ot-tables&subcategory=general-medical" }
      ]
    },
    {
      id: "obg",
      label: "OBG",
      to: "/category/obstetrics-and-gynaecology",
      categorySlug: "obstetrics-and-gynaecology",
      hasSubmenu: true,
      subcategories: [
        { label: "Obstetric & Gynecological Delivery", to: "/shop-all?category=obstetrics-and-gynaecology&subcategory=obstetrics-and-gynaecology" },
        { label: "Gynecology Examination Tables", to: "/shop-all?category=obstetrics-and-gynaecology&subcategory=examination-ot-tables" },
        { label: "Thermal Coagulation & Colposcopy", to: "/shop-all?category=obstetrics-and-gynaecology&subcategory=electrosurgical-generator" }
      ]
    },
    {
      id: "medical-equipment",
      label: "General Medical",
      to: "/category/medical-equipment",
      categorySlug: "medical-equipment",
      hasSubmenu: true,
      subcategories: [
        { label: "Diagnostic Instruments & Screens", to: "/shop-all?category=medical-equipment&subcategory=general-medical" },
        { label: "Ultrasound Therapy Transducers", to: "/shop-all?category=medical-equipment&subcategory=ultrasound-therapy-machines" },
        { label: "TENS & Clinical Muscle Stimulation", to: "/shop-all?category=medical-equipment&subcategory=tens-machines" },
        { label: "Hospital Trolleys & Utility Equipment", to: "/shop-all?category=medical-equipment&subcategory=cpm" }
      ]
    }
  ];

  // Check active state
  const isNavActive = (item: (typeof navCategories)[0]) => {
    if (item.isHome) {
      return location.pathname === "/";
    }
    if (item.id === "shop-all") {
      return (
        (location.pathname === "/shop-all" && !location.search.includes("category=")) ||
        (location.pathname === "/products" && !location.search.includes("category="))
      );
    }
    if (item.categorySlug) {
      return (
        location.search.includes(`category=${item.categorySlug}`) ||
        location.pathname === `/category/${item.categorySlug}` ||
        location.pathname.startsWith(`/category/${item.categorySlug}/`)
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

  const shouldHideHeader = isProductDetailPage && isHeaderHidden && !isMobileMenuOpen;

  return (
    <header
      className={`w-full z-40 sticky top-0 bg-white select-none transition-transform duration-300 ease-in-out will-change-transform ${
        shouldHideHeader ? "-translate-y-full pointer-events-none" : "translate-y-0"
      }`}
    >
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

            <Logo variant="light-bg" showIcon={false} />
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
            {/* Country / Currency Selector Dropdown */}
            <div className="relative" ref={countryModalRef}>
              <button
                onClick={() => setIsCountryModalOpen(!isCountryModalOpen)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full hover:bg-neutral-100 text-neutral-800 transition-all text-xs font-semibold group cursor-pointer border border-transparent hover:border-neutral-200"
                title="Select Country & Currency"
                aria-label="Country and Currency Selector"
                aria-expanded={isCountryModalOpen}
              >
                <Globe size={16} className="text-[#627188] group-hover:text-[#4D596B] transition-colors" />
                <span className="tracking-wide font-mono text-xs font-bold text-[#627188]">{currentCurrency}</span>
                <ChevronDown size={13} className={`text-neutral-400 group-hover:text-neutral-700 transition-transform ${isCountryModalOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Anchored Popover directly below trigger */}
              {isCountryModalOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl p-5 shadow-2xl border border-neutral-200 z-[100] flex flex-col max-h-[80vh] sm:max-h-[500px] animate-in fade-in duration-150"
                  role="dialog"
                  aria-label="Country and Currency Selection"
                >
                  <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100">
                    <div>
                      <h3 className="text-sm font-black text-neutral-900 flex items-center gap-2">
                        <Globe size={16} className="text-[#627188]" />
                        <span>Select Country & Currency</span>
                      </h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Base prices convert dynamically using live exchange rates.
                      </p>
                    </div>
                    <button
                      onClick={() => setIsCountryModalOpen(false)}
                      className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="my-3 relative">
                    <input
                      type="text"
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      placeholder="Search country or currency..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#627188] text-neutral-900"
                    />
                    <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
                  </div>

                  {/* Country List with Moss Green scrollbar */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0 [scrollbar-color:#627188_#F3F4F6] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#F3F4F6] [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#627188] hover:[&::-webkit-scrollbar-thumb]:bg-[#4D596B] [&::-webkit-scrollbar-thumb]:rounded-full">
                    {filteredCountries.map((c) => {
                      const isSelected = currentCountry.code === c.code;
                      return (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setCountry(c.code);
                            setIsCountryModalOpen(false);
                          }}
                          className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#627188]/15 border border-[#627188]/30 text-[#627188]"
                              : "hover:bg-neutral-50 border border-transparent text-neutral-800"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-lg leading-none shrink-0">{c.flag}</span>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-neutral-900 truncate">{c.name}</div>
                              <div className="text-[10px] text-neutral-500">
                                <span className="font-semibold text-neutral-700">{c.currency}</span> ({c.symbol})
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check size={15} className="text-[#4D596B] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Footer & Done Button */}
                  <div className="pt-3 mt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="text-[10px] text-neutral-400">Automatic freight at checkout</span>
                    <button
                      type="button"
                      onClick={() => setIsCountryModalOpen(false)}
                      className="px-4 py-1.5 rounded-lg bg-[#627188] hover:bg-[#4D596B] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Divider */}
            <span className="w-px h-4 bg-neutral-200 hidden sm:block mx-1" />

            {/* Account Icon / Customer Greeting */}
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:bg-neutral-100 text-neutral-800 transition-all text-xs font-semibold group border border-transparent hover:border-neutral-200 cursor-pointer"
                  title={`Customer Account: ${user.fullName || user.email}`}
                  aria-label="Customer Account Menu"
                  aria-expanded={isUserMenuOpen}
                >
                  <div className="w-5 h-5 rounded-full bg-[#627188]/10 text-[#627188] flex items-center justify-center">
                    <User size={13} />
                  </div>
                  <span className="hidden md:inline text-neutral-700 group-hover:text-[#627188] font-medium max-w-[130px] truncate">
                    Hi, {user.fullName ? user.fullName.split(" ")[0].replace(/^Dr\.?\s*/i, "") : user.email?.split("@")[0]}
                  </span>
                  <ChevronDown
                    size={12}
                    className={`text-neutral-400 group-hover:text-neutral-600 transition-transform ${
                      isUserMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Compact Customer Menu Dropdown */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-4 py-2.5 border-b border-neutral-100">
                      <div className="text-3xs font-extrabold uppercase tracking-wider text-[#627188] mb-0.5">
                        Verified Customer
                      </div>
                      <p className="text-xs font-bold text-neutral-900 truncate">
                        {user.fullName || "Customer"}
                      </p>
                      <p className="text-2xs text-neutral-500 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/account"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-[#627188] font-medium transition-colors"
                      >
                        <User size={14} className="text-neutral-400" />
                        <span>Account Dashboard</span>
                      </Link>
                      <Link
                        to="/account?tab=orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-[#627188] font-medium transition-colors"
                      >
                        <Package size={14} className="text-neutral-400" />
                        <span>Orders & RFQ Quotes</span>
                      </Link>
                      <Link
                        to="/wishlist"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs text-neutral-700 hover:bg-neutral-50 hover:text-[#627188] font-medium transition-colors"
                      >
                        <Heart size={14} className="text-neutral-400" />
                        <span>Saved Equipment</span>
                      </Link>
                    </div>

                    <div className="border-t border-neutral-100 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsUserMenuOpen(false);
                          await logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold transition-colors cursor-pointer"
                      >
                        <LogOut size={14} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : isAdminAuthenticated ? (
              <Link
                to="/admin"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#167A4A]/10 text-[#167A4A] hover:bg-[#167A4A]/20 transition-all text-xs font-bold border border-[#167A4A]/30 cursor-pointer"
                title={`Admin Platform: ${adminUser?.name || "Administrator"}`}
              >
                <ShieldCheck size={14} className="text-[#167A4A]" />
                <span className="hidden md:inline">Admin</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab("signin");
                  setIsAuthModalOpen(true);
                }}
                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-800 hover:text-[#627188] transition-all cursor-pointer"
                title="Sign In / Customer Account"
                aria-label="Sign In or Register"
              >
                <User size={18} />
              </button>
            )}

            {/* Wishlist / Favorite Icon with Count Badge */}
            <Link
              to="/wishlist"
              className={`relative p-2 rounded-full hover:bg-neutral-100 transition-all ${
                location.pathname === "/wishlist" ? "text-[#627188]" : "text-neutral-800 hover:text-[#627188]"
              }`}
              title="Saved Equipment (Wishlist)"
              aria-label="Wishlist"
            >
              <Heart size={18} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#627188] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Shopping Cart Icon with Circular Quantity Badge */}
            <button
              onClick={openDrawer}
              className="relative p-2 rounded-full hover:bg-neutral-100 text-neutral-800 hover:text-[#627188] transition-all cursor-pointer"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <ShoppingCart size={19} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#627188] text-white text-[10px] font-black flex items-center justify-center shadow-xs">
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
      <div className="bg-[#627188] relative overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <nav
            className="flex items-center justify-start lg:justify-center gap-1 xl:gap-2 py-1 whitespace-nowrap min-w-max lg:min-w-0"
            aria-label="Product Categories Navigation"
          >
            {navCategories.map((item) => {
              const active = isNavActive(item);
              const isMegaOpen = activeMegaMenu === item.id && item.hasSubmenu;

              return (
                <div
                  key={item.id}
                  className="relative shrink-0"
                  onMouseEnter={() => item.hasSubmenu && handleMegaMenuEnter(item.id)}
                  onMouseLeave={() => item.hasSubmenu && handleMegaMenuLeave()}
                >
                  <Link
                    to={item.to}
                    className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-normal transition-all rounded-lg ${
                      active
                        ? "text-white font-bold bg-white/20"
                        : "text-white/95 hover:text-white hover:bg-white/15 font-medium"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.hasSubmenu && (
                      <ChevronDown
                        size={12}
                        className={`text-white/80 transition-transform duration-200 ${
                          isMegaOpen ? "rotate-180 text-white" : ""
                        }`}
                      />
                    )}
                  </Link>

                  {/* MEGA MENU HOVER DROPDOWN */}
                  {item.hasSubmenu && isMegaOpen && item.subcategories && (
                    <div
                      className="absolute top-full left-1/2 -translate-x-1/2 pt-1 w-72 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                      onMouseEnter={() => handleMegaMenuEnter(item.id)}
                      onMouseLeave={handleMegaMenuLeave}
                    >
                      <div className="bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-2.5 overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-[#6B7280] uppercase tracking-wider border-b border-[#E5E7EB] mb-1 flex items-center justify-between">
                          <span>{item.label} Subcategories</span>
                        </div>
                        <div className="space-y-0.5">
                          {item.subcategories.map((sub) => (
                            <Link
                              key={sub.to}
                              to={sub.to}
                              onClick={() => setActiveMegaMenu(null)}
                              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#171717] hover:text-[#627188] hover:bg-[#627188]/10 transition-colors group"
                            >
                              <span>{sub.label}</span>
                              <ChevronRight size={13} className="text-[#6B7280] group-hover:text-[#627188] transition-colors" />
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
                <Logo variant="light-bg" showTagline={false} showIcon={false} />
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
                              ? "bg-[#627188]/15 text-[#627188] font-bold"
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
                              className={`transition-transform duration-200 ${isExpanded ? "rotate-180 text-[#627188]" : ""}`}
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
                              className="block py-1.5 px-2 text-[11px] font-medium text-neutral-700 hover:text-[#627188] transition-colors"
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

              {user ? (
                <div className="space-y-2">
                  <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                    <div className="text-3xs font-extrabold uppercase tracking-wider text-[#627188]">
                      Verified Customer
                    </div>
                    <div className="text-xs font-bold text-neutral-900 truncate mt-0.5">
                      {user.fullName || "Customer"}
                    </div>
                    <div className="text-2xs text-neutral-500 truncate">{user.email}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/account"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="py-2.5 px-3 text-center bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-800 rounded-xl text-xs font-bold transition-colors"
                    >
                      My Account
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        setIsMobileMenuOpen(false);
                        await logout();
                      }}
                      className="py-2.5 px-3 text-center bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setAuthModalTab("signin");
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full block py-2.5 text-center bg-[#111111] hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Sign In / Create Account
                </button>
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}

      {/* Customer Authentication Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
      />
    </header>
  );
};
