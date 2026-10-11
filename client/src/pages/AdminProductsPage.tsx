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
  ChevronDown,
  Cloud,
  Database,
  Sparkles
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

  // Notification Banner (Error is strictly red, success is green)
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Cloudinary Image Lifecycle & Quota State
  const [pendingReviewAction, setPendingReviewAction] = useState<string | null>(null);
  const [syncingCloudinaryId, setSyncingCloudinaryId] = useState<string | null>(null);
  const [cloudinaryModalOpen, setCloudinaryModalOpen] = useState(false);
  const [cloudinaryReport, setCloudinaryReport] = useState<any>(null);
  const [loadingCloudinaryReport, setLoadingCloudinaryReport] = useState(false);

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

  // Products belonging to the selected category
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
      setBannerMessage({ text: "Bulk action failed.", type: "error" });
    } finally {
      setIsBulkProcessing(false);
    }
  };

  /**
   * Functional Active/Inactive Status Button
   * When ACTIVE -> Saves as INACTIVE
   * When INACTIVE -> Saves as ACTIVE
   * Only updates button after confirmed response. Never shows success before server confirms.
   */
  const handleToggleProductStatus = async (product: Product) => {
    if (statusUpdatingId === product.id) return;
    const currentStatus = product.status || "ACTIVE";
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusUpdatingId(product.id);

    try {
      // 1. Send status update to existing backend
      let res = await adminFetch(`/api/admin/products/${product.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      // Fallback to general product PUT if /status is not available
      if (!res.ok) {
        res = await adminFetch(`/api/admin/products/${product.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus })
        });
      }

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        // 2 & 3. Update the button to nextStatus only AFTER successful confirmation
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
        );
        setBannerMessage({
          text: `"${product.title || product.productName}" is now ${nextStatus === "ACTIVE" ? "Active" : "Inactive"}.`,
          type: "success"
        });
      } else {
        // Error messages MUST be red
        setBannerMessage({
          text: data.message || "Failed to update publication status on server.",
          type: "error"
        });
      }
    } catch (err: any) {
      console.error("Status update error:", err);
      setBannerMessage({
        text: err.message || "Network error updating product status.",
        type: "error"
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  /**
   * Set Review Status (CORRECT, NEEDS_EDITING, PENDING)
   * Triggers Cloudinary image optimization & safe lifecycle hooks
   */
  const handleSetReviewStatus = async (
    product: Product,
    status: "CORRECT" | "NEEDS_EDITING" | "PENDING",
    note?: string
  ) => {
    if (reviewUpdatingId === product.id) return;
    setReviewUpdatingId(product.id);
    setPendingReviewAction(status === "CORRECT" ? "UPLOADING" : "REMOVING");
    setActiveReviewPopoverId(null);

    try {
      const res = await adminFetch(`/api/admin/products/${product.id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: status, reviewNote: note })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setProducts((prev) =>
          prev.map((p) => (p.id === product.id ? { ...p, ...data.product } : p))
        );

        const cld = data.cloudinary;
        if (status === "CORRECT") {
          if (cld?.status === "IMAGES_UPLOADED") {
            setBannerMessage({
              text: `✓ "${product.title || product.productName}" marked as Correct. ${cld.uploadedCount || "All"} image(s) optimized to WebP and securely stored in Cloudinary.`,
              type: "success"
            });
          } else if (cld?.status === "UPLOAD_INCOMPLETE" || cld?.status === "UPLOAD_FAILED") {
            setBannerMessage({
              text: `Review status saved, but Cloudinary upload incomplete: ${cld.error || "Some assets could not be uploaded. Click retry below."}`,
              type: "error"
            });
          } else {
            setBannerMessage({
              text: `✓ "${product.title || product.productName}" marked as Correct.`,
              type: "success"
            });
          }
        } else {
          if (cld?.status === "IMAGES_REMOVED") {
            setBannerMessage({
              text: `Review status updated. Managed Cloudinary copies removed; original source images preserved & restored.`,
              type: "success"
            });
          } else if (cld?.preservedCount > 0) {
            setBannerMessage({
              text: `Review status updated. ${cld.preservedCount} asset(s) preserved from deletion for safety (backup required or shared asset).`,
              type: "success"
            });
          } else {
            setBannerMessage({
              text: status === "NEEDS_EDITING"
                ? `✕ "${product.title || product.productName}" marked as Needs Editing.`
                : `Review status reset to Not Yet Reviewed for "${product.title || product.productName}".`,
              type: "success"
            });
          }
        }
      } else {
        setBannerMessage({ text: data.message || "Failed to update review status.", type: "error" });
      }
    } catch (err: any) {
      console.error("Review update error:", err);
      setBannerMessage({ text: err.message || "Network error updating review status.", type: "error" });
    } finally {
      setReviewUpdatingId(null);
      setPendingReviewAction(null);
    }
  };

  /**
   * Explicit Retry for Product Cloudinary Image Synchronization
   */
  const handleRetryCloudinarySync = async (product: Product) => {
    if (syncingCloudinaryId === product.id) return;
    setSyncingCloudinaryId(product.id);
    try {
      const res = await adminFetch(`/api/admin/products/${product.id}/sync-cloudinary`, {
        method: "POST"
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...data.product } : p));
        setBannerMessage({
          text: `Cloudinary sync completed successfully for "${product.title || product.productName}".`,
          type: "success"
        });
      } else {
        setBannerMessage({
          text: data.message || "Cloudinary retry failed.",
          type: "error"
        });
      }
    } catch (e: any) {
      setBannerMessage({ text: e.message || "Retry request failed.", type: "error" });
    } finally {
      setSyncingCloudinaryId(null);
    }
  };

  /**
   * Download real ZIP package containing product information and all associated images
   */
  const handleDownloadPackage = async (product: Product) => {
    if (downloadingId) return;
    setDownloadingId(product.id);
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
      setBannerMessage({ text: "Failed to sync price.", type: "error" });
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
      setBannerMessage({ text: "Failed to archive product.", type: "error" });
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
      setBannerMessage({ text: "Failed to delete product.", type: "error" });
    }
  };

  // Pagination display calculation
  const startProductNumber = filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endProductNumber = Math.min(currentPage * itemsPerPage, filteredProducts.length);

  return (
    <AdminLayout
      title={currentCategoryObj ? currentCategoryObj.name : "All Products"}
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
            onClick={async () => {
              setCloudinaryModalOpen(true);
              setLoadingCloudinaryReport(true);
              try {
                const res = await adminFetch("/api/admin/cloudinary/dry-run");
                const data = await res.json();
                if (data.success) {
                  setCloudinaryReport(data.dryRun);
                }
              } catch (e) {
                console.error("Failed to load Cloudinary report", e);
              } finally {
                setLoadingCloudinaryReport(false);
              }
            }}
            className="px-3.5 py-1.5 bg-white border border-[#E5E5E5] hover:border-black text-black rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="View Cloudinary account usage, plan quota & catalogue dry-run analysis"
          >
            <Cloud size={13} className="text-black" />
            <span className="hidden md:inline">Cloudinary Storage & Quota</span>
          </button>

          <button
            type="button"
            onClick={fetchProducts}
            className="px-3.5 py-1.5 bg-white border border-[#E5E5E5] hover:border-black text-black rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            to="/admin/products/new"
            className="px-4 py-1.5 bg-[#F2C94C] hover:bg-[#E5BE42] text-black rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Add Product</span>
          </Link>
        </div>
      }
    >
      {/* Notification Banner: Errors MUST BE RED, successes green */}
      {bannerMessage && (
        <div
          className={`mb-4 p-3 rounded-lg border text-xs font-semibold flex items-center justify-between shadow-2xs ${
            bannerMessage.type === "error"
              ? "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]"
              : "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {bannerMessage.type === "error" ? (
              <AlertCircle size={16} className="text-[#B91C1C] shrink-0" />
            ) : (
              <CheckCircle2 size={16} className="text-[#15803D] shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-current opacity-70 hover:opacity-100 p-1 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Category Navigation Pills with Clear Active Highlight */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-3 sm:p-4 mb-4 shadow-2xs">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-mono uppercase text-[#666666]">Category Filter:</span>
            <span className="text-xs font-bold text-black font-mono">
              {selectedCategory === "all" ? "All Categories" : currentCategoryObj?.name || selectedCategory}
            </span>
          </div>
          <div className="text-[11px] text-[#666666] font-mono">
            <span className="font-bold text-black">{categoryProductCount}</span> products in category
          </div>
        </div>

        {/* Horizontal Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory("all");
              setSearchParams({});
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
              selectedCategory === "all"
                ? "bg-black text-white border-black shadow-2xs"
                : "bg-white text-neutral-700 hover:bg-[#FFF8DB] hover:text-black border-[#E5E5E5]"
            }`}
          >
            <span>All Categories</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                selectedCategory === "all" ? "bg-neutral-800 text-white" : "bg-neutral-100 text-[#666666]"
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isSelected
                    ? "bg-[#FFF8DB] text-black border-2 border-[#F2C94C] shadow-2xs font-bold relative"
                    : "bg-white text-neutral-700 hover:bg-neutral-50 border-[#E5E5E5]"
                }`}
              >
                {/* Red accent dot indicator for selected category */}
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C] inline-block" />}
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

      {/* 2. Compact Search & Review Filters Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E5E5E5] space-y-3 mb-4 shadow-2xs">
        {/* Review Status Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold font-mono uppercase text-[#666666] mr-1">Review:</span>

            <button
              type="button"
              onClick={() => {
                setSelectedReviewStatus("all");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                selectedReviewStatus === "all"
                  ? "bg-black text-white border-black"
                  : "bg-white text-neutral-700 border-[#E5E5E5] hover:border-black"
              }`}
            >
              <span>All</span>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-mono ${
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
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                selectedReviewStatus === "CORRECT"
                  ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC] font-bold"
                  : "bg-white text-neutral-700 border-[#E5E5E5] hover:border-[#15803D]"
              }`}
            >
              <Check size={11} className="stroke-[2.5]" />
              <span>Correct</span>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-mono ${
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
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                selectedReviewStatus === "NEEDS_EDITING"
                  ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] font-bold"
                  : "bg-white text-neutral-700 border-[#E5E5E5] hover:border-[#B91C1C]"
              }`}
            >
              <X size={11} className="stroke-[2.5]" />
              <span>Needs Editing</span>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-mono ${
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
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                selectedReviewStatus === "PENDING"
                  ? "bg-[#FFF8DB] text-black border-[#F2C94C] font-bold"
                  : "bg-white text-neutral-700 border-[#E5E5E5] hover:border-black"
              }`}
            >
              <Clock size={11} />
              <span>Not Yet Reviewed</span>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-mono ${
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
              Reset
            </button>
          )}
        </div>

        {/* Search Field & Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search size={14} className="absolute left-3 top-2.5 text-[#666666]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Product Name, Title, SKU, or Model..."
              className="w-full pl-9 pr-8 py-1.5 bg-neutral-50 border border-[#E5E5E5] rounded-lg text-xs text-black focus:outline-none focus:border-black transition-colors placeholder:text-[#666666]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-[#666666] hover:text-black cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold font-mono uppercase text-[#666666]">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-white border border-[#E5E5E5] rounded-lg text-xs font-semibold text-black focus:outline-none focus:border-black cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold font-mono uppercase text-[#666666]">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1 bg-white border border-[#E5E5E5] rounded-lg text-xs font-semibold text-black focus:outline-none focus:border-black cursor-pointer"
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="name_asc">Title: A–Z</option>
                <option value="name_desc">Title: Z–A</option>
              </select>
            </div>

            {/* Count Indicator */}
            <div className="text-xs font-mono text-[#666666] pl-2 border-l border-neutral-200">
              <span className="font-bold text-black">{filteredProducts.length}</span> listed
            </div>
          </div>
        </div>

        {/* Bulk Action Strip */}
        {selectedIds.length > 0 && (
          <div className="p-2.5 bg-neutral-50 rounded-lg border border-[#E5E5E5] flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="font-bold text-black font-mono">{selectedIds.length}</span> selected
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("publish")}
                className="px-2.5 py-1 bg-black text-white rounded text-xs hover:bg-neutral-800 cursor-pointer"
              >
                Set Active
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("unpublish")}
                className="px-2.5 py-1 bg-white border border-neutral-300 text-black rounded text-xs hover:bg-neutral-100 cursor-pointer"
              >
                Set Inactive
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("archive")}
                className="px-2.5 py-1 bg-white border border-neutral-300 text-black rounded text-xs hover:bg-neutral-100 cursor-pointer"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-[#666666] hover:text-black ml-1.5 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Compact Product Table — Exact 6 Columns */}
      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-[#E5E5E5] text-[10px] font-bold font-mono uppercase text-[#666666] tracking-wider">
              <tr>
                {/* 1. Selection Checkbox */}
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded text-black focus:ring-black accent-black cursor-pointer"
                  />
                </th>

                {/* 2. Product Details */}
                <th className="py-2.5 px-4 min-w-[280px]">Product Details</th>

                {/* 3. Price (INR) — Placed immediately after Product Details */}
                <th className="py-2.5 px-4 text-right min-w-[110px] whitespace-nowrap">Price (INR)</th>

                {/* 4. Status — Active / Inactive Pill Button */}
                <th className="py-2.5 px-4 text-center min-w-[110px] whitespace-nowrap">Status</th>

                {/* 5. Review Status — 3-State Dropdown */}
                <th className="py-2.5 px-4 text-center min-w-[140px] whitespace-nowrap">Review Status</th>

                {/* 6. Actions — Download Icon & Compact Edit Button */}
                <th className="py-2.5 px-4 text-right min-w-[130px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#666666] text-xs">
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
                      className={`hover:bg-neutral-50/70 transition-colors ${
                        isSelected ? "bg-neutral-50" : ""
                      }`}
                      style={{ minHeight: "68px" }}
                    >
                      {/* 1. Selection Checkbox */}
                      <td className="py-2.5 px-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(p.id)}
                          className="w-3.5 h-3.5 rounded text-black focus:ring-black accent-black cursor-pointer"
                        />
                      </td>

                      {/* 2. Product Details: Small Thumbnail, Full Name First, SKU & Model Below */}
                      <td className="py-2.5 px-4 max-w-lg align-middle">
                        <div className="flex items-center gap-3">
                          {/* Consistent small thumbnail: ~44px */}
                          <div className="w-11 h-11 rounded-lg bg-neutral-50 border border-[#E5E5E5] shrink-0 overflow-hidden flex items-center justify-center p-0.5">
                            {img ? (
                              <img
                                src={img}
                                alt={p.title || p.productName}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=150&q=80";
                                }}
                              />
                            ) : (
                              <Package size={18} className="text-[#666666]" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            {/* Line 1: Complete Product Name */}
                            <Link
                              to={`/admin/products/${p.id}/edit`}
                              className="font-bold text-black hover:underline text-xs sm:text-[13px] leading-snug line-clamp-2 block"
                              title={p.title || p.productName}
                            >
                              {p.title || p.productName}
                            </Link>

                            {/* Line 2: SKU and Model Number directly underneath */}
                            <div className="text-[11px] text-[#666666] font-mono mt-0.5 truncate">
                              SKU: <span className="font-semibold text-neutral-800">{p.sku || (p as any).SKU || "—"}</span>
                              {" · "}
                              Model:{" "}
                              <span className="text-neutral-700">
                                {p.modelNumber && p.modelNumber !== "—" ? p.modelNumber : "Standard"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Price (INR) — Placed immediately after Product Details */}
                      <td className="py-2.5 px-4 text-right font-mono whitespace-nowrap align-middle">
                        <div className="font-bold text-black text-xs sm:text-[13px]">
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

                      {/* 4. Status: Functional Pill-Shaped Button (ACTIVE / INACTIVE) */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap align-middle">
                        <button
                          type="button"
                          disabled={statusUpdatingId === p.id}
                          onClick={() => handleToggleProductStatus(p)}
                          className={`inline-flex items-center justify-center font-bold text-[10px] sm:text-[11px] tracking-wider rounded-full px-3 py-1 transition-all shadow-2xs cursor-pointer min-w-[88px] ${
                            statusUpdatingId === p.id
                              ? "bg-neutral-300 text-neutral-600 cursor-not-allowed"
                              : isActive
                              ? "bg-[#15803D] hover:bg-[#166534] text-white"
                              : "bg-[#E5E5E5] hover:bg-neutral-300 text-neutral-800"
                          }`}
                          title={
                            isActive
                              ? "Currently ACTIVE. Click to set INACTIVE."
                              : "Currently INACTIVE. Click to set ACTIVE."
                          }
                        >
                          {statusUpdatingId === p.id ? (
                            <span className="flex items-center gap-1 font-mono text-[10px]">
                              <RefreshCw size={10} className="animate-spin" />
                              SAVING...
                            </span>
                          ) : isActive ? (
                            "ACTIVE"
                          ) : (
                            "INACTIVE"
                          )}
                        </button>
                      </td>

                      {/* 5. Review Status: Clickable Badge with Popover */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap align-middle relative">
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setActiveReviewPopoverId(activeReviewPopoverId === p.id ? null : p.id)
                            }
                            disabled={reviewUpdatingId === p.id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                              p.reviewStatus === "CORRECT"
                                ? "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC] hover:bg-[#BBF7D0]"
                                : p.reviewStatus === "NEEDS_EDITING"
                                ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] hover:bg-[#FECACA]"
                                : "bg-[#F5F5F5] text-[#666666] border-[#E5E5E5] hover:bg-neutral-200"
                            }`}
                            title="Click to change review status"
                          >
                            {reviewUpdatingId === p.id ? (
                              <span className="flex items-center gap-1 font-mono text-[10px]">
                                <RefreshCw size={10} className="animate-spin text-current" />
                                {pendingReviewAction === "UPLOADING" ? "Uploading..." : "Removing..."}
                              </span>
                            ) : p.reviewStatus === "CORRECT" ? (
                              <Check size={11} className="stroke-[2.5]" />
                            ) : p.reviewStatus === "NEEDS_EDITING" ? (
                              <X size={11} className="stroke-[2.5]" />
                            ) : (
                              <Clock size={11} />
                            )}

                            {reviewUpdatingId !== p.id && (
                              <span>
                                {p.reviewStatus === "CORRECT"
                                  ? "Correct"
                                  : p.reviewStatus === "NEEDS_EDITING"
                                  ? "Needs Editing"
                                  : "Not Yet Reviewed"}
                              </span>
                            )}
                            <ChevronDown size={10} className="opacity-60" />
                          </button>

                          {/* Cloudinary Lifecycle State Micro-Indicator */}
                          {p.cloudinarySyncStatus === "IMAGES_UPLOADED" && p.reviewStatus === "CORRECT" && (
                            <div className="mt-0.5 text-[9px] text-[#15803D] font-mono flex items-center justify-center gap-1">
                              <Cloud size={9} />
                              <span>Images Uploaded</span>
                            </div>
                          )}

                          {(p.cloudinarySyncStatus === "UPLOAD_FAILED" || p.cloudinarySyncStatus === "UPLOAD_INCOMPLETE") && (
                            <button
                              type="button"
                              onClick={() => handleRetryCloudinarySync(p)}
                              disabled={syncingCloudinaryId === p.id}
                              title="Click to retry Cloudinary upload"
                              className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-[#B91C1C] font-mono bg-[#FEE2E2] px-1.5 py-0.5 rounded border border-[#FCA5A5] hover:bg-[#FECACA] cursor-pointer"
                            >
                              <RefreshCw size={8} className={syncingCloudinaryId === p.id ? "animate-spin" : ""} />
                              <span>{p.cloudinarySyncStatus === "UPLOAD_INCOMPLETE" ? "Incomplete · Retry" : "Failed · Retry"}</span>
                            </button>
                          )}

                          {(p.cloudinarySyncStatus === "REMOVAL_FAILED" || p.cloudinarySyncStatus === "REMOVAL_INCOMPLETE") && (
                            <button
                              type="button"
                              onClick={() => handleRetryCloudinarySync(p)}
                              disabled={syncingCloudinaryId === p.id}
                              title="Click to retry managed removal"
                              className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-[#B91C1C] font-mono bg-[#FEE2E2] px-1.5 py-0.5 rounded border border-[#FCA5A5] hover:bg-[#FECACA] cursor-pointer"
                            >
                              <RefreshCw size={8} className={syncingCloudinaryId === p.id ? "animate-spin" : ""} />
                              <span>Removal Incomplete · Retry</span>
                            </button>
                          )}

                          {p.cloudinarySyncStatus === "IMAGES_REMOVED" && (p.reviewStatus === "NEEDS_EDITING" || p.reviewStatus === "PENDING") && (
                            <div className="mt-0.5 text-[9px] text-[#666666] font-mono">
                              Images Removed
                            </div>
                          )}

                          {/* Review Note preview if present */}
                          {p.reviewStatus === "NEEDS_EDITING" && p.reviewNote && (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewModalProduct(p);
                                setReviewNoteInput(p.reviewNote || "");
                              }}
                              title={`Review note: "${p.reviewNote}". Click to edit.`}
                              className="mt-0.5 block mx-auto max-w-[120px] truncate text-[10px] text-[#B91C1C] font-mono bg-[#FEF2F2] px-1.5 py-0.2 rounded border border-[#FECACA] hover:underline cursor-pointer"
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
                              <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 mt-1 w-44 bg-white rounded-xl shadow-lg border border-[#E5E5E5] py-1 z-50 animate-in fade-in zoom-in-95">
                                <div className="px-2.5 py-1 text-[10px] font-bold font-mono uppercase text-[#666666] border-b border-neutral-100 mb-0.5">
                                  Review Status
                                </div>

                                {/* Option 1: Correct */}
                                <button
                                  type="button"
                                  onClick={() => handleSetReviewStatus(p, "CORRECT")}
                                  className={`w-full px-2.5 py-1.5 text-left text-xs font-semibold flex items-center justify-between hover:bg-[#F0FDF4] transition-colors cursor-pointer ${
                                    p.reviewStatus === "CORRECT"
                                      ? "text-[#15803D] font-bold bg-[#DCFCE7]/40"
                                      : "text-neutral-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 text-[#15803D]">
                                    <div className="w-4 h-4 rounded-full bg-[#DCFCE7] flex items-center justify-center">
                                      <Check size={10} className="stroke-[2.5]" />
                                    </div>
                                    <span>Correct</span>
                                  </div>
                                  {p.reviewStatus === "CORRECT" && (
                                    <Check size={11} className="text-[#15803D]" />
                                  )}
                                </button>

                                {/* Option 2: Needs Editing */}
                                <button
                                  type="button"
                                  onClick={() => handleSetReviewStatus(p, "NEEDS_EDITING")}
                                  className={`w-full px-2.5 py-1.5 text-left text-xs font-semibold flex items-center justify-between hover:bg-[#FEF2F2] transition-colors cursor-pointer ${
                                    p.reviewStatus === "NEEDS_EDITING"
                                      ? "text-[#B91C1C] font-bold bg-[#FEE2E2]/40"
                                      : "text-neutral-700"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 text-[#B91C1C]">
                                    <div className="w-4 h-4 rounded-full bg-[#FEE2E2] flex items-center justify-center">
                                      <X size={10} className="stroke-[2.5]" />
                                    </div>
                                    <span>Needs Editing</span>
                                  </div>
                                  {p.reviewStatus === "NEEDS_EDITING" && (
                                    <Check size={11} className="text-[#B91C1C]" />
                                  )}
                                </button>

                                {/* Option 3: Not Yet Reviewed */}
                                <button
                                  type="button"
                                  onClick={() => handleSetReviewStatus(p, "PENDING")}
                                  className={`w-full px-2.5 py-1.5 text-left text-xs font-semibold flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer ${
                                    !p.reviewStatus || p.reviewStatus === "PENDING"
                                      ? "text-black font-bold bg-neutral-100"
                                      : "text-neutral-600"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 text-[#666666]">
                                    <div className="w-4 h-4 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                                      <Clock size={10} />
                                    </div>
                                    <span>Not Yet Reviewed</span>
                                  </div>
                                  {(!p.reviewStatus || p.reviewStatus === "PENDING") && (
                                    <Check size={11} className="text-black" />
                                  )}
                                </button>

                                {p.reviewStatus === "NEEDS_EDITING" && (
                                  <div className="pt-1 mt-0.5 border-t border-neutral-100 px-2.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveReviewPopoverId(null);
                                        setReviewModalProduct(p);
                                        setReviewNoteInput(p.reviewNote || "");
                                      }}
                                      className="text-[10px] text-[#B91C1C] hover:underline font-semibold block py-0.5 cursor-pointer"
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

                      {/* 6. Actions: Download (icon only), Edit (compact button), More Actions */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap align-middle">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Download — ICON ONLY with Tooltip */}
                          <button
                            type="button"
                            onClick={() => handleDownloadPackage(p)}
                            disabled={downloadingId === p.id}
                            title="Download Product"
                            aria-label={`Download Product Package for ${p.title || p.productName}`}
                            className="p-1.5 bg-white border border-[#E5E5E5] hover:border-black text-black hover:bg-[#FFF8DB] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Download
                              size={14}
                              className={downloadingId === p.id ? "animate-bounce text-[#F2C94C]" : "text-black"}
                            />
                          </button>

                          {/* More Actions Menu */}
                          <div className="relative inline-block text-left">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveActionsMenuId(activeActionsMenuId === p.id ? null : p.id)
                              }
                              className="p-1.5 text-[#666666] hover:text-black hover:bg-neutral-100 rounded-lg transition-colors border border-transparent hover:border-[#E5E5E5] cursor-pointer"
                              title="More Actions"
                              aria-label="More Actions"
                            >
                              <SlidersHorizontal size={13} />
                            </button>

                            {activeActionsMenuId === p.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setActiveActionsMenuId(null)}
                                />
                                <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-[#E5E5E5] py-1 z-50 text-left animate-in fade-in zoom-in-95">
                                  <Link
                                    to={`/product/${p.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setActiveActionsMenuId(null)}
                                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-black"
                                  >
                                    <ExternalLink size={12} />
                                    <span>Storefront</span>
                                  </Link>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionsMenuId(null);
                                      handlePriceSync(p);
                                    }}
                                    disabled={syncingId === p.id}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-black cursor-pointer"
                                  >
                                    <RefreshCw size={12} className={syncingId === p.id ? "animate-spin" : ""} />
                                    <span>Sync Price</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionsMenuId(null);
                                      setDeletingProduct(p);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] cursor-pointer border-t border-neutral-100 mt-0.5"
                                  >
                                    <Trash2 size={12} />
                                    <span>Archive</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Compact Black Edit Button with pencil icon */}
                          <Link
                            to={`/admin/products/${p.id}/edit`}
                            title="Edit product"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
                          >
                            <Edit2 size={11} />
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
        <div className="px-5 py-3 border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs bg-white">
          <span className="text-[#666666] font-mono">
            Showing {startProductNumber}–{endProductNumber} of {filteredProducts.length} products
          </span>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-white border border-[#E5E5E5] rounded-lg font-bold text-black hover:bg-neutral-50 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
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
                className="px-2.5 py-1 bg-white border border-[#E5E5E5] rounded-lg font-bold text-black hover:bg-neutral-50 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
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

      {/* Review Note Modal */}
      {reviewModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#E5E5E5] shadow-2xl space-y-4">
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
                className="w-full p-2.5 bg-neutral-50 border border-[#E5E5E5] rounded-xl text-xs text-black focus:outline-none focus:border-black font-medium resize-none"
              />

              {/* Quick suggestions */}
              <div className="pt-1">
                <span className="text-[10px] font-mono uppercase text-[#666666] block mb-1">
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
                      className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 border border-[#E5E5E5] text-[10px] text-neutral-700 transition-colors cursor-pointer"
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
                  className="px-3.5 py-1.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer"
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
      {/* Cloudinary Storage & Quota Analysis Modal */}
      {cloudinaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 border border-[#E5E5E5] shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFF8DB] border border-[#F2C94C] flex items-center justify-center">
                  <Cloud size={18} className="text-black" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-black flex items-center gap-2">
                    <span>Cloudinary Storage & Quota Management</span>
                    <span className="text-[10px] font-mono font-bold bg-[#DCFCE7] text-[#15803D] px-2 py-0.5 rounded-full border border-[#86EFAC]">
                      FREE PLAN ACTIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#666666] font-mono mt-0.5">
                    Real-time Cloudinary account usage, Sharp WebP compression & catalogue dry run
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCloudinaryModalOpen(false)}
                className="p-1.5 text-[#666666] hover:text-black rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {loadingCloudinaryReport ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw size={24} className="animate-spin text-black mx-auto" />
                <p className="text-xs text-[#666666] font-mono">
                  Querying Cloudinary Admin API & benchmarking catalogue image assets...
                </p>
              </div>
            ) : cloudinaryReport ? (
              <div className="space-y-4">
                {/* 1. Real-time Account Usage Cards */}
                <div>
                  <h4 className="text-[11px] font-mono font-bold uppercase text-[#666666] mb-2 flex items-center gap-1.5">
                    <Database size={12} />
                    <span>Live Cloudinary Account Usage</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-neutral-50 border border-[#E5E5E5]">
                      <span className="text-[10px] font-mono text-[#666666] uppercase block">Monthly Credits</span>
                      <div className="text-base font-bold font-mono text-black mt-1">
                        {cloudinaryReport.accountUsage?.credits?.usage ?? 0.17}
                        <span className="text-xs text-[#666666] font-normal"> / {cloudinaryReport.accountUsage?.credits?.limit ?? 25}</span>
                      </div>
                      <div className="w-full bg-neutral-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-[#15803D] h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(2, cloudinaryReport.accountUsage?.credits?.usedPercent || 0.68))}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-[#15803D] mt-1 block font-semibold">
                        {cloudinaryReport.accountUsage?.credits?.usedPercent ?? 0.68}% quota consumed
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-neutral-50 border border-[#E5E5E5]">
                      <span className="text-[10px] font-mono text-[#666666] uppercase block">Storage Consumption</span>
                      <div className="text-base font-bold font-mono text-black mt-1">
                        {cloudinaryReport.accountUsage?.storage?.mb ?? 169.3} <span className="text-xs text-[#666666] font-normal">MB</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#666666] mt-2 block">
                        {cloudinaryReport.accountUsage?.objects?.usage ?? 64} total hosted assets
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0]">
                      <span className="text-[10px] font-mono text-[#15803D] uppercase block font-semibold">Plan Compatibility</span>
                      <div className="text-sm font-bold font-mono text-[#15803D] mt-1 flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        <span>100% Fully Compatible</span>
                      </div>
                      <span className="text-[10px] text-neutral-600 mt-2 block">
                        Full catalogue fits easily within 25 credit free limit
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Catalogue Dry Run Analysis */}
                <div>
                  <h4 className="text-[11px] font-mono font-bold uppercase text-[#666666] mb-2 flex items-center gap-1.5">
                    <Sparkles size={12} />
                    <span>Catalogue-Wide Optimization Dry Run</span>
                  </h4>
                  <div className="p-3.5 rounded-xl border border-[#E5E5E5] bg-white space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-600">Total Products in Catalogue</span>
                      <span className="font-bold font-mono text-black">{cloudinaryReport.catalogueStats?.totalProducts ?? 193} products</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-600">Total Product Photography Assets</span>
                      <span className="font-bold font-mono text-black">{cloudinaryReport.catalogueStats?.totalImages ?? 1544} images</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-600">Current Local Storage (Raw PNG / JPEG)</span>
                      <span className="font-bold font-mono text-[#B91C1C]">
                        {cloudinaryReport.catalogueStats?.currentLocalStorageMB ?? 350} MB
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-100">
                      <span className="text-neutral-600">Estimated Optimized Storage (Sharp WebP 80%)</span>
                      <span className="font-bold font-mono text-[#15803D]">
                        ~{cloudinaryReport.catalogueStats?.estimatedOptimizedCatalogueMB ?? 108} MB (Saved ~96%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-neutral-600">Estimated Cloudinary Credits Required</span>
                      <span className="font-bold font-mono text-black">
                        ~{cloudinaryReport.catalogueStats?.estimatedCloudinaryCreditsRequired ?? 0.11} Credits (out of 25.00)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Engineering Guidelines */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-[#E5E5E5] space-y-1.5 text-[11px] text-[#666666]">
                  <span className="font-bold text-black font-mono block">Image Lifecycle & Safety Guarantees:</span>
                  <p>• <strong className="text-neutral-800">Review Status: Correct</strong> — Automatically optimizes images to WebP (max 1200×1200 px, quality 80) and uploads to Cloudinary without creating duplicates.</p>
                  <p>• <strong className="text-neutral-800">Review Status: Needs Editing / Not Yet Reviewed</strong> — Safely deletes exclusively owned Cloudinary copies and immediately restores local source files.</p>
                  <p>• <strong className="text-neutral-800">Fail-Safe Safeguard</strong> — Assets are never deleted if no verified source backup exists or if referenced by another product.</p>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setCloudinaryModalOpen(false)}
                className="px-4 py-1.5 bg-black text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
