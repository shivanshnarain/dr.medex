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
  RotateCcw
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Category } from "../types";

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
  const [statusBanner, setStatusBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active step in 7-step tracker
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
  // STEP 1: PRODUCT PHOTOS & AI IDENTIFICATION
  // ==========================================
  const [images, setImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  // Mode A (Automatic) vs Mode B (Manual)
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [isAiIdentifying, setIsAiIdentifying] = useState(false);
  const [aiIdentifyPhase, setAiIdentifyPhase] = useState<
    "idle" | "reading_photos" | "identifying_equipment" | "matching_categories" | "generating_content" | "preparing_fields" | "complete"
  >("idle");
  const [aiIdentifyError, setAiIdentifyError] = useState<string | null>(null);
  const [aiIdentifyResult, setAiIdentifyResult] = useState<any | null>(null);
  const [preserveManualEdits, setPreserveManualEdits] = useState(true);
  const [manuallyEditedFields, setManuallyEditedFields] = useState<Set<string>>(new Set());
  const activeAnalysisIdRef = useRef<number>(0);

  // Modal view for AI identification (optional alternative popup)
  const [showAiIdentifyModal, setShowAiIdentifyModal] = useState(false);
  const [aiIdentifyFiles, setAiIdentifyFiles] = useState<{
    file: File;
    preview: string;
    name: string;
    size: number;
  }[]>([]);
  const aiIdentifyModalFileInputRef = useRef<HTMLInputElement>(null);

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
  // STEP 3: PRODUCT IDENTITY
  // ==========================================
  const [productName, setProductName] = useState("");
  const [title, setTitle] = useState("");
  const [manufacturerModel, setManufacturerModel] = useState("");
  const [internalModelId, setInternalModelId] = useState("");
  const [sku, setSku] = useState("");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState("DR.MEDEX");
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [proposedIdentity, setProposedIdentity] = useState<{
    productName: string;
    title: string;
    brand: string;
    internalModelId: string;
    slug: string;
  } | null>(null);

  // ==========================================
  // STEP 4: PRICING & INVENTORY
  // ==========================================
  const [originalPrice, setOriginalPrice] = useState<number>(0); // MRP in INR
  const [basePrice, setBasePrice] = useState<number>(0); // Selling price in INR
  const [stock, setStock] = useState<number>(10);
  const [stockStatus, setStockStatus] = useState<"IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("IN_STOCK");
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);
  const [minOrderQuantity, setMinOrderQuantity] = useState<number>(1);
  const [leadTimeWeeks, setLeadTimeWeeks] = useState("1–2 Weeks");

  const { discountPercentage, calculatedSavings } = useMemo(() => {
    if (originalPrice > 0 && basePrice > 0 && originalPrice >= basePrice) {
      const pct = Math.round(((originalPrice - basePrice) / originalPrice) * 100);
      const savings = originalPrice - basePrice;
      return { discountPercentage: pct, calculatedSavings: savings };
    }
    return { discountPercentage: 0, calculatedSavings: 0 };
  }, [originalPrice, basePrice]);

  // ==========================================
  // STEP 5: DESCRIPTION & TECHNICAL SPECS
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

  const [specList, setSpecList] = useState<{ key: string; value: string; unit?: string; note?: string }[]>([]);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecVal, setNewSpecVal] = useState("");
  const [newSpecUnit, setNewSpecUnit] = useState("");
  const [newSpecNote, setNewSpecNote] = useState("");

  const [aiTone, setAiTone] = useState<"CLINICAL" | "TECHNICAL" | "COMMERCIAL" | "TENDER" | "SEO">("CLINICAL");
  const [aiCustomPrompt, setAiCustomPrompt] = useState("");
  const [aiGeneratedPreview, setAiGeneratedPreview] = useState<{
    shortDescription?: string;
    fullDescription?: string;
    keyFeatures?: string[];
    metaDescription?: string;
  } | null>(null);

  // ==========================================
  // STEP 6: DOCUMENTATION & SEO
  // ==========================================
  const [regulatoryClass, setRegulatoryClass] = useState("Class IIa (MDR 2017/745)");
  const [certificationStatus, setCertificationStatus] = useState("Claimed");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [issuingOrg, setIssuingOrg] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertText, setNewCertText] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const [datasheetUrl, setDatasheetUrl] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");

  // ==========================================
  // STEP 7: PUBLISHING & VISIBILITY
  // ==========================================
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED">("ACTIVE");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [categoryGridVisible, setCategoryGridVisible] = useState(true);

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
              setCertificationStatus(p.certificationStatus || "Claimed");
              setCertificateNumber(p.certificateNumber || "");
              setIssuingOrg(p.issuingOrg || "");
              setStatus(p.status || "ACTIVE");

              // Prices in INR
              setOriginalPrice(p.originalPrice || p.regularPrice || p.basePrice || 0);
              setBasePrice(p.basePrice || p.salePrice || 0);
              const pStock = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 10);
              setStock(pStock);
              setLowStockThreshold(p.lowStockThreshold || 3);
              setStockStatus(p.stockStatus || (pStock > 0 ? (pStock <= 5 ? "LOW_STOCK" : "IN_STOCK") : "OUT_OF_STOCK"));
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

              // Normalize specifications
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

              setCertifications(p.certifications || []);
              setManualUrl(p.manualUrl || "");
              setDatasheetUrl(p.datasheetUrl || "");
              setMetaTitle(p.metaTitle || p.title || "");
              setMetaDescription(p.metaDescription || p.shortDescription || "");
              setIsFeatured(Boolean(p.featured || p.isFeatured));
              setIsBestSeller(Boolean(p.bestseller || p.isBestSeller));
              setCategoryGridVisible(p.categoryGridVisible !== false);
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
      const res = await adminFetch(
        `/api/admin/products/check-sku?sku=${encodeURIComponent(skuToTest)}&excludeId=${productId || ""}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && !data.isUnique) {
          setSkuError(`SKU already assigned to "${data.conflictingProduct?.title || "another product"}"`);
        } else {
          setSkuError(null);
        }
      }
    } catch {
      setSkuError(null);
    } finally {
      setIsCheckingSku(false);
    }
  };

  // Copy SKU action
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

  // ============================================================
  // ONE COORDINATED AI IDENTIFICATION WORKFLOW
  // ============================================================
  const applyAiResultsToForm = (result: any) => {
    if (!result) return;

    // 1. Classification
    if (result.primaryCategory) {
      const suggestedCat = String(result.primaryCategory).toLowerCase();
      const catEntry = Object.entries(catalogueHierarchy).find(
        ([k, v]: [string, any]) => v.name.toLowerCase() === suggestedCat || k.toLowerCase() === suggestedCat
      );
      if (catEntry) {
        const [catKey, catVal] = catEntry;
        if (!preserveManualEdits || !manuallyEditedFields.has("category")) {
          setCategory(catKey);
        }

        if (result.subcategory && catVal.subcategories) {
          const suggestedSub = String(result.subcategory).toLowerCase();
          const subEntry = catVal.subcategories.find(
            (s: any) => s.name.toLowerCase() === suggestedSub || s.id.toLowerCase() === suggestedSub
          );
          if (subEntry) {
            if (!preserveManualEdits || !manuallyEditedFields.has("subcategory")) {
              setSubcategory(subEntry.id || subEntry.name);
            }

            if (result.equipmentType && subEntry.equipmentTypes) {
              const suggestedEq = String(result.equipmentType).toLowerCase();
              const eqEntry = subEntry.equipmentTypes.find(
                (e: any) => e.name.toLowerCase() === suggestedEq || e.id.toLowerCase() === suggestedEq
              );
              if (eqEntry) {
                if (!preserveManualEdits || !manuallyEditedFields.has("equipmentType")) {
                  setEquipmentType(eqEntry.name);
                }
              } else {
                if (!preserveManualEdits || !manuallyEditedFields.has("equipmentType")) {
                  setEquipmentType(result.equipmentType);
                }
              }
            }
          }
        }
      }
    }

    // 2. Identity
    if (!preserveManualEdits || !manuallyEditedFields.has("productName")) {
      if (result.productName) {
        setProductName(result.productName);
        setTitle(result.productName);
      }
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("brand")) {
      if (result.brand) setBrand(result.brand);
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("manufacturerModel")) {
      if (result.manufacturerModel) setManufacturerModel(result.manufacturerModel);
    }
    if (!isEditMode && (!sku || !manuallyEditedFields.has("sku"))) {
      fetchNewSku(category);
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("slug")) {
      if (result.productName) {
        setSlug(result.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""));
      }
    }

    // 3. Descriptions & Clinical Overview
    if (!preserveManualEdits || !manuallyEditedFields.has("shortDescription")) {
      if (result.clinicalOverview) setShortDescription(result.clinicalOverview);
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("fullDescription")) {
      if (result.clinicalOverview) {
        let full = result.clinicalOverview;
        if (result.intendedUses && result.intendedUses.length > 0) {
          full += "\n\nIntended Clinical Applications:\n" + result.intendedUses.map((u: string) => `• ${u}`).join("\n");
        }
        setFullDescription(full);
      }
    }

    // 4. Key Features
    if (!preserveManualEdits || !manuallyEditedFields.has("keyFeatures")) {
      if (Array.isArray(result.keyFeatures) && result.keyFeatures.length > 0) {
        setKeyFeatures(result.keyFeatures);
      }
    }

    // 5. Applications / Intended Uses
    if (!preserveManualEdits || !manuallyEditedFields.has("applications")) {
      if (Array.isArray(result.intendedUses) && result.intendedUses.length > 0) {
        setApplications(result.intendedUses);
      }
    }

    // 6. Package Contents
    if (!preserveManualEdits || !manuallyEditedFields.has("packageContents")) {
      if (Array.isArray(result.packageContents) && result.packageContents.length > 0) {
        setPackageContents(result.packageContents);
      }
    }

    // 7. Technical Specifications
    if (!preserveManualEdits || !manuallyEditedFields.has("specList")) {
      if (Array.isArray(result.technicalSpecifications) && result.technicalSpecifications.length > 0) {
        const newSpecs = result.technicalSpecifications.map((s: any) => ({
          key: s.parameter || "",
          value: s.value || "",
          unit: s.unit || "",
          note: s.note || ""
        }));
        setSpecList(newSpecs);
      }
    }

    // 8. Documentation & SEO
    if (!preserveManualEdits || !manuallyEditedFields.has("certificationStatus")) {
      setCertificationStatus(result.fieldsNeedingVerification?.length > 0 ? "Pending Verification" : "Verified");
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("metaTitle")) {
      if (result.seoTitle) setMetaTitle(result.seoTitle);
    }
    if (!preserveManualEdits || !manuallyEditedFields.has("metaDescription")) {
      if (result.seoDescription) setMetaDescription(result.seoDescription);
    }
  };

  const triggerAiIdentification = async (targetImages?: string[]) => {
    const imagesToUse = targetImages || images;
    if (!imagesToUse || imagesToUse.length === 0) {
      setAiIdentifyError("Please upload at least one photograph of the medical equipment to run identification.");
      return;
    }

    const photosForPayload = imagesToUse.slice(0, 5);
    const thisAnalysisId = Date.now();
    activeAnalysisIdRef.current = thisAnalysisId;

    setIsAiIdentifying(true);
    setAiIdentifyError(null);
    setAiIdentifyPhase("reading_photos");

    try {
      // 1. Reading product photographs
      await new Promise((r) => setTimeout(r, 100));
      if (activeAnalysisIdRef.current !== thisAnalysisId) return;

      // 2. Identifying equipment
      setAiIdentifyPhase("identifying_equipment");

      const res = await adminFetch("/api/admin/products/ai-identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photos: photosForPayload.map((url, idx) => ({
            data: url,
            mimeType: url.endsWith(".png") ? "image/png" : url.endsWith(".webp") ? "image/webp" : "image/jpeg",
            filename: `photo_${idx + 1}.jpg`
          }))
        })
      });

      if (activeAnalysisIdRef.current !== thisAnalysisId) return;

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to identify medical equipment.");
      }

      // 3. Matching catalogue categories
      setAiIdentifyPhase("matching_categories");
      await new Promise((r) => setTimeout(r, 100));
      if (activeAnalysisIdRef.current !== thisAnalysisId) return;

      // 4. Generating product content
      setAiIdentifyPhase("generating_content");
      await new Promise((r) => setTimeout(r, 100));
      if (activeAnalysisIdRef.current !== thisAnalysisId) return;

      // 5. Preparing editable fields
      setAiIdentifyPhase("preparing_fields");
      applyAiResultsToForm(data.data);

      if (activeAnalysisIdRef.current !== thisAnalysisId) return;
      setAiIdentifyResult(data.data);
      setAiIdentifyPhase("complete");
      setHasUnsavedChanges(true);
      setStatusBanner({
        type: "success",
        text: "Smart Product Assistant successfully analyzed device photographs and populated catalogue fields."
      });
    } catch (err: any) {
      if (activeAnalysisIdRef.current === thisAnalysisId) {
        console.error("AI identification error:", err);
        setAiIdentifyError(err.message || "Failed to identify medical equipment. Please check network connection and retry.");
        setAiIdentifyPhase("idle");
      }
    } finally {
      if (activeAnalysisIdRef.current === thisAnalysisId) {
        setIsAiIdentifying(false);
      }
    }
  };

  // Step 1: Handling File Uploads
  const handleStep1PhotosSelected = async (selectedFiles: File[]) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const validTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    for (const f of selectedFiles) {
      if (!validTypes.has(f.type)) {
        setUploadError(`File "${f.name}" has an unsupported format (${f.type}). Supported formats: JPEG, PNG, WebP.`);
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setUploadError(`File "${f.name}" exceeds the 10MB limit.`);
        return;
      }
    }

    setIsUploadingImage(true);
    setUploadError(null);
    setUploadProgress({ current: 0, total: selectedFiles.length });

    const newUploadedUrls: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
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
            contentType: file.type
          })
        });

        const data = await res.json();
        if (res.ok && data.success && data.url) {
          newUploadedUrls.push(data.url);
        } else {
          newUploadedUrls.push(base64Data);
        }
      } catch {
        // Fallback to data URI if upload server fails
      }
      setUploadProgress({ current: i + 1, total: selectedFiles.length });
    }

    setIsUploadingImage(false);

    if (newUploadedUrls.length > 0) {
      // Invalidate any active analysis
      activeAnalysisIdRef.current = 0;
      const combined = [...images, ...newUploadedUrls].slice(0, 5);
      setImages(combined);
      setHasUnsavedChanges(true);

      // Mode A: Automatic analysis
      if (autoAnalyze) {
        triggerAiIdentification(combined);
      }
    }
  };

  // Drag & drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleStep1PhotosSelected(Array.from(e.dataTransfer.files));
    }
  };

  // Move image left / right
  const moveImage = (index: number, direction: "left" | "right") => {
    const target = direction === "left" ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    const copy = [...images];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    setImages(copy);
    setHasUnsavedChanges(true);
    activeAnalysisIdRef.current = 0;
  };

  // Remove image
  const removeImage = (index: number) => {
    const filtered = images.filter((_, i) => i !== index);
    setImages(filtered);
    if (primaryImageIndex >= filtered.length) {
      setPrimaryImageIndex(Math.max(0, filtered.length - 1));
    }
    setHasUnsavedChanges(true);
    activeAnalysisIdRef.current = 0;
  };

  // Replace image trigger
  const handleReplaceClick = (index: number) => {
    setReplaceTargetIndex(index);
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || replaceTargetIndex === null) return;
    const file = e.target.files[0];
    e.target.value = "";

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
          contentType: file.type
        })
      });

      const data = await res.json();
      const newUrl = res.ok && data.success && data.url ? data.url : base64Data;
      const copy = [...images];
      copy[replaceTargetIndex] = newUrl;
      setImages(copy);
      setHasUnsavedChanges(true);
      activeAnalysisIdRef.current = 0;
      if (autoAnalyze) {
        triggerAiIdentification(copy);
      }
    } catch (err) {
      console.error("Failed to replace image:", err);
    } finally {
      setReplaceTargetIndex(null);
    }
  };

  // Add via direct URL input
  const handleAddImageUrl = () => {
    if (imageUrlInput.trim()) {
      if (images.length >= 5) {
        setUploadError("Maximum 5 photographs allowed per product.");
        return;
      }
      const updated = [...images, imageUrlInput.trim()];
      setImages(updated);
      setImageUrlInput("");
      setHasUnsavedChanges(true);
      activeAnalysisIdRef.current = 0;
      if (autoAnalyze) {
        triggerAiIdentification(updated);
      }
    }
  };

  // AI Description Assistant handler
  const handleGenerateAiDescription = async () => {
    setIsAiGenerating(true);
    try {
      const res = await adminFetch("/api/admin/products/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tone: aiTone,
          customPrompt: aiCustomPrompt,
          currentProduct: {
            title,
            productName,
            category,
            subcategory,
            equipmentType,
            modelNumber: manufacturerModel,
            brand,
            specifications: specList,
            features: keyFeatures,
            intendedUses: applications
          }
        })
      });

      const data = await res.json();
      if (data.success && data.generated) {
        setAiGeneratedPreview(data.generated);
      }
    } catch (err) {
      console.error("AI copy generation failed:", err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleApplyAiGenerated = () => {
    if (!aiGeneratedPreview) return;
    if (aiGeneratedPreview.shortDescription) {
      setShortDescription(aiGeneratedPreview.shortDescription);
      markFieldEdited("shortDescription");
    }
    if (aiGeneratedPreview.fullDescription) {
      setFullDescription(aiGeneratedPreview.fullDescription);
      markFieldEdited("fullDescription");
    }
    if (aiGeneratedPreview.keyFeatures && aiGeneratedPreview.keyFeatures.length > 0) {
      setKeyFeatures(aiGeneratedPreview.keyFeatures);
      markFieldEdited("keyFeatures");
    }
    if (aiGeneratedPreview.metaDescription) {
      setMetaDescription(aiGeneratedPreview.metaDescription);
      markFieldEdited("metaDescription");
    }
    setAiGeneratedPreview(null);
    setHasUnsavedChanges(true);
  };

  // Regenerate suggestions action
  const handleRegenerateSuggestions = async () => {
    setIsGeneratingIdentity(true);
    try {
      const res = await adminFetch("/api/admin/products/generate-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          subcategory,
          equipmentType,
          currentProduct: { productName, title, brand, manufacturerModel }
        })
      });

      const data = await res.json();
      if (data.success && data.suggestions) {
        setProposedIdentity(data.suggestions);
        setShowIdentityModal(true);
      }
    } catch (err) {
      console.error("Failed to generate identity suggestions:", err);
    } finally {
      setIsGeneratingIdentity(false);
    }
  };

  const handleApplyProposedIdentity = () => {
    if (!proposedIdentity) return;
    setProductName(proposedIdentity.productName);
    setTitle(proposedIdentity.title);
    setBrand(proposedIdentity.brand);
    if (proposedIdentity.internalModelId) setInternalModelId(proposedIdentity.internalModelId);
    if (proposedIdentity.slug) setSlug(proposedIdentity.slug);
    setShowIdentityModal(false);
    setHasUnsavedChanges(true);
  };

  // ==========================================
  // SEVEN-STEP PROGRESS VALIDATION
  // ==========================================
  const stepStatus = useMemo(() => {
    const isStep1Done = Boolean(images.length > 0);
    const isStep2Done = Boolean(category && subcategory && equipmentType);
    const isStep3Done = Boolean((productName.trim() || title.trim()) && sku.trim());
    const isStep4Done = Boolean(basePrice > 0 && stock >= 0);
    const isStep5Done = Boolean((shortDescription.trim() || fullDescription.trim()) && specList.length > 0);
    const isStep6Done = Boolean(slug.trim() && metaTitle.trim());
    const isStep7Done = Boolean(status);

    return [
      { id: 1, name: "Product Photos & AI", isDone: isStep1Done, anchor: "card-photos-ai" },
      { id: 2, name: "Classification", isDone: isStep2Done, anchor: "card-classification" },
      { id: 3, name: "Product Identity", isDone: isStep3Done, anchor: "card-product-identity" },
      { id: 4, name: "Pricing & Inventory", isDone: isStep4Done, anchor: "card-pricing-inventory" },
      { id: 5, name: "Description & Specs", isDone: isStep5Done, anchor: "card-description-specs" },
      { id: 6, name: "Documentation & SEO", isDone: isStep6Done, anchor: "card-documentation-seo" },
      { id: 7, name: "Publishing & Visibility", isDone: isStep7Done, anchor: "card-publishing-visibility" }
    ];
  }, [
    images.length,
    category,
    subcategory,
    equipmentType,
    productName,
    title,
    sku,
    basePrice,
    stock,
    shortDescription,
    fullDescription,
    specList.length,
    slug,
    metaTitle,
    status
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

    setIsSaving(true);
    setStatusBanner(null);

    const technicalSpecifications: Record<string, string> = {};
    specList.forEach((s) => {
      if (s.key.trim()) {
        const valWithUnit = s.unit ? `${s.value} ${s.unit}`.trim() : s.value;
        technicalSpecifications[s.key.trim()] = valWithUnit;
      }
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
      certificationStatus,
      certificateNumber: certificateNumber.trim() || undefined,
      issuingOrg: issuingOrg.trim() || undefined,
      status,

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
      manualUrl: manualUrl.trim() || undefined,
      datasheetUrl: datasheetUrl.trim() || undefined,

      metaTitle: metaTitle.trim(),
      metaDescription: metaDescription.trim(),
      featured: isFeatured,
      isFeatured,
      bestseller: isBestSeller,
      isBestSeller,
      categoryGridVisible,

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
          <RefreshCw size={28} className="animate-spin text-black mx-auto" />
          <p className="text-xs font-mono text-neutral-500">Accessing central clinical inventory database...</p>
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
          : "Systematic Catalogue Builder & Production-Ready Medical Equipment Management"
      }
      actions={
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="flex items-center gap-1.5 px-3.5 py-2 border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#171717] bg-white hover:bg-[#F5F5F5] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>All Products</span>
          </Link>

          {/* Neutral AI Product Identification Action */}
          <button
            type="button"
            onClick={() => scrollToAnchor("card-photos-ai", 1)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#D92D32] hover:bg-[#b82226] text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            title="Upload device photographs to automatically identify equipment and generate catalogue specifications"
          >
            <Sparkles size={14} />
            <span>Smart Product Assistant</span>
          </button>

          {isEditMode && slug && (
            <Link
              to={`/product/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 border border-[#E5E5E5] rounded-lg text-xs font-semibold text-[#171717] bg-white hover:bg-[#F5F5F5] transition-colors"
            >
              <Eye size={14} />
              <span>Preview</span>
            </Link>
          )}

          <button
            type="button"
            onClick={handleSaveProduct}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
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
              ? "bg-emerald-50 border-[#16803D] text-[#16803D]"
              : "bg-red-50 border-[#D92D32] text-[#D92D32]"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusBanner.type === "success" ? (
              <CheckCircle2 size={16} className="text-[#16803D] shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-[#D92D32] shrink-0" />
            )}
            <span>{statusBanner.text}</span>
          </div>
          <button type="button" onClick={() => setStatusBanner(null)} className="text-neutral-500 hover:text-black">
            ✕
          </button>
        </div>
      )}

      {/* DUPLICATE PRODUCT WARNING BANNER */}
      {duplicateInfo.isDuplicate && duplicateInfo.duplicateProduct && (
        <div className="mb-6 p-4 rounded-xl border-2 border-[#D92D32] bg-rose-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#D92D32] text-white flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#171717]">
                A matching product already exists in this category.
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
      {/* 2. COMPACT HORIZONTAL SEVEN-STEP PROGRESS TRACKER            */}
      {/* ============================================================ */}
      <div className="mb-8 bg-white border border-[#E5E5E5] rounded-xl p-4 shadow-2xs">
        <div className="flex items-center justify-between overflow-x-auto pb-1 scrollbar-none gap-4">
          {stepStatus.map((step, idx) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => scrollToAnchor(step.anchor, step.id)}
                className={`flex items-center gap-2.5 text-left shrink-0 transition-all cursor-pointer group ${
                  isActive ? "opacity-100" : "opacity-80 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.isDone
                      ? "bg-[#16803D] text-white"
                      : isActive
                      ? "bg-[#F2C230] text-[#171717] ring-2 ring-[#F2C230]/40"
                      : "border border-[#E5E5E5] text-neutral-400 bg-white"
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
                  <span className="text-[10px] text-neutral-400">
                    {step.isDone ? "Completed" : isActive ? "Current" : "Upcoming"}
                  </span>
                </div>

                {idx < stepStatus.length - 1 && (
                  <div className="hidden lg:block w-6 h-px bg-[#E5E5E5] ml-2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. ENTERPRISE SEVEN-STEP PRODUCT EDITOR FORM                 */}
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
        {/* STEP 1: PRODUCT PHOTOS & AI IDENTIFICATION WORKSPACE          */}
        {/* ============================================================ */}
        <div id="card-photos-ai" className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-5 shadow-2xs">
          <div className="border-b border-[#E5E5E5] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Step 1 • Starting Workspace
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-[#D92D32] bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  AI-Assisted Catalogue Entry
                </span>
              </div>
              <h3 className="text-base font-bold text-[#171717] mt-1">
                Product Photographs & AI Identification
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Upload 1 to 5 device photographs (overall machine, front/back, control panel, nameplate, labels, accessories).
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              {/* Mode A Toggle: Automatic Analysis */}
              <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 bg-[#F5F5F5] px-3 py-1.5 rounded-lg border border-[#E5E5E5] cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAnalyze}
                  onChange={(e) => setAutoAnalyze(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E5E5E5] text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
                />
                <span>Auto-Analyze Uploads</span>
              </label>

              {/* Mode B: Manual Identify Product Action */}
              <button
                type="button"
                onClick={() => triggerAiIdentification()}
                disabled={isAiIdentifying || images.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#D92D32] hover:bg-[#b82226] disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Run Smart Product Assistant to identify equipment and populate all form fields"
              >
                {isAiIdentifying ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>
                  {isAiIdentifying
                    ? "Analyzing Device..."
                    : images.length > 0
                    ? `Identify Product (${images.length} Photo${images.length === 1 ? "" : "s"})`
                    : "Identify Product"}
                </span>
              </button>
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
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              isDragging
                ? "border-[#F2C230] bg-[#F2C230]/10"
                : images.length >= 5
                ? "border-neutral-200 bg-neutral-50/60 opacity-70 cursor-not-allowed"
                : "border-neutral-300 bg-[#F5F5F5]/60 hover:bg-yellow-50/20 hover:border-[#F2C230]"
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-white shadow-xs mx-auto flex items-center justify-center text-neutral-700 mb-2 border border-[#E5E5E5]">
              <Upload size={20} className="text-[#171717]" />
            </div>
            <h4 className="text-xs font-bold text-[#171717]">
              {images.length >= 5
                ? "Maximum 5 device photographs loaded"
                : "Drag & drop product photographs here, or click to browse files"}
            </h4>
            <p className="text-[11px] text-neutral-500 mt-1">
              Supports 1 to 5 photographs in one operation (JPEG, PNG, WebP up to 10MB each).
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white border border-[#E5E5E5] text-neutral-700">
              <Camera size={11} />
              <span>{images.length} of 5 photographs selected</span>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploadingImage && uploadProgress && (
            <div className="p-3 bg-neutral-50 rounded-lg border border-[#E5E5E5] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#171717]">
                <span>Saving device photographs to media store...</span>
                <span>{uploadProgress.current} / {uploadProgress.total}</span>
              </div>
              <div className="w-full bg-[#E5E5E5] rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#16803D] h-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Upload / Validation Errors */}
          {uploadError && (
            <div className="p-3 bg-red-50 text-[#D92D32] rounded-lg border border-[#D92D32] text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{uploadError}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="text-xs font-bold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* AI In-Progress Sequence Banner */}
          {isAiIdentifying && (
            <div className="p-4 rounded-xl bg-amber-50/70 border border-[#F2C230] space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#171717]">
                  <RefreshCw size={15} className="animate-spin text-[#171717]" />
                  <span>Smart Product Assistant in progress</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-neutral-600 bg-white px-2 py-0.5 rounded border border-neutral-200">
                  Multi-Angle Analysis
                </span>
              </div>

              {/* Sequential Phase Indicator */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-[10px] font-mono">
                {[
                  { id: "reading_photos", label: "1. Reading Photos" },
                  { id: "identifying_equipment", label: "2. Identifying Device" },
                  { id: "matching_categories", label: "3. Matching Taxonomy" },
                  { id: "generating_content", label: "4. Generating Content" },
                  { id: "preparing_fields", label: "5. Preparing Fields" }
                ].map((ph) => {
                  const isCurrent = aiIdentifyPhase === ph.id;
                  return (
                    <div
                      key={ph.id}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        isCurrent
                          ? "bg-[#F2C230] border-[#F2C230] font-bold text-black ring-2 ring-[#F2C230]/30 animate-pulse"
                          : "bg-white border-[#E5E5E5] text-neutral-500"
                      }`}
                    >
                      {ph.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Analysis Failure Banner with Retry */}
          {aiIdentifyError && !isAiIdentifying && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-[#D92D32] text-xs text-[#D92D32] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{aiIdentifyError}</span>
              </div>
              <button
                type="button"
                onClick={() => triggerAiIdentification()}
                className="px-3 py-1 bg-[#D92D32] text-white rounded font-bold hover:bg-[#b82226] cursor-pointer"
              >
                Retry Analysis
              </button>
            </div>
          )}

          {/* AI Analysis Completion Report Card */}
          {aiIdentifyResult && !isAiIdentifying && (
            <div className="p-4 rounded-xl bg-[#F5F5F5] border border-[#E5E5E5] space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#16803D]" />
                  <span className="text-xs font-bold text-[#171717]">
                    Analysis Completed: {aiIdentifyResult.productName || aiIdentifyResult.equipmentType}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                      aiIdentifyResult.confidence === "HIGH"
                        ? "bg-emerald-100 text-[#16803D]"
                        : aiIdentifyResult.confidence === "MEDIUM"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-[#D92D32]"
                    }`}
                  >
                    {aiIdentifyResult.confidence === "HIGH" ? (
                      <CheckCircle2 size={13} />
                    ) : (
                      <AlertTriangle size={13} />
                    )}
                    <span>{aiIdentifyResult.confidence} Confidence</span>
                  </span>

                  <label className="flex items-center gap-1 text-[11px] text-neutral-600 bg-white px-2 py-0.5 rounded border border-[#E5E5E5] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preserveManualEdits}
                      onChange={(e) => setPreserveManualEdits(e.target.checked)}
                      className="w-3.5 h-3.5 accent-[#16803D]"
                    />
                    <span>Preserve manual edits</span>
                  </label>
                </div>
              </div>

              {/* Matched Taxonomy Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono bg-white p-2.5 rounded-lg border border-[#E5E5E5]">
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Matched Category:</span>
                  <span className="font-semibold text-neutral-800">{aiIdentifyResult.primaryCategory}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Matched Subcategory:</span>
                  <span className="font-semibold text-neutral-800">{aiIdentifyResult.subcategory}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[9px] uppercase">Equipment Type:</span>
                  <span className="font-semibold text-neutral-800">{aiIdentifyResult.equipmentType}</span>
                </div>
              </div>

              {/* Grounded Visual Evidence */}
              {aiIdentifyResult.evidenceFromImages && (
                <div className="text-[11px] text-neutral-600 bg-white p-2.5 rounded-lg border border-[#E5E5E5]">
                  <span className="font-bold text-neutral-800 block text-[10px] uppercase font-mono mb-0.5">
                    Visual Evidence Observed:
                  </span>
                  {aiIdentifyResult.evidenceFromImages}
                </div>
              )}

              {/* Fields Needing Verification Warning */}
              {aiIdentifyResult.fieldsNeedingVerification && aiIdentifyResult.fieldsNeedingVerification.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-300 text-[11px] text-amber-900 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold block">Physical Nameplate Verification Recommended:</span>
                    <span className="text-amber-800">
                      {aiIdentifyResult.fieldsNeedingVerification.join("; ")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Product Images Grid */}
          {images.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#171717]">
                <span>Loaded Photographs ({images.length} of 5)</span>
                <span className="text-[11px] text-neutral-400 font-normal">
                  Reorder or set primary image for storefront card
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                {images.map((imgUrl, idx) => {
                  const isPrimary = idx === primaryImageIndex;
                  return (
                    <div
                      key={idx}
                      className={`relative rounded-xl border p-2 bg-white flex flex-col items-center group transition-all ${
                        isPrimary ? "border-[#F2C230] ring-2 ring-[#F2C230]/50" : "border-[#E5E5E5]"
                      }`}
                    >
                      <div className="w-full aspect-square rounded-lg bg-[#F5F5F5] overflow-hidden flex items-center justify-center mb-2">
                        <img
                          src={imgUrl}
                          alt={`Device view ${idx + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80";
                          }}
                        />
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

                      {/* Controls Row */}
                      <div className="w-full flex items-center justify-between text-xs pt-1 border-t border-[#E5E5E5]">
                        <div className="flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveImage(idx, "left")}
                            disabled={idx === 0}
                            title="Move left"
                            className="p-1 text-neutral-400 hover:text-black disabled:opacity-20 cursor-pointer"
                          >
                            <MoveLeft size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveImage(idx, "right")}
                            disabled={idx === images.length - 1}
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
                            className="text-[10px] font-bold text-neutral-600 hover:text-[#16803D] cursor-pointer"
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
                            title="Replace photo"
                            className="p-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          >
                            <RotateCcw size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            title="Remove photo"
                            className="p-1 text-neutral-400 hover:text-[#D92D32] cursor-pointer"
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

          {/* Add via direct URL */}
          <div className="pt-2 flex items-center gap-2">
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="Or paste image URL (https://...)..."
              className="flex-1 px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs"
            />
            <button
              type="button"
              onClick={handleAddImageUrl}
              className="px-4 py-2 bg-white border border-[#E5E5E5] hover:bg-[#F5F5F5] text-[#171717] rounded-lg text-xs font-bold cursor-pointer"
            >
              Add URL
            </button>
          </div>
        </div>

        {/* 2-COLUMN LAYOUT FOR PRODUCT EDITING */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ========================================================== */}
          {/* STEP 2: PRODUCT CLASSIFICATION                             */}
          {/* ========================================================== */}
          <div id="card-classification" className="bg-white rounded-xl border border-[#E5E5E5] p-5 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E5E5] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D]">Step 2</span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                  Product Classification
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F5F5F5] text-neutral-600 border border-[#E5E5E5]">
                Hierarchy L1–L3
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Primary Category */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  1. Primary Category <span className="text-rose-500">*</span>
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
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#171717] focus:outline-none focus:border-[#F2C230] cursor-pointer"
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
                  2. Subcategory <span className="text-rose-500">*</span>
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
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#171717] focus:outline-none focus:border-[#F2C230] disabled:opacity-50 disabled:bg-[#F5F5F5] cursor-pointer"
                >
                  <option value="">— Select Subcategory —</option>
                  {availableSubcategories.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Equipment Type */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  3. Verified Equipment Type <span className="text-rose-500">*</span>
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
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#171717] focus:outline-none focus:border-[#F2C230] disabled:opacity-50 disabled:bg-[#F5F5F5] cursor-pointer"
                >
                  <option value="">— Select Equipment Type —</option>
                  {availableEquipmentTypes.map((eq: any) => (
                    <option key={eq.id} value={eq.name}>
                      {eq.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-1.5">
                  Filtered based on DR.MEDEX catalogue taxonomy.
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 3: PRODUCT IDENTITY                                   */}
          {/* ========================================================== */}
          <div id="card-product-identity" className="bg-white rounded-xl border border-[#E5E5E5] p-5 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E5E5] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D]">Step 3</span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                  Product Identity
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRegenerateSuggestions}
                disabled={isGeneratingIdentity}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#D92D32] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isGeneratingIdentity ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                <span>Regenerate Suggestions</span>
              </button>
            </div>

            <div className="space-y-3">
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
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

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
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

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
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
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
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
              </div>

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
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F2C230]"
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
                    className={`w-full px-3.5 py-2 bg-white border rounded-lg text-xs font-mono font-bold text-[#171717] focus:outline-none ${
                      skuError ? "border-[#D92D32]" : "border-[#E5E5E5] focus:border-[#F2C230]"
                    }`}
                  />
                  {skuError && <p className="text-[10px] text-[#D92D32] mt-1 font-semibold">{skuError}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 4: PRICING & INVENTORY                                */}
          {/* ========================================================== */}
          <div id="card-pricing-inventory" className="bg-white rounded-xl border border-[#E5E5E5] p-5 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E5E5] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D]">Step 4</span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                  Pricing & Inventory
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F5F5F5] text-neutral-600 border border-[#E5E5E5]">
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
                    placeholder="e.g. 173020.32"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F2C230]"
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
                    placeholder="e.g. 152257.89"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs font-mono font-bold text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
              </div>

              {/* Automatic Calculated Discount Card */}
              <div className="p-3 rounded-lg border border-[#E5E5E5] bg-[#F5F5F5] flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-neutral-500 block">
                    Calculated Discount
                  </span>
                  <span className="text-base font-extrabold text-[#171717] font-mono">
                    {discountPercentage > 0 ? `${discountPercentage}% OFF` : "No Discount"}
                  </span>
                </div>
                {discountPercentage > 0 && (
                  <span className="px-2.5 py-1 text-xs font-bold bg-[#D92D32] text-white rounded">
                    SAVE ₹{calculatedSavings.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Stock Quantity & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Stock Quantity (Units) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => {
                      const s = parseInt(e.target.value, 10) || 0;
                      setStock(s);
                      setStockStatus(s <= 0 ? "OUT_OF_STOCK" : s <= 5 ? "LOW_STOCK" : "IN_STOCK");
                      markFieldEdited("stock");
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs font-mono font-bold text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Stock Status
                  </label>
                  <select
                    value={stockStatus}
                    onChange={(e) => {
                      setStockStatus(e.target.value as any);
                      markFieldEdited("stockStatus");
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs font-bold text-[#171717] focus:outline-none focus:border-[#F2C230] cursor-pointer"
                  >
                    <option value="IN_STOCK">In Stock</option>
                    <option value="LOW_STOCK">Low Stock</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>
              </div>

              {/* Live FX Currency Preview */}
              <div className="p-3 bg-white rounded-lg border border-[#E5E5E5] space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                  <span>International Currency Preview</span>
                  <span className="font-mono text-[10px] text-neutral-400">
                    {rateTimestamp ? new Date(rateTimestamp).toLocaleTimeString() : "Live FX"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {[
                    { code: "USD", symbol: "$", rate: exchangeRates.USD || 0.010379 },
                    { code: "EUR", symbol: "€", rate: exchangeRates.EUR || 0.009228 },
                    { code: "GBP", symbol: "£", rate: exchangeRates.GBP || 0.007854 },
                    { code: "AED", symbol: "AED ", rate: exchangeRates.AED || 0.038116 }
                  ].map((fx) => (
                    <div key={fx.code} className="p-1.5 bg-[#F5F5F5] rounded border border-neutral-200">
                      <span className="text-[9px] text-neutral-500 block">{fx.code}</span>
                      <span className="font-bold text-[#171717]">
                        {fx.symbol}{basePrice > 0 ? (basePrice * fx.rate).toFixed(2) : "0.00"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 5: DESCRIPTION & TECHNICAL SPECIFICATIONS             */}
          {/* ========================================================== */}
          <div id="card-description-specs" className="bg-white rounded-xl border border-[#E5E5E5] p-5 space-y-4 shadow-2xs lg:col-span-2">
            <div className="border-b border-[#E5E5E5] pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D]">Step 5</span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                  Description & Technical Specifications
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={aiTone}
                  onChange={(e) => setAiTone(e.target.value as any)}
                  className="px-2.5 py-1 bg-white border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#171717] cursor-pointer"
                >
                  <option value="CLINICAL">Clinical & Academic</option>
                  <option value="TECHNICAL">Professional Technical</option>
                  <option value="COMMERCIAL">Concise Commercial</option>
                  <option value="TENDER">Tender & Hospital OR</option>
                  <option value="SEO">High-Intent SEO</option>
                </select>
                <button
                  type="button"
                  onClick={handleGenerateAiDescription}
                  disabled={isAiGenerating}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#D92D32] hover:bg-[#B91C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isAiGenerating ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  <span>Generate Copy</span>
                </button>
              </div>
            </div>

            {/* Generated copy preview banner */}
            {aiGeneratedPreview && (
              <div className="p-3 bg-amber-50 rounded-xl border border-[#F2C230] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#171717]">Assistant Generated Copy Ready</span>
                  <button
                    type="button"
                    onClick={handleApplyAiGenerated}
                    className="px-3 py-1 bg-[#171717] text-white rounded text-xs font-bold hover:bg-black cursor-pointer"
                  >
                    Apply Generated Copy
                  </button>
                </div>
                <p className="text-xs text-neutral-700">{aiGeneratedPreview.shortDescription}</p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Descriptions & Lists */}
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Short Description / Executive Summary
                  </label>
                  <textarea
                    rows={2}
                    value={shortDescription}
                    onChange={(e) => {
                      setShortDescription(e.target.value);
                      markFieldEdited("shortDescription");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Concise clinical summary..."
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Full Product Description / Clinical Overview
                  </label>
                  <textarea
                    rows={6}
                    value={fullDescription}
                    onChange={(e) => {
                      setFullDescription(e.target.value);
                      markFieldEdited("fullDescription");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Detailed clinical specifications, medical ergonomics..."
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>

                {/* Key Features */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Key Features & Benefits ({keyFeatures.length})
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newFeatureText}
                      onChange={(e) => setNewFeatureText(e.target.value)}
                      placeholder="Add key feature..."
                      className="flex-1 px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newFeatureText.trim()) {
                          setKeyFeatures([...keyFeatures, newFeatureText.trim()]);
                          setNewFeatureText("");
                          markFieldEdited("keyFeatures");
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className="px-3 py-1.5 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {keyFeatures.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-[#F5F5F5] p-1.5 rounded border border-[#E5E5E5]">
                        <span className="truncate flex-1 pr-2 text-neutral-800">{f}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setKeyFeatures(keyFeatures.filter((_, idx) => idx !== i));
                            markFieldEdited("keyFeatures");
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

                {/* Applications & Intended Uses */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Intended Uses / Applications ({applications.length})
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newAppText}
                      onChange={(e) => setNewAppText(e.target.value)}
                      placeholder="e.g. Multi-speciality surgical operating theatre..."
                      className="flex-1 px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newAppText.trim()) {
                          setApplications([...applications, newAppText.trim()]);
                          setNewAppText("");
                          markFieldEdited("applications");
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className="px-3 py-1.5 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1 max-h-28 overflow-y-auto">
                    {applications.map((app, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-[#F5F5F5] p-1.5 rounded border border-[#E5E5E5]">
                        <span className="truncate flex-1 pr-2 text-neutral-800">{app}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setApplications(applications.filter((_, idx) => idx !== i));
                            markFieldEdited("applications");
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
              </div>

              {/* Right: Technical Specifications Table */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#171717]">
                    Technical Specifications Table ({specList.length})
                  </label>
                  <span className="text-[10px] text-neutral-400 font-mono">Structured Parameters</span>
                </div>

                {/* Add Spec Row */}
                <div className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    placeholder="Parameter (e.g. Input Voltage)"
                    value={newSpecKey}
                    onChange={(e) => setNewSpecKey(e.target.value)}
                    className="col-span-5 px-2.5 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 220)"
                    value={newSpecVal}
                    onChange={(e) => setNewSpecVal(e.target.value)}
                    className="col-span-4 px-2.5 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={newSpecUnit}
                    onChange={(e) => setNewSpecUnit(e.target.value)}
                    className="col-span-2 px-2.5 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newSpecKey.trim() && newSpecVal.trim()) {
                        setSpecList([
                          ...specList,
                          {
                            key: newSpecKey.trim(),
                            value: newSpecVal.trim(),
                            unit: newSpecUnit.trim() || undefined,
                            note: newSpecNote.trim() || undefined
                          }
                        ]);
                        setNewSpecKey("");
                        setNewSpecVal("");
                        setNewSpecUnit("");
                        setNewSpecNote("");
                        markFieldEdited("specList");
                        setHasUnsavedChanges(true);
                      }
                    }}
                    className="col-span-1 flex items-center justify-center bg-[#171717] hover:bg-black text-white rounded-lg cursor-pointer"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Specs Table */}
                <div className="border border-[#E5E5E5] rounded-lg overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F5F5F5] border-b border-[#E5E5E5] text-neutral-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5 w-5/12">Parameter</th>
                        <th className="p-2.5 w-4/12">Value</th>
                        <th className="p-2.5 w-2/12">Unit</th>
                        <th className="p-2.5 w-1/12 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E5]">
                      {specList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-neutral-400">
                            No specifications populated yet. Add parameter-value pairs or use Smart Product Assistant.
                          </td>
                        </tr>
                      ) : (
                        specList.map((s, idx) => (
                          <tr key={idx} className="hover:bg-[#F5F5F5]/50">
                            <td className="p-2.5 font-bold text-[#171717]">{s.key}</td>
                            <td className="p-2.5 font-mono text-neutral-800">{s.value}</td>
                            <td className="p-2.5 text-neutral-500">{s.unit || "—"}</td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setSpecList(specList.filter((_, i) => i !== idx));
                                  markFieldEdited("specList");
                                  setHasUnsavedChanges(true);
                                }}
                                className="text-neutral-400 hover:text-[#D92D32]"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Package Contents */}
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Package Contents / Accessories ({packageContents.length})
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newPackageText}
                      onChange={(e) => setNewPackageText(e.target.value)}
                      placeholder="e.g. Sterilizable handle core, power cable..."
                      className="flex-1 px-3 py-1.5 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newPackageText.trim()) {
                          setPackageContents([...packageContents, newPackageText.trim()]);
                          setNewPackageText("");
                          markFieldEdited("packageContents");
                          setHasUnsavedChanges(true);
                        }
                      }}
                      className="px-3 py-1.5 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {packageContents.map((pkg, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-[#F5F5F5] p-1.5 rounded border border-[#E5E5E5]">
                        <span className="truncate flex-1 pr-2 text-neutral-800">{pkg}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPackageContents(packageContents.filter((_, idx) => idx !== i));
                            markFieldEdited("packageContents");
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
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 6: CLASSIFICATION, DOCUMENTATION & SEO                */}
          {/* ========================================================== */}
          <div id="card-documentation-seo" className="bg-white rounded-xl border border-[#E5E5E5] p-5 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E5E5] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D]">Step 6</span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                  Documentation & SEO
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#F5F5F5] text-neutral-600 border border-[#E5E5E5]">
                Regulatory & Search
              </span>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Regulatory Classification
                  </label>
                  <select
                    value={regulatoryClass}
                    onChange={(e) => {
                      setRegulatoryClass(e.target.value);
                      markFieldEdited("regulatoryClass");
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs font-medium text-[#171717] focus:outline-none focus:border-[#F2C230] cursor-pointer"
                  >
                    <option value="Class I (General Medical)">Class I (General Medical)</option>
                    <option value="Class IIa (MDR 2017/745)">Class IIa (MDR 2017/745)</option>
                    <option value="Class IIb (High-Risk Surgical)">Class IIb (High-Risk Surgical)</option>
                    <option value="Class III (Critical Life-Support)">Class III (Critical Life-Support)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">
                    Verification Status
                  </label>
                  <select
                    value={certificationStatus}
                    onChange={(e) => {
                      setCertificationStatus(e.target.value);
                      markFieldEdited("certificationStatus");
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs font-bold text-[#171717] focus:outline-none focus:border-[#F2C230] cursor-pointer"
                  >
                    <option value="Claimed">Claimed (Self-Declared)</option>
                    <option value="Pending Verification">Pending Document Audit</option>
                    <option value="Verified">Verified by Quality Team</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Certificate Number</label>
                  <input
                    type="text"
                    value={certificateNumber}
                    onChange={(e) => {
                      setCertificateNumber(e.target.value);
                      markFieldEdited("certificateNumber");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. MED-ISO-9948201"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#171717] mb-1">Issuing Body</label>
                  <input
                    type="text"
                    value={issuingOrg}
                    onChange={(e) => {
                      setIssuingOrg(e.target.value);
                      markFieldEdited("issuingOrg");
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g. TÜV SÜD Medical Compliance"
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
              </div>

              {/* URL Slug */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">
                  URL Slug <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2 bg-[#F5F5F5] border border-r-0 border-[#E5E5E5] rounded-l-lg text-xs text-neutral-500 font-mono">
                    /product/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-"));
                      markFieldEdited("slug");
                      setHasUnsavedChanges(true);
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-[#E5E5E5] rounded-r-lg text-xs font-mono text-[#171717] focus:outline-none focus:border-[#F2C230]"
                  />
                </div>
              </div>

              {/* Meta Title & Description */}
              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">Meta Title</label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => {
                    setMetaTitle(e.target.value);
                    markFieldEdited("metaTitle");
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#171717] mb-1">Meta Description</label>
                <textarea
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => {
                    setMetaDescription(e.target.value);
                    markFieldEdited("metaDescription");
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2 bg-white border border-[#E5E5E5] rounded-lg text-xs text-[#171717] focus:outline-none focus:border-[#F2C230]"
                />
              </div>

              {/* Search Result Snippet Preview */}
              <div className="p-3 bg-[#F5F5F5] rounded-lg border border-[#E5E5E5] space-y-1">
                <span className="text-[10px] font-bold uppercase text-neutral-500 block">Search Snippet Preview</span>
                <div className="text-xs font-semibold text-blue-700 truncate">
                  {metaTitle || title || "Product Title"}
                </div>
                <div className="text-[11px] font-mono text-emerald-700 truncate">
                  https://www.drmedex.com/product/{slug || "url-slug"}
                </div>
                <div className="text-[11px] text-neutral-600 line-clamp-2">
                  {metaDescription || shortDescription || "Discover medical equipment engineered for hospital and surgical excellence."}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================== */}
          {/* STEP 7: PUBLISHING & VISIBILITY                            */}
          {/* ========================================================== */}
          <div id="card-publishing-visibility" className="bg-white rounded-xl border border-[#E5E5E5] p-5 space-y-4 shadow-2xs">
            <div className="border-b border-[#E5E5E5] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#16803D]">Step 7</span>
                <h3 className="text-sm font-bold text-[#171717] uppercase tracking-wider">
                  Publishing & Visibility
                </h3>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                status === "ACTIVE" ? "bg-emerald-50 text-[#16803D]" : status === "DRAFT" ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-neutral-700"
              }`}>
                {status}
              </span>
            </div>

            <div className="space-y-4">
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
                  className="w-full px-3.5 py-2.5 bg-white border border-[#E5E5E5] rounded-lg text-xs font-bold text-[#171717] focus:outline-none focus:border-[#F2C230] cursor-pointer"
                >
                  <option value="DRAFT">Draft (Internal Only, Hidden from Public)</option>
                  <option value="ACTIVE">Active (Live in Storefront)</option>
                  <option value="INACTIVE">Inactive (Hidden from Storefront)</option>
                  <option value="ARCHIVED">Archived (Historical Record)</option>
                </select>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-[#E5E5E5]">
                <label className="flex items-center gap-2.5 text-xs text-[#171717] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => {
                      setIsFeatured(e.target.checked);
                      markFieldEdited("isFeatured");
                      setHasUnsavedChanges(true);
                    }}
                    className="w-4 h-4 rounded border-[#E5E5E5] text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
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
                    className="w-4 h-4 rounded border-[#E5E5E5] text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
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
                    className="w-4 h-4 rounded border-[#E5E5E5] text-[#16803D] focus:ring-[#16803D] accent-[#16803D]"
                  />
                  <span className="font-semibold">Category Grid Visibility</span>
                </label>
              </div>

              <div className="p-3 bg-[#F5F5F5] rounded-lg border border-[#E5E5E5] text-xs text-neutral-600">
                DR.MEDEX catalogue safety: AI analysis populates suggestions without automatically publishing or saving to the storefront.
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* PERSISTENT STICKY BOTTOM SAVE ACTION BAR                     */}
        {/* ============================================================ */}
        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-xs py-4 px-6 border-t border-[#E5E5E5] shadow-lg rounded-xl flex items-center justify-between flex-wrap gap-4">
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
              className="px-4 py-2 border border-[#E5E5E5] rounded-lg text-xs font-bold text-neutral-700 bg-white hover:bg-[#F5F5F5] transition-colors"
            >
              Discard Changes
            </Link>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-8 py-2.5 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              <span>{isSaving ? "Saving Product..." : isEditMode ? "Save Changes" : "Create Product"}</span>
            </button>
          </div>
        </div>
      </form>

      {/* ============================================================ */}
      {/* REGENERATE IDENTITY SUGGESTIONS MODAL                        */}
      {/* ============================================================ */}
      {showIdentityModal && proposedIdentity && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 border border-[#E5E5E5] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#D92D32]" />
                <h3 className="text-sm font-bold text-[#171717]">Proposed Product Identity</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIdentityModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-[#F5F5F5] text-neutral-400 hover:text-black flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-bold text-neutral-500 block text-[10px] uppercase font-mono">Product Name:</span>
                <span className="font-bold text-neutral-900">{proposedIdentity.productName}</span>
              </div>
              <div>
                <span className="font-bold text-neutral-500 block text-[10px] uppercase font-mono">Storefront Title:</span>
                <span className="text-neutral-900">{proposedIdentity.title}</span>
              </div>
              <div>
                <span className="font-bold text-neutral-500 block text-[10px] uppercase font-mono">Brand:</span>
                <span className="text-neutral-900">{proposedIdentity.brand}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowIdentityModal(false)}
                className="px-4 py-2 border border-[#E5E5E5] rounded-lg text-xs font-bold text-neutral-700 bg-white hover:bg-[#F5F5F5] cursor-pointer"
              >
                Cancel / Reject
              </button>
              <button
                type="button"
                onClick={handleApplyProposedIdentity}
                className="px-6 py-2 bg-[#171717] hover:bg-black text-white rounded-lg text-xs font-bold cursor-pointer shadow-xs"
              >
                Apply Suggestions
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};
export default AdminProductEditorPage;
