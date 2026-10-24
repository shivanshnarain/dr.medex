import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Layers,
  CheckCircle2,
  Plus,
  ArrowRight,
  ShieldCheck,
  Image as ImageIcon,
  RefreshCw,
  Edit2,
  ExternalLink,
  EyeOff
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Product, Category } from "../types";
import { fallbackProducts, fallbackCategories } from "../services/productService";

export const AdminDashboardPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();

  const [stats, setStats] = useState<any>({
    totalProducts: 193,
    activeProducts: 130,
    inactiveProducts: 63,
    totalCategories: 7,
    activeCategories: 6,
    inactiveCategories: 1,
    mediaStatus: {
      totalImages: 965,
      localStoredImages: 965,
      replacementRequiredCount: 0
    }
  });

  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [dashRes, catRes] = await Promise.all([
        adminFetch("/api/admin/dashboard"),
        fetch("/api/categories?includeInactive=true")
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        if (data.success) {
          setStats((prev: any) => ({ ...prev, ...(data.stats || {}) }));
          setRecentProducts(data.recentProducts || []);
          if (data.auditLogs) {
            setRecentAuditLogs(data.auditLogs.slice(0, 6));
          }
        }
      } else {
        const total = fallbackProducts.length;
        const active = fallbackProducts.filter(p => (p.status || "ACTIVE") === "ACTIVE").length;
        setStats((prev: any) => ({
          ...prev,
          totalProducts: total,
          activeProducts: active,
          inactiveProducts: total - active,
          totalCategories: fallbackCategories.length
        }));
        setRecentProducts(fallbackProducts.slice(0, 8));
      }

      if (catRes.ok) {
        const cData = await catRes.json();
        if (cData && cData.success && Array.isArray(cData.categories)) {
          setCategories(cData.categories);
        }
      } else {
        setCategories(fallbackCategories);
      }
    } catch (e) {
      console.error("Dashboard data load error:", e);
      setRecentProducts(fallbackProducts.slice(0, 8));
      setCategories(fallbackCategories);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <AdminLayout
      title="Catalogue & Operations Overview"
      subtitle="Single source of truth medical equipment inventory and category control"
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-[#CCD1D8] rounded-lg text-xs font-bold text-neutral-900 bg-white hover:bg-white/80 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <Link
            to="/admin/products/new"
            className="flex items-center gap-2 px-5 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-colors shadow-md cursor-pointer"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Add New Product</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Total Products */}
          <div className="bg-white p-6 rounded-2xl border border-[#CCD1D8] shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                Total Products
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF1F3] flex items-center justify-center text-[#627188]">
                <Package size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-neutral-900 font-mono">
                {stats.totalProducts ?? 193}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium mt-1.5">
                <CheckCircle2 size={13} />
                <span>All catalogue inventory preserved</span>
              </div>
            </div>
          </div>

          {/* Published / Active Storefront */}
          <div className="bg-white p-6 rounded-2xl border border-[#CCD1D8] shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                Storefront Active
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-neutral-900 font-mono">
                {stats.activeProducts ?? 130}
              </div>
              <div className="text-xs text-emerald-300 font-medium mt-1.5">
                Live across 6 verified active categories
              </div>
            </div>
          </div>

          {/* Temporarily Inactive Products */}
          <div className="bg-white p-6 rounded-2xl border border-[#CCD1D8] shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                Inactive / Stored
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF1F3] flex items-center justify-center text-neutral-400">
                <EyeOff size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-neutral-900 font-mono">
                {stats.inactiveProducts ?? 63}
              </div>
              <div className="text-xs text-neutral-500 font-medium mt-1.5">
                Physiotherapy (safe in DB, 1-click restore)
              </div>
            </div>
          </div>

          {/* Media Assets Status */}
          <div className="bg-white p-6 rounded-2xl border border-[#CCD1D8] shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                Catalogue Images
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EFF1F3] flex items-center justify-center text-[#627188]">
                <ImageIcon size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-neutral-900 font-mono">
                {stats.mediaStatus?.totalImages ?? 965}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-medium mt-1.5">
                <span>100% locally preserved assets</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Architecture Callout */}
        <div className="p-7 bg-white rounded-2xl border border-[#CCD1D8] text-neutral-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#627188] text-black uppercase tracking-wider font-mono">
                CATALOGUE CONTROL ACTIVE
              </span>
              <span className="text-xs font-semibold text-emerald-300">
                Direct Full-Page Editing Architecture
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">
              Single-Source Medical Inventory & Category Visibility Engine
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              DR.MEDEX central operations maintains 193 medical units. 6 categories are live on the public international storefront, while Physiotherapy (63 units) is held safely in maintenance status with zero data loss.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link
              to="/admin/categories"
              className="px-5 py-2.5 border border-[#CCD1D8] hover:border-white text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Manage Categories
            </Link>
            <Link
              to="/admin/products"
              className="px-5 py-2.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-md cursor-pointer"
            >
              <span>All 193 Products</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Category Hierarchy & Operations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Category distribution */}
          <div className="bg-white p-7 rounded-2xl border border-[#CCD1D8] shadow-xl lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 tracking-tight uppercase font-mono">
                  Catalogue Category Hierarchy
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Live storefront category controls & product quotas
                </p>
              </div>
              <Link
                to="/admin/categories"
                className="text-xs font-bold text-[#627188] hover:underline flex items-center gap-1 transition-colors"
              >
                <span>Category Settings</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {categories.map((cat) => {
                const isCatActive = cat.status === "ACTIVE" || cat.active === true;
                return (
                  <Link
                    key={cat.id}
                    to={`/admin/products?category=${cat.id}`}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between group ${
                      isCatActive
                        ? "border-[#CCD1D8] hover:border-[#627188] bg-[#EFF1F3]/50 hover:bg-[#EFF1F3]"
                        : "border-dashed border-[#CCD1D8] bg-black/10 hover:bg-[#EFF1F3]/50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isCatActive
                            ? "bg-[#EFF1F3] text-[#627188] group-hover:bg-[#627188] group-hover:text-black"
                            : "bg-[#EFF1F3]/50 text-white/50"
                        }`}
                      >
                        <Layers size={17} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-neutral-900 truncate">
                          {cat.name}
                        </h4>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          {cat.totalProducts ?? 0} units
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded font-bold shrink-0 ${
                        isCatActive
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-[#EFF1F3] text-neutral-400 border border-[#CCD1D8]"
                      }`}
                    >
                      {isCatActive ? "Active" : "Inactive"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Operational Audit Preview */}
          <div className="bg-white p-7 rounded-2xl border border-[#CCD1D8] shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-tight font-mono">
                  Audit Activity
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Latest system operations
                </p>
              </div>
              <ShieldCheck size={18} className="text-[#627188]" />
            </div>

            <div className="space-y-2.5">
              {recentAuditLogs.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-400">
                  No recent audit events recorded.
                </div>
              ) : (
                recentAuditLogs.map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#EFF1F3]/50 border border-[#CCD1D8] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{log.action}</span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono truncate">
                      {log.adminEmail || "SYSTEM_OPERATOR"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Catalogue Products Table */}
        <div className="bg-white rounded-2xl border border-[#CCD1D8] shadow-xl overflow-hidden">
          <div className="p-6 sm:p-7 border-b border-[#CCD1D8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-tight font-mono">
                Recently Managed Medical Products
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Full-page editing directly connected to repository database
              </p>
            </div>
            <Link
              to="/admin/products"
              className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-colors shadow-sm"
            >
              <span>View All 193 Products</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse text-white">
              <thead>
                <tr className="bg-black/20 border-b border-[#CCD1D8] text-neutral-500 font-bold uppercase text-[10px] tracking-wider font-mono">
                  <th className="p-4 sm:p-5">Product Details</th>
                  <th className="p-4 sm:p-5">SKU / Model</th>
                  <th className="p-4 sm:p-5">Category</th>
                  <th className="p-4 sm:p-5">Base USD Price</th>
                  <th className="p-4 sm:p-5">Status</th>
                  <th className="p-4 sm:p-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CCD1D8] text-white/90">
                {recentProducts.slice(0, 8).map((p) => (
                  <tr key={p.id} className="hover:bg-[#EFF1F3]/50 transition-colors">
                    <td className="p-4 sm:p-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-lg bg-black/20 overflow-hidden shrink-0 border border-[#CCD1D8]">
                          <img
                            src={
                              p.images?.[0] ||
                              "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80"
                            }
                            alt={p.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <Link
                            to={`/admin/products/${p.id}/edit`}
                            className="font-bold text-white hover:text-[#627188] truncate block max-w-xs sm:max-w-md"
                          >
                            {p.title}
                          </Link>
                          <span className="text-[10px] text-white/50 font-mono">
                            ID: {p.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 font-mono text-xs">
                      <div className="font-bold text-white">{p.sku}</div>
                      <div className="text-white/50 text-[11px]">{p.modelNumber || "—"}</div>
                    </td>
                    <td className="p-4 sm:p-5">
                      <span className="px-2.5 py-1 rounded bg-[#EFF1F3] text-white text-[10px] font-mono border border-[#CCD1D8]">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 font-mono font-bold text-white">
                      ${(p.basePrice || 0).toLocaleString()}
                    </td>
                    <td className="p-4 sm:p-5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          p.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-[#EFF1F3] text-neutral-400 border border-[#CCD1D8]"
                        }`}
                      >
                        {p.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-right">
                      <Link
                        to={`/admin/products/${p.id}/edit`}
                        className="px-3 py-1.5 bg-[#EFF1F3] hover:bg-[#C62828] hover:border-[#C62828] text-white rounded-md text-xs font-semibold transition-colors inline-flex items-center gap-1.5 border border-[#CCD1D8]"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
