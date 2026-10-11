import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Download,
  Check,
  Clock,
  ChevronDown
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
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState("newest");

  // Review Status & Toggle Action States
  const [reviewUpdatingId, setReviewUpdatingId] = useState<string | null>(null);
  const [activeReviewPopoverId, setActiveReviewPopoverId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [activeActionsMenuId, setActiveActionsMenuId] = useState<string | null>(null);
  const [reviewModalProduct, setReviewModalProduct] = useState<Product | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState<string>("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Selection & Bulk State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Delete & Sync Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        adminFetch("/api/admin/products?limit=1000"),
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

  // Sync category query param
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && cat !== selectedCategory) {
      setSelectedCategory(cat);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Current Category Object
  const currentCategoryObj = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") return null;
    return categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory) || null;
  }, [categories, selectedCategory]);

  // Products belonging to the selected category (for dynamic header count and review count scope)
  const categoryScopedProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") {
      return products;
    }
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const categoryProductCount = categoryScopedProducts.length;

  // Live review counts scoped to the selected category
  const reviewCounts = useMemo(() => {
    return {
      all: categoryScopedProducts.length,
      correct: categoryScopedProducts.filter((p) => p.reviewStatus === "CORRECT").length,
      needsEditing: categoryScopedProducts.filter((p) => p.reviewStatus === "NEEDS_EDITING").length,
      pending: categoryScopedProducts.filter(
        (p) => !p.reviewStatus || p.reviewStatus === "PENDING" || p.reviewStatus === "NOT_YET_REVIEWED"
      ).length
    };
  }, [categoryScopedProducts]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...categoryScopedProducts];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) =>
          (p.title && p.title.toLowerCase().includes(q)) ||
          (p.productName && p.productName.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          ((p as any).SKU && (p as any).SKU.toLowerCase().includes(q)) ||
          (p.modelNumber && p.modelNumber.toLowerCase().includes(q)) ||
          (p.shortDescription && p.shortDescription.toLowerCase().includes(q)) ||
          (p.overview && p.overview.toLowerCase().includes(q))
      );
    }

    // Publication Status filter (ACTIVE, INACTIVE, DRAFT, ARCHIVED)
    if (selectedStatus && selectedStatus !== "all") {
      result = result.filter((p) => (p.status || "ACTIVE") === selectedStatus);
    }

    // Review Status filter (Decoupled from publication status)
    if (selectedReviewStatus !== "all") {
      if (selectedReviewStatus === "CORRECT") {
        result = result.filter((p) => p.reviewStatus === "CORRECT");
      } else if (selectedReviewStatus === "NEEDS_EDITING") {
        result = result.filter((p) => p.reviewStatus === "NEEDS_EDITING");
      } else if (selectedReviewStatus === "PENDING") {
        result = result.filter(
          (p) => !p.reviewStatus || p.reviewStatus === "PENDING" || p.reviewStatus === "NOT_YET_REVIEWED"
        );
      }
    }

    // Sorting
    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
        break;
      case "name_asc":
        result.sort((a, b) =>
          (a.title || a.productName || "").localeCompare(b.title || b.productName || "")
        );
        break;
      case "name_desc":
        result.sort((a, b) =>
          (b.title || b.productName || "").localeCompare(a.title || a.productName || "")
        );
        break;
      default:
        // Default: newest / recently updated
        result.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        break;
    }

    return result;
  }, [categoryScopedProducts, searchQuery, selectedStatus, selectedReviewStatus, sortBy]);

  // Paginated Products
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

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

  /**
   * Toggle Active / Inactive Publication Status Switch
   * Strictly decoupled from Review Status
   */
  const handleToggleProductStatus = async (product: Product) => {
    const currentStatus = product.status || "ACTIVE";
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusUpdatingId(product.id);

    // Optimistic UI update
    const previousProducts = products;
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
    );

    try {
      const res = await adminFetch(`/api/admin/products/${product.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, ...data.product } : p))
        );
        setBannerMessage({
          text: `"${product.title || product.productName}" status changed to ${nextStatus === "ACTIVE" ? "Active" : "Inactive"}.`,
          type: "success"
        });
      } else {
        // Roll back on failure
        setProducts(previousProducts);
        setBannerMessage({ text: data.message || "Failed to update product status.", type: "error" });
      }
    } catch (err: any) {
      setProducts(previousProducts);
      setBannerMessage({ text: err.message || "Network error updating status.", type: "error" });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  /**
   * Set Review Status (CORRECT, NEEDS_EDITING, PENDING)
   * Strictly decoupled from Publication Status
   */
  const handleSetReviewStatus = async (
    product: Product,
    status: "CORRECT" | "NEEDS_EDITING" | "PENDING",
    note?: string
  ) => {
    if (reviewUpdatingId === product.id) return;
    setReviewUpdatingId(product.id);
    setActiveReviewPopoverId(null);

    const previousProducts = products;
    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id
          ? {
              ...p,
              reviewStatus: status,
              reviewNote: note !== undefined ? note : status === "CORRECT" ? null : p.reviewNote
            }
          : p
      )
    );

    try {
      const res = await adminFetch(`/api/admin/products/${product.id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: status, reviewNote: note })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, ...data.product } : p))
        );
        setBannerMessage({
          text:
            status === "CORRECT"
              ? `✓ "${product.title || product.productName}" verified as Correct.`
              : status === "NEEDS_EDITING"
              ? `✕ "${product.title || product.productName}" marked as Needs Editing.`
              : `Review status reset to Not Yet Reviewed for "${product.title || product.productName}".`,
          type: "success"
        });
      } else {
        // Roll back on failure
        setProducts(previousProducts);
        setBannerMessage({ text: data.message || "Failed to update review status.", type: "error" });
      }
    } catch (err: any) {
      setProducts(previousProducts);
      setBannerMessage({ text: err.message || "Network error updating review status.", type: "error" });
    } finally {
      setReviewUpdatingId(null);
    }
  };

  /**
   * Download real ZIP package containing product-details.json, product-details.csv, README.txt, and images/
   */
  const handleDownloadPackage = async (product: Product) => {
    if (downloadingId) return;
    setDownloadingId(product.id);
    setBannerMessage({
      text: `Compiling complete download package for "${product.title || product.productName}"...`,
      type: "success"
    });
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}/download-package`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Export failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      let filename = `DR-MEDEX-${product.slug || product.sku || "product"}.zip`;
      if (disposition) {
        const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
        if (match && match[1]) filename = match[1];
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      setBannerMessage({ text: `Product ZIP package downloaded: ${filename}`, type: "success" });
    } catch (err: any) {
      console.error("Export download error:", err);
      setBannerMessage({ text: err.message || "Failed to download product package.", type: "error" });
    } finally {
      setDownloadingId(null);
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
          text: `Synchronized price for ${prod.title || prod.productName}: ₹${
            data.referencePricing?.referenceSaleINR?.toLocaleString("en-IN") ||
            data.product?.basePrice?.toLocaleString("en-IN")
          }`,
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
        setBannerMessage({
          text: `Product "${prod.title || prod.productName}" archived successfully.`,
          type: "success"
        });
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

  // Pagination display calculation
  const startProductNumber = filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endProductNumber = Math.min(currentPage * itemsPerPage, filteredProducts.length);

  return (
    <AdminLayout
      title={currentCategoryObj ? currentCategoryObj.name : "Products"}
      subtitle={
        currentCategoryObj
          ? `${categoryProductCount} products · Manage all products in this category`
          : `${products.length} products · Manage all products across all categories`
      }
      breadcrumbs={[
        { label: "Products", href: "/admin/products" },
        ...(currentCategoryObj ? [{ label: currentCategoryObj.name }] : [])
      ]}
      actions={
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={fetchProducts}
            className="px-3.5 py-2 bg-white border border-[#E5E5E5] hover:border-black text-black rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            to="/admin/products/new"
            className="px-4 py-2 bg-[#F2C94C] hover:bg-[#E5BE42] text-black rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Add Product</span>
          </Link>
        </div>
      }
    >
      {/* Banner Notifications */}
      {bannerMessage && (
        <div className="mb-6 p-4 rounded-xl border border-[#E5E5E5] bg-[#FFF8DB] text-xs font-semibold flex items-center justify-between text-black shadow-2xs">
          <div className="flex items-center gap-2.5">
            {bannerMessage.type === "success" ? (
              <CheckCircle2 size={16} className="text-[#15803D]" />
            ) : (
              <AlertCircle size={16} className="text-[#B91C1C]" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-[#666666] hover:text-black p-1 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Prominent Category Header Card */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-5 mb-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#666666] mb-1">
              <span>Category View</span>
              <span>•</span>
              <span className="text-black font-semibold">
                {selectedCategory === "all" ? "Catalogue-Wide" : currentCategoryObj?.name || selectedCategory}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
              {selectedCategory === "all" ? "All Catalogue Products" : currentCategoryObj?.name || "Category Products"}
            </h2>
            <p className="text-xs text-[#666666] mt-1 font-medium">
              <span className="font-bold text-black font-mono">{categoryProductCount}</span> products · Manage all
              products in this category
            </p>
          </div>

          {/* Category Dropdown Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-mono uppercase text-[#666666] hidden sm:inline">
              Category:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSearchParams(e.target.value === "all" ? {} : { category: e.target.value });
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs font-bold text-black focus:outline-none focus:border-[#F2C94C] cursor-pointer"
            >
              <option value="all">All Categories ({products.length})</option>
              {categories.map((c) => {
                const count = products.filter((p) => p.category === c.slug || p.category === c.id).length;
                return (
                  <option key={c.id} value={c.slug}>
                    {c.name} ({count}) {c.status === "INACTIVE" || c.active === false ? "— Inactive" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Category Navigation Pills for Quick Switching */}
        <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setSearchParams({});
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              selectedCategory === "all"
                ? "bg-black text-white"
                : "bg-neutral-50 text-neutral-700 hover:bg-[#FFF8DB] hover:text-black border border-transparent hover:border-[#F2C94C]/40"
            }`}
          >
            <span>All Categories</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                selectedCategory === "all" ? "bg-neutral-800 text-white" : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {products.length}
            </span>
          </button>

          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat.slug || p.category === cat.id).length;
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  setSearchParams({ category: cat.slug });
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-[#FFF8DB] text-black border border-[#F2C94C] shadow-2xs font-bold"
                    : "bg-white text-neutral-700 hover:bg-neutral-50 border border-[#E5E5E5]"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    isSelected ? "bg-[#F2C94C] text-black font-bold" : "bg-neutral-100 text-[#666666]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-5 rounded-xl border border-[#E5E5E5] space-y-4 mb-6 shadow-2xs">
        {/* Review Status Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold font-mono uppercase text-[#666666]">Review Filter:</span>

            <button
              type="button"
              onClick={() => {
                setSelectedReviewStatus("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedReviewStatus === "all"
                  ? "bg-black text-white border-black shadow-xs"
                  : "bg-white text-neutral-700 border-[#E5E5E5] hover:border-black"
              }`}
            >
              <span>All Products</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  selectedReviewStatus === "all" ? "bg-neutral-800 text-white" : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {reviewCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedReviewStatus("CORRECT");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedReviewStatus === "CORRECT"
                  ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC] shadow-xs font-bold"
                  : "bg-white text-neutral-700 border-[#E5E5E5] hover:border-[#15803D]"
              }`}
            >
              <Check size={12} className="stroke-[2.5]" />
              <span>Correct</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  selectedReviewStatus === "CORRECT" ? "bg-[#BBF7D0] text-[#15803D]" : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {reviewCounts.correct}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedReviewStatus("NEEDS_EDITING");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedReviewStatus === "NEEDS_EDITING"
                  ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] shadow-xs font-bold"
                  : "bg-white text-neutral-700 border-[#E5E5E5] hover:border-[#B91C1C]"
              }`}
            >
              <X size={12} className="stroke-[2.5]" />
              <span>Needs Editing</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  selectedReviewStatus === "NEEDS_EDITING" ? "bg-[#FECACA] text-[#B91C1C]" : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {reviewCounts.needsEditing}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedReviewStatus("PENDING");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedReviewStatus === "PENDING"
                  ? "bg-[#FFF8DB] text-black border-[#F2C94C] shadow-xs font-bold"
                  : "bg-white text-neutral-700 border-[#E5E5E5] hover:border-black"
              }`}
            >
              <Clock size={12} />
              <span>Not Yet Reviewed</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  selectedReviewStatus === "PENDING" ? "bg-[#F2C94C] text-black" : "bg-neutral-100 text-neutral-700"
                }`}
              >
                {reviewCounts.pending}
              </span>
            </button>
          </div>

          {selectedReviewStatus !== "all" && (
            <button
              type="button"
              onClick={() => {
                setSelectedReviewStatus("all");
                setCurrentPage(1);
              }}
              className="text-[11px] text-[#666666] hover:text-black underline font-mono cursor-pointer"
            >
              Reset review filter
            </button>
          )}
        </div>

        {/* Search Field & Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Search size={15} className="absolute left-3.5 top-3 text-[#666666]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Product Name, Title, SKU, Model, or Summary..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-[#E5E5E5] rounded-xl text-xs font-medium text-black focus:outline-none focus:border-black transition-colors placeholder:text-[#666666]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3 text-[#666666] hover:text-black cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Publication Status Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono uppercase text-[#666666]">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-semibold text-black focus:outline-none focus:border-black cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active (Published)</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-mono uppercase text-[#666666]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-semibold text-black focus:outline-none focus:border-black cursor-pointer"
              >
                <option value="newest">Newest Added</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Title: A to Z</option>
                <option value="name_desc">Title: Z to A</option>
              </select>
            </div>

            {/* Count indicator */}
            <div className="text-xs font-mono text-[#666666] pl-2 border-l border-neutral-200">
              <span className="font-bold text-black">{filteredProducts.length}</span> listed
            </div>
          </div>
        </div>

        {/* Bulk Action Strip */}
        {selectedIds.length > 0 && (
          <div className="p-3 bg-neutral-50 rounded-xl border border-[#E5E5E5] flex items-center justify-between text-xs font-semibold animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="font-bold text-black font-mono">{selectedIds.length}</span> products selected
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("publish")}
                className="px-3 py-1 bg-black text-white rounded text-xs hover:bg-neutral-800 cursor-pointer"
              >
                Set Active
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("unpublish")}
                className="px-3 py-1 bg-white border border-neutral-300 text-black rounded text-xs hover:bg-neutral-100 cursor-pointer"
              >
                Set Inactive
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("archive")}
                className="px-3 py-1 bg-white border border-neutral-300 text-black rounded text-xs hover:bg-neutral-100 cursor-pointer"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-[#666666] hover:text-black ml-2 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Product Table — Exact 7 Columns */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-[#E5E5E5] text-[10px] font-bold font-mono uppercase text-[#666666] tracking-wider">
              <tr>
                {/* 1. Selection Checkbox */}
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
                  />
                </th>

                {/* 2. Product Details */}
                <th className="py-3.5 px-4 min-w-[280px]">Product Details</th>

                {/* 3. SKU / Model */}
                <th className="py-3.5 px-4 min-w-[140px]">SKU / Model</th>

                {/* 4. Price (INR) */}
                <th className="py-3.5 px-4 text-right min-w-[120px]">Price (INR)</th>

                {/* 5. Status */}
                <th className="py-3.5 px-4 text-center min-w-[120px]">Status</th>

                {/* 6. Review Status */}
                <th className="py-3.5 px-4 text-center min-w-[150px]">Review Status</th>

                {/* 7. Actions */}
                <th className="py-3.5 px-6 text-right min-w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#666666] text-xs">
                    No products matched your active filters or search terms.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const img = (p.images && p.images[0]) || p.primaryImage || "";
                  const isSelected = selectedIds.includes(p.id);
                  const isActive = (p.status || "ACTIVE") === "ACTIVE";

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-neutral-50/70 transition-colors ${isSelected ? "bg-neutral-50" : ""}`}
                    >
                      {/* 1. Selection Checkbox */}
                      <td className="py-4 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(p.id)}
                          className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
                        />
                      </td>

                      {/* 2. Product Details: Thumbnail, Complete Name, Subtitle */}
                      <td className="py-4 px-4 max-w-md">
                        <div className="flex items-start gap-3.5">
                          <div className="w-14 h-14 rounded-lg bg-neutral-50 border border-[#E5E5E5] shrink-0 overflow-hidden flex items-center justify-center p-1">
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
                              <Package size={20} className="text-[#666666]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            {/* Complete product name/title without unnecessary truncation */}
                            <Link
                              to={`/admin/products/${p.id}/edit`}
                              className="font-bold text-black hover:underline text-xs sm:text-sm break-words whitespace-normal leading-snug block"
                              title={p.title || p.productName}
                            >
                              {p.title || p.productName}
                            </Link>
                            <div className="text-[11px] text-[#666666] mt-0.5 break-words whitespace-normal line-clamp-2">
                              {p.shortDescription || p.overview || "High-precision medical instrumentation"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. SKU / Model */}
                      <td className="py-4 px-4 font-mono">
                        <div className="font-bold text-black text-xs">{p.sku || (p as any).SKU || "—"}</div>
                        <div className="text-[11px] text-[#666666] mt-0.5">
                          {p.modelNumber && p.modelNumber !== "—" ? p.modelNumber : "Std Unit"}
                        </div>
                      </td>

                      {/* 4. Price (INR) with Indian conventions */}
                      <td className="py-4 px-4 text-right font-mono">
                        <div className="font-bold text-black text-xs sm:text-sm">
                          ₹
                          {Number(p.basePrice || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </div>
                        {p.originalPrice && p.originalPrice > (p.basePrice || 0) && (
                          <div className="text-[10px] line-through text-[#666666]">
                            ₹
                            {Number(p.originalPrice).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </div>
                        )}
                      </td>

                      {/* 5. Status: Functional Toggle Switch */}
                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={isActive}
                            disabled={statusUpdatingId === p.id}
                            onClick={() => handleToggleProductStatus(p)}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F2C94C] focus:ring-offset-1 ${
                              isActive ? "bg-[#10B981]" : "bg-[#D1D5DB]"
                            } ${statusUpdatingId === p.id ? "opacity-60 cursor-not-allowed" : ""}`}
                            title={
                              isActive
                                ? "Product is Active (click to switch Inactive)"
                                : "Product is Inactive (click to switch Active)"
                            }
                          >
                            <span
                              aria-hidden="true"
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                isActive ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                          <span
                            onClick={() => !statusUpdatingId && handleToggleProductStatus(p)}
                            className={`text-xs font-semibold cursor-pointer select-none ${
                              isActive ? "text-[#15803D]" : "text-[#B91C1C]"
                            }`}
                          >
                            {statusUpdatingId === p.id ? "Saving..." : isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>

                      {/* 6. Review Status: Clickable Badge with Popover */}
                      <td className="py-4 px-4 text-center relative">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReviewPopoverId(activeReviewPopoverId === p.id ? null : p.id)
                            }
                            disabled={reviewUpdatingId === p.id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                              p.reviewStatus === "CORRECT"
                                ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC] hover:bg-[#BBF7D0]"
                                : p.reviewStatus === "NEEDS_EDITING"
                                ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] hover:bg-[#FECACA]"
                                : "bg-[#F5F5F5] text-[#666666] border-[#E5E5E5] hover:bg-neutral-200"
                            }`}
                            title="Click to change review status"
                          >
                            {reviewUpdatingId === p.id ? (
                              <RefreshCw size={12} className="animate-spin text-current" />
                            ) : p.reviewStatus === "CORRECT" ? (
                              <Check size={12} className="stroke-[2.5]" />
                            ) : p.reviewStatus === "NEEDS_EDITING" ? (
                              <X size={12} className="stroke-[2.5]" />
                            ) : (
                              <Clock size={12} />
                            )}

                            <span>
                              {p.reviewStatus === "CORRECT"
                                ? "Correct"
                                : p.reviewStatus === "NEEDS_EDITING"
                                ? "Needs Editing"
                                : "Not Yet Reviewed"}
                            </span>
                            <ChevronDown size={11} className="opacity-60" />
                          </button>

                          {/* Review Note indicator if present */}
                          {p.reviewStatus === "NEEDS_EDITING" && p.reviewNote && (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewModalProduct(p);
                                setReviewNoteInput(p.reviewNote || "");
                              }}
                              title={`Review Note: "${p.reviewNote}". Click to edit note.`}
                              className="mt-1 block mx-auto max-w-[130px] truncate text-[10px] text-[#B91C1C] font-mono bg-[#FEF2F2] px-1.5 py-0.5 rounded border border-[#FECACA] hover:underline cursor-pointer"
                            >
                              "{p.reviewNote}"
                            </button>
                          )}

                          {/* Popover containing all three options */}
                          {activeReviewPopoverId === p.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setActiveReviewPopoverId(null)}
                              />
                              <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 mt-1.5 w-48 bg-white rounded-xl shadow-lg border border-[#E5E5E5] py-1.5 z-50 animate-in fade-in zoom-in-95">
                                <div className="px-3 py-1 text-[10px] font-bold font-mono uppercase text-[#666666] border-b border-neutral-100 mb-1">
                                  Set Review Status
                                </div>

                                {/* Option 1: Correct */}
                                <button
                                  type="button"
                                  onClick={() => handleSetReviewStatus(p, "CORRECT")}
                                  className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-[#F0FDF4] transition-colors cursor-pointer ${
                                    p.reviewStatus === "CORRECT"
                                      ? "text-[#15803D] font-bold bg-[#DCFCE7]/40"
                                      : "text-neutral-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 text-[#15803D]">
                                    <div className="w-5 h-5 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                                      <Check size={12} className="stroke-[2.5]" />
                                    </div>
                                    <span>Correct</span>
                                  </div>
                                  {p.reviewStatus === "CORRECT" && (
                                    <Check size={12} className="text-[#15803D]" />
                                  )}
                                </button>

                                {/* Option 2: Needs Editing */}
                                <button
                                  type="button"
                                  onClick={() => handleSetReviewStatus(p, "NEEDS_EDITING")}
                                  className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-[#FEF2F2] transition-colors cursor-pointer ${
                                    p.reviewStatus === "NEEDS_EDITING"
                                      ? "text-[#B91C1C] font-bold bg-[#FEE2E2]/40"
                                      : "text-neutral-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 text-[#B91C1C]">
                                    <div className="w-5 h-5 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                                      <X size={12} className="stroke-[2.5]" />
                                    </div>
                                    <span>Needs Editing</span>
                                  </div>
                                  {p.reviewStatus === "NEEDS_EDITING" && (
                                    <Check size={12} className="text-[#B91C1C]" />
                                  )}
                                </button>

                                {/* Option 3: Not Yet Reviewed */}
                                <button
                                  type="button"
                                  onClick={() => handleSetReviewStatus(p, "PENDING")}
                                  className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer ${
                                    !p.reviewStatus || p.reviewStatus === "PENDING"
                                      ? "text-black font-bold bg-neutral-100"
                                      : "text-neutral-600"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 text-[#666666]">
                                    <div className="w-5 h-5 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                                      <Clock size={12} />
                                    </div>
                                    <span>Not Yet Reviewed</span>
                                  </div>
                                  {(!p.reviewStatus || p.reviewStatus === "PENDING") && (
                                    <Check size={12} className="text-black" />
                                  )}
                                </button>

                                {p.reviewStatus === "NEEDS_EDITING" && (
                                  <div className="pt-1 mt-1 border-t border-neutral-100 px-3">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveReviewPopoverId(null);
                                        setReviewModalProduct(p);
                                        setReviewNoteInput(p.reviewNote || "");
                                      }}
                                      className="text-[11px] text-[#B91C1C] hover:underline font-semibold block py-1 cursor-pointer"
                                    >
                                      {p.reviewNote ? "✎ Edit review note" : "+ Add review note"}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>

                      {/* 7. Actions: 1. Download Product, 2. More Actions, 3. Edit Product */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* 1. Download Product */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPackage(p)}
                            disabled={downloadingId === p.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E5E5E5] hover:border-black hover:bg-[#FFF8DB] text-black rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                            title={`Download complete ZIP package for ${p.title || p.productName}`}
                          >
                            <Download
                              size={13}
                              className={downloadingId === p.id ? "animate-bounce text-[#F2C94C]" : "text-black"}
                            />
                            <span>{downloadingId === p.id ? "Exporting..." : "Download"}</span>
                          </button>

                          {/* 2. More Actions */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveActionsMenuId(activeActionsMenuId === p.id ? null : p.id)
                              }
                              className="p-1.5 text-[#666666] hover:text-black hover:bg-neutral-100 rounded-lg transition-colors border border-transparent hover:border-[#E5E5E5] cursor-pointer"
                              title="More Actions"
                            >
                              <SlidersHorizontal size={14} />
                            </button>

                            {activeActionsMenuId === p.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveActionsMenuId(null)}
                                />
                                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-xl shadow-lg border border-[#E5E5E5] py-1 z-50 text-left animate-in fade-in zoom-in-95">
                                  <Link
                                    to={`/product/${p.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setActiveActionsMenuId(null)}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-black"
                                  >
                                    <ExternalLink size={13} />
                                    <span>View Storefront</span>
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionsMenuId(null);
                                      handlePriceSync(p);
                                    }}
                                    disabled={syncingId === p.id}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-black cursor-pointer"
                                  >
                                    <RefreshCw size={13} className={syncingId === p.id ? "animate-spin" : ""} />
                                    <span>Sync Ref Price</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionsMenuId(null);
                                      setDeletingProduct(p);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer border-t border-neutral-100 mt-1"
                                  >
                                    <Trash2 size={13} />
                                    <span>Archive / Delete</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* 3. Edit Product */}
                          <Link
                            to={`/admin/products/${p.id}/edit`}
                            title="Edit product in full-page editor"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Bar */}
        <div className="px-6 py-4 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-white">
          <span className="text-[#666666] font-mono">
            Showing {startProductNumber}–{endProductNumber} of {filteredProducts.length} products
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg font-bold text-black hover:bg-neutral-50 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={13} />
                <span>Previous</span>
              </button>

              <span className="px-2 font-mono font-bold text-black">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg font-bold text-black hover:bg-neutral-50 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
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

      {/* Review Note Modal (Optional note editor when flagging Needs Editing) */}
      {reviewModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E5E5E5] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-black flex items-center gap-1.5">
                  <X size={15} className="text-[#B91C1C]" />
                  <span>Review Note for Needs Editing</span>
                </h3>
                <p className="text-[11px] text-[#666666] font-mono mt-0.5 truncate max-w-xs">
                  {reviewModalProduct.title || reviewModalProduct.productName} (
                  {reviewModalProduct.sku || (reviewModalProduct as any).SKU || "SKU"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalProduct(null)}
                className="text-[#666666] hover:text-black p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800">
                Reason / Note for Product Editor{" "}
                <span className="font-normal text-[#666666]">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={reviewNoteInput}
                onChange={(e) => setReviewNoteInput(e.target.value)}
                placeholder="e.g. Incorrect product image, technical specifications need verification, price requires review..."
                className="w-full p-3 bg-neutral-50 border border-[#E5E5E5] rounded-xl text-xs text-black focus:outline-none focus:border-black font-medium resize-none"
              />

              {/* Quick suggestion presets */}
              <div className="pt-1">
                <span className="text-[10px] font-mono uppercase text-[#666666] block mb-1.5">
                  Quick suggestions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Incorrect product image",
                    "Product title needs correction",
                    "Technical specifications need verification",
                    "Price requires review",
                    "Missing certification details"
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReviewNoteInput(preset)}
                      className="px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 border border-[#E5E5E5] text-[10px] text-neutral-700 transition-colors cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => {
                  handleSetReviewStatus(reviewModalProduct, "PENDING", "");
                  setReviewModalProduct(null);
                }}
                className="text-xs text-[#666666] hover:text-black font-semibold cursor-pointer"
              >
                Reset to Unreviewed
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalProduct(null)}
                  className="px-3 py-1.5 border border-[#E5E5E5] text-neutral-700 rounded-lg text-xs font-bold hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reviewUpdatingId === reviewModalProduct.id}
                  onClick={() => {
                    handleSetReviewStatus(reviewModalProduct, "NEEDS_EDITING", reviewNoteInput);
                    setReviewModalProduct(null);
                  }}
                  className="px-4 py-1.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {reviewUpdatingId === reviewModalProduct.id ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Check size={12} />
                  )}
                  <span>Save Review Note</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
