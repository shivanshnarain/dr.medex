import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Sliders,
  Layers,
  Image as ImageIcon,
  FileText,
  Settings,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Download,
  Search,
  Save,
  Database,
  Cloud,
  Sparkles,
  Globe,
  ShieldCheck,
  ArrowRight,
  Plus,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Product, Category } from "../types";
import { REQUIRED_PRODUCT_IMAGE_WIDTH, REQUIRED_PRODUCT_IMAGE_HEIGHT } from "../lib/imageUtils";

/* ============================================================================
 * 1. PRODUCT CONFIGURATION (/admin/product-configuration)
 * ==========================================================================*/
export const AdminProductConfigPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();
  const [hierarchy, setHierarchy] = useState<Record<string, any>>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sampleCat, setSampleCat] = useState("ot-lights");
  const [sampleSub, setSampleSub] = useState("");
  const [sampleName, setSampleName] = useState("Surgical Lumina Pro");
  const [generatedSku, setGeneratedSku] = useState<string>("");
  const [isGeneratingSku, setIsGeneratingSku] = useState(false);

  const loadConfigData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hierRes, catRes] = await Promise.all([
        adminFetch("/api/admin/catalogue/hierarchy"),
        fetch("/api/categories?includeInactive=true")
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
    } catch (e) {
      console.error("Failed to load product configuration:", e);
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadConfigData();
  }, [loadConfigData]);

  const handleTestSku = async () => {
    setIsGeneratingSku(true);
    try {
      const res = await adminFetch(
        `/api/admin/products/generate-sku?category=${encodeURIComponent(sampleCat)}&subcategory=${encodeURIComponent(sampleSub)}&productName=${encodeURIComponent(sampleName)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sku) {
          setGeneratedSku(data.sku);
        }
      }
    } finally {
      setIsGeneratingSku(false);
    }
  };

  const hierarchyEntries = useMemo(() => Object.entries(hierarchy || {}), [hierarchy]);
  const selectedSubcategories = useMemo(() => {
    return hierarchy[sampleCat]?.subcategories || [];
  }, [hierarchy, sampleCat]);

  return (
    <AdminLayout
      title="Product Configuration & Taxonomy Schema"
      subtitle="Strict 1024×1536 media validation, SKU taxonomy rules, and medical catalogue structure"
      breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: "Product Configuration" }]}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadConfigData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh Schema</span>
          </button>
          <Link
            to="/admin/categories"
            className="flex items-center gap-2 px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold shadow-xs"
          >
            <Layers size={13} />
            <span>Edit Categories</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-neutral-300 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase text-neutral-500">
                Image Ratio Validation
              </span>
              <span className="px-2 py-0.5 rounded bg-[#FFD400] text-black text-[10px] font-mono font-black">
                ENFORCED
              </span>
            </div>
            <div className="text-xl font-black font-mono text-neutral-900">
              {REQUIRED_PRODUCT_IMAGE_WIDTH} × {REQUIRED_PRODUCT_IMAGE_HEIGHT} px
            </div>
            <p className="text-xs text-neutral-600 mt-1.5">
              Strict 2:3 vertical aspect ratio, up to 5 photos per unit (max 15 MB each).
            </p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-300 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase text-neutral-500">
                Verified Categories
              </span>
              <Layers size={16} className="text-[#2D5A4A]" />
            </div>
            <div className="text-xl font-black font-mono text-neutral-900">
              {categories.length || hierarchyEntries.length} Primary ·{" "}
              {hierarchyEntries.reduce((acc, [, v]) => acc + (v?.subcategories?.length || 0), 0)} Subcategories
            </div>
            <p className="text-xs text-neutral-600 mt-1.5">
              Synchronized across Admin Editor, Storefront Filters, and SKU Engine.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-neutral-300 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase text-neutral-500">
                SKU Pattern Standard
              </span>
              <ShieldCheck size={16} className="text-emerald-700" />
            </div>
            <div className="text-sm font-black font-mono text-neutral-900 mt-1">
              DRM-[CAT]-[SUB]-[NAME]-[ID]
            </div>
            <p className="text-xs text-neutral-600 mt-2">
              Collision-resistant 6-character alphanumeric suffix validated against MongoDB Atlas.
            </p>
          </div>
        </div>

        {/* Interactive SKU Generator Tester */}
        <div className="bg-white rounded-xl border border-neutral-300 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-neutral-900 flex items-center gap-2">
                <Sliders size={15} />
                <span>Live SKU Generator Verification</span>
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Preview canonical SKU codes generated by the backend taxonomy engine.
              </p>
            </div>
            <Link
              to="/admin/products/new"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C62828] hover:underline"
            >
              <Plus size={13} />
              <span>Create Product with Schema</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Primary Category</label>
              <select
                value={sampleCat}
                onChange={(e) => {
                  setSampleCat(e.target.value);
                  setSampleSub("");
                }}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white"
              >
                {hierarchyEntries.map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.name || key} ({val.code || key.slice(0, 3).toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Subcategory</label>
              <select
                value={sampleSub}
                onChange={(e) => setSampleSub(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white"
              >
                <option value="">General (GEN)</option>
                {selectedSubcategories.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Sample Product Name</label>
              <input
                type="text"
                value={sampleName}
                onChange={(e) => setSampleName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white"
                placeholder="Equipment name..."
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleTestSku}
                disabled={isGeneratingSku}
                className="w-full px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGeneratingSku ? "Generating..." : "Test SKU Pattern"}
              </button>
            </div>
          </div>

          {generatedSku && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
              <div className="text-xs text-emerald-900">
                Generated SKU: <strong className="font-mono text-sm ml-1">{generatedSku}</strong>
              </div>
              <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
            </div>
          )}
        </div>

        {/* Taxonomy Tree Table */}
        <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase font-mono tracking-wider text-neutral-900">
              Active Category &amp; Equipment Type Hierarchy
            </h3>
            <span className="text-[11px] font-mono text-neutral-500">
              {hierarchyEntries.length} primary groups
            </span>
          </div>
          {isLoading ? (
            <div className="p-10 text-center text-xs text-neutral-500">Loading schema hierarchy...</div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {hierarchyEntries.map(([key, cat]: [string, any]) => (
                <div key={key} className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-[#FFD400] text-black font-mono text-[10px] font-black">
                        {cat.code || key.slice(0, 3).toUpperCase()}
                      </span>
                      <span className="text-sm font-bold text-neutral-900">{cat.name || key}</span>
                      <span className="text-[11px] font-mono text-neutral-400">/{key}</span>
                    </div>
                    <Link
                      to={`/admin/products?category=${encodeURIComponent(key)}`}
                      className="text-xs font-semibold text-[#2D5A4A] hover:underline inline-flex items-center gap-1"
                    >
                      <span>View Products</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(cat.subcategories || []).map((sub: any) => (
                      <div
                        key={sub.id}
                        className="px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-200 text-xs flex items-center gap-2"
                      >
                        <span className="font-semibold text-neutral-800">{sub.name}</span>
                        {Array.isArray(sub.equipmentTypes) && sub.equipmentTypes.length > 0 && (
                          <span className="text-[10px] font-mono text-neutral-500 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                            {sub.equipmentTypes.length} types
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

/* ============================================================================
 * 2. MEDIA LIBRARY (/admin/media)
 * ==========================================================================*/
interface MediaAssetItem {
  id: string;
  url: string;
  productId: string;
  productTitle: string;
  sku: string;
  category: string;
  index: number;
  isPrimary: boolean;
  provider: "cloudinary" | "local" | "external";
}

export const AdminMediaLibraryPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem("drmedex_admin_products_cache");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [cloudinaryUsage, setCloudinaryUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(products.length === 0);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<"all" | "cloudinary" | "local">("all");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 24;

  const loadMediaData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh || products.length === 0) setIsLoading(true);
    try {
      const [prodRes, cldRes] = await Promise.all([
        adminFetch("/api/admin/products?limit=1000"),
        adminFetch("/api/admin/cloudinary/usage").catch(() => null)
      ]);
      if (prodRes.ok) {
        const pData = await prodRes.json();
        if (pData.success && Array.isArray(pData.products)) {
          setProducts(pData.products);
          try {
            localStorage.setItem("drmedex_admin_products_cache", JSON.stringify(pData.products));
          } catch {}
        }
      }
      if (cldRes && cldRes.ok) {
        const cData = await cldRes.json().catch(() => null);
        if (cData && cData.success) setCloudinaryUsage(cData.usage);
      }
    } catch (e) {
      console.error("Media library load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadMediaData(false);
  }, [loadMediaData]);

  const allAssets = useMemo<MediaAssetItem[]>(() => {
    const items: MediaAssetItem[] = [];
    for (const p of products) {
      const urls: string[] = [];
      const pushUrl = (raw: any) => {
        const u = typeof raw === "string" ? raw.trim() : (raw?.url || raw?.secureUrl || "").trim();
        if (u && !u.startsWith("data:") && !u.startsWith("blob:") && !urls.includes(u)) {
          urls.push(u);
        }
      };
      if (Array.isArray(p.images)) p.images.forEach(pushUrl);
      if (Array.isArray(p.galleryImages)) p.galleryImages.forEach(pushUrl);
      if (p.primaryImage) pushUrl(p.primaryImage);

      urls.forEach((url, idx) => {
        const provider: "cloudinary" | "local" | "external" =
          url.includes("cloudinary.com") || url.includes("res.cloudinary.com")
            ? "cloudinary"
            : url.startsWith("/")
            ? "local"
            : "external";
        items.push({
          id: `${p.id}-${idx}`,
          url,
          productId: p.id,
          productTitle: p.title || p.productName || "Medical Unit",
          sku: p.sku || (p as any).SKU || "",
          category: p.category || "",
          index: idx + 1,
          isPrimary: idx === 0 || url === p.primaryImage,
          provider
        });
      });
    }
    return items;
  }, [products]);

  const stats = useMemo(() => {
    const cldCount = allAssets.filter(a => a.provider === "cloudinary").length;
    const localCount = allAssets.filter(a => a.provider === "local").length;
    return {
      total: allAssets.length,
      cloudinary: cldCount,
      local: localCount,
      external: allAssets.length - cldCount - localCount
    };
  }, [allAssets]);

  const filteredAssets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allAssets.filter(item => {
      if (providerFilter === "cloudinary" && item.provider !== "cloudinary") return false;
      if (providerFilter === "local" && item.provider !== "local") return false;
      if (!q) return true;
      return (
        item.productTitle.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });
  }, [allAssets, search, providerFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAssets.length / perPage));
  const paginatedAssets = useMemo(() => {
    const clamped = Math.min(page, totalPages);
    const start = (clamped - 1) * perPage;
    return filteredAssets.slice(start, start + perPage);
  }, [filteredAssets, page, totalPages]);

  const getThumbUrl = (url: string) => {
    if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
      return url.replace("/image/upload/", "/image/upload/w_320,h_480,c_limit,q_auto,f_auto/");
    }
    return url;
  };

  const handleDownloadSingle = async (asset: MediaAssetItem) => {
    try {
      const extMatch = asset.url.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)(?:\?.*)?$/i);
      const ext = extMatch?.[1]?.toLowerCase() === "jpeg" ? "jpg" : (extMatch?.[1]?.toLowerCase() || "jpg");
      const filename = `${(asset.sku || asset.productId).replace(/[^a-zA-Z0-9_-]/g, "_")}_photo_${String(asset.index).padStart(2, "0")}.${ext}`;
      const res = await adminFetch(`/api/admin/download-image?url=${encodeURIComponent(asset.url)}&filename=${encodeURIComponent(filename)}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch {}
  };

  return (
    <AdminLayout
      title="Media Library"
      subtitle="Inspect, search, download, and trace every catalogue image asset across Cloudinary & local storage"
      breadcrumbs={[{ label: "Media Library" }]}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadMediaData(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Sync Assets</span>
          </button>
          <Link
            to="/admin/storage"
            className="flex items-center gap-2 px-4 py-2 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-lg text-xs font-bold shadow-xs"
          >
            <Database size={13} />
            <span>Storage &amp; Orphans</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-neutral-300 p-4 shadow-xs">
            <div className="text-[11px] font-mono uppercase text-neutral-500 font-bold">Total Catalogue Images</div>
            <div className="text-2xl font-black font-mono text-neutral-900 mt-1">{stats.total}</div>
            <div className="text-[11px] text-neutral-500 mt-1">Across {products.length} products</div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-300 p-4 shadow-xs">
            <div className="text-[11px] font-mono uppercase text-neutral-500 font-bold">Cloudinary Assets</div>
            <div className="text-2xl font-black font-mono text-[#2D5A4A] mt-1">{stats.cloudinary}</div>
            <div className="text-[11px] text-neutral-500 mt-1">
              {cloudinaryUsage?.plan ? `Plan: ${cloudinaryUsage.plan}` : "CDN-backed production URLs"}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-neutral-300 p-4 shadow-xs">
            <div className="text-[11px] font-mono uppercase text-neutral-500 font-bold">Local Static Assets</div>
            <div className="text-2xl font-black font-mono text-neutral-900 mt-1">{stats.local}</div>
            <div className="text-[11px] text-neutral-500 mt-1">Served from /products-catalog</div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white rounded-xl border border-neutral-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by product name, SKU, category, or image URL..."
              className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-black"
            />
          </div>
          <div className="flex items-center gap-2">
            {(["all", "cloudinary", "local"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setProviderFilter(mode);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize border cursor-pointer transition-colors ${
                  providerFilter === mode
                    ? "bg-[#FFD400] text-black border-[#FFD400]"
                    : "bg-neutral-100 text-neutral-700 border-neutral-300 hover:bg-neutral-200"
                }`}
              >
                {mode === "all" ? `All (${stats.total})` : mode === "cloudinary" ? `Cloudinary (${stats.cloudinary})` : `Local (${stats.local})`}
              </button>
            ))}
          </div>
        </div>

        {/* Asset Grid */}
        {isLoading && paginatedAssets.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-300 p-12 text-center text-xs text-neutral-500">
            Loading catalogue media assets...
          </div>
        ) : paginatedAssets.length === 0 ? (
          <div className="bg-white rounded-xl border border-neutral-300 p-12 text-center text-xs text-neutral-500">
            No media assets matched your current filter.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {paginatedAssets.map((asset) => (
              <div
                key={asset.id}
                className="bg-white rounded-xl border border-neutral-300 overflow-hidden flex flex-col justify-between shadow-2xs"
              >
                <div className="aspect-[2/3] bg-neutral-50 border-b border-neutral-200 relative overflow-hidden flex items-center justify-center p-2">
                  <img
                    src={getThumbUrl(asset.url)}
                    alt={`${asset.productTitle} photo ${asset.index}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                  <span
                    className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      asset.provider === "cloudinary"
                        ? "bg-[#2D5A4A] text-white"
                        : "bg-neutral-800 text-white"
                    }`}
                  >
                    {asset.provider}
                  </span>
                  {asset.isPrimary && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-[#FFD400] text-black text-[9px] font-mono font-black">
                      1°
                    </span>
                  )}
                </div>

                <div className="p-2.5 space-y-2">
                  <div>
                    <Link
                      to={`/admin/products/${asset.productId}/edit`}
                      className="text-[11px] font-bold text-neutral-900 hover:underline line-clamp-1 block"
                      title={asset.productTitle}
                    >
                      {asset.productTitle}
                    </Link>
                    <div className="text-[10px] font-mono text-neutral-500 truncate">
                      {asset.sku || `Photo #${asset.index}`}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-100">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(asset.url);
                        setCopiedUrl(asset.id);
                        setTimeout(() => setCopiedUrl(null), 1500);
                      }}
                      title="Copy asset URL"
                      className="p-1.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                    >
                      {copiedUrl === asset.id ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadSingle(asset)}
                      title="Download original photo"
                      className="p-1.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 cursor-pointer"
                    >
                      <Download size={12} />
                    </button>
                    <Link
                      to={`/admin/products/${asset.productId}/edit`}
                      className="px-2 py-1 rounded bg-[#C62828] hover:bg-[#B71C1C] text-white text-[10px] font-bold"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-neutral-300 text-xs">
            <span className="font-mono text-neutral-600">
              Page {page} of {totalPages} ({filteredAssets.length} assets)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-neutral-300 disabled:opacity-40 cursor-pointer hover:bg-neutral-100"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-neutral-300 disabled:opacity-40 cursor-pointer hover:bg-neutral-100"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

/* ============================================================================
 * 3. WEBSITE CONTENT (/admin/website-content)
 * ==========================================================================*/
export const AdminWebsiteContentPage: React.FC = () => {
  const [policies, setPolicies] = useState({
    announcementBar: "",
    supportEmail: "",
    salesEmail: "",
    hotline: "",
    whatsapp: "",
    headquarters: ""
  });
  const [blogs, setBlogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadContent = useCallback(async () => {
    setIsLoading(true);
    try {
      const [polRes, blogRes] = await Promise.all([
        fetch("/api/policies"),
        fetch("/api/blogs")
      ]);
      if (polRes.ok) {
        const pData = await polRes.json();
        if (pData.success && pData.policies) {
          setPolicies((prev) => ({ ...prev, ...pData.policies }));
        }
      }
      if (blogRes.ok) {
        const bData = await blogRes.json();
        if (bData.success && Array.isArray(bData.blogs)) {
          setBlogs(bData.blogs);
        }
      }
    } catch (e) {
      console.error("Load website content error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(policies)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setPolicies((prev) => ({ ...prev, ...(data.policies || {}) }));
        setFeedback({ type: "success", text: "Storefront announcement banner & contact details updated." });
      } else {
        setFeedback({ type: "error", text: data.message || "Failed to save content updates." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: err?.message || "Network error updating content." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Website Content & Storefront Policies"
      subtitle="Manage storefront announcement bar, corporate contact details, policy pages, and clinical articles"
      breadcrumbs={[{ label: "Website Content" }]}
      actions={
        <button
          type="button"
          onClick={loadContent}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            <span>{feedback.text}</span>
            <button type="button" onClick={() => setFeedback(null)} className="underline text-[11px] cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Storefront Banner & Support Info Editor */}
        <form onSubmit={handleSavePolicies} className="bg-white rounded-xl border border-neutral-300 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase font-mono text-neutral-900">
                Global Announcement Bar &amp; Support Contacts
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Live storefront messaging served from <code>/api/policies</code>
              </p>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Save size={13} />
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Announcement Bar Text</label>
              <input
                type="text"
                value={policies.announcementBar}
                onChange={(e) => setPolicies((p) => ({ ...p, announcementBar: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Support Email</label>
              <input
                type="email"
                value={policies.supportEmail}
                onChange={(e) => setPolicies((p) => ({ ...p, supportEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Sales Email</label>
              <input
                type="email"
                value={policies.salesEmail}
                onChange={(e) => setPolicies((p) => ({ ...p, salesEmail: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Biomedical Hotline</label>
              <input
                type="text"
                value={policies.hotline}
                onChange={(e) => setPolicies((p) => ({ ...p, hotline: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">WhatsApp Support</label>
              <input
                type="text"
                value={policies.whatsapp}
                onChange={(e) => setPolicies((p) => ({ ...p, whatsapp: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-black"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-neutral-700 mb-1">Global Headquarters Address</label>
              <textarea
                rows={2}
                value={policies.headquarters}
                onChange={(e) => setPolicies((p) => ({ ...p, headquarters: e.target.value }))}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-black"
              />
            </div>
          </div>
        </form>

        {/* Compliance Policy Routes */}
        <div className="bg-white rounded-xl border border-neutral-300 p-6 shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase font-mono text-neutral-900">
            Published Legal &amp; Compliance Policy Pages
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Privacy Policy", path: "/privacy-policy" },
              { label: "Terms & Conditions", path: "/terms-conditions" },
              { label: "Shipping & Freight Policy", path: "/shipping-policy" },
              { label: "Warranty & Clinical Support", path: "/warranty-policy" },
              { label: "Payment & Trade Security", path: "/payment-policy" },
              { label: "Cookie Compliance Policy", path: "/cookie-policy" }
            ].map((item) => (
              <a
                key={item.path}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-lg border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 flex items-center justify-between text-xs font-semibold text-neutral-800"
              >
                <span>{item.label}</span>
                <ExternalLink size={12} className="text-neutral-500" />
              </a>
            ))}
          </div>
        </div>

        {/* Clinical Blog Articles */}
        <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase font-mono text-neutral-900">
              Clinical Education &amp; Blog Articles ({blogs.length})
            </h3>
            <a
              href="/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-[#2D5A4A] hover:underline inline-flex items-center gap-1"
            >
              <span>Open Blog Index</span>
              <ExternalLink size={12} />
            </a>
          </div>
          {blogs.length === 0 ? (
            <div className="p-6 text-xs text-neutral-500">No blog posts loaded.</div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {blogs.map((b: any) => (
                <div key={b.id || b.slug} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-900 truncate">{b.title}</div>
                    <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                      /{b.slug} · {b.category || "Clinical Guidance"}
                    </div>
                  </div>
                  <a
                    href={`/blog/${b.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold hover:bg-neutral-100 shrink-0 inline-flex items-center gap-1"
                  >
                    <span>Preview</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

/* ============================================================================
 * 4. PLATFORM SETTINGS (/admin/settings)
 * ==========================================================================*/
export const AdminSettingsPage: React.FC = () => {
  const { adminFetch, adminUser } = useAdminAuth();
  const [fxRates, setFxRates] = useState<Record<string, number>>({});
  const [fxTimestamp, setFxTimestamp] = useState<string>("");
  const [mongoStatus, setMongoStatus] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [cldUsage, setCldUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fxRes, mRes, aiRes, cRes] = await Promise.all([
        fetch("/api/currency/rates").catch(() => null),
        adminFetch("/api/admin/mongodb/status").catch(() => null),
        adminFetch("/api/admin/ai/status").catch(() => null),
        adminFetch("/api/admin/cloudinary/usage").catch(() => null)
      ]);
      if (fxRes && fxRes.ok) {
        const d = await fxRes.json().catch(() => null);
        if (d?.rates) setFxRates(d.rates);
        if (d?.lastFetchedAt) setFxTimestamp(d.lastFetchedAt);
      }
      if (mRes && mRes.ok) {
        const d = await mRes.json().catch(() => null);
        if (d?.mongodb) setMongoStatus(d.mongodb);
      }
      if (aiRes && aiRes.ok) {
        const d = await aiRes.json().catch(() => null);
        if (d?.gemini) setAiStatus(d.gemini);
      }
      if (cRes && cRes.ok) {
        const d = await cRes.json().catch(() => null);
        if (d?.usage) setCldUsage(d.usage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const rateEntries = useMemo(() => Object.entries(fxRates || {}), [fxRates]);

  return (
    <AdminLayout
      title="Platform Settings & System Diagnostics"
      subtitle="Live FX exchange engine, API integrations, operator session identity, and storage health"
      breadcrumbs={[{ label: "Settings" }]}
      actions={
        <button
          type="button"
          onClick={loadSettings}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh Diagnostics</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* System Integrations Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-neutral-300 p-5 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-neutral-500 font-bold">MongoDB Atlas</span>
              <Database size={16} className="text-[#2D5A4A]" />
            </div>
            <div className="text-base font-black text-neutral-900">
              {mongoStatus?.connected ? "Connected" : mongoStatus?.configured ? "Configured" : "Checking..."}
            </div>
            <div className="text-[11px] text-neutral-500">
              {mongoStatus?.approvedProductsCount !== undefined
                ? `${mongoStatus.approvedProductsCount} documents in ${mongoStatus.database}`
                : "Authoritative product & order database"}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-300 p-5 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-neutral-500 font-bold">Cloudinary Media CDN</span>
              <Cloud size={16} className="text-sky-700" />
            </div>
            <div className="text-base font-black text-neutral-900">
              {cldUsage?.status === "ok" || cldUsage?.plan ? "Operational" : "Configured"}
            </div>
            <div className="text-[11px] text-neutral-500">
              {cldUsage?.resources !== undefined ? `${cldUsage.resources} stored assets` : "Automatic shared-asset protection"}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-neutral-300 p-5 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase text-neutral-500 font-bold">Gemini Vision AI</span>
              <Sparkles size={16} className="text-[#C62828]" />
            </div>
            <div className="text-base font-black text-neutral-900">
              {aiStatus?.configured ? "Ready" : "Unavailable"}
            </div>
            <div className="text-[11px] text-neutral-500">
              {aiStatus?.model || "Server-side authenticated vision identification"}
            </div>
          </div>
        </div>

        {/* Active Admin Session */}
        <div className="bg-white rounded-xl border border-neutral-300 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-bold uppercase font-mono text-neutral-900">Authenticated Operator Session</h3>
            <p className="text-xs text-neutral-600 mt-1">
              Signed in as <strong>{adminUser?.name || "Admin"}</strong> ({adminUser?.email}) · Role:{" "}
              <span className="font-mono font-bold text-[#2D5A4A]">{adminUser?.role || "SUPER_ADMIN"}</span>
            </p>
          </div>
          <Link
            to="/admin/audit-logs"
            className="px-4 py-2 rounded-lg border border-neutral-300 text-xs font-bold hover:bg-neutral-100 inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Clock size={13} />
            <span>View Audit Trail</span>
          </Link>
        </div>

        {/* Multi-Currency FX Rates */}
        <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-[#2D5A4A]" />
              <h3 className="text-xs font-bold uppercase font-mono text-neutral-900">
                Base INR Live Currency Conversion Engine
              </h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-500">
              {fxTimestamp ? `Updated: ${new Date(fxTimestamp).toLocaleString()}` : "Base currency: INR"}
            </span>
          </div>
          {rateEntries.length === 0 ? (
            <div className="p-6 text-xs text-neutral-500">Loading exchange rate matrix...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 p-5">
              {rateEntries.slice(0, 18).map(([code, rate]) => (
                <div key={code} className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
                  <div className="text-xs font-black font-mono text-neutral-900">{code}</div>
                  <div className="text-xs font-mono text-[#2D5A4A] mt-0.5">{Number(rate).toFixed(5)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

/* ============================================================================
 * 5. AUDIT TRAIL PAGE (/admin/audit-logs)
 * ==========================================================================*/
export const AdminAuditTrailPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminFetch("/api/admin/audit-logs?limit=200");
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const distinctActions = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l) => {
      if (l.action) s.add(l.action);
    });
    return Array.from(s);
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
      if (!q) return true;
      return (
        String(log.action || "").toLowerCase().includes(q) ||
        String(log.adminId || log.adminEmail || "").toLowerCase().includes(q) ||
        String(log.productId || log.targetId || "").toLowerCase().includes(q) ||
        JSON.stringify(log.details || {}).toLowerCase().includes(q)
      );
    });
  }, [logs, actionFilter, search]);

  return (
    <AdminLayout
      title="Administrative Audit Trail"
      subtitle="Chronological log of administrative product updates, media deletions, logins, and settings changes"
      breadcrumbs={[{ label: "Audit Trail" }]}
      actions={
        <button
          type="button"
          onClick={loadLogs}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 border border-neutral-300 rounded-lg text-xs font-bold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 cursor-pointer"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh Logs</span>
        </button>
      }
    >
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-neutral-300 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by action, admin email, or product ID..."
              className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg text-xs focus:outline-none focus:border-black"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-lg text-xs bg-white font-semibold"
          >
            <option value="ALL">All Actions ({logs.length})</option>
            {distinctActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-xl border border-neutral-300 overflow-hidden shadow-xs divide-y divide-neutral-200">
          {isLoading ? (
            <div className="p-10 text-center text-xs text-neutral-500">Loading audit history...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-10 text-center text-xs text-neutral-500">No audit entries matched your filters.</div>
          ) : (
            filteredLogs.map((log: any, idx: number) => (
              <div key={log.id || idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-neutral-100 border border-neutral-300 font-mono font-bold text-neutral-900">
                      {log.action}
                    </span>
                    <span className="text-neutral-600 font-medium">
                      by <strong>{log.adminId || log.adminEmail || "SYSTEM_ADMIN"}</strong>
                    </span>
                    {(log.productId || log.targetId) && (
                      <span className="font-mono text-[11px] text-[#2D5A4A]">
                        Target: {log.productId || log.targetId}
                      </span>
                    )}
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div className="text-[11px] text-neutral-500 font-mono mt-1 truncate max-w-3xl">
                      {JSON.stringify(log.details)}
                    </div>
                  )}
                </div>
                <div className="text-[11px] font-mono text-neutral-500 shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

