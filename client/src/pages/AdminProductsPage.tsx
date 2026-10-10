import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
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
  Star,
  RefreshCw,
  Archive,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Layers,
  ShieldAlert
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { DeleteProductModal } from "../components/admin/DeleteProductModal";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Product, Category } from "../types";

export const AdminProductsPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        adminFetch("/api/admin/products?limit=500"),
        fetch("/api/categories?includeInactive=true")
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
      setBannerMessage({ text: "Failed to load product catalogue records.", type: "error" });
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

    // Category filter (includes inactive category for admin)
    if (selectedCategory && selectedCategory !== "all") {
      result = result.filter((p) => p.category === selectedCategory);
    }

    // Status filter
    if (selectedStatus && selectedStatus !== "all") {
      result = result.filter((p) => (p.status || "ACTIVE") === selectedStatus);
    }

    // Stock filter
    if (selectedStock !== "all") {
      if (selectedStock === "in_stock") {
        result = result.filter((p) => p.stock > 0);
      } else if (selectedStock === "out_of_stock") {
        result = result.filter((p) => p.stock <= 0);
      } else if (selectedStock === "low_stock") {
        result = result.filter((p) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5));
      }
    }

    // Sort
    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
        break;
      case "name_asc":
        result.sort((a, b) => (a.title || a.productName || "").localeCompare(b.title || b.productName || ""));
        break;
      case "name_desc":
        result.sort((a, b) => (b.title || b.productName || "").localeCompare(a.title || a.productName || ""));
        break;
      case "stock_asc":
        result.sort((a, b) => a.stock - b.stock);
        break;
      case "stock_desc":
        result.sort((a, b) => b.stock - a.stock);
        break;
      default:
        // newest default
        break;
    }

    return result;
  }, [products, searchQuery, selectedCategory, selectedStatus, selectedStock, sortBy]);

  // Paginated Products
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(paginatedProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const res = await adminFetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, action })
      });
      if (res.ok) {
        const data = await res.json();
        setBannerMessage({ text: `Bulk ${action} applied to ${data.affectedCount} items.`, type: "success" });
        setSelectedIds([]);
        fetchProducts();
      }
    } catch (e) {
      console.error("Bulk action failed:", e);
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handlePriceSync = async (prod: Product) => {
    setSyncingId(prod.id);
    try {
      const res = await adminFetch(`/api/admin/products/${prod.id}/sync-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyToSelling: true })
      });
      const data = await res.json();
      if (data.success) {
        setBannerMessage({
          text: `Synchronized price for ${prod.title || prod.productName}: ₹${data.referencePricing?.referenceSaleINR?.toLocaleString() || data.product?.basePrice?.toLocaleString()}`,
          type: "success"
        });
        fetchProducts();
      } else {
        setBannerMessage({
          text: data.message || "No verified public reference price available.",
          type: "error"
        });
      }
    } catch (e) {
      console.error("Price sync error:", e);
    } finally {
      setSyncingId(null);
    }
  };

  const handleConfirmArchive = async (prod: Product) => {
    try {
      const res = await adminFetch(`/api/admin/products/${prod.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setBannerMessage({ text: `Product "${prod.title || prod.productName}" archived successfully.`, type: "success" });
        fetchProducts();
      }
    } catch (e) {
      console.error("Archive error:", e);
    }
  };

  const handleConfirmPermanentDelete = async (prod: Product) => {
    try {
      const res = await adminFetch(`/api/admin/products/${prod.id}?permanent=true`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setBannerMessage({ text: `Product permanently removed.`, type: "success" });
        fetchProducts();
      }
    } catch (e) {
      console.error("Permanent delete error:", e);
    }
  };

  return (
    <AdminLayout
      title="All Catalogue Products"
      subtitle="Comprehensive medical equipment repository with verified specifications, inventory, and pricing"
      breadcrumbs={[{ label: "Products" }]}
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchProducts}
            className="px-4 py-2 bg-white border border-[#CCCCCC] hover:border-black text-black rounded-lg text-xs font-bold flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/products/new"
            className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add Product</span>
          </Link>
        </div>
      }
    >
      {/* Banner */}
      {bannerMessage && (
        <div className="mb-6 p-4 rounded-xl border border-neutral-400 bg-neutral-100 text-xs font-semibold flex items-center justify-between text-black">
          <div className="flex items-center gap-2.5">
            {bannerMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{bannerMessage.text}</span>
          </div>
          <button type="button" onClick={() => setBannerMessage(null)} className="text-neutral-500 hover:text-black">
            ✕
          </button>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5E5E5] space-y-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search size={15} className="absolute left-3.5 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Product Title, SKU, Model, or Summary..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-[#E5E5E5] rounded-xl text-xs font-medium text-black focus:outline-none focus:border-black transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-neutral-400 hover:text-black"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Stats in Toolbar */}
          <div className="flex items-center gap-2 text-xs font-mono text-neutral-600">
            <span className="font-bold text-black">{filteredProducts.length}</span> of{" "}
            <span className="font-bold text-black">{products.length}</span> Products Listed
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-100">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-mono uppercase text-neutral-400">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-semibold text-black focus:outline-none focus:border-black transition-colors cursor-pointer"
            >
              <option value="all">All Categories (7)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name} {c.status === "INACTIVE" || c.active === false ? "(Inactive)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-mono uppercase text-neutral-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-semibold text-black focus:outline-none focus:border-black transition-colors cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active (Published)</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Stock Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-mono uppercase text-neutral-400">Stock:</span>
            <select
              value={selectedStock}
              onChange={(e) => {
                setSelectedStock(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-semibold text-black focus:outline-none focus:border-black transition-colors cursor-pointer"
            >
              <option value="all">All Inventory</option>
              <option value="in_stock">In Stock (&gt; 0)</option>
              <option value="low_stock">Low Stock (≤ 5)</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] font-bold font-mono uppercase text-neutral-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-semibold text-black focus:outline-none focus:border-black transition-colors cursor-pointer"
            >
              <option value="newest">Newest Added</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name_asc">Title: A to Z</option>
              <option value="name_desc">Title: Z to A</option>
              <option value="stock_desc">Highest Stock</option>
              <option value="stock_asc">Lowest Stock</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Strip (Appears when items are selected) */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-neutral-100 rounded-xl border border-neutral-300 flex items-center justify-between animate-in fade-in text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="font-bold text-black font-mono">{selectedIds.length}</span> items selected
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("publish")}
                className="px-3 py-1 bg-black text-white rounded text-xs hover:bg-neutral-800"
              >
                Publish Active
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("unpublish")}
                className="px-3 py-1 bg-white border border-neutral-400 text-black rounded text-xs hover:bg-neutral-200"
              >
                Set Draft
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("archive")}
                className="px-3 py-1 bg-white border border-neutral-400 text-black rounded text-xs hover:bg-neutral-200"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-neutral-500 hover:text-black ml-2"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Products Table */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-[#E5E5E5] text-[10px] font-bold font-mono uppercase text-neutral-500 tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-4">SKU / Model</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Price (INR)</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-neutral-400 text-xs">
                    No products matched your active filters or search terms.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const img = (p.images && p.images[0]) || p.primaryImage || "";
                  const isSelected = selectedIds.includes(p.id);

                  return (
                    <tr key={p.id} className={`hover:bg-neutral-50/70 transition-colors ${isSelected ? "bg-neutral-50" : ""}`}>
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(p.id)}
                          className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
                        />
                      </td>

                      {/* Details & Thumbnail */}
                      <td className="py-4 px-4 max-w-sm">
                        <div className="flex items-center gap-3.5">
                          <div className="w-12 h-12 rounded-lg bg-neutral-100 border border-neutral-200 shrink-0 overflow-hidden flex items-center justify-center p-1">
                            {img ? (
                              <img
                                src={img}
                                alt={p.title || p.productName}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=200&q=80";
                                }}
                              />
                            ) : (
                              <Package size={18} className="text-neutral-400" />
                            )}
                          </div>
                          <div className="truncate">
                            <Link
                              to={`/admin/products/${p.id}/edit`}
                              className="font-bold text-black hover:underline text-xs sm:text-sm line-clamp-1"
                              title={p.title || p.productName}
                            >
                              {p.title || p.productName}
                            </Link>
                            <div className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                              {p.shortDescription || p.overview || "Certified medical equipment"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU / Model */}
                      <td className="py-4 px-4 font-mono text-neutral-600">
                        <div className="font-bold text-black">{p.sku || (p as any).SKU || "—"}</div>
                        <div className="text-[10px] text-neutral-400">{p.modelNumber || "Std Unit"}</div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4">
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-mono text-[11px] border border-neutral-200">
                          {p.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4 text-right font-mono">
                        <div className="font-bold text-black">
                          ₹{p.basePrice?.toLocaleString() || "—"}
                        </div>
                        {p.originalPrice && p.originalPrice > p.basePrice && (
                          <div className="text-[10px] line-through text-neutral-400">
                            ₹{p.originalPrice?.toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Stock */}
                      <td className="py-4 px-4 text-center font-mono">
                        <span
                          className={`font-bold ${
                            p.stock <= 0
                              ? "text-neutral-400"
                              : p.stock <= (p.lowStockThreshold || 5)
                              ? "text-neutral-800"
                              : "text-black"
                          }`}
                        >
                          {p.stock}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                            (p.status || "ACTIVE") === "ACTIVE"
                              ? "bg-black text-white"
                              : "bg-neutral-200 text-neutral-800"
                          }`}
                        >
                          {(p.status || "ACTIVE") === "ACTIVE" ? "Active" : p.status}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Sync Reference Price */}
                          <button
                            type="button"
                            onClick={() => handlePriceSync(p)}
                            disabled={syncingId === p.id}
                            title="Synchronize price with SKRILIX reference catalog"
                            className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-md transition-colors"
                          >
                            <RefreshCw size={13} className={syncingId === p.id ? "animate-spin" : ""} />
                          </button>

                          {/* View Product on Storefront */}
                          <Link
                            to={`/product/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View Public Storefront Listing"
                            className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-md transition-colors"
                          >
                            <ExternalLink size={13} />
                          </Link>

                          {/* Edit Product (Navigates to full page editor) */}
                          <Link
                            to={`/admin/products/${p.id}/edit`}
                            title="Edit Full Product Record"
                            className="px-2.5 py-1 bg-white border border-black hover:bg-neutral-100 text-black rounded-md text-xs font-bold transition-colors flex items-center gap-1"
                          >
                            <Edit2 size={11} />
                            <span>Edit</span>
                          </Link>

                          {/* Delete Action */}
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingProduct(p);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Archive or remove product"
                            className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 rounded-md transition-colors"
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

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[#E5E5E5] flex items-center justify-between text-xs bg-white">
            <span className="text-neutral-500 font-mono">
              Page {currentPage} of {totalPages} ({filteredProducts.length} items)
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg font-bold text-black hover:bg-neutral-100 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <ChevronLeft size={13} />
                <span>Previous</span>
              </button>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg font-bold text-black hover:bg-neutral-100 disabled:opacity-40 transition-colors flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Product Confirmation Modal */}
      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        product={deletingProduct}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingProduct(null);
        }}
        onConfirmArchive={handleConfirmArchive}
        onConfirmPermanentDelete={handleConfirmPermanentDelete}
      />
    </AdminLayout>
  );
};
