export interface Product {
  id: string;
  slug: string;
  title: string;
  sku: string;
  brand: string;
  category: string;
  subcategory: string;
  basePrice: number;
  originalPrice?: number;
  stock: number;
  rating: number;
  reviewCount: number;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  images: string[];
  shortDescription: string;
  overview: string;
  features: string[];
  specifications: Record<string, string>;
  applications: string[];
  packageContents: string[];
  powerRequirements?: string;
  certifications?: string[];
  warranty?: string;
  shippingLeadTime?: string;
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
  author: string;
  facility: string;
  rating: number;
  date: string;
  verifiedPurchase: boolean;
  status: "APPROVED" | "PENDING" | "REJECTED";
  comment: string;
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
