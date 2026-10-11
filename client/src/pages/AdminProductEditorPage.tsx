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
  ArrowRight,
  TrendingUp,
  Globe
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

  // Categories & Catalogue Hierarchy
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [catalogueHierarchy, setCatalogueHierarchy] = useState<Record<string, any>>({});

  // Duplicate product detection state
  const [duplicateInfo, setDuplicateInfo] = useState<{
    isDuplicate: boolean;
    duplicateProduct?: { id: string; title: string; sku: string; modelNumber?: string; slug?: string } | null;
  }>({ isDuplicate: false, duplicateProduct: null });
  const [allowDuplicateOverride, setAllowDuplicateOverride] = useState(false);

  // Exchange rates for live currency preview
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({
    USD: 0.010379,
    EUR: 0.009228,
    GBP: 0.007854,
    AED: 0.038116
  });
  const [rateTimestamp, setRateTimestamp] = useState<string | null>(null);

  // ==========================================
  // SECTION 1: CATEGORY & PRODUCT CLASSIFICATION
  // ==========================================
  const [category, setCategory] = useState("ot-lights");
  const [subcategory, setSubcategory] = useState("");
  const [equipmentType, setEquipmentType] = useState("");

  // ==========================================
  // SECTION 2: PRODUCT IDENTITY
  // ==========================================
  const [productName, setProductName] = useState("");
  const [title, setTitle] = useState("");
  const [manufacturerModel, setManufacturerModel] = useState("");
  const [internalModelId, setInternalModelId] = useState("");
  const [sku, setSku] = useState("");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState("DR.MEDEX");
  const [regulatoryClass, setRegulatoryClass] = useState("Class IIa (MDR 2017/745)");
  const [hasManuallyEditedIdentity, setHasManuallyEditedIdentity] = useState(false);

  // ==========================================
  // SECTION 3: PRICING & INVENTORY
  // ==========================================
  const [originalPrice, setOriginalPrice] = useState<number>(0); // MRP in INR
  const [basePrice, setBasePrice] = useState<number>(0); // Selling price in INR
  const [stock, setStock] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);
  const [stockStatus, setStockStatus] = useState<"IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "MADE_TO_ORDER">("IN_STOCK");
  const [minOrderQuantity, setMinOrderQuantity] = useState<number>(1);
  const [leadTimeWeeks, setLeadTimeWeeks] = useState("1–2 Weeks");

  // Calculated discount percentage & savings
  const { discountPercentage, calculatedSavings } = useMemo(() => {
    if (originalPrice > 0 && basePrice > 0 && originalPrice > basePrice) {
      const pct = Math.round(((originalPrice - basePrice) / originalPrice) * 100);
      const savings = originalPrice - basePrice;
      return { discountPercentage: pct, calculatedSavings: savings };
    }
    return { discountPercentage: 0, calculatedSavings: 0 };
  }, [originalPrice, basePrice]);

  // ==========================================
  // SECTION 4: PRODUCT IMAGES
  // ==========================================
  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // ==========================================
  // SECTION 5: PRODUCT DESCRIPTION
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

  // ==========================================
  // SECTION 6: TECHNICAL SPECIFICATIONS
  // ==========================================
  const [specList, setSpecList] = useState<{ key: string; value: string }[]>([]);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecVal, setNewSpecVal] = useState("");

  // ==========================================
  // SECTION 7: CERTIFICATIONS & DOCUMENTS
  // ==========================================
  const [certifications, setCertifications] = useState<string[]>([
    "ISO 13485:2016 Medical Devices Quality Management",
    "CE Medical Directive 93/42/EEC",
    "IEC 60601-1 Electrical Medical Safety Compliance"
  ]);
  const [newCertText, setNewCertText] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("MED-ISO-9948201");
  const [issuingOrg, setIssuingOrg] = useState("TÜV SÜD Medical Compliance");
  const [manualUrl, setManualUrl] = useState("");
  const [datasheetUrl, setDatasheetUrl] = useState("");

  // ==========================================
  // SECTION 8: SEO & URL
  // ==========================================
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // ==========================================
  // SECTION 9: PUBLISHING & VISIBILITY
  // ==========================================
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED">("ACTIVE");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [showOnHomepage, setShowOnHomepage] = useState(true);

  // ==========================================
  // SECTION 10: AI DESCRIPTION ASSISTANT
  // ==========================================
  const [aiTone, setAiTone] = useState<"CLINICAL" | "COMMERCIAL" | "TECHNICAL">("CLINICAL");
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [aiGeneratedPreview, setAiGeneratedPreview] = useState<{
    shortDescription?: string;
    fullDescription?: string;
    keyFeatures?: string[];
    metaDescription?: string;
  } | null>(null);

  // Fetch initial hierarchy, rates, and product details (if editing)
  useEffect(() => {
    async function initData() {
      try {
        const [catRes, hierRes, rateRes] = await Promise.all([
          fetch("/api/categories?includeInactive=true"),
          adminFetch("/api/admin/catalogue/hierarchy"),
          fetch("/api/currency/rates")
        ]);

        if (catRes.ok) {
          const cData = await catRes.json();
          if (cData.success && Array.isArray(cData.categories)) {
            setAllCategories(cData.categories);
          }
        }

        if (hierRes.ok) {
          const hData = await hierRes.json();
          if (hData.success && hData.hierarchy) {
            setCatalogueHierarchy(hData.hierarchy);
          }
        }

        if (rateRes.ok) {
          const rData = await rateRes.json();
          if (rData.success && rData.rates) {
            setExchangeRates(rData.rates);
            if (rData.lastFetchedAt) setRateTimestamp(rData.lastFetchedAt);
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
              setEquipmentType(p.equipmentType || "");
              setProductName(p.productName || p.title || "");
              setTitle(p.title || p.productName || "");
              setManufacturerModel(p.modelNumber || "");
              setInternalModelId(p.internalModelId || `DM-${p.sku || p.id}`);
              setSku(p.sku || p.SKU || "");
              setSlug(p.slug || "");
              setBrand(p.brand || "DR.MEDEX");
              setRegulatoryClass(p.regulatoryClassification || "Class IIa (MDR 2017/745)");
              setStatus(p.status || "ACTIVE");

              // Prices in INR
              setOriginalPrice(p.originalPrice || p.regularPrice || p.basePrice || 0);
              setBasePrice(p.basePrice || p.salePrice || 0);
              setStock(p.stock !== undefined ? p.stock : 10);
              setLowStockThreshold(p.lowStockThreshold || 3);
              setStockStatus(p.stockStatus || (p.stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"));
              setMinOrderQuantity(p.moq || 1);
              setLeadTimeWeeks(p.leadTimeWeeks || "1–2 Weeks");

              setImages(p.images || (p.primaryImage ? [p.primaryImage] : []));
              setShortDescription(p.shortDescription || p.overview || "");
              setFullDescription(p.fullDescription || p.overview || "");
              setKeyFeatures(p.features || p.keyFeatures || []);
              setApplications(p.applications || []);
              setPackageContents(p.packageContents || []);
              if (p.warranty) setWarranty(p.warranty);
              if (p.shippingInformation) setShippingInformation(p.shippingInformation);

              // Technical specs
              const specs = p.technicalSpecifications || p.specifications || {};
              const convertedSpecs = Object.entries(specs).map(([k, v]) => ({ key: k, value: String(v) }));
              setSpecList(convertedSpecs);

              if (p.certifications && p.certifications.length > 0) {
                setCertifications(p.certifications);
              }
              if (p.certificateNumber) setCertificateNumber(p.certificateNumber);
              if (p.issuingOrg) setIssuingOrg(p.issuingOrg);
              if (p.manualUrl) setManualUrl(p.manualUrl);
              if (p.datasheetUrl) setDatasheetUrl(p.datasheetUrl);

              setMetaTitle(p.metaTitle || p.title || "");
              setMetaDescription(p.metaDescription || p.shortDescription || "");
              setIsFeatured(Boolean(p.featured || p.isFeatured));
              setIsBestSeller(Boolean(p.bestseller || p.isBestSeller));
              setShowOnHomepage(p.showOnHomepage !== false);
              setHasManuallyEditedIdentity(true);
            }
          }
        } else {
          // Initialize defaults for new product
          fetchNewSku("ot-lights");
        }
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initData();
  }, [productId, isEditMode]);

  // Dependent available subcategories
  const currentCategoryHierarchy = catalogueHierarchy[category] || null;
  const availableSubcategories: { id: string; name: string; equipmentTypes: { id: string; name: string; defaultCode: string }[] }[] =
    currentCategoryHierarchy?.subcategories || [];

  // Dependent available equipment types
  const currentSubcategoryObj = availableSubcategories.find((s) => s.id === subcategory || s.name === subcategory);
  const availableEquipmentTypes: { id: string; name: string; defaultCode: string }[] =
    currentSubcategoryObj?.equipmentTypes || [];

  // Fetch unique SKU from backend
  const fetchNewSku = async (catSlug: string) => {
    try {
      const res = await adminFetch(`/api/admin/products/generate-sku?category=${catSlug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sku) {
          setSku(data.sku);
          validateSku(data.sku);
        }
      }
    } catch (e) {
      // Fallback
    }
  };

  // Check SKU uniqueness
  const validateSku = async (skuToCheck: string) => {
    if (!skuToCheck || !skuToCheck.trim()) {
      setSkuError("SKU is required.");
      return;
    }
    setIsCheckingSku(true);
    try {
      const res = await adminFetch(
        `/api/admin/products/check-sku?sku=${encodeURIComponent(skuToCheck)}&excludeId=${productId || ""}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && !data.isUnique) {
          setSkuError(`SKU is already assigned to: "${data.conflictingProduct?.title || "Existing product"}"`);
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

  // Real-time Duplicate Product Check
  useEffect(() => {
    let active = true;
    async function checkDuplicate() {
      if (!category) return;
      try {
        const res = await adminFetch("/api/admin/products/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            subcategory,
            equipmentType,
            modelNumber: manufacturerModel,
            title,
            productName,
            excludeId: productId || ""
          })
        });

        if (res.ok && active) {
          const data = await res.json();
          if (data.success && data.isDuplicate) {
            setDuplicateInfo({
              isDuplicate: true,
              duplicateProduct: data.duplicateProduct
            });
          } else {
            setDuplicateInfo({ isDuplicate: false, duplicateProduct: null });
          }
        }
      } catch (err) {
        // Non-fatal
      }
    }

    const timer = setTimeout(checkDuplicate, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [category, subcategory, equipmentType, manufacturerModel, title, productName, productId]);

  // Automatic Product Identity Generation
  const applyGeneratedIdentity = (catId: string, subId: string, eqName: string, force = false) => {
    if (isEditMode && !force) return;
    if (hasManuallyEditedIdentity && !force) return;

    const subObj = availableSubcategories.find((s) => s.id === subId || s.name === subId);
    const subLabel = subObj?.name || subId;
    const eqLabel = eqName || "Medical Equipment";

    // 1. Product Name: [Equipment Type] – [Subcategory]
    const generatedName = `${eqLabel} – ${subLabel}`;
    setProductName(generatedName);

    // 2. Product Title: SEO-friendly DR.MEDEX format
    const generatedTitle = `DR.MEDEX ${eqLabel} | ${subLabel}`;
    setTitle(generatedTitle);

    // 3. Unique Internal Model Identifier
    const catCode = currentCategoryHierarchy?.code || "MED";
    const eqObj = availableEquipmentTypes.find((e) => e.name === eqName || e.id === eqName);
    const typeCode = eqObj?.defaultCode || "STD";
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const generatedInternalModel = `DM-${catCode}-${typeCode}-${randomSuffix}`;
    setInternalModelId(generatedInternalModel);

    // 4. URL Slug: SEO friendly URL slug
    const generatedSlug = `dr-medex-${eqLabel}-${subLabel}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    setSlug(generatedSlug);
    setMetaTitle(generatedTitle);
    setMetaDescription(`Certified DR.MEDEX ${eqLabel} engineered for hospital and surgical applications.`);
    setHasUnsavedChanges(true);
  };

  // Copy SKU action
  const handleCopySku = () => {
    if (sku) {
      navigator.clipboard.writeText(sku);
      setCopiedSku(true);
      setTimeout(() => setCopiedSku(false), 2000);
    }
  };

  // Handle image upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        const res = await adminFetch("/api/admin/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
            data: base64Data,
            productId: productId || "new"
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.asset?.url) {
            setImages((prev) => [...prev, data.asset.url]);
            setHasUnsavedChanges(true);
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Add image from URL
  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      setImages((prev) => [...prev, imageUrlInput.trim()]);
      setImageUrlInput("");
      setHasUnsavedChanges(true);
    }
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (primaryImageIndex >= index && primaryImageIndex > 0) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
    setHasUnsavedChanges(true);
  };

  // Add Spec
  const handleAddSpec = () => {
    if (newSpecKey.trim() && newSpecVal.trim()) {
      setSpecList((prev) => [...prev, { key: newSpecKey.trim(), value: newSpecVal.trim() }]);
      setNewSpecKey("");
      setNewSpecVal("");
      setHasUnsavedChanges(true);
    }
  };

  // AI Description Assistant
  const handleGenerateAiDescription = async () => {
    setIsAiGenerating(true);
    try {
      const res = await adminFetch("/api/admin/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName || title,
          category,
          subcategory,
          modelNumber: manufacturerModel || internalModelId,
          tone: aiTone,
          customPrompt: aiCustomPrompt
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.generated) {
          setAiGeneratedPreview(data.generated);
        }
      }
    } catch (err) {
      console.error("AI generation failed:", err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleApplyAiGenerated = () => {
    if (!aiGeneratedPreview) return;
    if (aiGeneratedPreview.shortDescription) setShortDescription(aiGeneratedPreview.shortDescription);
    if (aiGeneratedPreview.fullDescription) setFullDescription(aiGeneratedPreview.fullDescription);
    if (aiGeneratedPreview.keyFeatures && aiGeneratedPreview.keyFeatures.length > 0) {
      setKeyFeatures(aiGeneratedPreview.keyFeatures);
    }
    if (aiGeneratedPreview.metaDescription) setMetaDescription(aiGeneratedPreview.metaDescription);
    setAiGeneratedPreview(null);
    setHasUnsavedChanges(true);
  };

  // SAVE PRODUCT
  const handleSaveProduct = async () => {
    if (duplicateInfo.isDuplicate && !allowDuplicateOverride) {
      setStatusBanner({
        type: "error",
        text: "Cannot save: A matching product already exists in this category. Please resolve or check override."
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!productName.trim() && !title.trim()) {
      setStatusBanner({ type: "error", text: "Product Name or Title is required." });
      return;
    }

    if (!basePrice || basePrice <= 0) {
      setStatusBanner({ type: "error", text: "Please enter a valid INR selling price." });
      return;
    }

    setIsSaving(true);
    setStatusBanner(null);

    // Convert specList to key-value object
    const technicalSpecifications: Record<string, string> = {};
    specList.forEach((s) => {
      technicalSpecifications[s.key] = s.value;
    });

    const payload = {
      productName: productName.trim(),
      title: (title || productName).trim(),
      category,
      subcategory,
      equipmentType,
      modelNumber: manufacturerModel.trim() || undefined,
      internalModelId: internalModelId.trim() || undefined,
      sku: sku.trim(),
      slug: (slug || title).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      brand: brand.trim(),
      regulatoryClassification: regulatoryClass,
      status,

      // Authoritative pricing in INR
      basePrice: Number(basePrice),
      salePrice: Number(basePrice),
      regularPrice: Number(originalPrice || basePrice),
      originalPrice: Number(originalPrice || basePrice),
      baseCurrency: "INR",
      discountPercentage,
      calculatedSavings,

      stock: Number(stock),
      lowStockThreshold: Number(lowStockThreshold),
      stockStatus,
      moq: Number(minOrderQuantity),
      leadTimeWeeks,

      images: images.length > 0 ? images : ["https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80"],
      primaryImage: images[primaryImageIndex] || images[0] || "",

      shortDescription: shortDescription.trim(),
      fullDescription: fullDescription.trim(),
      features: keyFeatures,
      keyFeatures,
      applications,
      packageContents,
      warranty,
      shippingInformation,

      technicalSpecifications,
      specifications: technicalSpecifications,
      certifications,
      certificateNumber,
      issuingOrg,
      manualUrl,
      datasheetUrl,

      metaTitle: metaTitle.trim(),
      metaDescription: metaDescription.trim(),
      featured: isFeatured,
      isFeatured,
      bestseller: isBestSeller,
      isBestSeller,
      showOnHomepage,

      forceCreate: allowDuplicateOverride
    };

    try {
      const url = isEditMode ? `/api/admin/products/${productId}` : "/api/admin/products";
      const method = isEditMode ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setHasUnsavedChanges(false);
        setStatusBanner({
          type: "success",
          text: isEditMode
            ? "Medical equipment catalogue record updated successfully."
            : "New medical equipment record added to clinical inventory."
        });

        if (!isEditMode && data.product?.id) {
          navigate(`/admin/products/${data.product.id}/edit`, { replace: true });
        }
      } else {
        setStatusBanner({
          type: "error",
          text: data.message || "Failed to save product. Please check required fields."
        });
      }
    } catch (err: any) {
      console.error("Save error:", err);
      setStatusBanner({
        type: "error",
        text: "Network error occurred while saving product."
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout title="Medical Equipment Editor" subtitle="Loading catalogue record...">
        <div className="py-24 text-center space-y-4">
          <RefreshCw size={28} className="animate-spin text-[#2D5A4A] mx-auto" />
          <p className="text-xs font-mono text-[#4A4A4A]">Accessing central clinical inventory database...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isEditMode ? `Edit: ${productName || title || "Medical Equipment"}` : "Add New Medical Equipment"}
      subtitle={
        isEditMode
          ? `SKU: ${sku || "—"} | Category: ${category} | Authoritative INR Base Pricing`
          : "Systematic Catalogue Builder & Automatic Product Information Generator"
      }
      actions={
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="flex items-center gap-1.5 px-4 py-2 border border-[#E5E0D8] rounded-lg text-xs font-semibold text-[#111111] bg-white hover:bg-[#F4F1EB] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>All Products</span>
          </Link>

          {isEditMode && slug && (
            <Link
              to={`/product/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 border border-[#E5E0D8] rounded-lg text-xs font-semibold text-[#111111] bg-white hover:bg-[#F4F1EB] transition-colors"
            >
              <Eye size={14} />
              <span>Preview</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleSaveProduct}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-[#2D5A4A] hover:bg-[#0D4C3C] text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            <span>{isSaving ? "Saving..." : isEditMode ? "Save Changes" : "Create Product"}</span>
          </button>
        </div>
      }
    >
      {/* STATUS NOTIFICATION BANNER */}
      {statusBanner && (
        <div
          className={`mb-6 p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            statusBanner.type === "success"
              ? "bg-[#F4F1EB] border-[#7AA05A] text-[#0D4C3C]"
              : "bg-[#F4F1EB] border-black text-[#111111]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === "success" ? (
              <CheckCircle2 size={16} className="text-[#2D5A4A] shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-[#111111] shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button type="button" onClick={() => setStatusBanner(null)} className="text-[#737373] hover:text-[#111111]">
            ✕
          </button>
        </div>
      )}

      {/* DUPLICATE PRODUCT WARNING BANNER */}
      {duplicateInfo.isDuplicate && duplicateInfo.duplicateProduct && (
        <div className="mb-6 p-5 rounded-2xl border-2 border-[#2D5A4A] bg-[#F4F1EB] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-[#2D5A4A] text-white flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#111111]">
                A matching product already exists in this category.
              </h4>
              <p className="text-xs text-[#4A4A4A] mt-0.5">
                Please open the existing catalogue item instead of creating an inadvertent duplicate.
              </p>
              <div className="mt-2 text-xs font-mono bg-white p-2.5 rounded-lg border border-[#E5E0D8] inline-block">
                Existing Match: <span className="font-bold text-[#111111]">{duplicateInfo.duplicateProduct.title}</span> | SKU:{" "}
                <span className="font-bold text-[#2D5A4A]">{duplicateInfo.duplicateProduct.sku}</span>
                {duplicateInfo.duplicateProduct.modelNumber && (
                  <span> | Model: {duplicateInfo.duplicateProduct.modelNumber}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
            <Link
              to={`/admin/products/${duplicateInfo.duplicateProduct.id}/edit`}
              className="px-4 py-2 bg-[#2D5A4A] hover:bg-[#0D4C3C] text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-2"
            >
              <ExternalLink size={13} />
              <span>Open Existing Product</span>
            </Link>
            <label className="flex items-center gap-2 text-xs text-[#4A4A4A] cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuplicateOverride}
                onChange={(e) => setAllowDuplicateOverride(e.target.checked)}
                className="rounded border-[#E5E0D8] text-[#2D5A4A] focus:ring-[#2D5A4A]"
              />
              <span>Allow intentional distinct variant</span>
            </label>
          </div>
        </div>
      )}

      {/* CONTINUOUS SCROLLABLE SINGLE PAGE FORM (10 ORDERED SECTIONS) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveProduct();
        }}
        className="space-y-8"
      >
        {/* ============================================================ */}
        {/* SECTION 1 — CATEGORY & PRODUCT CLASSIFICATION               */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 lg:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7AA05A]">
                Step 1 of 10
              </span>
              <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider font-mono">
                1. Category & Product Classification
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Structured 3-tier hierarchy: Primary Category → Subcategory → Equipment Type
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[#F4F1EB] text-[#2D5A4A] border border-[#E5E0D8]">
              Catalogue Hierarchy
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Primary Category (7 categories) */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                1. Primary Category <span className="text-[#2D5A4A]">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value;
                  setCategory(newCat);
                  setSubcategory("");
                  setEquipmentType("");
                  if (!isEditMode) {
                    fetchNewSku(newCat);
                  }
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors cursor-pointer"
              >
                {allCategories.map((c) => {
                  const isInactive = c.status === "INACTIVE" || c.active === false;
                  return (
                    <option key={c.id} value={c.slug}>
                      {c.name} {isInactive ? "(Inactive)" : ""}
                    </option>
                  );
                })}
              </select>
              {category === "physiotherapy" && (
                <p className="text-[11px] text-[#737373] mt-1.5 font-mono bg-[#F4F1EB] p-2 rounded border border-[#E5E0D8]">
                  Note: Physiotherapy Machines is currently Inactive on the public storefront. Products are safely stored in admin catalogue.
                </p>
              )}
            </div>

            {/* Subcategory (Dependent on Category) */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                2. Subcategory <span className="text-[#2D5A4A]">*</span>
              </label>
              <select
                value={subcategory}
                onChange={(e) => {
                  const newSub = e.target.value;
                  setSubcategory(newSub);
                  setEquipmentType("");
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors cursor-pointer"
              >
                <option value="">— Select Subcategory —</option>
                {availableSubcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
              {availableSubcategories.length === 0 && (
                <p className="text-[11px] text-[#737373] mt-1">No subcategories registered for this category.</p>
              )}
            </div>

            {/* Product / Equipment Type (Dependent on Subcategory) */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                3. Product / Equipment Type <span className="text-[#2D5A4A]">*</span>
              </label>
              <select
                value={equipmentType}
                disabled={!subcategory || availableEquipmentTypes.length === 0}
                onChange={(e) => {
                  const newType = e.target.value;
                  setEquipmentType(newType);
                  applyGeneratedIdentity(category, subcategory, newType);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors cursor-pointer disabled:bg-[#F4F1EB] disabled:cursor-not-allowed"
              >
                <option value="">
                  {subcategory ? "— Select Verified Equipment Type —" : "Select Subcategory First"}
                </option>
                {availableEquipmentTypes.map((eq) => (
                  <option key={eq.id} value={eq.name}>
                    {eq.name}
                  </option>
                ))}
              </select>
              {subcategory && availableEquipmentTypes.length === 0 && (
                <p className="text-[11px] text-[#737373] mt-1">Select subcategory to view equipment types.</p>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2 — PRODUCT IDENTITY (AUTO-GENERATED & EDITABLE)    */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 lg:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7AA05A]">
                Step 2 of 10
              </span>
              <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider font-mono">
                2. Product Identity
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Automatically suggested identity based on verified catalogue selection
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (equipmentType && subcategory) {
                  applyGeneratedIdentity(category, subcategory, equipmentType, true);
                }
              }}
              className="text-xs font-bold text-[#2D5A4A] hover:text-[#0D4C3C] flex items-center gap-1.5 transition-colors"
            >
              <Sparkles size={13} />
              <span>Regenerate Suggestions</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Product Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Product Name <span className="text-[#2D5A4A]">*</span>
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  setHasManuallyEditedIdentity(true);
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. Ceiling-Mounted Single Dome LED OT Light – Single Dome OT Lights"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
              />
            </div>

            {/* Manufacturer Brand */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Manufacturer / Brand
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
              />
            </div>

            {/* Product Title (SEO / Storefront Display) */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Product Title (Storefront Display) <span className="text-[#2D5A4A]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasManuallyEditedIdentity(true);
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. DR.MEDEX Ceiling-Mounted Single Dome LED OT Light | Single Dome OT Lights"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
              />
            </div>

            {/* Manufacturer Model Number */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Manufacturer Model Number
              </label>
              <input
                type="text"
                value={manufacturerModel}
                onChange={(e) => {
                  setManufacturerModel(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. MI HEX 90 / Star 84"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors font-mono"
              />
              <p className="text-[10px] text-[#737373] mt-1">Official manufacturer model if verified</p>
            </div>

            {/* Unique Internal Model Identifier */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Internal Model Identifier
              </label>
              <input
                type="text"
                value={internalModelId}
                onChange={(e) => {
                  setInternalModelId(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. DM-OTL-CSD-482"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors font-mono"
              />
              <p className="text-[10px] text-[#737373] mt-1">Internal tracking identifier</p>
            </div>

            {/* Unique SKU Number with Copy Button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#111111]">
                  SKU Number <span className="text-[#2D5A4A]">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleCopySku}
                  className="text-[11px] font-mono text-[#2D5A4A] hover:text-[#0D4C3C] flex items-center gap-1"
                >
                  {copiedSku ? <Check size={11} className="text-[#7AA05A]" /> : <Copy size={11} />}
                  <span>{copiedSku ? "Copied!" : "Copy SKU"}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => {
                    setSku(e.target.value.toUpperCase());
                    validateSku(e.target.value.toUpperCase());
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. DRM-OTL-0042"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-xs font-bold font-mono text-[#111111] focus:outline-none transition-colors ${
                    skuError ? "border-black bg-[#F4F1EB]" : "border-[#E5E0D8] focus:border-[#2D5A4A]"
                  }`}
                />
                {isCheckingSku && (
                  <span className="absolute right-3 top-2.5 text-[10px] font-mono text-[#737373]">Checking...</span>
                )}
              </div>
              {skuError ? (
                <p className="text-[10px] text-[#111111] font-bold mt-1 font-mono">{skuError}</p>
              ) : (
                <p className="text-[10px] text-[#7AA05A] font-medium mt-1">✓ Unique SKU format verified</p>
              )}
            </div>

            {/* URL Slug */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                URL Slug <span className="text-[#2D5A4A]">*</span>
              </label>
              <div className="flex items-center">
                <span className="px-3 py-2.5 bg-[#F4F1EB] border border-r-0 border-[#E5E0D8] rounded-l-lg text-xs font-mono text-[#737373]">
                  /product/
                </span>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="product-url-slug"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-r-lg text-xs font-mono text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
                />
              </div>
            </div>

            {/* Regulatory Classification */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Regulatory Classification
              </label>
              <select
                value={regulatoryClass}
                onChange={(e) => {
                  setRegulatoryClass(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors cursor-pointer"
              >
                <option value="Class I (Non-invasive Medical Device)">Class I (Non-invasive Medical Device)</option>
                <option value="Class IIa (MDR 2017/745)">Class IIa (MDR 2017/745)</option>
                <option value="Class IIb (High-Risk Surgical Device)">Class IIb (High-Risk Surgical Device)</option>
                <option value="Class III (Critical Implantable / Life-Support)">Class III (Critical Implantable / Life-Support)</option>
              </select>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 3 — PRICING & INVENTORY (INR BASE + LIVE CONVERSION) */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 lg:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7AA05A]">
                Step 3 of 10
              </span>
              <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider font-mono">
                3. Pricing & Inventory
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Authoritative base currency in Indian Rupees (INR) with automatic discount calculation & live world currency preview
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[#F4F1EB] text-[#2D5A4A] border border-[#E5E0D8]">
              Base Currency: INR (₹)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Original Price / MRP in INR */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Original Price / MRP (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-[#737373] font-mono">₹</span>
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
                  className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-bold font-mono text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
                />
              </div>
            </div>

            {/* Selling Price in INR */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Selling Price (₹ INR) <span className="text-[#2D5A4A]">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-[#737373] font-mono">₹</span>
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
                  className="w-full pl-8 pr-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-bold font-mono text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
                />
              </div>
            </div>

            {/* Discount Percentage Badge */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Discount Calculated
              </label>
              <div className="flex items-center gap-2 h-10 px-3.5 bg-[#F4F1EB] rounded-lg border border-[#E5E0D8]">
                <span className="text-xs font-mono font-bold text-[#2D5A4A]">
                  {discountPercentage > 0 ? `${discountPercentage}% OFF` : "No Discount"}
                </span>
                {calculatedSavings > 0 && (
                  <span className="text-[11px] font-mono text-[#7AA05A]">
                    (Saves ₹{calculatedSavings.toLocaleString()})
                  </span>
                )}
              </div>
            </div>

            {/* Stock Quantity */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Stock Quantity (Units)
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => {
                  const s = parseInt(e.target.value, 10) || 0;
                  setStock(s);
                  if (s <= 0) setStockStatus("OUT_OF_STOCK");
                  else if (s <= lowStockThreshold) setStockStatus("LOW_STOCK");
                  else setStockStatus("IN_STOCK");
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-bold font-mono text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
              />
            </div>

            {/* Stock Status */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Stock Status
              </label>
              <select
                value={stockStatus}
                onChange={(e) => {
                  setStockStatus(e.target.value as any);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors cursor-pointer"
              >
                <option value="IN_STOCK">In Stock (Immediate Dispatch)</option>
                <option value="LOW_STOCK">Low Stock (Reserved Quarantine)</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
                <option value="MADE_TO_ORDER">Made to Order / Build to Spec</option>
              </select>
            </div>

            {/* Low Stock Alert Threshold */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => {
                  setLowStockThreshold(parseInt(e.target.value, 10) || 3);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-mono text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
              />
            </div>

            {/* Minimum Order Quantity */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Minimum Order Quantity (MOQ)
              </label>
              <input
                type="number"
                min="1"
                value={minOrderQuantity}
                onChange={(e) => {
                  setMinOrderQuantity(parseInt(e.target.value, 10) || 1);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-mono text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
              />
            </div>

            {/* Manufacturing & Export Lead Time */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Dispatch Lead Time
              </label>
              <input
                type="text"
                value={leadTimeWeeks}
                onChange={(e) => {
                  setLeadTimeWeeks(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="e.g. 1–2 Weeks"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
              />
            </div>
          </div>

          {/* LIVE CURRENCY CONVERSION PREVIEW CARD */}
          <div className="p-5 rounded-xl bg-[#F4F1EB] border border-[#E5E0D8] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe size={15} className="text-[#2D5A4A]" />
                <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider font-mono">
                  Live World Currency Conversion Preview
                </h4>
              </div>
              <span className="text-[10px] font-mono text-[#737373]">
                {rateTimestamp ? `Synced: ${new Date(rateTimestamp).toLocaleTimeString()}` : "Real-time exchange rates synced"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {/* USD */}
              <div className="p-3 bg-white rounded-lg border border-[#E5E0D8]">
                <span className="text-[10px] font-bold text-[#737373] uppercase font-mono">United States (USD)</span>
                <div className="text-base font-extrabold text-[#111111] font-mono mt-0.5">
                  ${((basePrice || 0) * (exchangeRates.USD || 0.010379)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[9px] text-[#7AA05A] font-mono">Rate: {exchangeRates.USD?.toFixed(6) || "0.010379"}</span>
              </div>

              {/* EUR */}
              <div className="p-3 bg-white rounded-lg border border-[#E5E0D8]">
                <span className="text-[10px] font-bold text-[#737373] uppercase font-mono">Eurozone (EUR)</span>
                <div className="text-base font-extrabold text-[#111111] font-mono mt-0.5">
                  €{((basePrice || 0) * (exchangeRates.EUR || 0.009228)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[9px] text-[#7AA05A] font-mono">Rate: {exchangeRates.EUR?.toFixed(6) || "0.009228"}</span>
              </div>

              {/* GBP */}
              <div className="p-3 bg-white rounded-lg border border-[#E5E0D8]">
                <span className="text-[10px] font-bold text-[#737373] uppercase font-mono">United Kingdom (GBP)</span>
                <div className="text-base font-extrabold text-[#111111] font-mono mt-0.5">
                  £{((basePrice || 0) * (exchangeRates.GBP || 0.007854)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[9px] text-[#7AA05A] font-mono">Rate: {exchangeRates.GBP?.toFixed(6) || "0.007854"}</span>
              </div>

              {/* AED */}
              <div className="p-3 bg-white rounded-lg border border-[#E5E0D8]">
                <span className="text-[10px] font-bold text-[#737373] uppercase font-mono">UAE (AED)</span>
                <div className="text-base font-extrabold text-[#111111] font-mono mt-0.5">
                  AED {((basePrice || 0) * (exchangeRates.AED || 0.038116)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[9px] text-[#7AA05A] font-mono">Rate: {exchangeRates.AED?.toFixed(6) || "0.038116"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 4 — PRODUCT IMAGES & GALLERY                         */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 lg:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7AA05A]">
                Step 4 of 10
              </span>
              <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider font-mono">
                4. Product Images
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Local high-resolution hospital apparatus photography & primary gallery assets
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#7AA05A]">
              {images.length} Image{images.length === 1 ? "" : "s"} Assigned
            </span>
          </div>

          {/* Upload / Add via URL Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-dashed border-[#E5E0D8] hover:border-[#2D5A4A] rounded-xl p-5 text-center flex flex-col items-center justify-center bg-[#F4F1EB] transition-colors">
              <Upload size={22} className="text-[#2D5A4A] mb-2" />
              <div className="text-xs font-bold text-[#111111]">Upload Device Photo</div>
              <p className="text-[11px] text-[#737373] mt-0.5">PNG, JPG, WEBP up to 10MB</p>
              <label className="mt-3 px-4 py-2 bg-[#2D5A4A] hover:bg-[#0D4C3C] text-white rounded-lg text-xs font-bold cursor-pointer transition-colors">
                <span>{isUploadingImage ? "Uploading..." : "Select Local Image"}</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <div className="p-5 rounded-xl border border-[#E5E0D8] bg-white flex flex-col justify-between">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1.5">
                  Or Add Direct Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://.../product.jpg"
                    className="flex-1 px-3 py-2 bg-white border border-[#E5E0D8] rounded-lg text-xs font-mono text-[#111111] focus:outline-none focus:border-[#2D5A4A]"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="px-4 py-2 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-[#737373] mt-2">
                Images are referenced without hotlinking risks.
              </p>
            </div>
          </div>

          {/* Images Grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={`group relative rounded-xl border-2 overflow-hidden bg-[#F4F1EB] aspect-square flex flex-col justify-between p-2 transition-all ${
                    primaryImageIndex === idx ? "border-[#2D5A4A]" : "border-[#E5E0D8] hover:border-[#111111]"
                  }`}
                >
                  <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover rounded-lg" />
                  <div className="absolute top-2 left-2">
                    {primaryImageIndex === idx ? (
                      <span className="px-2 py-0.5 rounded bg-[#2D5A4A] text-white text-[9px] font-mono font-bold uppercase shadow-2xs">
                        Primary
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setPrimaryImageIndex(idx);
                          setHasUnsavedChanges(true);
                        }}
                        className="px-2 py-0.5 rounded bg-white text-[#111111] text-[9px] font-mono font-bold uppercase shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#F4F1EB]"
                      >
                        Set Primary
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-2 right-2 w-6 h-6 rounded bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-neutral-800"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION 5 — PRODUCT DESCRIPTION                              */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 lg:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7AA05A]">
                Step 5 of 10
              </span>
              <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider font-mono">
                5. Product Description
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Clinical summary, indications for use, and medical equipment benefits
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[#F4F1EB] text-[#2D5A4A] border border-[#E5E0D8]">
              Clinical Content
            </span>
          </div>

          <div className="space-y-4">
            {/* Short Description */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Brief Executive Summary (Storefront Cards & Quotes)
              </label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={(e) => {
                  setShortDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="High-level engineering summary for catalog headers and index cards..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
              />
            </div>

            {/* Full Clinical Overview */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Full Clinical Overview & Indications
              </label>
              <textarea
                rows={5}
                value={fullDescription}
                onChange={(e) => {
                  setFullDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Comprehensive technical and clinical description, operational workflow, and operating theatre benefits..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] transition-colors"
              />
            </div>

            {/* Key Features Bullet List */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Key Features & Clinical Advantages
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newFeatureText}
                  onChange={(e) => setNewFeatureText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newFeatureText.trim()) {
                        setKeyFeatures((prev) => [...prev, newFeatureText.trim()]);
                        setNewFeatureText("");
                        setHasUnsavedChanges(true);
                      }
                    }
                  }}
                  placeholder="e.g. Shadowless cold-light illumination exceeding 160,000 Lux"
                  className="flex-1 px-3.5 py-2 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newFeatureText.trim()) {
                      setKeyFeatures((prev) => [...prev, newFeatureText.trim()]);
                      setNewFeatureText("");
                      setHasUnsavedChanges(true);
                    }
                  }}
                  className="px-4 py-2 bg-[#2D5A4A] hover:bg-[#0D4C3C] text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Add Feature
                </button>
              </div>

              {keyFeatures.length > 0 && (
                <div className="space-y-2">
                  {keyFeatures.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-[#F4F1EB] rounded-lg border border-[#E5E0D8] text-xs"
                    >
                      <span className="text-[#111111]">{feat}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setKeyFeatures((prev) => prev.filter((_, i) => i !== idx));
                          setHasUnsavedChanges(true);
                        }}
                        className="text-[#737373] hover:text-[#111111] ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 6 — TECHNICAL SPECIFICATIONS                         */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 lg:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7AA05A]">
                Step 6 of 10
              </span>
              <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider font-mono">
                6. Technical Specifications
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Dynamic Parameter-Value key-value table formatted for tender comparisons
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#7AA05A]">
              {specList.length} Parameter{specList.length === 1 ? "" : "s"} Defined
            </span>
          </div>

          {/* Add Specification Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                placeholder="Parameter Name (e.g. Light Intensity / Frequency)"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-mono text-[#111111] focus:outline-none focus:border-[#2D5A4A]"
              />
            </div>
            <div className="sm:col-span-2">
              <input
                type="text"
                value={newSpecVal}
                onChange={(e) => setNewSpecVal(e.target.value)}
                placeholder="Value & Units (e.g. 160,000 Lux / 3.5 MHz)"
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-mono text-[#111111] focus:outline-none focus:border-[#2D5A4A]"
              />
            </div>
            <div>
              <button
                type="button"
                onClick={handleAddSpec}
                className="w-full h-full min-h-[38px] px-4 py-2 bg-[#2D5A4A] hover:bg-[#0D4C3C] text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                <span>Add Row</span>
              </button>
            </div>
          </div>

          {/* Specifications Table */}
          {specList.length > 0 && (
            <div className="overflow-x-auto border border-[#E5E0D8] rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F4F1EB] border-b border-[#E5E0D8] text-[#737373] font-bold uppercase text-[10px] tracking-wider font-mono">
                    <th className="p-3">Specification Parameter</th>
                    <th className="p-3">Clinical / Engineering Value</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E0D8]">
                  {specList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#F4F1EB] transition-colors">
                      <td className="p-3 font-semibold text-[#111111] font-mono">{item.key}</td>
                      <td className="p-3 text-[#4A4A4A] font-mono">{item.value}</td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSpecList((prev) => prev.filter((_, i) => i !== idx));
                            setHasUnsavedChanges(true);
                          }}
                          className="text-[#737373] hover:text-[#111111] text-xs font-bold"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION 7 — CERTIFICATIONS & DOCUMENTS                       */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 lg:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7AA05A]">
                Step 7 of 10
              </span>
              <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider font-mono">
                7. Certifications & Documents
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                International regulatory compliance standards and clinical document links
              </p>
            </div>
            <ShieldCheck size={20} className="text-[#2D5A4A]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-2">
                Certified Quality & Safety Standards
              </label>
              <div className="space-y-2">
                {[
                  "ISO 13485:2016 Medical Devices Quality Management",
                  "CE Medical Directive 93/42/EEC",
                  "IEC 60601-1 Electrical Medical Safety Compliance",
                  "FDA 510(k) Substantially Equivalent Cleared",
                  "RoHS Environmental Compliance 2011/65/EU"
                ].map((std) => (
                  <label key={std} className="flex items-center gap-2 text-xs text-[#4A4A4A] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={certifications.includes(std)}
                      onChange={(e) => {
                        if (e.target.checked) setCertifications((prev) => [...prev, std]);
                        else setCertifications((prev) => prev.filter((c) => c !== std));
                        setHasUnsavedChanges(true);
                      }}
                      className="rounded border-[#E5E0D8] text-[#2D5A4A] focus:ring-[#2D5A4A]"
                    />
                    <span>{std}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1.5">
                  Certificate Registration Number
                </label>
                <input
                  type="text"
                  value={certificateNumber}
                  onChange={(e) => {
                    setCertificateNumber(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-mono text-[#111111] focus:outline-none focus:border-[#2D5A4A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1.5">
                  Issuing Notified Body / Registrar
                </label>
                <input
                  type="text"
                  value={issuingOrg}
                  onChange={(e) => {
                    setIssuingOrg(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs text-[#111111] focus:outline-none focus:border-[#2D5A4A]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 8 — SEO & URL                                        */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 lg:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7AA05A]">
                Step 8 of 10
              </span>
              <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider font-mono">
                8. SEO & URL Settings
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                International search engine optimization and Google SERP card preview
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#7AA05A]">
              Google Snippet Preview
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#111111]">
                  Meta Title
                </label>
                <span className="text-[10px] font-mono text-[#737373]">
                  {metaTitle.length}/60 chars
                </span>
              </div>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => {
                  setMetaTitle(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs text-[#111111] focus:outline-none focus:border-[#2D5A4A]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#111111]">
                  Meta Description
                </label>
                <span className="text-[10px] font-mono text-[#737373]">
                  {metaDescription.length}/160 chars
                </span>
              </div>
              <textarea
                rows={2}
                value={metaDescription}
                onChange={(e) => {
                  setMetaDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs text-[#111111] focus:outline-none focus:border-[#2D5A4A]"
              />
            </div>

            {/* Google SERP Preview Card */}
            <div className="p-4 bg-[#F4F1EB] rounded-xl border border-[#E5E0D8] space-y-1">
              <span className="text-[10px] font-mono text-[#737373]">https://drmedex.com/product/{slug || "device-slug"}</span>
              <div className="text-sm font-bold text-[#0D4C3C] hover:underline cursor-pointer">
                {metaTitle || title || "DR.MEDEX Medical Equipment"}
              </div>
              <p className="text-xs text-[#4A4A4A] line-clamp-2">
                {metaDescription || shortDescription || "Certified medical equipment for international hospital tenders and clinics."}
              </p>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 9 — PUBLISHING & VISIBILITY                          */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 lg:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7AA05A]">
                Step 9 of 10
              </span>
              <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider font-mono">
                9. Publishing & Visibility Controls
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Publication status and storefront catalogue visibility controls
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[#2D5A4A] text-white">
              {status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Publication Status
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as any);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-bold text-[#111111] focus:outline-none focus:border-[#2D5A4A] cursor-pointer"
              >
                <option value="ACTIVE">ACTIVE (Storefront Visible)</option>
                <option value="DRAFT">DRAFT (Internal Review)</option>
                <option value="ARCHIVED">ARCHIVED (Preserved / Hidden)</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 text-xs font-bold text-[#111111] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => {
                    setIsFeatured(e.target.checked);
                    setHasUnsavedChanges(true);
                  }}
                  className="rounded border-[#E5E0D8] text-[#2D5A4A] focus:ring-[#2D5A4A]"
                />
                <span>Featured on Homepage</span>
              </label>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 text-xs font-bold text-[#111111] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBestSeller}
                  onChange={(e) => {
                    setIsBestSeller(e.target.checked);
                    setHasUnsavedChanges(true);
                  }}
                  className="rounded border-[#E5E0D8] text-[#2D5A4A] focus:ring-[#2D5A4A]"
                />
                <span>Bestseller Ribbon</span>
              </label>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2.5 text-xs font-bold text-[#111111] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnHomepage}
                  onChange={(e) => {
                    setShowOnHomepage(e.target.checked);
                    setHasUnsavedChanges(true);
                  }}
                  className="rounded border-[#E5E0D8] text-[#2D5A4A] focus:ring-[#2D5A4A]"
                />
                <span>Category Grid Visible</span>
              </label>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 10 — AI DESCRIPTION ASSISTANT                        */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-[#E5E0D8] p-6 lg:p-8 space-y-6 shadow-2xs">
          <div className="border-b border-[#E5E0D8] pb-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#7AA05A]">
                Step 10 of 10
              </span>
              <h2 className="text-base font-bold text-[#111111] uppercase tracking-wider font-mono">
                10. AI Description Assistant
              </h2>
              <p className="text-xs text-[#737373] mt-0.5">
                Generate regulatory-compliant medical copywriting tailored for international tenders
              </p>
            </div>
            <Sparkles size={18} className="text-[#2D5A4A]" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Copywriting Tone
              </label>
              <select
                value={aiTone}
                onChange={(e) => setAiTone(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:border-[#2D5A4A] cursor-pointer"
              >
                <option value="CLINICAL">Clinical & Academic</option>
                <option value="COMMERCIAL">Commercial & Tender Focused</option>
                <option value="TECHNICAL">Technical & Engineering Specific</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Custom Focus / Key Specs to Emphasize
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiCustomPrompt}
                  onChange={(e) => setAiCustomPrompt(e.target.value)}
                  placeholder="e.g. Highlight shadowless optics and 50,000 hour LED lifespan"
                  className="flex-1 px-3.5 py-2.5 bg-white border border-[#E5E0D8] rounded-lg text-xs text-[#111111] focus:outline-none focus:border-[#2D5A4A]"
                />
                <button
                  type="button"
                  onClick={handleGenerateAiDescription}
                  disabled={isAiGenerating}
                  className="px-5 py-2.5 bg-[#2D5A4A] hover:bg-[#0D4C3C] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={13} className={isAiGenerating ? "animate-spin" : ""} />
                  <span>{isAiGenerating ? "Generating..." : "Generate Copy"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Output Preview */}
          {aiGeneratedPreview && (
            <div className="p-5 rounded-xl bg-[#F4F1EB] border border-[#E5E0D8] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0D4C3C] uppercase font-mono">Generated Copy Preview</span>
                <button
                  type="button"
                  onClick={handleApplyAiGenerated}
                  className="px-4 py-1.5 bg-[#2D5A4A] hover:bg-[#0D4C3C] text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Apply to Product Form
                </button>
              </div>
              <div className="text-xs text-[#4A4A4A] space-y-2">
                {aiGeneratedPreview.shortDescription && (
                  <div>
                    <span className="font-bold text-[#111111]">Short Summary: </span>
                    {aiGeneratedPreview.shortDescription}
                  </div>
                )}
                {aiGeneratedPreview.fullDescription && (
                  <div>
                    <span className="font-bold text-[#111111]">Clinical Overview: </span>
                    {aiGeneratedPreview.fullDescription}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* STICKY BOTTOM ACTION BAR */}
        <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl border border-[#E5E0D8] p-4 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                hasUnsavedChanges ? "bg-[#7AA05A] animate-pulse" : "bg-neutral-300"
              }`}
            />
            <span className="text-xs font-mono text-[#4A4A4A]">
              {hasUnsavedChanges ? "Unsaved changes in clinical editor" : "All changes saved to inventory"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/admin/products")}
              className="px-4 py-2 border border-[#E5E0D8] rounded-lg text-xs font-semibold text-[#111111] hover:bg-[#F4F1EB] transition-colors"
            >
              Discard / Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProduct}
              disabled={isSaving}
              className="px-6 py-2 bg-[#2D5A4A] hover:bg-[#0D4C3C] text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? "Saving Product..." : isEditMode ? "Save Changes" : "Save Medical Equipment"}</span>
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
};
