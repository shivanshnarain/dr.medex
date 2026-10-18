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
  Tag,
  FileText,
  Cpu,
  Activity,
  Wrench,
  Package,
  DollarSign,
  Globe,
  Settings,
  ShieldCheck,
  CheckCheck
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
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isCheckingSku, setIsCheckingSku] = useState(false);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [copiedSku, setCopiedSku] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ type: "success" | "error" | "warning"; text: string } | null>(null);

  // Active step in 8-step tracker
  const [activeStep, setActiveStep] = useState<number>(1);

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
  // STEP 1: PRODUCT PHOTOS & AI IMAGE ANALYSIS
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

  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  // AI Assistant Analysis State
  const [isAiIdentifying, setIsAiIdentifying] = useState(false);
  const [aiIdentifyPhase, setAiIdentifyPhase] = useState<
    "idle" | "reading_photos" | "identifying_equipment" | "matching_categories" | "generating_content" | "preparing_fields" | "complete"
  >("idle");
  const [aiIdentifyError, setAiIdentifyError] = useState<string | null>(null);
  const [aiIdentifyResult, setAiIdentifyResult] = useState<any | null>(null);
  const [preserveManualEdits, setPreserveManualEdits] = useState(true);
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<string>>(new Set());
  const activeAnalysisIdRef = useRef<number>(0);
  const [aiAppliedNotification, setAiAppliedNotification] = useState(false);
  const [aiPopulatedFields, setAiPopulatedFields] = useState<Set<string>>(new Set());

  // Helper to mark a field as edited by the administrator
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
  // STEP 3: PRODUCT IDENTITY AND NAMING
  // ==========================================
  const [productName, setProductName] = useState("");
  const [title, setTitle] = useState("");
  const [manufacturerModel, setManufacturerModel] = useState("");
  const [internalModelId, setInternalModelId] = useState("");
  const [sku, setSku] = useState("");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState("DR.MEDEX");
  const [namingStyle, setNamingStyle] = useState<"clinical" | "technical" | "catalog">("clinical");
  const suggestedIdentityRef = useRef<{ productName: string; title: string; brand: string; manufacturerModel: string } | null>(null);

  // ==========================================
  // STEP 4: PRODUCT DESCRIPTION
  // ==========================================
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [isRegeneratingDescription, setIsRegeneratingDescription] = useState(false);

  // ==========================================
  // STEP 5: TECHNICAL SPECIFICATIONS (4 INDEPENDENT FIELDS)
  // ==========================================
  const [powerSupply, setPowerSupply] = useState("");
  const [qualityStandards, setQualityStandards] = useState("");
  const [regulatoryStatus, setRegulatoryStatus] = useState("");
  const [warranty, setWarranty] = useState("2-Year Comprehensive Clinical Warranty");
  const [isRegeneratingSpecs, setIsRegeneratingSpecs] = useState(false);

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
  // PRICING & COMMERCIAL TERMS (ASSOCIATED WITH STEP 8)
  // ==========================================
  const [originalPrice, setOriginalPrice] = useState<number>(0); // MRP in INR
  const [basePrice, setBasePrice] = useState<number>(0); // Selling price in INR
  const [stock, setStock] = useState<number>(10);
  const [stockStatus, setStockStatus] = useState<"IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("IN_STOCK");
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);
  const [minOrderQuantity, setMinOrderQuantity] = useState<number>(1);
  const [leadTimeWeeks, setLeadTimeWeeks] = useState("1–2 Weeks");
  const [shippingInformation, setShippingInformation] = useState("Express Air Cargo Dispatch with Shockproof Wooden Crating");

  const { discountPercentage, calculatedSavings } = useMemo(() => {
    if (originalPrice > 0 && basePrice > 0 && originalPrice >= basePrice) {
      const pct = Math.round(((originalPrice - basePrice) / originalPrice) * 100);
      const savings = originalPrice - basePrice;
      return { discountPercentage: pct, calculatedSavings: savings };
    }
    return { discountPercentage: 0, calculatedSavings: 0 };
  }, [originalPrice, basePrice]);

  // ==========================================
  // PUBLICATION & SEO SETTINGS
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
          setTitle(p.title || p.storefrontProductTitle || p.productName || "");
          setManufacturerModel(p.modelNumber || "");
          setInternalModelId(p.internalModelId || `DM-${p.sku || p.id}`);
          setSku(p.sku || p.SKU || "");
          setSlug(p.slug || "");
          setBrand(p.brand || "DR.MEDEX");
          if (p.namingStyle) setNamingStyle(p.namingStyle);

          suggestedIdentityRef.current = {
            productName: p.productName || p.title || "",
            title: p.storefrontProductTitle || p.title || p.productName || "",
            brand: p.brand || "DR.MEDEX",
            manufacturerModel: p.modelNumber || ""
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

          // Prices in INR
          setOriginalPrice(p.originalPrice || p.regularPrice || p.basePrice || 0);
          setBasePrice(p.basePrice || p.salePrice || 0);
          const pStock = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 10);
          setStock(pStock);
          setLowStockThreshold(p.lowStockThreshold || 3);
          setStockStatus(p.stockStatus || (pStock > 0 ? (pStock <= 5 ? "LOW_STOCK" : "IN_STOCK") : "OUT_OF_STOCK"));
          setMinOrderQuantity(p.moq || 1);
          setLeadTimeWeeks(p.leadTimeWeeks || "1–2 Weeks");
          if (p.shippingInformation) setShippingInformation(p.shippingInformation);

          // Photos
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
          setMetaTitle(p.metaTitle || p.title || "");
          setMetaDescription(p.metaDescription || p.shortDescription || "");
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

  // Generate unique SKU
  const fetchNewSku = async (catSlug: string) => {
    try {
      const res = await adminFetch(`/api/admin/products/generate-sku?category=${catSlug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.sku) {
          setSku(data.sku);
        }
      }
    } catch (err) {
      console.error("Failed to fetch new SKU:", err);
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
    if (!category || (!productName && !title && !equipmentType)) {
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
            title: title || productName,
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
  }, [category, subcategory, equipmentType, manufacturerModel, title, productName, productId]);

  // Helper to convert slots into payload for AI analysis
  const preparePhotosPayload = async (slotsToProcess: ProductImageSlot[]) => {
    const photosPayload: Array<{ data: string; mimeType: string; filename: string }> = [];
    for (let idx = 0; idx < slotsToProcess.length; idx++) {
      const slot = slotsToProcess[idx];
      if (slot.status === "persisted" && slot.url && !slot.url.startsWith("blob:") && !slot.url.startsWith("data:")) {
        photosPayload.push({
          data: slot.url,
          mimeType: slot.url.endsWith(".png") ? "image/png" : slot.url.endsWith(".webp") ? "image/webp" : "image/jpeg",
          filename: `photo_${idx + 1}.jpg`
        });
      } else if (slot.file) {
        try {
          const b64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(slot.file!);
          });
          photosPayload.push({
            data: b64,
            mimeType: slot.file.type || "image/jpeg",
            filename: slot.file.name || `photo_${idx + 1}.jpg`
          });
        } catch {}
      } else if (slot.url && slot.url.startsWith("data:")) {
        photosPayload.push({
          data: slot.url,
          mimeType: slot.url.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/)?.[1] || "image/jpeg",
          filename: `photo_${idx + 1}.jpg`
        });
      }
    }
    return photosPayload;
  };

  // ============================================================
  // ONE COORDINATED AI IDENTIFICATION WORKFLOW (STEPS 1 TO 8)
  // ============================================================
  const applyAiResultsToForm = (result: any) => {
    if (!result) return;
    const populated = new Set<string>();

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
      if (!preserveManualEdits || !manuallyEditedFields.has("category")) {
        setCategory(targetCatKey);
        populated.add("category");
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
          if (!preserveManualEdits || !manuallyEditedFields.has("subcategory")) {
            setSubcategory(targetSubId);
            populated.add("subcategory");
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

            if (targetEqName && (!preserveManualEdits || !manuallyEditedFields.has("equipmentType"))) {
              setEquipmentType(targetEqName);
              populated.add("equipmentType");
            }
          }
        }
      }
    }

    // Step 3: Product Identity
    const pName = result.productName || "";
    const sTitle = result.storefrontProductTitle || result.title || pName;
    const brnd = result.brand || "DR.MEDEX";
    const mModel = result.manufacturerModel || "";

    suggestedIdentityRef.current = {
      productName: pName,
      title: sTitle,
      brand: brnd,
      manufacturerModel: mModel
    };

    if (!preserveManualEdits || !manuallyEditedFields.has("productName")) {
      if (pName) {
        setProductName(pName);
        populated.add("productName");
      }
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("title")) {
      if (sTitle) {
        setTitle(sTitle);
        populated.add("title");
      }
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("brand")) {
      if (brnd) {
        setBrand(brnd);
        populated.add("brand");
      }
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("manufacturerModel")) {
      if (mModel) {
        setManufacturerModel(mModel);
        populated.add("manufacturerModel");
      }
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("internalModelId")) {
      if (result.internalModelId) {
        setInternalModelId(result.internalModelId);
      } else if (mModel) {
        setInternalModelId(mModel);
      } else if (pName) {
        const cleanSlug = pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        setInternalModelId(`DM-${cleanSlug.slice(0, 10).toUpperCase()}`);
      }
      populated.add("internalModelId");
    }
    if (!isEditMode && (!sku || !manuallyEditedFields.has("sku"))) {
      if (result.skuSuggestion) {
        setSku(result.skuSuggestion);
      } else {
        fetchNewSku(targetCatKey || category);
      }
      populated.add("sku");
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("slug")) {
      if (pName) {
        setSlug(pName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
        populated.add("slug");
      }
    }

    // Step 4: Description (PURE main description ONLY)
    const mainDesc = result.description || result.clinicalOverview || "";
    if (mainDesc && (!preserveManualEdits || !manuallyEditedFields.has("description"))) {
      setDescription(mainDesc);
      setFullDescription(mainDesc);
      setShortDescription(mainDesc.slice(0, 180));
      populated.add("description");
    }

    // Step 5: Technical Specifications (4 independent fields)
    if (result.powerSupply && (!preserveManualEdits || !manuallyEditedFields.has("powerSupply"))) {
      setPowerSupply(result.powerSupply);
      populated.add("powerSupply");
    }
    if (result.qualityStandards && (!preserveManualEdits || !manuallyEditedFields.has("qualityStandards"))) {
      setQualityStandards(result.qualityStandards);
      populated.add("qualityStandards");
    }
    if (result.regulatoryStatus && (!preserveManualEdits || !manuallyEditedFields.has("regulatoryStatus"))) {
      setRegulatoryStatus(result.regulatoryStatus);
      setRegulatoryClass(result.regulatoryStatus);
      populated.add("regulatoryStatus");
    }
    if (result.warranty && (!preserveManualEdits || !manuallyEditedFields.has("warranty"))) {
      setWarranty(result.warranty);
      populated.add("warranty");
    }

    // Step 6: Clinical Indications
    const rawIndications = Array.isArray(result.clinicalIndications) && result.clinicalIndications.length > 0
      ? result.clinicalIndications
      : (Array.isArray(result.intendedUses) ? result.intendedUses : []);
    if (rawIndications.length > 0 && (!preserveManualEdits || !manuallyEditedFields.has("clinicalIndications"))) {
      setClinicalIndications(rawIndications);
      populated.add("clinicalIndications");
    }

    // Step 7: Key Factors & Engineering Highlights
    const rawHighlights = Array.isArray(result.engineeringHighlights) && result.engineeringHighlights.length > 0
      ? result.engineeringHighlights
      : (Array.isArray(result.keyFeatures) ? result.keyFeatures : []);
    if (rawHighlights.length > 0 && (!preserveManualEdits || !manuallyEditedFields.has("engineeringHighlights"))) {
      setEngineeringHighlights(rawHighlights);
      populated.add("engineeringHighlights");
    }

    // Step 8: Standard Package Contents
    if (Array.isArray(result.packageItems) && result.packageItems.length > 0) {
      if (!preserveManualEdits || !manuallyEditedFields.has("packageItems")) {
        const items: PackageItem[] = result.packageItems.map((item: any, idx: number) => ({
          id: item.id || `ai-pkg-${idx}-${Date.now()}`,
          name: typeof item === "string" ? item : (item.name || item.item || ""),
          type: (item.type?.toLowerCase() === "optional" || item.type?.toLowerCase() === "confirmation")
            ? item.type.toLowerCase() as any
            : "standard"
        }));
        setPackageItems(items);
        populated.add("packageItems");
      }
    } else if (Array.isArray(result.packageContents) && result.packageContents.length > 0) {
      if (!preserveManualEdits || !manuallyEditedFields.has("packageItems")) {
        const items: PackageItem[] = result.packageContents.map((name: string, idx: number) => ({
          id: `ai-pkg-${idx}-${Date.now()}`,
          name,
          type: "standard"
        }));
        setPackageItems(items);
        populated.add("packageItems");
      }
    }

    // Inventory & Operational Defaults (Never invent selling price from photographs)
    if (!preserveManualEdits || !manuallyEditedFields.has("stock")) {
      if (!stock || stock === 0) setStock(10);
      populated.add("stock");
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("stockStatus")) {
      setStockStatus("IN_STOCK");
      populated.add("stockStatus");
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("leadTimeWeeks")) {
      if (!leadTimeWeeks) setLeadTimeWeeks("1–2 Weeks");
      populated.add("leadTimeWeeks");
    }

    // Publishing & SEO
    if (!preserveManualEdits || !manuallyEditedFields.has("metaTitle")) {
      const mTitle = result.seoTitle || result.metaTitle || sTitle;
      if (mTitle) {
        setMetaTitle(mTitle);
        populated.add("metaTitle");
      }
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("metaDescription")) {
      const mDesc = result.seoDescription || result.metaDescription || mainDesc.slice(0, 160);
      if (mDesc) {
        setMetaDescription(mDesc);
        populated.add("metaDescription");
      }
    }

    setAiPopulatedFields(populated);
  };

  const triggerAiIdentification = async () => {
    if (imageSlotsRef.current.some((s) => s.status === "uploading")) {
      setAiIdentifyPhase("reading_photos");
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
    setAiIdentifyPhase("reading_photos");

    try {
      const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 5));
      if (photosPayload.length === 0) {
        throw new Error("No readable photographs found. Please ensure at least one valid image is selected.");
      }

      if (activeAnalysisIdRef.current !== thisAnalysisId) return;
      setAiIdentifyPhase("identifying_equipment");

      const res = await adminFetch("/api/admin/products/ai-identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photosPayload,
          namingStyle,
          preliminaryBrand: brand || "DR.MEDEX"
        })
      });

      if (activeAnalysisIdRef.current !== thisAnalysisId) return;

      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.success) {
        throw new Error((data && data.message) || `AI service returned HTTP ${res.status}`);
      }

      setAiIdentifyPhase("matching_categories");
      await new Promise((r) => setTimeout(r, 100));
      if (activeAnalysisIdRef.current !== thisAnalysisId) return;

      setAiIdentifyPhase("generating_content");
      await new Promise((r) => setTimeout(r, 100));
      if (activeAnalysisIdRef.current !== thisAnalysisId) return;

      setAiIdentifyPhase("preparing_fields");
      if (activeAnalysisIdRef.current !== thisAnalysisId) return;

      setAiIdentifyResult(data.data);
      applyAiResultsToForm(data.data);
      setAiAppliedNotification(true);
      setAiIdentifyPhase("complete");
    } catch (err: any) {
      if (activeAnalysisIdRef.current === thisAnalysisId) {
        console.warn("AI identification error:", err);
        const errMsg = err?.message || "Failed to identify medical equipment.";
        if (errMsg.includes("GEMINI_API_KEY") || errMsg.includes("not configured")) {
          setAiIdentifyError("Smart Product Assistant: GEMINI_API_KEY is not configured on this server. Please ensure GEMINI_API_KEY or GOOGLE_API_KEY is configured in Vercel Environment Variables and redeployed. Your original photos are safely preserved.");
        } else if (errMsg.includes("invalid") || errMsg.includes("PERMISSION_DENIED") || errMsg.includes("credentials")) {
          setAiIdentifyError("Smart Product Assistant: Gemini API credentials are invalid or lack vision permissions. Please verify the API key. Your original photos are safely preserved.");
        } else if (errMsg.includes("rate limit") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
          setAiIdentifyError("Smart Product Assistant: Gemini API quota or rate limit exceeded. Please retry in a few moments. Your original photos are safely preserved.");
        } else if (errMsg.includes("timed out") || errMsg.includes("timeout") || errMsg.includes("DEADLINE_EXCEEDED")) {
          setAiIdentifyError("Smart Product Assistant: Request timed out while analyzing photographs. Please retry. Your original photos are safely preserved.");
        } else if (errMsg.includes("high demand") || errMsg.includes("503") || errMsg.includes("temporarily unavailable")) {
          setAiIdentifyError("Smart Product Assistant: Google Gemini AI services are temporarily experiencing high demand. Please retry in a few moments. Your original photos are safely preserved.");
        } else {
          setAiIdentifyError(`AI analysis failed: ${errMsg}. Your uploaded photos are preserved and you can continue editing manually.`);
        }
        setAiIdentifyPhase("idle");
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

  // Handling File Uploads with Instant Previews & Bounded Concurrency
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

  const retrySlotUpload = (slotId: string) => {
    const slot = imageSlots.find((s) => s.id === slotId);
    if (!slot || !slot.file) return;

    setImageSlots((curr) =>
      curr.map((s) => (s.id === slotId ? { ...s, status: "uploading" as const, errorMessage: undefined } : s))
    );
    uploadSlotFile(slotId, slot.file);
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
    activeAnalysisIdRef.current = 0;
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
    activeAnalysisIdRef.current = 0;
  };

  const handleReplaceClick = (index: number) => {
    setReplaceTargetIndex(index);
    replaceFileInputRef.current?.click();
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

  const handleAddImageUrl = () => {
    const trimmed = imageUrlInput.trim();
    if (trimmed) {
      if (imageSlots.length >= 5) {
        setUploadError("Maximum 5 photographs allowed per product.");
        return;
      }
      const newSlot: ProductImageSlot = {
        id: `url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        url: trimmed,
        status: "persisted"
      };
      setImageSlots((prev) => [...prev, newSlot]);
      setImageUrlInput("");
      setHasUnsavedChanges(true);
      activeAnalysisIdRef.current = 0;
    }
  };

  const handleSlotLoadError = (slotId: string) => {
    setImageSlots((curr) =>
      curr.map((s) => (s.id === slotId ? { ...s, hasLoadError: true } : s))
    );
  };

  // ==========================================
  // REGENERATE HANDLERS
  // ==========================================
  const handleRegenerateName = async (selectedStyle: "clinical" | "technical" | "catalog") => {
    setIsGeneratingIdentity(true);
    try {
      const currentSlots = imageSlotsRef.current;
      if (currentSlots.length > 0) {
        const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 3));
        const res = await adminFetch("/api/admin/products/ai-identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photos: photosPayload,
            namingStyle: selectedStyle,
            preliminaryBrand: brand || "DR.MEDEX"
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            if (data.data.productName) setProductName(data.data.productName);
            if (data.data.storefrontProductTitle) setTitle(data.data.storefrontProductTitle);
            setHasUnsavedChanges(true);
            return;
          }
        }
      }
      const baseModel = manufacturerModel ? ` – ${manufacturerModel}` : "";
      const baseEq = equipmentType || "Medical Equipment";
      if (selectedStyle === "technical") {
        setProductName(`${brand || "DR.MEDEX"} ${baseEq}${baseModel} Clinical Precision System`);
        setTitle(`${brand || "DR.MEDEX"} ${baseEq}${baseModel}`);
      } else if (selectedStyle === "catalog") {
        setProductName(`${brand || "DR.MEDEX"} ${baseEq}${baseModel}`);
        setTitle(`${baseEq}${baseModel}`);
      } else {
        setProductName(`${brand || "DR.MEDEX"} Advanced ${baseEq}${baseModel} Surgical Solution`);
        setTitle(`${brand || "DR.MEDEX"} ${baseEq}${baseModel}`);
      }
      setHasUnsavedChanges(true);
    } catch (err) {
      console.warn("Name regeneration error:", err);
    } finally {
      setIsGeneratingIdentity(false);
    }
  };

  const handleRestoreSuggestedName = () => {
    if (suggestedIdentityRef.current) {
      if (suggestedIdentityRef.current.productName) setProductName(suggestedIdentityRef.current.productName);
      if (suggestedIdentityRef.current.title) setTitle(suggestedIdentityRef.current.title);
      if (suggestedIdentityRef.current.brand) setBrand(suggestedIdentityRef.current.brand);
      if (suggestedIdentityRef.current.manufacturerModel) setManufacturerModel(suggestedIdentityRef.current.manufacturerModel);
      setHasUnsavedChanges(true);
    }
  };

  const handleRegenerateDescription = async () => {
    setIsRegeneratingDescription(true);
    try {
      const currentSlots = imageSlotsRef.current;
      if (currentSlots.length > 0) {
        const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 3));
        const res = await adminFetch("/api/admin/products/ai-identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photos: photosPayload,
            namingStyle,
            preliminaryBrand: brand || "DR.MEDEX"
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.description) {
            setDescription(data.data.description);
            setFullDescription(data.data.description);
            setShortDescription(data.data.description.slice(0, 180));
            setHasUnsavedChanges(true);
            return;
          }
        }
      }
      const descText = `Engineered for rigorous healthcare and surgical environments, the ${productName || title || "DR.MEDEX medical device"} integrates high-durability medical-grade construction with refined operational ergonomics. Designed to meet exacting clinical workflow demands, it provides consistent operating reliability, streamlined maintenance protocols, and intuitive handling for clinical specialists.`;
      setDescription(descText);
      setFullDescription(descText);
      setShortDescription(descText.slice(0, 180));
      setHasUnsavedChanges(true);
    } catch (err) {
      console.warn("Description regeneration error:", err);
    } finally {
      setIsRegeneratingDescription(false);
    }
  };

  const handleRegenerateIndications = async () => {
    setIsRegeneratingIndications(true);
    try {
      const currentSlots = imageSlotsRef.current;
      if (currentSlots.length > 0) {
        const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 3));
        const res = await adminFetch("/api/admin/products/ai-identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: photosPayload })
        });
        if (res.ok) {
          const data = await res.json();
          const indications = data.data?.clinicalIndications;
          if (Array.isArray(indications) && indications.length > 0) {
            setClinicalIndications(indications);
            setHasUnsavedChanges(true);
            return;
          }
        }
      }
      const defaultList = [
        "Hospital Operating Theatres & Minor Surgical Suites",
        "Specialised Outpatient Procedure Rooms",
        "Critical Care & Trauma Resuscitation Units"
      ];
      setClinicalIndications(defaultList);
      setHasUnsavedChanges(true);
    } catch (err) {
      console.warn("Indications regeneration error:", err);
    } finally {
      setIsRegeneratingIndications(false);
    }
  };

  const handleRegenerateHighlights = async () => {
    setIsRegeneratingHighlights(true);
    try {
      const currentSlots = imageSlotsRef.current;
      if (currentSlots.length > 0) {
        const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 3));
        const res = await adminFetch("/api/admin/products/ai-identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: photosPayload })
        });
        if (res.ok) {
          const data = await res.json();
          const highlights = data.data?.engineeringHighlights;
          if (Array.isArray(highlights) && highlights.length > 0) {
            setEngineeringHighlights(highlights);
            setHasUnsavedChanges(true);
            return;
          }
        }
      }
      const defaultList = [
        "Precision-engineered articulating suspension with smooth balanced counterbalance",
        "Hospital-grade antimicrobial surface coating resistant to standard hospital disinfectants",
        "Low heat dissipation architecture for enhanced practitioner comfort during extended procedures"
      ];
      setEngineeringHighlights(defaultList);
      setHasUnsavedChanges(true);
    } catch (err) {
      console.warn("Highlights regeneration error:", err);
    } finally {
      setIsRegeneratingHighlights(false);
    }
  };

  const handleRegeneratePackage = async () => {
    setIsRegeneratingPackage(true);
    try {
      const currentSlots = imageSlotsRef.current;
      if (currentSlots.length > 0) {
        const photosPayload = await preparePhotosPayload(currentSlots.slice(0, 3));
        const res = await adminFetch("/api/admin/products/ai-identify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photos: photosPayload })
        });
        if (res.ok) {
          const data = await res.json();
          const items = data.data?.packageItems;
          if (Array.isArray(items) && items.length > 0) {
            setPackageItems(items.map((it: any, idx: number) => ({
              id: it.id || `pkg-${idx}-${Date.now()}`,
              name: typeof it === "string" ? it : (it.name || it.item || ""),
              type: (it.type?.toLowerCase() === "optional" || it.type?.toLowerCase() === "confirmation")
                ? it.type.toLowerCase() as any
                : "standard"
            })));
            setHasUnsavedChanges(true);
            return;
          }
        }
      }
      const defaultItems: PackageItem[] = [
        { id: "1", name: `${productName || "Core Medical Unit"} Main Body Assembly`, type: "standard" },
        { id: "2", name: "Standard Mounting Hardware & Anchor Kit", type: "standard" },
        { id: "3", name: "Comprehensive Clinical Operation Manual", type: "standard" },
        { id: "4", name: "Extended Auxiliary Cable Harness", type: "optional" }
      ];
      setPackageItems(defaultItems);
      setHasUnsavedChanges(true);
    } catch (err) {
      console.warn("Package regeneration error:", err);
    } finally {
      setIsRegeneratingPackage(false);
    }
  };

  // Package Item Management Controls
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
  // EIGHT-STEP PROGRESS VALIDATION
  // ==========================================
  const stepStatus = useMemo(() => {
    const isStep1Done = Boolean(images.length > 0);
    const isStep2Done = Boolean(category && subcategory && equipmentType);
    const isStep3Done = Boolean((productName.trim() || title.trim()) && sku.trim());
    const isStep4Done = Boolean(description.trim() || fullDescription.trim());
    const isStep5Done = Boolean(powerSupply.trim() || qualityStandards.trim() || regulatoryStatus.trim() || warranty.trim());
    const isStep6Done = Boolean(clinicalIndications.length > 0);
    const isStep7Done = Boolean(engineeringHighlights.length > 0);
    const isStep8Done = Boolean(packageItems.length > 0);

    return [
      { id: 1, name: "Photos & AI", isDone: isStep1Done, anchor: "card-step-1" },
      { id: 2, name: "Classification", isDone: isStep2Done, anchor: "card-step-2" },
      { id: 3, name: "Identity & Naming", isDone: isStep3Done, anchor: "card-step-3" },
      { id: 4, name: "Description", isDone: isStep4Done, anchor: "card-step-4" },
      { id: 5, name: "Specifications", isDone: isStep5Done, anchor: "card-step-5" },
      { id: 6, name: "Indications", isDone: isStep6Done, anchor: "card-step-6" },
      { id: 7, name: "Highlights", isDone: isStep7Done, anchor: "card-step-7" },
      { id: 8, name: "Package Contents", isDone: isStep8Done, anchor: "card-step-8" }
    ];
  }, [
    images.length,
    category,
    subcategory,
    equipmentType,
    productName,
    title,
    sku,
    description,
    fullDescription,
    powerSupply,
    qualityStandards,
    regulatoryStatus,
    warranty,
    clinicalIndications.length,
    engineeringHighlights.length,
    packageItems.length
  ]);

  const scrollToAnchor = (anchor: string, stepId: number) => {
    setActiveStep(stepId);
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

    if (!productName.trim() && !title.trim()) {
      setStatusBanner({ type: "error", text: "Product Name or Title is required." });
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
      title: (title || productName).trim(),
      storefrontProductTitle: (title || productName).trim(),
      category,
      subcategory,
      equipmentType,
      modelNumber: manufacturerModel.trim() || undefined,
      internalModelId: internalModelId.trim() || undefined,
      sku: sku.trim(),
      slug: (slug || title || productName).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      brand: brand.trim(),
      namingStyle,

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

      // Pricing & Inventory
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

      // Publishing & Status
      status,
      featured: isFeatured,
      isFeatured,
      bestseller: isBestSeller,
      isBestSeller,
      categoryGridVisible,
      metaTitle: metaTitle.trim() || (title || productName).trim(),
      metaDescription: metaDescription.trim() || mainDescription.slice(0, 160).trim(),

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
              ? `Product "${payload.productName || payload.title}" updated successfully.`
              : `Product "${payload.productName || payload.title}" created successfully.`
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
      title={isEditMode ? `Edit: ${productName || title || "Medical Equipment"}` : "Add New Medical Equipment"}
      subtitle={
        isEditMode
          ? "Modify clinical specifications, pricing, imagery, and regulatory standards."
          : "Enterprise 8-step medical equipment registration with Gemini AI auto-population."
      }
    >
      {/* Top action bar */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/admin/products"
          className="inline-flex items-center gap-2 text-xs font-bold text-neutral-600 hover:text-black transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Products Catalogue</span>
        </Link>

        <div className="flex items-center gap-3">
          {isEditMode && slug && (
            <a
              href={`/products/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#E5E5E5] rounded-lg text-xs font-bold text-neutral-700 bg-white hover:bg-[#F5F5F5] transition-colors"
            >
              <Eye size={13} />
              <span>View on Storefront</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleSaveProduct}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            <span>{isSaving ? "Saving..." : isEditMode ? "Save Changes" : "Save Product"}</span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusBanner && (
        <div
          className={`mb-6 p-4 rounded-xl border flex items-start justify-between gap-3 ${
            statusBanner.type === "error"
              ? "bg-red-50 border-[#D92D32] text-[#D92D32]"
              : statusBanner.type === "warning"
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : "bg-emerald-50 border-emerald-300 text-[#16803D]"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <p className="text-xs font-semibold leading-relaxed">{statusBanner.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Duplicate Product Detection Banner */}
      {duplicateInfo.isDuplicate && duplicateInfo.duplicateProduct && (
        <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50/80 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-900">
                Potential Duplicate Product Detected in Category
              </h4>
              <p className="text-xs text-neutral-600 mt-0.5">
                Existing item: <strong className="text-black">{duplicateInfo.duplicateProduct.title}</strong> (SKU: {duplicateInfo.duplicateProduct.sku})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`/admin/products/${duplicateInfo.duplicateProduct.id}/edit`}
              className="px-3 py-1.5 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <ExternalLink size={13} />
              <span>Open Existing</span>
            </Link>
            <label className="flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={allowDuplicateOverride}
                onChange={(e) => setAllowDuplicateOverride(e.target.checked)}
                className="w-4 h-4 rounded border-[#E5E5E5] text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
              />
              <span>Allow intentional variant</span>
            </label>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* COMPACT HORIZONTAL EIGHT-STEP PROGRESS TRACKER               */}
      {/* ============================================================ */}
      <div className="mb-8 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs">
        <div className="flex items-center justify-between overflow-x-auto pb-1 scrollbar-none gap-4">
          {stepStatus.map((step, idx) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => scrollToAnchor(step.anchor, step.id)}
                className={`flex items-center gap-2.5 text-left shrink-0 transition-all cursor-pointer group ${
                  isActive ? "opacity-100" : "opacity-75 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.isDone
                      ? "bg-[#16803D] text-white"
                      : isActive
                      ? "bg-[#F2C230] text-[#171717] ring-2 ring-[#F2C230]/40"
                      : "border border-[#E5E7EB] text-neutral-400 bg-white"
                  }`}
                >
                  {step.isDone ? <Check size={14} strokeWidth={3} /> : step.id}
                </div>

                <div className="flex flex-col">
                  <span
                    className={`text-xs font-bold transition-colors ${
                      isActive ? "text-[#171717]" : "text-neutral-600 group-hover:text-black"
                    }`}
                  >
                    {step.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    {step.isDone ? "Completed" : isActive ? "Current" : `Step ${step.id}`}
                  </span>
                </div>

                {idx < stepStatus.length - 1 && (
                  <div className="hidden xl:block w-4 h-px bg-[#E5E7EB] ml-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 8-STEP ENTERPRISE FORM WORKSPACE                             */}
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
        {/* STEP 1: PRODUCT PHOTOS & AI IMAGE ANALYSIS (FULL WIDTH)       */}
        {/* ============================================================ */}
        <div id="card-step-1" className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5 shadow-2xs">
          <div className="border-b border-[#E5E7EB] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Step 1 • Full Width
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-neutral-600 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
                  Photos & AI Vision
                </span>
              </div>
              <h3 className="text-base font-bold text-[#171717] mt-1.5">
                Product Photos & AI Image Analysis
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Upload 1 to 5 device photographs (overall machine, front/back, control panel, nameplate, labels, accessories).
              </p>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-[#F2C230] bg-[#F2C230]/10"
                : imageSlots.length >= 5
                ? "border-neutral-200 bg-neutral-50/60 opacity-70 cursor-not-allowed"
                : "border-neutral-300 bg-[#F8F9FA] hover:bg-yellow-50/20 hover:border-[#F2C230]"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-xs mx-auto flex items-center justify-center text-neutral-700 mb-2 border border-[#E5E7EB]">
              <Upload size={20} className="text-[#171717]" />
            </div>
            <h4 className="text-xs font-bold text-[#171717]">
              {imageSlots.length >= 5
                ? "Maximum 5 device photographs loaded"
                : "Drag & drop product photographs here, or click to browse files"}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              Supports 1 to 5 photographs (JPEG, PNG, WebP up to 10MB each).
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono bg-white border border-[#E5E7EB] text-neutral-700">
              <Camera size={12} />
              <span>{imageSlots.length} of 5 photographs selected</span>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploadingImage && uploadProgress && (
            <div className="p-3 bg-neutral-50 rounded-xl border border-[#E5E7EB] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#171717]">
                <span>Uploading device photographs to media store...</span>
                <span>{uploadProgress.current} / {uploadProgress.total}</span>
              </div>
              <div className="w-full bg-[#E5E7EB] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#16803D] h-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload / Validation Errors */}
          {uploadError && (
            <div className="p-3 bg-red-50 text-[#D92D32] rounded-xl border border-[#D92D32] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-xs font-bold hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Selected Product Images Grid (Thumbnails directly inside image section) */}
          {imageSlots.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#171717]">
                <span>Loaded Photographs ({imageSlots.length} of 5)</span>
                <span className="text-[11px] text-neutral-400 font-normal">
                  Reorder or set primary image for storefront card
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                {imageSlots.map((slot, idx) => {
                  const isPrimary = idx === primaryImageIndex;
                  return (
                    <div
                      key={slot.id || idx}
                      className={`relative rounded-xl border p-2 bg-white flex flex-col items-center group transition-all ${
                        slot.status === "failed"
                          ? "border-red-300 bg-red-50/20"
                          : isPrimary
                          ? "border-[#F2C230] ring-2 ring-[#F2C230]/50"
                          : "border-[#E5E7EB]"
                      }`}
                    >
                      {/* Image Preview Box preserving aspect ratio */}
                      <div className="w-full aspect-square rounded-lg bg-[#F8F9FA] overflow-hidden flex items-center justify-center mb-2 relative">
                        {slot.hasLoadError ? (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-neutral-100">
                            <ImageOff size={22} className="text-neutral-400 mb-1" />
                            <span className="text-[10px] font-semibold text-neutral-600">Failed to render image</span>
                            <span className="text-[9px] font-mono text-neutral-400 truncate max-w-full px-1">
                              {slot.url.split("/").pop() || "broken asset"}
                            </span>
                          </div>
                        ) : (
                          <img
                            src={slot.previewUrl || slot.url}
                            alt={`Device view ${idx + 1}`}
                            className="w-full h-full object-contain"
                            onError={() => handleSlotLoadError(slot.id)}
                          />
                        )}

                        {/* Uploading Overlay */}
                        {slot.status === "uploading" && (
                          <div className="absolute inset-0 bg-white/85 backdrop-blur-2xs flex flex-col items-center justify-center p-2 text-center">
                            <RefreshCw size={20} className="animate-spin text-[#16803D] mb-1" />
                            <span className="text-[10px] font-bold text-neutral-700">Uploading...</span>
                          </div>
                        )}
                      </div>

                      {/* Primary Badge */}
                      {isPrimary && (
                        <span className="absolute top-3 left-3 bg-[#F2C230] text-black text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs">
                          PRIMARY
                        </span>
                      )}

                      <span className="absolute top-3 right-3 bg-black/60 text-white text-[9px] font-mono px-1 rounded">
                        #{idx + 1}
                      </span>

                      {/* Failure message & retry button */}
                      {slot.status === "failed" && (
                        <div className="w-full mb-1.5 p-1 bg-red-100 text-red-800 rounded text-[9px] text-center">
                          <p className="truncate font-medium">{slot.errorMessage || "Upload failed"}</p>
                          {slot.file && (
                            <button
                              type="button"
                              onClick={() => retrySlotUpload(slot.id)}
                              className="mt-1 px-2 py-0.5 bg-[#D92D32] text-white rounded text-[9px] font-bold hover:bg-[#b82226] cursor-pointer"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      )}

                      {/* Controls Row */}
                      <div className="w-full flex items-center justify-between text-xs pt-1 border-t border-[#E5E7EB]">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveImage(idx, "left")}
                            disabled={idx === 0 || slot.status === "uploading"}
                            title="Move left"
                            className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                          >
                            <MoveLeft size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(idx, "right")}
                            disabled={idx === imageSlots.length - 1 || slot.status === "uploading"}
                            title="Move right"
                            className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                          >
                            <MoveRight size={12} />
                          </button>
                        </div>

                        {!isPrimary ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPrimaryImageIndex(idx);
                              setHasUnsavedChanges(true);
                            }}
                            disabled={slot.status === "uploading"}
                            className="text-[10px] font-bold text-neutral-600 hover:text-[#16803D] disabled:opacity-50 cursor-pointer"
                          >
                            Set Primary
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-[#16803D]">Primary</span>
                        )}

                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => handleReplaceClick(idx)}
                            disabled={slot.status === "uploading"}
                            title="Replace photo"
                            className="p-1 text-neutral-400 hover:text-neutral-700 disabled:opacity-50 cursor-pointer"
                          >
                            <RotateCcw size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            disabled={slot.status === "uploading"}
                            title="Remove photo"
                            className="p-1 text-neutral-400 hover:text-[#D92D32] disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* OPTIONAL RED-ACCENTED RUN AI ANALYSIS BUTTON (STEP 1 FOOTER) */}
          {/* ============================================================ */}
          <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-[#D92D32]" />
                  <h4 className="text-xs font-bold text-[#171717]">
                    Gemini AI Vision Assistant (Optional)
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-200/60 rounded text-neutral-600 font-bold">
                    Steps 2–8 Auto-Fill
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500">
                  Analyzes uploaded medical photos to extract structured clinical classifications, specs, indications, and package contents.
                </p>
              </div>

              <button
                type="button"
                onClick={() => triggerAiIdentification()}
                disabled={isAiIdentifying || imageSlots.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#D92D32] hover:bg-[#b82226] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer shrink-0"
              >
                {isAiIdentifying ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>
                  {isAiIdentifying ? "Analyzing Photographs..." : "Run AI Analysis (Optional)"}
                </span>
              </button>
            </div>

            {/* AI Status / Phase Tracker */}
            {isAiIdentifying && (
              <div className="p-3 bg-white rounded-xl border border-[#E5E7EB] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <RefreshCw size={13} className="animate-spin text-[#D92D32]" />
                    <span className="font-bold text-[#171717]">
                      {aiIdentifyPhase === "reading_photos" && "Phase 1: Reading uploaded device photographs..."}
                      {aiIdentifyPhase === "identifying_equipment" && "Phase 2: Identifying device architecture & clinical modality..."}
                      {aiIdentifyPhase === "matching_categories" && "Phase 3: Matching DR.MEDEX taxonomy hierarchy..."}
                      {aiIdentifyPhase === "generating_content" && "Phase 4: Synthesizing specifications, indications & highlights..."}
                      {aiIdentifyPhase === "preparing_fields" && "Phase 5: Mapping structured JSON to form fields..."}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono">
                  <div className={`p-1 text-center rounded ${aiIdentifyPhase !== "idle" ? "bg-amber-100 text-amber-900 font-bold" : "bg-neutral-100 text-neutral-400"}`}>1. Photos</div>
                  <div className={`p-1 text-center rounded ${aiIdentifyPhase === "identifying_equipment" || aiIdentifyPhase === "matching_categories" || aiIdentifyPhase === "generating_content" || aiIdentifyPhase === "preparing_fields" ? "bg-amber-100 text-amber-900 font-bold" : "bg-neutral-100 text-neutral-400"}`}>2. Vision</div>
                  <div className={`p-1 text-center rounded ${aiIdentifyPhase === "generating_content" || aiIdentifyPhase === "preparing_fields" ? "bg-amber-100 text-amber-900 font-bold" : "bg-neutral-100 text-neutral-400"}`}>3. Specs</div>
                  <div className={`p-1 text-center rounded ${aiIdentifyPhase === "preparing_fields" ? "bg-emerald-100 text-[#16803D] font-bold" : "bg-neutral-100 text-neutral-400"}`}>4. Map Form</div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {aiIdentifyError && (
              <div className="p-3 rounded-xl bg-red-50 border border-[#D92D32] text-xs text-[#D92D32] flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span className="leading-relaxed">{aiIdentifyError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAiIdentifyError(null)}
                  className="font-bold hover:underline cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* AI Results Notification Banner */}
            {aiAppliedNotification && aiIdentifyResult && (
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#16803D]" />
                    <span className="text-xs font-bold text-emerald-950">
                      AI Analysis Complete • Fields Successfully Auto-Populated across Steps 2–8
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiAppliedNotification(false)}
                    className="text-xs font-bold text-emerald-800 hover:underline cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>

                <div className="p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0 text-amber-600" />
                  <span>
                    Pricing requires manual confirmation in Commercial Terms. All generated details remain 100% editable before saving.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Direct URL input fallback */}
          <div className="pt-1 flex items-center gap-2">
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Or paste direct image URL (https://...)..."
              className="flex-1 px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs"
            />
            <button
              type="button"
              onClick={handleAddImageUrl}
              className="px-4 py-2 bg-white border border-[#E5E7EB] hover:bg-[#F8F9FA] text-[#171717] rounded-xl text-xs font-bold cursor-pointer"
            >
              Add URL
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RESPONSIVE TWO-COLUMN GRID FOR STEPS 2–8 & PRICING           */}
        {/* ============================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ========================================================== */}
          {/* STEP 2: PRODUCT CLASSIFICATION                             */}
          {/* ========================================================== */}
          <div id="card-step-2" className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Step 2
                </span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                  Product Classification
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#F8F9FA] text-neutral-600 border border-[#E5E7EB]">
                L1–L3 Hierarchy
              </span>
            </div>

            <div className="space-y-4">
              {/* Primary Category */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  Primary Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setCategory(newCat);
                    setSubcategory("");
                    setEquipmentType("");
                    markFieldEdited("category");
                    if (!isEditMode) {
                      fetchNewSku(newCat);
                    }
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-medium text-[#171717] focus:outline-none focus:border-[#F2C230] cursor-pointer"
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
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  Subcategory <span className="text-rose-500">*</span>
                </label>
                <select
                  value={subcategory}
                  disabled={!category || availableSubcategories.length === 0}
                  onChange={(e) => {
                    const newSub = e.target.value;
                    setSubcategory(newSub);
                    setEquipmentType("");
                    markFieldEdited("subcategory");
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-medium text-[#171717] focus:outline-none focus:border-[#F2C230] disabled:opacity-50 disabled:bg-[#F8F9FA] cursor-pointer"
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
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  Verified Equipment Type <span className="text-rose-500">*</span>
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
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-medium text-[#171717] focus:outline-none focus:border-[#F2C230] disabled:opacity-50 disabled:bg-[#F8F9FA] cursor-pointer"
                >
                  <option value="">— Select Equipment Type —</option>
                  {availableEquipmentTypes.map((eq: any) => (
                    <option key={eq.id} value={eq.name}>
                      {eq.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1.5">
                  Filtered based on verified DR.MEDEX catalogue taxonomy.
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 3: PRODUCT IDENTITY AND NAMING                        */}
          {/* ========================================================== */}
          <div id="card-step-3" className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E7EB] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Step 3
                </span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                  Product Identity & Naming
                </h3>
              </div>

              {/* Action Controls: Restore & Regenerate */}
              <div className="flex items-center gap-2">
                {suggestedIdentityRef.current && (
                  <button
                    type="button"
                    onClick={handleRestoreSuggestedName}
                    title="Restore original AI suggested name"
                    className="flex items-center gap-1 px-2.5 py-1 border border-[#E5E7EB] bg-white hover:bg-[#F8F9FA] text-[#171717] rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    <span>Restore</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRegenerateName(namingStyle)}
                  disabled={isGeneratingIdentity}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#D92D32] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isGeneratingIdentity ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span>Regenerate Name</span>
                </button>
              </div>
            </div>

            {/* Choose Naming Style Selector */}
            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#E5E7EB] space-y-1.5">
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wide">
                Choose Naming Style:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "clinical", label: "Professional / Clinical" },
                  { id: "technical", label: "Technical / Model" },
                  { id: "catalog", label: "Short / Catalog" }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setNamingStyle(s.id as any);
                      handleRegenerateName(s.id as any);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      namingStyle === s.id
                        ? "bg-[#171717] text-white shadow-xs"
                        : "bg-white border border-[#E5E7EB] text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3.5">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value);
                    markFieldEdited("productName");
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. DR.MEDEX Ceiling-Mounted Double Dome LED OT Light – LED 80"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              {/* Storefront Product Title */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  Storefront Product Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    markFieldEdited("title");
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="e.g. DR.MEDEX Double Dome Surgical OT Light"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              {/* Brand & Model */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => {
                      setBrand(e.target.value);
                      markFieldEdited("brand");
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Manufacturer Model</label>
                  <input
                    type="text"
                    value={manufacturerModel}
                    onChange={(e) => {
                      setManufacturerModel(e.target.value);
                      markFieldEdited("manufacturerModel");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. LED-80 or Std Unit"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
              </div>

              {/* SKU & Internal ID */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Internal Identifier</label>
                  <input
                    type="text"
                    value={internalModelId}
                    onChange={(e) => {
                      setInternalModelId(e.target.value);
                      markFieldEdited("internalModelId");
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1 flex items-center justify-between">
                    <span>SKU <span className="text-rose-500">*</span></span>
                    {sku && (
                      <button
                        type="button"
                        onClick={handleCopySku}
                        className="text-[10px] text-neutral-500 hover:text-black flex items-center gap-1 cursor-pointer"
                      >
                        {copiedSku ? <Check size={10} className="text-[#16803D]" /> : <Copy size={10} />}
                        <span>{copiedSku ? "Copied" : "Copy"}</span>
                      </button>
                    )}
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
                    className={`w-full px-3.5 py-2 bg-white border rounded-xl text-xs font-mono font-bold text-[#171717] focus:outline-none ${
                      skuError ? "border-[#D92D32]" : "border-[#E5E7EB] focus:border-[#F2C230]"
                    }`}
                  />
                  {skuError && <p className="text-[10px] text-[#D92D32] mt-1 font-semibold">{skuError}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 4: PRODUCT DESCRIPTION                                */}
          {/* ========================================================== */}
          <div id="card-step-4" className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Step 4
                </span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                  Product Description
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRegenerateDescription}
                disabled={isRegeneratingDescription}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#D92D32] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isRegeneratingDescription ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>Regenerate Description</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#171717]">
                Product Description (Clinical & Operational Overview) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={8}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setFullDescription(e.target.value);
                  markFieldEdited("description");
                  setHasUnsavedChanges(true);
                }}
                placeholder="Enter pure product description explaining purpose, medical engineering, intended applications, and benefits..."
                className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#F2C230] leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                <span>Clinical summary only (do not append specs or package lists here).</span>
                <span>{description.length} chars • {description.trim().split(/\s+/).filter(Boolean).length} words</span>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 5: TECHNICAL SPECIFICATIONS (4 INDEPENDENT FIELDS)    */}
          {/* ========================================================== */}
          <div id="card-step-5" className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Step 5
                </span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                  Technical Specifications
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#F8F9FA] text-neutral-600 border border-[#E5E7EB]">
                4 Core Cards
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
              <ShieldCheck size={14} className="shrink-0 text-amber-600" />
              <span>
                Anti-Fabrication Rule: Unverified parameters remain blank or "Not specified".
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Field 1: Power Supply */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
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
                  placeholder="e.g. 220–240 V AC, 50/60 Hz, 80 VA (or Not specified)"
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              {/* Field 2: Quality Standards */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
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
                  placeholder="e.g. ISO 13485:2016 Certified Facility (or Not specified)"
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              {/* Field 3: Regulatory Status */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
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
                  placeholder="e.g. CE Marking (EU MDR 2017/745) / CDSCO (or Not specified)"
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              {/* Field 4: Warranty */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
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
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                />
              </div>
            </div>

            {/* Optional Detailed Specs Table Toggle */}
            <div className="pt-2 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setShowDetailedSpecsTable(!showDetailedSpecsTable)}
                className="text-xs font-bold text-neutral-600 hover:text-black flex items-center gap-1.5 cursor-pointer"
              >
                <span>{showDetailedSpecsTable ? "Hide" : "Show"} Additional Technical Table ({specList.length})</span>
              </button>

              {showDetailedSpecsTable && (
                <div className="mt-3 space-y-3 pt-2">
                  <div className="grid grid-cols-12 gap-2">
                    <input
                      type="text"
                      placeholder="Parameter (e.g. Lux Rating)"
                      value={newSpecKey}
                      onChange={(e) => setNewSpecKey(e.target.value)}
                      className="col-span-5 px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Value (e.g. 160,000)"
                      value={newSpecVal}
                      onChange={(e) => setNewSpecVal(e.target.value)}
                      className="col-span-4 px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Unit"
                      value={newSpecUnit}
                      onChange={(e) => setNewSpecUnit(e.target.value)}
                      className="col-span-2 px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newSpecKey.trim()) {
                          setSpecList([...specList, { key: newSpecKey.trim(), value: newSpecVal.trim(), unit: newSpecUnit.trim() }]);
                          setNewSpecKey("");
                          setNewSpecVal("");
                          setNewSpecUnit("");
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className="col-span-1 bg-[#171717] hover:bg-black text-white rounded-lg flex items-center justify-center cursor-pointer"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {specList.map((s, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-[#F8F9FA] p-1.5 rounded-lg border border-[#E5E7EB]">
                        <span className="font-bold text-neutral-800">{s.key}:</span>
                        <span className="text-neutral-600">{s.value} {s.unit}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSpecList(specList.filter((_, idx) => idx !== i));
                            setHasUnsavedChanges(true);
                          }}
                          className="text-neutral-400 hover:text-[#D92D32]"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 6: CLINICAL INDICATIONS & SPECIALTY PROCEDURES        */}
          {/* ========================================================== */}
          <div id="card-step-6" className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Step 6
                </span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                  Clinical Indications
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRegenerateIndications}
                disabled={isRegeneratingIndications}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#D92D32] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isRegeneratingIndications ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>Regenerate</span>
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Intended clinical departments, surgical workflows, and validated medical procedures.
            </p>

            <div className="flex gap-2">
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
                placeholder="Add clinical indication (e.g. Laparoscopic Surgery)..."
                className="flex-1 px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717]"
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
                className="px-4 py-2 bg-[#171717] hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Add
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {clinicalIndications.length === 0 ? (
                <div className="p-3 text-center text-xs text-neutral-400 bg-[#F8F9FA] rounded-xl border border-dashed border-[#E5E7EB]">
                  No clinical indications specified yet. Use AI Analysis or add manually above.
                </div>
              ) : (
                clinicalIndications.map((ind, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-[#F8F9FA] p-2.5 rounded-xl border border-[#E5E7EB]">
                    <span className="flex-1 pr-2 text-neutral-800 font-medium">
                      • {ind}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setClinicalIndications(clinicalIndications.filter((_, idx) => idx !== i));
                        markFieldEdited("clinicalIndications");
                        setHasUnsavedChanges(true);
                      }}
                      className="text-neutral-400 hover:text-[#D92D32] cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 7: KEY FACTORS & ENGINEERING HIGHLIGHTS               */}
          {/* ========================================================== */}
          <div id="card-step-7" className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Step 7
                </span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                  Key Factors & Highlights
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRegenerateHighlights}
                disabled={isRegeneratingHighlights}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#D92D32] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isRegeneratingHighlights ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>Regenerate</span>
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Product-specific engineering, ergonomics, mechanical design, and safety highlights.
            </p>

            <div className="flex gap-2">
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
                className="flex-1 px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717]"
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
                className="px-4 py-2 bg-[#171717] hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Add
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {engineeringHighlights.length === 0 ? (
                <div className="p-3 text-center text-xs text-neutral-400 bg-[#F8F9FA] rounded-xl border border-dashed border-[#E5E7EB]">
                  No engineering highlights added yet. Use AI Analysis or add manually above.
                </div>
              ) : (
                engineeringHighlights.map((hl, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-[#F8F9FA] p-2.5 rounded-xl border border-[#E5E7EB]">
                    <span className="flex-1 pr-2 text-neutral-800 font-medium">
                      • {hl}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEngineeringHighlights(engineeringHighlights.filter((_, idx) => idx !== i));
                        markFieldEdited("engineeringHighlights");
                        setHasUnsavedChanges(true);
                      }}
                      className="text-neutral-400 hover:text-[#D92D32] cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 8: STANDARD INCLUDED PACKAGE CONTENTS                 */}
          {/* ========================================================== */}
          <div id="card-step-8" className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Step 8
                </span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                  Standard Included Package Contents
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRegeneratePackage}
                disabled={isRegeneratingPackage}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#D92D32] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isRegeneratingPackage ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>Regenerate</span>
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Verified components, modules, cables, and hardware included in the shipment.
            </p>

            {/* Add Item Row with Type */}
            <div className="grid grid-cols-12 gap-2">
              <input
                type="text"
                value={newPackageItemName}
                onChange={(e) => setNewPackageItemName(e.target.value)}
                placeholder="Component name (e.g. Autoclavable Handle)..."
                className="col-span-7 px-3 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717]"
              />
              <select
                value={newPackageItemType}
                onChange={(e) => setNewPackageItemType(e.target.value as any)}
                className="col-span-3 px-2 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717]"
              >
                <option value="standard">Standard</option>
                <option value="optional">Optional</option>
                <option value="confirmation">To Confirm</option>
              </select>
              <button
                type="button"
                onClick={addPackageItem}
                className="col-span-2 bg-[#171717] hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* List with Reordering Controls */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {packageItems.length === 0 ? (
                <div className="p-3 text-center text-xs text-neutral-400 bg-[#F8F9FA] rounded-xl border border-dashed border-[#E5E7EB]">
                  No package components added yet.
                </div>
              ) : (
                packageItems.map((item, i) => (
                  <div key={item.id || i} className="flex items-center justify-between text-xs bg-[#F8F9FA] p-2.5 rounded-xl border border-[#E5E7EB]">
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
                        className="p-1 text-neutral-400 hover:text-[#D92D32] cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* ========================================================== */}
          {/* COMMERCIAL TERMS & PRICING CARD                            */}
          {/* ========================================================== */}
          <div id="card-pricing" className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Commercial Terms
                </span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                  Pricing & Inventory
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#F8F9FA] text-neutral-600 border border-[#E5E7EB]">
                Base: ₹ INR
              </span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Original MRP (₹ INR) <span className="text-rose-500">*</span>
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Selling Price (₹ INR) <span className="text-rose-500">*</span>
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono font-bold text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
              </div>

              {/* Automatic Calculated Discount Card */}
              <div className="p-3 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 block uppercase font-mono">
                    Calculated Discount:
                  </span>
                  <span className="text-xs font-bold text-neutral-800">
                    {discountPercentage > 0 ? `${discountPercentage}% OFF` : "No discount applied"}
                  </span>
                </div>
                {calculatedSavings > 0 && (
                  <span className="text-xs font-bold text-[#16803D] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Saves ₹{calculatedSavings.toLocaleString("en-IN")}
                  </span>
                )}
              </div>

              {/* Live International FX Currency Preview */}
              <div className="p-3 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-neutral-700 flex items-center gap-1.5">
                    <Globe size={13} />
                    <span>Live International FX Conversion</span>
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {rateTimestamp ? new Date(rateTimestamp).toLocaleTimeString() : "Live FX"}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
                    <span className="text-[10px] text-neutral-400 block font-mono">USD</span>
                    <span className="text-xs font-bold text-[#171717]">
                      ${(basePrice * (exchangeRates.USD || 0.010379)).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
                    <span className="text-[10px] text-neutral-400 block font-mono">EUR</span>
                    <span className="text-xs font-bold text-[#171717]">
                      €{(basePrice * (exchangeRates.EUR || 0.009228)).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
                    <span className="text-[10px] text-neutral-400 block font-mono">GBP</span>
                    <span className="text-xs font-bold text-[#171717]">
                      £{(basePrice * (exchangeRates.GBP || 0.007854)).toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-[#E5E7EB]">
                    <span className="text-[10px] text-neutral-400 block font-mono">AED</span>
                    <span className="text-xs font-bold text-[#171717]">
                      {(basePrice * (exchangeRates.AED || 0.038116)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stock Quantity & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => {
                      setStock(parseInt(e.target.value) || 0);
                      markFieldEdited("stock");
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono text-[#171717]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Stock Status</label>
                  <select
                    value={stockStatus}
                    onChange={(e) => {
                      setStockStatus(e.target.value as any);
                      markFieldEdited("stockStatus");
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#171717]"
                  >
                    <option value="IN_STOCK">In Stock (Available)</option>
                    <option value="LOW_STOCK">Low Stock (Replenishing)</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Lead Time & MOQ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Minimum Order Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={minOrderQuantity}
                    onChange={(e) => {
                      setMinOrderQuantity(parseInt(e.target.value) || 1);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono text-[#171717]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Dispatch Lead Time</label>
                  <input
                    type="text"
                    value={leadTimeWeeks}
                    onChange={(e) => {
                      setLeadTimeWeeks(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. 1–2 Weeks"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* PUBLICATION & SEO SETTINGS (SPANS BOTH COLUMNS)           */}
          {/* ========================================================== */}
          <div id="card-publication" className="col-span-1 lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Settings & Metadata
                </span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                  Publication & Storefront Visibility
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-[#F8F9FA] text-neutral-600 border border-[#E5E7EB]">
                Storefront Controls
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  Publication Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as any);
                    markFieldEdited("status");
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#171717] focus:outline-none focus:border-[#F2C230] cursor-pointer"
                >
                  <option value="DRAFT">Draft (Internal Only, Hidden from Public)</option>
                  <option value="ACTIVE">Active (Live in Storefront)</option>
                  <option value="INACTIVE">Inactive (Hidden from Storefront)</option>
                  <option value="ARCHIVED">Archived (Historical Record)</option>
                </select>

                <div className="space-y-2.5 pt-3 mt-3 border-t border-[#E5E7EB]">
                  <label className="flex items-center gap-2.5 text-xs text-[#171717] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => {
                        setIsFeatured(e.target.checked);
                        markFieldEdited("isFeatured");
                        setHasUnsavedChanges(true);
                      }}
                      className="w-4 h-4 rounded border-[#E5E7EB] text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
                    />
                    <span className="font-semibold">Featured on Homepage Clinical Grid</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-[#171717] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBestSeller}
                      onChange={(e) => {
                        setIsBestSeller(e.target.checked);
                        markFieldEdited("isBestSeller");
                        setHasUnsavedChanges(true);
                      }}
                      className="w-4 h-4 rounded border-[#E5E7EB] text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
                    />
                    <span className="font-semibold">Bestseller Ribbon Badge</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-[#171717] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={categoryGridVisible}
                      onChange={(e) => {
                        setCategoryGridVisible(e.target.checked);
                        markFieldEdited("categoryGridVisible");
                        setHasUnsavedChanges(true);
                      }}
                      className="w-4 h-4 rounded border-[#E5E7EB] text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
                    />
                    <span className="font-semibold">Category Grid Visibility</span>
                  </label>
                </div>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
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
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
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
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PERSISTENT STICKY BOTTOM SAVE ACTION BAR                     */}
        {/* ============================================================ */}
        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-xs py-4 px-6 border border-[#E5E7EB] shadow-lg rounded-2xl flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                hasUnsavedChanges ? "bg-[#F2C230] animate-pulse" : "bg-[#16803D]"
              }`}
            />
            <span className="text-xs font-bold text-[#171717]">
              {hasUnsavedChanges ? "Unsaved changes detected" : "All fields synchronized"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/products"
              className="px-4 py-2 border border-[#E5E7EB] rounded-xl text-xs font-bold text-neutral-700 bg-white hover:bg-[#F8F9FA] transition-colors"
            >
              Discard Changes
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-2.5 bg-[#171717] hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? "Saving Product..." : isEditMode ? "Save Changes" : "Save Product"}</span>
            </button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
};

export default AdminProductEditorPage;
