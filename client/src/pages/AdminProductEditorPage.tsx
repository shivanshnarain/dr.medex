import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Save,
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  Copy,
  Check,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Eye,
  FileText,
  DollarSign,
  Package,
  Layers,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Product, Category } from "../types";

export const AdminProductEditorPage: React.FC = () => {
  const { productId } = useParams<{ productId?: string }>();
  const navigate = useNavigate();
  const { adminFetch } = useAdminAuth();

  const isEditMode = Boolean(productId && productId !== "new");

  // Loading & submission state
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isCheckingSku, setIsCheckingSku] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [copiedSku, setCopiedSku] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Categories list
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // ==========================================
  // SECTION A: PRODUCT INFORMATION
  // ==========================================
  const [category, setCategory] = useState("ot-lights");
  const [subcategory, setSubcategory] = useState("");
  const [productType, setProductType] = useState("Medical Equipment");
  const [productName, setProductName] = useState("");
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [brand, setBrand] = useState("DR.MEDEX");
  const [shortSummary, setShortSummary] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "DRAFT" | "ARCHIVED">("ACTIVE");

  // ==========================================
  // SECTION B: PRICING & STOCK
  // ==========================================
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [basePrice, setBasePrice] = useState<number>(0); // Selling price
  const [baseCurrency, setBaseCurrency] = useState("INR");
  const [stock, setStock] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);
  const [stockStatus, setStockStatus] = useState<"IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("IN_STOCK");
  const [trackInventory, setTrackInventory] = useState(true);

  // Auto calculate discount percentage
  const discountPercentage = useMemo(() => {
    if (originalPrice > 0 && basePrice > 0 && originalPrice > basePrice) {
      return Math.round(((originalPrice - basePrice) / originalPrice) * 100);
    }
    return 0;
  }, [originalPrice, basePrice]);

  // ==========================================
  // SECTION C: PRODUCT IMAGES & MEDIA
  // ==========================================
  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [imageAltTexts, setImageAltTexts] = useState<Record<string, string>>({});
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // ==========================================
  // SECTION D: DESCRIPTIONS & CONTENT
  // ==========================================
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState("");
  const [applications, setApplications] = useState<string[]>([]);
  const [newAppText, setNewAppText] = useState("");
  const [packageContents, setPackageContents] = useState<string[]>([]);
  const [newPackageText, setNewPackageText] = useState("");
  const [warranty, setWarranty] = useState("2-Year Comprehensive Clinical Warranty");
  const [shippingInformation, setShippingInformation] = useState("Express Air Cargo Dispatch with Shockproof Wooden Crating");
  const [returnsPolicy, setReturnsPolicy] = useState("Medical Device Quality Quarantine Return within 14 Days with Calibration Seal");

  // ==========================================
  // SECTION E: TECHNICAL SPECIFICATIONS
  // ==========================================
  const [specList, setSpecList] = useState<{ key: string; value: string }[]>([]);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecVal, setNewSpecVal] = useState("");

  // ==========================================
  // SECTION F: CERTIFICATIONS & DOCUMENTS
  // ==========================================
  const [certifications, setCertifications] = useState<string[]>([
    "ISO 13485:2016 Medical Devices Quality Management",
    "CE Medical Directive 93/42/EEC",
    "IEC 60601-1 Electrical Medical Safety Compliance"
  ]);
  const [newCertText, setNewCertText] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("MED-ISO-9948201");
  const [issuingOrg, setIssuingOrg] = useState("TÜV SÜD Medical Compliance");
  const [expirationDate, setExpirationDate] = useState("2029-12-31");
  const [manualUrl, setManualUrl] = useState("");
  const [datasheetUrl, setDatasheetUrl] = useState("");

  // ==========================================
  // SECTION G: SEO & URL SETTINGS
  // ==========================================
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [canonicalUrl, setCanonicalUrl] = useState("");

  // ==========================================
  // SECTION H: AI GENERATOR
  // ==========================================
  const [aiGeneratedPreview, setAiGeneratedPreview] = useState<{
    shortDescription?: string;
    fullDescription?: string;
    keyFeatures?: string[];
    metaDescription?: string;
  } | null>(null);

  // ==========================================
  // SECTION I: PUBLISHING & VISIBILITY
  // ==========================================
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [newProduct, setNewProduct] = useState(false);
  const [showOnHomepage, setShowOnHomepage] = useState(true);

  // Load Categories & Product
  useEffect(() => {
    async function initData() {
      try {
        const catRes = await fetch("/api/categories?includeInactive=true");
        if (catRes.ok) {
          const cData = await catRes.json();
          if (cData.success && Array.isArray(cData.categories)) {
            setAllCategories(cData.categories);
          }
        }

        if (isEditMode && productId) {
          setIsLoading(true);
          const pRes = await adminFetch(`/api/admin/products/${productId}`);
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData.success && pData.product) {
              const p = pData.product;
              setCategory(p.category || "ot-lights");
              setSubcategory(p.subcategory || "");
              setProductType(p.productType || "Medical Equipment");
              setProductName(p.productName || p.title || "");
              setTitle(p.title || p.productName || "");
              setSku(p.sku || p.SKU || "");
              setModelNumber(p.modelNumber || "");
              setBrand(p.brand || "DR.MEDEX");
              setStatus(p.status || "ACTIVE");
              setShortSummary(p.shortDescription || p.overview || "");

              setOriginalPrice(p.originalPrice || p.regularPrice || p.basePrice || 0);
              setBasePrice(p.basePrice || p.salePrice || 0);
              setBaseCurrency(p.baseCurrency || "INR");
              setStock(p.stock !== undefined ? p.stock : 10);
              setLowStockThreshold(p.lowStockThreshold || 3);
              setStockStatus(p.stockStatus || (p.stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"));

              setImages(p.images || (p.primaryImage ? [p.primaryImage] : []));
              setShortDescription(p.shortDescription || p.overview || "");
              setFullDescription(p.fullDescription || p.overview || "");
              setKeyFeatures(p.features || p.keyFeatures || []);
              setApplications(p.applications || []);
              setPackageContents(p.packageContents || []);
              if (p.warranty) setWarranty(p.warranty);
              if (p.shippingInformation) setShippingInformation(p.shippingInformation);

              // Specs to key-value array
              const specs = p.technicalSpecifications || p.specifications || {};
              const convertedSpecs = Object.entries(specs).map(([k, v]) => ({ key: k, value: String(v) }));
              setSpecList(convertedSpecs);

              if (p.certifications && p.certifications.length > 0) {
                setCertifications(p.certifications);
              }

              setSlug(p.slug || "");
              setMetaTitle(p.metaTitle || p.title || "");
              setMetaDescription(p.metaDescription || p.shortDescription || "");
              setIsFeatured(Boolean(p.featured || p.isFeatured));
              setIsBestSeller(Boolean(p.bestseller || p.isBestSeller));
              setNewProduct(Boolean(p.newProduct));
            } else {
              setStatusBanner({ type: "error", text: "Product could not be loaded." });
            }
          } else {
            setStatusBanner({ type: "error", text: "Failed to fetch product details from server." });
          }
        } else {
          // Initialize new product SKU prefix
          generateSku("ot-lights", "OT Light");
        }
      } catch (err) {
        console.error("Failed to load product for editing:", err);
        setStatusBanner({ type: "error", text: "Error connecting to catalogue database." });
      } finally {
        setIsLoading(false);
      }
    }

    initData();
  }, [productId, isEditMode]);

  // Dependent subcategories for selected category
  const activeCategoryObj = useMemo(() => {
    return allCategories.find((c) => c.id === category || c.slug === category);
  }, [allCategories, category]);

  const availableSubcategories = activeCategoryObj?.subcategories || [];

  // Automatic unique SKU generator
  const generateSku = (catSlug: string, name: string) => {
    if (isEditMode && sku) return; // Never overwrite on edit unless explicit
    const prefixMap: Record<string, string> = {
      "electrosurgical-units": "ESU",
      "cryo-surgical": "CRY",
      "ot-lights": "OTL",
      "examination-ot-tables": "OTT",
      "obstetrics-and-gynaecology": "OBG",
      "medical-equipment": "GME",
      "physiotherapy": "PHY"
    };
    const prefix = prefixMap[catSlug] || "MED";
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const newSku = `DRM-${prefix}-${randNum}`;
    setSku(newSku);
    validateSku(newSku);
  };

  // Check SKU uniqueness against server
  const validateSku = async (skuToCheck: string) => {
    if (!skuToCheck || !skuToCheck.trim()) {
      setSkuError("SKU is required.");
      return;
    }
    setIsCheckingSku(true);
    try {
      const res = await adminFetch(`/api/admin/products/check-sku?sku=${encodeURIComponent(skuToCheck)}&excludeId=${productId || ""}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && !data.isUnique) {
          setSkuError(`SKU is already used by: "${data.conflictingProduct?.title || 'Another product'}"`);
        } else {
          setSkuError(null);
        }
      }
    } catch (e) {
      // Non-fatal
    } finally {
      setIsCheckingSku(false);
    }
  };

  // Suggest product title based on category + model
  const handleSuggestTitle = () => {
    const catName = activeCategoryObj?.name || "Medical Device";
    const model = modelNumber ? ` Model ${modelNumber}` : "";
    const name = productName || "Advanced Clinical System";
    const suggested = `DR.MEDEX ${name}${model} | Certified ${catName}`;
    setTitle(suggested);
    if (!slug) {
      setSlug(suggested.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
    }
    setHasUnsavedChanges(true);
  };

  // Suggest slug from title
  const handleSuggestSlug = () => {
    const base = title || productName;
    if (base) {
      const s = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      setSlug(s);
      setHasUnsavedChanges(true);
    }
  };

  // Copy SKU button
  const handleCopySku = () => {
    if (sku) {
      navigator.clipboard.writeText(sku);
      setCopiedSku(true);
      setTimeout(() => setCopiedSku(false), 2000);
    }
  };

  // Handle image upload (converts to base64 and calls /api/admin/media/upload)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        await new Promise((resolve) => {
          reader.onload = async () => {
            const base64 = reader.result as string;
            const res = await adminFetch("/api/admin/media/upload", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: base64,
                filename: file.name,
                mimeType: file.type,
                productId: productId || "new-prod"
              })
            });
            if (res.ok) {
              const uData = await res.json();
              if (uData.success && uData.image?.url) {
                setImages((prev) => [...prev, uData.image.url]);
                setHasUnsavedChanges(true);
              }
            } else {
              // Fallback to direct data URL for immediate client preview
              setImages((prev) => [...prev, base64]);
              setHasUnsavedChanges(true);
            }
            resolve(true);
          };
          reader.readAsDataURL(file);
        });
      }
    } catch (err) {
      console.error("Failed to upload image:", err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (primaryImageIndex >= indexToRemove && primaryImageIndex > 0) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
    setHasUnsavedChanges(true);
  };

  // AI Description Generator
  const handleGenerateAi = async () => {
    setIsAiGenerating(true);
    try {
      const res = await adminFetch("/api/admin/products/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: productId,
          productName: productName || title,
          category,
          categoryName: activeCategoryObj?.name,
          subcategory,
          modelNumber,
          specifications: specList.reduce((acc, cur) => ({ ...acc, [cur.key]: cur.value }), {})
        })
      });
      if (res.ok) {
        const d = await res.json();
        if (d.success && d.generated) {
          setAiGeneratedPreview({
            shortDescription: d.generated.shortDescription,
            fullDescription: d.generated.fullDescription,
            keyFeatures: d.generated.keyFeatures || d.generated.features,
            metaDescription: d.generated.metaDescription
          });
        }
      }
    } catch (e) {
      console.error("AI Generation error:", e);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleApplyAi = () => {
    if (!aiGeneratedPreview) return;
    if (aiGeneratedPreview.shortDescription) setShortDescription(aiGeneratedPreview.shortDescription);
    if (aiGeneratedPreview.fullDescription) setFullDescription(aiGeneratedPreview.fullDescription);
    if (aiGeneratedPreview.keyFeatures && aiGeneratedPreview.keyFeatures.length > 0) {
      setKeyFeatures(aiGeneratedPreview.keyFeatures);
    }
    if (aiGeneratedPreview.metaDescription) setMetaDescription(aiGeneratedPreview.metaDescription);
    setAiGeneratedPreview(null);
    setHasUnsavedChanges(true);
    setStatusBanner({ type: "success", text: "AI descriptions applied to form." });
  };

  // Main Save Submission
  const handleSaveProduct = async (saveAsStatus?: "ACTIVE" | "DRAFT") => {
    // Basic validation
    if (!productName.trim() && !title.trim()) {
      setStatusBanner({ type: "error", text: "Product Name is required." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!sku.trim()) {
      setStatusBanner({ type: "error", text: "Product SKU is required." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (skuError) {
      setStatusBanner({ type: "error", text: "Please resolve the SKU collision before saving." });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSaving(true);
    setStatusBanner(null);

    const technicalSpecsObj = specList.reduce((acc, cur) => {
      if (cur.key.trim()) acc[cur.key.trim()] = cur.value.trim();
      return acc;
    }, {} as Record<string, string>);

    const primaryImg = images[primaryImageIndex] || images[0] || "";

    const payload = {
      productName: productName.trim() || title.trim(),
      title: title.trim() || productName.trim(),
      category,
      categoryName: activeCategoryObj?.name || category,
      subcategory: subcategory || "general",
      productType: productType || "Medical Equipment",
      sku: sku.trim(),
      modelNumber: modelNumber.trim(),
      brand: brand || "DR.MEDEX",
      status: saveAsStatus || status,
      basePrice: Number(basePrice) || 0,
      sellingPrice: Number(basePrice) || 0,
      regularPrice: Number(originalPrice) || Number(basePrice) || 0,
      originalPrice: Number(originalPrice) || Number(basePrice) || 0,
      discountPercentage,
      baseCurrency,
      stock: Number(stock) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 3,
      stockStatus,
      images,
      primaryImage: primaryImg,
      shortDescription: shortDescription.trim() || shortSummary.trim(),
      overview: shortDescription.trim() || shortSummary.trim(),
      fullDescription: fullDescription.trim(),
      features: keyFeatures,
      keyFeatures,
      applications,
      packageContents,
      specifications: technicalSpecsObj,
      technicalSpecifications: technicalSpecsObj,
      certifications,
      certificateNumber,
      issuingOrganization: issuingOrg,
      expirationDate,
      manualUrl,
      datasheetUrl,
      slug: slug.trim() || (title || productName).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      metaTitle: metaTitle.trim() || title.trim(),
      metaDescription: metaDescription.trim() || shortDescription.trim(),
      featured: isFeatured,
      isFeatured,
      bestseller: isBestSeller,
      isBestSeller,
      newProduct
    };

    try {
      const endpoint = isEditMode ? `/api/admin/products/${productId}` : "/api/admin/products";
      const method = isEditMode ? "PUT" : "POST";

      const res = await adminFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        setHasUnsavedChanges(false);
        setStatusBanner({
          type: "success",
          text: isEditMode
            ? "Product catalogue record successfully updated."
            : "New medical equipment product successfully created."
        });

        if (!isEditMode && resData.product?.id) {
          // Navigate to edit route of newly created product
          setTimeout(() => {
            navigate(`/admin/products/${resData.product.id}/edit`, { replace: true });
          }, 1000);
        }
      } else {
        setStatusBanner({
          type: "error",
          text: resData.message || "Failed to persist product data to central medical database."
        });
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setStatusBanner({ type: "error", text: "Network error while saving product." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!window.confirm("You have unsaved changes. Are you sure you want to discard them and return to products?")) {
        return;
      }
    }
    navigate("/admin/products");
  };

  if (isLoading) {
    return (
      <AdminLayout title="Loading Product Editor..." subtitle="Accessing verified catalogue records">
        <div className="py-24 text-center">
          <div className="w-9 h-9 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider">
            Fetching product technical records...
          </p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEditMode ? `Edit Product: ${title || productName}` : "Add New Medical Equipment"}
      subtitle={
        isEditMode
          ? `SKU: ${sku || "N/A"} • Category: ${activeCategoryObj?.name || category}`
          : "Create a verified medical device record in the DR.MEDEX international catalogue"
      }
      breadcrumbs={[
        { label: "Products", href: "/admin/products" },
        { label: isEditMode ? "Edit Product" : "New Product" }
      ]}
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 bg-white border border-black text-black hover:bg-neutral-100 rounded-lg text-xs font-bold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveProduct("DRAFT")}
            className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 hover:text-black hover:border-black rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveProduct()}
            className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            {isSaving && <RefreshCw size={13} className="animate-spin" />}
            <span>{isEditMode ? "Save Catalogue Product" : "Create Product"}</span>
          </button>
        </div>
      }
    >
      {/* Top Notification Banner */}
      {statusBanner && (
        <div
          className={`mb-6 p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            statusBanner.type === "success"
              ? "bg-neutral-100 border-neutral-400 text-black"
              : "bg-neutral-100 border-black text-black"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === "success" ? (
              <CheckCircle2 size={16} className="text-black shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-black shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button type="button" onClick={() => setStatusBanner(null)} className="text-neutral-500 hover:text-black">
            ✕
          </button>
        </div>
      )}

      {/* CONTINUOUS SCROLLABLE SINGLE PAGE FORM */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveProduct();
        }}
        className="space-y-8"
      >
        {/* ============================================================ */}
        {/* SECTION A — PRODUCT IDENTITY & CLASSIFICATION               */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-black uppercase tracking-wider font-mono">
                Section A — Product Information
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Primary categorization, taxonomies, and international identification
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-300">
              Identity & Taxonomy
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Primary Category */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Primary Category <span className="text-neutral-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory("");
                  if (!isEditMode) generateSku(e.target.value, productName);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black transition-colors cursor-pointer"
              >
                {allCategories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name} {c.status === "INACTIVE" || c.active === false ? "(Inactive)" : ""}
                  </option>
                ))}
              </select>
              {activeCategoryObj?.status === "INACTIVE" && (
                <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                  Notice: Parent category is marked Inactive. Visible to admin only.
                </p>
              )}
            </div>

            {/* Subcategory */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Subcategory
              </label>
              <select
                value={subcategory}
                onChange={(e) => {
                  setSubcategory(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black transition-colors cursor-pointer"
              >
                <option value="">Select Subcategory</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub.id} value={sub.slug}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Type / Equipment Type */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Product / Equipment Type
              </label>
              <input
                type="text"
                value={productType}
                onChange={(e) => {
                  setProductType(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. Surgical Light, Electrosurgical Unit"
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-black mb-1.5">
                Product Name <span className="text-neutral-400">*</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  if (!title) setTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. Lumina 700+500 Dual Dome OT Surgical Light"
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Model Number */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Model Number
              </label>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => {
                  setModelNumber(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. LUM-750-LED"
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Product Title (with Suggest Button) */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-black">
                  Product Title (Storefront Display)
                </label>
                <button
                  type="button"
                  onClick={handleSuggestTitle}
                  className="text-3xs font-mono font-bold text-black hover:underline flex items-center gap-1"
                >
                  <Sparkles size={11} />
                  <span>Auto Suggest Title</span>
                </button>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Full storefront title"
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Manufacturer / Brand */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Manufacturer / Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Product SKU (with validation & Copy button) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-black">
                  Product SKU <span className="text-neutral-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySku}
                    className="text-3xs font-mono font-bold text-black hover:underline flex items-center gap-1"
                  >
                    {copiedSku ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedSku ? "Copied" : "Copy SKU"}</span>
                  </button>
                  {!isEditMode && (
                    <button
                      type="button"
                      onClick={() => generateSku(category, productName)}
                      className="text-3xs font-mono font-bold text-neutral-500 hover:text-black"
                    >
                      Regenerate
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => {
                    const newS = e.target.value.toUpperCase();
                    setSku(newS);
                    validateSku(newS);
                    setHasUnsavedChanges(true);
                  }}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-xs font-mono font-bold text-black focus:outline-none transition-colors ${
                    skuError ? "border-black bg-neutral-50" : "border-[#CCCCCC] focus:border-black"
                  }`}
                />
                {isCheckingSku && (
                  <RefreshCw size={12} className="animate-spin absolute right-3 top-3 text-neutral-400" />
                )}
              </div>
              {skuError && <p className="text-[11px] text-black font-semibold mt-1 font-mono">{skuError}</p>}
            </div>

            {/* Publication Status */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Publication Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as any);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-bold text-black focus:outline-none focus:border-black transition-colors cursor-pointer"
              >
                <option value="ACTIVE">ACTIVE (Published)</option>
                <option value="DRAFT">DRAFT (Internal Review)</option>
                <option value="ARCHIVED">ARCHIVED (Preserved / Hidden)</option>
              </select>
            </div>
          </div>

          {/* Short Product Summary */}
          <div>
            <label className="block text-xs font-bold text-black mb-1.5">
              Short Product Summary
            </label>
            <textarea
              rows={2}
              value={shortSummary}
              onChange={(e) => {
                setShortSummary(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="High-level engineering summary for catalog headers and index cards..."
              className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black transition-colors"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION B — PRICING & INVENTORY                              */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-black uppercase tracking-wider font-mono">
                Section B — Pricing & Stock
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Base commercial terms, currency handling, and warehouse inventory control
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-300">
              Commercial Values
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Original Price / MRP */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Original Price / MRP
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-neutral-400 font-mono">
                  {baseCurrency}
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={originalPrice || ""}
                  onChange={(e) => {
                    setOriginalPrice(parseFloat(e.target.value) || 0);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="0.00"
                  className="w-full pl-12 pr-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-bold font-mono text-black focus:outline-none focus:border-black transition-colors"
                />
              </div>
            </div>

            {/* Selling Price / Base Price */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Selling Price (Base Price) <span className="text-neutral-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-neutral-400 font-mono">
                  {baseCurrency}
                </span>
                <input
                  type="number"
                  required
                  min="0"
                  step="any"
                  value={basePrice || ""}
                  onChange={(e) => {
                    setBasePrice(parseFloat(e.target.value) || 0);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="0.00"
                  className="w-full pl-12 pr-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-bold font-mono text-black focus:outline-none focus:border-black transition-colors"
                />
              </div>
            </div>

            {/* Base Currency */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Base Currency
              </label>
              <select
                value={baseCurrency}
                onChange={(e) => {
                  setBaseCurrency(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-bold text-black focus:outline-none focus:border-black transition-colors cursor-pointer"
              >
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
                <option value="AED">AED — UAE Dirham</option>
              </select>
            </div>

            {/* Calculated Discount */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Calculated Discount
              </label>
              <div className="w-full px-3.5 py-2.5 bg-neutral-100 border border-neutral-300 rounded-lg text-xs font-bold font-mono text-black flex items-center justify-between">
                <span>{discountPercentage}% Off</span>
                <span className="text-neutral-500 font-normal text-[10px]">Auto formula</span>
              </div>
            </div>

            {/* Available Quantity */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Available Quantity (Stock)
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => {
                  const s = parseInt(e.target.value) || 0;
                  setStock(s);
                  setStockStatus(s <= 0 ? "OUT_OF_STOCK" : s <= lowStockThreshold ? "LOW_STOCK" : "IN_STOCK");
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-bold font-mono text-black focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Low Stock Threshold */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => {
                  setLowStockThreshold(parseInt(e.target.value) || 3);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-bold font-mono text-black focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Stock Status */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Stock Status
              </label>
              <select
                value={stockStatus}
                onChange={(e) => {
                  setStockStatus(e.target.value as any);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-bold text-black focus:outline-none focus:border-black transition-colors cursor-pointer"
              >
                <option value="IN_STOCK">In Stock (Available)</option>
                <option value="LOW_STOCK">Low Stock (Limited)</option>
                <option value="OUT_OF_STOCK">Out of Stock (Backorder)</option>
              </select>
            </div>

            {/* Track Inventory Toggle */}
            <div className="flex items-center gap-3 pt-6">
              <input
                type="checkbox"
                id="trackInv"
                checked={trackInventory}
                onChange={(e) => {
                  setTrackInventory(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black accent-black cursor-pointer"
              />
              <label htmlFor="trackInv" className="text-xs font-bold text-black cursor-pointer">
                Track Inventory Quantity
              </label>
            </div>
          </div>

          {/* Pricing Summary Strip */}
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <span className="text-neutral-500">Summary: </span>
              <strong className="text-black">
                {baseCurrency} {basePrice?.toLocaleString()}
              </strong>
              {originalPrice > basePrice && (
                <span className="line-through text-neutral-400 ml-2 font-mono">
                  {baseCurrency} {originalPrice?.toLocaleString()}
                </span>
              )}
            </div>
            <div className="text-[11px] font-mono text-neutral-500">
              International Currency Auto-Conversion Active (100+ countries)
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION C — PRODUCT IMAGES & MEDIA                           */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-black uppercase tracking-wider font-mono">
                Section C — Product Images
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                High-resolution medical photography, gallery sequencing, and primary storefront image
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-300">
              {images.length} Images Loaded
            </span>
          </div>

          {/* Large Full-Width Drag-and-Drop Upload Area */}
          <div className="border-2 border-dashed border-neutral-300 hover:border-black rounded-2xl p-8 text-center transition-colors bg-neutral-50/50">
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-neutral-300 flex items-center justify-center mx-auto text-black shadow-2xs">
                <Upload size={22} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-black uppercase tracking-wider">
                  Upload Product Photography
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Drag & drop medical equipment photos, or click to browse local files (JPEG, PNG, WebP)
                </p>
              </div>

              <div className="pt-2">
                <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                  <span>{isUploadingImage ? "Processing Media..." : "Upload Product Images"}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploadingImage}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Existing Image Gallery Grid */}
          {images.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-black uppercase font-mono tracking-wider">
                  Catalogue Image Gallery (First image or selected Primary is storefront thumbnail)
                </span>
                <span className="text-3xs text-neutral-500 font-mono">
                  Click 'Set Primary' to designate main storefront photo
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {images.map((imgUrl, idx) => {
                  const isPrimary = idx === primaryImageIndex;
                  return (
                    <div
                      key={idx}
                      className={`relative group rounded-xl border overflow-hidden bg-neutral-50 flex flex-col justify-between ${
                        isPrimary ? "border-black ring-2 ring-black" : "border-neutral-200"
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="aspect-square bg-white flex items-center justify-center p-2 overflow-hidden">
                        <img
                          src={imgUrl}
                          alt={`Product Preview ${idx + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=400&q=80";
                          }}
                        />
                      </div>

                      {/* Primary Badge */}
                      {isPrimary && (
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black text-white font-mono shadow-2xs">
                          Primary
                        </div>
                      )}

                      {/* Card Actions */}
                      <div className="p-2 border-t border-neutral-100 flex items-center justify-between bg-white text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setPrimaryImageIndex(idx);
                            setHasUnsavedChanges(true);
                          }}
                          className={`text-[10px] font-bold transition-colors ${
                            isPrimary ? "text-black" : "text-neutral-500 hover:text-black"
                          }`}
                        >
                          {isPrimary ? "★ Primary" : "Set Primary"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          title="Remove image"
                          className="text-neutral-400 hover:text-black p-1 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION D — PRODUCT DESCRIPTIONS & POLICIES                  */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-black uppercase tracking-wider font-mono">
                Section D — Product Description & Content
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Clinical descriptions, key engineering features, intended medical applications, and warranty
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-300">
              Medical Content
            </span>
          </div>

          <div className="space-y-6">
            {/* Short Description */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Short Description (Overview)
              </label>
              <textarea
                rows={3}
                value={shortDescription}
                onChange={(e) => {
                  setShortDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Concise biomedical description shown in search results and customer summaries..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Detailed Product Description
              </label>
              <textarea
                rows={6}
                value={fullDescription}
                onChange={(e) => {
                  setFullDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Comprehensive technical breakdown, optical architecture, circuit isolation, clinical workflow benefits..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black transition-colors"
              />
            </div>

            {/* Key Features Bullet Editor */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Key Features
              </label>
              <div className="space-y-2 mb-3">
                {keyFeatures.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                    <input
                      type="text"
                      value={feat}
                      onChange={(e) => {
                        const copy = [...keyFeatures];
                        copy[idx] = e.target.value;
                        setKeyFeatures(copy);
                        setHasUnsavedChanges(true);
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setKeyFeatures(keyFeatures.filter((_, i) => i !== idx));
                        setHasUnsavedChanges(true);
                      }}
                      className="text-neutral-400 hover:text-black p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFeatureText}
                  onChange={(e) => setNewFeatureText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newFeatureText.trim()) {
                      e.preventDefault();
                      setKeyFeatures([...keyFeatures, newFeatureText.trim()]);
                      setNewFeatureText("");
                      setHasUnsavedChanges(true);
                    }
                  }}
                  placeholder="Add a key feature bullet point..."
                  className="flex-1 px-3 py-2 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newFeatureText.trim()) {
                      setKeyFeatures([...keyFeatures, newFeatureText.trim()]);
                      setNewFeatureText("");
                      setHasUnsavedChanges(true);
                    }
                  }}
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800"
                >
                  Add Feature
                </button>
              </div>
            </div>

            {/* Applications & Intended Uses */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Applications / Intended Clinical Uses
              </label>
              <div className="space-y-2 mb-3">
                {applications.map((app, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 shrink-0" />
                    <input
                      type="text"
                      value={app}
                      onChange={(e) => {
                        const copy = [...applications];
                        copy[idx] = e.target.value;
                        setApplications(copy);
                        setHasUnsavedChanges(true);
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setApplications(applications.filter((_, i) => i !== idx));
                        setHasUnsavedChanges(true);
                      }}
                      className="text-neutral-400 hover:text-black p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newAppText}
                  onChange={(e) => setNewAppText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newAppText.trim()) {
                      e.preventDefault();
                      setApplications([...applications, newAppText.trim()]);
                      setNewAppText("");
                      setHasUnsavedChanges(true);
                    }
                  }}
                  placeholder="Add a clinical application (e.g. General Surgery, Cardiac OR)..."
                  className="flex-1 px-3 py-2 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newAppText.trim()) {
                      setApplications([...applications, newAppText.trim()]);
                      setNewAppText("");
                      setHasUnsavedChanges(true);
                    }
                  }}
                  className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800"
                >
                  Add Application
                </button>
              </div>
            </div>

            {/* Warranty, Shipping & Return Policies (Medical Compliant) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Warranty Information
                </label>
                <input
                  type="text"
                  value={warranty}
                  onChange={(e) => {
                    setWarranty(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Shipping Information
                </label>
                <input
                  type="text"
                  value={shippingInformation}
                  onChange={(e) => {
                    setShippingInformation(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black mb-1.5">
                  Returns & Quarantine Policy
                </label>
                <input
                  type="text"
                  value={returnsPolicy}
                  onChange={(e) => {
                    setReturnsPolicy(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION E — TECHNICAL SPECIFICATIONS                         */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-black uppercase tracking-wider font-mono">
                Section E — Technical Specifications
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Biomedical parameters, dimensions, electrical ratings, and engineering metrics
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-300">
              {specList.length} Parameters
            </span>
          </div>

          {/* Specifications Table Editor */}
          <div className="space-y-3">
            {specList.length > 0 && (
              <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-200">
                <div className="bg-neutral-100 px-4 py-2.5 flex items-center justify-between text-2xs font-bold uppercase font-mono tracking-wider text-black">
                  <span className="w-1/3">Specification Parameter</span>
                  <span className="w-1/2">Verified Clinical Value</span>
                  <span className="w-16 text-right">Action</span>
                </div>
                {specList.map((spec, idx) => (
                  <div key={idx} className="p-3 bg-white flex items-center justify-between gap-4">
                    <input
                      type="text"
                      value={spec.key}
                      onChange={(e) => {
                        const copy = [...specList];
                        copy[idx].key = e.target.value;
                        setSpecList(copy);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="e.g. Illuminance (Lux)"
                      className="w-1/3 px-3 py-1.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-semibold text-black focus:outline-none focus:border-black"
                    />
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => {
                        const copy = [...specList];
                        copy[idx].value = e.target.value;
                        setSpecList(copy);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="e.g. 160,000 Lux @ 1 Meter"
                      className="w-1/2 px-3 py-1.5 bg-white border border-[#CCCCCC] rounded-md text-xs font-mono text-black focus:outline-none focus:border-black"
                    />
                    <div className="w-16 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSpecList(specList.filter((_, i) => i !== idx));
                          setHasUnsavedChanges(true);
                        }}
                        className="text-neutral-400 hover:text-black p-1"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Specification Row */}
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                placeholder="Parameter Name (e.g. Power Supply)"
                className="w-full sm:w-1/3 px-3.5 py-2 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black"
              />
              <input
                type="text"
                value={newSpecVal}
                onChange={(e) => setNewSpecVal(e.target.value)}
                placeholder="Parameter Value (e.g. 220V / 50Hz)"
                className="w-full sm:flex-1 px-3.5 py-2 bg-white border border-[#CCCCCC] rounded-lg text-xs font-medium text-black focus:outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSpecKey.trim()) {
                    setSpecList([...specList, { key: newSpecKey.trim(), value: newSpecVal.trim() }]);
                    setNewSpecKey("");
                    setNewSpecVal("");
                    setHasUnsavedChanges(true);
                  }
                }}
                className="w-full sm:w-auto px-5 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800 shrink-0"
              >
                Add Specification
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION F — CERTIFICATIONS & DOCUMENTATION                   */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-black uppercase tracking-wider font-mono">
                Section F — Certifications & Documents
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Official regulatory approvals, CE / ISO numbers, user manuals, and technical datasheets
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-300">
              Verified Compliance
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Certificate Number
              </label>
              <input
                type="text"
                value={certificateNumber}
                onChange={(e) => {
                  setCertificateNumber(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-mono text-black focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Issuing Regulatory Body
              </label>
              <input
                type="text"
                value={issuingOrg}
                onChange={(e) => {
                  setIssuingOrg(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Expiration Date
              </label>
              <input
                type="date"
                value={expirationDate}
                onChange={(e) => {
                  setExpirationDate(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-mono text-black focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Certifications Bullet List */}
          <div>
            <label className="block text-xs font-bold text-black mb-1.5">
              Verified Standards & Regulatory Compliance
            </label>
            <div className="space-y-2 mb-3">
              {certifications.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0" />
                  <input
                    type="text"
                    value={c}
                    onChange={(e) => {
                      const copy = [...certifications];
                      copy[idx] = e.target.value;
                      setCertifications(copy);
                      setHasUnsavedChanges(true);
                    }}
                    className="flex-1 px-3 py-1.5 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCertifications(certifications.filter((_, i) => i !== idx));
                      setHasUnsavedChanges(true);
                    }}
                    className="text-neutral-400 hover:text-black p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCertText}
                onChange={(e) => setNewCertText(e.target.value)}
                placeholder="Add verified certification (e.g. ISO 13485, CE 0123)..."
                className="flex-1 px-3 py-2 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={() => {
                  if (newCertText.trim()) {
                    setCertifications([...certifications, newCertText.trim()]);
                    setNewCertText("");
                    setHasUnsavedChanges(true);
                  }
                }}
                className="px-4 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-neutral-800"
              >
                Add Certification
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION G — SEO & PRODUCT URL                                */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-black uppercase tracking-wider font-mono">
                Section G — SEO & URL Settings
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Canonical URL slug, search engine meta titles, descriptions, and indexing
              </p>
            </div>
            <button
              type="button"
              onClick={handleSuggestSlug}
              className="text-3xs font-mono font-bold text-black hover:underline flex items-center gap-1"
            >
              <Sparkles size={11} />
              <span>Generate Slug</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slug */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-black mb-1.5">
                Product URL Slug (Permanent Storefront Link)
              </label>
              <div className="relative flex items-center">
                <span className="px-3 py-2.5 bg-neutral-100 border border-r-0 border-[#CCCCCC] rounded-l-lg text-xs text-neutral-500 font-mono">
                  /product/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                    setHasUnsavedChanges(true);
                  }}
                  className="flex-1 px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-r-lg text-xs font-mono font-bold text-black focus:outline-none focus:border-black"
                />
              </div>
            </div>

            {/* SEO Meta Title */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                SEO Meta Title
              </label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => {
                  setMetaTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Google search result title tag..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
              />
            </div>

            {/* Canonical Slug / URL */}
            <div>
              <label className="block text-xs font-bold text-black mb-1.5">
                Canonical URL
              </label>
              <input
                type="text"
                value={canonicalUrl}
                onChange={(e) => {
                  setCanonicalUrl(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="https://drmedex.com/product/..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs font-mono text-black focus:outline-none focus:border-black"
              />
            </div>

            {/* Meta Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-black mb-1.5">
                SEO Meta Description
              </label>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => {
                  setMetaDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Search engine meta snippet..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#CCCCCC] rounded-lg text-xs text-black focus:outline-none focus:border-black"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION H — AI PRODUCT DESCRIPTION ASSISTANT                 */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Sparkles size={18} className="text-black" />
              <div>
                <h2 className="text-base font-bold text-black uppercase tracking-wider font-mono">
                  Section H — AI Product Description Assistant
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Automated biomedical description engine powered by verified medical specifications
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isAiGenerating}
              onClick={handleGenerateAi}
              className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors disabled:opacity-50"
            >
              {isAiGenerating && <RefreshCw size={13} className="animate-spin" />}
              <span>{isAiGenerating ? "Generating..." : "Generate Description"}</span>
            </button>
          </div>

          {/* AI Preview Area */}
          {aiGeneratedPreview ? (
            <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-300 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
                <span className="text-xs font-bold text-black font-mono">
                  Generated Biomedical Content Preview
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateAi}
                    className="text-xs text-neutral-600 hover:text-black font-medium underline"
                  >
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyAi}
                    className="px-4 py-1.5 bg-black text-white rounded-md text-xs font-bold hover:bg-neutral-800"
                  >
                    Apply to Form
                  </button>
                </div>
              </div>

              {aiGeneratedPreview.shortDescription && (
                <div>
                  <div className="text-[10px] font-bold font-mono uppercase text-neutral-500">Short Summary</div>
                  <p className="text-xs text-neutral-800 mt-1 leading-relaxed">
                    {aiGeneratedPreview.shortDescription}
                  </p>
                </div>
              )}

              {aiGeneratedPreview.fullDescription && (
                <div>
                  <div className="text-[10px] font-bold font-mono uppercase text-neutral-500">Detailed Description</div>
                  <p className="text-xs text-neutral-800 mt-1 leading-relaxed">
                    {aiGeneratedPreview.fullDescription}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-neutral-500 bg-neutral-50 p-4 rounded-xl border border-dashed border-neutral-300 flex items-center justify-between">
              <span>
                Click "Generate Description" to synthesize clinical descriptions using model number, specifications, and category attributes.
              </span>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION I — PUBLISHING & VISIBILITY                          */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 lg:p-8 space-y-6">
          <div className="border-b border-[#E5E5E5] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-black uppercase tracking-wider font-mono">
                Section I — Publishing & Visibility
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Front-end store discovery badges and promotion ribbons
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-neutral-100 text-neutral-700 border border-neutral-300">
              Storefront Toggles
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <label className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => {
                  setIsFeatured(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
              />
              <div>
                <div className="text-xs font-bold text-black">Featured Product</div>
                <div className="text-[10px] text-neutral-500">Show in featured catalog carousel</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 cursor-pointer">
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={(e) => {
                  setIsBestSeller(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
              />
              <div>
                <div className="text-xs font-bold text-black">Bestseller</div>
                <div className="text-[10px] text-neutral-500">Display Bestseller badge</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 cursor-pointer">
              <input
                type="checkbox"
                checked={newProduct}
                onChange={(e) => {
                  setNewProduct(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
              />
              <div>
                <div className="text-xs font-bold text-black">New Arrival</div>
                <div className="text-[10px] text-neutral-500">Show New arrival ribbon</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnHomepage}
                onChange={(e) => {
                  setShowOnHomepage(e.target.checked);
                  setHasUnsavedChanges(true);
                }}
                className="w-4 h-4 rounded text-black focus:ring-black accent-black cursor-pointer"
              />
              <div>
                <div className="text-xs font-bold text-black">Show on Homepage</div>
                <div className="text-[10px] text-neutral-500">Allow homepage featured slots</div>
              </div>
            </label>
          </div>
        </div>

        {/* ============================================================ */}
        {/* STICKY BOTTOM SAVE ACTION BAR                                */}
        {/* ============================================================ */}
        <div className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] -mx-6 lg:-mx-8 px-6 lg:px-8 py-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 bg-white border border-black text-black hover:bg-neutral-100 rounded-lg text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            {hasUnsavedChanges && (
              <span className="text-[11px] font-mono text-neutral-500">
                • Unsaved changes on form
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSaveProduct("DRAFT")}
              className="px-5 py-2.5 bg-white border border-neutral-300 text-neutral-700 hover:text-black hover:border-black rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {isSaving && <RefreshCw size={13} className="animate-spin" />}
              <span>{isEditMode ? "Save Catalogue Product" : "Create Product"}</span>
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
};
