import React, { useState } from "react";
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
  ShieldCheck
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { Logo } from "../Logo";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
  breadcrumbs
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

  // Protected route check
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/admin/login", { state: { from: location }, replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, location]);

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
      <div className="min-h-screen bg-white flex flex-col items-center justify-center text-black">
        <div className="w-9 h-9 border-2 border-black border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-xs font-mono font-semibold tracking-wider uppercase text-neutral-500">
          Loading Admin Platform...
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
    <div className="min-h-screen bg-white text-black flex antialiased">
      {/* ============================================================ */}
      {/* 1. ADRIZO-STYLE MONOCHROME SIDEBAR NAVIGATION                */}
      {/* ============================================================ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#E5E5E5] flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header / Brand */}
        <div className="h-16 px-6 border-b border-[#E5E5E5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo variant="monochrome" showTagline={false} />
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#F4F1EB] text-[#0D4C3C] border border-[#E5E0D8]">
              ADMIN
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 text-neutral-500 hover:text-black rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
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
                    ? "bg-[#F4F1EB] text-[#2D5A4A] font-bold border-l-2 border-[#2D5A4A]"
                    : "text-[#4A4A4A] hover:text-[#111111] hover:bg-[#F4F1EB]"
                }`}
              >
                <LayoutDashboard size={16} />
                <span>Dashboard</span>
              </Link>

              {/* Products Group (Expandable) */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsProductsExpanded(!isProductsExpanded)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    isProductsActive
                      ? "text-black font-bold"
                      : "text-neutral-600 hover:text-black hover:bg-neutral-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Package size={16} />
                    <span>Products</span>
                  </div>
                  {isProductsExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Submenu */}
                {isProductsExpanded && (
                  <div className="mt-1 ml-5 pl-3 border-l border-neutral-200 space-y-1">
                    <Link
                      to="/admin/products"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`block px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/products"
                          ? "bg-[#F4F1EB] text-[#2D5A4A] font-bold"
                          : "text-[#4A4A4A] hover:text-[#111111] hover:bg-[#F4F1EB]"
                      }`}
                    >
                      All Products
                    </Link>

                    <Link
                      to="/admin/products/new"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/products/new"
                          ? "bg-[#F4F1EB] text-[#2D5A4A] font-bold"
                          : "text-[#4A4A4A] hover:text-[#111111] hover:bg-[#F4F1EB]"
                      }`}
                    >
                      <span>Add Product</span>
                      <Plus size={12} className="text-[#2D5A4A]" />
                    </Link>

                    <Link
                      to="/admin/categories"
                      onClick={() => setIsMobileSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        location.pathname === "/admin/categories"
                          ? "bg-[#F4F1EB] text-[#2D5A4A] font-bold"
                          : "text-[#4A4A4A] hover:text-[#111111] hover:bg-[#F4F1EB]"
                      }`}
                    >
                      <span>Categories</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#F4F1EB] text-[#0D4C3C] border border-[#E5E0D8] rounded">7</span>
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
                      className="w-full text-left px-3 py-1.5 rounded-md text-xs font-medium text-neutral-500 hover:text-black hover:bg-neutral-50 transition-colors"
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
                    desc: "Live order fulfillment, DHL cargo tracking, and purchase order tracking active. Use the Customer Track Order portal or view orders via store API."
                  })
                }
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors text-left"
              >
                <ShoppingCart size={16} />
                <span>Orders</span>
              </button>

              {/* Customers */}
              <button
                type="button"
                onClick={() =>
                  setNoticeModal({
                    title: "Customer Directory",
                    desc: "Healthcare institutions, hospitals, and clinical distributors registered across 100+ countries."
                  })
                }
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors text-left"
              >
                <Users size={16} />
                <span>Customers</span>
              </button>

              {/* Media Library */}
              <button
                type="button"
                onClick={() =>
                  setNoticeModal({
                    title: "Media Library",
                    desc: "965 high-resolution medical photography assets stored locally and prepared for Cloudinary synchronization. Upload or replace media within the Add/Edit Product form."
                  })
                }
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors text-left"
              >
                <ImageIcon size={16} />
                <span>Media Library</span>
              </button>

              {/* Reviews */}
              <button
                type="button"
                onClick={() =>
                  setNoticeModal({
                    title: "Clinical Reviews",
                    desc: "Verified clinician reviews and testimonial management for international hospital equipment."
                  })
                }
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors text-left"
              >
                <Star size={16} />
                <span>Reviews</span>
              </button>
            </nav>
          </div>

          {/* System Group */}
          <div>
            <div className="text-[10px] font-bold font-mono tracking-widest uppercase text-neutral-400 px-3 mb-2">
              System
            </div>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() =>
                  setNoticeModal({
                    title: "Website Content",
                    desc: "Storefront policy compliance, announcement banner, and medical blog management."
                  })
                }
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors text-left"
              >
                <FileText size={16} />
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
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors text-left"
              >
                <Settings size={16} />
                <span>Settings</span>
              </button>

              {/* Audit Trail */}
              <button
                type="button"
                onClick={loadAuditLogs}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors text-left"
              >
                <Clock size={16} />
                <span>Audit Trail</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer (Profile + External Link) */}
        <div className="p-4 border-t border-[#E5E5E5] space-y-3 bg-[#FAFAFA]">
          <Link
            to="/shop-all"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-black bg-white border border-neutral-300 hover:bg-neutral-100 transition-colors shadow-2xs"
          >
            <span>Live Storefront</span>
            <ExternalLink size={13} className="text-neutral-500" />
          </Link>

          <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
            <div className="truncate pr-2">
              <div className="text-xs font-bold text-black truncate">{adminUser?.name || "Admin"}</div>
              <div className="text-[10px] text-neutral-500 font-mono truncate">{adminUser?.email}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-200 rounded-md transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-2xs lg:hidden"
        />
      )}

      {/* ============================================================ */}
      {/* 2. MAIN ADMIN CONTENT CONTAINER                              */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-[#E5E5E5] sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-neutral-600 hover:text-black rounded-lg"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium">
              <Link to="/admin" className="hover:text-black transition-colors">Admin</Link>
              <span>/</span>
              {breadcrumbs && breadcrumbs.length > 0 ? (
                breadcrumbs.map((b, i) => (
                  <React.Fragment key={i}>
                    {b.href ? (
                      <Link to={b.href} className="hover:text-black transition-colors">{b.label}</Link>
                    ) : (
                      <span className="text-black font-semibold">{b.label}</span>
                    )}
                    {i < breadcrumbs.length - 1 && <span>/</span>}
                  </React.Fragment>
                ))
              ) : (
                <span className="text-black font-semibold">{title}</span>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/shop-all"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black bg-white border border-[#E5E5E5] hover:bg-neutral-50 transition-colors"
            >
              <span>View Storefront</span>
              <ExternalLink size={12} className="text-neutral-400" />
            </Link>

            <button
              type="button"
              onClick={loadAuditLogs}
              className="p-2 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors"
              title="Audit Log"
            >
              <Clock size={16} />
            </button>

            <button
              type="button"
              onClick={logout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-700 hover:text-black hover:bg-neutral-100 border border-[#E5E5E5] transition-colors"
            >
              <LogOut size={13} />
              <span>Log out</span>
            </button>
          </div>
        </header>

        {/* Page Heading & Actions Strip */}
        <div className="border-b border-[#E5E5E5] bg-white px-6 lg:px-8 py-5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-neutral-500 mt-1">
                  {subtitle}
                </p>
              )}
            </div>

            {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
          </div>
        </div>

        {/* Main Page Content Body */}
        <main className="flex-1 px-6 lg:px-8 py-8 bg-[#F4F1EB]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* 3. AUDIT TRAIL MODAL (STRICT MONOCHROME THEME)                */}
      {/* ============================================================ */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-neutral-300 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-white text-black">
              <div className="flex items-center gap-2">
                <Clock size={16} />
                <h3 className="font-bold text-sm uppercase tracking-wider font-mono">
                  Administrative Audit Trail
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="text-neutral-400 hover:text-black p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 divide-y divide-neutral-100">
              {isLoadingLogs ? (
                <div className="py-12 text-center text-xs text-neutral-400">Loading audit records...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400">No actions recorded in audit session yet.</div>
              ) : (
                auditLogs.map((log: any, idx: number) => (
                  <div key={idx} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-black font-mono">{log.action}</div>
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
                className="px-4 py-2 bg-black text-white rounded-lg text-xs font-semibold hover:bg-neutral-800"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notice / Placeholder Modal */}
      {noticeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-300 shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-black">{noticeModal.title}</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">{noticeModal.desc}</p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setNoticeModal(null)}
                className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800"
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
