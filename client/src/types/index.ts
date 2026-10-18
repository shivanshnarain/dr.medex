export interface Product {
  id: string;
  slug: string;
  title: string;
  productName?: string;
  sku: string;
  modelNumber?: string;
  brand: string;
  category: string;
  categoryName?: string;
  subcategory: string;
  subcategoryName?: string;
  productType?: string;
  status?: "ACTIVE" | "INACTIVE" | "DRAFT" | "ARCHIVED";
  basePrice: number;
  regularPrice?: number;
  salePrice?: number;
  originalPrice?: number;
  discountPercentage?: number;
  baseCurrency?: string;
  stock: number;
  stockStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  lowStockThreshold?: number;
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  featured?: boolean;
  bestseller?: boolean;
  newProduct?: boolean;
  images: string[];
  primaryImage?: string;
  galleryImages?: string[];
  thumbnailImages?: string[];
  technicalImages?: string[];
  altText?: string;
  shortDescription: string;
  overview: string;
  fullDescription?: string;
  features: string[];
  keyFeatures?: string[];
  engineeringHighlights?: string[];
  specifications: Record<string, string>;
  technicalSpecifications?: Record<string, string>;
  benefits?: string[];
  applications: string[];
  clinicalIndications?: string[];
  packageContents: string[];
  packageItems?: Array<{ item: string; type: "STANDARD" | "OPTIONAL" | "CONFIRMATION" }>;
  powerRequirements?: string;
  powerSupply?: string;
  qualityStandards?: string;
  regulatoryStatus?: string;
  regulatoryClassification?: string;
  certifications?: string[];
  warranty?: string;
  storefrontProductTitle?: string;
  namingStyle?: string;
  shippingLeadTime?: string;
  shippingInformation?: string;
  installationInformation?: string;
  maintenanceInformation?: string;
  metaTitle?: string;
  metaDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string[];
  canonicalSlug?: string;
  relatedProducts?: string[];
  frequentlyBoughtTogether?: string[];
  ribbon?: string;
  priceStatus?: string;
  priceSyncStatus?: string;
  lastPriceSync?: string;
  referencePricing?: ReferencePricing;
  reviewStatus?: "CORRECT" | "NEEDS_EDITING" | "PENDING" | "NOT_YET_REVIEWED";
  reviewNote?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  cloudinarySyncStatus?: "UPLOADING" | "IMAGES_UPLOADED" | "UPLOAD_INCOMPLETE" | "UPLOAD_FAILED" | "REMOVING" | "IMAGES_REMOVED" | "REMOVAL_INCOMPLETE" | "REMOVAL_FAILED" | string;
  cloudinaryLastSyncedAt?: string;
  managedCloudinaryImages?: Array<{
    publicId: string;
    secureUrl: string;
    originalUrl?: string;
    order?: number;
    isPrimary?: boolean;
    sizeBytes?: number;
    originalSizeBytes?: number;
    compressionRatio?: number;
    uploadState?: string;
  }>;
  originalImages?: string[];
  originalPrimaryImage?: string;
  mongoSyncStatus?: "SYNCED" | "REMOVED" | "SYNC_FAILED" | "REMOVAL_FAILED" | string;
  mongoSyncedAt?: string;
  hasOrders?: boolean;
  isRetired?: boolean;
  inCatalogue?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReferencePricing {
  referenceSource?: string;
  referenceProductName?: string;
  referenceModel?: string;
  category?: string;
  referenceURL?: string;
  referenceRegularINR?: number | null;
  referenceSaleINR?: number | null;
  referenceRegularUSD?: number | null;
  referenceSaleUSD?: number | null;
  regularPriceINR?: number | null;
  salePriceINR?: number | null;
  regularPriceUSD?: number | null;
  salePriceUSD?: number | null;
  hasDiscount?: boolean;
  discountPercentage?: number;
  discountPercent?: number;
  lastSyncedAt?: string;
  syncStatus?: string;
}

export interface Subcategory {
  id: string;
  slug: string;
  name: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  status?: "ACTIVE" | "INACTIVE";
  active?: boolean;
  totalProducts?: number;
  publishedProducts?: number;
  shortDescription: string;
  icon: string;
  featuredImage: string;
  subcategories: Subcategory[];
}

export interface Country {
  code: string;
  name: string;
  flag: string;
  currency: string;
  symbol: string;
  dialCode: string;
  postalLabel: string;
  stateLabel: string;
  postalRegex: string;
  defaultRate: number;
  voltage: string;
  plugType: string;
  leadTimeAirDays: string;
  regulatoryStandards: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingAddress {
  fullName: string;
  companyName?: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  sku: string;
  quantity: number;
  basePriceUSD: number;
  convertedUnitPrice: number;
  currency: string;
  image: string;
}

export interface OrderTimelineEvent {
  stage: string;
  title: string;
  timestamp: string | null;
  completed: boolean;
  details: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: {
    fullName: string;
    email: string;
    phone: string;
    country: string;
    countryCode: string;
  };
  shippingAddress: ShippingAddress;
  billingAddress: ShippingAddress;
  items: OrderItem[];
  pricing: {
    baseSubtotalUSD: number;
    subtotal: number;
    discount: number;
    shipping: number;
    tax: number;
    grandTotal: number;
    currency: string;
    exchangeRateUsed: number;
    rateTimestamp: string;
    couponApplied?: string | null;
  };
  shippingMethod: {
    id: string;
    name: string;
    carrier: string;
    estimatedDays: string;
    trackingNumber: string;
    trackingUrl: string;
  };
  payment: {
    method: string;
    transactionId: string;
    status: string;
    paidAt: string;
  };
  fulfillmentStatus: string;
  status: string;
  createdAt: string;
  trackingTimeline: OrderTimelineEvent[];
}

export interface QuoteRequest {
  id: string;
  quoteNumber: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  country: string;
  productName: string;
  sku?: string;
  quantity: number;
  targetTimeline?: string;
  message: string;
  status: "NEW" | "REVIEWING" | "QUOTED" | "NEGOTIATING" | "APPROVED" | "REJECTED" | "CLOSED";
  quotedAmountUSD?: number;
  adminNotes?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productSlug?: string;
  productTitle?: string;
  rating: number;
  reviewTitle?: string;
  reviewText?: string;
  customerFeedbackPoints?: string[];
  userId?: string;
  userEmail?: string;
  customerName?: string;
  author?: string; // Backward compatibility alias
  facility?: string;
  verifiedPurchase: boolean;
  status: "APPROVED" | "PENDING" | "REJECTED" | "QUARANTINED";
  aiAssisted?: boolean;
  comment?: string; // Backward compatibility alias
  date?: string; // Backward compatibility alias
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewSuggestion {
  id: string;
  theme: string;
  title: string;
  text: string;
}

export interface CreateReviewInput {
  productId: string;
  productSlug: string;
  productTitle?: string;
  rating: number;
  reviewTitle: string;
  reviewText: string;
  customerFeedbackPoints?: string[];
  customerName?: string;
  facility?: string;
  userId?: string;
  userEmail?: string;
  aiAssisted?: boolean;
}


export interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  content: string;
}

export interface Coupon {
  code: string;
  discountPercent?: number;
  discountAmountUSD?: number;
  maxDiscountUSD?: number;
  minOrderUSD: number;
  description: string;
}
