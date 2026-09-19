import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  ShoppingCart,
  Heart,
  User,
  Globe,
  ChevronDown,
  Menu,
  X,
  Phone,
  Mail,
  ShieldCheck,
  FileText,
  Activity,
  Zap,
  ThermometerSnowflake,
  Sun,
  Bed,
  HeartPulse
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { Product } from "../types";

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { currentCountry, currentCurrency, countries, setCountry, setCurrencyManually, exchangeRates } = useCurrency();
  const { itemCount, openDrawer } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAdmin } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);

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

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-xs border-b border-slate-100">
      {/* 1. TOP ANNOUNCEMENT / INTERNATIONAL ASSISTANCE BAR */}
      <div className="bg-slate-900 text-slate-300 text-2xs sm:text-xs py-1.5 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-4">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-3xs font-bold bg-sky-500 text-white tracking-wider uppercase">
              GLOBAL EXPEDITION
            </span>
            <span className="hidden md:inline text-slate-400">|</span>
            <span className="text-slate-300">
              Worldwide Air Express Delivery | ISO 13485:2016 & CE Certified | 24/7 Bio-Medical Support
            </span>
          </div>

          <div className="flex items-center gap-4 text-3xs sm:text-2xs">
            <a href="tel:+18008492041" className="flex items-center gap-1 hover:text-white transition-colors">
              <Phone size={12} className="text-sky-400" />
              <span>+1 (800) 849-2041</span>
            </a>
            <span className="text-slate-600">|</span>
            <a href="mailto:support@medicuroglobal.com" className="flex items-center gap-1 hover:text-white transition-colors">
              <Mail size={12} className="text-sky-400" />
              <span className="hidden sm:inline">support@medicuroglobal.com</span>
              <span className="sm:hidden">Email</span>
            </a>
            <span className="text-slate-600">|</span>
            <Link to="/track-order" className="hover:text-sky-300 transition-colors font-semibold">
              Track Order
            </Link>
          </div>
        </div>
      </div>

      {/* 2. MAIN HEADER (Logo, Search, Country/Currency, Account, Cart) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Mobile Hamburger Trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-700 hover:text-sky-700 hover:bg-slate-100 rounded-lg focus:outline-none"
            aria-label="Toggle Navigation"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* MediCuro Global Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-700 to-blue-900 flex items-center justify-center text-white shadow-md shadow-sky-900/10 group-hover:scale-105 transition-transform">
              <Activity size={22} className="text-sky-200" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-1">
                MEDICURO <span className="text-sky-600 font-semibold">GLOBAL</span>
              </span>
              <span className="text-3xs font-medium uppercase tracking-widest text-slate-400 -mt-1">
                Medical Technology & Systems
              </span>
            </div>
          </Link>

          {/* Predictive Global Search Bar */}
          <div ref={searchContainerRef} className="hidden md:flex flex-1 max-w-xl relative mx-2">
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults.length > 0) setShowSearchDropdown(true); }}
                placeholder="Search medical equipment, models, SKU, specifications..."
                className="w-full pl-10 pr-24 py-2 text-sm bg-slate-50 border border-slate-200 rounded-full focus:bg-white focus:outline-none focus:border-sky-600 focus:ring-3 focus:ring-sky-100 transition-all text-slate-800 placeholder-slate-400"
              />
              <Search size={17} className="absolute left-3.5 top-2.5 text-slate-400" />
              <button
                type="submit"
                className="absolute right-1.5 top-1 bottom-1 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-sky-700 rounded-full transition-colors flex items-center gap-1"
              >
                Search
              </button>
            </form>

            {/* Live Predictive Search Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-2 bg-slate-50 border-b border-slate-100 text-3xs font-semibold uppercase text-slate-400 tracking-wider">
                  Matching Medical Equipment ({searchResults.length})
                </div>
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {searchResults.map((p) => (
                    <Link
                      key={p.id}
                      to={`/product/${p.slug}`}
                      onClick={() => setShowSearchDropdown(false)}
                      className="flex items-center gap-3 p-3 hover:bg-sky-50/60 transition-colors"
                    >
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="w-12 h-12 object-cover rounded-lg border border-slate-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-800 truncate">{p.title}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-2xs text-slate-500">
                          <span className="font-mono text-sky-600 font-medium">SKU: {p.sku}</span>
                          <span>•</span>
                          <span className="capitalize">{p.category}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-900">${p.basePrice.toLocaleString()}</span>
                        <div className="text-3xs text-emerald-600 font-medium">In Stock</div>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="p-2 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={handleSearchSubmit}
                    className="text-xs font-semibold text-sky-700 hover:text-sky-900"
                  >
                    View all matching results →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions: Country Selector, Account, Wishlist, Cart */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Country & Currency Selector Trigger */}
            <div className="relative" ref={countryModalRef}>
              <button
                type="button"
                onClick={() => setIsCountryModalOpen(!isCountryModalOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition-all text-xs font-medium text-slate-700"
                title="Change Country & Currency"
              >
                <span className="text-base">{currentCountry.flag}</span>
                <span className="font-bold text-slate-800">{currentCurrency}</span>
                <ChevronDown size={13} className="text-slate-400" />
              </button>

              {/* Country & Currency Selector Modal */}
              {isCountryModalOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
                      <Globe size={15} className="text-sky-600" />
                      Select Country & Currency
                    </div>
                    <button
                      onClick={() => setIsCountryModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <p className="text-2xs text-slate-500 mb-3">
                    Prices, taxes, and shipping rates will automatically recalculate for your regional medical jurisdiction.
                  </p>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {countries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCountry(c.code);
                          setIsCountryModalOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors text-xs ${
                          currentCountry.code === c.code
                            ? "bg-sky-50 border border-sky-200 text-sky-900 font-bold"
                            : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{c.flag}</span>
                          <div>
                            <div className="font-medium text-slate-800">{c.name}</div>
                            <div className="text-3xs text-slate-400">
                              {c.voltage} • {c.plugType}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900">{c.currency} ({c.symbol})</span>
                          <div className="text-3xs text-slate-400 font-mono">
                            {exchangeRates[c.currency] ? `1 USD = ${exchangeRates[c.currency]} ${c.currency}` : ""}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 text-3xs text-slate-400 flex items-center justify-between">
                    <span>Base Currency: <strong>USD</strong></span>
                    <span className="text-emerald-600 font-semibold">● Live Exchange Rate Active</span>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Account / Admin Link */}
            <div className="relative group">
              <Link
                to="/account"
                className="flex items-center gap-1.5 p-2 rounded-lg text-slate-700 hover:text-sky-700 hover:bg-slate-100 transition-colors text-xs font-semibold"
              >
                <User size={19} />
                <span className="hidden xl:inline">
                  {user ? user.fullName.split(" ")[0] : "Account"}
                </span>
              </Link>

              {/* Account Dropdown */}
              <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-100 p-2 hidden group-hover:block z-50">
                <div className="p-2 border-b border-slate-100">
                  <div className="text-xs font-bold text-slate-900">{user?.fullName || "Guest Customer"}</div>
                  <div className="text-2xs text-slate-400 truncate">{user?.email || "Healthcare Practitioner"}</div>
                </div>
                <div className="py-1">
                  <Link to="/account" className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-sky-50 rounded-md">
                    <User size={14} className="text-sky-600" />
                    Customer Dashboard
                  </Link>
                  <Link to="/account" className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-sky-50 rounded-md">
                    <FileText size={14} className="text-sky-600" />
                    My Orders & Invoices
                  </Link>
                  <Link to="/track-order" className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-sky-50 rounded-md">
                    <Activity size={14} className="text-sky-600" />
                    Track Shipment
                  </Link>
                  <Link to="/request-quote" className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-sky-50 rounded-md">
                    <ShieldCheck size={14} className="text-sky-600" />
                    Institutional RFQs
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50/80 hover:bg-sky-100 rounded-md mt-1"
                    >
                      <span>⚡</span> Admin Management Panel
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Wishlist Link */}
            <Link
              to="/account?tab=wishlist"
              className="relative p-2 rounded-lg text-slate-700 hover:text-sky-700 hover:bg-slate-100 transition-colors"
              title="Saved Equipment Wishlist"
            >
              <Heart size={19} />
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-3xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Drawer Trigger */}
            <button
              type="button"
              onClick={openDrawer}
              className="relative flex items-center gap-2 px-3 py-2 bg-slate-900 hover:bg-sky-700 text-white rounded-lg transition-colors font-semibold text-xs shadow-xs"
            >
              <ShoppingCart size={17} />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="w-5 h-5 bg-sky-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. MEGA-MENU DESKTOP NAVIGATION BAR */}
      <nav className="hidden lg:block bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <ul className="flex items-center gap-1 text-xs font-bold text-slate-700 uppercase tracking-wide">
            <li>
              <Link to="/" className="inline-block py-3 px-3 hover:text-sky-700 transition-colors">
                Home
              </Link>
            </li>
            <li>
              <Link to="/shop-all" className="inline-block py-3 px-3 hover:text-sky-700 transition-colors text-sky-700 font-extrabold">
                Shop All
              </Link>
            </li>

            {/* Physiotherapy Mega Menu */}
            <li
              className="relative group"
              onMouseEnter={() => setActiveMegaMenu("physio")}
              onMouseLeave={() => setActiveMegaMenu(null)}
            >
              <Link
                to="/shop-all?category=physiotherapy"
                className="flex items-center gap-1 py-3 px-3 hover:text-sky-700 transition-colors"
              >
                <span>Physiotherapy</span>
                <ChevronDown size={12} className="text-slate-400 group-hover:rotate-180 transition-transform" />
              </Link>

              {/* Mega Menu Dropdown */}
              <div className="absolute left-0 top-full w-96 bg-white border border-slate-200 rounded-b-xl shadow-2xl p-4 hidden group-hover:block z-50">
                <div className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Activity size={14} className="text-sky-600" />
                  Physiotherapy & Rehabilitation Equipment
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <Link to="/shop-all?subcategory=ultrasound-therapy-machines" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 flex justify-between items-center">
                    <span>Ultrasound Therapy Machines</span>
                    <span className="text-3xs text-sky-600 font-mono">1 & 3 MHz</span>
                  </Link>
                  <Link to="/shop-all?subcategory=tens-machines" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 flex justify-between items-center">
                    <span>TENS & Muscle Stimulators</span>
                    <span className="text-3xs text-sky-600 font-mono">4-Channel</span>
                  </Link>
                  <Link to="/shop-all?subcategory=laser-therapy-machine" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 flex justify-between items-center">
                    <span>Class 4 Laser Therapy</span>
                    <span className="text-3xs text-sky-600 font-mono">15W Triple</span>
                  </Link>
                  <Link to="/shop-all?subcategory=cpm" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 flex justify-between items-center">
                    <span>Continuous Passive Motion (CPM)</span>
                    <span className="text-3xs text-sky-600 font-mono">Knee & Hip</span>
                  </Link>
                  <Link to="/shop-all?subcategory=shockwave-therapy-machine" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 flex justify-between items-center">
                    <span>Radial Shockwave Therapy (ESWT)</span>
                    <span className="text-3xs text-sky-600 font-mono">5.0 Bar</span>
                  </Link>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <Link to="/shop-all?category=physiotherapy" className="text-xs font-bold text-sky-700 hover:text-sky-900 block text-right">
                    View all 9 physiotherapy machines →
                  </Link>
                </div>
              </div>
            </li>

            {/* Electrosurgical Units */}
            <li className="relative group">
              <Link
                to="/shop-all?category=electrosurgical"
                className="flex items-center gap-1 py-3 px-3 hover:text-sky-700 transition-colors"
              >
                <span>Electrosurgical</span>
                <ChevronDown size={12} className="text-slate-400 group-hover:rotate-180 transition-transform" />
              </Link>
              <div className="absolute left-0 top-full w-80 bg-white border border-slate-200 rounded-b-xl shadow-2xl p-4 hidden group-hover:block z-50">
                <div className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-500" />
                  Electrosurgical & Cautery Systems
                </div>
                <div className="space-y-1">
                  <Link to="/shop-all?subcategory=electrosurgical-generator" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    High-Frequency Generators (400W)
                  </Link>
                  <Link to="/shop-all?subcategory=electro-surgical-skin-cautery" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    RF Skin Cautery Units (100W)
                  </Link>
                  <Link to="/shop-all?subcategory=surgical-accessories" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Bipolar / Monopolar Electrodes & Cables
                  </Link>
                </div>
              </div>
            </li>

            {/* Cryosurgical Equipment */}
            <li className="relative group">
              <Link
                to="/shop-all?category=cryosurgery"
                className="flex items-center gap-1 py-3 px-3 hover:text-sky-700 transition-colors"
              >
                <span>Cryosurgical</span>
                <ChevronDown size={12} className="text-slate-400 group-hover:rotate-180 transition-transform" />
              </Link>
              <div className="absolute left-0 top-full w-72 bg-white border border-slate-200 rounded-b-xl shadow-2xl p-4 hidden group-hover:block z-50">
                <div className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ThermometerSnowflake size={14} className="text-cyan-500" />
                  Cryo Ablation & Liquid Nitrogen
                </div>
                <div className="space-y-1">
                  <Link to="/shop-all?subcategory=cryo-surgical-guns" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Cryo Surgical Guns (350ml & 500ml)
                  </Link>
                  <Link to="/shop-all?subcategory=cryotherapy-systems" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Clinical LN2 Dewar Storage Systems
                  </Link>
                  <Link to="/shop-all?subcategory=cryo-replacement-nozzles" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Interchangeable Spray Nozzles
                  </Link>
                </div>
              </div>
            </li>

            {/* OT / Surgical Lights */}
            <li className="relative group">
              <Link
                to="/shop-all?category=ot-lights"
                className="flex items-center gap-1 py-3 px-3 hover:text-sky-700 transition-colors"
              >
                <span>OT Lights</span>
                <ChevronDown size={12} className="text-slate-400 group-hover:rotate-180 transition-transform" />
              </Link>
              <div className="absolute left-0 top-full w-80 bg-white border border-slate-200 rounded-b-xl shadow-2xl p-4 hidden group-hover:block z-50">
                <div className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Sun size={14} className="text-amber-500" />
                  Shadowless Surgical Illumination
                </div>
                <div className="space-y-1">
                  <Link to="/shop-all?subcategory=ot-surgical-lights-double-dome" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Double Dome Ceiling Lights (160,000 Lux)
                  </Link>
                  <Link to="/shop-all?subcategory=single-dome-ot-lights" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Single Dome Operating Room Lamps
                  </Link>
                  <Link to="/shop-all?subcategory=mobile-led-ot-lights" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Mobile Stand Surgical Lights (Battery Backup)
                  </Link>
                </div>
              </div>
            </li>

            {/* Examination & OT Tables */}
            <li className="relative group">
              <Link
                to="/shop-all?category=tables"
                className="flex items-center gap-1 py-3 px-3 hover:text-sky-700 transition-colors"
              >
                <span>OT Tables</span>
                <ChevronDown size={12} className="text-slate-400 group-hover:rotate-180 transition-transform" />
              </Link>
              <div className="absolute left-0 top-full w-80 bg-white border border-slate-200 rounded-b-xl shadow-2xl p-4 hidden group-hover:block z-50">
                <div className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Bed size={14} className="text-blue-500" />
                  Surgical Tables & Examination Couches
                </div>
                <div className="space-y-1">
                  <Link to="/shop-all?subcategory=operating-tables" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Electro-Hydraulic Operating Tables (300kg)
                  </Link>
                  <Link to="/shop-all?subcategory=examination-tables" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Hydraulic Clinical Examination Couches
                  </Link>
                </div>
              </div>
            </li>

            {/* Obstetrics & Gynaecology */}
            <li className="relative group">
              <Link
                to="/shop-all?category=ob-gyn"
                className="flex items-center gap-1 py-3 px-3 hover:text-sky-700 transition-colors"
              >
                <span>Obstetrics & Gynae</span>
                <ChevronDown size={12} className="text-slate-400 group-hover:rotate-180 transition-transform" />
              </Link>
              <div className="absolute left-0 top-full w-72 bg-white border border-slate-200 rounded-b-xl shadow-2xl p-4 hidden group-hover:block z-50">
                <div className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <HeartPulse size={14} className="text-rose-500" />
                  Obstetric Care & Delivery Suites
                </div>
                <div className="space-y-1">
                  <Link to="/shop-all?subcategory=obstetric-tables" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Motorized LDR Obstetric Delivery Beds
                  </Link>
                  <Link to="/shop-all?subcategory=fetal-monitoring-equipment" className="p-2 hover:bg-sky-50 rounded-lg text-xs font-medium text-slate-800 block">
                    Clinical Fetal Doppler & Twins Monitors
                  </Link>
                </div>
              </div>
            </li>

            {/* Worldwide Network */}
            <li>
              <Link to="/worldwide-network" className="inline-block py-3 px-3 hover:text-sky-700 transition-colors">
                Worldwide Network
              </Link>
            </li>

            {/* B2B Request Quote */}
            <li>
              <Link
                to="/request-quote"
                className="inline-block py-3 px-3 text-sky-800 hover:text-sky-900 font-extrabold"
              >
                Request a Quote
              </Link>
            </li>

            {/* About Us */}
            <li>
              <Link to="/about" className="inline-block py-3 px-3 hover:text-sky-700 transition-colors">
                About Us
              </Link>
            </li>

            {/* Blog */}
            <li>
              <Link to="/blog" className="inline-block py-3 px-3 hover:text-sky-700 transition-colors">
                Blog
              </Link>
            </li>

            {/* Contact */}
            <li>
              <Link to="/contact" className="inline-block py-3 px-3 hover:text-sky-700 transition-colors">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* 4. MOBILE DRAWER NAVIGATION */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex">
          <div className="w-4/5 max-w-sm bg-white h-full overflow-y-auto p-5 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-base">Navigation Menu</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile Search */}
              <form onSubmit={(e) => { handleSearchSubmit(e); setIsMobileMenuOpen(false); }} className="mt-4 mb-5">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search equipment..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                  <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                </div>
              </form>

              {/* Mobile Nav Links */}
              <div className="space-y-2 text-xs font-semibold text-slate-800">
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  Home
                </Link>
                <Link
                  to="/shop-all"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 bg-sky-50 text-sky-800 rounded-lg font-bold"
                >
                  Shop All Products
                </Link>
                <Link
                  to="/shop-all?category=physiotherapy"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  Physiotherapy Machines
                </Link>
                <Link
                  to="/shop-all?category=electrosurgical"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  Electrosurgical Units
                </Link>
                <Link
                  to="/shop-all?category=cryosurgery"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  Cryosurgical Equipment
                </Link>
                <Link
                  to="/shop-all?category=ot-lights"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  OT / Surgical Lights
                </Link>
                <Link
                  to="/shop-all?category=tables"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  Examination & OT Tables
                </Link>
                <Link
                  to="/shop-all?category=ob-gyn"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  Obstetrics & Gynaecology
                </Link>
                <Link
                  to="/worldwide-network"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  Worldwide Network
                </Link>
                <Link
                  to="/request-quote"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 text-sky-700 font-bold hover:bg-sky-50 rounded-lg"
                >
                  Request B2B Quote
                </Link>
                <Link
                  to="/about"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  About Us
                </Link>
                <Link
                  to="/blog"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  Blog & Guides
                </Link>
                <Link
                  to="/contact"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block py-2 px-2 hover:bg-sky-50 rounded-lg"
                >
                  Contact & Support
                </Link>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center justify-between mb-2">
                <span>Selected Country:</span>
                <span className="font-bold text-slate-800">{currentCountry.name} ({currentCurrency})</span>
              </div>
              <Link
                to="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full block py-2 text-center bg-slate-900 text-white rounded-lg font-semibold"
              >
                Customer Account
              </Link>
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsMobileMenuOpen(false)} />
        </div>
      )}
    </header>
  );
};
