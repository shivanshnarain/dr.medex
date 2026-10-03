import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Package,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Star,
  Flame,
  ArrowUpDown,
  RefreshCw,
  Archive,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { ProductEditorModal } from "../components/admin/ProductEditorModal";
import { DeleteProductModal } from "../components/admin/DeleteProductModal";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Product, Category } from "../types";

export const AdminProductsPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [selectedStatus, setSelectedStatus] = useState(searchParams.get("status") || "all");
  const [selectedStock, setSelectedStock] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Selection & Bulk State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Editor Modal State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        adminFetch("/api/admin/products?limit=500"),
        fetch("/api/categories")
      ]);

      if (prodRes.ok) {
        const pData = await prodRes.json();
        if (pData.success) {
          setProducts(pData.products || []);
        }
      }

      if (catRes.ok) {
        const cData = await catRes.json();
        if (cData.success) {
          setCategories(cData.categories || []);
        }
      }
    } catch (e) {
      console.error("Products load error:", e);
      setBannerMessage({ text: "Failed to load product catalogue.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.productName && p.productName.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.modelNumber && p.modelNumber.toLowerCase().includes(q)) ||
          (p.shortDescription && p.shortDescription.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (selectedCategory && selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Status filter
    if (selectedStatus && selectedStatus !== "all") {
      result = result.filter((p) => (p.status || "ACTIVE") === selectedStatus);
    }

    // Stock filter
    if (selectedStock === "in_stock") {
      result = result.filter((p) => (p.stock || 0) > 0);
    } else if (selectedStock === "out_of_stock") {
      result = result.filter((p) => (p.stock || 0) <= 0);
    } else if (selectedStock === "low_stock") {
      result = result.filter((p) => (p.stock || 0) > 0 && (p.stock || 0) <= (p.lowStockThreshold || 2));
    }

    // Sorting
    switch (sortBy) {
      case "title-asc":
        result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "title-desc":
        result.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
        break;
      case "price-low":
        result.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
        break;
      case "price-high":
        result.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
        break;
      case "stock-low":
        result.sort((a, b) => (a.stock || 0) - (b.stock || 0));
        break;
      case "stock-high":
        result.sort((a, b) => (b.stock || 0) - (a.stock || 0));
        break;
      default:
        // newest / default id sort
        break;
    }

    return result;
  }, [products, searchQuery, selectedCategory, selectedStatus, selectedStock, sortBy]);

  // Paginated slice
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Select all handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Actions
  const handleBulkAction = async (action: "publish" | "unpublish" | "archive" | "delete") => {
    if (selectedIds.length === 0) return;
    if (action === "delete" && !confirm(`Permanently delete ${selectedIds.length} selected products?`)) {
      return;
    }

    setIsBulkProcessing(true);
    try {
      const res = await adminFetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, productIds: selectedIds })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBannerMessage({ text: `Bulk ${action} executed successfully.`, type: "success" });
        setSelectedIds([]);
        fetchProducts();
      } else {
        setBannerMessage({ text: data.message || `Failed to execute bulk ${action}.`, type: "error" });
      }
    } catch {
      setBannerMessage({ text: "Error executing bulk action.", type: "error" });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Toggle Featured status
  const handleToggleFeatured = async (product: Product) => {
    const updatedFeatured = !product.isFeatured;
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFeatured: updatedFeatured, featured: updatedFeatured })
      });
      if (res.ok) {
        setProducts(
          products.map((p) =>
            p.id === product.id ? { ...p, isFeatured: updatedFeatured, featured: updatedFeatured } : p
          )
        );
      }
    } catch (e) {
      console.error("Toggle featured error:", e);
    }
  };

  // Toggle Bestseller status
  const handleToggleBestseller = async (product: Product) => {
    const updatedBestseller = !product.isBestSeller;
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBestSeller: updatedBestseller, bestseller: updatedBestseller })
      });
      if (res.ok) {
        setProducts(
          products.map((p) =>
            p.id === product.id ? { ...p, isBestSeller: updatedBestseller, bestseller: updatedBestseller } : p
          )
        );
      }
    } catch (e) {
      console.error("Toggle bestseller error:", e);
    }
  };

  // Toggle Status between ACTIVE and DRAFT
  const handleToggleStatus = async (product: Product) => {
    const newStatus = product.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setProducts(products.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p)));
        setBannerMessage({
          text: `Product "${product.title}" status changed to ${newStatus}.`,
          type: "success"
        });
      }
    } catch (e) {
      console.error("Toggle status error:", e);
    }
  };

  // Duplicate product
  const handleDuplicateProduct = async (product: Product) => {
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}/duplicate`, {
        method: "POST"
      });
      const data = await res.json();
      if (res.ok && data.success && data.product) {
        setProducts([data.product, ...products]);
        setBannerMessage({
          text: `Duplicated product created: "${data.product.title}" (SKU: ${data.product.sku})`,
          type: "success"
        });
        setEditingProduct(data.product);
        setIsEditorOpen(true);
      } else {
        setBannerMessage({ text: data.message || "Failed to duplicate product.", type: "error" });
      }
    } catch {
      setBannerMessage({ text: "Error creating duplicate product record.", type: "error" });
    }
  };

  // Soft Archive Product
  const handleConfirmArchive = async (product: Product) => {
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}`, {
        method: "DELETE" // defaults to soft archive
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(
          products.map((p) => (p.id === product.id ? { ...p, status: "ARCHIVED" as const } : p))
        );
        setBannerMessage({
          text: `Product "${product.title}" successfully archived.`,
          type: "success"
        });
      } else {
        setBannerMessage({ text: data.message || "Failed to archive product.", type: "error" });
      }
    } catch {
      setBannerMessage({ text: "Error archiving product record.", type: "error" });
    }
  };

  // Permanent Delete Product
  const handleConfirmPermanentDelete = async (product: Product) => {
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}?permanent=true`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.archived) {
          setProducts(
            products.map((p) => (p.id === product.id ? { ...p, status: "ARCHIVED" as const } : p))
          );
          setBannerMessage({
            text: data.message || "Product archived because historical orders reference this SKU.",
            type: "success"
          });
        } else {
          setProducts(products.filter((p) => p.id !== product.id));
          setBannerMessage({
            text: `Product "${product.title}" permanently removed from database.`,
            type: "success"
          });
        }
      } else {
        setBannerMessage({ text: data.message || "Failed to delete product.", type: "error" });
      }
    } catch {
      setBannerMessage({ text: "Error deleting product record.", type: "error" });
    }
  };

  return (
    <AdminLayout
      title="Catalogue & Equipment Management"
      subtitle={`Manage all ${products.length} surgical, therapy, and clinical equipment units`}
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchProducts}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#EAEAEA] rounded-lg text-xs font-semibold text-[#111111] bg-white hover:bg-[#FAFAFA] transition-colors shadow-2xs"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Sync</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Create Product</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Banner Alert */}
        {bannerMessage && (
          <div
            className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
              bannerMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMessage.type === "success" ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <AlertCircle size={16} className="text-red-600" />
              )}
              <span>{bannerMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="lg:col-span-2 relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Search size={16} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search products by title, SKU, model..."
                className="w-full pl-10 pr-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 bg-white capitalize"
              >
                <option value="all">All Categories ({products.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option value="newest">Sort: Catalog Order</option>
                <option value="title-asc">Title: A → Z</option>
                <option value="title-desc">Title: Z → A</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="stock-low">Stock: Low to High</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Counters & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <span>Showing <strong>{filteredProducts.length}</strong> of {products.length} products</span>
              {selectedIds.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold font-mono">
                  {selectedIds.length} Selected
                </span>
              )}
            </div>

            {(searchQuery || selectedCategory !== "all" || selectedStatus !== "all" || selectedStock !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setSelectedStatus("all");
                  setSelectedStock("all");
                  setCurrentPage(1);
                }}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X size={12} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar (Visible when items selected) */}
        {selectedIds.length > 0 && (
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span>Selected {selectedIds.length} items:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("publish")}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
              >
                Publish Selected
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("unpublish")}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
              >
                Unpublish (Draft)
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("archive")}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
              >
                Archive Selected
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("delete")}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-600 rounded-lg text-xs font-bold disabled:opacity-50 transition-colors"
              >
                Delete Selected
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Products Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-3xs tracking-wider">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={
                        paginatedProducts.length > 0 &&
                        paginatedProducts.every((p) => selectedIds.includes(p.id))
                      }
                      className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                    />
                  </th>
                  <th className="p-4">Equipment Details</th>
                  <th className="p-4">SKU / Model</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Pricing (USD)</th>
                  <th className="p-4">Stock</th>
                  <th className="p-4">Badges</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400">
                      <Package size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-bold text-slate-600">No medical products found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or category filters.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? "bg-red-50/30" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(p.id)}
                            className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                          />
                        </td>

                        {/* Product Details & Primary Thumbnail */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 relative group">
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
                              {p.images && p.images.length > 1 && (
                                <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 text-white text-3xs font-mono font-bold">
                                  +{p.images.length - 1}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 max-w-xs sm:max-w-sm">
                              <h4 className="font-bold text-slate-900 truncate hover:text-red-600 transition-colors">
                                {p.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5 text-3xs text-slate-400">
                                <span>Brand: <strong className="text-red-600 font-bold">{p.brand}</strong></span>
                                <span>•</span>
                                <Link
                                  to={`/product/${p.slug}`}
                                  target="_blank"
                                  className="text-[#111111] hover:text-[#1F7A4D] hover:underline flex items-center gap-0.5"
                                >
                                  <span>View Live</span>
                                  <ExternalLink size={10} />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* SKU / Model */}
                        <td className="p-4 font-mono text-2xs">
                          <div className="font-bold text-slate-900">{p.sku}</div>
                          <div className="text-slate-400">{p.modelNumber || "—"}</div>
                        </td>

                        {/* Category */}
                        <td className="p-4">
                          <span className="px-2.5 py-1 rounded-full text-3xs font-semibold bg-slate-100 text-slate-700 capitalize">
                            {p.category}
                          </span>
                        </td>

                        {/* Pricing */}
                        <td className="p-4 font-mono text-xs">
                          <div className="font-bold text-slate-900">
                            ${(p.basePrice || 0).toLocaleString()}
                          </div>
                          {p.originalPrice && p.originalPrice > (p.basePrice || 0) && (
                            <div className="text-3xs text-slate-400 line-through">
                              ${p.originalPrice.toLocaleString()}
                            </div>
                          )}
                        </td>

                        {/* Stock */}
                        <td className="p-4 font-mono text-xs">
                          <div
                            className={`font-bold ${
                              (p.stock || 0) > 0 ? "text-emerald-700" : "text-red-600"
                            }`}
                          >
                            {p.stock ?? 0} units
                          </div>
                          <div className="text-3xs text-slate-400">
                            {(p.stock || 0) > 0 ? "In Stock" : "Out of Stock"}
                          </div>
                        </td>

                        {/* Badges: Featured / Bestseller */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleFeatured(p)}
                              title={p.isFeatured ? "Unmark Featured" : "Mark Featured"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                p.isFeatured
                                  ? "bg-amber-100 text-amber-700"
                                  : "text-slate-300 hover:text-amber-500"
                              }`}
                            >
                              <Star size={14} fill={p.isFeatured ? "currentColor" : "none"} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleBestseller(p)}
                              title={p.isBestSeller ? "Unmark Bestseller" : "Mark Bestseller"}
                              className={`p-1.5 rounded-lg transition-colors ${
                                p.isBestSeller
                                  ? "bg-red-100 text-red-700"
                                  : "text-slate-300 hover:text-red-500"
                              }`}
                            >
                              <Flame size={14} fill={p.isBestSeller ? "currentColor" : "none"} />
                            </button>
                          </div>
                        </td>

                        {/* Status Toggle Badge */}
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(p)}
                            title="Click to toggle status"
                            className={`px-2.5 py-1 rounded-full text-3xs font-extrabold cursor-pointer transition-all ${
                              p.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                : p.status === "DRAFT"
                                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            {p.status || "ACTIVE"}
                          </button>
                        </td>

                        {/* Action buttons */}
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(p);
                                setIsEditorOpen(true);
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicateProduct(p)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Duplicate Product"
                            >
                              <Copy size={14} />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDeletingProduct(p);
                                setIsDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Archive or Delete"
                            >
                              <Trash2 size={14} />
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-500 font-medium">
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredProducts.length} total products)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 font-semibold flex items-center gap-1"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </button>

                {/* Page Jump buttons */}
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg font-bold text-xs ${
                        currentPage === pageNum
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-50 font-semibold flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Editor Modal */}
      <ProductEditorModal
        product={editingProduct}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSaved={() => {
          fetchProducts();
        }}
        categories={categories}
      />

      {/* Delete / Archive Confirmation Modal */}
      <DeleteProductModal
        product={deletingProduct}
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirmArchive={handleConfirmArchive}
        onConfirmPermanentDelete={handleConfirmPermanentDelete}
      />
    </AdminLayout>
  );
};
