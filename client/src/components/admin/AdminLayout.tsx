import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Plus,
  Layers,
  Settings,
  ShoppingCart,
  Users,
  Image as ImageIcon,
  Star,
  FileText,
  Clock,
  ExternalLink,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Search,
  CheckCircle2,
  Sliders,
  ShieldCheck,
  Bell,
  Database
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
  titleClassName?: string;
  subtitleClassName?: string;
  mainClassName?: string;
  headerClassName?: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs,
  titleClassName,
  subtitleClassName,
  mainClassName,
  headerClassName
}) => {
  const { adminUser, isAuthenticated, isLoading, logout, adminFetch } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Products submenu state (expanded by default if on a products page)
  const isProductsActive = location.pathname.startsWith("/admin/products") || location.pathname.startsWith("/admin/categories");
  const [isProductsExpanded, setIsProductsExpanded] = useState(true);

  // Audit modal state
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Section placeholder modal for non-core nav
  const [noticeModal, setNoticeModal] = useState<{ title: string; desc: string } | null>(null);

  // Global search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Protected route check: redirect unauthenticated access to standard customer sign-in with safe return URL
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/account/signin?redirect=${returnUrl}`, { state: { from: location }, replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, location]);

  // Debounced real-time global admin search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await adminFetch(`/api/admin/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSearchResults(data.results || []);
            setSelectedIndex(0);
          }
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, adminFetch]);

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (searchResults.length > 0 ? (prev + 1) % searchResults.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (searchResults.length > 0 ? (prev - 1 + searchResults.length) % searchResults.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults.length > 0 && searchResults[selectedIndex]) {
        const target = searchResults[selectedIndex];
        setIsSearchOpen(false);
        setSearchQuery("");
        navigate(target.url);
      } else if (searchQuery.trim()) {
        setIsSearchOpen(false);
        navigate(`/admin/products?search=${encodeURIComponent(searchQuery.trim())}`);
      }
    } else if (e.key === "Escape") {
      setIsSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      localStorage.removeItem("drmedex_admin_session_token");
      localStorage.removeItem("drmedex_admin_user");
      localStorage.removeItem("drmedex_admin_token");
      localStorage.removeItem("drmedex_customer_profile");
      navigate("/admin/login", { replace: true });
    }
  };

  const loadAuditLogs = async () => {
    setIsLoadingLogs(true);
    setIsAuditModalOpen(true);
    try {
      const res = await adminFetch("/api/admin/audit-logs");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAuditLogs(data.logs || []);
        }
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-neutral-900">
        <div className="w-10 h-10 border-3 border-neutral-900 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono font-bold tracking-widest uppercase text-neutral-600">
          Loading DR.MEDEX Platform...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isCurrentRoute = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div className="min-h-screen bg-neutral-100 text-neutral-900 flex antialiased">
      {/* ============================================================ */}
      {/* 1. MINIMAL WHITE SIDEBAR NAVIGATION                          */}
      {/* ============================================================ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-neutral-300 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 text-neutral-900 shadow-xs ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header / Brand: Yellow ADMIN badge on top, DR.MEDEX directly underneath */}
        <div className="h-16 px-6 border-b border-neutral-200 flex items-center justify-between bg-white">
          <div className="flex flex-col items-start justify-center">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black uppercase tracking-wider bg-[#FFD400] text-black shadow-xs leading-none">
              ADMIN
            </span>
            <span className="text-base font-black tracking-widest text-neutral-900 uppercase leading-none mt-1">
              DR.MEDEX
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 text-neutral-500 hover:text-black rounded-md transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 bg-white">
          {/* Main Group */}
          <div>
            <div className="text-[10px] font-bold font-mono tracking-widest uppercase text-neutral-400 px-3 mb-2">
              Management
            </div>
            <nav className="space-y-1">
              {/* Dashboard */}
              <Link
                to="/admin"
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isCurrentRoute("/admin")
                    ? "bg-neutral-100 text-black font-bold border-l-2 border-[#FFD400]"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                }`}
              >
                <LayoutDashboard size={16} className="text-neutral-700 shrink-0" />
                <span>Dashboard</span>
              </Link>

              {/* Products Group (Expandable) */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsProductsExpanded(!isProductsExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isProductsActive
                      ? "bg-neutral-100 text-black font-bold"
                      : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package size={16} className="text-neutral-700 shrink-0" />
                    <span>Products</span>
                  </div>
                  {isProductsExpanded ? <ChevronDown size={14} className="text-neutral-700" /> : <ChevronRight size={14} className="text-neutral-700" />}
                </button>

                {/* Submenu */}
                {isProductsExpanded && (
                  <div className="mt-1 ml-5 pl-3 border-l border-neutral-200 space-y-1">
                    <Link
                      to="/admin/products"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`block px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/products"
                          ? "bg-neutral-100 text-black font-bold border-l-2 border-[#FFD400]"
                          : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                      }`}
                    >
                      All Products
                    </Link>

                    <Link
                      to="/admin/products/new"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/products/new"
                          ? "bg-neutral-100 text-black font-bold border-l-2 border-[#FFD400]"
                          : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                      }`}
                    >
                      <span>Add Product</span>
                      <Plus size={12} className="text-[#C62828]" />
                    </Link>

                    <Link
                      to="/admin/categories"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/categories"
                          ? "bg-neutral-100 text-black font-bold border-l-2 border-[#FFD400]"
                          : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                      }`}
                    >
                      <span>Categories</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#FFD400] text-black border border-neutral-300 rounded font-bold">
                        Taxonomy
                      </span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        setNoticeModal({
                          title: "Product Configuration",
                          desc: "Catalogue taxonomies, attributes, and custom specifications are synchronized with DR.MEDEX international schema."
                        });
                      }}
                      className="w-full text-left px-3 py-1.5 rounded-md text-xs font-medium text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
                    >
                      Product Configuration
                    </button>
                  </div>
                )}
              </div>

              {/* Orders */}
              <button
                type="button"
                onClick={() =>
                  setNoticeModal({
                    title: "Orders Management",
                    desc: "Live order fulfillment, DHL cargo tracking, and purchase order tracking active. View orders through the Customer Track Order portal or view recent orders on the Dashboard."
                  })
                }
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors text-left cursor-pointer"
              >
                <ShoppingCart size={16} className="text-neutral-700 shrink-0" />
                <span>Orders</span>
              </button>

              {/* Customers */}
              <Link
                to="/admin/customers"
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  location.pathname === "/admin/customers"
                    ? "bg-neutral-100 text-black font-bold border-l-2 border-[#FFD400]"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                }`}
              >
                <Users size={16} className="text-neutral-700 shrink-0" />
                <span>Customers</span>
              </Link>

              {/* Media Library */}
              <button
                type="button"
                onClick={() =>
                  setNoticeModal({
                    title: "Media Library",
                    desc: "965 high-resolution medical photography assets stored locally and prepared for Cloudinary synchronization. Upload or replace media within the Add/Edit Product form."
                  })
                }
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors text-left cursor-pointer"
              >
                <ImageIcon size={16} className="text-neutral-700 shrink-0" />
                <span>Media Library</span>
              </button>

              {/* Reviews */}
              <Link
                to="/admin/reviews"
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  location.pathname === "/admin/reviews"
                    ? "bg-neutral-100 text-black font-bold border-l-2 border-[#FFD400]"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                }`}
              >
                <Star size={16} className="text-neutral-700 shrink-0" />
                <span>Reviews</span>
              </Link>

              {/* Push Notifications */}
              <Link
                to="/admin/notifications"
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  location.pathname === "/admin/notifications"
                    ? "bg-neutral-100 text-black font-bold border-l-2 border-[#FFD400]"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                }`}
              >
                <Bell size={16} className="text-neutral-700 shrink-0" />
                <span>Notifications</span>
              </Link>
            </nav>
          </div>

          {/* System Group */}
          <div>
            <div className="text-[10px] font-bold font-mono tracking-widest uppercase text-neutral-400 px-3 mb-2">
              System
            </div>
            <nav className="space-y-1">
              {/* Storage Management */}
              <Link
                to="/admin/storage"
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  location.pathname === "/admin/storage"
                    ? "bg-neutral-100 text-black font-bold border-l-2 border-[#7AA05A]"
                    : "text-neutral-600 hover:text-black hover:bg-neutral-100"
                }`}
              >
                <Database size={16} className="text-[#2D5A4A] shrink-0" />
                <span>Storage Management</span>
              </Link>
              <button
                type="button"
                onClick={() =>
                  setNoticeModal({
                    title: "Website Content",
                    desc: "Storefront policy compliance, announcement banner, and medical blog management."
                  })
                }
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors text-left cursor-pointer"
              >
                <FileText size={16} className="text-neutral-700 shrink-0" />
                <span>Website Content</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setNoticeModal({
                    title: "Platform Settings",
                    desc: "International currency exchange rates, API security, and ISO compliance settings."
                  })
                }
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors text-left cursor-pointer"
              >
                <Settings size={16} className="text-neutral-700 shrink-0" />
                <span>Settings</span>
              </button>

              {/* Audit Trail */}
              <button
                type="button"
                onClick={loadAuditLogs}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors text-left cursor-pointer"
              >
                <Clock size={16} className="text-neutral-700 shrink-0" />
                <span>Audit Trail</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer (Storefront Link + Profile) */}
        <div className="p-4 border-t border-neutral-200 space-y-3 bg-white">
          <a
            href="https://dr-medex.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-neutral-800 bg-neutral-50 border border-neutral-300 hover:bg-neutral-100 transition-colors shadow-2xs"
          >
            <span>Live Storefront</span>
            <ExternalLink size={13} className="text-neutral-600" />
          </a>

          <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
            <div className="truncate pr-2">
              <div className="text-xs font-bold text-neutral-900 truncate">{adminUser?.name || "Admin"}</div>
              <div className="text-[10px] text-neutral-500 font-mono truncate">{adminUser?.email}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            >
              <LogOut size={15} className="text-neutral-700" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-2xs lg:hidden"
        />
      )}

      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* 2. MAIN ADMIN CONTENT CONTAINER                              */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header Bar — Minimal White with Black Text & Outlines */}
        <header className="h-16 bg-white border-b border-neutral-300 sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8 text-neutral-900 shadow-xs">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
            >
              <Menu size={20} className="text-neutral-800" />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
              <Link to="/admin" className="hover:text-black text-neutral-600 transition-colors">Admin</Link>
              <span className="text-neutral-400">/</span>
              {breadcrumbs && breadcrumbs.length > 0 ? (
                breadcrumbs.map((b, i) => (
                  <React.Fragment key={i}>
                    {b.href ? (
                      <Link to={b.href} className="hover:text-black text-neutral-600 transition-colors">{b.label}</Link>
                    ) : (
                      <span className="text-neutral-900 font-semibold">{b.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 && <span className="text-neutral-400">/</span>}
                  </React.Fragment>
                ))
              ) : (
                <span className="text-neutral-900 font-semibold">{title}</span>
              )}
            </div>
          </div>

          {/* Right Header Actions: Functional Global Search, Storefront, Audit Log, Admin Profile */}
          <div className="flex items-center gap-3">
            {/* Functional Global Admin Search */}
            <div ref={searchContainerRef} className="hidden md:flex items-center relative">
              <Search size={14} className="absolute left-3 text-neutral-400 z-10" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => {
                  if (searchQuery.trim()) setIsSearchOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Global admin search..."
                className="pl-9 pr-8 py-1.5 bg-neutral-100 border border-neutral-300 rounded-lg text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-black focus:bg-white w-52 lg:w-72 transition-all"
              />
              {isSearching && (
                <div className="absolute right-3 w-3 h-3 border-2 border-neutral-600 border-t-transparent rounded-full animate-spin" />
              )}
              {searchQuery && !isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-2.5 text-neutral-400 hover:text-black p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}

              {/* Search Results Dropdown */}
              {isSearchOpen && searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-neutral-300 rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto divide-y divide-neutral-100 text-neutral-900">
                  {isSearching && searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                      <div className="w-3 h-3 border-2 border-[#FFD400] border-t-transparent rounded-full animate-spin" />
                      <span>Searching catalogue &amp; system...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-neutral-500">
                      No admin records found matching &ldquo;{searchQuery}&rdquo;
                    </div>
                  ) : (
                    searchResults.map((item, idx) => {
                      const isSelected = idx === selectedIndex;
                      return (
                        <div
                          key={`${item.type}-${item.id}-${idx}`}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery("");
                            navigate(item.url);
                          }}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                            isSelected ? "bg-neutral-100 border-l-4 border-[#FFD400]" : "hover:bg-neutral-50"
                          }`}
                        >
                          <div className="mt-0.5 text-neutral-600 shrink-0">
                            {item.type === "product" && <Package size={14} className="text-[#FFD400]" />}
                            {(item.type === "category" || item.type === "subcategory" || item.type === "equipment-type") && (
                              <Layers size={14} className="text-emerald-600" />
                            )}
                            {item.type === "order" && <ShoppingCart size={14} className="text-amber-600" />}
                            {item.type === "customer" && <Users size={14} className="text-purple-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-neutral-900 truncate">{item.title}</span>
                              <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-300 shrink-0">
                                {item.type}
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-500 truncate mt-0.5">{item.subtitle}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Storefront Button */}
            <a
              href="https://dr-medex.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-800 bg-neutral-50 border border-neutral-300 hover:bg-neutral-100 transition-colors"
            >
              <span>Storefront</span>
              <ExternalLink size={12} className="text-neutral-600" />
            </a>

            {/* Notifications / Audit Log */}
            <button
              type="button"
              onClick={loadAuditLogs}
              className="p-2 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors relative cursor-pointer"
              title="Audit Log & Notifications"
            >
              <Clock size={16} className="text-neutral-700" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FFD400] rounded-full ring-2 ring-white" />
            </button>

            {/* Administrator Profile */}
            <div className="flex items-center gap-2 pl-3 border-l border-neutral-200">
              <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-300 flex items-center justify-center font-bold text-xs text-white shadow-2xs">
                {adminUser?.name ? adminUser.name.charAt(0).toUpperCase() : "R"}
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-xs font-bold text-neutral-900 leading-none">{adminUser?.name || "Roshan"}</div>
                <div className="text-[10px] text-neutral-500 font-mono leading-tight mt-0.5">{adminUser?.role || "DR.MEDEX Super Admin"}</div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors ml-1 cursor-pointer"
              >
                <LogOut size={14} className="text-neutral-700" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Heading & Actions Strip — Minimal White with Black Text */}
        <div className={`border-b border-neutral-200 px-6 lg:px-8 py-5 ${headerClassName || "bg-white text-neutral-900"}`}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${titleClassName || "text-neutral-900"}`}>
                {title}
              </h1>
              {subtitle && (
                <p className={`text-xs mt-1 ${subtitleClassName || "text-neutral-500"}`}>
                  {subtitle}
                </p>
              )}
            </div>

            {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
          </div>
        </div>

        {/* Main Page Content Body — Neutral Background */}
        <main className={`flex-1 px-6 lg:px-8 py-8 ${mainClassName || "bg-neutral-100"}`}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* 3. AUDIT TRAIL MODAL (MINIMAL WHITE THEME)                   */}
      {/* ============================================================ */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-2xl w-full border border-neutral-300 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-neutral-900" />
                <h3 className="font-bold text-sm uppercase tracking-wider font-mono text-neutral-900">
                  Administrative Audit Trail
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="text-neutral-400 hover:text-black p-1 rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 divide-y divide-neutral-100">
              {isLoadingLogs ? (
                <div className="py-12 text-center text-xs text-neutral-500">Loading audit records...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-500">No actions recorded in audit session yet.</div>
              ) : (
                auditLogs.map((log: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-neutral-900 font-mono">{log.action}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        By {log.adminEmail} • Target: {log.targetId || "System"}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-3 border-t border-neutral-200 bg-neutral-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice / Placeholder Modal */}
      {noticeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-md w-full border border-neutral-300 shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900">{noticeModal.title}</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">{noticeModal.desc}</p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setNoticeModal(null)}
                className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
