import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Power,
  Edit2,
  Trash2,
  Package,
  Plus,
  ExternalLink,
  ShieldCheck,
  X,
  Search,
  Filter,
  ChevronRight,
  FolderTree,
  Tag,
  Stethoscope
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Category } from "../types";

interface SubcategoryRecord {
  id: string;
  name: string;
  parentCategoryId: string;
  parentCategoryName: string;
  equipmentTypesCount: number;
  equipmentTypes: any[];
}

interface EquipmentTypeRecord {
  id: string;
  name: string;
  defaultCode?: string;
  parentSubcategoryId: string;
  parentSubcategoryName: string;
  parentCategoryId: string;
  parentCategoryName: string;
}

export const AdminCategoriesPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tabs: primary | subcategories | equipment-types
  const tabParam = searchParams.get("tab");
  const initialTab = (tabParam === "subcategories" || tabParam === "equipment-types") ? tabParam : "primary";
  const [activeTab, setActiveTab] = useState<"primary" | "subcategories" | "equipment-types">(initialTab);

  // Search query within the page
  const initialSearch = searchParams.get("search") || "";
  const [filterQuery, setFilterQuery] = useState(initialSearch);

  // Catalogue data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [hierarchy, setHierarchy] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addType, setAddType] = useState<"primary" | "subcategory" | "equipment">("primary");
  const [addName, setAddName] = useState("");
  const [addCode, setAddCode] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addParentCategory, setAddParentCategory] = useState("");
  const [addParentSubcategory, setAddParentSubcategory] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<{
    type: "primary" | "subcategory" | "equipment";
    id: string;
    name: string;
    description?: string;
    code?: string;
    parentCategory?: string;
    parentSubcategory?: string;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCode, setEditCode] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deletingItem, setDeletingItem] = useState<{
    type: "primary" | "subcategory" | "equipment";
    id: string;
    name: string;
    parentCategory?: string;
    parentSubcategory?: string;
  } | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Fetch full taxonomy data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hierRes, catRes] = await Promise.all([
        adminFetch("/api/admin/catalogue/hierarchy"),
        adminFetch("/api/admin/categories")
      ]);

      if (hierRes.ok) {
        const hData = await hierRes.json();
        if (hData.success && hData.hierarchy) {
          setHierarchy(hData.hierarchy);
        }
      }

      if (catRes.ok) {
        const cData = await catRes.json();
        if (cData.success && Array.isArray(cData.categories)) {
          setCategories(cData.categories);
        }
      }
    } catch (err) {
      console.error("Failed to load category taxonomy:", err);
      setBanner({ type: "error", text: "Failed to load category taxonomy from server." });
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync tab with URL
  const handleTabChange = (tab: "primary" | "subcategories" | "equipment-types") => {
    setActiveTab(tab);
    setSearchParams(prev => {
      prev.set("tab", tab);
      return prev;
    });
  };

  // Flatten subcategories
  const flatSubcategories: SubcategoryRecord[] = useMemo(() => {
    const list: SubcategoryRecord[] = [];
    for (const [catKey, cat] of Object.entries(hierarchy)) {
      const catName = cat.name || catKey;
      const catId = cat.id || catKey;
      if (Array.isArray(cat.subcategories)) {
        for (const sub of cat.subcategories) {
          list.push({
            id: sub.id,
            name: sub.name,
            parentCategoryId: catId,
            parentCategoryName: catName,
            equipmentTypesCount: Array.isArray(sub.equipmentTypes) ? sub.equipmentTypes.length : 0,
            equipmentTypes: sub.equipmentTypes || []
          });
        }
      }
    }
    return list;
  }, [hierarchy]);

  // Flatten equipment types
  const flatEquipmentTypes: EquipmentTypeRecord[] = useMemo(() => {
    const list: EquipmentTypeRecord[] = [];
    for (const [catKey, cat] of Object.entries(hierarchy)) {
      const catName = cat.name || catKey;
      const catId = cat.id || catKey;
      if (Array.isArray(cat.subcategories)) {
        for (const sub of cat.subcategories) {
          if (Array.isArray(sub.equipmentTypes)) {
            for (const eq of sub.equipmentTypes) {
              list.push({
                id: eq.id || eq.name,
                name: eq.name,
                defaultCode: eq.defaultCode || eq.code,
                parentSubcategoryId: sub.id,
                parentSubcategoryName: sub.name,
                parentCategoryId: catId,
                parentCategoryName: catName
              });
            }
          }
        }
      }
    }
    return list;
  }, [hierarchy]);

  // Filtered lists based on filterQuery
  const q = filterQuery.trim().toLowerCase();

  const filteredPrimaryCategories = useMemo(() => {
    if (!q) return categories;
    return categories.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      (c.shortDescription && c.shortDescription.toLowerCase().includes(q))
    );
  }, [categories, q]);

  const filteredSubcategories = useMemo(() => {
    if (!q) return flatSubcategories;
    return flatSubcategories.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      s.parentCategoryName.toLowerCase().includes(q)
    );
  }, [flatSubcategories, q]);

  const filteredEquipmentTypes = useMemo(() => {
    if (!q) return flatEquipmentTypes;
    return flatEquipmentTypes.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.defaultCode && e.defaultCode.toLowerCase().includes(q)) ||
      e.parentSubcategoryName.toLowerCase().includes(q) ||
      e.parentCategoryName.toLowerCase().includes(q)
    );
  }, [flatEquipmentTypes, q]);

  // Storefront visibility status toggle
  const handleToggleStatus = async (cat: Category) => {
    const isCurrentlyActive = cat.status === "ACTIVE" || cat.active === true;
    const newStatus = isCurrentlyActive ? "INACTIVE" : "ACTIVE";
    const newActive = !isCurrentlyActive;

    setTogglingId(cat.id);
    setBanner(null);

    try {
      const res = await adminFetch(`/api/admin/categories/${cat.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, active: newActive })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCategories(prev =>
            prev.map(c => (c.id === cat.id ? { ...c, status: newStatus, active: newActive } : c))
          );
          setBanner({
            type: "success",
            text: `Primary category "${cat.name}" storefront status updated to ${newStatus}.`
          });
        }
      } else {
        setBanner({ type: "error", text: "Failed to update category storefront status." });
      }
    } catch (err) {
      console.error("Toggle error:", err);
      setBanner({ type: "error", text: "Network error updating category status." });
    } finally {
      setTogglingId(null);
    }
  };

  // Open Add modal with preset
  const handleOpenAdd = (type: "primary" | "subcategory" | "equipment", defaultParent?: string, defaultSub?: string) => {
    setAddType(type);
    setAddName("");
    setAddCode("");
    setAddDescription("");
    setAddParentCategory(defaultParent || categories[0]?.id || "");
    setAddParentSubcategory(defaultSub || "");
    setAddError(null);
    setIsAddModalOpen(true);
  };

  // Handle Add submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!addName.trim()) {
      setAddError("Name is required.");
      return;
    }

    setIsSubmittingAdd(true);
    try {
      let endpoint = "";
      let body: any = {};

      if (addType === "primary") {
        endpoint = "/api/admin/catalogue/primary-category";
        body = {
          name: addName.trim(),
          code: addCode.trim() || undefined,
          shortDescription: addDescription.trim() || undefined
        };
      } else if (addType === "subcategory") {
        if (!addParentCategory) {
          setAddError("Please select a parent primary category.");
          setIsSubmittingAdd(false);
          return;
        }
        endpoint = "/api/admin/catalogue/subcategory";
        body = {
          parentCategory: addParentCategory,
          name: addName.trim()
        };
      } else {
        if (!addParentCategory || !addParentSubcategory) {
          setAddError("Please select both parent primary category and subcategory.");
          setIsSubmittingAdd(false);
          return;
        }
        endpoint = "/api/admin/catalogue/equipment-type";
        body = {
          parentCategory: addParentCategory,
          subcategory: addParentSubcategory,
          name: addName.trim()
        };
      }

      const res = await adminFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setIsAddModalOpen(false);
        setBanner({ type: "success", text: data.message || "Taxonomy record created successfully." });
        if (data.hierarchy) setHierarchy(data.hierarchy);
        if (data.categories) setCategories(data.categories);
        await fetchData();
      } else {
        setAddError(data.message || "Failed to create category record.");
      }
    } catch (err: any) {
      setAddError(err.message || "Network error while creating category record.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Open Edit modal
  const handleOpenEdit = (item: {
    type: "primary" | "subcategory" | "equipment";
    id: string;
    name: string;
    description?: string;
    code?: string;
    parentCategory?: string;
    parentSubcategory?: string;
  }) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description || "");
    setEditCode(item.code || "");
    setEditError(null);
  };

  // Handle Edit submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Name is required.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      let endpoint = "";
      let body: any = {};

      if (editingItem.type === "primary") {
        endpoint = `/api/admin/catalogue/primary-category/${editingItem.id}`;
        body = {
          name: editName.trim(),
          shortDescription: editDescription.trim() || undefined
        };
      } else if (editingItem.type === "subcategory") {
        endpoint = `/api/admin/catalogue/subcategory/${editingItem.parentCategory}/${editingItem.id}`;
        body = { name: editName.trim() };
      } else {
        endpoint = `/api/admin/catalogue/equipment-type/${editingItem.parentCategory}/${editingItem.parentSubcategory}/${editingItem.id}`;
        body = { name: editName.trim(), code: editCode.trim() || undefined };
      }

      const res = await adminFetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setEditingItem(null);
        setBanner({ type: "success", text: data.message || "Record updated successfully." });
        if (data.hierarchy) setHierarchy(data.hierarchy);
        if (data.categories) setCategories(data.categories);
        await fetchData();
      } else {
        setEditError(data.message || "Failed to update record.");
      }
    } catch (err: any) {
      setEditError(err.message || "Network error updating record.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Safe Delete Confirmation
  const handleOpenDelete = (item: {
    type: "primary" | "subcategory" | "equipment";
    id: string;
    name: string;
    parentCategory?: string;
    parentSubcategory?: string;
  }) => {
    setDeletingItem(item);
    setDeleteError(null);
  };

  // Execute Safe Deletion
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setDeleteError(null);
    setIsSubmittingDelete(true);

    try {
      let endpoint = "";
      if (deletingItem.type === "primary") {
        endpoint = `/api/admin/catalogue/primary-category/${deletingItem.id}`;
      } else if (deletingItem.type === "subcategory") {
        endpoint = `/api/admin/catalogue/subcategory/${deletingItem.parentCategory}/${deletingItem.id}`;
      } else {
        endpoint = `/api/admin/catalogue/equipment-type/${deletingItem.parentCategory}/${deletingItem.parentSubcategory}/${deletingItem.id}`;
      }

      const res = await adminFetch(endpoint, {
        method: "DELETE"
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const deletedName = deletingItem.name;
        setDeletingItem(null);
        setBanner({ type: "success", text: data.message || `"${deletedName}" deleted successfully.` });
        if (data.hierarchy) setHierarchy(data.hierarchy);
        if (data.categories) setCategories(data.categories);
        await fetchData();
      } else {
        // Backend blocked deletion due to dependency (products or child records)
        setDeleteError(data.message || "Deletion prevented due to associated database dependencies.");
      }
    } catch (err: any) {
      setDeleteError(err.message || "Network error while attempting deletion.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Available subcategories for add modal parent selection
  const availableSubcategoriesForSelectedCat = useMemo(() => {
    if (!addParentCategory) return [];
    const cat = hierarchy[addParentCategory] || Object.values(hierarchy).find((c: any) => c.id === addParentCategory);
    return Array.isArray(cat?.subcategories) ? cat.subcategories : [];
  }, [hierarchy, addParentCategory]);

  return (
    <AdminLayout
      title="Catalogue Taxonomy & Category Management"
      subtitle="Manage Primary Categories (L1), Subcategories (L2), and Verified Equipment Types (L3) with safe dependency protection."
      breadcrumbs={[{ label: "Categories" }]}
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="px-3.5 py-2 bg-[#0D4C3C] border border-white/20 hover:border-white text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAdd(
              activeTab === "equipment-types" ? "equipment" : activeTab === "subcategories" ? "subcategory" : "primary"
            )}
            className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>
              {activeTab === "equipment-types"
                ? "Add Equipment Type"
                : activeTab === "subcategories"
                ? "Add Subcategory"
                : "Add Primary Category"}
            </span>
          </button>
        </div>
      }
    >
      {/* Status Notification Banner */}
      {banner && (
        <div
          className={`mb-6 p-4 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-md ${
            banner.type === "error"
              ? "bg-[#C62828]/20 text-white border-[#C62828]"
              : "bg-[#0D4C3C] text-white border-[#FFD400]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === "error" ? (
              <AlertCircle size={16} className="text-[#FF6B6B] shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-[#FFD400] shrink-0" />
            )}
            <span>{banner.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-white/70 hover:text-white p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div
          onClick={() => handleTabChange("primary")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "primary"
              ? "bg-[#0D4C3C] border-[#FFD400] shadow-lg ring-1 ring-[#FFD400]"
              : "bg-[#0D4C3C] border-white/15 hover:border-white/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/70">
              Primary Categories (L1)
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[#FFD400]">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-3">
            {categories.length}
          </div>
          <div className="text-[11px] text-white/70 mt-1">
            {categories.filter(c => c.status !== "INACTIVE" && c.active !== false).length} active on storefront
          </div>
        </div>

        <div
          onClick={() => handleTabChange("subcategories")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "subcategories"
              ? "bg-[#0D4C3C] border-[#FFD400] shadow-lg ring-1 ring-[#FFD400]"
              : "bg-[#0D4C3C] border-white/15 hover:border-white/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/70">
              Subcategories (L2)
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-emerald-300">
              <FolderTree size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-3">
            {flatSubcategories.length}
          </div>
          <div className="text-[11px] text-white/70 mt-1">
            Grouped across {categories.length} primary divisions
          </div>
        </div>

        <div
          onClick={() => handleTabChange("equipment-types")}
          className={`p-5 rounded-2xl border transition-all cursor-pointer ${
            activeTab === "equipment-types"
              ? "bg-[#0D4C3C] border-[#FFD400] shadow-lg ring-1 ring-[#FFD400]"
              : "bg-[#0D4C3C] border-white/15 hover:border-white/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/70">
              Equipment Types (L3)
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-300">
              <Stethoscope size={16} />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono mt-3">
            {flatEquipmentTypes.length}
          </div>
          <div className="text-[11px] text-white/70 mt-1">
            Verified equipment classifications with SKU prefixes
          </div>
        </div>
      </div>

      {/* Main Taxonomy Management Card */}
      <div className="bg-[#0D4C3C] rounded-2xl border border-white/20 shadow-xl overflow-hidden">
        {/* Navigation Tabs Bar & Filter Search */}
        <div className="p-4 sm:p-5 border-b border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0D4C3C]">
          {/* Tab Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => handleTabChange("primary")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === "primary"
                  ? "bg-[#FFD400] text-black shadow-sm"
                  : "bg-white/10 text-white/80 hover:text-white hover:bg-white/15"
              }`}
            >
              <Layers size={14} />
              <span>1. Primary Categories</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-black ${
                activeTab === "primary" ? "bg-black/20 text-black" : "bg-white/10 text-white"
              }`}>
                {categories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("subcategories")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === "subcategories"
                  ? "bg-[#FFD400] text-black shadow-sm"
                  : "bg-white/10 text-white/80 hover:text-white hover:bg-white/15"
              }`}
            >
              <FolderTree size={14} />
              <span>2. Subcategories</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-black ${
                activeTab === "subcategories" ? "bg-black/20 text-black" : "bg-white/10 text-white"
              }`}>
                {flatSubcategories.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("equipment-types")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                activeTab === "equipment-types"
                  ? "bg-[#FFD400] text-black shadow-sm"
                  : "bg-white/10 text-white/80 hover:text-white hover:bg-white/15"
              }`}
            >
              <Stethoscope size={14} />
              <span>3. Verified Equipment Types</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-black ${
                activeTab === "equipment-types" ? "bg-black/20 text-black" : "bg-white/10 text-white"
              }`}>
                {flatEquipmentTypes.length}
              </span>
            </button>
          </div>

          {/* Search Filter input */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder={`Filter ${
                activeTab === "primary"
                  ? "categories..."
                  : activeTab === "subcategories"
                  ? "subcategories..."
                  : "equipment types..."
              }`}
              className="w-full pl-9 pr-8 py-1.5 bg-white text-black placeholder:text-neutral-500 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Primary Categories Table */}
        {activeTab === "primary" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-black/20 border-b border-white/15 text-[10px] font-bold font-mono uppercase text-white/70 tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Category Name</th>
                  <th className="py-3.5 px-4">Database Slug / ID</th>
                  <th className="py-3.5 px-4 text-center">SKU Code</th>
                  <th className="py-3.5 px-4 text-center">Subcategories</th>
                  <th className="py-3.5 px-4 text-center">Storefront Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-white/60">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#FFD400] border-t-transparent rounded-full animate-spin" />
                        <span>Loading primary categories...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredPrimaryCategories.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-white/60">
                      No primary categories match &ldquo;{filterQuery}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredPrimaryCategories.map((cat) => {
                    const isActive = cat.status === "ACTIVE" || cat.active === true;
                    const isToggling = togglingId === cat.id;
                    const hierItem = hierarchy[cat.id] || hierarchy[cat.slug] || {};
                    const code = hierItem.code || "MED";
                    const subCount = hierItem.subcategories?.length || cat.subcategories?.length || 0;

                    return (
                      <tr key={cat.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-semibold">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#FFD400] shrink-0">
                              <Layers size={14} />
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{cat.name}</div>
                              {cat.shortDescription && (
                                <div className="text-[11px] text-white/70 line-clamp-1 max-w-sm mt-0.5">
                                  {cat.shortDescription}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 font-mono text-[11px] text-white/80">
                          {cat.slug || cat.id}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 text-[#FFD400] border border-white/20">
                            {code}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-mono font-bold text-white">
                          <button
                            type="button"
                            onClick={() => {
                              handleTabChange("subcategories");
                              setFilterQuery(cat.name);
                            }}
                            className="hover:text-[#FFD400] hover:underline cursor-pointer"
                            title="View subcategories under this primary category"
                          >
                            {subCount}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isActive
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-neutral-500/20 text-neutral-300 border border-neutral-500/30"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-neutral-400"}`} />
                            {isActive ? "Active" : "Hidden"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(cat)}
                              disabled={isToggling}
                              title={isActive ? "Deactivate storefront visibility" : "Activate storefront visibility"}
                              className={`p-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer ${
                                isActive
                                  ? "border-white/20 text-white/70 hover:text-white hover:bg-white/10"
                                  : "border-emerald-500/30 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                              }`}
                            >
                              <Power size={13} className={isToggling ? "animate-spin" : ""} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit({
                                type: "primary",
                                id: cat.id,
                                name: cat.name,
                                description: cat.shortDescription,
                                code
                              })}
                              title="Edit Category Details"
                              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md border border-white/20 transition-colors cursor-pointer"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenDelete({
                                type: "primary",
                                id: cat.id,
                                name: cat.name
                              })}
                              title="Delete Category (Safe Dependency Protected)"
                              className="p-1.5 text-red-300 hover:text-red-100 hover:bg-[#C62828] rounded-md border border-red-500/30 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Subcategories Table */}
        {activeTab === "subcategories" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-black/20 border-b border-white/15 text-[10px] font-bold font-mono uppercase text-white/70 tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Subcategory Name</th>
                  <th className="py-3.5 px-4">Parent Primary Category</th>
                  <th className="py-3.5 px-4 font-mono">Slug / Identifier</th>
                  <th className="py-3.5 px-4 text-center">Equipment Types</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-white/60">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#FFD400] border-t-transparent rounded-full animate-spin" />
                        <span>Loading subcategories...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredSubcategories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-white/60">
                      No subcategories match &ldquo;{filterQuery}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredSubcategories.map((sub) => (
                    <tr key={`${sub.parentCategoryId}-${sub.id}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-semibold">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-emerald-300 shrink-0">
                            <FolderTree size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{sub.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-semibold">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-white text-xs border border-white/15">
                          <Layers size={11} className="text-[#FFD400]" />
                          <span>{sub.parentCategoryName}</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 font-mono text-[11px] text-white/80">
                        {sub.id}
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-bold text-white">
                        <button
                          type="button"
                          onClick={() => {
                            handleTabChange("equipment-types");
                            setFilterQuery(sub.name);
                          }}
                          className="hover:text-[#FFD400] hover:underline cursor-pointer"
                          title="View verified equipment types under this subcategory"
                        >
                          {sub.equipmentTypesCount}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenAdd("equipment", sub.parentCategoryId, sub.id)}
                            title="Add Equipment Type under this subcategory"
                            className="p-1.5 text-[#FFD400] hover:bg-white/10 rounded-md border border-[#FFD400]/40 transition-colors cursor-pointer"
                          >
                            <Plus size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit({
                              type: "subcategory",
                              id: sub.id,
                              name: sub.name,
                              parentCategory: sub.parentCategoryId
                            })}
                            title="Edit Subcategory"
                            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md border border-white/20 transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete({
                              type: "subcategory",
                              id: sub.id,
                              name: sub.name,
                              parentCategory: sub.parentCategoryId
                            })}
                            title="Delete Subcategory (Safe Dependency Protected)"
                            className="p-1.5 text-red-300 hover:text-red-100 hover:bg-[#C62828] rounded-md border border-red-500/30 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Verified Equipment Types Table */}
        {activeTab === "equipment-types" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white">
              <thead className="bg-black/20 border-b border-white/15 text-[10px] font-bold font-mono uppercase text-white/70 tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Equipment Type</th>
                  <th className="py-3.5 px-4 text-center">SKU Prefix</th>
                  <th className="py-3.5 px-4">Parent Subcategory</th>
                  <th className="py-3.5 px-4">Primary Category</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-white/60">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-[#FFD400] border-t-transparent rounded-full animate-spin" />
                        <span>Loading verified equipment types...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredEquipmentTypes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-white/60">
                      No verified equipment types match &ldquo;{filterQuery}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredEquipmentTypes.map((eq) => (
                    <tr key={`${eq.parentCategoryId}-${eq.parentSubcategoryId}-${eq.id}`} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-semibold">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-amber-300 shrink-0">
                            <Stethoscope size={14} />
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">{eq.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 text-[#FFD400] border border-white/20">
                          {eq.defaultCode || "EQP"}
                        </span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-white/90">
                        {eq.parentSubcategoryName}
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-[11px] text-white/70 font-mono">
                          {eq.parentCategoryName}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit({
                              type: "equipment",
                              id: eq.id,
                              name: eq.name,
                              code: eq.defaultCode,
                              parentCategory: eq.parentCategoryId,
                              parentSubcategory: eq.parentSubcategoryId
                            })}
                            title="Edit Equipment Type"
                            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md border border-white/20 transition-colors cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete({
                              type: "equipment",
                              id: eq.id,
                              name: eq.name,
                              parentCategory: eq.parentCategoryId,
                              parentSubcategory: eq.parentSubcategoryId
                            })}
                            title="Delete Equipment Type (Safe Dependency Protected)"
                            className="p-1.5 text-red-300 hover:text-red-100 hover:bg-[#C62828] rounded-md border border-red-500/30 transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* ADD MODAL                                                    */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-[#0D4C3C] text-white rounded-2xl max-w-lg w-full border border-white/20 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between bg-[#0D4C3C]">
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-[#FFD400]" />
                <h3 className="font-bold text-sm uppercase tracking-wider font-mono text-white">
                  {addType === "primary"
                    ? "Add New Primary Category (L1)"
                    : addType === "subcategory"
                    ? "Add New Subcategory (L2)"
                    : "Add Verified Equipment Type (L3)"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              {addError && (
                <div className="p-3 bg-[#C62828]/20 border border-[#C62828] rounded-lg text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-red-300" />
                  <span>{addError}</span>
                </div>
              )}

              {/* Subcategory & Equipment Type: Parent Primary Category Selector */}
              {(addType === "subcategory" || addType === "equipment") && (
                <div>
                  <label className="block text-[11px] font-bold font-mono uppercase text-white/80 mb-1.5">
                    Parent Primary Category *
                  </label>
                  <select
                    value={addParentCategory}
                    onChange={(e) => {
                      setAddParentCategory(e.target.value);
                      setAddParentSubcategory("");
                    }}
                    required
                    className="w-full px-3 py-2 bg-white text-black text-xs rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
                  >
                    <option value="" disabled>Select Primary Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Equipment Type: Parent Subcategory Selector */}
              {addType === "equipment" && (
                <div>
                  <label className="block text-[11px] font-bold font-mono uppercase text-white/80 mb-1.5">
                    Parent Subcategory *
                  </label>
                  <select
                    value={addParentSubcategory}
                    onChange={(e) => setAddParentSubcategory(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white text-black text-xs rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
                  >
                    <option value="" disabled>Select Subcategory</option>
                    {availableSubcategoriesForSelectedCat.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name Input */}
              <div>
                <label className="block text-[11px] font-bold font-mono uppercase text-white/80 mb-1.5">
                  {addType === "primary" ? "Category Name *" : addType === "subcategory" ? "Subcategory Name *" : "Equipment Type Name *"}
                </label>
                <input
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder={
                    addType === "primary"
                      ? "e.g. Diagnostic Ultrasound Systems"
                      : addType === "subcategory"
                      ? "e.g. Doppler Ultrasound"
                      : "e.g. Color 4D Doppler Ultrasound"
                  }
                  required
                  className="w-full px-3 py-2 bg-white text-black placeholder:text-neutral-400 text-xs rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
                />
              </div>

              {/* Primary: Optional SKU prefix code */}
              {addType === "primary" && (
                <div>
                  <label className="block text-[11px] font-bold font-mono uppercase text-white/80 mb-1.5">
                    Taxonomy / SKU Prefix Code (Optional, e.g. DUS)
                  </label>
                  <input
                    type="text"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    placeholder="e.g. DUS"
                    className="w-full px-3 py-2 bg-white text-black placeholder:text-neutral-400 font-mono text-xs rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
                  />
                  <p className="text-[10px] text-white/60 mt-1">
                    Auto-generated from name if left empty. Used for SKU sequencing.
                  </p>
                </div>
              )}

              {/* Primary: Short description */}
              {addType === "primary" && (
                <div>
                  <label className="block text-[11px] font-bold font-mono uppercase text-white/80 mb-1.5">
                    Short Description (Optional)
                  </label>
                  <textarea
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    rows={2}
                    placeholder="Clinical equipment description for catalog browsing..."
                    className="w-full px-3 py-2 bg-white text-black placeholder:text-neutral-400 text-xs rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-white/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-5 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingAdd && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* EDIT MODAL                                                   */}
      {/* ============================================================ */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-[#0D4C3C] text-white rounded-2xl max-w-lg w-full border border-white/20 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between bg-[#0D4C3C]">
              <div className="flex items-center gap-2">
                <Edit2 size={16} className="text-[#FFD400]" />
                <h3 className="font-bold text-sm uppercase tracking-wider font-mono text-white">
                  Edit {editingItem.type === "primary" ? "Primary Category" : editingItem.type === "subcategory" ? "Subcategory" : "Equipment Type"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-white/60 hover:text-white p-1 rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-[#C62828]/20 border border-[#C62828] rounded-lg text-xs text-red-200 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-red-300" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold font-mono uppercase text-white/80 mb-1.5">
                  Record Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white text-black text-xs rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
                />
              </div>

              {editingItem.type === "primary" && (
                <div>
                  <label className="block text-[11px] font-bold font-mono uppercase text-white/80 mb-1.5">
                    Short Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-white text-black text-xs rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
                  />
                </div>
              )}

              {editingItem.type === "equipment" && (
                <div>
                  <label className="block text-[11px] font-bold font-mono uppercase text-white/80 mb-1.5">
                    Default SKU Prefix / Code
                  </label>
                  <input
                    type="text"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    className="w-full px-3 py-2 bg-white text-black font-mono text-xs rounded-lg border border-white/30 focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-white/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingEdit && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SAFE DELETE CONFIRMATION MODAL                               */}
      {/* ============================================================ */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-[#0D4C3C] text-white rounded-2xl max-w-md w-full border border-white/20 shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-white/15 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-[#FFD400]" />
                <h3 className="font-bold text-sm uppercase tracking-wider font-mono text-white">
                  Confirm Taxonomy Deletion
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="text-white/60 hover:text-white p-1 rounded cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-white/90 leading-relaxed">
                Are you sure you want to delete the {deletingItem.type === "primary" ? "primary category" : deletingItem.type === "subcategory" ? "subcategory" : "equipment type"}{" "}
                <span className="font-bold text-white bg-black/30 px-2 py-0.5 rounded font-mono">
                  &ldquo;{deletingItem.name}&rdquo;
                </span>
                ?
              </p>

              {/* Safety notice */}
              <div className="p-3 bg-white/5 border border-white/15 rounded-xl text-[11px] text-white/80 space-y-1">
                <div className="font-bold text-[#FFD400] flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  <span>Database Dependency Guard Active</span>
                </div>
                <p>
                  DR.MEDEX safe deletion prevents accidental orphan records. Deletion will be rejected if any products or child records link to this item.
                </p>
              </div>

              {/* Rejection / Dependency explanation error */}
              {deleteError && (
                <div className="p-3.5 bg-[#C62828]/25 border border-[#C62828] rounded-xl text-xs text-red-100 flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-[#FF6B6B] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold text-white">Deletion Blocked:</div>
                    <div className="leading-relaxed text-[11px] text-white/90">{deleteError}</div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  disabled={isSubmittingDelete}
                  className="px-5 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md"
                >
                  {isSubmittingDelete && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Confirm Delete</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
