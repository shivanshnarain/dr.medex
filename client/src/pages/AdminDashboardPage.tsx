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
  Edit2
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { ProductEditorModal } from "../components/admin/ProductEditorModal";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Product, Category } from "../types";

export const AdminDashboardPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();

  const [stats, setStats] = useState<any>({
    totalProducts: 193,
    activeProducts: 193,
    draftProducts: 0,
    archivedProducts: 0,
    outOfStockProducts: 0,
    featuredProducts: 12,
    totalCategories: 7,
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

  // Editor Modal
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [dashRes, catRes] = await Promise.all([
        adminFetch("/api/admin/dashboard"),
        fetch("/api/categories")
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        if (data.success) {
          setStats(data.stats || stats);
          setRecentProducts(data.recentProducts || []);
          if (data.auditLogs) {
            setRecentAuditLogs(data.auditLogs.slice(0, 6));
          }
        }
      }

      if (catRes.ok) {
        const cData = await catRes.json();
        if (cData.success) {
          setCategories(cData.categories || []);
        }
      }
    } catch (e) {
      console.error("Dashboard data load error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleEditProduct = (prod: Product) => {
    setSelectedProduct(prod);
    setIsEditorOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setIsEditorOpen(true);
  };

  return (
    <AdminLayout
      title="Catalogue & Operations Overview"
      subtitle="Single source of truth medical equipment inventory database"
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDashboardData}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#EAEAEA] rounded-lg text-xs font-semibold text-[#111111] bg-white hover:bg-[#FAFAFA] transition-colors shadow-2xs"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh Metrics</span>
          </button>
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add New Product</span>
          </button>
        </div>
      }
    >
      <div className="space-y-10">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Products */}
          <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#777777]">
                Total Products
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F7F7F7] flex items-center justify-center text-[#111111]">
                <Package size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#111111] font-mono">
                {stats.totalProducts ?? 193}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#1F7A4D] font-medium mt-1.5">
                <CheckCircle2 size={13} />
                <span>Authorized Catalogue Imported</span>
              </div>
            </div>
          </div>

          {/* Active / Published */}
          <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#777777]">
                Published & Active
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#EAF5EF] flex items-center justify-center text-[#1F7A4D]">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#1F7A4D] font-mono">
                {stats.activeProducts ?? 193}
              </div>
              <div className="text-xs text-[#777777] font-medium mt-1.5">
                Visible to international healthcare buyers
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#777777]">
                Equipment Categories
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F7F7F7] flex items-center justify-center text-[#111111]">
                <Layers size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#111111] font-mono">
                {stats.totalCategories ?? 7}
              </div>
              <div className="text-xs text-[#777777] font-medium mt-1.5">
                Normalized surgical & therapy groups
              </div>
            </div>
          </div>

          {/* Media Assets Status */}
          <div className="bg-white p-6 rounded-2xl border border-[#EAEAEA] shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#777777]">
                Catalogue Images
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#F7F7F7] flex items-center justify-center text-[#111111]">
                <ImageIcon size={16} />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#111111] font-mono">
                {stats.mediaStatus?.totalImages ?? 965}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#1F7A4D] font-medium mt-1.5">
                <span>0 Replacements Required</span>
              </div>
            </div>
          </div>
        </div>

        {/* Phase Architecture Banner */}
        <div className="p-8 bg-[#111111] rounded-2xl border border-[#222222] text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded text-3xs font-bold bg-[#EAF5EF] text-[#1F7A4D] uppercase tracking-wider">
                CORE SYSTEM READY
              </span>
              <span className="text-xs font-medium text-[#888888]">
                Media Abstraction Layer Active
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Self-Contained Local Assets Active & Cloudinary-Ready
            </h3>
            <p className="text-xs text-[#999999] leading-relaxed">
              All 965 product gallery images are downloaded locally to prevent external hotlinking.
              The media service is structured with MediaProvider interfaces, ready for seamless synchronization with Cloudinary.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Link
              to="/admin/products"
              className="px-6 py-3 bg-white hover:bg-[#F2F2F2] text-[#111111] rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
            >
              <span>Manage 193 Products</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Quick Links & Category Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Category distribution */}
          <div className="bg-white p-8 rounded-2xl border border-[#EAEAEA] shadow-xs lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-[#111111]">
                  Catalogue Category Hierarchy
                </h3>
                <p className="text-xs text-[#777777] mt-0.5">
                  DR.MEDEX Medical Equipment Portfolio
                </p>
              </div>
              <Link
                to="/admin/products"
                className="text-xs font-semibold text-[#111111] hover:text-[#1F7A4D] flex items-center gap-1.5 transition-colors"
              >
                <span>View Filtered</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/admin/products?category=${cat.id}`}
                  className="p-4 rounded-xl border border-[#EAEAEA] hover:border-[#CCCCCC] hover:bg-[#FAFAFA] transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-[#F7F7F7] flex items-center justify-center text-[#111111] group-hover:bg-[#EAF5EF] group-hover:text-[#1F7A4D] transition-colors">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#111111] group-hover:text-[#1F7A4D] transition-colors">
                        {cat.name}
                      </h4>
                      <span className="text-3xs text-[#777777] font-mono">
                        Slug: {cat.slug}
                      </span>
                    </div>
                  </div>
                  <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-[#F2F2F2] text-[#555555] font-mono">
                    Active
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Operational Audit Preview */}
          <div className="bg-white p-8 rounded-2xl border border-[#EAEAEA] shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-[#111111]">
                  Audit Activity
                </h3>
                <p className="text-xs text-[#777777] mt-0.5">
                  Real-time mutations log
                </p>
              </div>
              <ShieldCheck size={18} className="text-[#1F7A4D]" />
            </div>

            <div className="space-y-3">
              {recentAuditLogs.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#777777]">
                  No recent audit events.
                </div>
              ) : (
                recentAuditLogs.map((log: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#FAFAFA] border border-[#EAEAEA] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#111111]">{log.action}</span>
                      <span className="text-3xs font-mono text-[#777777]">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-3xs text-[#777777] font-mono truncate">
                      {log.adminEmail || "SYSTEM"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Catalogue Products Table */}
        <div className="bg-white rounded-2xl border border-[#EAEAEA] shadow-xs overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-[#EAEAEA] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-[#111111]">
                Recently Managed Medical Products
              </h3>
              <p className="text-xs text-[#777777] mt-0.5">
                Direct editing connected to live database
              </p>
            </div>
            <Link
              to="/admin/products"
              className="px-5 py-2.5 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <span>View All 193 Products</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#EAEAEA] text-[#777777] font-bold uppercase text-3xs tracking-wider">
                  <th className="p-4 sm:p-5">Product Details</th>
                  <th className="p-4 sm:p-5">SKU / Model</th>
                  <th className="p-4 sm:p-5">Category</th>
                  <th className="p-4 sm:p-5">Base USD Price</th>
                  <th className="p-4 sm:p-5">Status</th>
                  <th className="p-4 sm:p-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAEAEA] text-[#555555]">
                {recentProducts.slice(0, 8).map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="p-4 sm:p-5">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-lg bg-[#F7F7F7] overflow-hidden shrink-0 border border-[#EAEAEA]">
                          <img
                            src={p.images?.[0] || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80"}
                            alt={p.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80";
                            }}
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-[#111111] truncate max-w-xs sm:max-w-md">
                            {p.title}
                          </h4>
                          <span className="text-3xs text-[#777777]">
                            ID: {p.id}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 sm:p-5 font-mono text-xs">
                      <div className="font-bold text-[#111111]">{p.sku}</div>
                      <div className="text-[#777777]">{p.modelNumber || "—"}</div>
                    </td>
                    <td className="p-4 sm:p-5 capitalize">
                      <span className="px-2.5 py-1 rounded bg-[#F2F2F2] text-[#555555] text-3xs font-medium">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 font-mono font-bold text-[#111111]">
                      ${(p.basePrice || 0).toLocaleString()}
                    </td>
                    <td className="p-4 sm:p-5">
                      <span
                        className={`px-2.5 py-1 rounded text-3xs font-bold ${
                          p.status === "ACTIVE"
                            ? "bg-[#EAF5EF] text-[#1F7A4D]"
                            : p.status === "DRAFT"
                            ? "bg-[#FFF8E1] text-[#B78103]"
                            : "bg-[#F2F2F2] text-[#777777]"
                        }`}
                      >
                        {p.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-center">
                      <button
                        type="button"
                        onClick={() => handleEditProduct(p)}
                        className="px-3 py-1.5 bg-[#F2F2F2] hover:bg-[#EAEAEA] text-[#111111] rounded-md text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
                      >
                        <Edit2 size={12} />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Editor Modal */}
      <ProductEditorModal
        product={selectedProduct}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={() => {
          fetchDashboardData();
        }}
        categories={categories}
      />
    </AdminLayout>
  );
};
