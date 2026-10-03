import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Shield,
  LogOut,
  ExternalLink,
  Clock,
  X
} from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { Logo } from "../Logo";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  title,
  subtitle,
  actions
}) => {
  const { adminUser, isAuthenticated, isLoading, logout, adminFetch } = useAdminAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

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
      <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-2 border-white border-t-[#1F7A4D] rounded-full animate-spin mb-4" />
        <p className="text-xs font-semibold tracking-wider uppercase text-[#777777]">
          Securing Admin Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Products & Catalogue", href: "/admin/products", icon: Package }
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col antialiased">
      {/* Top Professional Admin Bar */}
      <header className="bg-[#111111] border-b border-[#222222] text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand + Navigation */}
            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <Logo variant="dark-bg" showTagline={false} />
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded text-3xs font-bold tracking-wider uppercase bg-[#222222] text-[#EAF5EF] border border-[#333333]">
                  ADMIN CONSOLE
                </span>
              </div>

              <nav className="hidden md:flex items-center gap-2">
                {navItems.map((item) => {
                  const isActive =
                    item.href === "/admin"
                      ? location.pathname === "/admin"
                      : location.pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[#222222] text-white border-l-2 border-[#1F7A4D]"
                          : "text-[#888888] hover:text-white hover:bg-[#1A1A1A]"
                      }`}
                    >
                      <Icon size={14} className={isActive ? "text-[#2E8B57]" : "text-[#777777]"} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}

                <button
                  type="button"
                  onClick={loadAuditLogs}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#888888] hover:text-white hover:bg-[#1A1A1A] transition-all"
                >
                  <Clock size={14} className="text-[#777777]" />
                  <span>Audit Trail</span>
                </button>
              </nav>
            </div>

            {/* Right: Store Link + Profile + Logout */}
            <div className="flex items-center gap-4">
              <Link
                to="/shop-all"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#CCCCCC] bg-[#222222] hover:bg-[#2A2A2A] border border-[#333333] transition-colors"
              >
                <span>Live Storefront</span>
                <ExternalLink size={12} className="text-[#888888]" />
              </Link>

              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] text-xs">
                <Shield size={13} className="text-[#2E8B57]" />
                <span className="text-[#CCCCCC] font-medium">{adminUser?.email}</span>
                <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-[#262626] text-[#AAAAAA]">
                  SUPER ADMIN
                </span>
              </div>

              <button
                type="button"
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#E57373] hover:text-white hover:bg-[#2A1515] rounded-lg transition-colors border border-transparent"
                title="Sign out of Admin Session"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden border-t border-[#222222] px-6 py-2.5 flex items-center justify-around bg-[#111111]">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  isActive ? "bg-[#222222] text-white text-[#2E8B57]" : "text-[#888888]"
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={loadAuditLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#888888]"
          >
            <Clock size={14} />
            <span>Audit</span>
          </button>
        </div>
      </header>

      {/* Main Page Header */}
      <div className="bg-white border-b border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111111] tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-xs sm:text-sm text-[#555555]">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </div>
      </div>

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-8 py-10">
        {children}
      </main>

      {/* Audit Log Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-[#EAEAEA]">
            <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between bg-[#111111] text-white">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#2E8B57]" />
                <h3 className="font-bold text-sm sm:text-base">System Audit Trail & Security Logs</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="text-[#888888] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 divide-y divide-[#EAEAEA]">
              {isLoadingLogs ? (
                <div className="py-12 text-center text-[#777777]">
                  <div className="w-7 h-7 border-2 border-[#111111] border-t-[#1F7A4D] rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Fetching audit logs...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-[#777777] text-xs">
                  No recorded audit log events found.
                </div>
              ) : (
                auditLogs.map((log: any, index: number) => (
                  <div key={log.id || index} className="py-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#111111]">{log.action}</span>
                        <span className="px-2 py-0.5 rounded text-3xs font-mono font-medium bg-[#F2F2F2] text-[#555555]">
                          {log.adminEmail || log.adminId || "SYSTEM"}
                        </span>
                        {log.productId && (
                          <span className="text-3xs font-mono text-[#1F7A4D]">
                            ID: {log.productId}
                          </span>
                        )}
                      </div>
                      {log.details && (
                        <p className="text-[#777777] mt-1 font-mono text-3xs">
                          {typeof log.details === "object" ? JSON.stringify(log.details) : log.details}
                        </p>
                      )}
                    </div>
                    <span className="text-[#777777] text-3xs whitespace-nowrap font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#EAEAEA] bg-[#FAFAFA] text-right">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-5 py-2.5 bg-[#111111] text-white rounded-lg text-xs font-semibold hover:bg-black transition-colors"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
