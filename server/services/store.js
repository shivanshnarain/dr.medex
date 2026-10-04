const fs = require("fs");
const path = require("path");
const initialProducts = require("../data/products");
const initialCategories = require("../data/categories");
const initialCountries = require("../data/countries");
const initialBlogs = require("../data/blogs");
const currencyService = require("./currencyService");

// File-backed persistence path in server/data/db.json
const DB_FILE = path.join(__dirname, "../data/db.json");

let state = {
  products: [...initialProducts],
  categories: [...initialCategories],
  countries: [...initialCountries],
  blogs: [...initialBlogs],
  orders: [
    {
      id: "MC-84920",
      orderNumber: "MC-84920",
      customer: {
        fullName: "Dr. Jonathan Reyes",
        email: "jreyes@mayoortho.com",
        phone: "+1 415-555-0192",
        country: "United States",
        countryCode: "US"
      },
      shippingAddress: {
        addressLine1: "742 Medical Center Blvd, Suite 400",
        city: "San Francisco",
        state: "California",
        postalCode: "94143",
        country: "United States",
        countryCode: "US"
      },
      billingAddress: {
        addressLine1: "742 Medical Center Blvd, Suite 400",
        city: "San Francisco",
        state: "California",
        postalCode: "94143",
        country: "United States",
        countryCode: "US"
      },
      items: [
        {
          productId: "prod-phy-01",
          title: "DR.MEDEX UltraSound Pro 1000 | Dual Frequency (1 & 3 MHz) Clinical Physiotherapy System",
          sku: "MC-PHY-US1000",
          quantity: 1,
          basePriceUSD: 1450.00,
          convertedUnitPrice: 1450.00,
          currency: "USD",
          image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80"
        }
      ],
      pricing: {
        baseSubtotalUSD: 1450.00,
        subtotal: 1450.00,
        discount: 145.00,
        shipping: 120.00,
        tax: 0.00,
        grandTotal: 1425.00,
        currency: "USD",
        exchangeRateUsed: 1.0,
        rateTimestamp: "2026-09-18T10:00:00.000Z",
        couponApplied: "DRMEDEX10"
      },
      shippingMethod: {
        id: "dhl-air-express",
        name: "DHL Express Medical Air Cargo",
        carrier: "DHL Express",
        estimatedDays: "3–5 Days",
        trackingNumber: "DHL-MED-994827110",
        trackingUrl: "https://www.dhl.com/en/express/tracking.html?AWB=994827110"
      },
      payment: {
        method: "Stripe International Credit Card",
        transactionId: "ch_3N19M4K2819aZ",
        status: "PAID",
        paidAt: "2026-09-18T10:05:22.000Z"
      },
      fulfillmentStatus: "IN_TRANSIT",
      status: "SHIPPED",
      createdAt: "2026-09-18T10:00:00.000Z",
      trackingTimeline: [
        { stage: "ORDER_PLACED", title: "Order Placed", timestamp: "2026-09-18T10:00:00.000Z", completed: true, details: "Electronic purchase order validated." },
        { stage: "PAYMENT_CONFIRMED", title: "Payment Confirmed", timestamp: "2026-09-18T10:05:22.000Z", completed: true, details: "Verified payment via International Gateway." },
        { stage: "PROCESSING", title: "Calibration & Processing", timestamp: "2026-09-18T14:30:00.000Z", completed: true, details: "Medical unit pulled from climate storage and calibrated." },
        { stage: "QC_INSPECTED", title: "9-Stage Quality Passed", timestamp: "2026-09-19T08:15:00.000Z", completed: true, details: "Electrical safety & acoustic output certified." },
        { stage: "PACKED", title: "Export Crate Packed", timestamp: "2026-09-19T11:00:00.000Z", completed: true, details: "Packaged in shockproof export wooden crating." },
        { stage: "SHIPPED", title: "Shipped / In Transit", timestamp: "2026-09-19T13:45:00.000Z", completed: true, details: "Handed to DHL Express. AWB: DHL-MED-994827110." },
        { stage: "DELIVERED", title: "Delivered", timestamp: null, completed: false, details: "Estimated delivery: Sept 22, 2026." }
      ]
    }
  ],
  quotes: [
    {
      id: "RFQ-2026-0104",
      quoteNumber: "RFQ-2026-0104",
      fullName: "Dr. Alistair Finch",
      companyName: "St. Jude Metropolitan Surgical Hospital",
      email: "afinch@stjudehospital.co.uk",
      phone: "+44 20 7946 0912",
      country: "United Kingdom",
      productName: "DR.MEDEX Lumina 700+500 Dual Dome OT Light",
      sku: "MC-OT-LUM750",
      quantity: 4,
      targetTimeline: "Within 30 Days (Tender Phase)",
      message: "Requesting official proforma quote for 4 complete dual-dome OT light suites including low-ceiling ceiling columns and installation support in London.",
      status: "QUOTED",
      quotedAmountUSD: 8900.00,
      adminNotes: "Offered institutional 12% bulk discount with included UKCA compliance documentation and regional export freight.",
      createdAt: "2026-09-17T14:20:00.000Z"
    }
  ],
  coupons: [
    { code: "DRMEDEX10", discountPercent: 10, maxDiscountUSD: 500, minOrderUSD: 1000, description: "10% Off Clinical Orders over $1,000" },
    { code: "GLOBALCARE", discountAmountUSD: 200, minOrderUSD: 2000, description: "$200 Off International Hospital Shipments" },
    { code: "SURGICAL5", discountPercent: 5, maxDiscountUSD: 300, minOrderUSD: 500, description: "5% Off Surgical & OT Illumination" }
  ],
  reviews: [
    {
      id: "rev-01",
      productId: "prod-phy-01",
      author: "Dr. K. Narang, Head of Rehabilitation",
      facility: "Apollo Specialty Clinics",
      rating: 5,
      date: "2026-09-02",
      verifiedPurchase: true,
      status: "APPROVED",
      comment: "The UltraSound Pro 1000 has been running continuously in our clinic for 6 months. The dual 1MHz and 3MHz heads have perfect acoustic coupling, and the touch UI is intuitive for our therapists."
    },
    {
      id: "rev-02",
      productId: "prod-ot-01",
      author: "Prof. G. Dupont, Surgical Director",
      facility: "Hôpital Européen Lyon",
      rating: 5,
      date: "2026-08-28",
      verifiedPurchase: true,
      status: "APPROVED",
      comment: "Outstanding shadowless illumination. The German suspension arms allow effortless 360-degree repositioning during lengthy cardiovascular procedures. The cold LED has zero thermal heat."
    }
  ],
  policies: {
    announcementBar: "GLOBAL AIR FREIGHT DELIVERY AVAILABLE | 24/7 BIOMEDICAL TECHNICAL SUPPORT | ISO 13485:2016 & CE CERTIFIED",
    supportEmail: "support@drmedex.com",
    salesEmail: "sales@drmedex.com",
    hotline: "+1 (800) 849-2041",
    whatsapp: "+91 98110 49200",
    headquarters: "DR.MEDEX Global MedTech Tower, 45 Healthcare Innovation Way, Boston, MA 02115, USA & International Logistics Hub, Dubai Healthcare City, UAE"
  }
};

