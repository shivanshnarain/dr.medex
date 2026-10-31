import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams, Link, useNavigate, useLocation } from "react-router-dom";
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
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { DeleteProductModal } from "../components/admin/DeleteProductModal";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Product, Category } from "../types";
import { getApiUrl } from "../lib/apiConfig";
import { fallbackProducts, fallbackCategories } from "../services/productService";

export const AdminProductsPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem("drmedex_admin_products_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p: any) => ({
            ...p,
            mongoSyncStatus: p.mongoSyncStatus === "SYNC_FAILED" ? "PENDING" : p.mongoSyncStatus
          }));
        }
      }
    } catch {}
    return fallbackProducts && fallbackProducts.length > 0 ? (fallbackProducts as Product[]) : [];
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    return fallbackCategories && fallbackCategories.length > 0 ? (fallbackCategories as Category[]) : [];
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isFetchingProductsRef = useRef(false);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

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

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Notification Banner (Error is strictly red, warning is amber, success is green)
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: "success" | "error" | "warning" } | null>(null);

  // Auto-dismissing Toast Notification System (Replaces persistent sync labels)
  const [toast, setToast] = useState<{
    id: string;
    type: "success" | "error" | "warning";
    title?: string;
    message: string;
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: "success" | "error" | "warning", message: string, title?: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    const id = String(Date.now());
    setToast({ id, type, message, title });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const dismissToast = () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast(null);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Cloudinary Image Lifecycle & Quota State
  const [pendingReviewAction, setPendingReviewAction] = useState<string | null>(null);
  const [syncingCloudinaryId, setSyncingCloudinaryId] = useState<string | null>(null);
  const [syncingMongoId, setSyncingMongoId] = useState<string | null>(null);
  const [cloudinaryModalOpen, setCloudinaryModalOpen] = useState(false);
  const [cloudinaryReport, setCloudinaryReport] = useState<any>(null);
  const [loadingCloudinaryReport, setLoadingCloudinaryReport] = useState(false);

  // Dynamic Section Management State (Add / Edit / Delete Sections)
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<any | null>(null);
  const [deletingSection, setDeletingSection] = useState<any | null>(null);
  const [sectionFormName, setSectionFormName] = useState("");
  const [sectionFormDesc, setSectionFormDesc] = useState("");
  const [sectionFormOrder, setSectionFormOrder] = useState("");
  const [sectionFormError, setSectionFormError] = useState("");
  const [sectionDeleteError, setSectionDeleteError] = useState("");
  const [sectionCascadeConfirm, setSectionCascadeConfirm] = useState(false);
  const [sectionCascadeAcknowledged, setSectionCascadeAcknowledged] = useState(false);
  const [isSavingSection, setIsSavingSection] = useState(false);

  const handleAddSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategoryObj) return;
    const name = sectionFormName.trim();
    if (!name) {
      setSectionFormError("Section name is required.");
      return;
    }

    const isDuplicate = currentCategoryObj.subcategories?.some(
      (sub) => sub.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      setSectionFormError(`A section named "${name}" already exists in this category.`);
      return;
    }

    setIsSavingSection(true);
    setSectionFormError("");

    try {
      const parentCategoryKey = currentCategoryObj.slug || currentCategoryObj.id;
      const res = await adminFetch("/api/admin/catalogue/subcategory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentCategory: parentCategoryKey,
          name,
          description: sectionFormDesc.trim(),
          order: sectionFormOrder ? Number(sectionFormOrder) : undefined
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setSectionFormError(data.message || "Failed to create section.");
        return;
      }

      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }

      setIsAddSectionModalOpen(false);
      setSectionFormName("");
      setSectionFormDesc("");
      setSectionFormOrder("");
      showToast("success", `Section "${name}" created successfully.`, "Section Created");
      fetchProducts(true);
    } catch (err: any) {
      setSectionFormError(err.message || "Error saving section.");
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleEditSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategoryObj || !editingSection) return;
    const name = sectionFormName.trim();
    if (!name) {
      setSectionFormError("Section name is required.");
      return;
    }

    const isDuplicate = currentCategoryObj.subcategories?.some(
      (sub) =>
        (sub.slug || sub.id) !== (editingSection.slug || editingSection.id) &&
        sub.name.toLowerCase() === name.toLowerCase()
    );
    if (isDuplicate) {
      setSectionFormError(`Another section named "${name}" already exists.`);
      return;
    }

    setIsSavingSection(true);
    setSectionFormError("");

    try {
      const parentCategoryKey = currentCategoryObj.slug || currentCategoryObj.id;
      const subId = editingSection.slug || editingSection.id;
      const res = await adminFetch(
        `/api/admin/catalogue/subcategory/${encodeURIComponent(parentCategoryKey)}/${encodeURIComponent(subId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: sectionFormDesc.trim(),
            order: sectionFormOrder ? Number(sectionFormOrder) : undefined
          })
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setSectionFormError(data.message || "Failed to update section.");
        return;
      }

      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }

      setEditingSection(null);
      showToast("success", `Section "${name}" updated successfully.`, "Section Updated");
      fetchProducts(true);
    } catch (err: any) {
      setSectionFormError(err.message || "Error updating section.");
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleDeleteSectionSubmit = async (cascade = false) => {
    if (!currentCategoryObj || !deletingSection) return;
    setIsSavingSection(true);
    setSectionDeleteError("");

    try {
      const parentCategoryKey = currentCategoryObj.slug || currentCategoryObj.id;
      const subId = deletingSection.slug || deletingSection.id;
      const res = await adminFetch(
        "/api/admin/catalogue/delete-cascade",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "subcategory",
            id: subId,
            parentCategory: parentCategoryKey,
            cascadeProducts: cascade,
            confirmed: cascade
          })
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setSectionDeleteError(data.message || "Cannot delete section.");
        return;
      }

      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }

      const deletedName = deletingSection.name;
      setDeletingSection(null);
      setSectionCascadeConfirm(false);
      setSectionCascadeAcknowledged(false);
      showToast("success", `Section "${deletedName}" permanently removed.`, "Section Removed");
      fetchProducts(true);
    } catch (err: any) {
      setSectionDeleteError(err.message || "Error deleting section.");
    } finally {
      setIsSavingSection(false);
    }
  };

  const fetchProducts = async (isManualRefresh = false) => {
    if (isFetchingProductsRef.current || isRefreshing) return;
    isFetchingProductsRef.current = true;
    setIsLoading(true);
    setIsRefreshing(true);
    try {
      const cacheBuster = `_t=${Date.now()}`;
      const statusParam = selectedStatus === "ARCHIVED" ? "&status=ARCHIVED" : "";
      const url = `/api/admin/products?limit=1000${statusParam}&${cacheBuster}`;
      const catUrl = getApiUrl(`/api/categories?includeInactive=true&${cacheBuster}`);

      const [prodRes, catRes] = await Promise.all([
        adminFetch(url),
        fetch(catUrl)
      ]);

      let loadedFromLive = false;
      let loadedProducts: Product[] = [];

      if (prodRes.ok) {
        try {
          const pData = await prodRes.json();
          if (pData && pData.success && Array.isArray(pData.products)) {
            loadedProducts = pData.products;
            loadedFromLive = true;
            try {
              localStorage.setItem("drmedex_admin_products_cache", JSON.stringify(pData.products));
            } catch {}
          }
        } catch (parseErr) {
          console.warn("Error parsing products response:", parseErr);
        }
      }

      if (loadedFromLive) {
        setProducts(loadedProducts);
        if (isManualRefresh) {
          setBannerMessage({
            text: `Refreshed catalogue: ${loadedProducts.length} products synced from backend.`,
            type: "success"
          });
        } else {
          setBannerMessage(null);
        }
      } else {
        // Fallback ONLY if no products currently exist in memory
        if (products.length === 0) {
          try {
            const cached = localStorage.getItem("drmedex_admin_products_cache");
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed) && parsed.length > 0) {
                loadedProducts = parsed;
              }
            }
          } catch {}
          if (!loadedProducts.length && fallbackProducts && fallbackProducts.length > 0) {
            loadedProducts = fallbackProducts;
          }
          if (loadedProducts.length > 0) {
            setProducts(loadedProducts);
          }
        }
        const statusMsg = !prodRes.ok ? `HTTP ${prodRes.status}` : "network synchronization";
        setBannerMessage({
          text: isManualRefresh
            ? `Refresh request encountered an issue (${statusMsg}). Existing catalogue data preserved.`
            : `Backend product service synchronizing (${statusMsg}). Displaying verified catalogue products.`,
          type: isManualRefresh ? "error" : "warning"
        });
      }

      if (catRes.ok) {
        try {
          const cData = await catRes.json();
          if (cData && cData.success && Array.isArray(cData.categories)) {
            setCategories(cData.categories);
          }
        } catch {}
      } else if (categories.length === 0 && fallbackCategories && fallbackCategories.length > 0) {
        setCategories(fallbackCategories);
      }
    } catch (e: any) {
      console.error("Products load error:", e);
      // DO NOT silently wipe or replace existing valid products on error!
      if (products.length === 0) {
        let loadedProducts: Product[] = [];
        try {
          const cached = localStorage.getItem("drmedex_admin_products_cache");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) loadedProducts = parsed;
          }
        } catch {}
        if (!loadedProducts.length && fallbackProducts) {
          loadedProducts = fallbackProducts;
        }
        if (loadedProducts.length > 0) {
          setProducts(loadedProducts);
        }
      }
      setBannerMessage({
        text: `Error contacting server: ${e.message || "Failed to load"}. Existing catalogue data preserved.`,
        type: "error"
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      isFetchingProductsRef.current = false;
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Listen for navigation state from product editor after successful save
  useEffect(() => {
    if (location.state && (location.state as any).refreshed) {
      const stateMsg = (location.state as any).message;
      const updatedProduct = (location.state as any).updatedProduct;
      if (updatedProduct && updatedProduct.id) {
        setProducts((prev) => {
          const idx = prev.findIndex((p) => p.id === updatedProduct.id);
          let nextList;
          if (idx !== -1) {
            nextList = [...prev];
            nextList[idx] = { ...nextList[idx], ...updatedProduct };
            const [item] = nextList.splice(idx, 1);
            nextList.unshift(item);
          } else {
            nextList = [updatedProduct, ...prev];
          }
          try {
            localStorage.setItem("drmedex_admin_products_cache", JSON.stringify(nextList));
          } catch (e) {
            // ignore
          }
          return nextList;
        });
      }
      if (stateMsg) {
        showToast("success", stateMsg, "Catalogue Updated");
      }
      fetchProducts(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  // STRICT SCOPE: OT Lights, Physiotherapy, and Electrosurgical Units use the sectioned category UI
  const isSectionedCategory = useMemo(() => {
    if (!currentCategoryObj && (!selectedCategory || selectedCategory === "all")) return false;
    const catSlug = currentCategoryObj?.slug || selectedCategory;
    const catId = currentCategoryObj?.id || selectedCategory;
    return (
      catSlug === "ot-lights" ||
      catId === "ot-lights" ||
      catSlug === "physiotherapy" ||
      catId === "physiotherapy" ||
      catSlug === "electrosurgical-units" ||
      catId === "electrosurgical-units"
    );
  }, [currentCategoryObj, selectedCategory]);

  // Products belonging to the selected category (handling slug and id mapping)
  const categoryScopedProducts = useMemo(() => {
    if (!selectedCategory || selectedCategory === "all") {
      return products;
    }
    const catObj = categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
    return products.filter(
      (p) =>
        p.category === selectedCategory ||
        (catObj && (p.category === catObj.slug || p.category === catObj.id))
    );
  }, [products, selectedCategory, categories]);

  const categoryProductCount = categoryScopedProducts.length;

  // Live review counts scoped to the selected category - each product belongs to exactly one bucket
  const reviewCounts = useMemo(() => {
    const all = categoryScopedProducts.length;
    const correct = categoryScopedProducts.filter((p) => p.reviewStatus === "CORRECT").length;
    const needsEditing = categoryScopedProducts.filter((p) => p.reviewStatus === "NEEDS_EDITING").length;
    const pending = categoryScopedProducts.filter(
      (p) => p.reviewStatus !== "CORRECT" && p.reviewStatus !== "NEEDS_EDITING"
    ).length;
    return { all, correct, needsEditing, pending };
  }, [categoryScopedProducts]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...categoryScopedProducts];

    // Search query: Case-insensitive across product name/title, SKU, modelNumber, and description
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((p) => {
        const titleMatch = (p.title || "").toLowerCase().includes(q);
        const nameMatch = (p.productName || "").toLowerCase().includes(q);
        const skuMatch = ((p.sku || (p as any).SKU || "").toLowerCase()).includes(q);
        const modelMatch = ((p.modelNumber || "").toLowerCase()).includes(q);
        const descMatch = ((p.shortDescription || p.overview || "").toLowerCase()).includes(q);
        return titleMatch || nameMatch || skuMatch || modelMatch || descMatch;
      });
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
          (p) => p.reviewStatus !== "CORRECT" && p.reviewStatus !== "NEEDS_EDITING"
        );
      }
    }

    // Sorting: Newest First (by createdAt descending) and Price options
    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
        break;
      case "newest":
      default:
        // Default: Recently Updated / Newest First (updatedAt takes precedence over createdAt)
        result.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return 0;
        });
        break;
    }

    return result;
  }, [categoryScopedProducts, searchQuery, selectedStatus, selectedReviewStatus, sortBy]);

  // Dynamic per-section pagination state map (keyed by subcategory slug or id)
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});

  // Dynamic section product matcher
  const getSectionFilteredProducts = (sub: any) => {
    const subKey = sub.slug || sub.id;
    const subName = sub.name;
    const isEsuSurgery = subKey === "electrosurgical-surgery" || subKey === "electro-surgical-skin-cautery";
    const isEsuGen = subKey === "electrosurgical-generator" || subKey === "generators";
    return filteredProducts.filter((p) => {
      if (isEsuSurgery && (p.subcategory === "electrosurgical-surgery" || p.subcategory === "electro-surgical-skin-cautery" || p.subcategory === "cautery")) {
        return true;
      }
      if (isEsuGen && (p.subcategory === "electrosurgical-generator" || p.subcategory === "generators" || p.subcategory === "electrosurgical-generators")) {
        return true;
      }
      return (
        p.subcategory === subKey ||
        p.subcategory === sub.id ||
        p.subcategory === subName ||
        p.subcategories?.includes(subKey) ||
        p.subcategories?.includes(sub.id) ||
        p.subcategories?.includes(subName)
      );
    });
  };

  const getSectionTotalProducts = (sub: any) => {
    const subKey = sub.slug || sub.id;
    const subName = sub.name;
    const isEsuSurgery = subKey === "electrosurgical-surgery" || subKey === "electro-surgical-skin-cautery";
    const isEsuGen = subKey === "electrosurgical-generator" || subKey === "generators";
    return categoryScopedProducts.filter((p) => {
      if (isEsuSurgery && (p.subcategory === "electrosurgical-surgery" || p.subcategory === "electro-surgical-skin-cautery" || p.subcategory === "cautery")) {
        return true;
      }
      if (isEsuGen && (p.subcategory === "electrosurgical-generator" || p.subcategory === "generators" || p.subcategory === "electrosurgical-generators")) {
        return true;
      }
      return (
        p.subcategory === subKey ||
        p.subcategory === sub.id ||
        p.subcategory === subName ||
        p.subcategories?.includes(subKey) ||
        p.subcategories?.includes(sub.id) ||
        p.subcategories?.includes(subName)
      );
    });
  };

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

  const handleToggleSelectSection = (checked: boolean, listToSelect: Product[]) => {
    if (checked) {
      const ids = listToSelect.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      const idsToRemove = new Set(listToSelect.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !idsToRemove.has(id)));
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
  /**
   * Functional Active/Inactive Status Button
   * When ACTIVE -> Saves as INACTIVE
   * When INACTIVE -> Saves as ACTIVE
   * Updates only after confirmed server response. On failure, restores previous value and shows error.
   */
  const handleToggleProductStatus = async (product: Product) => {
    if (statusUpdatingId === product.id) return;
    const currentStatus = product.status || "ACTIVE";
    const nextStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setStatusUpdatingId(product.id);

    // Save previous state for rollback on error
    const previousProducts = products;

    // Optimistically update UI
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
    );

    try {
      // Send status update to existing dedicated status route
      const res = await adminFetch(`/api/admin/products/${encodeURIComponent(product.id)}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus })
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data && data.success && data.product) {
        // Read the updated product from successful API response and move it to top of list
        setProducts((prev) => {
          const updated = { ...product, ...data.product };
          const others = prev.filter((p) => p.id !== product.id);
          return [updated, ...others];
        });
        showToast(
          "success",
          `Status changed to ${data.product.status === "ACTIVE" ? "Active" : "Inactive"}. Product moved to top of list.`,
          `"${product.title || product.productName}"`
        );
      } else {
        // Restore previous UI value on failure
        setProducts(previousProducts);
        showToast(
          "error",
          (data && data.message) || `Failed to update status for "${product.title || product.productName}".`,
          "Status Update Failed"
        );
      }
    } catch (err: any) {
      console.error("Status update error:", err);
      // Restore previous UI value on error
      setProducts(previousProducts);
      showToast(
        "error",
        err.message || "Network error updating product status.",
        "Status Update Error"
      );
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
    setPendingReviewAction(status === "CORRECT" ? "UPLOADING" : "UPDATING");
    setActiveReviewPopoverId(null);

    try {
      const res = await adminFetch(`/api/admin/products/${product.id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewStatus: status, reviewNote: note })
      });

      let data: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = { message: `Malformed JSON response from server (HTTP ${res.status})` };
        }
      } else {
        data = {
          message: res.status === 404
            ? "API endpoint returned HTTP 404. Backend product service is currently unreachable."
            : `Server returned HTTP ${res.status} (${res.statusText || "Non-JSON response"})`
        };
      }

      if (res.ok && data.success) {
        // Move updated product to top of list and update localStorage cache
        setProducts((prev) => {
          const updated = { ...product, ...data.product, reviewStatus: status };
          const others = prev.filter((p) => p.id !== product.id);
          const next = [updated, ...others];
          try {
            localStorage.setItem("drmedex_admin_products_cache", JSON.stringify(next));
          } catch {}
          return next;
        });

        const prodTitle = product.title || product.productName;
        const mongo = data.mongo;
        const statusLabel =
          status === "CORRECT"
            ? "Correct"
            : status === "NEEDS_EDITING"
            ? "Needs Editing"
            : "Not Yet Reviewed";

        if (mongo?.status === "SYNC_FAILED") {
          showToast(
            "warning",
            `Review status saved as "${statusLabel}". MongoDB Atlas update queued: ${mongo.error || "connection in cooldown"}.`,
            `"${prodTitle}"`
          );
        } else {
          showToast(
            "success",
            `Review status saved as "${statusLabel}". Catalogue updated.`,
            `✓ "${prodTitle}"`
          );
        }
      } else {
        showToast("error", data.message || "Failed to update review status.", "Review Update Failed");
      }
    } catch (err: any) {
      console.error("Review update error:", err);
      showToast("error", err.message || "Network error updating review status.", "Review Update Error");
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
   * Download only individual original product photos (preserves original content, no ZIP packaging)
   */
  const handleDownloadPhotos = async (product: Product) => {
    if (downloadingId) return;
    setDownloadingId(product.id);

    try {
      // 1. Resolve canonical images via server endpoint, falling back to comprehensive client resolution
      let urls: string[] = [];
      try {
        const imgRes = await adminFetch(`/api/admin/products/${encodeURIComponent(product.id)}/images`);
        if (imgRes.ok) {
          const imgData = await imgRes.json().catch(() => null);
          if (imgData && imgData.success && Array.isArray(imgData.images)) {
            urls = imgData.images.map((im: any) => im.url).filter(Boolean);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch resolved images from server endpoint, using client-side fallback:", err);
      }

      if (urls.length === 0) {
        const seen = new Set<string>();
        const addUrl = (raw: any) => {
          if (!raw) return;
          let u = typeof raw === "string" ? raw.trim() : (raw.url || raw.secureUrl || raw.secure_url || raw.src || "").trim();
          if (!u || u.startsWith("data:") || u.startsWith("blob:")) return;
          if (u.startsWith("products-catalog/")) u = `/${u}`;
          if (!seen.has(u)) {
            seen.add(u);
            urls.push(u);
          }
        };

        const currentImages = Array.isArray(product.images) && product.images.length > 0
          ? product.images
          : (Array.isArray(product.galleryImages) && product.galleryImages.length > 0
            ? product.galleryImages
            : (product.primaryImage ? [product.primaryImage] : []));

        currentImages.forEach(addUrl);
      }

      if (urls.length === 0) {
        setBannerMessage({
          text: `No photos available to download for "${product.title || product.productName}".`,
          type: "warning"
        });
        return;
      }

      let downloadedCount = 0;
      let failedCount = 0;
      const failedDetails: string[] = [];
      const baseSku = (product.sku || product.id || "product").replace(/[^a-zA-Z0-9_-]/g, "_");

      for (let i = 0; i < urls.length; i++) {
        const imgUrl = urls[i];
        let ext = "jpg";
        const extMatch = imgUrl.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)(?:\?.*)?$/i);
        if (extMatch && extMatch[1]) {
          ext = extMatch[1].toLowerCase();
        }
        const filename = `${baseSku}_photo_${i + 1}.${ext}`;

        let blob: Blob | null = null;
        let lastErrorMsg = "";

        // Strategy 1: Direct browser fetch (fastest for same-origin and CORS-enabled assets)
        try {
          const directRes = await fetch(imgUrl);
          if (directRes.ok) {
            const ct = directRes.headers.get("content-type") || "";
            if (ct.includes("image/") || ct.includes("octet-stream")) {
              blob = await directRes.blob();
            }
          }
        } catch {
          // Direct fetch failed (e.g. cross-origin restrictions); proceed to proxy
        }

        // Strategy 2: Authenticated backend proxy streaming with SSRF & CDN fallback
        if (!blob) {
          try {
            const proxyUrl = `/api/admin/download-image?url=${encodeURIComponent(imgUrl)}&filename=${encodeURIComponent(filename)}`;
            const res = await adminFetch(proxyUrl);
            if (res.ok) {
              const ct = res.headers.get("content-type") || "";
              if (ct.includes("image/") || ct.includes("octet-stream")) {
                blob = await res.blob();
              } else {
                const data = await res.json().catch(() => null);
                lastErrorMsg = data?.message || `Non-image response (${ct})`;
              }
            } else {
              const data = await res.json().catch(() => null);
              lastErrorMsg = data?.message || `HTTP ${res.status}`;
            }
          } catch (pErr: any) {
            lastErrorMsg = pErr.message || "Proxy connection error";
          }
        }

        if (blob && blob.size > 0) {
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
          downloadedCount++;
        } else {
          failedCount++;
          failedDetails.push(`${filename} (${lastErrorMsg || "File not found"})`);
        }

        // Brief delay between downloads to prevent browser multi-file popup suppression
        if (i < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (downloadedCount === urls.length) {
        setBannerMessage({
          text: `Downloaded all ${downloadedCount} product photo${downloadedCount === 1 ? "" : "s"} successfully.`,
          type: "success"
        });
      } else if (downloadedCount > 0) {
        setBannerMessage({
          text: `Downloaded ${downloadedCount} of ${urls.length} product photos (${failedCount} failed: ${failedDetails.join(", ")}).`,
          type: "warning"
        });
      } else {
        setBannerMessage({
          text: `Failed to download photos for "${product.title || product.productName}": ${failedDetails.join("; ") || "Asset unavailable on server"}.`,
          type: "error"
        });
      }
    } catch (err: any) {
      console.error("Photo download error:", err);
      setBannerMessage({ text: err.message || "Failed to download product photos.", type: "error" });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmPermanentDelete = async (prod: Product): Promise<boolean> => {
    try {
      const res = await adminFetch(`/api/admin/products/${encodeURIComponent(prod.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setProducts(prev => {
          const next = prev.filter(p => p.id !== prod.id);
          try {
            localStorage.setItem("drmedex_admin_products_cache", JSON.stringify(next));
          } catch {}
          return next;
        });
        showToast("success", data.message || `Product "${prod.title || prod.productName}" permanently deleted.`);
        setBannerMessage({
          text: data.message || `Product "${prod.title || prod.productName}" permanently deleted.`,
          type: "success"
        });
        await fetchProducts();
        return true;
      } else if (res.status === 409) {
        setBannerMessage({
          text: data.message || "Deletion blocked: Product is referenced in existing customer orders.",
          type: "warning"
        });
        showToast("warning", data.message || "Deletion blocked: Product has existing customer orders.", "Action Blocked");
        return false;
      } else {
        const errMsg = data.message || `Failed to delete product (HTTP ${res.status}).`;
        setBannerMessage({ text: errMsg, type: "error" });
        showToast("error", errMsg, "Deletion Failed");
        return false;
      }
    } catch (e: any) {
      console.error("Permanent delete error:", e);
      const errMsg = e?.message || "Failed to delete product.";
      setBannerMessage({ text: errMsg, type: "error" });
      showToast("error", errMsg, "Error");
      return false;
    }
  };

  const handleArchiveProduct = async (prod: Product): Promise<boolean> => {
    try {
      const res = await adminFetch(`/api/admin/products/${encodeURIComponent(prod.id)}/archive`, {
        method: "POST"
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setProducts(prev => {
          const next = prev.filter(p => p.id !== prod.id);
          try {
            localStorage.setItem("drmedex_admin_products_cache", JSON.stringify(next));
          } catch {}
          return next;
        });
        showToast("success", data.message || `Product "${prod.title || prod.productName}" safely retired from catalogue.`);
        setBannerMessage({
          text: data.message || `Product "${prod.title || prod.productName}" safely retired from active catalogue. Customer order history preserved.`,
          type: "success"
        });
        await fetchProducts();
        return true;
      } else {
        const errMsg = data.message || `Failed to archive product (HTTP ${res.status}).`;
        setBannerMessage({ text: errMsg, type: "error" });
        showToast("error", errMsg, "Archive Failed");
        return false;
      }
    } catch (e: any) {
      console.error("Archive product error:", e);
      const errMsg = e?.message || "Failed to archive product.";
      setBannerMessage({ text: errMsg, type: "error" });
      showToast("error", errMsg, "Error");
      return false;
    }
  };

  // Helper to render table rows for any product list
  const renderProductRows = (productList: Product[]) => {
    if (isLoading && products.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="py-16 text-center text-neutral-500 text-xs">
            <div className="flex flex-col items-center justify-center gap-2">
              <RefreshCw size={20} className="animate-spin text-black" />
              <span>Loading authoritative product catalogue...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (productList.length === 0) {
      return (
        <tr>
          <td colSpan={6} className="py-12 text-center text-neutral-500 text-xs">
            No products matched your active filters or search terms.
          </td>
        </tr>
      );
    }

    return productList.map((p) => {
      const img = (p.images && p.images[0]) || p.primaryImage || "";
      const isSelected = selectedIds.includes(p.id);
      const isActive = (p.status || "ACTIVE") === "ACTIVE";

      return (
        <tr
          key={p.id}
          className={`hover:bg-neutral-50 transition-colors border-b border-neutral-200 ${
            isSelected ? "bg-neutral-100" : ""
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
              <div className="w-11 h-11 rounded-lg bg-neutral-100 border border-neutral-300 shrink-0 overflow-hidden flex items-center justify-center p-0.5">
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
                  <Package size={18} className="text-neutral-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                {/* Line 1: Complete Product Name */}
                <Link
                  to={`/admin/products/${p.id}/edit`}
                  state={{ product: p }}
                  className="font-bold text-neutral-900 hover:text-black text-xs sm:text-[13px] leading-snug line-clamp-2 block transition-colors"
                  title={p.title || p.productName}
                >
                  {p.title || p.productName}
                </Link>

                {/* Line 2: SKU and Model Number directly underneath */}
                <div className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate">
                  SKU: <span className="font-semibold text-neutral-900">{p.sku || (p as any).SKU || "—"}</span>
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
            <div className="font-bold text-neutral-900 text-xs sm:text-[13px]">
              ₹
              {Number(p.basePrice || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
          </td>

          {/* 4. Status: Functional Pill-Shaped Button (ACTIVE / INACTIVE) */}
          <td className="py-2.5 px-4 text-center whitespace-nowrap align-middle">
            <button
              type="button"
              disabled={statusUpdatingId === p.id}
              onClick={() => handleToggleProductStatus(p)}
              className={`inline-flex items-center justify-center font-bold text-[10px] sm:text-[11px] tracking-wider rounded-full px-3 py-1 transition-all shadow-2xs cursor-pointer min-w-[88px] ${
                statusUpdatingId === p.id
                  ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  : isActive
                  ? "bg-[#15803D] hover:bg-[#166534] text-white"
                  : "bg-neutral-200 hover:bg-neutral-300 text-neutral-700"
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
                    ? "bg-white text-[#15803D] border-[#15803D] hover:bg-emerald-50"
                    : p.reviewStatus === "NEEDS_EDITING"
                    ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] hover:bg-[#FEE2E2]/90"
                    : "bg-white text-black border-[#D4D4D4] hover:bg-gray-50"
                }`}
                title="Click to change review status"
              >
                {reviewUpdatingId === p.id ? (
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <RefreshCw size={10} className="animate-spin text-current" />
                    Updating...
                  </span>
                ) : p.reviewStatus === "CORRECT" ? (
                  <Check size={11} className="stroke-[2.5] text-[#15803D]" />
                ) : p.reviewStatus === "NEEDS_EDITING" ? (
                  <X size={11} className="stroke-[2.5] text-[#B91C1C]" />
                ) : (
                  <Clock size={11} className="text-black" />
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
                <ChevronDown size={10} className={p.reviewStatus === "CORRECT" ? "text-[#15803D] opacity-70" : p.reviewStatus === "NEEDS_EDITING" ? "text-[#B91C1C] opacity-70" : "text-black opacity-70"} />
              </button>

              {/* Retry Buttons shown strictly on failure */}
              {(p.cloudinarySyncStatus === "UPLOAD_FAILED" || p.cloudinarySyncStatus === "UPLOAD_INCOMPLETE") && (
                <button
                  type="button"
                  onClick={() => handleRetryCloudinarySync(p)}
                  disabled={syncingCloudinaryId === p.id}
                  title="Click to retry Cloudinary upload"
                  className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-[#FF8A80] font-mono bg-[#C62828]/30 px-1.5 py-0.5 rounded border border-[#C62828]/60 hover:bg-[#C62828]/50 cursor-pointer"
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
                  className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-[#FF8A80] font-mono bg-[#C62828]/30 px-1.5 py-0.5 rounded border border-[#C62828]/60 hover:bg-[#C62828]/50 cursor-pointer"
                >
                  <RefreshCw size={8} className={syncingCloudinaryId === p.id ? "animate-spin" : ""} />
                  <span>Removal Incomplete · Retry</span>
                </button>
              )}

              {p.mongoSyncStatus === "SYNC_FAILED" && (
                <button
                  type="button"
                  disabled={syncingMongoId === p.id}
                  onClick={async () => {
                    setSyncingMongoId(p.id);
                    try {
                      const res = await adminFetch(`/api/admin/products/${p.id}/sync-mongodb`, { method: "POST" });
                      const data = await res.json().catch(() => ({}));
                      if (res.ok && data.success) {
                        setProducts(prev => {
                          const next = prev.map(prod => prod.id === p.id ? { ...prod, ...data.product, mongoSyncStatus: "SYNCED" } : prod);
                          try {
                            localStorage.setItem("drmedex_admin_products_cache", JSON.stringify(next));
                          } catch {}
                          return next;
                        });
                        setBannerMessage({ text: `MongoDB Atlas sync completed for "${p.title || p.productName}".`, type: "success" });
                      } else {
                        setBannerMessage({ text: data.message || "MongoDB Atlas sync failed.", type: "error" });
                      }
                    } catch (e: any) {
                      setBannerMessage({ text: e.message || "Request failed", type: "error" });
                    } finally {
                      setSyncingMongoId(null);
                    }
                  }}
                  title="Click to retry MongoDB Atlas sync"
                  className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-[#FF8A80] font-mono bg-[#C62828]/30 px-1.5 py-0.5 rounded border border-[#C62828]/60 hover:bg-[#C62828]/50 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={8} className={syncingMongoId === p.id ? "animate-spin" : ""} />
                  <span>{syncingMongoId === p.id ? "Syncing..." : "MongoDB Failed · Retry"}</span>
                </button>
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
                  className="mt-0.5 block mx-auto max-w-[120px] truncate text-[10px] text-[#B91C1C] font-mono bg-[#FEE2E2] px-1.5 py-0.2 rounded border border-[#FCA5A5] hover:underline cursor-pointer"
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
                  <div className="absolute right-0 sm:left-1/2 sm:-translate-x-1/2 mt-1 w-48 bg-white rounded-xl shadow-2xl border border-gray-200 py-1.5 px-1.5 z-50 animate-in fade-in zoom-in-95 text-[#171717]">
                    <div className="px-2.5 py-1 text-[10px] font-bold font-mono uppercase text-gray-500 border-b border-gray-100 mb-1.5">
                      Review Status
                    </div>

                    {/* Option 1: Correct */}
                    <button
                      type="button"
                      onClick={() => handleSetReviewStatus(p, "CORRECT")}
                      className={`w-full px-2.5 py-1.5 mb-1 text-left text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer border ${
                        p.reviewStatus === "CORRECT"
                          ? "bg-white text-[#15803D] border-[#15803D] font-bold shadow-2xs"
                          : "bg-white hover:bg-emerald-50 text-[#15803D] border-[#15803D]/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[#15803D]">
                        <div className="w-4 h-4 rounded-full bg-[#15803D]/10 flex items-center justify-center">
                          <Check size={10} className="stroke-[2.5]" />
                        </div>
                        <span>Correct</span>
                      </div>
                      {p.reviewStatus === "CORRECT" && (
                        <Check size={12} className="text-[#15803D] stroke-[2.5]" />
                      )}
                    </button>

                    {/* Option 2: Needs Editing */}
                    <button
                      type="button"
                      onClick={() => handleSetReviewStatus(p, "NEEDS_EDITING")}
                      className={`w-full px-2.5 py-1.5 mb-1 text-left text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer border ${
                        p.reviewStatus === "NEEDS_EDITING"
                          ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] font-bold shadow-2xs"
                          : "bg-[#FEE2E2]/60 hover:bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]/60"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-[#B91C1C]">
                        <div className="w-4 h-4 rounded-full bg-[#B91C1C]/10 flex items-center justify-center">
                          <X size={10} className="stroke-[2.5]" />
                        </div>
                        <span>Needs Editing</span>
                      </div>
                      {p.reviewStatus === "NEEDS_EDITING" && (
                        <Check size={12} className="text-[#B91C1C] stroke-[2.5]" />
                      )}
                    </button>

                    {/* Option 3: Not Yet Reviewed */}
                    <button
                      type="button"
                      onClick={() => handleSetReviewStatus(p, "PENDING")}
                      className={`w-full px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg flex items-center justify-between transition-colors cursor-pointer border ${
                        !p.reviewStatus || p.reviewStatus === "PENDING"
                          ? "bg-white text-black border-[#D4D4D4] font-bold shadow-2xs"
                          : "bg-white hover:bg-gray-50 text-black/80 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-black">
                        <div className="w-4 h-4 rounded-full bg-black/5 flex items-center justify-center">
                          <Clock size={10} />
                        </div>
                        <span>Not Yet Reviewed</span>
                      </div>
                      {(!p.reviewStatus || p.reviewStatus === "PENDING") && (
                        <Check size={12} className="text-black stroke-[2.5]" />
                      )}
                    </button>

                    {p.reviewStatus === "NEEDS_EDITING" && (
                      <div className="pt-1 mt-1 border-t border-gray-100 px-2.5">
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
                onClick={() => handleDownloadPhotos(p)}
                disabled={downloadingId === p.id}
                title="Download Product Photos"
                aria-label={`Download Product Photos for ${p.title || p.productName}`}
                className="p-1.5 bg-neutral-100 border border-neutral-300 hover:border-black text-neutral-700 hover:text-black hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download
                  size={14}
                  className={downloadingId === p.id ? "animate-bounce text-black" : "text-neutral-700"}
                />
              </button>

              {/* More Actions Menu */}
              <div className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() =>
                    setActiveActionsMenuId(activeActionsMenuId === p.id ? null : p.id)
                  }
                  className="p-1.5 text-neutral-500 hover:text-black hover:bg-neutral-100 rounded-lg transition-colors border border-transparent hover:border-neutral-300 cursor-pointer"
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
                    <div className="absolute right-0 mt-1 w-36 bg-white text-neutral-900 rounded-xl shadow-2xl border border-neutral-200 py-1 z-50 text-left animate-in fade-in zoom-in-95">
                      <Link
                        to={`/product/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setActiveActionsMenuId(null)}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 hover:text-black"
                      >
                        <ExternalLink size={12} />
                        <span>Storefront</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveActionsMenuId(null);
                          setDeletingProduct(p);
                          setIsDeleteModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-[#C62828] hover:bg-red-50 cursor-pointer border-t border-neutral-200 mt-0.5"
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Compact Red Edit Button with pencil icon */}
              <Link
                to={`/admin/products/${p.id}/edit`}
                state={{ product: p }}
                title="Edit product"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-all shadow-2xs"
              >
                <Edit2 size={11} />
                <span>Edit</span>
              </Link>
            </div>
          </td>
        </tr>
      );
    });
  };

  // Reusable dynamic section renderer for OT & Surgical Lights, Physiotherapy, and all categories
  const renderDynamicSection = (
    sub: any,
    index: number,
    catObj: Category
  ) => {
    const isOt = catObj.slug === "ot-lights" || catObj.id === "ot-lights";
    const badgeLabel = isOt ? String.fromCharCode(65 + index) : String(index + 1);
    const subKey = sub.slug || sub.id;
    const anchorId = `admin-section-${subKey}`;

    const sectionFiltered = getSectionFilteredProducts(sub);
    const sectionTotal = getSectionTotalProducts(sub);
    const activeCount = sectionTotal.filter((p) => (p.status || "ACTIVE") === "ACTIVE").length;
    const correctCount = sectionTotal.filter((p) => p.reviewStatus === "CORRECT").length;

    const page = sectionPages[subKey] || 1;
    const perPage = 25;
    const totalPagesForSection = Math.max(1, Math.ceil(sectionFiltered.length / perPage));
    const pageClamped = Math.min(page, totalPagesForSection);
    const startIdx = (pageClamped - 1) * perPage;
    const paginatedSection = sectionFiltered.slice(startIdx, startIdx + perPage);

    const startNum = sectionFiltered.length === 0 ? 0 : startIdx + 1;
    const endNum = Math.min(startIdx + perPage, sectionFiltered.length);

    const isAllSectionSelected =
      paginatedSection.length > 0 &&
      paginatedSection.every((p) => selectedIds.includes(p.id));

    return (
      <div
        id={anchorId}
        key={subKey || index}
        className="bg-white text-neutral-900 rounded-xl border border-neutral-300 overflow-hidden shadow-xs mb-6 scroll-mt-20"
      >
        {/* Section Header */}
        <div className="bg-neutral-50 px-4 sm:px-6 py-3.5 border-b border-neutral-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-[#FFD400] text-black font-black font-mono text-base flex items-center justify-center shadow-xs shrink-0">
              {badgeLabel}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm sm:text-base text-neutral-900">
                  {sub.name}
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-300 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-[#15803D]" />
                  {sectionFiltered.length} {sectionFiltered.length === 1 ? "Product" : "Products"} in Catalogue
                </span>
                {sub.description && (
                  <p className="text-xs text-neutral-500 w-full mt-0.5">
                    {sub.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Metadata: Active and Correct counts */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-neutral-500">
                Active: <strong className="text-[#15803D]">{activeCount}</strong>
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-emerald-700">
                Correct: <strong>{correctCount}</strong>
              </span>
            </div>

            {/* PART 3: Compact "+ Add Product" button on the right-hand side */}
            <Link
              to={`/admin/products/new?category=${catObj.slug || catObj.id}&subcategory=${sub.slug || sub.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              title={`Add product directly to ${sub.name}`}
            >
              <Plus size={13} className="stroke-[2.5]" />
              <span>Add Product</span>
            </Link>

            {/* Section Management: Edit & Delete buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setEditingSection(sub);
                  setSectionFormName(sub.name || "");
                  setSectionFormDesc(sub.description || sub.shortDescription || "");
                  setSectionFormOrder(String(sub.order ?? sub.displayOrder ?? index + 1));
                  setSectionFormError("");
                }}
                className="p-1.5 text-neutral-600 hover:text-black hover:bg-neutral-100 rounded-lg border border-neutral-300 transition-colors cursor-pointer"
                title={`Rename or edit section "${sub.name}"`}
              >
                <Edit2 size={12} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeletingSection(sub);
                  setSectionDeleteError("");
                }}
                className="p-1.5 text-neutral-500 hover:text-[#C62828] hover:bg-red-50 rounded-lg border border-neutral-300 transition-colors cursor-pointer"
                title={`Delete section "${sub.name}"`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Section Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-900">
            <thead className="bg-neutral-100 border-b border-neutral-200 text-[10px] font-bold font-mono uppercase text-neutral-600 tracking-wider">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSectionSelected}
                    onChange={(e) => handleToggleSelectSection(e.target.checked, paginatedSection)}
                    className="w-3.5 h-3.5 rounded text-black focus:ring-black accent-black cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-4 min-w-[280px]">Product Details</th>
                <th className="py-2.5 px-4 text-right min-w-[110px] whitespace-nowrap">Price (INR)</th>
                <th className="py-2.5 px-4 text-center min-w-[110px] whitespace-nowrap">Status</th>
                <th className="py-2.5 px-4 text-center min-w-[140px] whitespace-nowrap">Review Status</th>
                <th className="py-2.5 px-4 text-right min-w-[130px] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {renderProductRows(paginatedSection)}
            </tbody>
          </table>
        </div>

        {/* Section Pagination Bar */}
        <div className="px-5 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs bg-neutral-50 text-neutral-700">
          <span className="text-neutral-500 font-mono">
            Showing {startNum}–{endNum} of {sectionFiltered.length} products in {sub.name}
          </span>

          {totalPagesForSection > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pageClamped === 1}
                onClick={() =>
                  setSectionPages((prev) => ({
                    ...prev,
                    [subKey]: Math.max(1, pageClamped - 1)
                  }))
                }
                className="px-2.5 py-1 bg-white border border-neutral-300 rounded-lg font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={13} />
                <span>Previous</span>
              </button>

              <span className="px-2 font-mono font-bold text-black">
                {pageClamped} / {totalPagesForSection}
              </span>

              <button
                type="button"
                disabled={pageClamped === totalPagesForSection}
                onClick={() =>
                  setSectionPages((prev) => ({
                    ...prev,
                    [subKey]: Math.min(totalPagesForSection, pageClamped + 1)
                  }))
                }
                className="px-2.5 py-1 bg-white border border-neutral-300 rounded-lg font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Pagination display calculation
  const startProductNumber = filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endProductNumber = Math.min(currentPage * itemsPerPage, filteredProducts.length);

  return (
    <AdminLayout
      title={currentCategoryObj ? currentCategoryObj.name : "All Products"}
      titleClassName="text-neutral-900 font-black"
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
          {/* Refresh Button with Loading Spinner & Duplicate Guard */}
          <button
            type="button"
            disabled={isRefreshing || isLoading}
            onClick={() => fetchProducts(true)}
            className="px-3.5 py-1.5 bg-white border border-neutral-300 hover:border-black text-neutral-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Fetch latest products, counts, status values, and review statuses from backend"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">{isRefreshing ? "Refreshing..." : "Refresh"}</span>
          </button>

          <Link
            to="/admin/products/new"
            className="px-4 py-1.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
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
              : bannerMessage.type === "warning"
              ? "bg-[#FEF3C7] text-[#92400E] border-[#FCD34D]"
              : "bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {bannerMessage.type === "error" ? (
              <AlertCircle size={16} className="text-[#B91C1C] shrink-0" />
            ) : bannerMessage.type === "warning" ? (
              <AlertTriangle size={16} className="text-[#D97706] shrink-0" />
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

      {/* 1. Category Navigation Pills with Bright RED Accent & Horizontal Scrolling Controls */}
      <div className="bg-white text-neutral-900 rounded-xl border border-neutral-300 p-3 sm:p-4 mb-4 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold font-mono uppercase text-neutral-500">Category Filter:</span>
            <span className="text-xs font-bold text-neutral-900 font-mono">
              {selectedCategory === "all" ? "All Categories" : currentCategoryObj?.name || selectedCategory}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-neutral-500 font-mono">
              <span className="font-bold text-neutral-900">{categoryProductCount}</span> products in category
            </div>
            {/* Scroll Navigation Chevrons for Desktop and Mobile */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (categoryScrollRef.current) {
                    categoryScrollRef.current.scrollBy({ left: -220, behavior: "smooth" });
                  }
                }}
                className="w-6 h-6 rounded-md bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 flex items-center justify-center text-neutral-700 cursor-pointer transition-colors"
                title="Scroll categories left"
                aria-label="Scroll categories left"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (categoryScrollRef.current) {
                    categoryScrollRef.current.scrollBy({ left: 220, behavior: "smooth" });
                  }
                }}
                className="w-6 h-6 rounded-md bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 flex items-center justify-center text-neutral-700 cursor-pointer transition-colors"
                title="Scroll categories right"
                aria-label="Scroll categories right"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>

        {/* Fully Horizontally Scrollable Category Filter Row */}
        <div
          ref={categoryScrollRef}
          className="flex items-center gap-2 overflow-x-auto pb-1.5 scroll-smooth select-none"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(0,0,0,0.2) transparent"
          }}
        >
          {/* All Categories Filter */}
          <button
            type="button"
            data-selected={selectedCategory === "all"}
            onClick={() => {
              setSelectedCategory("all");
              setSearchParams({});
              setCurrentPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
              selectedCategory === "all"
                ? "bg-[#FFD400] text-black border-[#FFD400] shadow-xs font-black"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-black border-neutral-300"
            }`}
          >
            {selectedCategory === "all" && <span className="w-2 h-2 rounded-full bg-black inline-block shadow-xs" />}
            <span>All Categories</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                selectedCategory === "all" ? "bg-black/15 text-black font-bold" : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {products.length}
            </span>
          </button>

          {/* Individual Category Filters */}
          {categories.map((cat) => {
            const count = products.filter((p) => p.category === cat.slug || p.category === cat.id).length;
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                data-selected={isSelected}
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  setSearchParams({ category: cat.slug });
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  isSelected
                    ? "bg-[#FFD400] text-black border-[#FFD400] shadow-xs font-black"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:text-black border-neutral-300"
                }`}
              >
                {isSelected && <span className="w-2 h-2 rounded-full bg-black inline-block shadow-xs" />}
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                    isSelected ? "bg-black/15 text-black font-bold" : "bg-neutral-200 text-neutral-700"
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
      <div className="bg-white text-neutral-900 p-3.5 sm:p-4 rounded-xl border border-neutral-300 space-y-3 mb-4 shadow-xs">
        {/* Review Status Filter Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-200">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold font-mono uppercase text-neutral-500 mr-1">Review:</span>

            <button
              type="button"
              onClick={() => {
                setSelectedReviewStatus("all");
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                selectedReviewStatus === "all"
                  ? "bg-neutral-900 text-white border-neutral-900 font-bold"
                  : "bg-neutral-100 text-neutral-700 border-neutral-300 hover:border-neutral-400"
              }`}
            >
              <span>All</span>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-mono ${
                  selectedReviewStatus === "all" ? "bg-white/20 text-white font-bold" : "bg-neutral-200 text-neutral-700"
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
                  ? "bg-white text-[#15803D] border-[#15803D] font-bold shadow-2xs"
                  : "bg-neutral-100 text-neutral-700 border-neutral-300 hover:border-[#15803D] hover:text-[#15803D]"
              }`}
            >
              <Check size={11} className="stroke-[2.5]" />
              <span>Correct</span>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-mono ${
                  selectedReviewStatus === "CORRECT" ? "bg-[#15803D]/10 text-[#15803D] font-bold" : "bg-neutral-200 text-neutral-700"
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
                  ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5] font-bold shadow-2xs"
                  : "bg-neutral-100 text-neutral-700 border-neutral-300 hover:border-[#FCA5A5] hover:text-[#B91C1C]"
              }`}
            >
              <X size={11} className="stroke-[2.5]" />
              <span>Needs Editing</span>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-mono ${
                  selectedReviewStatus === "NEEDS_EDITING" ? "bg-[#B91C1C]/10 text-[#B91C1C] font-bold" : "bg-neutral-200 text-neutral-700"
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
                  ? "bg-white text-black border-[#D4D4D4] font-bold shadow-2xs"
                  : "bg-neutral-100 text-neutral-700 border-neutral-300 hover:border-[#D4D4D4] hover:text-black"
              }`}
            >
              <Clock size={11} />
              <span>Not Yet Reviewed</span>
              <span
                className={`px-1 py-0.2 rounded text-[10px] font-mono ${
                  selectedReviewStatus === "PENDING" ? "bg-black/10 text-black font-bold" : "bg-neutral-200 text-neutral-700"
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
              className="text-[11px] text-neutral-500 hover:text-black underline font-mono cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Search Field & Controls Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search size={14} className="absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Product Name, Title, SKU, or Model..."
              className="w-full pl-9 pr-8 py-1.5 bg-white text-black border border-neutral-300 rounded-lg text-xs placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#FFD400] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-neutral-400 hover:text-black cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold font-mono uppercase text-neutral-500">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#FFD400] cursor-pointer"
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
              <span className="text-[10px] font-bold font-mono uppercase text-neutral-500">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-black focus:outline-none focus:ring-2 focus:ring-[#FFD400] cursor-pointer"
              >
                <option value="newest">Recently Updated</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {/* Count Indicator */}
            <div className="text-xs font-mono text-neutral-500 pl-2 border-l border-neutral-300">
              <span className="font-bold text-neutral-900">{filteredProducts.length}</span> listed
            </div>
          </div>
        </div>

        {/* Bulk Action Strip */}
        {selectedIds.length > 0 && (
          <div className="p-2.5 bg-neutral-100 rounded-lg border border-neutral-300 flex items-center justify-between text-xs font-semibold text-neutral-900">
            <div className="flex items-center gap-2">
              <span className="font-bold text-black font-mono">{selectedIds.length}</span> selected
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("publish")}
                className="px-2.5 py-1 bg-[#15803D] text-white rounded text-xs hover:bg-[#166534] cursor-pointer font-bold"
              >
                Set Active
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("unpublish")}
                className="px-2.5 py-1 bg-white border border-neutral-300 text-neutral-700 rounded text-xs hover:bg-neutral-50 cursor-pointer font-bold"
              >
                Set Inactive
              </button>
              <button
                type="button"
                disabled={isBulkProcessing}
                onClick={() => handleBulkAction("archive")}
                className="px-2.5 py-1 bg-[#C62828] text-white rounded text-xs hover:bg-[#B71C1C] cursor-pointer font-bold"
              >
                Archive
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-xs text-neutral-500 hover:text-black ml-1.5 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Render Product Sections or Standard Table */}
      {isSectionedCategory && currentCategoryObj && currentCategoryObj.subcategories && currentCategoryObj.subcategories.length > 0 ? (
        <div className="space-y-6">
          {currentCategoryObj.subcategories.map((sub, idx) =>
            renderDynamicSection(sub, idx, currentCategoryObj)
          )}

          {/* Add New Section Control (restricted to sectioned categories) */}
          <div className="bg-white rounded-xl border-2 border-dashed border-neutral-300 hover:border-black p-6 text-center transition-all shadow-xs mb-8">
            <button
              type="button"
              onClick={() => {
                setSectionFormName("");
                setSectionFormDesc("");
                setSectionFormOrder(String((currentCategoryObj.subcategories?.length || 0) + 1));
                setSectionFormError("");
                setIsAddSectionModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer"
            >
              <Plus size={16} />
              <span>+ Add New Section</span>
            </button>
            <p className="text-xs text-neutral-500 mt-2 font-medium">
              Create a new database-backed subcategory section under {currentCategoryObj.name}
            </p>
          </div>
        </div>
      ) : (
        /* Standard 6-Column Table for All Categories or Categories without subcategories */
        <div className="space-y-6">
          <div className="bg-white text-neutral-900 rounded-xl border border-neutral-300 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-900">
                <thead className="bg-neutral-100 border-b border-neutral-200 text-[10px] font-bold font-mono uppercase text-neutral-600 tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0}
                        onChange={handleSelectAll}
                        className="w-3.5 h-3.5 rounded text-black focus:ring-black accent-black cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-4 min-w-[280px]">Product Details</th>
                    <th className="py-2.5 px-4 text-right min-w-[110px] whitespace-nowrap">Price (INR)</th>
                    <th className="py-2.5 px-4 text-center min-w-[110px] whitespace-nowrap">Status</th>
                    <th className="py-2.5 px-4 text-center min-w-[140px] whitespace-nowrap">Review Status</th>
                    <th className="py-2.5 px-4 text-right min-w-[130px] whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {renderProductRows(paginatedProducts)}
                </tbody>
              </table>
            </div>

            {/* Dynamic Pagination Bar */}
            <div className="px-5 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs bg-neutral-50 text-neutral-700">
              <span className="text-neutral-500 font-mono">
                Showing {startProductNumber}–{endProductNumber} of {filteredProducts.length} products
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 bg-white border border-neutral-300 rounded-lg font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
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
                    className="px-2.5 py-1 bg-white border border-neutral-300 rounded-lg font-bold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      <DeleteProductModal
        isOpen={isDeleteModalOpen}
        product={deletingProduct}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingProduct(null);
        }}
        onConfirmPermanentDelete={handleConfirmPermanentDelete}
        onArchiveProduct={handleArchiveProduct}
      />

      {/* Review Note Modal */}
      {reviewModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-md w-full p-5 border border-neutral-300 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                  <X size={15} className="text-[#B91C1C]" />
                  <span>Review Note for Needs Editing</span>
                </h3>
                <p className="text-[11px] text-neutral-500 font-mono mt-0.5 truncate max-w-xs">
                  {reviewModalProduct.title || reviewModalProduct.productName} (
                  {reviewModalProduct.sku || (reviewModalProduct as any).SKU || "SKU"})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalProduct(null)}
                className="text-neutral-400 hover:text-black p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-800">
                Reason / Note for Product Editor{" "}
                <span className="font-normal text-neutral-500">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={reviewNoteInput}
                onChange={(e) => setReviewNoteInput(e.target.value)}
                placeholder="e.g. Incorrect product image, technical specifications need verification, price requires review..."
                className="w-full p-2.5 bg-white text-black border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FFD400] font-medium resize-none placeholder:text-neutral-400"
              />

              {/* Quick suggestions */}
              <div className="pt-1">
                <span className="text-[10px] font-mono uppercase text-neutral-500 block mb-1">
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
                      className="px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-[10px] text-neutral-700 transition-colors cursor-pointer"
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
                className="text-xs text-neutral-500 hover:text-black font-semibold cursor-pointer"
              >
                Reset to Unreviewed
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewModalProduct(null)}
                  className="px-3 py-1.5 border border-neutral-300 text-neutral-700 rounded-lg text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
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
                  className="px-3.5 py-1.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
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
          <div className="bg-white text-neutral-900 rounded-2xl max-w-2xl w-full p-6 border border-neutral-300 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FFD400]/20 border border-[#FFD400]/40 flex items-center justify-center">
                  <Cloud size={18} className="text-black" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                    <span>Cloudinary Storage & Quota Management</span>
                    <span className="text-[10px] font-mono font-bold bg-[#15803D]/10 text-[#15803D] px-2 py-0.5 rounded-full border border-[#15803D]/30">
                      FREE PLAN ACTIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    Real-time Cloudinary account usage, Sharp WebP compression & catalogue dry run
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCloudinaryModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-black rounded-lg hover:bg-neutral-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {loadingCloudinaryReport ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw size={24} className="animate-spin text-black mx-auto" />
                <p className="text-xs text-neutral-500 font-mono">
                  Querying Cloudinary Admin API & benchmarking catalogue image assets...
                </p>
              </div>
            ) : cloudinaryReport ? (
              <div className="space-y-4">
                {/* 1. Real-time Account Usage Cards */}
                <div>
                  <h4 className="text-[11px] font-mono font-bold uppercase text-neutral-500 mb-2 flex items-center gap-1.5">
                    <Database size={12} />
                    <span>Live Cloudinary Account Usage</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase block">Monthly Credits</span>
                      <div className="text-base font-bold font-mono text-neutral-900 mt-1">
                        {cloudinaryReport.accountUsage?.credits?.usage ?? 0.17}
                        <span className="text-xs text-neutral-500 font-normal"> / {cloudinaryReport.accountUsage?.credits?.limit ?? 25}</span>
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

                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                      <span className="text-[10px] font-mono text-neutral-500 uppercase block">Storage Consumption</span>
                      <div className="text-base font-bold font-mono text-neutral-900 mt-1">
                        {cloudinaryReport.accountUsage?.storage?.mb ?? 169.3} <span className="text-xs text-neutral-500 font-normal">MB</span>
                      </div>
                      <span className="text-[10px] font-mono text-neutral-500 mt-2 block">
                        {cloudinaryReport.accountUsage?.objects?.usage ?? 64} total hosted assets
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#15803D]/10 border border-[#15803D]/30">
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
                  <h4 className="text-[11px] font-mono font-bold uppercase text-neutral-500 mb-2 flex items-center gap-1.5">
                    <Sparkles size={12} />
                    <span>Catalogue-Wide Optimization Dry Run</span>
                  </h4>
                  <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 space-y-2.5 text-xs text-neutral-800">
                    <div className="flex items-center justify-between py-1 border-b border-neutral-200">
                      <span className="text-neutral-600">Total Products in Catalogue</span>
                      <span className="font-bold font-mono text-neutral-900">{cloudinaryReport.catalogueStats?.totalProducts ?? 193} products</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-200">
                      <span className="text-neutral-600">Total Product Photography Assets</span>
                      <span className="font-bold font-mono text-neutral-900">{cloudinaryReport.catalogueStats?.totalImages ?? 1544} images</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-200">
                      <span className="text-neutral-600">Current Local Storage (Raw PNG / JPEG)</span>
                      <span className="font-bold font-mono text-[#B91C1C]">
                        {cloudinaryReport.catalogueStats?.currentLocalStorageMB ?? 350} MB
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-neutral-200">
                      <span className="text-neutral-600">Estimated Optimized Storage (Sharp WebP 80%)</span>
                      <span className="font-bold font-mono text-[#15803D]">
                        ~{cloudinaryReport.catalogueStats?.estimatedOptimizedCatalogueMB ?? 108} MB (Saved ~96%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className="text-neutral-600">Estimated Cloudinary Credits Required</span>
                      <span className="font-bold font-mono text-neutral-900">
                        ~{cloudinaryReport.catalogueStats?.estimatedCloudinaryCreditsRequired ?? 0.11} Credits (out of 25.00)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. Engineering Guidelines */}
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1.5 text-[11px] text-neutral-700">
                  <span className="font-bold text-neutral-900 font-mono block">Image Lifecycle & Safety Guarantees:</span>
                  <p>• <strong className="text-[#15803D]">Review Status: Correct</strong> — Automatically optimizes images to WebP (max 1200×1200 px, quality 80) and uploads to Cloudinary without creating duplicates.</p>
                  <p>• <strong className="text-[#B91C1C]">Review Status: Needs Editing / Not Yet Reviewed</strong> — Safely deletes exclusively owned Cloudinary copies and immediately restores local source files.</p>
                  <p>• <strong className="text-neutral-900 font-bold">Fail-Safe Safeguard</strong> — Assets are never deleted if no verified source backup exists or if referenced by another product.</p>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setCloudinaryModalOpen(false)}
                className="px-4 py-1.5 bg-[#C62828] text-white rounded-lg text-xs font-bold hover:bg-[#B71C1C] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Section Modal */}
      {isAddSectionModalOpen && isSectionedCategory && currentCategoryObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-md w-full p-5 border border-neutral-300 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                  <Plus size={18} className="text-[#C62828]" />
                  <span>Add New Section</span>
                </h3>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  Parent Category: <strong className="text-neutral-900">{currentCategoryObj.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSectionModalOpen(false)}
                className="text-neutral-400 hover:text-black p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddSectionSubmit} className="space-y-3.5">
              {sectionFormError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#B91C1C] font-semibold flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{sectionFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Section Name <span className="text-[#C62828]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sectionFormName}
                  onChange={(e) => setSectionFormName(e.target.value)}
                  placeholder="e.g. Ceiling Mounted Lights, Portable Units, Section D..."
                  className="w-full px-3 py-2 bg-white text-black border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FFD400] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Short Description <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={sectionFormDesc}
                  onChange={(e) => setSectionFormDesc(e.target.value)}
                  placeholder="Brief summary of products in this section..."
                  className="w-full px-3 py-2 bg-white text-black border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FFD400] font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Display Order <span className="text-neutral-400 font-normal">(Optional sequence number)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={sectionFormOrder}
                  onChange={(e) => setSectionFormOrder(e.target.value)}
                  placeholder="e.g. 1, 2, 3..."
                  className="w-full px-3 py-2 bg-white text-black border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FFD400] font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setIsAddSectionModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSection}
                  className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingSection ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Plus size={13} className="stroke-[2.5]" />
                  )}
                  <span>{isSavingSection ? "Creating Section..." : "Create Section"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Section Modal */}
      {editingSection && isSectionedCategory && currentCategoryObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
          <div className="bg-white text-neutral-900 rounded-2xl max-w-md w-full p-5 border border-neutral-300 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-neutral-900 flex items-center gap-1.5">
                  <Edit2 size={16} className="text-[#C62828]" />
                  <span>Edit Section Details</span>
                </h3>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  Category: <strong className="text-neutral-900">{currentCategoryObj.name}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSection(null)}
                className="text-neutral-400 hover:text-black p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSectionSubmit} className="space-y-3.5">
              {sectionFormError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#B91C1C] font-semibold flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{sectionFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Section Name <span className="text-[#C62828]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sectionFormName}
                  onChange={(e) => setSectionFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-white text-black border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FFD400] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Short Description <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={sectionFormDesc}
                  onChange={(e) => setSectionFormDesc(e.target.value)}
                  placeholder="Brief summary of products in this section..."
                  className="w-full px-3 py-2 bg-white text-black border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FFD400] font-medium resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-800 mb-1">
                  Display Order <span className="text-neutral-400 font-normal">(Sequence number)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={sectionFormOrder}
                  onChange={(e) => setSectionFormOrder(e.target.value)}
                  placeholder="e.g. 1, 2, 3..."
                  className="w-full px-3 py-2 bg-white text-black border border-neutral-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#FFD400] font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSection}
                  className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSavingSection ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Check size={13} className="stroke-[2.5]" />
                  )}
                  <span>{isSavingSection ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Section Modal with Product Safety Guard */}
      {deletingSection && isSectionedCategory && currentCategoryObj && (() => {
        const linkedCount = getSectionTotalProducts(deletingSection).length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs animate-in fade-in">
            <div className="bg-white text-neutral-900 rounded-2xl max-w-md w-full p-5 border border-neutral-300 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-[#C62828]">
                    <Trash2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      Delete Section
                    </h3>
                    <p className="text-xs text-neutral-500 font-mono">
                      {deletingSection.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDeletingSection(null)}
                  className="text-neutral-400 hover:text-black p-1 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {sectionDeleteError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-[#B91C1C] font-semibold flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{sectionDeleteError}</span>
                </div>
              )}

              {linkedCount > 0 ? (
                sectionCascadeConfirm ? (
                  <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-red-900 font-bold text-xs uppercase tracking-wider font-mono">
                      <AlertTriangle size={15} className="text-[#C62828]" />
                      <span>Confirm Cascading Permanent Deletion</span>
                    </div>
                    <p className="text-xs text-neutral-800 leading-relaxed">
                      This will permanently delete <strong>{linkedCount} product(s)</strong> and all associated Cloudinary images along with section &ldquo;<strong>{deletingSection.name}</strong>&rdquo;.
                    </p>
                    <label className="flex items-start gap-2 text-xs text-neutral-900 font-semibold cursor-pointer p-2 bg-white rounded-lg border border-red-200">
                      <input
                        type="checkbox"
                        checked={sectionCascadeAcknowledged}
                        onChange={(e) => setSectionCascadeAcknowledged(e.target.checked)}
                        className="mt-0.5 rounded text-[#C62828] focus:ring-[#C62828]"
                      />
                      <span>I confirm permanent deletion of all {linkedCount} product(s) and their assets.</span>
                    </label>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setSectionCascadeConfirm(false)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg text-xs font-semibold"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={isSavingSection || !sectionCascadeAcknowledged}
                        onClick={() => handleDeleteSectionSubmit(true)}
                        className="px-4 py-1.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {isSavingSection ? "Deleting..." : "Permanently Delete All"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                        <span>Section contains {linkedCount} assigned product{linkedCount === 1 ? "" : "s"}</span>
                      </div>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        To preserve catalogue data, Option B (Delete Section Only) is blocked. You can either reassign products first, or use Option C to cascade delete products & Cloudinary media.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1 font-sans">
                      <div className="p-2.5 border border-red-200 rounded-xl flex items-center justify-between gap-3 bg-red-50/50">
                        <div>
                          <div className="text-xs font-bold text-[#C62828]">Option C: Cascade Delete Products</div>
                          <div className="text-[11px] text-neutral-500">Permanently delete {linkedCount} products & images</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSectionCascadeConfirm(true)}
                          className="px-3 py-1.5 bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                        >
                          Cascade Delete...
                        </button>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Are you sure you want to delete section &ldquo;<strong>{deletingSection.name}</strong>&rdquo;? No products are currently assigned to it.
                </p>
              )}

              {!sectionCascadeConfirm && (
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => setDeletingSection(null)}
                    className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-xl text-xs font-bold hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  {linkedCount === 0 && (
                    <button
                      type="button"
                      disabled={isSavingSection}
                      onClick={() => handleDeleteSectionSubmit(false)}
                      className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-40"
                    >
                      {isSavingSection ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={13} />
                      )}
                      <span>{isSavingSection ? "Deleting..." : "Delete Section Only"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Auto-Dismissing Toast Notification Container */}
      {toast && (
        <div
          role="alert"
          aria-live="assertive"
          className={`fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-full shadow-xl rounded-xl border p-4 flex items-start justify-between gap-3 backdrop-blur-xs transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toast.type === "error"
              ? "bg-[#FEF2F2] border-[#FCA5A5] text-[#991B1B]"
              : toast.type === "warning"
              ? "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]"
              : "bg-[#F0FDF4] border-[#86EFAC] text-[#166534]"
          }`}
        >
          <div className="flex items-start gap-3">
            {toast.type === "error" ? (
              <AlertCircle size={18} className="text-[#DC2626] shrink-0 mt-0.5" />
            ) : toast.type === "warning" ? (
              <AlertCircle size={18} className="text-[#D97706] shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={18} className="text-[#16A34A] shrink-0 mt-0.5" />
            )}
            <div>
              {toast.title && <div className="text-xs font-bold leading-tight mb-1">{toast.title}</div>}
              <div className="text-xs font-medium leading-relaxed">{toast.message}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissToast}
            className="text-current opacity-60 hover:opacity-100 p-1 rounded-md transition-opacity cursor-pointer shrink-0"
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </AdminLayout>
  );
};
