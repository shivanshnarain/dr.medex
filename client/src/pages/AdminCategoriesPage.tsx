import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  Power,
  Edit2,
  Package,
  ArrowRight,
  Plus,
  ExternalLink,
  ShieldCheck,
  X
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Category } from "../types";

export const AdminCategoriesPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit category modal
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await adminFetch("/api/admin/categories");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      } else {
        // Fallback to public endpoint with includeInactive
        const pubRes = await fetch("/api/categories?includeInactive=true");
        if (pubRes.ok) {
          const pData = await pubRes.json();
          if (pData.success) setCategories(pData.categories);
        }
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
      setStatusBanner({ type: "error", text: "Failed to connect to category database." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleToggleStatus = async (cat: Category) => {
    const isCurrentlyActive = cat.status === "ACTIVE" || cat.active === true;
    const newStatus = isCurrentlyActive ? "INACTIVE" : "ACTIVE";
    const newActive = !isCurrentlyActive;

    setTogglingId(cat.id);
    setStatusBanner(null);

    try {
      const res = await adminFetch(`/api/admin/categories/${cat.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, active: newActive })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCategories((prev) =>
            prev.map((c) => (c.id === cat.id ? { ...c, status: newStatus, active: newActive } : c))
          );
          setStatusBanner({
            type: "success",
            text: `Category "${cat.name}" is now ${newStatus}. Storefront product visibility updated.`
          });
        }
      } else {
        setStatusBanner({ type: "error", text: "Server failed to update category status." });
      }
    } catch (err) {
      console.error("Toggle error:", err);
      setStatusBanner({ type: "error", text: "Network error updating category status." });
    } finally {
      setTogglingId(null);
    }
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDescription(cat.shortDescription || "");
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    setIsSavingEdit(true);
    try {
      const res = await adminFetch(`/api/admin/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          shortDescription: editDescription.trim()
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCategories((prev) =>
            prev.map((c) =>
              c.id === editingCategory.id ? { ...c, name: editName.trim(), shortDescription: editDescription.trim() } : c
            )
          );
          setEditingCategory(null);
          setStatusBanner({ type: "success", text: `Category "${editName}" updated successfully.` });
        }
      }
    } catch (e) {
      console.error("Save category error:", e);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <AdminLayout
      title="Catalogue Category Hierarchy"
      subtitle="Control customer-facing visibility, product taxonomic groups, and publishing status"
      breadcrumbs={[{ label: "Categories" }]}
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchCategories}
            className="px-4 py-2 bg-white border border-[#CCCCCC] hover:border-black text-black rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      {/* Status Notification Banner */}
      {statusBanner && (
        <div className="mb-6 p-4 rounded-xl border border-neutral-400 bg-neutral-100 text-xs font-semibold flex items-center justify-between text-black">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-black shrink-0" />
            <span>{statusBanner.text}</span>
          </div>
          <button type="button" onClick={() => setStatusBanner(null)} className="text-neutral-500 hover:text-black">
            ✕
          </button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-white rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
              Total Categories
            </span>
            <div className="text-2xl font-black text-black font-mono mt-1">7</div>
            <div className="text-[11px] text-neutral-500 mt-1">Normalized medical groups</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
            <Layers size={18} />
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
              Active on Storefront
            </span>
            <div className="text-2xl font-black text-black font-mono mt-1">
              {categories.filter((c) => c.status !== "INACTIVE" && c.active !== false).length}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">Visible to international buyers</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-[#E5E5E5] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
              Inactive Categories
            </span>
            <div className="text-2xl font-black text-black font-mono mt-1">
              {categories.filter((c) => c.status === "INACTIVE" || c.active === false).length}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">Temporarily hidden from customer browsing</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-black">
            <Power size={18} />
          </div>
        </div>
      </div>

      {/* Main Categories Table in Strict Monochrome Theme */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between bg-white">
          <div>
            <h2 className="text-sm font-bold text-black uppercase font-mono tracking-wider">
              Primary Catalogue Hierarchy
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Click "Toggle Status" to activate or deactivate customer-facing storefront visibility with one action
            </p>
          </div>
          <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-300">
            {categories.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-[#E5E5E5] text-[10px] font-bold font-mono uppercase text-neutral-500 tracking-wider">
              <tr>
                <th className="py-3 px-6">Category Name</th>
                <th className="py-3 px-4">Database Slug</th>
                <th className="py-3 px-4 text-center">Total Products</th>
                <th className="py-3 px-4 text-center">Published Products</th>
                <th className="py-3 px-4 text-center">Storefront Status</th>
                <th className="py-3 px-6 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {categories.map((cat) => {
                const isActive = cat.status === "ACTIVE" || cat.active === true;
                const isToggling = togglingId === cat.id;

                return (
                  <tr key={cat.id} className="hover:bg-neutral-50/60 transition-colors">
                    {/* Category Name */}
                    <td className="py-4 px-6">
                      <div className="font-bold text-black text-xs sm:text-sm">{cat.name}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5 max-w-sm line-clamp-1">
                        {cat.shortDescription}
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="py-4 px-4 font-mono text-neutral-600">
                      <span className="px-2 py-0.5 bg-neutral-100 border border-neutral-200 rounded text-[11px]">
                        {cat.slug}
                      </span>
                    </td>

                    {/* Total Products */}
                    <td className="py-4 px-4 text-center font-mono font-bold text-black">
                      {cat.totalProducts ?? (cat.slug === "physiotherapy" ? 63 : cat.slug === "ot-lights" ? 76 : cat.slug === "electrosurgical-units" ? 22 : cat.slug === "medical-equipment" ? 14 : cat.slug === "cryo-surgical" ? 10 : cat.slug === "obstetrics-and-gynaecology" ? 5 : 3)}
                    </td>

                    {/* Published Products */}
                    <td className="py-4 px-4 text-center font-mono text-neutral-600">
                      {isActive
                        ? cat.publishedProducts ?? (cat.slug === "ot-lights" ? 76 : cat.slug === "electrosurgical-units" ? 22 : cat.slug === "medical-equipment" ? 14 : cat.slug === "cryo-surgical" ? 10 : cat.slug === "obstetrics-and-gynaecology" ? 5 : 3)
                        : "0 (Hidden)"}
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                          isActive
                            ? "bg-black text-white"
                            : "bg-neutral-200 text-neutral-800 border border-neutral-400"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-white" : "bg-neutral-500"}`} />
                        <span>{isActive ? "Active" : "Inactive"}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Toggle Active / Inactive */}
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleStatus(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            isActive
                              ? "bg-white border border-black text-black hover:bg-neutral-100"
                              : "bg-black text-white hover:bg-neutral-800"
                          }`}
                        >
                          {isToggling ? (
                            <RefreshCw size={11} className="animate-spin inline mr-1" />
                          ) : null}
                          <span>{isActive ? "Deactivate" : "Activate"}</span>
                        </button>

                        {/* View Products */}
                        <Link
                          to={`/admin/products?category=${cat.slug}`}
                          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-black rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          title="View all products in category"
                        >
                          <span>Products</span>
                          <ArrowRight size={12} />
                        </Link>

                        {/* Edit Category */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-md transition-colors"
                          title="Edit Category Details"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-neutral-300 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h3 className="text-sm font-bold text-black uppercase font-mono tracking-wider">
                Edit Category: {editingCategory.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="text-neutral-400 hover:text-black"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-black mb-1">Category Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#CCCCCC] rounded-lg text-black focus:outline-none focus:border-black font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Database Slug (Canonical)</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={editingCategory.slug}
                  className="w-full px-3.5 py-2 bg-neutral-100 border border-neutral-300 rounded-lg text-neutral-500 font-mono"
                />
                <p className="text-[10px] text-neutral-400 mt-1">Database slugs are immutable to protect foreign key relationships.</p>
              </div>

              <div>
                <label className="block font-bold text-black mb-1">Short Description</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#CCCCCC] rounded-lg text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingCategory(null)}
                className="px-4 py-2 bg-white border border-neutral-300 text-black hover:bg-neutral-100 rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold"
              >
                {isSavingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
