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
  ShieldCheck
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

  // Helper for dynamic card styling: default white/light grey, selected light yellow with gold/yellow outline
  const getCardStyle = (cardId: string) => {
    const isSelected = selectedCard === cardId;
    return isSelected
      ? "bg-[#FEFCE8] border-[#EAB308] ring-2 ring-[#EAB308]/40 shadow-xs"
      : "bg-white border-[#E5E7EB] hover:border-neutral-300";
  };

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

  const { discountPercentage, calculatedSavings } = useMemo(() => {
    if (originalPrice > 0 && basePrice > 0 && originalPrice >= basePrice) {
      const pct = Math.round(((originalPrice - basePrice) / originalPrice) * 100);
      const savings = originalPrice - basePrice;
      return { discountPercentage: pct, calculatedSavings: savings };
    }
    return { discountPercentage: 0, calculatedSavings: 0 };
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
  // REGENERATE HANDLERS
  // ==========================================
  const handleRegenerateName = async () => {
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
            namingStyle: "clinical",
            preliminaryBrand: "DR.MEDEX"
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.productName) {
            setProductName(data.data.productName);
            setHasUnsavedChanges(true);
            return;
          }
        }
      }
      const baseModel = manufacturerModel ? ` – ${manufacturerModel}` : "";
      const baseEq = equipmentType || "Medical Equipment";
      setProductName(`DR.MEDEX Advanced ${baseEq}${baseModel} Surgical Solution`);
      setHasUnsavedChanges(true);
    } catch (err) {
      console.warn("Name regeneration error:", err);
    } finally {
      setIsGeneratingIdentity(false);
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
          body: JSON.stringify({ photos: photosPayload })
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
      const descText = `Engineered for rigorous healthcare and surgical environments, the ${productName || "DR.MEDEX medical device"} integrates high-durability medical-grade construction with refined operational ergonomics. Designed to meet exacting clinical workflow demands, it provides consistent operating reliability, streamlined maintenance protocols, and intuitive handling for clinical specialists.`;
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
      metaTitle: metaTitle.trim() || productName.trim(),
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
      mainClassName="bg-[#7A805A] min-h-screen"
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
          className="inline-flex items-center gap-2 text-xs font-bold text-white/90 hover:text-white transition-colors"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-white/30 rounded-lg text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Eye size={13} />
              <span>View on Storefront</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleSaveProduct}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50 cursor-pointer"
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
        <div className="mb-6 p-4 rounded-2xl border border-amber-300 bg-amber-50 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
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
      {/* COMPACT HORIZONTAL NINE-STEP PROGRESS TRACKER                */}
      {/* ============================================================ */}
      <div className="mb-8 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between overflow-x-auto pb-1 scrollbar-none gap-3">
          {stepStatus.map((step, idx) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => scrollToAnchor(step.anchor, step.id)}
                className={`flex items-center gap-2 text-left shrink-0 transition-all cursor-pointer group ${
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
                  <div className="hidden xl:block w-3 h-px bg-[#E5E7EB] ml-1" />
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
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* Left side — Upload Product Images */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`lg:w-80 shrink-0 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-[#EAB308] bg-[#FEFCE8]"
                  : imageSlots.length >= 5
                  ? "border-neutral-200 bg-neutral-50/60 opacity-60 cursor-not-allowed"
                  : "border-neutral-300 bg-[#F8F9FA] hover:bg-yellow-50/20 hover:border-[#EAB308]"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-xs mx-auto flex items-center justify-center text-neutral-700 mb-3 border border-[#E5E7EB]">
                <Upload size={22} className="text-[#171717]" />
              </div>
              <h4 className="text-sm font-bold text-[#171717]">Upload Product Images</h4>
              <p className="text-xs text-neutral-500 mt-1">Upload multiple product images at once</p>
              <p className="text-[11px] text-neutral-400 mt-2 font-mono">
                JPEG, PNG, WebP up to 10MB (Max 5 photos)
              </p>
              <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono bg-white border border-[#E5E7EB] text-neutral-700">
                <Camera size={11} />
                <span>{imageSlots.length} of 5 photos</span>
              </span>
            </div>

            {/* Right side — Uploaded photographs */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-[#171717] mb-3">
                  <span>Uploaded Photographs ({imageSlots.length})</span>
                  <span className="text-[11px] text-neutral-500 font-normal">
                    Click thumbnail to set as primary • Drag or use arrows to reorder
                  </span>
                </div>

                {imageSlots.length === 0 ? (
                  <div className="h-36 rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8F9FA]/60 flex flex-col items-center justify-center text-neutral-400 text-xs">
                    <ImageIcon size={28} className="mb-1 text-neutral-300" />
                    <span>No photographs uploaded yet. Click or drop images on the left.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3 items-center">
                    {imageSlots.map((slot, idx) => {
                      const isPrimary = idx === primaryImageIndex;
                      return (
                        <div
                          key={slot.id || idx}
                          className={`w-28 h-32 rounded-xl border p-1.5 bg-white flex flex-col justify-between relative transition-all group shrink-0 ${
                            isPrimary
                              ? "border-[#EAB308] ring-2 ring-[#EAB308]/50"
                              : "border-[#E5E7EB] hover:border-neutral-300"
                          }`}
                        >
                          {/* Thumbnail */}
                          <div
                            onClick={() => {
                              setPrimaryImageIndex(idx);
                              setHasUnsavedChanges(true);
                            }}
                            className="w-full h-20 rounded-lg bg-[#F8F9FA] overflow-hidden flex items-center justify-center relative cursor-pointer"
                          >
                            {slot.hasLoadError ? (
                              <ImageOff size={18} className="text-neutral-400" />
                            ) : (
                              <img
                                src={slot.previewUrl || slot.url}
                                alt={`Device view ${idx + 1}`}
                                className="w-full h-full object-contain"
                                onError={() => handleSlotLoadError(slot.id)}
                              />
                            )}

                            {isPrimary && (
                              <span className="absolute top-1 left-1 bg-[#F2C230] text-black text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-xs">
                                PRIMARY
                              </span>
                            )}

                            {slot.status === "uploading" && (
                              <div className="absolute inset-0 bg-white/85 flex items-center justify-center">
                                <RefreshCw size={14} className="animate-spin text-[#16803D]" />
                              </div>
                            )}
                          </div>

                          {/* Controls */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#E5E7EB]">
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => moveImage(idx, "left")}
                                disabled={idx === 0 || slot.status === "uploading"}
                                className="p-0.5 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                                title="Move left"
                              >
                                <MoveLeft size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveImage(idx, "right")}
                                disabled={idx === imageSlots.length - 1 || slot.status === "uploading"}
                                className="p-0.5 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                                title="Move right"
                              >
                                <MoveRight size={11} />
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              disabled={slot.status === "uploading"}
                              className="p-0.5 text-neutral-400 hover:text-[#D92D32] disabled:opacity-50 cursor-pointer"
                              title="Remove image"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add More slot if < 5 */}
                    {imageSlots.length < 5 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-28 h-32 rounded-xl border-2 border-dashed border-neutral-300 hover:border-[#EAB308] bg-neutral-50/50 hover:bg-yellow-50/20 flex flex-col items-center justify-center text-neutral-400 hover:text-black transition-all cursor-pointer shrink-0"
                      >
                        <Plus size={20} className="mb-1" />
                        <span className="text-[11px] font-bold">Add Photo</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {uploadProgress && isUploadingImage && (
                <div className="mt-3 p-2 bg-neutral-50 rounded-lg border border-[#E5E7EB] text-xs flex items-center justify-between">
                  <span>Uploading photos...</span>
                  <span className="font-mono">{uploadProgress.current}/{uploadProgress.total}</span>
                </div>
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
            className="px-4 py-2 bg-[#D92D32] hover:bg-[#B91C1C] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            {isAiIdentifying ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            <span>{isAiIdentifying ? "Analyzing Photographs..." : "Run AI Analysis"}</span>
          </button>

          {aiIdentifyError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-[#D92D32] text-xs text-[#D92D32] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{aiIdentifyError}</span>
              </div>
              <button
                type="button"
                onClick={() => setAiIdentifyError(null)}
                className="font-bold hover:underline cursor-pointer text-xs"
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
              <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Step 2
                  </span>
                  <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                    Product Classification
                  </h3>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-[#E5E7EB]">
                  L1–L3 Hierarchy
                </span>
              </div>

              <div className="space-y-4 mt-4">
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-medium text-[#171717] focus:outline-none focus:border-[#EAB308] cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-medium text-[#171717] focus:outline-none focus:border-[#EAB308] disabled:opacity-50 disabled:bg-[#F8F9FA] cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-medium text-[#171717] focus:outline-none focus:border-[#EAB308] disabled:opacity-50 disabled:bg-[#F8F9FA] cursor-pointer"
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
              <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Step 3
                  </span>
                  <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                    Product Identity
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={handleRegenerateName}
                  disabled={isGeneratingIdentity}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#D92D32] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isGeneratingIdentity ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span>Regenerate Name</span>
                </button>
              </div>

              <div className="space-y-4 mt-4">
                {/* 1. Product Name */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    1. Product Name <span className="text-rose-500">*</span>
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#EAB308]"
                  />
                </div>

                {/* 2. Manufacturer Model */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#EAB308]"
                  />
                </div>

                {/* 3. SKU */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1 flex items-center justify-between">
                    <span>3. SKU <span className="text-rose-500">*</span></span>
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
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-mono font-bold text-[#171717] focus:outline-none ${
                      skuError ? "border-[#D92D32]" : "border-[#E5E7EB] focus:border-[#EAB308]"
                    }`}
                  />
                  {skuError && <p className="text-[10px] text-[#D92D32] mt-1 font-semibold">{skuError}</p>}
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

              <div className="space-y-2 mt-4">
                <label className="block text-xs font-bold text-[#171717]">
                  Clinical & Operational Overview <span className="text-rose-500">*</span>
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
                  placeholder="Enter product description explaining purpose, design, intended surgical workflow, and clinical advantages..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#EAB308] leading-relaxed"
                />
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
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
              <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Step 5
                  </span>
                  <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                    Technical Specifications
                  </h3>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-[#E5E7EB]">
                  4 Core Fields
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center gap-2 mt-4">
                <ShieldCheck size={14} className="shrink-0 text-amber-600" />
                <span>
                  Unverified parameters remain blank or &quot;Needs verification&quot;.
                </span>
              </div>

              <div className="space-y-3 mt-3">
                {/* 1. Power Supply */}
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
                    placeholder="e.g. 220–240 V AC, 50/60 Hz, 80 VA (or leave blank)"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#EAB308]"
                  />
                </div>

                {/* 2. Quality Standards */}
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
                    placeholder="e.g. ISO 13485:2016 Certified Facility (or leave blank)"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#EAB308]"
                  />
                </div>

                {/* 3. Regulatory Status */}
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
                    placeholder="e.g. CE Marking (EU MDR 2017/745) / CDSCO (or leave blank)"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#EAB308]"
                  />
                </div>

                {/* 4. Warranty */}
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
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#171717] focus:outline-none focus:border-[#EAB308]"
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

              <p className="text-xs text-neutral-500 mt-3">
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

              <div className="space-y-1.5 max-h-48 overflow-y-auto mt-3">
                {clinicalIndications.length === 0 ? (
                  <div className="p-3 text-center text-xs text-neutral-400 bg-[#F8F9FA] rounded-xl border border-dashed border-[#E5E7EB]">
                    No clinical indications specified yet. Use AI Analysis or add above.
                  </div>
                ) : (
                  clinicalIndications.map((ind, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-[#F8F9FA] p-2.5 rounded-xl border border-[#E5E7EB]">
                      <span className="flex-1 pr-2 text-neutral-800 font-medium">• {ind}</span>
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

              <p className="text-xs text-neutral-500 mt-3">
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

              <div className="space-y-1.5 max-h-48 overflow-y-auto mt-3">
                {engineeringHighlights.length === 0 ? (
                  <div className="p-3 text-center text-xs text-neutral-400 bg-[#F8F9FA] rounded-xl border border-dashed border-[#E5E7EB]">
                    No engineering highlights added yet. Use AI Analysis or add above.
                  </div>
                ) : (
                  engineeringHighlights.map((hl, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-[#F8F9FA] p-2.5 rounded-xl border border-[#E5E7EB]">
                      <span className="flex-1 pr-2 text-neutral-800 font-medium">• {hl}</span>
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
              <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Step 8
                  </span>
                  <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                    Standard Package Contents
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

              <p className="text-xs text-neutral-500 mt-3">
                Verified components, cables, modules, and standard hardware included in shipment.
              </p>

              <div className="grid grid-cols-12 gap-2 mt-3">
                <input
                  type="text"
                  value={newPackageItemName}
                  onChange={(e) => setNewPackageItemName(e.target.value)}
                  placeholder="Component name..."
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

              <div className="space-y-1.5 max-h-56 overflow-y-auto mt-3">
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
              <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Step 9
                  </span>
                  <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                    Commercial Pricing & Inventory
                  </h3>
                </div>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-[#E5E7EB]">
                  Base: ₹ INR
                </span>
              </div>

              <div className="space-y-4 mt-4">
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
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono text-[#171717] focus:outline-none focus:border-[#EAB308]"
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
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-mono font-bold text-[#171717] focus:outline-none focus:border-[#EAB308]"
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
                      <span>Live FX Conversion</span>
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
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Settings & Metadata
                </span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider mt-1">
                  Publication & Storefront Visibility
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-[#E5E7EB]">
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
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs font-bold text-[#171717] focus:outline-none focus:border-[#EAB308] cursor-pointer"
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
