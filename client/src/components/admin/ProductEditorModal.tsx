import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  RefreshCw,
  Eye,
  Sliders,
  FileText,
  DollarSign,
  Package,
  Layers,
  ShieldCheck,
  Globe,
  Tag,
  Star,
  CheckCircle2,
  Copy
} from "lucide-react";
import { Product, Category } from "../../types";
import { useAdminAuth } from "../../context/AdminAuthContext";

interface ProductEditorModalProps {
  product: Product | null; // null means creating a new product
  isOpen: boolean;
  onClose: () => void;
  onSaved: (savedProduct: Product) => void;
  categories: Category[];
}

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({
  product,
  isOpen,
  onClose,
  onSaved,
  categories
}) => {
  const { adminFetch } = useAdminAuth();

  // Active Tab inside modal
  const [activeTab, setActiveTab] = useState<
    "general" | "pricing" | "content" | "specs" | "media" | "inventory" | "seo" | "ai"
  >("general");

  // Form Fields State
  const [title, setTitle] = useState("");
  const [sku, setSku] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [category, setCategory] = useState("ot-lights");
  const [subcategory, setSubcategory] = useState("general");
  const [productType, setProductType] = useState("Medical Equipment");
  const [brand, setBrand] = useState("DR.MEDEX");
  const [status, setStatus] = useState<"ACTIVE" | "DRAFT" | "ARCHIVED">("ACTIVE");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);

  // Pricing & Inventory
  const [basePrice, setBasePrice] = useState(1500);
  const [regularPrice, setRegularPrice] = useState(1800);
  const [salePrice, setSalePrice] = useState<number | undefined>(undefined);
  const [discountPercentage, setDiscountPercentage] = useState<number | undefined>(undefined);
  const [stock, setStock] = useState(10);
  const [lowStockThreshold, setLowStockThreshold] = useState(2);
  const [stockStatus, setStockStatus] = useState<"IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK">("IN_STOCK");

  // Descriptions & Bullets
  const [shortDescription, setShortDescription] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [applications, setApplications] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState("");
  const [newBenefitText, setNewBenefitText] = useState("");
  const [newAppText, setNewAppText] = useState("");

  // Technical Specifications (Array of { key, value } for easy reordering)
  const [specList, setSpecList] = useState<{ key: string; value: string }[]>([]);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecVal, setNewSpecVal] = useState("");

  // Certifications & Policies
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertText, setNewCertText] = useState("");
  const [warranty, setWarranty] = useState("2-Year Clinical Warranty");
  const [shippingInformation, setShippingInformation] = useState("Express Air Freight (3-5 Days)");
  const [packageContents, setPackageContents] = useState<string[]>([]);
  const [newPkgText, setNewPkgText] = useState("");

  // Media
  const [images, setImages] = useState<string[]>([]);
  const [altText, setAltText] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // SEO
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");

  // AI Generator state
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiGeneratedData, setAiGeneratedData] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // General form feedback
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Populate data when modal opens or product changes
  useEffect(() => {
    if (product) {
      setTitle(product.title || product.productName || "");
      setSku(product.sku || "");
      setModelNumber(product.modelNumber || "");
      setCategory(product.category || "ot-lights");
      setSubcategory(product.subcategory || "general");
      setProductType(product.productType || "Medical Equipment");
      setBrand(product.brand || "DR.MEDEX");
      setStatus(product.status || "ACTIVE");
      setIsFeatured(!!(product.isFeatured || product.featured));
      setIsBestSeller(!!(product.isBestSeller || product.bestseller));

      setBasePrice(product.basePrice || 0);
      setRegularPrice(product.regularPrice || product.originalPrice || Math.round((product.basePrice || 0) * 1.2));
      setSalePrice(product.salePrice);
      setDiscountPercentage(product.discountPercentage);
      setStock(product.stock ?? 10);
      setLowStockThreshold(product.lowStockThreshold ?? 2);
      setStockStatus(product.stockStatus || (product.stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"));

      setShortDescription(product.shortDescription || "");
      setFullDescription(product.fullDescription || product.overview || "");
      setFeatures(Array.isArray(product.features) ? [...product.features] : []);
      setBenefits(Array.isArray(product.benefits) ? [...product.benefits] : []);
      setApplications(Array.isArray(product.applications) ? [...product.applications] : []);

      // Specifications
      const specsObj = product.technicalSpecifications || product.specifications || {};
      const specsArr = Object.entries(specsObj).map(([k, v]) => ({ key: k, value: String(v) }));
      setSpecList(specsArr);

      setCertifications(Array.isArray(product.certifications) ? [...product.certifications] : ["ISO 13485:2016", "CE Marked"]);
      setWarranty(product.warranty || "2-Year Clinical Warranty");
      setShippingInformation(product.shippingInformation || product.shippingLeadTime || "Express Air Freight (3-5 Days)");
      setPackageContents(Array.isArray(product.packageContents) ? [...product.packageContents] : []);

      setImages(Array.isArray(product.images) ? [...product.images] : []);
      setAltText(product.altText || product.title || "");

      setSlug(product.slug || "");
      setMetaTitle(product.metaTitle || product.title || "");
      setMetaDescription(product.metaDescription || product.shortDescription || "");
      setKeywords(Array.isArray(product.keywords) ? [...product.keywords] : []);
    } else {
      // New product defaults
      setTitle("");
      setSku(`DRM-${Math.floor(1000 + Math.random() * 9000)}`);
      setModelNumber("");
      setCategory(categories[0]?.id || "ot-lights");
      setSubcategory("general");
      setProductType("Medical Equipment");
      setBrand("DR.MEDEX");
      setStatus("ACTIVE");
      setIsFeatured(false);
      setIsBestSeller(false);

      setBasePrice(1200);
      setRegularPrice(1440);
      setSalePrice(undefined);
      setDiscountPercentage(undefined);
      setStock(15);
      setLowStockThreshold(2);
      setStockStatus("IN_STOCK");

      setShortDescription("");
      setFullDescription("");
      setFeatures([]);
      setBenefits([]);
      setApplications([]);
      setSpecList([
        { key: "Operating Power", value: "110-240V AC 50/60Hz" },
        { key: "Build Standard", value: "Medical Grade Anti-Microbial" }
      ]);
      setCertifications(["ISO 13485:2016", "CE Marked"]);
      setWarranty("2-Year Clinical Warranty");
      setShippingInformation("Express Air Freight (3-5 Days)");
      setPackageContents(["Main Device Unit", "Operating Manual", "Power Cord"]);
      setImages([]);
      setAltText("");
      setSlug("");
      setMetaTitle("");
      setMetaDescription("");
      setKeywords([]);
    }

    setAiGeneratedData(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setActiveTab("general");
  }, [product, isOpen, categories]);

  if (!isOpen) return null;

  // Auto-generate slug from title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!product) {
      const generatedSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setSlug(generatedSlug);
      setMetaTitle(`${val} | DR.MEDEX Global`);
    }
  };

  // Spec management
  const addSpec = () => {
    if (!newSpecKey.trim()) return;
    setSpecList([...specList, { key: newSpecKey.trim(), value: newSpecVal.trim() }]);
    setNewSpecKey("");
    setNewSpecVal("");
  };

  const removeSpec = (index: number) => {
    setSpecList(specList.filter((_, i) => i !== index));
  };

  const moveSpec = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= specList.length) return;
    const updated = [...specList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSpecList(updated);
  };

  // Media reordering & removal
  const setPrimaryImage = (index: number) => {
    if (index === 0) return;
    const updated = [...images];
    const [selected] = updated.splice(index, 1);
    updated.unshift(selected);
    setImages(updated);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const moveImage = (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setImages(updated);
  };

  // File upload simulation & base64 preview
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) {
        alert("Image exceeds maximum 10MB limit.");
        setIsUploadingImage(false);
        return;
      }

      // Convert to base64 preview / payload
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await adminFetch("/api/admin/media/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productId: product?.id || "temp-new-product",
              filename: file.name,
              dataUrl: base64Data
            })
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.image?.url) {
              setImages([...images, data.image.url]);
            } else {
              setImages([...images, base64Data]);
            }
          } else {
            setImages([...images, base64Data]);
          }
        } catch {
          setImages([...images, base64Data]);
        } finally {
          setIsUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload error:", err);
      setIsUploadingImage(false);
    }
  };

  // AI Generator invocation
  const handleGenerateAi = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      // Build specs object from current specList
      const specsObj: Record<string, string> = {};
      specList.forEach((s) => {
        if (s.key) specsObj[s.key] = s.value;
      });

      const res = await adminFetch("/api/admin/products/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          modelNumber,
          category,
          specifications: specsObj,
          features,
          applications
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.generated) {
        setAiGeneratedData(data.generated);
      } else {
        setAiError(data.message || "Failed to generate AI catalogue description.");
      }
    } catch {
      setAiError("Network connection error communicating with AI generation service.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleApplyAiData = () => {
    if (!aiGeneratedData) return;
    if (aiGeneratedData.shortDescription) setShortDescription(aiGeneratedData.shortDescription);
    if (aiGeneratedData.fullDescription) setFullDescription(aiGeneratedData.fullDescription);
    if (Array.isArray(aiGeneratedData.features) && aiGeneratedData.features.length > 0) {
      setFeatures(aiGeneratedData.features);
    }
    if (Array.isArray(aiGeneratedData.benefits) && aiGeneratedData.benefits.length > 0) {
      setBenefits(aiGeneratedData.benefits);
    }
    if (Array.isArray(aiGeneratedData.applications) && aiGeneratedData.applications.length > 0) {
      setApplications(aiGeneratedData.applications);
    }
    if (aiGeneratedData.metaTitle) setMetaTitle(aiGeneratedData.metaTitle);
    if (aiGeneratedData.metaDescription) setMetaDescription(aiGeneratedData.metaDescription);
    if (Array.isArray(aiGeneratedData.keywords)) setKeywords(aiGeneratedData.keywords);

    setSuccessMessage("AI Generated Content applied to product fields. Review and click Save Changes.");
    setActiveTab("content");
  };

  // Save product (PUT or POST)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Product Name / Title is required.");
      setActiveTab("general");
      return;
    }
    if (!sku.trim()) {
      setErrorMessage("SKU is required.");
      setActiveTab("general");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Convert specList array to specifications object
    const specifications: Record<string, string> = {};
    specList.forEach((s) => {
      if (s.key.trim()) specifications[s.key.trim()] = s.value.trim();
    });

    const payload: Partial<Product> = {
      title,
      productName: title,
      sku,
      modelNumber,
      category,
      subcategory,
      productType,
      brand,
      status,
      isFeatured,
      isBestSeller,
      featured: isFeatured,
      bestseller: isBestSeller,
      basePrice: Number(basePrice),
      regularPrice: Number(regularPrice),
      originalPrice: Number(regularPrice),
      salePrice: salePrice ? Number(salePrice) : undefined,
      discountPercentage: discountPercentage ? Number(discountPercentage) : undefined,
      stock: Number(stock),
      lowStockThreshold: Number(lowStockThreshold),
      stockStatus,
      shortDescription,
      overview: fullDescription,
      fullDescription,
      features,
      benefits,
      applications,
      specifications,
      technicalSpecifications: specifications,
      certifications,
      warranty,
      shippingInformation,
      packageContents,
      images,
      primaryImage: images[0] || "",
      galleryImages: images.slice(1),
      altText,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      metaTitle,
      metaDescription,
      keywords
    };

    try {
      const isEdit = !!product?.id;
      const url = isEdit ? `/api/admin/products/${product.id}` : `/api/admin/products`;
      const method = isEdit ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success && data.product) {
        setSuccessMessage("Product successfully saved to catalogue.");
        setTimeout(() => {
          onSaved(data.product);
          onClose();
        }, 600);
      } else {
        setErrorMessage(data.message || "Failed to save product to database.");
      }
    } catch {
      setErrorMessage("Network error while persisting product data.");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "general", label: "General Info", icon: Layers },
    { id: "pricing", label: "Pricing & Stock", icon: DollarSign },
    { id: "content", label: "Descriptions", icon: FileText },
    { id: "specs", label: "Technical Specs", icon: Sliders },
    { id: "media", label: `Media (${images.length})`, icon: ImageIcon },
    { id: "inventory", label: "Certifications", icon: ShieldCheck },
    { id: "seo", label: "SEO & URL", icon: Globe },
    { id: "ai", label: "AI Description", icon: Sparkles, highlight: true }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold shadow-md">
              DR.
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>{product ? "Edit Medical Equipment" : "New Catalogue Product"}</span>
                {product && (
                  <span className="text-3xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    SKU: {product.sku}
                  </span>
                )}
              </h2>
              <p className="text-2xs text-slate-400">
                Single Source of Truth Catalogue Database
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-2 overflow-x-auto py-2 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? tab.highlight
                      ? "bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-xs"
                      : "bg-slate-900 text-white shadow-xs"
                    : tab.highlight
                    ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                <Icon size={14} className={isActive ? "text-white" : tab.highlight ? "text-red-600" : "text-slate-500"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Modal Form Body */}
        <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: GENERAL */}
          {activeTab === "general" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Product Title / Name *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. Ceiling Mounted LED OT Light Single Dome Hex Design"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="DRM-HEX-90"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Model Number
                  </label>
                  <input
                    type="text"
                    value={modelNumber}
                    onChange={(e) => setModelNumber(e.target.value)}
                    placeholder="MI HEX 90"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Brand Identity
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-red-600 focus:ring-2 focus:ring-red-500 focus:outline-none bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none bg-white capitalize"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Subcategory
                  </label>
                  <input
                    type="text"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="e.g. Single Dome OT Lights"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Publication Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-red-500 focus:outline-none bg-white"
                  >
                    <option value="ACTIVE">ACTIVE (Published to Store)</option>
                    <option value="DRAFT">DRAFT (Hidden from Store)</option>
                    <option value="ARCHIVED">ARCHIVED (Discontinued)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Mark as Featured Product (Homepage Showcase)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={isBestSeller}
                    onChange={(e) => setIsBestSeller(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  <span>Mark as Bestseller</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: PRICING & INVENTORY */}
          {activeTab === "pricing" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Base USD Currency Pricing
                </h3>
                <p className="text-3xs text-slate-500 mb-4">
                  DR.MEDEX automatically converts this base USD price into local currency (INR, EUR, GBP, CAD) for international buyers.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">
                      Base Price (USD) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={basePrice}
                        onChange={(e) => setBasePrice(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">
                      Regular / MSRP (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={regularPrice}
                        onChange={(e) => setRegularPrice(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">
                      Sale Price (USD)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500 font-bold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={salePrice || ""}
                        onChange={(e) => setSalePrice(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Optional"
                        className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">
                      Discount %
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPercentage || ""}
                      onChange={(e) => setDiscountPercentage(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="e.g. 15"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                  Inventory & Stock Tracking
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">
                      Units In Stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={stock}
                      onChange={(e) => {
                        const s = Number(e.target.value);
                        setStock(s);
                        if (s <= 0) setStockStatus("OUT_OF_STOCK");
                        else if (s <= lowStockThreshold) setStockStatus("LOW_STOCK");
                        else setStockStatus("IN_STOCK");
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono font-bold focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">
                      Inventory Status
                    </label>
                    <select
                      value={stockStatus}
                      onChange={(e) => setStockStatus(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold focus:ring-2 focus:ring-red-500 bg-white"
                    >
                      <option value="IN_STOCK">IN STOCK</option>
                      <option value="LOW_STOCK">LOW STOCK</option>
                      <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DESCRIPTIONS & BULLETS */}
          {activeTab === "content" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase text-slate-700">
                    Short Description (Product Card & Header Summary)
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ai")}
                    className="flex items-center gap-1 text-3xs font-bold text-red-600 hover:text-red-700"
                  >
                    <Sparkles size={12} />
                    <span>Generate with AI</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="Concise overview of product capabilities..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Full Clinical Description / Overview
                </label>
                <textarea
                  rows={5}
                  value={fullDescription}
                  onChange={(e) => setFullDescription(e.target.value)}
                  placeholder="Comprehensive clinical details, engineering standards, surgical applications..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              {/* Key Features List */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Key Features ({features.length})
                </label>
                <div className="space-y-2">
                  {features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => {
                          const updated = [...features];
                          updated[idx] = e.target.value;
                          setFeatures(updated);
                        }}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setFeatures(features.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    placeholder="Add new feature bullet..."
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newFeatureText.trim()) {
                          setFeatures([...features, newFeatureText.trim()]);
                          setNewFeatureText("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newFeatureText.trim()) {
                        setFeatures([...features, newFeatureText.trim()]);
                        setNewFeatureText("");
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Applications List */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Clinical Applications ({applications.length})
                </label>
                <div className="space-y-2">
                  {applications.map((app, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={app}
                        onChange={(e) => {
                          const updated = [...applications];
                          updated[idx] = e.target.value;
                          setApplications(updated);
                        }}
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setApplications(applications.filter((_, i) => i !== idx))}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newAppText}
                    onChange={(e) => setNewAppText(e.target.value)}
                    placeholder="e.g. General Surgery, Orthopedic Theatres..."
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newAppText.trim()) {
                          setApplications([...applications, newAppText.trim()]);
                          setNewAppText("");
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newAppText.trim()) {
                        setApplications([...applications, newAppText.trim()]);
                        setNewAppText("");
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
                  >
                    + Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TECHNICAL SPECIFICATIONS TABLE */}
          {activeTab === "specs" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-700">
                    Dynamic Technical Specifications Table
                  </h3>
                  <p className="text-3xs text-slate-500">
                    Exact engineering parameters. Reorder or edit rows dynamically.
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-3xs">
                      <th className="p-3 w-12 text-center">Order</th>
                      <th className="p-3 w-1/3">Parameter</th>
                      <th className="p-3">Specification Value</th>
                      <th className="p-3 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {specList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-slate-400">
                          No specifications defined. Use the input below to add parameters.
                        </td>
                      </tr>
                    ) : (
                      specList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="p-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => moveSpec(idx, "up")}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-20"
                              >
                                <ArrowUp size={12} />
                              </button>
                              <button
                                type="button"
                                disabled={idx === specList.length - 1}
                                onClick={() => moveSpec(idx, "down")}
                                className="text-slate-400 hover:text-slate-700 disabled:opacity-20"
                              >
                                <ArrowDown size={12} />
                              </button>
                            </div>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.key}
                              onChange={(e) => {
                                const updated = [...specList];
                                updated[idx].key = e.target.value;
                                setSpecList(updated);
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:border-red-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.value}
                              onChange={(e) => {
                                const updated = [...specList];
                                updated[idx].value = e.target.value;
                                setSpecList(updated);
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:border-red-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeSpec(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                              title="Delete Specification Row"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add New Specification Row */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 w-full">
                  <label className="block text-3xs font-bold uppercase text-slate-600 mb-1">
                    New Parameter Name
                  </label>
                  <input
                    type="text"
                    value={newSpecKey}
                    onChange={(e) => setNewSpecKey(e.target.value)}
                    placeholder="e.g. Intensity / Lux Output"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-3xs font-bold uppercase text-slate-600 mb-1">
                    Specification Value
                  </label>
                  <input
                    type="text"
                    value={newSpecVal}
                    onChange={(e) => setNewSpecVal(e.target.value)}
                    placeholder="e.g. 160,000 Lux @ 1 Meter"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSpec();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={addSpec}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 whitespace-nowrap shadow-xs"
                >
                  + Add Specification
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: MEDIA GALLERY */}
          {activeTab === "media" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase text-slate-700">
                    Product Image Gallery ({images.length} Images)
                  </h3>
                  <p className="text-3xs text-slate-500">
                    The first image is the Primary storefront image. Reorder, replace, or add images.
                  </p>
                </div>

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs">
                  <Upload size={14} />
                  <span>{isUploadingImage ? "Processing..." : "Upload New Image"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Alt Text Setting */}
              <div>
                <label className="block text-2xs font-bold uppercase text-slate-600 mb-1">
                  Image Alt Text (Accessibility & SEO)
                </label>
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Descriptive image label..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              {/* Gallery Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {images.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className={`relative rounded-2xl overflow-hidden border-2 bg-slate-50 group flex flex-col justify-between ${
                      idx === 0 ? "border-red-600 ring-2 ring-red-100" : "border-slate-200"
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden bg-slate-100 flex items-center justify-center relative">
                      <img
                        src={imgUrl}
                        alt={`Product ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80";
                        }}
                      />
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-red-600 text-white text-3xs font-extrabold shadow-sm">
                          PRIMARY
                        </span>
                      )}
                      <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-3xs font-mono">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Image Action Bar */}
                    <div className="p-2 bg-white border-t border-slate-100 flex items-center justify-between text-slate-500">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveImage(idx, "left")}
                          className="p-1 hover:text-slate-900 disabled:opacity-20"
                          title="Move Left"
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={idx === images.length - 1}
                          onClick={() => moveImage(idx, "right")}
                          className="p-1 hover:text-slate-900 disabled:opacity-20"
                          title="Move Right"
                        >
                          →
                        </button>
                      </div>

                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => setPrimaryImage(idx)}
                          className="text-3xs font-bold text-[#111111] hover:text-[#1F7A4D] hover:underline"
                        >
                          Make Primary
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        title="Remove Image"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: CERTIFICATIONS & POLICIES */}
          {activeTab === "inventory" && (
            <div className="space-y-4">
              {/* Certifications */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <label className="block text-xs font-bold uppercase text-slate-700">
                  Regulatory Standards & Certifications
                </label>
                <div className="flex flex-wrap gap-2">
                  {certifications.map((cert, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 shadow-2xs"
                    >
                      <span>{cert}</span>
                      <button
                        type="button"
                        onClick={() => setCertifications(certifications.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newCertText}
                    onChange={(e) => setNewCertText(e.target.value)}
                    placeholder="e.g. ISO 13485:2016, CE Medical Device Directive"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newCertText.trim()) {
                        setCertifications([...certifications, newCertText.trim()]);
                        setNewCertText("");
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
                  >
                    + Add Cert
                  </button>
                </div>
              </div>

              {/* Warranty & Shipping policies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Warranty Statement
                  </label>
                  <input
                    type="text"
                    value={warranty}
                    onChange={(e) => setWarranty(e.target.value)}
                    placeholder="e.g. 2-Year Full OEM Warranty"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Shipping & Lead Time
                  </label>
                  <input
                    type="text"
                    value={shippingInformation}
                    onChange={(e) => setShippingInformation(e.target.value)}
                    placeholder="e.g. Express Air Freight (3-5 Days)"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SEO */}
          {activeTab === "seo" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  URL Canonical Slug
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs text-slate-500 font-mono">
                    /product/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-r-xl text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Product Page Meta Title"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                  Meta Description
                </label>
                <textarea
                  rows={3}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Search engine snippet..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>
          )}

          {/* TAB 8: AI DESCRIPTION GENERATOR */}
          {activeTab === "ai" && (
            <div className="space-y-5">
              <div className="p-4 bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border border-red-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-red-700 font-black text-sm">
                    <Sparkles size={18} />
                    <span>AI Product Description Generator</span>
                  </div>
                  <p className="text-2xs text-slate-600 mt-1 max-w-xl">
                    Uses current product title, category, and technical specifications as factual grounding.
                    Never invents unverified medical claims, certifications, or performance numbers.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={handleGenerateAi}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition-all shrink-0"
                >
                  {isGeneratingAi ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{aiGeneratedData ? "Regenerate Content" : "Generate Description with AI"}</span>
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl">
                  {aiError}
                </div>
              )}

              {aiGeneratedData && (
                <div className="space-y-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span className="text-xs font-bold text-slate-900">
                        Generated Content Ready for Review
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyAiData}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                      >
                        Insert into Product Fields
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-3xs font-bold uppercase text-slate-500 block mb-1">
                      Proposed Short Description:
                    </span>
                    <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {aiGeneratedData.shortDescription}
                    </p>
                  </div>

                  <div>
                    <span className="text-3xs font-bold uppercase text-slate-500 block mb-1">
                      Proposed Full Description:
                    </span>
                    <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-line">
                      {aiGeneratedData.fullDescription}
                    </p>
                  </div>

                  {aiGeneratedData.features && (
                    <div>
                      <span className="text-3xs font-bold uppercase text-slate-500 block mb-1">
                        Synthesized Features ({aiGeneratedData.features.length}):
                      </span>
                      <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {aiGeneratedData.features.map((f: string, i: number) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {aiGeneratedData.benefits && (
                    <div>
                      <span className="text-3xs font-bold uppercase text-slate-500 block mb-1">
                        Benefits ({aiGeneratedData.benefits.length}):
                      </span>
                      <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {aiGeneratedData.benefits.map((b: string, i: number) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Footer Action Bar */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white sticky bottom-0">
            <div className="text-3xs text-slate-500">
              {product ? `Editing Product ID: ${product.id}` : "Creating New Product Record"}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-900/20 disabled:opacity-50 transition-all"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Product...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Catalogue Product</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
