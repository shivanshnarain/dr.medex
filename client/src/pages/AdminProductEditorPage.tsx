import React, { useState, useEffect, useMemo, useRef } from "react";
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
  RefreshCw,
  Eye,
  CheckCircle2,
  MoveLeft,
  MoveRight,
  Camera,
  AlertTriangle,
  RotateCcw,
  ImageOff,
  ArrowUp,
  ArrowDown,
  Globe,
  ShieldCheck,
  X
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Category } from "../types";
import { fallbackProducts } from "../services/productService";

export interface ProductImageSlot {
  id: string;
  url: string;
  previewUrl?: string;
  file?: File;
  status: "persisted" | "uploading" | "failed";
  errorMessage?: string;
  hasLoadError?: boolean;
  publicId?: string;
  storageProvider?: string;
}

export interface PackageItem {
  id: string;
  name: string;
  item?: string;
  type: "standard" | "optional" | "confirmation";
}

export const AdminProductEditorPage: React.FC = () => {
  const { productId } = useParams<{ productId?: string }>();
  const navigate = useNavigate();
  const { adminFetch } = useAdminAuth();

  const isEditMode = Boolean(productId && productId !== "new");

  // Loading & submission state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingIdentity, setIsGeneratingIdentity] = useState(false);
  const [isCheckingSku, setIsCheckingSku] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [copiedSku, setCopiedSku] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  // Active step & selected card state
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedCard, setSelectedCard] = useState<string>("step-1");

  // Exact DR.MEDEX Dark Emerald Palette (#0D4C3C) with solid White Outline (#FFFFFF) and White Text
  const getCardStyle = (cardId: string) => {
    const isSelected = selectedCard === cardId;
    return isSelected
      ? "bg-[#0D4C3C] border-white ring-2 ring-white/70 shadow-lg text-white"
      : "bg-[#0D4C3C] border-white shadow-md text-white";
  };

  // Categories & Catalogue Hierarchy
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [catalogueHierarchy, setCatalogueHierarchy] = useState<Record<string, any>>({});

  // Step 2 Classification Add Modal & Menu State
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const [addModalType, setAddModalType] = useState<"primary" | "subcategory" | "equipment-type" | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addModalError, setAddModalError] = useState<string | null>(null);

  // Form fields for Add modals
  const [newPrimaryName, setNewPrimaryName] = useState("");
  const [newPrimaryCode, setNewPrimaryCode] = useState("");
  const [newSubParentCat, setNewSubParentCat] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newEqParentCat, setNewEqParentCat] = useState("");
  const [newEqSubcat, setNewEqSubcat] = useState("");
  const [newEqName, setNewEqName] = useState("");

  const initialClassificationRef = useRef<{ category: string; subcategory: string } | null>(null);

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
  // STEP 1: PRODUCT IMAGES
  // ==========================================
  const [imageSlots, setImageSlots] = useState<ProductImageSlot[]>([]);
  const imageSlotsRef = useRef<ProductImageSlot[]>(imageSlots);
  useEffect(() => {
    imageSlotsRef.current = imageSlots;
  }, [imageSlots]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const objectUrlsRef = useRef<string[]>([]);
  const images = useMemo(() => imageSlots.map((s) => s.url), [imageSlots]);

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch {}
      });
    };
  }, []);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  // AI Assistant Analysis State
  const [isAiIdentifying, setIsAiIdentifying] = useState(false);
  const [aiIdentifyError, setAiIdentifyError] = useState<string | null>(null);
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<string>>(new Set());
  const activeAnalysisIdRef = useRef<number>(0);

  // Enlarged photo preview modal state & double-click isolation
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string; index: number } | null>(null);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (enlargedImage) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setEnlargedImage(null);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [enlargedImage]);

  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };
  }, []);

  const handleThumbnailClick = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    // Delay single-click primary assignment slightly to allow double-click cancellation
    clickTimeoutRef.current = setTimeout(() => {
      setPrimaryImageIndex(idx);
      setHasUnsavedChanges(true);
    }, 250);
  };

  const handleThumbnailDoubleClick = (e: React.MouseEvent, slot: ProductImageSlot, idx: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setEnlargedImage({
      url: slot.previewUrl || slot.url,
      title: `Product Photograph ${idx + 1}`,
      index: idx
    });
  };

  const markFieldEdited = (fieldName: string) => {
    setManuallyEditedFields((prev) => {
      const updated = new Set(prev);
      updated.add(fieldName);
      return updated;
    });
  };

  // ==========================================
  // STEP 2: PRODUCT CLASSIFICATION
  // ==========================================
  const [category, setCategory] = useState("ot-lights");
  const [subcategory, setSubcategory] = useState("");
  const [equipmentType, setEquipmentType] = useState("");

  // ==========================================
  // STEP 3: PRODUCT IDENTITY (EXACTLY 3 FIELDS)
  // ==========================================
  const [productName, setProductName] = useState("");
  const [manufacturerModel, setManufacturerModel] = useState("");
  const [sku, setSku] = useState("");
  const [slug, setSlug] = useState("");
  const [brand] = useState("DR.MEDEX"); // Internal constant brand

  // ==========================================
  // STEP 4: PRODUCT DESCRIPTION
  // ==========================================
  const [description, setDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [isRegeneratingDescription, setIsRegeneratingDescription] = useState(false);

  // ==========================================
  // STEP 5: TECHNICAL SPECIFICATIONS (4 INDEPENDENT FIELDS)
  // ==========================================
  const [powerSupply, setPowerSupply] = useState("");
  const [qualityStandards, setQualityStandards] = useState("");
  const [regulatoryStatus, setRegulatoryStatus] = useState("");
  const [warranty, setWarranty] = useState("2-Year Comprehensive Clinical Warranty");

  // Optional detailed technical specs table
  const [specList, setSpecList] = useState<{ key: string; value: string; unit?: string; note?: string }[]>([]);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecVal, setNewSpecVal] = useState("");
  const [newSpecUnit, setNewSpecUnit] = useState("");
  const [showDetailedSpecsTable, setShowDetailedSpecsTable] = useState(false);

  // ==========================================
  // STEP 6: CLINICAL INDICATIONS & SPECIALTY PROCEDURES
  // ==========================================
  const [clinicalIndications, setClinicalIndications] = useState<string[]>([]);
  const [newIndicationText, setNewIndicationText] = useState("");
  const [isRegeneratingIndications, setIsRegeneratingIndications] = useState(false);

  // ==========================================
  // STEP 7: KEY FACTORS & ENGINEERING HIGHLIGHTS
  // ==========================================
  const [engineeringHighlights, setEngineeringHighlights] = useState<string[]>([]);
  const [newHighlightText, setNewHighlightText] = useState("");
  const [isRegeneratingHighlights, setIsRegeneratingHighlights] = useState(false);

  // ==========================================
  // STEP 8: STANDARD INCLUDED PACKAGE CONTENTS
  // ==========================================
  const [packageItems, setPackageItems] = useState<PackageItem[]>([]);
  const [newPackageItemName, setNewPackageItemName] = useState("");
  const [newPackageItemType, setNewPackageItemType] = useState<"standard" | "optional" | "confirmation">("standard");
  const [isRegeneratingPackage, setIsRegeneratingPackage] = useState(false);

  // ==========================================
  // STEP 9: PRICING & INVENTORY
  // ==========================================
  const [originalPrice, setOriginalPrice] = useState<number>(0); // MRP in INR
  const [basePrice, setBasePrice] = useState<number>(0); // Selling price in INR
  const [stock, setStock] = useState<number>(10);
  const [stockStatus, setStockStatus] = useState<"IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("IN_STOCK");
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);
  const [minOrderQuantity, setMinOrderQuantity] = useState<number>(1);
  const [leadTimeWeeks, setLeadTimeWeeks] = useState("1–2 Weeks");
  const [shippingInformation, setShippingInformation] = useState("Express Air Cargo Dispatch with Shockproof Wooden Crating");

  const { discountPercentage, calculatedSavings, discountFormatted } = useMemo(() => {
    if (originalPrice > 0 && basePrice > 0 && originalPrice > basePrice) {
      const rawPct = ((originalPrice - basePrice) / originalPrice) * 100;
      const formatted = (Math.round(rawPct * 100) / 100).toFixed(2).replace(/\.00$/, "");
      const savings = originalPrice - basePrice;
      return { discountPercentage: rawPct, calculatedSavings: savings, discountFormatted: formatted };
    }
    return { discountPercentage: 0, calculatedSavings: 0, discountFormatted: "0" };
  }, [originalPrice, basePrice]);

  // ==========================================
  // SETTINGS & METADATA — FINAL SECTION
  // ==========================================
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED">("DRAFT");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [categoryGridVisible, setCategoryGridVisible] = useState(true);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // Legacy compatibility fields
  const [regulatoryClass, setRegulatoryClass] = useState("Class IIa (MDR 2017/745)");
  const [certificationStatus, setCertificationStatus] = useState("Claimed");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [issuingOrg, setIssuingOrg] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [manualUrl, setManualUrl] = useState("");
  const [datasheetUrl, setDatasheetUrl] = useState("");

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
          const catData = await catRes.json();
          if (catData.success && Array.isArray(catData.categories)) {
            setAllCategories(catData.categories);
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

        const populateProductFields = (p: any) => {
          setCategory(p.category || "ot-lights");
          setSubcategory(p.subcategory || "");
          setEquipmentType(p.equipmentType || "");
          setProductName(p.productName || p.title || "");
          setManufacturerModel(p.modelNumber || "");
          setSku(p.sku || p.SKU || "");
          setSlug(p.slug || "");

          initialClassificationRef.current = {
            category: p.category || "ot-lights",
            subcategory: p.subcategory || ""
          };

          // Step 4: Description
          const mainDesc = p.description || p.fullDescription || p.shortDescription || p.overview || "";
          setDescription(mainDesc);
          setFullDescription(mainDesc);
          setShortDescription(p.shortDescription || mainDesc.slice(0, 180));

          // Step 5: Technical Specifications
          setPowerSupply(p.powerSupply || p.powerRequirements || "");
          setQualityStandards(p.qualityStandards || "");
          setRegulatoryStatus(p.regulatoryStatus || p.regulatoryClassification || "");
          if (p.warranty) setWarranty(p.warranty);

          // Step 6: Clinical Indications
          const loadedIndications = Array.isArray(p.clinicalIndications) && p.clinicalIndications.length > 0
            ? p.clinicalIndications
            : (Array.isArray(p.applications) ? p.applications : []);
          setClinicalIndications(loadedIndications);

          // Step 7: Engineering Highlights
          const loadedHighlights = Array.isArray(p.engineeringHighlights) && p.engineeringHighlights.length > 0
            ? p.engineeringHighlights
            : (Array.isArray(p.keyFeatures) && p.keyFeatures.length > 0
              ? p.keyFeatures
              : (Array.isArray(p.features) ? p.features : []));
          setEngineeringHighlights(loadedHighlights);

          // Step 8: Package Contents
          if (Array.isArray(p.packageItems) && p.packageItems.length > 0) {
            setPackageItems(p.packageItems.map((item: any, idx: number) => ({
              id: item.id || `saved-pkg-${idx}`,
              name: item.name || item.item || String(item),
              type: (item.type?.toLowerCase() === "optional" || item.type?.toLowerCase() === "confirmation")
                ? item.type.toLowerCase() as any
                : "standard"
            })));
          } else if (Array.isArray(p.packageContents) && p.packageContents.length > 0) {
            setPackageItems(p.packageContents.map((name: string, idx: number) => ({
              id: `saved-pkg-${idx}`,
              name: String(name),
              type: "standard"
            })));
          }

          // Step 9: Prices in INR
          setOriginalPrice(p.originalPrice || p.regularPrice || p.basePrice || 0);
          setBasePrice(p.basePrice || p.salePrice || 0);
          const pStock = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 10);
          setStock(pStock);
          setLowStockThreshold(p.lowStockThreshold || 3);
          setStockStatus(p.stockStatus || (pStock > 0 ? (pStock <= 5 ? "LOW_STOCK" : "IN_STOCK") : "OUT_OF_STOCK"));
          setMinOrderQuantity(p.moq || 1);
          setLeadTimeWeeks(p.leadTimeWeeks || "1–2 Weeks");
          if (p.shippingInformation) setShippingInformation(p.shippingInformation);

          // Step 1: Photos
          const loadedImgs: string[] = (Array.isArray(p.images) && p.images.length > 0)
            ? p.images
            : (Array.isArray(p.galleryImages) && p.galleryImages.length > 0
              ? p.galleryImages
              : (p.primaryImage ? [p.primaryImage] : []));

          const managedMap = new Map<string, string>();
          if (Array.isArray(p.managedCloudinaryImages)) {
            p.managedCloudinaryImages.forEach((m: any) => {
              const u = m?.secureUrl || m?.secure_url || m?.url;
              const pid = m?.publicId || m?.public_id;
              if (u && pid) managedMap.set(u, pid);
            });
          }

          setImageSlots(loadedImgs.map((u: string, i: number) => ({
            id: `saved-${i}-${Date.now()}`,
            url: u,
            status: "persisted" as const,
            publicId: managedMap.get(u),
            storageProvider: managedMap.has(u) ? "cloudinary" : undefined
          })));

          const pIdx = p.primaryImage ? loadedImgs.indexOf(p.primaryImage) : 0;
          setPrimaryImageIndex(pIdx >= 0 ? pIdx : 0);

          // Normalize additional detailed specifications
          let initialSpecs: { key: string; value: string; unit?: string; note?: string }[] = [];
          if (Array.isArray(p.technicalSpecifications)) {
            initialSpecs = p.technicalSpecifications.map((s: any) => ({
              key: s.parameter || s.key || "",
              value: s.specification || s.value || "",
              unit: s.unit || "",
              note: s.note || ""
            }));
          } else if (typeof p.technicalSpecifications === "object" && p.technicalSpecifications !== null) {
            initialSpecs = Object.entries(p.technicalSpecifications).map(([k, v]) => ({
              key: k,
              value: typeof v === "object" ? JSON.stringify(v) : String(v),
              unit: "",
              note: ""
            }));
          } else if (typeof p.specifications === "object" && p.specifications !== null) {
            initialSpecs = Object.entries(p.specifications).map(([k, v]) => ({
              key: k,
              value: typeof v === "object" ? JSON.stringify(v) : String(v),
              unit: "",
              note: ""
            }));
          }
          setSpecList(initialSpecs);

          setRegulatoryClass(p.regulatoryClassification || "Class IIa (MDR 2017/745)");
          setCertificationStatus(p.certificationStatus || "Claimed");
          setCertificateNumber(p.certificateNumber || "");
          setIssuingOrg(p.issuingOrg || "");
          setStatus(p.status || "ACTIVE");
          setCertifications(p.certifications || []);
          setManualUrl(p.manualUrl || "");
          setDatasheetUrl(p.datasheetUrl || "");
          setMetaTitle(p.metaTitle !== undefined ? p.metaTitle : (p.seoTitle !== undefined ? p.seoTitle : ""));
          setMetaDescription(p.metaDescription !== undefined ? p.metaDescription : (p.seoDescription !== undefined ? p.seoDescription : ""));
          setIsFeatured(Boolean(p.featured || p.isFeatured));
          setIsBestSeller(Boolean(p.bestseller || p.isBestSeller));
          setCategoryGridVisible(p.categoryGridVisible !== false);
        };

        if (isEditMode && productId) {
          setIsLoading(true);
          let loaded = false;
          try {
            const pRes = await adminFetch(`/api/admin/products/${productId}`);
            if (pRes.ok) {
              const pData = await pRes.json();
              if (pData.success && pData.product) {
                populateProductFields(pData.product);
                loaded = true;
              }
            }
          } catch (fetchErr) {
            console.warn("Product live fetch failed, activating fallback lookup:", fetchErr);
          }

          if (!loaded) {
            let fallbackP: any = null;
            try {
              const cached = localStorage.getItem("drmedex_admin_products_cache");
              if (cached) {
                const list = JSON.parse(cached);
                fallbackP = list.find((p: any) => p.id === productId || p.slug === productId || p.sku === productId);
              }
            } catch {}
            if (!fallbackP) {
              fallbackP = fallbackProducts.find((p: any) => p.id === productId || p.slug === productId || p.sku === productId);
            }
            if (fallbackP) {
              populateProductFields(fallbackP);
              setStatusBanner({
                type: "warning",
                text: "Product details loaded from verified local catalogue."
              });
            }
          }
          setIsLoading(false);
        } else {
          // New product mode: automatically generate initial SKU
          fetchNewSku("ot-lights");
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setIsLoading(false);
      }
    }
    initData();
  }, [productId, isEditMode]);

  // Available subcategories and equipment types
  const availableSubcategories = useMemo(() => {
    if (!category || !catalogueHierarchy[category]) return [];
    return catalogueHierarchy[category].subcategories || [];
  }, [category, catalogueHierarchy]);

  const availableEquipmentTypes = useMemo(() => {
    if (!subcategory || !availableSubcategories.length) return [];
    const sub = availableSubcategories.find(
      (s: any) => s.id === subcategory || s.slug === subcategory || s.name === subcategory
    );
    return sub?.equipmentTypes || [];
  }, [subcategory, availableSubcategories]);

  // Close Add Menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };
    if (isAddMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isAddMenuOpen]);

  // Modal subcategories filtered by selected parent in Add Equipment Type modal
  const modalSubcategories = useMemo(() => {
    if (!newEqParentCat || !catalogueHierarchy[newEqParentCat]) return [];
    return catalogueHierarchy[newEqParentCat].subcategories || [];
  }, [newEqParentCat, catalogueHierarchy]);

  useEffect(() => {
    if (modalSubcategories.length > 0) {
      if (!modalSubcategories.some((s: any) => s.id === newEqSubcat)) {
        setNewEqSubcat(modalSubcategories[0]?.id || "");
      }
    } else {
      setNewEqSubcat("");
    }
  }, [modalSubcategories, newEqSubcat]);

  // Generate unique SKU conforming to DRM-[PRIMARY]-[SUBCATEGORY]-[NAME]-[UNIQUE-ID]
  const fetchNewSku = async (catSlug?: string, subSlug?: string, prodName?: string, force = false) => {
    if (force) {
      setManuallyEditedFields((prev) => {
        const next = new Set(prev);
        next.delete("sku");
        return next;
      });
    } else if (manuallyEditedFields.has("sku")) {
      return; // Respect manual administrator edits unless explicitly regenerating
    }
    const cat = catSlug || category || "ot-lights";
    const sub = subSlug !== undefined ? subSlug : subcategory;
    const name = prodName !== undefined ? prodName : productName;
    try {
      const res = await adminFetch(
        `/api/admin/products/generate-sku?category=${encodeURIComponent(cat)}&subcategory=${encodeURIComponent(sub)}&productName=${encodeURIComponent(name)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sku) {
          setSku(data.sku);
          setSkuError(null);
          setHasUnsavedChanges(true);
        }
      }
    } catch (err) {
      console.error("Failed to fetch new SKU:", err);
    }
  };

  // Auto-generate SKU when classification and product name are updated (unless manually edited)
  useEffect(() => {
    if (manuallyEditedFields.has("sku")) return;
    if (!category && !subcategory && !productName) return;

    if (isEditMode) {
      const initial = initialClassificationRef.current;
      if (initial && initial.category === category && initial.subcategory === subcategory) {
        return; // Preserve existing product's original saved SKU unless classification actually changed
      }
    }

    const timer = setTimeout(() => {
      fetchNewSku(category, subcategory, productName, false);
    }, 450);

    return () => clearTimeout(timer);
  }, [category, subcategory, productName, isEditMode, manuallyEditedFields]);

  // Handle Add Primary Category
  const handleAddPrimaryCategory = async () => {
    if (!newPrimaryName.trim()) {
      setAddModalError("Category name is required.");
      return;
    }
    const cleanName = newPrimaryName.trim();
    if (allCategories.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      setAddModalError(`Primary category "${cleanName}" already exists.`);
      return;
    }
    setIsSubmittingAdd(true);
    setAddModalError(null);
    try {
      const res = await adminFetch("/api/admin/catalogue/primary-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, code: newPrimaryCode.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAddModalError(data.message || "Failed to create primary category.");
        setIsSubmittingAdd(false);
        return;
      }
      if (Array.isArray(data.categories)) {
        setAllCategories(data.categories);
      }
      if (data.hierarchy) {
        setCatalogueHierarchy(data.hierarchy);
      }
      const newSlug = data.category?.slug || data.category?.id;
      if (newSlug) {
        setCategory(newSlug);
        setSubcategory("");
        setEquipmentType("");
        markFieldEdited("category");
        if (!manuallyEditedFields.has("sku")) {
          fetchNewSku(newSlug, "", productName, false);
        }
        setHasUnsavedChanges(true);
      }
      setAddModalType(null);
      setNewPrimaryName("");
      setNewPrimaryCode("");
    } catch (err: any) {
      setAddModalError(err.message || "Network error creating primary category.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Add Subcategory
  const handleAddSubcategory = async () => {
    if (!newSubParentCat) {
      setAddModalError("Parent category is required.");
      return;
    }
    if (!newSubName.trim()) {
      setAddModalError("Subcategory name is required.");
      return;
    }
    const cleanName = newSubName.trim();
    const parentHier = catalogueHierarchy[newSubParentCat];
    if (parentHier && (parentHier.subcategories || []).some((s: any) => (s.name || "").toLowerCase() === cleanName.toLowerCase())) {
      setAddModalError(`Subcategory "${cleanName}" already exists under "${parentHier.name}".`);
      return;
    }
    setIsSubmittingAdd(true);
    setAddModalError(null);
    try {
      const res = await adminFetch("/api/admin/catalogue/subcategory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentCategory: newSubParentCat, name: cleanName })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAddModalError(data.message || "Failed to create subcategory.");
        setIsSubmittingAdd(false);
        return;
      }
      if (Array.isArray(data.categories)) {
        setAllCategories(data.categories);
      }
      if (data.hierarchy) {
        setCatalogueHierarchy(data.hierarchy);
      }
      const parentSlug = data.parentCategory || newSubParentCat;
      const subSlug = data.subcategory?.id;
      if (parentSlug && subSlug) {
        setCategory(parentSlug);
        setSubcategory(subSlug);
        setEquipmentType("");
        markFieldEdited("subcategory");
        if (!manuallyEditedFields.has("sku")) {
          fetchNewSku(parentSlug, subSlug, productName, false);
        }
        setHasUnsavedChanges(true);
      }
      setAddModalType(null);
      setNewSubName("");
    } catch (err: any) {
      setAddModalError(err.message || "Network error creating subcategory.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Handle Add Equipment Type
  const handleAddEquipmentType = async () => {
    if (!newEqParentCat) {
      setAddModalError("Primary category is required.");
      return;
    }
    if (!newEqSubcat) {
      setAddModalError("Subcategory is required.");
      return;
    }
    if (!newEqName.trim()) {
      setAddModalError("Equipment type name is required.");
      return;
    }
    const cleanName = newEqName.trim();
    const parentHier = catalogueHierarchy[newEqParentCat];
    const subHier = (parentHier?.subcategories || []).find((s: any) => s.id === newEqSubcat || s.slug === newEqSubcat || s.name === newEqSubcat);
    if (subHier && (subHier.equipmentTypes || []).some((e: any) => (e.name || "").toLowerCase() === cleanName.toLowerCase())) {
      setAddModalError(`Equipment type "${cleanName}" already exists under "${subHier.name}".`);
      return;
    }
    setIsSubmittingAdd(true);
    setAddModalError(null);
    try {
      const res = await adminFetch("/api/admin/catalogue/equipment-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentCategory: newEqParentCat, subcategory: newEqSubcat, name: cleanName })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setAddModalError(data.message || "Failed to create equipment type.");
        setIsSubmittingAdd(false);
        return;
      }
      if (data.hierarchy) {
        setCatalogueHierarchy(data.hierarchy);
      }
      setCategory(newEqParentCat);
      setSubcategory(newEqSubcat);
      setEquipmentType(data.equipmentType?.name || cleanName);
      markFieldEdited("equipmentType");
      setHasUnsavedChanges(true);
      setAddModalType(null);
      setNewEqName("");
    } catch (err: any) {
      setAddModalError(err.message || "Network error creating equipment type.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // Validate SKU Uniqueness
  const validateSku = async (skuToTest: string) => {
    if (!skuToTest.trim()) {
      setSkuError("SKU is required");
      return;
    }
    setIsCheckingSku(true);
    try {
      const res = await adminFetch(`/api/admin/products/validate-sku?sku=${encodeURIComponent(skuToTest)}&excludeId=${productId || ""}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && !data.isUnique) {
          setSkuError(`SKU "${skuToTest}" is already assigned to: ${data.existingProduct?.title || "another product"}`);
        } else {
          setSkuError(null);
        }
      }
    } catch (err) {
      console.error("SKU check error:", err);
    } finally {
      setIsCheckingSku(false);
    }
  };

  const handleCopySku = () => {
    if (sku) {
      navigator.clipboard.writeText(sku);
      setCopiedSku(true);
      setTimeout(() => setCopiedSku(false), 2000);
    }
  };

  // Duplicate Check
  useEffect(() => {
    if (!category || (!productName && !equipmentType)) {
      setDuplicateInfo({ isDuplicate: false, duplicateProduct: null });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await adminFetch("/api/admin/products/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            subcategory,
            equipmentType,
            modelNumber: manufacturerModel,
            title: productName,
            productName,
            excludeId: productId || undefined
          })
        });

        if (res.ok) {
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
        console.error("Duplicate check error:", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [category, subcategory, equipmentType, manufacturerModel, productName, productId]);

  // Client-side image compression helper to avoid sending massive 10MB base64 camera strings
  const compressImageFileToDataUrl = (fileOrBlob: File | Blob, maxDim = 1200, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawSrc = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(rawSrc);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = () => resolve(rawSrc);
        img.src = rawSrc;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(fileOrBlob);
    });
  };

  // Helper to convert slots into optimized payload for AI analysis
  const preparePhotosPayload = async (slotsToProcess: ProductImageSlot[]) => {
    const photosPayload: Array<{ data: string; mimeType: string; filename: string }> = [];
    for (let idx = 0; idx < slotsToProcess.length; idx++) {
      const slot = slotsToProcess[idx];

      if (slot.file) {
        try {
          const b64 = await compressImageFileToDataUrl(slot.file, 1200, 0.82);
          if (b64) {
            photosPayload.push({
              data: b64,
              mimeType: "image/jpeg",
              filename: slot.file.name || `photo_${idx + 1}.jpg`
            });
            continue;
          }
        } catch {}
      }

      if (slot.url && slot.url.startsWith("data:")) {
        photosPayload.push({
          data: slot.url,
          mimeType: slot.url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/)?.[1] || "image/jpeg",
          filename: `photo_${idx + 1}.jpg`
        });
        continue;
      }

      if (slot.url && (slot.url.startsWith("blob:") || slot.url.startsWith("/"))) {
        try {
          const blobRes = await fetch(slot.url);
          const blobData = await blobRes.blob();
          const b64 = await compressImageFileToDataUrl(blobData, 1200, 0.82);
          if (b64) {
            photosPayload.push({
              data: b64,
              mimeType: "image/jpeg",
              filename: `photo_${idx + 1}.jpg`
            });
            continue;
          }
        } catch {}
      }

      if (slot.url && !slot.url.startsWith("blob:")) {
        photosPayload.push({
          data: slot.url,
          mimeType: slot.url.endsWith(".png") ? "image/png" : slot.url.endsWith(".webp") ? "image/webp" : "image/jpeg",
          filename: `photo_${idx + 1}.jpg`
        });
      }
    }
    return photosPayload;
  };

  // ============================================================
  // ONE COORDINATED AI IDENTIFICATION WORKFLOW
  // ============================================================
  const applyAiResultsToForm = (result: any) => {
    if (!result) return;

    // Step 2: Product Classification
    let targetCatKey = result.classification?.primaryCategoryId || result.primaryCategoryId;
    if (!targetCatKey && (result.classification?.primaryCategory || result.primaryCategory)) {
      const suggestedCat = String(result.classification?.primaryCategory || result.primaryCategory).toLowerCase();
      const catEntry = Object.entries(catalogueHierarchy).find(
        ([k, v]: [string, any]) => v.name.toLowerCase() === suggestedCat || k.toLowerCase() === suggestedCat || suggestedCat.includes(k) || v.name.toLowerCase().includes(suggestedCat)
      );
      if (catEntry) targetCatKey = catEntry[0];
    }

    if (targetCatKey) {
      if (!manuallyEditedFields.has("category")) {
        setCategory(targetCatKey);
      }

      const catVal = (catalogueHierarchy as any)[targetCatKey];
      if (catVal && catVal.subcategories) {
        let targetSubId = result.classification?.subcategoryId || result.subcategoryId;
        if (!targetSubId && (result.classification?.subcategory || result.subcategory)) {
          const suggestedSub = String(result.classification?.subcategory || result.subcategory).toLowerCase();
          const subEntry = catVal.subcategories.find(
            (s: any) => s.name.toLowerCase() === suggestedSub || s.id.toLowerCase() === suggestedSub || suggestedSub.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(suggestedSub)
          );
          if (subEntry) targetSubId = subEntry.id;
        }

        if (targetSubId) {
          if (!manuallyEditedFields.has("subcategory")) {
            setSubcategory(targetSubId);
          }

          const subVal = catVal.subcategories.find((s: any) => s.id === targetSubId);
          if (subVal && subVal.equipmentTypes) {
            let targetEqName = "";
            const suggestedEq = String(result.classification?.equipmentType || result.equipmentType || "").toLowerCase();
            const eqEntry = subVal.equipmentTypes.find(
              (e: any) => e.name.toLowerCase() === suggestedEq || e.id.toLowerCase() === suggestedEq || suggestedEq.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(suggestedEq)
            );
            if (eqEntry) {
              targetEqName = eqEntry.name;
            } else if (result.equipmentType) {
              targetEqName = result.equipmentType;
            }

            if (targetEqName && !manuallyEditedFields.has("equipmentType")) {
              setEquipmentType(targetEqName);
            }
          }
        }
      }
    }

    // Step 3: Product Identity (Only Product Name, Model, SKU)
    const pName = result.productName || "";
    const mModel = result.manufacturerModel || "";

    if (!manuallyEditedFields.has("productName") && pName) {
      setProductName(pName);
    }
    if (!manuallyEditedFields.has("manufacturerModel") && mModel) {
      setManufacturerModel(mModel);
    }
    if (!isEditMode && (!sku || !manuallyEditedFields.has("sku"))) {
      if (result.skuSuggestion) {
        setSku(result.skuSuggestion);
      } else {
        fetchNewSku(targetCatKey || category);
      }
    }
    if (!manuallyEditedFields.has("slug") && pName) {
      setSlug(pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
    }

    // Step 4: Description (PURE main description ONLY)
    const mainDesc = result.description || result.clinicalOverview || "";
    if (mainDesc && !manuallyEditedFields.has("description")) {
      setDescription(mainDesc);
      setFullDescription(mainDesc);
      setShortDescription(mainDesc.slice(0, 180));
    }

    // Step 5: Technical Specifications (4 independent fields)
    if (result.powerSupply && !manuallyEditedFields.has("powerSupply")) {
      setPowerSupply(result.powerSupply);
    }
    if (result.qualityStandards && !manuallyEditedFields.has("qualityStandards")) {
      setQualityStandards(result.qualityStandards);
    }
    if (result.regulatoryStatus && !manuallyEditedFields.has("regulatoryStatus")) {
      setRegulatoryStatus(result.regulatoryStatus);
      setRegulatoryClass(result.regulatoryStatus);
    }
    if (result.warranty && !manuallyEditedFields.has("warranty")) {
      setWarranty(result.warranty);
    }

    // Step 6: Clinical Indications
    const rawIndications = Array.isArray(result.clinicalIndications) && result.clinicalIndications.length > 0
      ? result.clinicalIndications
      : (Array.isArray(result.intendedUses) ? result.intendedUses : []);
    if (rawIndications.length > 0 && !manuallyEditedFields.has("clinicalIndications")) {
      setClinicalIndications(rawIndications);
    }

    // Step 7: Key Factors & Engineering Highlights
    const rawHighlights = Array.isArray(result.engineeringHighlights) && result.engineeringHighlights.length > 0
      ? result.engineeringHighlights
      : (Array.isArray(result.keyFeatures) ? result.keyFeatures : []);
    if (rawHighlights.length > 0 && !manuallyEditedFields.has("engineeringHighlights")) {
      setEngineeringHighlights(rawHighlights);
    }

    // Step 8: Standard Package Contents
    if (Array.isArray(result.packageItems) && result.packageItems.length > 0) {
      if (!manuallyEditedFields.has("packageItems")) {
        const items: PackageItem[] = result.packageItems.map((item: any, idx: number) => ({
          id: item.id || `ai-pkg-${idx}-${Date.now()}`,
          name: typeof item === "string" ? item : (item.name || item.item || ""),
          type: (item.type?.toLowerCase() === "optional" || item.type?.toLowerCase() === "confirmation")
            ? item.type.toLowerCase() as any
            : "standard"
        }));
        setPackageItems(items);
      }
    } else if (Array.isArray(result.packageContents) && result.packageContents.length > 0) {
      if (!manuallyEditedFields.has("packageItems")) {
        const items: PackageItem[] = result.packageContents.map((name: string, idx: number) => ({
          id: `ai-pkg-${idx}-${Date.now()}`,
          name,
          type: "standard"
        }));
        setPackageItems(items);
      }
    }

    // Step 9: Operational Defaults (Never invent selling price from photographs)
    if (!manuallyEditedFields.has("stock") && (!stock || stock === 0)) {
      setStock(10);
    }
    if (!manuallyEditedFields.has("stockStatus")) {
      setStockStatus("IN_STOCK");
    }
    if (!manuallyEditedFields.has("leadTimeWeeks") && !leadTimeWeeks) {
      setLeadTimeWeeks("1–2 Weeks");
    }

    // Settings & Metadata
    if (!manuallyEditedFields.has("metaTitle")) {
      const mTitle = result.seoTitle || result.metaTitle || pName;
      if (mTitle) setMetaTitle(mTitle);
    }
    if (!manuallyEditedFields.has("metaDescription")) {
      const mDesc = result.seoDescription || result.metaDescription || mainDesc.slice(0, 160);
      if (mDesc) setMetaDescription(mDesc);
    }

    setHasUnsavedChanges(true);
  };

  const triggerAiIdentification = async () => {
    if (isAiIdentifying) return; // Prevent duplicate requests
    if (imageSlotsRef.current.some((s) => s.status === "uploading")) {
      const startWait = Date.now();
      while (imageSlotsRef.current.some((s) => s.status === "uploading") && Date.now() - startWait < 15000) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    const currentSlots = imageSlotsRef.current;
    if (currentSlots.length === 0) {
      setAiIdentifyError("Please upload at least one photograph of the medical equipment before running AI analysis.");
      return;
    }

    const thisAnalysisId = Date.now();
    activeAnalysisIdRef.current = thisAnalysisId;

    setIsAiIdentifying(true);
    setAiIdentifyError(null);

    try {
      const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 5));
      if (photosPayload.length === 0) {
        throw new Error("No readable photographs found. Please ensure at least one valid image is selected.");
      }

      if (activeAnalysisIdRef.current !== thisAnalysisId) return;

      const res = await adminFetch("/api/admin/products/ai-identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photosPayload,
          namingStyle: "clinical",
          preliminaryBrand: "DR.MEDEX"
        })
      });

      if (activeAnalysisIdRef.current !== thisAnalysisId) return;

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.success) {
        throw new Error((data && data.message) || `AI service returned HTTP ${res.status}`);
      }

      applyAiResultsToForm(data.data);
    } catch (err: any) {
      if (activeAnalysisIdRef.current === thisAnalysisId) {
        console.warn("AI identification error:", err);
        const errMsg = err?.message || "Failed to identify medical equipment.";
        if (errMsg.includes("GEMINI_API_KEY") || errMsg.includes("not configured")) {
          setAiIdentifyError("GEMINI_API_KEY is not configured on this server. Please ensure GEMINI_API_KEY is set in Vercel Environment Variables. Your original photos are safely preserved.");
        } else if (errMsg.includes("invalid") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("credentials")) {
          setAiIdentifyError("Gemini API credentials are invalid or lack vision permissions. Your original photos are safely preserved.");
        } else if (errMsg.includes("rate limit") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          setAiIdentifyError("Gemini API quota or rate limit exceeded. Please retry in a few moments. Your original photos are safely preserved.");
        } else if (errMsg.includes("timed out") || errMsg.includes("timeout")) {
          setAiIdentifyError("Request timed out while analyzing photographs. Please retry. Your original photos are safely preserved.");
        } else {
          setAiIdentifyError(`AI analysis failed: ${errMsg}. Uploaded photos and entered data are preserved.`);
        }
      }
    } finally {
      if (activeAnalysisIdRef.current === thisAnalysisId) {
        setIsAiIdentifying(false);
      }
    }
  };

  // Helper to upload a single slot file to backend
  const uploadSlotFile = async (slotId: string, file: File) => {
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await adminFetch("/api/admin/media/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: base64Data,
          filename: file.name,
          contentType: file.type,
          productId: productId || "new-product"
        })
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.url) {
        setImageSlots((curr) =>
          curr.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  url: data.url,
                  previewUrl: undefined,
                  publicId: data.image?.publicId || data.publicId,
                  storageProvider: data.image?.storageProvider || "cloudinary",
                  status: "persisted" as const,
                  errorMessage: undefined
                }
              : s
          )
        );
      } else {
        setImageSlots((curr) =>
          curr.map((s) =>
            s.id === slotId
              ? {
                  ...s,
                  status: "failed" as const,
                  errorMessage: data?.message || "Upload failed"
                }
              : s
          )
        );
      }
    } catch (err: any) {
      setImageSlots((curr) =>
        curr.map((s) =>
          s.id === slotId
            ? {
                ...s,
                status: "failed" as const,
                errorMessage: err?.message || "Network error during upload"
              }
            : s
        )
      );
    }
  };

  const handleStep1PhotosSelected = async (selectedFiles: File[]) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (imageSlots.length >= 5) {
      setUploadError("Maximum 5 photographs allowed per product. Please remove an existing photo first.");
      return;
    }

    const availableSlots = 5 - imageSlots.length;
    const filesToProcess = selectedFiles.slice(0, availableSlots);
    if (selectedFiles.length > availableSlots) {
      setUploadError(`Only ${availableSlots} more photo(s) can be added to reach the maximum 5 photographs limit.`);
    }

    const validTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    for (const f of filesToProcess) {
      if (!validTypes.has(f.type)) {
        setUploadError(`File "${f.name}" has an unsupported format (${f.type}). Supported formats: JPEG, PNG, WebP.`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setUploadError(`File "${f.name}" exceeds the 10MB limit.`);
        return;
      }
    }

    setUploadError(null);

    const newSlots: ProductImageSlot[] = filesToProcess.map((file, idx) => {
      const objUrl = URL.createObjectURL(file);
      objectUrlsRef.current.push(objUrl);
      return {
        id: `upload-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        url: objUrl,
        previewUrl: objUrl,
        file,
        status: "uploading" as const
      };
    });

    setImageSlots((prev) => [...prev, ...newSlots].slice(0, 5));
    setHasUnsavedChanges(true);

    setIsUploadingImage(true);
    setUploadProgress({ current: 0, total: newSlots.length });

    const concurrency = 2;
    for (let i = 0; i < newSlots.length; i += concurrency) {
      const batch = newSlots.slice(i, i + concurrency);
      await Promise.all(batch.map((slot) => uploadSlotFile(slot.id, slot.file!)));
      setUploadProgress({ current: Math.min(i + batch.length, newSlots.length), total: newSlots.length });
    }

    setIsUploadingImage(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleStep1PhotosSelected(Array.from(e.dataTransfer.files));
    }
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    const target = direction === "left" ? index - 1 : index + 1;
    if (target < 0 || target >= imageSlots.length) return;
    const copy = [...imageSlots];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setImageSlots(copy);
    setHasUnsavedChanges(true);
  };

  const removeImage = (index: number) => {
    const targetSlot = imageSlots[index];
    if (targetSlot?.previewUrl) {
      try {
        URL.revokeObjectURL(targetSlot.previewUrl);
      } catch {}
    }
    const filtered = imageSlots.filter((_, i) => i !== index);
    setImageSlots(filtered);
    if (primaryImageIndex >= filtered.length) {
      setPrimaryImageIndex(Math.max(0, filtered.length - 1));
    }
    setHasUnsavedChanges(true);
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || replaceTargetIndex === null) return;
    const file = e.target.files[0];
    e.target.value = "";

    const objUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(objUrl);
    const targetId = imageSlots[replaceTargetIndex]?.id || `replace-${Date.now()}`;

    setImageSlots((curr) =>
      curr.map((s, idx) =>
        idx === replaceTargetIndex
          ? {
              id: targetId,
              url: objUrl,
              previewUrl: objUrl,
              file,
              status: "uploading" as const,
              errorMessage: undefined,
              hasLoadError: false
            }
          : s
      )
    );

    await uploadSlotFile(targetId, file);
    setReplaceTargetIndex(null);
    setHasUnsavedChanges(true);
  };

  const handleSlotLoadError = (slotId: string) => {
    setImageSlots((curr) =>
      curr.map((s) => (s.id === slotId ? { ...s, hasLoadError: true } : s))
    );
  };

  // ==========================================
  // REGENERATE HANDLERS (FIELD-SPECIFIC & GROUNDED)
  // ==========================================
  const handleRegenerateName = async () => {
    if (isGeneratingIdentity) return;
    const currentSlots = imageSlotsRef.current;
    if (currentSlots.length === 0) {
      setStatusBanner({
        type: "warning",
        text: "Please add or select at least one photograph in Step 1 to regenerate the Product Name."
      });
      return;
    }

    setIsGeneratingIdentity(true);
    setStatusBanner(null);

    try {
      const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 1));
      if (photosPayload.length === 0) {
        setStatusBanner({
          type: "warning",
          text: "Photos are still processing or invalid. Please check your image uploads before regenerating."
        });
        return;
      }

      const res = await adminFetch("/api/admin/products/ai-identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photosPayload,
          namingStyle: "clinical",
          preliminaryBrand: brand || "DR.MEDEX",
          targetField: "productName",
          context: {
            category,
            subcategory,
            equipmentType,
            manufacturerModel,
            brand: brand || "DR.MEDEX",
            productName
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to regenerate Product Name from Gemini Vision.");
      }

      if (data.data?.productName && typeof data.data.productName === "string") {
        setProductName(data.data.productName.trim());
        markFieldEdited("productName");
        setHasUnsavedChanges(true);
        setStatusBanner({
          type: "success",
          text: `Product Name successfully regenerated: "${data.data.productName.trim()}"`
        });
      } else {
        throw new Error("AI response did not contain a valid product name.");
      }
    } catch (err: any) {
      console.warn("Product Name regeneration error:", err.message);
      setStatusBanner({
        type: "error",
        text: err.message || "Product Name regeneration failed. Existing name has been preserved."
      });
    } finally {
      setIsGeneratingIdentity(false);
    }
  };

  const handleRegenerateDescription = async () => {
    if (isRegeneratingDescription) return;
    const currentSlots = imageSlotsRef.current;
    if (currentSlots.length === 0) {
      setStatusBanner({
        type: "warning",
        text: "Please add or select at least one photograph in Step 1 to regenerate the Product Description."
      });
      return;
    }

    setIsRegeneratingDescription(true);
    setStatusBanner(null);

    try {
      const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 1));
      if (photosPayload.length === 0) {
        setStatusBanner({
          type: "warning",
          text: "Photos are still processing or invalid. Please check your image uploads before regenerating."
        });
        return;
      }

      const res = await adminFetch("/api/admin/products/ai-identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photosPayload,
          namingStyle: "clinical",
          preliminaryBrand: brand || "DR.MEDEX",
          targetField: "description",
          context: {
            category,
            subcategory,
            equipmentType,
            manufacturerModel,
            brand: brand || "DR.MEDEX",
            productName,
            description
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to regenerate Product Description from Gemini Vision.");
      }

      const newDesc = data.data?.description || data.data?.clinicalOverview;
      if (newDesc && typeof newDesc === "string" && newDesc.trim().length > 0) {
        const cleanDesc = newDesc.trim();
        setDescription(cleanDesc);
        setFullDescription(cleanDesc);
        markFieldEdited("description");
        setHasUnsavedChanges(true);
        setStatusBanner({
          type: "success",
          text: "Clinical & Operational Overview successfully regenerated via Gemini AI."
        });
      } else {
        throw new Error("AI response did not contain a valid clinical description.");
      }
    } catch (err: any) {
      console.warn("Product Description regeneration error:", err.message);
      setStatusBanner({
        type: "error",
        text: err.message || "Product Description regeneration failed. Existing description has been preserved."
      });
    } finally {
      setIsRegeneratingDescription(false);
    }
  };

  const handleRegenerateIndications = async () => {
    if (isRegeneratingIndications) return;
    const currentSlots = imageSlotsRef.current;
    if (currentSlots.length === 0) {
      setStatusBanner({
        type: "warning",
        text: "Please add or select at least one photograph in Step 1 to regenerate Clinical Indications."
      });
      return;
    }

    setIsRegeneratingIndications(true);
    setStatusBanner(null);

    try {
      const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 1));
      if (photosPayload.length === 0) {
        setStatusBanner({
          type: "warning",
          text: "Photos are still processing or invalid. Please check your image uploads before regenerating."
        });
        return;
      }

      const res = await adminFetch("/api/admin/products/ai-identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photosPayload,
          targetField: "clinicalIndications",
          context: {
            category,
            subcategory,
            equipmentType,
            manufacturerModel,
            productName
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to regenerate Clinical Indications from Gemini Vision.");
      }

      const indications = data.data?.clinicalIndications || data.data?.intendedUses;
      if (Array.isArray(indications) && indications.length > 0) {
        const cleanList = indications.map(String).map(s => s.trim()).filter(Boolean);
        if (cleanList.length > 0) {
          setClinicalIndications(cleanList);
          markFieldEdited("clinicalIndications");
          setHasUnsavedChanges(true);
          setStatusBanner({
            type: "success",
            text: `Successfully regenerated ${cleanList.length} Clinical Indications via Gemini AI.`
          });
          return;
        }
      }
      throw new Error("AI response did not contain valid clinical indications.");
    } catch (err: any) {
      console.warn("Indications regeneration error:", err.message);
      setStatusBanner({
        type: "error",
        text: err.message || "Clinical Indications regeneration failed. Existing indications preserved."
      });
    } finally {
      setIsRegeneratingIndications(false);
    }
  };

  const handleRegenerateHighlights = async () => {
    if (isRegeneratingHighlights) return;
    const currentSlots = imageSlotsRef.current;
    if (currentSlots.length === 0) {
      setStatusBanner({
        type: "warning",
        text: "Please add or select at least one photograph in Step 1 to regenerate Engineering Highlights."
      });
      return;
    }

    setIsRegeneratingHighlights(true);
    setStatusBanner(null);

    try {
      const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 1));
      if (photosPayload.length === 0) {
        setStatusBanner({
          type: "warning",
          text: "Photos are still processing or invalid. Please check your image uploads before regenerating."
        });
        return;
      }

      const res = await adminFetch("/api/admin/products/ai-identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photosPayload,
          targetField: "engineeringHighlights",
          context: {
            category,
            subcategory,
            equipmentType,
            manufacturerModel,
            productName
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to regenerate Engineering Highlights from Gemini Vision.");
      }

      const highlights = data.data?.engineeringHighlights || data.data?.keyFeatures;
      if (Array.isArray(highlights) && highlights.length > 0) {
        const cleanList = highlights.map(String).map(s => s.trim()).filter(Boolean);
        if (cleanList.length > 0) {
          setEngineeringHighlights(cleanList);
          markFieldEdited("engineeringHighlights");
          setHasUnsavedChanges(true);
          setStatusBanner({
            type: "success",
            text: `Successfully regenerated ${cleanList.length} Engineering Highlights via Gemini AI.`
          });
          return;
        }
      }
      throw new Error("AI response did not contain valid engineering highlights.");
    } catch (err: any) {
      console.warn("Highlights regeneration error:", err.message);
      setStatusBanner({
        type: "error",
        text: err.message || "Engineering Highlights regeneration failed. Existing highlights preserved."
      });
    } finally {
      setIsRegeneratingHighlights(false);
    }
  };

  const handleRegeneratePackage = async () => {
    if (isRegeneratingPackage) return;
    const currentSlots = imageSlotsRef.current;
    if (currentSlots.length === 0) {
      setStatusBanner({
        type: "warning",
        text: "Please add or select at least one photograph in Step 1 to regenerate Package Contents."
      });
      return;
    }

    setIsRegeneratingPackage(true);
    setStatusBanner(null);

    try {
      const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 1));
      if (photosPayload.length === 0) {
        setStatusBanner({
          type: "warning",
          text: "Photos are still processing or invalid. Please check your image uploads before regenerating."
        });
        return;
      }

      const res = await adminFetch("/api/admin/products/ai-identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photosPayload,
          targetField: "packageItems",
          context: {
            category,
            subcategory,
            equipmentType,
            manufacturerModel,
            productName
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to regenerate Package Contents from Gemini Vision.");
      }

      const items = data.data?.packageItems || data.data?.packageContents;
      if (Array.isArray(items) && items.length > 0) {
        const normalized = items.map((it: any, idx: number) => {
          const rawName = typeof it === "string" ? it : (it.name || it.item || "");
          const rawType = String(it.type || "standard").toLowerCase();
          const cleanType = (rawType === "optional" || rawType === "confirmation") ? rawType : "standard";
          return {
            id: it.id || `pkg-${idx + 1}-${Date.now()}`,
            name: String(rawName).trim(),
            type: cleanType as any
          };
        }).filter((it: any) => it.name.length > 0);

        if (normalized.length > 0) {
          setPackageItems(normalized);
          markFieldEdited("packageItems");
          setHasUnsavedChanges(true);
          setStatusBanner({
            type: "success",
            text: `Successfully regenerated ${normalized.length} Package Items via Gemini AI.`
          });
          return;
        }
      }
      throw new Error("AI response did not contain valid package items.");
    } catch (err: any) {
      console.warn("Package regeneration error:", err.message);
      setStatusBanner({
        type: "error",
        text: err.message || "Package Contents regeneration failed. Existing items preserved."
      });
    } finally {
      setIsRegeneratingPackage(false);
    }
  };

  const movePackageItem = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= packageItems.length) return;
    const copy = [...packageItems];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setPackageItems(copy);
    setHasUnsavedChanges(true);
  };

  const removePackageItem = (index: number) => {
    setPackageItems(packageItems.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const addPackageItem = () => {
    if (newPackageItemName.trim()) {
      setPackageItems([
        ...packageItems,
        {
          id: `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: newPackageItemName.trim(),
          type: newPackageItemType
        }
      ]);
      setNewPackageItemName("");
      setHasUnsavedChanges(true);
    }
  };

  // ==========================================
  // NINE-STEP PROGRESS VALIDATION
  // ==========================================
  const stepStatus = useMemo(() => {
    const isStep1Done = Boolean(images.length > 0);
    const isStep2Done = Boolean(category && subcategory && equipmentType);
    const isStep3Done = Boolean(productName.trim() && sku.trim());
    const isStep4Done = Boolean(description.trim() || fullDescription.trim());
    const isStep5Done = Boolean(powerSupply.trim() || qualityStandards.trim() || regulatoryStatus.trim() || warranty.trim());
    const isStep6Done = Boolean(clinicalIndications.length > 0);
    const isStep7Done = Boolean(engineeringHighlights.length > 0);
    const isStep8Done = Boolean(packageItems.length > 0);
    const isStep9Done = Boolean(basePrice > 0);

    return [
      { id: 1, name: "Photos", isDone: isStep1Done, anchor: "card-step-1" },
      { id: 2, name: "Classification", isDone: isStep2Done, anchor: "card-step-2" },
      { id: 3, name: "Identity", isDone: isStep3Done, anchor: "card-step-3" },
      { id: 4, name: "Description", isDone: isStep4Done, anchor: "card-step-4" },
      { id: 5, name: "Specifications", isDone: isStep5Done, anchor: "card-step-5" },
      { id: 6, name: "Indications", isDone: isStep6Done, anchor: "card-step-6" },
      { id: 7, name: "Highlights", isDone: isStep7Done, anchor: "card-step-7" },
      { id: 8, name: "Package", isDone: isStep8Done, anchor: "card-step-8" },
      { id: 9, name: "Pricing", isDone: isStep9Done, anchor: "card-step-9" }
    ];
  }, [
    images.length,
    category,
    subcategory,
    equipmentType,
    productName,
    sku,
    description,
    fullDescription,
    powerSupply,
    qualityStandards,
    regulatoryStatus,
    warranty,
    clinicalIndications.length,
    engineeringHighlights.length,
    packageItems.length,
    basePrice
  ]);

  const scrollToAnchor = (anchor: string, stepId: number) => {
    setActiveStep(stepId);
    setSelectedCard(anchor.replace("card-", ""));
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // ==========================================
  // SAVE PRODUCT HANDLER
  // ==========================================
  const handleSaveProduct = async () => {
    if (isSaving) return;

    if (duplicateInfo.isDuplicate && !allowDuplicateOverride) {
      setStatusBanner({
        type: "error",
        text: "Cannot save: A matching product already exists in this category. Please review or check allow intentional variant."
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (!productName.trim()) {
      setStatusBanner({ type: "error", text: "Product Name is required." });
      return;
    }

    if (!basePrice || basePrice <= 0) {
      setStatusBanner({ type: "error", text: "Please enter a valid INR selling price greater than 0." });
      return;
    }

    if (originalPrice > 0 && basePrice > originalPrice) {
      setStatusBanner({ type: "error", text: "Selling price cannot exceed Original MRP." });
      return;
    }

    if (imageSlotsRef.current.some((s) => s.status === "uploading")) {
      setStatusBanner({
        type: "warning",
        text: "Photographs are currently uploading to media storage. Waiting for uploads to complete before saving..."
      });
      const startWait = Date.now();
      while (imageSlotsRef.current.some((s) => s.status === "uploading") && Date.now() - startWait < 30000) {
        await new Promise((r) => setTimeout(r, 400));
      }
    }

    if (imageSlotsRef.current.some((s) => s.status === "uploading")) {
      setStatusBanner({
        type: "error",
        text: "Photograph upload timed out. Please retry failed uploads before saving."
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const currentSlots = imageSlotsRef.current;
    const failedSlots = currentSlots.filter((s) => s.status === "failed");
    if (failedSlots.length > 0) {
      const failedNames = failedSlots.map((s, i) => s.file?.name || `Photograph #${i + 1}`).join(", ");
      setStatusBanner({
        type: "error",
        text: `Cannot save product: Upload failed for ${failedNames}. Please retry or remove the failed photograph(s) before saving.`
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSaving(true);
    setStatusBanner(null);

    const technicalSpecifications: Record<string, string> = {};
    if (powerSupply.trim()) technicalSpecifications["Power Supply"] = powerSupply.trim();
    if (qualityStandards.trim()) technicalSpecifications["Quality Standards"] = qualityStandards.trim();
    if (regulatoryStatus.trim()) technicalSpecifications["Regulatory Status"] = regulatoryStatus.trim();
    if (warranty.trim()) technicalSpecifications["Warranty"] = warranty.trim();

    specList.forEach((s) => {
      if (s.key.trim()) {
        const valWithUnit = s.unit ? `${s.value} ${s.unit}`.trim() : s.value;
        technicalSpecifications[s.key.trim()] = valWithUnit;
      }
    });

    const persistedSlots = currentSlots.filter(
      (s) => s.status === "persisted" && typeof s.url === "string" && !s.url.startsWith("blob:") && !s.url.startsWith("data:")
    );
    const savedImages = persistedSlots.map((s) => s.url);
    const pSlot = currentSlots[primaryImageIndex];
    const selectedPrimaryUrl = (pSlot && pSlot.status === "persisted" && !pSlot.url.startsWith("blob:") && !pSlot.url.startsWith("data:"))
      ? pSlot.url
      : (savedImages[0] || "");

    const managedCloudinaryImages = persistedSlots.map((s) => ({
      url: s.url,
      secureUrl: s.url,
      publicId: s.publicId || undefined,
      storageProvider: s.storageProvider || "cloudinary"
    }));

    const mainDescription = description.trim() || fullDescription.trim();

    const payload = {
      productName: productName.trim(),
      title: productName.trim(), // Derived safely from Product Name without exposing separate input
      storefrontProductTitle: productName.trim(),
      category,
      subcategory,
      equipmentType,
      modelNumber: manufacturerModel.trim() || undefined,
      internalModelId: `DM-${sku.trim()}`,
      sku: sku.trim(),
      slug: (slug || productName).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      brand: brand.trim(),

      // Step 4: Description
      shortDescription: shortDescription.trim() || mainDescription.slice(0, 180).trim(),
      fullDescription: mainDescription,
      description: mainDescription,
      overview: mainDescription,

      // Step 5: Technical Specifications
      powerSupply: powerSupply.trim(),
      powerRequirements: powerSupply.trim(),
      qualityStandards: qualityStandards.trim(),
      regulatoryStatus: regulatoryStatus.trim(),
      regulatoryClassification: regulatoryStatus.trim() || regulatoryClass,
      warranty: warranty.trim(),
      technicalSpecifications,
      specifications: technicalSpecifications,

      // Step 6: Clinical Indications
      clinicalIndications,
      applications: clinicalIndications,

      // Step 7: Key Factors & Engineering Highlights
      engineeringHighlights,
      features: engineeringHighlights,
      keyFeatures: engineeringHighlights,

      // Step 8: Standard Package Contents
      packageItems: packageItems.map((p) => ({
        id: p.id,
        name: p.name,
        item: p.name,
        type: p.type.toUpperCase()
      })),
      packageContents: packageItems.map((p) => p.name),

      // Step 9: Pricing & Inventory
      basePrice: Number(basePrice),
      salePrice: Number(basePrice),
      regularPrice: Number(originalPrice || basePrice),
      originalPrice: Number(originalPrice || basePrice),
      baseCurrency: "INR",
      discountPercentage,
      calculatedSavings,

      stock: Number(stock),
      lowStockThreshold: Number(lowStockThreshold),
      stockStatus: stock <= 0 ? "OUT_OF_STOCK" : stock <= 5 ? "LOW_STOCK" : "IN_STOCK",
      moq: Number(minOrderQuantity),
      leadTimeWeeks,
      shippingInformation,

      images: savedImages,
      galleryImages: savedImages,
      primaryImage: selectedPrimaryUrl,
      managedCloudinaryImages,

      // Settings & Metadata
      status,
      featured: isFeatured,
      isFeatured,
      bestseller: isBestSeller,
      isBestSeller,
      categoryGridVisible,
      metaTitle: metaTitle.trim(),
      seoTitle: metaTitle.trim(),
      metaDescription: metaDescription.trim(),
      seoDescription: metaDescription.trim(),

      // Legacy documentation fields
      certificationStatus,
      certificateNumber: certificateNumber.trim() || undefined,
      issuingOrg: issuingOrg.trim() || undefined,
      certifications,
      manualUrl: manualUrl.trim() || undefined,
      datasheetUrl: datasheetUrl.trim() || undefined,

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

      let data: any = {};
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = { message: `Malformed JSON response from server (HTTP ${res.status})` };
        }
      } else {
        const text = await res.text().catch(() => "");
        data = {
          message: res.status === 404
            ? `API endpoint returned HTTP 404 (Not Found): ${url}`
            : `Server returned HTTP ${res.status} (${res.statusText || "Non-JSON response"})${text ? `: ${text.slice(0, 100)}` : ""}`
        };
      }

      if (res.ok && data.success) {
        const savedProduct = data.product;
        const savedImgs = Array.isArray(savedProduct?.images) ? savedProduct.images : [];
        if (payload.images.length > 0 && savedImgs.length < payload.images.length) {
          setStatusBanner({
            type: "error",
            text: `Image persistence verification failed: submitted ${payload.images.length} photographs but server confirmed ${savedImgs.length}. Your changes have been preserved.`
          });
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        setHasUnsavedChanges(false);
        navigate("/admin/products", {
          state: {
            refreshed: true,
            updatedProduct: data.product,
            message: isEditMode
              ? `Product "${payload.productName}" updated successfully.`
              : `Product "${payload.productName}" created successfully.`
          }
        });
        return;
      }

      setStatusBanner({
        type: "error",
        text: data.message || `Failed to save product (HTTP ${res.status}). All entered fields have been safely preserved.`
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      console.error("Save product network error:", err);
      setStatusBanner({
        type: "error",
        text: `Network failure: ${err?.message || "Could not reach server"}. Your entered data is preserved locally.`
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout
      mainClassName="bg-[#7AA05A] min-h-screen"
      headerClassName="bg-[#7AA05A] border-b border-black/15 text-white"
      titleClassName="text-white font-black"
      subtitleClassName="text-white/80"
      title={isEditMode ? `Edit: ${productName || "Medical Equipment"}` : "Add New Medical Equipment"}
      subtitle={
        isEditMode
          ? "Modify clinical specifications, pricing, imagery, and regulatory standards."
          : "Enterprise medical equipment registration with Gemini AI auto-fill."
      }
    >
      {/* Top action bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-2 text-xs font-bold text-white hover:text-white/80 transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Products Catalogue</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveProduct}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white border border-white rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{isSaving ? "Saving..." : isEditMode ? "Save Changes" : "Save Product"}</span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusBanner && (
        <div
          className={`mb-6 p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-md ${
            statusBanner.type === "error"
              ? "bg-[#C62828] border-white text-white"
              : statusBanner.type === "warning"
              ? "bg-amber-800 border-white text-white"
              : "bg-[#0D4C3C] border-white text-white"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-white" />
            <p className="text-xs font-semibold leading-relaxed text-white">{statusBanner.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs font-bold text-white underline hover:no-underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Duplicate Product Detection Banner */}
      {duplicateInfo.isDuplicate && duplicateInfo.duplicateProduct && (
        <div className="mb-6 p-4 rounded-2xl border border-white bg-[#0D4C3C] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md text-white">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-[#EAB308] mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-white">
                Potential Duplicate Product Detected in Category
              </h4>
              <p className="text-xs text-white/80 mt-0.5">
                Existing item: <strong className="text-white underline">{duplicateInfo.duplicateProduct.title}</strong> (SKU: {duplicateInfo.duplicateProduct.sku})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`/admin/products/${duplicateInfo.duplicateProduct.id}/edit`}
              className="px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-white text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Open Existing</span>
            </Link>
            <label className="flex items-center gap-1.5 text-xs text-white cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuplicateOverride}
                onChange={(e) => setAllowDuplicateOverride(e.target.checked)}
                className="w-4 h-4 rounded border-white text-[#C62828] focus:ring-[#C62828] accent-[#C62828]"
              />
              <span>Allow intentional variant</span>
            </label>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* COMPACT HORIZONTAL NINE-STEP PROGRESS TRACKER                */}
      {/* ============================================================ */}
      <div className="mb-8 bg-[#0D4C3C] border border-white rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between overflow-x-auto pb-1 scrollbar-none gap-3">
          {stepStatus.map((step, idx) => {
            const isActive = activeStep === step.id;
            const isCompleted = step.isDone;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => scrollToAnchor(step.anchor, step.id)}
                className={`flex items-center gap-2 text-left shrink-0 transition-all cursor-pointer group ${
                  isCompleted || isActive ? "opacity-100" : "opacity-75 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.isDone
                      ? "bg-[#FFD400] text-black border-0 shadow-xs ring-0"
                      : isActive
                      ? "border border-white bg-[#C62828] text-white ring-2 ring-white"
                      : "border border-white/40 text-white/70 bg-white/10"
                  }`}
                  style={step.isDone ? { backgroundColor: "#FFD400", border: "none", outline: "none" } : undefined}
                >
                  {step.isDone ? <Check size={14} strokeWidth={3} className="text-black" /> : step.id}
                </div>

                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white group-hover:text-white/90">
                    {step.name}
                  </span>
                  <span className="text-[10px] text-white/70 font-medium">
                    {step.isDone ? "Completed" : isActive ? "Current" : `Step ${step.id}`}
                  </span>
                </div>

                {idx < stepStatus.length - 1 && (
                  <div className="hidden xl:block w-3 h-px bg-white/30 ml-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 9-STEP ENTERPRISE FORM WORKSPACE                             */}
      {/* ============================================================ */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSaveProduct();
        }}
        className="space-y-6"
      >
        {/* Hidden replacement file input */}
        <input
          type="file"
          ref={replaceFileInputRef}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleReplaceFile}
        />

        {/* Hidden main file input */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) {
              handleStep1PhotosSelected(Array.from(e.target.files));
              e.target.value = "";
            }
          }}
        />

        {/* ============================================================ */}
        {/* STEP 1: PRODUCT IMAGES (FULL WIDTH — ADRIZO LAYOUT)          */}
        {/* ============================================================ */}
        <div
          id="card-step-1"
          onClick={() => setSelectedCard("step-1")}
          onFocusCapture={() => setSelectedCard("step-1")}
          className={`rounded-2xl p-6 transition-all duration-200 border ${getCardStyle("step-1")}`}
        >
          {/* Step 1 Header */}
          <div className="bg-[#C62828] border border-white rounded-xl px-4 py-2.5 text-white flex items-center justify-between mb-5 shadow-xs">
            <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
              STEP 1 — PRODUCT IMAGES
            </span>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-black/30 border border-white/40 text-white">
              {imageSlots.length} of 5 Photos
            </span>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-stretch">
            {/* Left side — Upload Product Images (same height as photo tiles: h-44 sm:h-48) */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`h-44 sm:h-48 lg:w-72 shrink-0 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-white bg-black/40"
                  : imageSlots.length >= 5
                  ? "border-white/30 bg-black/20 opacity-50 cursor-not-allowed"
                  : "border-white/60 hover:border-white bg-black/25 hover:bg-black/35"
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-black/40 border border-white/60 mx-auto flex items-center justify-center text-white mb-2 shadow-xs">
                <Upload size={20} className="text-white" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white">Upload Product Images</h4>
              <p className="text-[11px] text-white/80 mt-0.5">Upload multiple product images at once</p>
              <p className="text-[10px] text-white/60 font-mono mt-1">
                JPEG, PNG, WebP up to 10MB (Max 5 photos)
              </p>
            </div>

            {/* Right side — Uploaded photographs horizontally */}
            <div className="flex-1 min-w-0 flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
              {imageSlots.length === 0 ? (
                <div className="h-44 sm:h-48 w-full rounded-xl border border-dashed border-white/40 bg-black/20 flex flex-col items-center justify-center text-white/60 text-xs px-4 text-center">
                  <ImageIcon size={26} className="mb-1 text-white/40" />
                  <span>No photographs uploaded yet. Click or drop images on the left tile.</span>
                </div>
              ) : (
                imageSlots.map((slot, idx) => {
                  const isPrimary = idx === primaryImageIndex;
                  return (
                    <div
                      key={slot.id || idx}
                      className="h-44 sm:h-48 w-36 sm:w-40 rounded-xl border border-white bg-black/30 p-2 flex flex-col justify-between shrink-0 relative group"
                    >
                      {/* Top Bar: Order number, primary badge, delete control */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="w-5 h-5 rounded bg-black/80 border border-white/40 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {isPrimary && (
                          <span className="bg-[#C62828] text-white text-[8px] font-black px-1.5 py-0.5 rounded border border-white shadow-xs tracking-wider">
                            PRIMARY
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          disabled={slot.status === "uploading"}
                          className="w-5 h-5 rounded-full bg-black/70 hover:bg-[#C62828] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                          title="Remove image"
                        >
                          <X size={11} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Thumbnail frame (object-contain, full picture visible, clicking sets primary, double clicking opens enlarged preview) */}
                      <div
                        onClick={(e) => handleThumbnailClick(e, idx)}
                        onDoubleClick={(e) => handleThumbnailDoubleClick(e, slot, idx)}
                        className="flex-1 w-full my-1 rounded-lg bg-black/50 overflow-hidden flex items-center justify-center relative cursor-pointer border border-white/20 hover:border-white/60 transition-colors"
                        title="Click to set main • Double-click to enlarge preview"
                      >
                        {slot.hasLoadError ? (
                          <ImageOff size={18} className="text-white/40" />
                        ) : (
                          <img
                            src={slot.previewUrl || slot.url}
                            alt={`Device view ${idx + 1}`}
                            className="w-full h-full object-contain select-none"
                            onError={() => handleSlotLoadError(slot.id)}
                          />
                        )}

                        {slot.status === "uploading" && (
                          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                            <RefreshCw size={14} className="animate-spin text-white" />
                          </div>
                        )}
                      </div>

                      {/* Bottom Controls: arrows & primary action */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/20">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveImage(idx, "left")}
                            disabled={idx === 0 || slot.status === "uploading"}
                            className="p-1 text-white/70 hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move left"
                          >
                            <MoveLeft size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(idx, "right")}
                            disabled={idx === imageSlots.length - 1 || slot.status === "uploading"}
                            className="p-1 text-white/70 hover:text-white disabled:opacity-20 cursor-pointer"
                            title="Move right"
                          >
                            <MoveRight size={11} />
                          </button>
                        </div>

                        {!isPrimary ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPrimaryImageIndex(idx);
                              setHasUnsavedChanges(true);
                            }}
                            className="text-[9px] font-bold text-white/80 hover:text-white underline cursor-pointer"
                          >
                            Set Main
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-300">Main Photo</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}

              {/* Add More Tile (same outer height: h-44 sm:h-48, w-36 sm:w-40) */}
              {imageSlots.length > 0 && imageSlots.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-44 sm:h-48 w-36 sm:w-40 rounded-xl border-2 border-dashed border-white/60 hover:border-white bg-black/25 hover:bg-black/35 flex flex-col items-center justify-center text-white transition-all cursor-pointer shrink-0"
                >
                  <Plus size={22} className="mb-1 text-white" />
                  <span className="text-xs font-bold text-white">Add More</span>
                  <span className="text-[9px] text-white/60 font-mono mt-0.5">{5 - imageSlots.length} left</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* COMPACT RED BUTTON: RUN AI ANALYSIS (DIRECTLY BELOW STEP 1)  */}
        {/* ============================================================ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => triggerAiIdentification()}
            disabled={isAiIdentifying || imageSlots.length === 0}
            className="px-5 py-2.5 bg-[#C62828] hover:bg-[#B71C1C] disabled:opacity-50 text-white border border-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
          >
            {isAiIdentifying ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{isAiIdentifying ? "Analyzing Photographs..." : "Run AI Analysis"}</span>
          </button>

          {aiIdentifyError && (
            <div className="p-2.5 rounded-xl bg-[#C62828] border border-white text-xs text-white flex items-center justify-between gap-2 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0 text-white" />
                <span>{aiIdentifyError}</span>
              </div>
              <button
                type="button"
                onClick={() => setAiIdentifyError(null)}
                className="font-bold underline cursor-pointer text-xs text-white"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* RESPONSIVE TWO-COLUMN GRID: STEPS 2 TO 9                     */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

          {/* ========================================================== */}
          {/* STEP 2: PRODUCT CLASSIFICATION (ROW 1 - LEFT)              */}
          {/* ========================================================== */}
          <div
            id="card-step-2"
            onClick={() => setSelectedCard("step-2")}
            onFocusCapture={() => setSelectedCard("step-2")}
            className={`rounded-2xl p-6 space-y-4 transition-all duration-200 border flex flex-col justify-between ${getCardStyle("step-2")}`}
          >
            <div>
              {/* Step 2 Header */}
              <div className="bg-[#C62828] border border-white rounded-xl px-4 py-2.5 text-white flex items-center justify-between mb-4 shadow-xs relative">
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                  STEP 2 — PRODUCT CLASSIFICATION
                </span>

                <div className="relative" ref={addMenuRef}>
                  <button
                    type="button"
                    id="btn-add-classification-menu"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddMenuOpen((prev) => !prev);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/40 hover:bg-black/60 border border-white/60 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus size={13} className="stroke-[2.5]" />
                    <span>Add</span>
                  </button>

                  {/* Classification Options Dropdown */}
                  {isAddMenuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1.5 w-60 bg-[#0D4C3C] border border-white/60 rounded-xl shadow-2xl py-1.5 z-40 text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        id="btn-choice-add-primary"
                        onClick={() => {
                          setIsAddMenuOpen(false);
                          setAddModalType("primary");
                          setAddModalError(null);
                          setNewPrimaryName("");
                          setNewPrimaryCode("");
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-2.5 cursor-pointer"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#FFD400] text-black flex items-center justify-center font-black text-[10px] shrink-0">+</span>
                        <span>Add Primary Category</span>
                      </button>
                      <button
                        type="button"
                        id="btn-choice-add-subcategory"
                        onClick={() => {
                          setIsAddMenuOpen(false);
                          setAddModalType("subcategory");
                          setAddModalError(null);
                          setNewSubParentCat(category || allCategories[0]?.slug || "ot-lights");
                          setNewSubName("");
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-2.5 cursor-pointer border-t border-white/15"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#FFD400] text-black flex items-center justify-center font-black text-[10px] shrink-0">+</span>
                        <span>Add Subcategory</span>
                      </button>
                      <button
                        type="button"
                        id="btn-choice-add-equipment-type"
                        onClick={() => {
                          setIsAddMenuOpen(false);
                          setAddModalType("equipment-type");
                          setAddModalError(null);
                          const activeParent = category || allCategories[0]?.slug || "ot-lights";
                          setNewEqParentCat(activeParent);
                          const parentSubcats = catalogueHierarchy[activeParent]?.subcategories || [];
                          const matchingSub = parentSubcats.find((s: any) => s.id === subcategory);
                          setNewEqSubcat(matchingSub ? matchingSub.id : (parentSubcats[0]?.id || ""));
                          setNewEqName("");
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs font-semibold hover:bg-white/10 transition-colors flex items-center gap-2.5 cursor-pointer border-t border-white/15"
                      >
                        <span className="w-4 h-4 rounded-full bg-[#FFD400] text-black flex items-center justify-center font-black text-[10px] shrink-0">+</span>
                        <span>Add Verified Equipment Type</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 mt-4">
                {/* Primary Category */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Primary Category <span className="text-[#C62828] font-bold">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setCategory(newCat);
                      setSubcategory("");
                      setEquipmentType("");
                      markFieldEdited("category");
                      if (!manuallyEditedFields.has("sku")) {
                        fetchNewSku(newCat, "", productName, false);
                      }
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none cursor-pointer"
                  >
                    {allCategories.map((c) => {
                      const isInactive = c.status === "INACTIVE" || c.active === false;
                      return (
                        <option key={c.id} value={c.slug}>
                          {c.name} {isInactive ? "(Inactive Storefront)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Subcategory */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Subcategory <span className="text-[#C62828] font-bold">*</span>
                  </label>
                  <select
                    value={subcategory}
                    disabled={!category || availableSubcategories.length === 0}
                    onChange={(e) => {
                      const newSub = e.target.value;
                      setSubcategory(newSub);
                      setEquipmentType("");
                      markFieldEdited("subcategory");
                      if (!manuallyEditedFields.has("sku")) {
                        fetchNewSku(category, newSub, productName, false);
                      }
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none disabled:opacity-50 disabled:bg-neutral-200 cursor-pointer"
                  >
                    <option value="">— Select Subcategory —</option>
                    {availableSubcategories.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Verified Equipment Type */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Verified Equipment Type <span className="text-[#C62828] font-bold">*</span>
                  </label>
                  <select
                    value={equipmentType}
                    disabled={!subcategory || availableEquipmentTypes.length === 0}
                    onChange={(e) => {
                      const newEq = e.target.value;
                      setEquipmentType(newEq);
                      markFieldEdited("equipmentType");
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none disabled:opacity-50 disabled:bg-neutral-200 cursor-pointer"
                  >
                    <option value="">— Select Equipment Type —</option>
                    {availableEquipmentTypes.map((eq: any) => (
                      <option key={eq.id} value={eq.name}>
                        {eq.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-white/80 mt-1.5">
                    Filtered based on verified DR.MEDEX catalogue taxonomy.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 3: PRODUCT IDENTITY (ROW 1 - RIGHT — EXACTLY 3 FIELDS)*/}
          {/* ========================================================== */}
          <div
            id="card-step-3"
            onClick={() => setSelectedCard("step-3")}
            onFocusCapture={() => setSelectedCard("step-3")}
            className={`rounded-2xl p-6 space-y-4 transition-all duration-200 border flex flex-col justify-between ${getCardStyle("step-3")}`}
          >
            <div>
              {/* Step 3 Header */}
              <div className="bg-[#C62828] border border-white rounded-xl px-4 py-2.5 text-white flex items-center justify-between mb-4 shadow-xs">
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                  STEP 3 — PRODUCT IDENTITY
                </span>

                <button
                  type="button"
                  onClick={handleRegenerateName}
                  disabled={isGeneratingIdentity}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-black/30 hover:bg-black/50 text-white rounded-lg text-xs font-bold transition-colors border border-white/40 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingIdentity ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>Regenerate Name</span>
                </button>
              </div>

              <div className="space-y-4 mt-4">
                {/* 1. Product Name */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    1. Product Name <span className="text-[#C62828] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => {
                      setProductName(e.target.value);
                      markFieldEdited("productName");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. DR.MEDEX Ceiling-Mounted Double Dome LED OT Light – DL80"
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                  />
                </div>

                {/* 2. Manufacturer Model */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    2. Manufacturer Model
                  </label>
                  <input
                    type="text"
                    value={manufacturerModel}
                    onChange={(e) => {
                      setManufacturerModel(e.target.value);
                      markFieldEdited("manufacturerModel");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. DL-80 or Std Unit"
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                  />
                </div>

                {/* 3. SKU */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1 flex items-center justify-between">
                    <span>3. SKU <span className="text-[#C62828] font-bold">*</span></span>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => fetchNewSku(category, subcategory, productName, true)}
                        title="Regenerate unique SKU based on current classification & product name"
                        className="text-[10px] text-white/90 hover:text-white flex items-center gap-1 cursor-pointer underline transition-colors"
                      >
                        <RefreshCw size={10} />
                        <span>Regenerate</span>
                      </button>
                      {sku && (
                        <button
                          type="button"
                          onClick={handleCopySku}
                          className="text-[10px] text-white/90 hover:text-white flex items-center gap-1 cursor-pointer underline transition-colors"
                        >
                          {copiedSku ? <Check size={10} className="text-emerald-300" /> : <Copy size={10} />}
                          <span>{copiedSku ? "Copied" : "Copy"}</span>
                        </button>
                      )}
                    </div>
                  </label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setSku(val);
                      validateSku(val);
                      markFieldEdited("sku");
                      setHasUnsavedChanges(true);
                    }}
                    className={`w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border rounded-xl text-xs font-mono font-bold focus:bg-[#FEFCE8] focus:outline-none ${
                      skuError ? "border-[#C62828] ring-1 ring-[#C62828]" : "border-white/40 focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308]"
                    }`}
                  />
                  {skuError && <p className="text-[10px] text-white font-bold bg-[#C62828] px-2 py-0.5 rounded mt-1">{skuError}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 4: PRODUCT DESCRIPTION (ROW 2 - LEFT)                 */}
          {/* ========================================================== */}
          <div
            id="card-step-4"
            onClick={() => setSelectedCard("step-4")}
            onFocusCapture={() => setSelectedCard("step-4")}
            className={`rounded-2xl p-6 space-y-4 transition-all duration-200 border flex flex-col justify-between ${getCardStyle("step-4")}`}
          >
            <div>
              {/* Step 4 Header */}
              <div className="bg-[#C62828] border border-white rounded-xl px-4 py-2.5 text-white flex items-center justify-between mb-4 shadow-xs">
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                  STEP 4 — PRODUCT DESCRIPTION
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateDescription}
                  disabled={isRegeneratingDescription}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-black/30 hover:bg-black/50 text-white rounded-lg text-xs font-bold transition-colors border border-white/40 cursor-pointer disabled:opacity-50"
                >
                  {isRegeneratingDescription ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>Regenerate Description</span>
                </button>
              </div>

              <div className="space-y-2 mt-4">
                <label className="block text-xs font-bold text-white mb-1">
                  Clinical & Operational Overview <span className="text-[#C62828] font-bold">*</span>
                </label>
                <textarea
                  rows={12}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setFullDescription(e.target.value);
                    markFieldEdited("description");
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Enter product description explaining purpose, design, intended surgical workflow, and clinical advantages..."
                  className="w-full min-h-[220px] resize-y px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-white/80 font-mono">
                  <span>Main description only. Specs and package lists are managed in their own cards.</span>
                  <span>{description.length} chars • {description.trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 5: TECHNICAL SPECIFICATIONS (ROW 2 - RIGHT)           */}
          {/* ========================================================== */}
          <div
            id="card-step-5"
            onClick={() => setSelectedCard("step-5")}
            onFocusCapture={() => setSelectedCard("step-5")}
            className={`rounded-2xl p-6 space-y-4 transition-all duration-200 border flex flex-col justify-between ${getCardStyle("step-5")}`}
          >
            <div>
              {/* Step 5 Header */}
              <div className="bg-[#C62828] border border-white rounded-xl px-4 py-2.5 text-white flex items-center justify-between mb-4 shadow-xs">
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                  STEP 5 — TECHNICAL SPECIFICATIONS
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-black/30 border border-white/40 text-white">
                  4 Core Fields
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/30 border border-white/40 text-white flex items-center gap-2 mt-4 text-xs">
                <ShieldCheck size={14} className="shrink-0 text-[#EAB308]" />
                <span>
                  Unverified parameters remain blank or &quot;Needs verification&quot;.
                </span>
              </div>

              <div className="space-y-3 mt-3">
                {/* 1. Power Supply */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    1. Power Supply
                  </label>
                  <input
                    type="text"
                    value={powerSupply}
                    onChange={(e) => {
                      setPowerSupply(e.target.value);
                      markFieldEdited("powerSupply");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. 220–240 V AC, 50/60 Hz, 80 VA (or leave blank)"
                    className="w-full px-3.5 py-2 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                  />
                </div>

                {/* 2. Quality Standards */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    2. Quality Standards
                  </label>
                  <input
                    type="text"
                    value={qualityStandards}
                    onChange={(e) => {
                      setQualityStandards(e.target.value);
                      markFieldEdited("qualityStandards");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. ISO 13485:2016 Certified Facility (or leave blank)"
                    className="w-full px-3.5 py-2 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                  />
                </div>

                {/* 3. Regulatory Status */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    3. Regulatory Status
                  </label>
                  <input
                    type="text"
                    value={regulatoryStatus}
                    onChange={(e) => {
                      setRegulatoryStatus(e.target.value);
                      markFieldEdited("regulatoryStatus");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. CE Marking (EU MDR 2017/745) / CDSCO (or leave blank)"
                    className="w-full px-3.5 py-2 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                  />
                </div>

                {/* 4. Warranty */}
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    4. Warranty
                  </label>
                  <input
                    type="text"
                    value={warranty}
                    onChange={(e) => {
                      setWarranty(e.target.value);
                      markFieldEdited("warranty");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. 2-Year Comprehensive Clinical Warranty"
                    className="w-full px-3.5 py-2 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 6: CLINICAL INDICATIONS (ROW 3 - LEFT)                */}
          {/* ========================================================== */}
          <div
            id="card-step-6"
            onClick={() => setSelectedCard("step-6")}
            onFocusCapture={() => setSelectedCard("step-6")}
            className={`rounded-2xl p-6 space-y-4 transition-all duration-200 border flex flex-col justify-between ${getCardStyle("step-6")}`}
          >
            <div>
              {/* Step 6 Header */}
              <div className="bg-[#C62828] border border-white rounded-xl px-4 py-2.5 text-white flex items-center justify-between mb-4 shadow-xs">
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                  STEP 6 — CLINICAL INDICATIONS & SPECIALTY PROCEDURES
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateIndications}
                  disabled={isRegeneratingIndications}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-black/30 hover:bg-black/50 text-white rounded-lg text-xs font-bold transition-colors border border-white/40 cursor-pointer disabled:opacity-50"
                >
                  {isRegeneratingIndications ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>Regenerate</span>
                </button>
              </div>

              <p className="text-xs text-white/80 mt-2 mb-3">
                Intended clinical departments, surgical workflows, and validated procedures.
              </p>

              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newIndicationText}
                  onChange={(e) => setNewIndicationText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newIndicationText.trim()) {
                        setClinicalIndications([...clinicalIndications, newIndicationText.trim()]);
                        setNewIndicationText("");
                        markFieldEdited("clinicalIndications");
                        setHasUnsavedChanges(true);
                      }
                    }
                  }}
                  placeholder="Add clinical indication..."
                  className="flex-1 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newIndicationText.trim()) {
                      setClinicalIndications([...clinicalIndications, newIndicationText.trim()]);
                      setNewIndicationText("");
                      markFieldEdited("clinicalIndications");
                      setHasUnsavedChanges(true);
                    }
                  }}
                  className="px-4 py-2.5 bg-black/30 hover:bg-black/50 text-white rounded-xl text-xs font-bold border border-white/40 cursor-pointer transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto mt-3">
                {clinicalIndications.length === 0 ? (
                  <div className="p-3 text-center text-xs text-white/70 bg-black/20 rounded-xl border border-dashed border-white/30">
                    No clinical indications specified yet. Use AI Analysis or add above.
                  </div>
                ) : (
                  clinicalIndications.map((ind, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white text-[#171717] p-2.5 rounded-xl border border-white/40 shadow-2xs">
                      <span className="flex-1 pr-2 font-medium">• {ind}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setClinicalIndications(clinicalIndications.filter((_, idx) => idx !== i));
                          markFieldEdited("clinicalIndications");
                          setHasUnsavedChanges(true);
                        }}
                        className="text-neutral-400 hover:text-[#C62828] cursor-pointer transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 7: KEY FACTORS & HIGHLIGHTS (ROW 3 - RIGHT)           */}
          {/* ========================================================== */}
          <div
            id="card-step-7"
            onClick={() => setSelectedCard("step-7")}
            onFocusCapture={() => setSelectedCard("step-7")}
            className={`rounded-2xl p-6 space-y-4 transition-all duration-200 border flex flex-col justify-between ${getCardStyle("step-7")}`}
          >
            <div>
              {/* Step 7 Header */}
              <div className="bg-[#C62828] border border-white rounded-xl px-4 py-2.5 text-white flex items-center justify-between mb-4 shadow-xs">
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                  STEP 7 — KEY FACTORS & ENGINEERING HIGHLIGHTS
                </span>
                <button
                  type="button"
                  onClick={handleRegenerateHighlights}
                  disabled={isRegeneratingHighlights}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-black/30 hover:bg-black/50 text-white rounded-lg text-xs font-bold transition-colors border border-white/40 cursor-pointer disabled:opacity-50"
                >
                  {isRegeneratingHighlights ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>Regenerate</span>
                </button>
              </div>

              <p className="text-xs text-white/80 mt-2 mb-3">
                Concise engineering, performance, mechanical design, and safety highlights.
              </p>

              <div className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={newHighlightText}
                  onChange={(e) => setNewHighlightText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newHighlightText.trim()) {
                        setEngineeringHighlights([...engineeringHighlights, newHighlightText.trim()]);
                        setNewHighlightText("");
                        markFieldEdited("engineeringHighlights");
                        setHasUnsavedChanges(true);
                      }
                    }
                  }}
                  placeholder="Add engineering highlight..."
                  className="flex-1 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newHighlightText.trim()) {
                      setEngineeringHighlights([...engineeringHighlights, newHighlightText.trim()]);
                      setNewHighlightText("");
                      markFieldEdited("engineeringHighlights");
                      setHasUnsavedChanges(true);
                    }
                  }}
                  className="px-4 py-2.5 bg-black/30 hover:bg-black/50 text-white rounded-xl text-xs font-bold border border-white/40 cursor-pointer transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto mt-3">
                {engineeringHighlights.length === 0 ? (
                  <div className="p-3 text-center text-xs text-white/70 bg-black/20 rounded-xl border border-dashed border-white/30">
                    No engineering highlights added yet. Use AI Analysis or add above.
                  </div>
                ) : (
                  engineeringHighlights.map((hl, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-white text-[#171717] p-2.5 rounded-xl border border-white/40 shadow-2xs">
                      <span className="flex-1 pr-2 font-medium">• {hl}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEngineeringHighlights(engineeringHighlights.filter((_, idx) => idx !== i));
                          markFieldEdited("engineeringHighlights");
                          setHasUnsavedChanges(true);
                        }}
                        className="text-neutral-400 hover:text-[#C62828] cursor-pointer transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 8: STANDARD PACKAGE CONTENTS (ROW 4 - LEFT)           */}
          {/* ========================================================== */}
          <div
            id="card-step-8"
            onClick={() => setSelectedCard("step-8")}
            onFocusCapture={() => setSelectedCard("step-8")}
            className={`rounded-2xl p-6 space-y-4 transition-all duration-200 border flex flex-col justify-between ${getCardStyle("step-8")}`}
          >
            <div>
              {/* Step 8 Header */}
              <div className="bg-[#C62828] border border-white rounded-xl px-4 py-2.5 text-white flex items-center justify-between mb-4 shadow-xs">
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                  STEP 8 — STANDARD INCLUDED PACKAGE CONTENTS
                </span>
                <button
                  type="button"
                  onClick={handleRegeneratePackage}
                  disabled={isRegeneratingPackage}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-black/30 hover:bg-black/50 text-white rounded-lg text-xs font-bold transition-colors border border-white/40 cursor-pointer disabled:opacity-50"
                >
                  {isRegeneratingPackage ? <RefreshCw size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  <span>Regenerate</span>
                </button>
              </div>

              <p className="text-xs text-white/80 mt-2 mb-3">
                Verified components, cables, modules, and standard hardware included in shipment.
              </p>

              <div className="grid grid-cols-12 gap-2 mt-3">
                <input
                  type="text"
                  value={newPackageItemName}
                  onChange={(e) => setNewPackageItemName(e.target.value)}
                  placeholder="Component name..."
                  className="col-span-7 px-3 py-2 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                />
                <select
                  value={newPackageItemType}
                  onChange={(e) => setNewPackageItemType(e.target.value as any)}
                  className="col-span-3 px-2 py-2 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none cursor-pointer"
                >
                  <option value="standard">Standard</option>
                  <option value="optional">Optional</option>
                  <option value="confirmation">To Confirm</option>
                </select>
                <button
                  type="button"
                  onClick={addPackageItem}
                  className="col-span-2 bg-black/30 hover:bg-black/50 text-white rounded-xl text-xs font-bold flex items-center justify-center border border-white/40 cursor-pointer transition-colors"
                >
                  Add
                </button>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto mt-3">
                {packageItems.length === 0 ? (
                  <div className="p-3 text-center text-xs text-white/70 bg-black/20 rounded-xl border border-dashed border-white/30">
                    No package components added yet.
                  </div>
                ) : (
                  packageItems.map((item, i) => (
                    <div key={item.id || i} className="flex items-center justify-between text-xs bg-white text-[#171717] p-2.5 rounded-xl border border-white/40 shadow-2xs">
                      <div className="flex items-center gap-2 flex-1 pr-2 truncate">
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            item.type === "standard"
                              ? "bg-emerald-100 text-[#16803D]"
                              : item.type === "optional"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="font-medium text-neutral-800 truncate">{item.name}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => movePackageItem(i, "up")}
                          disabled={i === 0}
                          title="Move up"
                          className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePackageItem(i, "down")}
                          disabled={i === packageItems.length - 1}
                          title="Move down"
                          className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePackageItem(i)}
                          title="Remove component"
                          className="p-1 text-neutral-400 hover:text-[#C62828] cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 9: PRICING (ROW 4 - RIGHT)                             */}
          {/* ========================================================== */}
          <div
            id="card-step-9"
            onClick={() => setSelectedCard("step-9")}
            onFocusCapture={() => setSelectedCard("step-9")}
            className={`rounded-2xl p-6 space-y-4 transition-all duration-200 border flex flex-col justify-between ${getCardStyle("step-9")}`}
          >
            <div>
              {/* Step 9 Header */}
              <div className="bg-[#C62828] border border-white rounded-xl px-4 py-2.5 text-white flex items-center justify-between mb-4 shadow-xs">
                <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                  STEP 9 — PRICING
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-black/30 border border-white/40 text-white">
                  Base: ₹ INR
                </span>
              </div>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1">
                      Original MRP (₹ INR) <span className="text-[#C62828] font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={originalPrice || ""}
                      onChange={(e) => {
                        setOriginalPrice(parseFloat(e.target.value) || 0);
                        markFieldEdited("originalPrice");
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="e.g. 175000"
                      className="w-full px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-mono font-bold focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white mb-1">
                      Selling Price (₹ INR) <span className="text-[#C62828] font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={basePrice || ""}
                      onChange={(e) => {
                        setBasePrice(parseFloat(e.target.value) || 0);
                        markFieldEdited("basePrice");
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="e.g. 150000"
                      className="w-full px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-mono font-bold focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Automatic Calculated Discount & Savings Card */}
                <div className="p-3.5 rounded-xl border border-white/40 bg-black/25 flex flex-col justify-center space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/80 uppercase font-mono tracking-wider">
                      Calculated Discount
                    </span>
                    {discountPercentage > 0 ? (
                      <span className="text-sm font-black text-[#C62828] bg-white px-2.5 py-0.5 rounded-md border border-white shadow-xs">
                        {discountFormatted}% OFF
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-white/70">No discount applied</span>
                    )}
                  </div>
                  {calculatedSavings > 0 ? (
                    <div className="text-xs font-bold text-white pt-1">
                      You Save: ₹{calculatedSavings.toLocaleString("en-IN")}
                    </div>
                  ) : null}
                </div>

                {/* Live International FX Currency Preview */}
                <div className="p-3.5 rounded-xl border border-white/40 bg-black/25 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Globe size={13} className="text-[#EAB308]" />
                      <span>International Pricing</span>
                    </span>
                    <span className="text-[10px] text-white/70 font-mono">
                      {rateTimestamp ? new Date(rateTimestamp).toLocaleTimeString() : "Live FX"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-white rounded-lg border border-white/40">
                      <span className="text-[10px] text-neutral-500 block font-mono font-bold">USD</span>
                      <span className="text-xs font-bold text-[#171717]">
                        ${(basePrice * (exchangeRates.USD || 0.010379)).toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-white/40">
                      <span className="text-[10px] text-neutral-500 block font-mono font-bold">EUR</span>
                      <span className="text-xs font-bold text-[#171717]">
                        €{(basePrice * (exchangeRates.EUR || 0.009228)).toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-white/40">
                      <span className="text-[10px] text-neutral-500 block font-mono font-bold">GBP</span>
                      <span className="text-xs font-bold text-[#171717]">
                        £{(basePrice * (exchangeRates.GBP || 0.007854)).toFixed(2)}
                      </span>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-white/40">
                      <span className="text-[10px] text-neutral-500 block font-mono font-bold">AED</span>
                      <span className="text-xs font-bold text-[#171717]">
                        {(basePrice * (exchangeRates.AED || 0.038116)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stock Quantity & Status Toggle (Strictly only these 2 fields) */}
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1">
                      1. Stock Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stock}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setStock(val);
                        if (val === 0) {
                          setStockStatus("OUT_OF_STOCK");
                        } else if (stockStatus === "OUT_OF_STOCK") {
                          setStockStatus("IN_STOCK");
                        }
                        markFieldEdited("stock");
                        markFieldEdited("stockStatus");
                        setHasUnsavedChanges(true);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-mono font-bold focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-white mb-1">
                      2. In-Stock Status
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const isCurrentlyInStock = stockStatus !== "OUT_OF_STOCK";
                        if (isCurrentlyInStock) {
                          setStockStatus("OUT_OF_STOCK");
                          setStock(0);
                        } else {
                          setStockStatus("IN_STOCK");
                          if (stock <= 0) setStock(10);
                        }
                        markFieldEdited("stockStatus");
                        markFieldEdited("stock");
                        setHasUnsavedChanges(true);
                      }}
                      className={`w-full py-2.5 px-3.5 rounded-xl border border-white/40 text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        stockStatus !== "OUT_OF_STOCK"
                          ? "bg-white text-[#0D4C3C]"
                          : "bg-black/30 text-white"
                      }`}
                    >
                      <span>{stockStatus !== "OUT_OF_STOCK" ? "In Stock (Available)" : "Out of Stock"}</span>
                      <span
                        className={`w-3.5 h-3.5 rounded-full ${
                          stockStatus !== "OUT_OF_STOCK" ? "bg-[#16803D]" : "bg-[#C62828]"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* SETTINGS & METADATA — FINAL SECTION (FULL WIDTH)           */}
          {/* ========================================================== */}
          <div
            id="card-settings"
            onClick={() => setSelectedCard("settings")}
            onFocusCapture={() => setSelectedCard("settings")}
            className={`col-span-1 lg:col-span-2 rounded-2xl p-6 space-y-4 transition-all duration-200 border ${getCardStyle("settings")}`}
          >
            {/* Settings Header */}
            <div className="bg-[#C62828] border border-white rounded-xl px-4 py-2.5 text-white flex items-center justify-between mb-4 shadow-xs">
              <span className="text-xs sm:text-sm font-bold tracking-wider uppercase">
                SETTINGS & METADATA
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-black/30 border border-white/40 text-white">
                Storefront Visibility
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-white mb-1">
                  Publication Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as any);
                    markFieldEdited("status");
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-bold focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none cursor-pointer"
                >
                  <option value="DRAFT">Draft (Internal Only, Hidden from Public)</option>
                  <option value="ACTIVE">Active (Live in Storefront)</option>
                  <option value="INACTIVE">Inactive (Hidden from Storefront)</option>
                  <option value="ARCHIVED">Archived (Historical Record)</option>
                </select>

                <div className="space-y-2.5 pt-3 mt-3 border-t border-white/20">
                  <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => {
                        setIsFeatured(e.target.checked);
                        markFieldEdited("isFeatured");
                        setHasUnsavedChanges(true);
                      }}
                      className="w-4 h-4 rounded border-white/40 text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
                    />
                    <span className="font-semibold">Featured on Homepage Clinical Grid</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBestSeller}
                      onChange={(e) => {
                        setIsBestSeller(e.target.checked);
                        markFieldEdited("isBestSeller");
                        setHasUnsavedChanges(true);
                      }}
                      className="w-4 h-4 rounded border-white/40 text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
                    />
                    <span className="font-semibold">Bestseller Ribbon Badge</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryGridVisible}
                      onChange={(e) => {
                        setCategoryGridVisible(e.target.checked);
                        markFieldEdited("categoryGridVisible");
                        setHasUnsavedChanges(true);
                      }}
                      className="w-4 h-4 rounded border-white/40 text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
                    />
                    <span className="font-semibold">Category Grid Visibility</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Storefront SEO Meta Title
                  </label>
                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => {
                      setMetaTitle(e.target.value);
                      markFieldEdited("metaTitle");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. DR.MEDEX LED OT Light | Surgical Ceiling Luminaire"
                    className="w-full px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Storefront SEO Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={metaDescription}
                    onChange={(e) => {
                      setMetaDescription(e.target.value);
                      markFieldEdited("metaDescription");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="High-intent search description for Google index..."
                    className="w-full px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* FINAL FORM BOTTOM SAVE ACTION BAR (NATURAL SCROLLING)        */}
        {/* ============================================================ */}
        <div className="bg-[#0D4C3C] py-4 px-6 border border-white shadow-xl rounded-2xl flex items-center justify-between flex-wrap gap-4 text-white">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${
                hasUnsavedChanges ? "bg-[#EAB308] animate-pulse" : "bg-emerald-400"
              }`}
            />
            <span className="text-xs font-bold text-white">
              {hasUnsavedChanges ? "Unsaved changes detected" : "All fields synchronized"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/products"
              className="px-5 py-2.5 border border-white rounded-xl text-xs font-bold text-white bg-transparent hover:bg-white/10 transition-colors"
            >
              Discard Changes
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-2.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-bold transition-all border border-white shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? "Saving Product..." : isEditMode ? "Save Changes" : "Save Product"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* ============================================================ */}
      {/* ENLARGED PRODUCT IMAGE PREVIEW MODAL (DOUBLE-CLICK VIEWER)   */}
      {/* ============================================================ */}
      {enlargedImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={enlargedImage.title || "Enlarged product image preview"}
          onClick={() => setEnlargedImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
        >
          {/* Modal Container */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] w-full bg-[#0D4C3C] border border-white rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Top Modal Header */}
            <div className="px-5 py-3.5 bg-[#0D4C3C] border-b border-white/20 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-md bg-[#C62828] text-white border border-white text-xs font-bold flex items-center justify-center">
                  {enlargedImage.index + 1}
                </span>
                <span className="text-xs sm:text-sm font-bold tracking-wide">
                  {enlargedImage.title}
                </span>
                {enlargedImage.index === primaryImageIndex && (
                  <span className="bg-[#C62828] text-white text-[9px] font-black px-2 py-0.5 rounded border border-white tracking-wider">
                    PRIMARY
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setEnlargedImage(null)}
                aria-label="Close enlarged preview"
                className="w-8 h-8 rounded-lg bg-black/40 hover:bg-[#C62828] text-white flex items-center justify-center transition-colors border border-white/30 cursor-pointer"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Complete Image without Stretching or Cropping */}
            <div className="p-4 sm:p-6 flex-1 flex items-center justify-center bg-black/60 overflow-hidden min-h-[300px] max-h-[75vh]">
              <img
                src={enlargedImage.url}
                alt={enlargedImage.title}
                className="max-h-[70vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-md select-none"
              />
            </div>

            {/* Bottom Modal Hint Bar */}
            <div className="px-5 py-2.5 bg-[#0D4C3C] border-t border-white/20 flex items-center justify-between text-[11px] text-white/70">
              <span>Press <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/30 font-mono text-white text-[10px]">Esc</kbd> or click backdrop to close</span>
              <span className="font-mono text-[10px]">Full Resolution Preview</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ADD CLASSIFICATION MODAL (L1, L2, L3 CREATION)               */}
      {/* ============================================================ */}
      {addModalType && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={
            addModalType === "primary"
              ? "Add Primary Category"
              : addModalType === "subcategory"
              ? "Add Subcategory"
              : "Add Verified Equipment Type"
          }
          onClick={() => {
            if (!isSubmittingAdd) setAddModalType(null);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-md w-full bg-[#0D4C3C] border border-white rounded-2xl p-6 shadow-2xl space-y-4 text-white"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/20">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[#C62828] text-white border border-white text-xs font-bold flex items-center justify-center">
                  +
                </span>
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  {addModalType === "primary" && "Add Primary Category"}
                  {addModalType === "subcategory" && "Add Subcategory"}
                  {addModalType === "equipment-type" && "Add Verified Equipment Type"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingAdd) setAddModalType(null);
                }}
                disabled={isSubmittingAdd}
                aria-label="Close dialog"
                className="w-7 h-7 rounded-lg bg-black/40 hover:bg-[#C62828] text-white flex items-center justify-center transition-colors border border-white/30 cursor-pointer disabled:opacity-50"
              >
                <X size={15} />
              </button>
            </div>

            {/* Error Banner */}
            {addModalError && (
              <div className="p-3 bg-red-950/80 border border-red-500/80 rounded-xl text-red-200 text-xs font-medium flex items-center gap-2 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                <span>{addModalError}</span>
              </div>
            )}

            {/* Modal Body */}
            {addModalType === "primary" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Category Name <span className="text-[#C62828] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-new-primary-name"
                    value={newPrimaryName}
                    onChange={(e) => {
                      setNewPrimaryName(e.target.value);
                      setAddModalError(null);
                    }}
                    placeholder="e.g., Diagnostic Imaging"
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Taxonomy / SKU Code <span className="text-white/60 font-normal">(Optional, 3–4 letters)</span>
                  </label>
                  <input
                    type="text"
                    id="input-new-primary-code"
                    value={newPrimaryCode}
                    onChange={(e) => setNewPrimaryCode(e.target.value.toUpperCase())}
                    placeholder="e.g., IMG"
                    maxLength={4}
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none uppercase font-mono"
                  />
                  <p className="text-[11px] text-white/70 mt-1">
                    Auto-generated from name if left blank (used for unique product SKU prefixes).
                  </p>
                </div>
              </div>
            )}

            {addModalType === "subcategory" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Parent Primary Category <span className="text-[#C62828] font-bold">*</span>
                  </label>
                  <select
                    id="select-new-sub-parent"
                    value={newSubParentCat}
                    onChange={(e) => {
                      setNewSubParentCat(e.target.value);
                      setAddModalError(null);
                    }}
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none cursor-pointer"
                  >
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.slug || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Subcategory Name <span className="text-[#C62828] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-new-sub-name"
                    value={newSubName}
                    onChange={(e) => {
                      setNewSubName(e.target.value);
                      setAddModalError(null);
                    }}
                    placeholder="e.g., MRI Scanners"
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {addModalType === "equipment-type" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Primary Category <span className="text-[#C62828] font-bold">*</span>
                  </label>
                  <select
                    id="select-new-eq-parent"
                    value={newEqParentCat}
                    onChange={(e) => {
                      setNewEqParentCat(e.target.value);
                      setAddModalError(null);
                    }}
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none cursor-pointer"
                  >
                    {allCategories.map((c) => (
                      <option key={c.id} value={c.slug || c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Subcategory <span className="text-[#C62828] font-bold">*</span>
                  </label>
                  <select
                    id="select-new-eq-subcat"
                    value={newEqSubcat}
                    disabled={modalSubcategories.length === 0}
                    onChange={(e) => {
                      setNewEqSubcat(e.target.value);
                      setAddModalError(null);
                    }}
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none cursor-pointer disabled:opacity-50"
                  >
                    {modalSubcategories.length === 0 && <option value="">No subcategories available</option>}
                    {modalSubcategories.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-white mb-1">
                    Equipment Type Name <span className="text-[#C62828] font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    id="input-new-eq-name"
                    value={newEqName}
                    onChange={(e) => {
                      setNewEqName(e.target.value);
                      setAddModalError(null);
                    }}
                    placeholder="e.g., 1.5T Superconducting MRI"
                    className="w-full h-11 px-3.5 py-2.5 bg-white text-[#171717] border border-white/40 rounded-xl text-xs font-medium focus:bg-[#FEFCE8] focus:border-[#EAB308] focus:ring-1 focus:ring-[#EAB308] focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/20">
              <button
                type="button"
                onClick={() => {
                  if (!isSubmittingAdd) setAddModalType(null);
                }}
                disabled={isSubmittingAdd}
                className="px-4 py-2 border border-white/50 text-white rounded-xl text-xs font-bold hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-submit-add-classification"
                disabled={isSubmittingAdd}
                onClick={() => {
                  if (addModalType === "primary") handleAddPrimaryCategory();
                  else if (addModalType === "subcategory") handleAddSubcategory();
                  else if (addModalType === "equipment-type") handleAddEquipmentType();
                }}
                className="px-5 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-bold transition-all border border-white shadow-md disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSubmittingAdd ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Plus size={13} className="stroke-[2.5]" />
                    <span>Save & Select</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminProductEditorPage;