// Try loading persisted file if exists
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const loaded = JSON.parse(raw);
    if (loaded && loaded.products && loaded.products.length > 0) {
      state = { ...state, ...loaded };
    }
  }
} catch (e) {
  // Use initialized memory state
}

function persist() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (e) {
    // Non-fatal if read-only filesystem
  }
}

module.exports = {
  getProducts: (filters = {}) => {
    let list = [...state.products];
    if (!filters.includeInactive) {
      list = list.filter(p => (p.status || "ACTIVE") === "ACTIVE");
    }
    if (filters.category && filters.category !== "ALL") {
      list = list.filter(p => p.category === filters.category);
    }
    if (filters.subcategory && filters.subcategory !== "ALL") {
      list = list.filter(p => p.subcategory === filters.subcategory);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      const tokens = q.split(/\s+/).filter(Boolean);
      
      list = list
        .map(p => {
          let score = 0;
          const title = (p.title || p.productName || "").toLowerCase();
          const sku = (p.sku || p.SKU || "").toLowerCase();
          const model = (p.modelNumber || "").toLowerCase();
          const cat = (p.category || "").toLowerCase();
          const catName = (p.categoryName || "").toLowerCase();
          const subcat = (p.subcategory || "").toLowerCase();
          const subcatName = (p.subcategoryName || "").toLowerCase();
          const type = (p.productType || "").toLowerCase();
          const desc = (p.shortDescription || p.fullDescription || p.overview || "").toLowerCase();
          const apps = (p.applications || []).join(" ").toLowerCase();
          const specs = Object.values(p.technicalSpecifications || p.specifications || {}).join(" ").toLowerCase();
          const tags = (p.tags || p.keywords || []).join(" ").toLowerCase();

          // Exact or startsWith matches
          if (title === q || sku === q || model === q) score += 100;
          if (title.startsWith(q)) score += 50;
          if (title.includes(q)) score += 30;
          if (sku.includes(q) || model.includes(q)) score += 40;
          if (cat.includes(q) || catName.includes(q)) score += 25;
          if (subcat.includes(q) || subcatName.includes(q)) score += 20;
          if (type.includes(q)) score += 15;
          if (tags.includes(q) || apps.includes(q)) score += 15;
          if (specs.includes(q)) score += 10;
          if (desc.includes(q)) score += 8;

          // Token matches
          for (const token of tokens) {
            if (title.includes(token)) score += 10;
            if (sku.includes(token)) score += 10;
            if (cat.includes(token) || catName.includes(token)) score += 8;
            if (subcat.includes(token) || subcatName.includes(token)) score += 6;
            if (desc.includes(token)) score += 3;
          }

          return { product: p, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.product);
    }
    if (filters.featured === "true" || filters.featured === true) {
      list = list.filter(p => p.featured || p.isFeatured);
    }
    if (filters.bestSeller === "true" || filters.bestSeller === true) {
      list = list.filter(p => p.bestseller || p.isBestSeller);
    }
    if (filters.sort) {
      if (filters.sort === "price-low") list.sort((a, b) => a.basePrice - b.basePrice);
      if (filters.sort === "price-high") list.sort((a, b) => b.basePrice - a.basePrice);
      if (filters.sort === "rating") list.sort((a, b) => (b.rating || b.averageRating || 0) - (a.rating || a.averageRating || 0));
      if (filters.sort === "newest") list.sort((a, b) => b.id.localeCompare(a.id));
    }
    return list;
  },
  searchLive: (query) => {
    if (!query || !query.trim()) {
      return { products: [], categories: [], totalCount: 0 };
    }
    const q = query.toLowerCase().trim();
    // Fetch ranked products
    const matchedProducts = module.exports.getProducts({ search: q });

    // Match categories & subcategories
    const matchedCategories = [];
    const seenCatSlugs = new Set();

    for (const cat of state.categories) {
      const catMatch = (cat.name || "").toLowerCase().includes(q) || (cat.slug || "").toLowerCase().includes(q);
      if (catMatch && !seenCatSlugs.has(cat.slug)) {
        seenCatSlugs.add(cat.slug);
        matchedCategories.push({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          isSubcategory: false,
          link: `/shop-all?category=${cat.slug}`
        });
      }

      if (cat.subcategories) {
        for (const sub of cat.subcategories) {
          const subMatch = (sub.name || "").toLowerCase().includes(q) || (sub.slug || "").toLowerCase().includes(q);
          if (subMatch && !seenCatSlugs.has(sub.slug)) {
            seenCatSlugs.add(sub.slug);
            matchedCategories.push({
              id: sub.id,
              name: sub.name,
              slug: sub.slug,
              parentCategory: cat.name,
              isSubcategory: true,
              link: `/shop-all?category=${cat.slug}&subcategory=${sub.slug}`
            });
          }
        }
      }
    }

    return {
      products: matchedProducts.slice(0, 6),
      categories: matchedCategories.slice(0, 5),
      totalCount: matchedProducts.length
    };
  },
  getProductById: (id) => {
    return state.products.find(p => p.id === id || p.slug === id);
  },
  getProductBySlug: (slug) => {
    return state.products.find(p => p.slug === slug || p.id === slug);
  },
  addProduct: (productData) => {
    const assignedId = (productData && productData.id) ? productData.id : "prod-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const newProduct = {
      stock: 10,
      rating: 5.0,
      reviewCount: 0,
      images: [
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80"
      ],
      ...productData,
      id: assignedId,
      slug: (productData && productData.slug) || (productData && productData.title ? productData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : assignedId)
    };
    state.products.unshift(newProduct);
    persist();
    return newProduct;
  },
  updateProduct: (id, updates) => {
    const idx = state.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      state.products[idx] = { ...state.products[idx], ...updates };
      persist();
      return state.products[idx];
    }
    return null;
  },
  deleteProduct: (id) => {
    const idx = state.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      const removed = state.products.splice(idx, 1);
      persist();
      return removed[0];
    }
    return null;
  },
  getCategories: () => state.categories,
  getCountries: () => state.countries,
  getBlogs: () => state.blogs,
  getOrders: () => state.orders,
  getOrderById: (orderId) => {
    const clean = (orderId || "").toUpperCase().trim();
    return state.orders.find(o => 
      o.id.toUpperCase() === clean || 
      o.orderNumber.toUpperCase() === clean
    );
  },
  createOrder: (orderPayload) => {
    const orderNumber = "MC-" + Math.floor(10000 + Math.random() * 90000);
    const targetCurrency = orderPayload.currency || "INR";
    const exchangeRateUsed = currencyService.getRateForCurrency(targetCurrency);
    const now = new Date().toISOString();

    const newOrder = {
      id: orderNumber,
      orderNumber,
      customer: orderPayload.customer,
      shippingAddress: orderPayload.shippingAddress,
      billingAddress: orderPayload.billingAddress || orderPayload.shippingAddress,
      items: orderPayload.items.map(item => {
        const prod = state.products.find(p => p.id === item.productId) || {};
        const baseINR = item.basePriceINR || item.basePriceUSD || prod.basePrice || 1000;
        return {
          productId: item.productId,
          title: item.title || prod.title,
          sku: item.sku || prod.sku,
          quantity: item.quantity || 1,
          originalINRPrice: baseINR,
          basePriceINR: baseINR,
          convertedUnitPrice: currencyService.convertPrice(baseINR, targetCurrency),
          currency: targetCurrency,
          image: item.image || (prod.images && prod.images[0]) || ""
        };
      }),
      pricing: {
        originalINRPrice: orderPayload.baseSubtotalINR || orderPayload.baseSubtotalUSD || 0,
        subtotal: orderPayload.subtotal || 0,
        discount: orderPayload.discount || 0,
        shipping: orderPayload.shipping || 0,
        tax: orderPayload.tax || 0,
        grandTotal: orderPayload.grandTotal || 0,
        finalOrderAmount: orderPayload.grandTotal || 0,
        currency: targetCurrency,
        selectedCurrency: targetCurrency,
        exchangeRateUsed,
        rateTimestamp: now,
        couponApplied: orderPayload.couponApplied || null
      },
      shippingMethod: orderPayload.shippingMethod || {
        id: "dhl-air-express",
        name: "DHL Express Medical Air Cargo",
        carrier: "DHL Express",
        estimatedDays: "3–6 Business Days",
        trackingNumber: "DHL-" + Math.floor(100000000 + Math.random() * 900000000),
        trackingUrl: "https://www.dhl.com/en/express/tracking.html"
      },
      payment: {
        method: orderPayload.paymentMethod || "International Credit Card",
        transactionId: "TXN_" + Math.random().toString(36).substring(2, 12).toUpperCase(),
        status: "PAID",
        paidAt: now
      },
      fulfillmentStatus: "CONFIRMED",
      status: "PROCESSING",
      createdAt: now,
      trackingTimeline: [
        { stage: "ORDER_PLACED", title: "Order Placed", timestamp: now, completed: true, details: "Order validated and registered in central medical database." },
        { stage: "PAYMENT_CONFIRMED", title: "Payment Confirmed", timestamp: now, completed: true, details: "Verified payment via International Secure Gateway." },
        { stage: "PROCESSING", title: "Calibration & Processing", timestamp: null, completed: false, details: "Equipment pending biomedical bench inspection." },
        { stage: "QC_INSPECTED", title: "9-Stage Quality Passed", timestamp: null, completed: false, details: "Burn-in testing and electrical leakage audit." },
        { stage: "PACKED", title: "Export Crate Packed", timestamp: null, completed: false, details: "High-density foam protective crating." },
        { stage: "SHIPPED", title: "Shipped / In Transit", timestamp: null, completed: false, details: "AWB will be assigned upon carrier dispatch." },
        { stage: "DELIVERED", title: "Delivered", timestamp: null, completed: false, details: "Final receipt sign-off." }
      ]
    };

    // Deduct stock
    newOrder.items.forEach(it => {
      const p = state.products.find(prod => prod.id === it.productId);
      if (p && p.stock >= it.quantity) {
        p.stock -= it.quantity;
      }
    });

    state.orders.unshift(newOrder);
    persist();
    return newOrder;
  },
  updateOrderStatus: (orderId, status, stageToComplete = null) => {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return null;
    order.status = status;
    if (stageToComplete && order.trackingTimeline) {
      const st = order.trackingTimeline.find(t => t.stage === stageToComplete);
      if (st) {
        st.completed = true;
        st.timestamp = new Date().toISOString();
      }
    }
    persist();
    return order;
  },
  getQuotes: () => state.quotes,
  createQuote: (quoteData) => {
    const quoteNumber = "RFQ-2026-" + Math.floor(1000 + Math.random() * 9000);
    const newQuote = {
      id: quoteNumber,
      quoteNumber,
      ...quoteData,
      status: "NEW",
      createdAt: new Date().toISOString()
    };
    state.quotes.unshift(newQuote);
    persist();
    return newQuote;
  },
  updateQuoteStatus: (id, status, quotedAmountUSD = null, adminNotes = "") => {
    const q = state.quotes.find(item => item.id === id);
    if (!q) return null;
    q.status = status;
    if (quotedAmountUSD !== null) q.quotedAmountUSD = Number(quotedAmountUSD);
    if (adminNotes) q.adminNotes = adminNotes;
    persist();
    return q;
  },
  getCoupons: () => state.coupons,
  validateCoupon: (code, subtotalUSD) => {
    if (!code) return { valid: false, message: "No coupon provided" };
    const c = state.coupons.find(coup => coup.code.toUpperCase() === code.trim().toUpperCase());
    if (!c) return { valid: false, message: "Invalid promo code" };
    if (subtotalUSD < c.minOrderUSD) {
      return { 
        valid: false, 
        message: `Minimum order of $${c.minOrderUSD} required for code ${c.code}` 
      };
    }
    let discountUSD = 0;
    if (c.discountPercent) {
      discountUSD = (subtotalUSD * c.discountPercent) / 100;
      if (c.maxDiscountUSD && discountUSD > c.maxDiscountUSD) {
        discountUSD = c.maxDiscountUSD;
      }
    } else if (c.discountAmountUSD) {
      discountUSD = c.discountAmountUSD;
    }
    return {
      valid: true,
      code: c.code,
      discountUSD,
      description: c.description
    };
  },
  getReviews: (productId) => {
    if (productId) {
      return state.reviews.filter(r => r.productId === productId && r.status === "APPROVED");
    }
    return state.reviews;
  },
  addReview: (reviewData) => {
    const newReview = {
      id: "rev-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      verifiedPurchase: true,
      status: "APPROVED",
      ...reviewData
    };
    state.reviews.unshift(newReview);
    persist();
    return newReview;
  },
  getPolicies: () => state.policies,
  updatePolicies: (updates) => {
    state.policies = { ...state.policies, ...updates };
    persist();
    return state.policies;
  },
  getAdminMetrics: () => {
    const totalOrders = state.orders.length;
    const totalRevenueUSD = state.orders.reduce((sum, o) => sum + (o.pricing.baseSubtotalUSD || 0), 0);
    const pendingQuotes = state.quotes.filter(q => q.status === "NEW" || q.status === "REVIEWING").length;
    const lowStockItems = state.products.filter(p => p.stock < 10).length;
    const activeProducts = state.products.length;

    return {
      totalRevenueUSD,
      totalOrders,
      pendingQuotes,
      lowStockItems,
      activeProducts,
      conversionRate: "3.42%",
      recentOrders: state.orders.slice(0, 5),
      recentQuotes: state.quotes.slice(0, 5)
    };
  }
};
