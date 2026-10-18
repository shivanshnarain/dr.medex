const fs = require("fs");
const path = require("path");
const initialProducts = require("../data/products");
const initialCategories = require("../data/categories");
const initialCatalogueHierarchy = require("../data/catalogueHierarchy");
const initialCountries = require("../data/countries");
const initialBlogs = require("../data/blogs");
const currencyService = require("./currencyService");

// File-backed persistence path in server/data/db.json
const DB_FILE = path.join(__dirname, "../data/db.json");
const TMP_DB_FILE = path.join(require("os").tmpdir(), "drmedex_db.json");

let state = {
  products: [...initialProducts],
  categories: [...initialCategories],
  catalogueHierarchy: JSON.parse(JSON.stringify(initialCatalogueHierarchy)),
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
  reviews: [], // Reviews are persisted exclusively in Cloud Firestore (drmedex project) via firestoreService
  policies: {
    announcementBar: "GLOBAL AIR FREIGHT DELIVERY AVAILABLE | 24/7 BIOMEDICAL TECHNICAL SUPPORT | ISO 13485:2016 & CE CERTIFIED",
    supportEmail: "support@drmedex.com",
    salesEmail: "sales@drmedex.com",
    hotline: "+1 (800) 849-2041",
    whatsapp: "+91 98110 49200",
    headquarters: "DR.MEDEX Global MedTech Tower, 45 Healthcare Innovation Way, Boston, MA 02115, USA & International Logistics Hub, Dubai Healthcare City, UAE"
  }
};

function ensureUniqueProductIds(products) {
  if (!Array.isArray(products)) return;
  const seen = new Set();
  for (const p of products) {
    if (seen.has(p.id)) {
      p.id = `prod-${p.slug || Math.random().toString(36).substring(2, 8)}`;
    }
    seen.add(p.id);
  }
}

let lastMtime = 0;
function checkReload() {
  try {
    // Check writable TMP_DB_FILE first (has latest runtime updates in serverless)
    if (fs.existsSync(TMP_DB_FILE)) {
      const stat = fs.statSync(TMP_DB_FILE);
      if (stat.mtimeMs > lastMtime) {
        lastMtime = stat.mtimeMs;
        const raw = fs.readFileSync(TMP_DB_FILE, "utf-8");
        const loaded = JSON.parse(raw);
        if (loaded && loaded.products && loaded.products.length > 0) {
          state = { ...state, ...loaded };
          if (loaded.catalogueHierarchy) {
            Object.assign(initialCatalogueHierarchy, loaded.catalogueHierarchy);
          } else if (!state.catalogueHierarchy) {
            state.catalogueHierarchy = JSON.parse(JSON.stringify(initialCatalogueHierarchy));
          }
          ensureUniqueProductIds(state.products);
          return;
        }
      }
    }

    if (fs.existsSync(DB_FILE)) {
      const stat = fs.statSync(DB_FILE);
      if (stat.mtimeMs > lastMtime) {
        lastMtime = stat.mtimeMs;
        const raw = fs.readFileSync(DB_FILE, "utf-8");
        const loaded = JSON.parse(raw);
        if (loaded && loaded.products && loaded.products.length > 0) {
          state = { ...state, ...loaded };
          if (loaded.catalogueHierarchy) {
            Object.assign(initialCatalogueHierarchy, loaded.catalogueHierarchy);
          } else if (!state.catalogueHierarchy) {
            state.catalogueHierarchy = JSON.parse(JSON.stringify(initialCatalogueHierarchy));
          }
          ensureUniqueProductIds(state.products);
        }
      }
    }
  } catch (e) {}
}

// Initial load
ensureUniqueProductIds(state.products);
checkReload();

function persist() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
    if (fs.existsSync(DB_FILE)) {
      lastMtime = fs.statSync(DB_FILE).mtimeMs;
    }
  } catch (e) {
    // Read-only filesystem in Vercel/Lambda serverless: persist to /tmp
    try {
      fs.writeFileSync(TMP_DB_FILE, JSON.stringify(state, null, 2), "utf-8");
      if (fs.existsSync(TMP_DB_FILE)) {
        lastMtime = fs.statSync(TMP_DB_FILE).mtimeMs;
      }
    } catch (tmpErr) {}
  }
}

module.exports = {
  reloadFromDisk: () => {
    lastMtime = 0;
    checkReload();
    return state;
  },
  getProducts: (filters = {}) => {
    checkReload();
    let list = [...state.products];
    if (!filters.includeInactive) {
      list = list.filter(p => (p.status || "ACTIVE") === "ACTIVE" && p.status !== "ARCHIVED" && !p.isRetired && p.inCatalogue !== false);
      // Hide products whose category is inactive
      list = list.filter(p => {
        const cat = state.categories.find(c => c.id === p.category || c.slug === p.category);
        if (cat && (cat.status === "INACTIVE" || cat.active === false)) return false;
        return true;
      });
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
      if (filters.sort === "newest" || filters.sort === "updated_desc") {
        list.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return dateB - dateA;
        });
      }
    }
    return list;
  },
  searchLive: (query) => {
    if (!query || !query.trim()) {
      return { products: [], categories: [], totalCount: 0 };
    }
    const q = query.toLowerCase().trim();
    // Fetch ranked products (respects category active state)
    const matchedProducts = module.exports.getProducts({ search: q });

    // Match categories & subcategories (only active categories)
    const matchedCategories = [];
    const seenCatSlugs = new Set();

    for (const cat of state.categories) {
      if (cat.status === "INACTIVE" || cat.active === false) continue;
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
  getProductById: (id, includeInactive = false) => {
    checkReload();
    const p = state.products.find(prod => prod.id === id || prod.slug === id);
    if (!p) return null;
    if (!includeInactive) {
      const cat = state.categories.find(c => c.id === p.category || c.slug === p.category);
      if (cat && (cat.status === "INACTIVE" || cat.active === false)) return null;
      if ((p.status || "ACTIVE") !== "ACTIVE" || p.status === "ARCHIVED" || p.isRetired || p.inCatalogue === false) return null;
    }
    return p;
  },
  getProductBySlug: (slug, includeInactive = false) => {
    checkReload();
    if (!slug) return null;
    const raw = String(slug).trim().replace(/\/+$/, "").replace(/\.html$/i, "");
    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw).trim();
    } catch {}
    const lower = decoded.toLowerCase();

    // 1. Direct match on slug, id, or canonicalSlug
    let p = state.products.find(
      prod =>
        prod.slug === raw ||
        prod.slug === decoded ||
        prod.slug?.toLowerCase() === lower ||
        prod.id === raw ||
        prod.id === decoded ||
        prod.id?.toLowerCase() === lower ||
        prod.canonicalSlug === raw ||
        prod.canonicalSlug === decoded ||
        prod.canonicalSlug?.toLowerCase() === lower
    );

    // 2. Normalize hyphens and underscores
    if (!p) {
      const normalizedSlug = lower.replace(/[\s_]+/g, "-");
      p = state.products.find(
        prod =>
          prod.slug?.toLowerCase() === normalizedSlug ||
          prod.canonicalSlug?.toLowerCase() === normalizedSlug
      );
    }

    // 3. Typo and phonetic alias tolerance (e.g. dematologist -> dermatologist)
    if (!p) {
      if (lower.includes("dematologist")) {
        const fixed = lower.replace(/dematologist/g, "dermatologist");
        p = state.products.find(
          prod =>
            prod.slug?.toLowerCase() === fixed ||
            prod.canonicalSlug?.toLowerCase() === fixed
        );
      }
    }

    // 4. Alphanumeric match ignoring punctuation/apostrophes
    if (!p && lower.length > 5) {
      const cleanLower = lower.replace(/[^a-z0-9]/g, "");
      p = state.products.find(prod => {
        if (!prod.slug) return false;
        const cleanProd = prod.slug.toLowerCase().replace(/[^a-z0-9]/g, "");
        return cleanProd === cleanLower;
      });
    }

    // 5. Fuzzy match for long slugs with small edit distance (<= 3 edits)
    if (!p && lower.length > 12) {
      p = state.products.find(prod => {
        if (!prod.slug) return false;
        const prodSlug = prod.slug.toLowerCase();
        if (Math.abs(prodSlug.length - lower.length) > 3) return false;
        let diff = 0;
        let i = 0, j = 0;
        while (i < prodSlug.length && j < lower.length) {
          if (prodSlug[i] !== lower[j]) {
            diff++;
            if (prodSlug.length > lower.length) i++;
            else if (lower.length > prodSlug.length) j++;
            else { i++; j++; }
          } else {
            i++;
            j++;
          }
          if (diff > 3) return false;
        }
        return diff <= 3;
      });
    }

    if (!p) return null;
    if (!includeInactive) {
      const cat = state.categories.find(c => c.id === p.category || c.slug === p.category);
      if (cat && (cat.status === "INACTIVE" || cat.active === false)) return null;
      if ((p.status || "ACTIVE") !== "ACTIVE" || p.status === "ARCHIVED" || p.isRetired || p.inCatalogue === false) return null;
    }
    return p;
  },
  addProduct: (productData) => {
    const assignedId = (productData && productData.id) ? productData.id : "prod-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();
    const newProduct = {
      stock: 10,
      rating: 5.0,
      reviewCount: 0,
      images: [
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1000&q=80"
      ],
      createdAt: (productData && productData.createdAt) || now,
      updatedAt: now,
      ...productData,
      id: assignedId,
      slug: (productData && productData.slug) || (productData && productData.title ? productData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") : assignedId)
    };
    state.products.unshift(newProduct);
    persist();
    return newProduct;
  },
  updateProduct: (id, updates) => {
    checkReload();
    const idx = state.products.findIndex(p => p.id === id || p.slug === id);
    if (idx !== -1) {
      const now = new Date().toISOString();
      const updated = {
        ...state.products[idx],
        ...updates,
        updatedAt: updates.updatedAt || now
      };
      // Shift updated product to beginning of array so recently updated product appears first
      state.products.splice(idx, 1);
      state.products.unshift(updated);
      persist();
      return updated;
    }
    return null;
  },
  deleteProduct: (id) => {
    checkReload();
    if (!id) return null;
    const cleanId = String(id).trim();
    let removed = null;
    const initialLen = state.products.length;
    state.products = state.products.filter(p => {
      if (p.id === cleanId || p.slug === cleanId || (p._id && String(p._id) === cleanId)) {
        if (!removed) removed = p;
        return false;
      }
      return true;
    });
    if (state.products.length < initialLen) {
      persist();
      return removed;
    }
    return null;
  },
  getCategories: (includeInactive = false) => {
    checkReload();
    if (includeInactive) return state.categories;
    return state.categories.filter(c => c.status !== "INACTIVE" && c.active !== false);
  },
  getAllCategories: () => {
    checkReload();
    return state.categories;
  },
  updateCategory: (id, updates) => {
    checkReload();
    const idx = state.categories.findIndex(c => c.id === id || c.slug === id);
    if (idx !== -1) {
      state.categories[idx] = { ...state.categories[idx], ...updates };
      persist();
      return state.categories[idx];
    }
    return null;
  },
  getCatalogueHierarchy: () => {
    checkReload();
    if (!state.catalogueHierarchy) {
      state.catalogueHierarchy = JSON.parse(JSON.stringify(initialCatalogueHierarchy));
    }
    return state.catalogueHierarchy;
  },
  addPrimaryCategory: ({ name, code, shortDescription }) => {
    checkReload();
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error("Category name is required.");
    }
    const cleanName = name.trim();
    const cleanLower = cleanName.toLowerCase();
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!slug) {
      throw new Error("Invalid category name.");
    }

    if (!state.catalogueHierarchy) {
      state.catalogueHierarchy = JSON.parse(JSON.stringify(initialCatalogueHierarchy));
    }

    // Duplicate check
    const existingCat = state.categories.find(
      c => c.name.toLowerCase() === cleanLower || c.slug === slug || c.id === slug
    );
    const existingHierarchy = state.catalogueHierarchy[slug] || Object.values(state.catalogueHierarchy).find(
      c => (c.name || "").toLowerCase() === cleanLower
    );

    if (existingCat || existingHierarchy) {
      throw new Error(`Primary category "${cleanName}" already exists.`);
    }

    const catCode = (code && String(code).trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase()) ||
      cleanName.replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase() ||
      "MED";

    const newCategory = {
      id: slug,
      slug: slug,
      name: cleanName,
      status: "ACTIVE",
      active: true,
      shortDescription: shortDescription || `${cleanName} medical equipment and clinical solutions.`,
      icon: "Package",
      featuredImage: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
      subcategories: []
    };

    state.categories.push(newCategory);
    state.catalogueHierarchy[slug] = {
      id: slug,
      name: cleanName,
      code: catCode,
      status: "ACTIVE",
      subcategories: []
    };

    Object.assign(initialCatalogueHierarchy, state.catalogueHierarchy);
    persist();
    return { category: newCategory, hierarchyItem: state.catalogueHierarchy[slug] };
  },
  addSubcategory: ({ parentCategory, name }) => {
    checkReload();
    if (!parentCategory || typeof parentCategory !== "string" || !parentCategory.trim()) {
      throw new Error("Parent primary category is required.");
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error("Subcategory name is required.");
    }
    const cleanName = name.trim();
    const cleanLower = cleanName.toLowerCase();
    const cleanParent = parentCategory.trim().toLowerCase();

    if (!state.catalogueHierarchy) {
      state.catalogueHierarchy = JSON.parse(JSON.stringify(initialCatalogueHierarchy));
    }

    const cat = state.categories.find(
      c => c.id.toLowerCase() === cleanParent || c.slug.toLowerCase() === cleanParent || c.name.toLowerCase() === cleanParent
    );
    const hierParentKey = Object.keys(state.catalogueHierarchy).find(
      k => k.toLowerCase() === cleanParent || (state.catalogueHierarchy[k].name || "").toLowerCase() === cleanParent
    );
    const hierParent = hierParentKey ? state.catalogueHierarchy[hierParentKey] : null;

    if (!cat && !hierParent) {
      throw new Error(`Parent category "${parentCategory}" was not found.`);
    }

    const parentSlug = (cat && (cat.slug || cat.id)) || hierParentKey;

    const subcatsInCat = (cat && Array.isArray(cat.subcategories)) ? cat.subcategories : [];
    const subcatsInHier = (hierParent && Array.isArray(hierParent.subcategories)) ? hierParent.subcategories : [];

    const isDupCat = subcatsInCat.some(s => (s.name || "").toLowerCase() === cleanLower);
    const isDupHier = subcatsInHier.some(s => (s.name || "").toLowerCase() === cleanLower);

    if (isDupCat || isDupHier) {
      throw new Error(`Subcategory "${cleanName}" already exists under "${hierParent?.name || cat?.name || parentCategory}".`);
    }

    const subSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newSubItem = {
      id: subSlug,
      slug: subSlug,
      name: cleanName
    };

    if (cat) {
      if (!Array.isArray(cat.subcategories)) cat.subcategories = [];
      cat.subcategories.push(newSubItem);
    }

    if (hierParent) {
      if (!Array.isArray(hierParent.subcategories)) hierParent.subcategories = [];
      hierParent.subcategories.push({
        id: subSlug,
        name: cleanName,
        equipmentTypes: []
      });
    }

    Object.assign(initialCatalogueHierarchy, state.catalogueHierarchy);
    persist();
    return { subcategory: newSubItem, parentCategory: parentSlug };
  },
  addEquipmentType: ({ parentCategory, subcategory, name, skuPrefix }) => {
    checkReload();
    if (!parentCategory || typeof parentCategory !== "string" || !parentCategory.trim()) {
      throw new Error("Primary category is required.");
    }
    if (!subcategory || typeof subcategory !== "string" || !subcategory.trim()) {
      throw new Error("Subcategory is required.");
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      throw new Error("Equipment type name is required.");
    }

    const cleanName = name.trim();
    const cleanLower = cleanName.toLowerCase();
    const cleanParent = parentCategory.trim().toLowerCase();
    const cleanSub = subcategory.trim().toLowerCase();

    if (!state.catalogueHierarchy) {
      state.catalogueHierarchy = JSON.parse(JSON.stringify(initialCatalogueHierarchy));
    }

    const hierParentKey = Object.keys(state.catalogueHierarchy).find(
      k => k.toLowerCase() === cleanParent || (state.catalogueHierarchy[k].name || "").toLowerCase() === cleanParent
    );
    const hierParent = hierParentKey ? state.catalogueHierarchy[hierParentKey] : null;

    if (!hierParent) {
      throw new Error(`Primary category "${parentCategory}" was not found.`);
    }

    const sub = (hierParent.subcategories || []).find(
      s => s.id.toLowerCase() === cleanSub || (s.name || "").toLowerCase() === cleanSub || (s.slug || "").toLowerCase() === cleanSub
    );

    if (!sub) {
      throw new Error(`Subcategory "${subcategory}" was not found under "${hierParent.name}".`);
    }

    if (!Array.isArray(sub.equipmentTypes)) {
      sub.equipmentTypes = [];
    }

    const isDup = sub.equipmentTypes.some(
      eq => (eq.name || "").toLowerCase() === cleanLower
    );
    if (isDup) {
      throw new Error(`Equipment type "${cleanName}" already exists under "${sub.name}".`);
    }

    const eqId = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const words = cleanName.split(/[\s-]+/).filter(Boolean);
    const defaultCode = words.length >= 2
      ? words.map(w => w[0]).join("").toUpperCase().slice(0, 3)
      : cleanName.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 3) || "EQP";

    const cleanPrefix = (skuPrefix && String(skuPrefix).trim().replace(/[^a-zA-Z0-9-]/g, "").slice(0, 10).toUpperCase()) || defaultCode;

    const newEq = {
      id: eqId,
      name: cleanName,
      defaultCode,
      skuPrefix: cleanPrefix
    };

    sub.equipmentTypes.push(newEq);

    Object.assign(initialCatalogueHierarchy, state.catalogueHierarchy);
    persist();
    return { equipmentType: newEq, parentCategory: hierParentKey, subcategory: sub.id };
  },
  deletePrimaryCategory: (id) => {
    checkReload();
    const cleanId = (id || "").trim().toLowerCase();
    const cat = state.categories.find(c => c.id.toLowerCase() === cleanId || (c.slug && c.slug.toLowerCase() === cleanId) || c.name.toLowerCase() === cleanId);
    const hierKey = Object.keys(state.catalogueHierarchy || {}).find(
      k => k.toLowerCase() === cleanId || (state.catalogueHierarchy[k]?.name || "").toLowerCase() === cleanId
    );
    const hier = hierKey ? state.catalogueHierarchy[hierKey] : null;

    if (!cat && !hier) {
      throw new Error(`Primary category "${id}" was not found.`);
    }

    const catName = (cat && cat.name) || (hier && hier.name) || id;
    const catSlug = (cat && (cat.slug || cat.id)) || hierKey;

    // 1. Dependency check: linked products
    const linkedProducts = (state.products || []).filter(p => {
      const pCat = (p.category || "").toLowerCase();
      return pCat === cleanId || pCat === (cat?.slug || "").toLowerCase() || pCat === (cat?.id || "").toLowerCase() || pCat === (cat?.name || "").toLowerCase() || pCat === (hierKey || "").toLowerCase();
    });

    if (linkedProducts.length > 0) {
      const sampleTitles = linkedProducts.slice(0, 3).map(p => p.title || p.productName || p.sku);
      throw new Error(`Cannot delete primary category "${catName}": ${linkedProducts.length} product(s) are assigned to it (e.g. "${sampleTitles.join('", "')}"). Please reassign or remove these products before deleting this category.`);
    }

    // 2. Dependency check: child subcategories
    const subcats = (cat && Array.isArray(cat.subcategories) && cat.subcategories.length > 0)
      ? cat.subcategories
      : (hier && Array.isArray(hier.subcategories) ? hier.subcategories : []);

    if (subcats.length > 0) {
      throw new Error(`Cannot delete primary category "${catName}": ${subcats.length} subcategory/subcategories depend on it. Please delete or reassign its child subcategories first.`);
    }

    // Safe deletion: delete only the selected taxonomy record
    if (cat) {
      state.categories = state.categories.filter(c => c.id !== cat.id && c.slug !== cat.slug);
    }
    if (hierKey && state.catalogueHierarchy) {
      delete state.catalogueHierarchy[hierKey];
      delete initialCatalogueHierarchy[hierKey];
    }

    persist();
    return { success: true, message: `Primary category "${catName}" deleted successfully.` };
  },
  deleteSubcategory: (parentCategory, subId) => {
    checkReload();
    const cleanParent = (parentCategory || "").trim().toLowerCase();
    const cleanSub = (subId || "").trim().toLowerCase();

    const cat = state.categories.find(c => c.id.toLowerCase() === cleanParent || (c.slug && c.slug.toLowerCase() === cleanParent) || c.name.toLowerCase() === cleanParent);
    const hierKey = Object.keys(state.catalogueHierarchy || {}).find(
      k => k.toLowerCase() === cleanParent || (state.catalogueHierarchy[k]?.name || "").toLowerCase() === cleanParent
    );
    const hier = hierKey ? state.catalogueHierarchy[hierKey] : null;

    if (!cat && !hier) {
      throw new Error(`Parent category "${parentCategory}" was not found.`);
    }

    const subHier = hier && Array.isArray(hier.subcategories)
      ? hier.subcategories.find(s => (s.id || "").toLowerCase() === cleanSub || (s.name || "").toLowerCase() === cleanSub || (s.slug || "").toLowerCase() === cleanSub)
      : null;
    const subCat = cat && Array.isArray(cat.subcategories)
      ? cat.subcategories.find(s => (s.id || "").toLowerCase() === cleanSub || (s.name || "").toLowerCase() === cleanSub || (s.slug || "").toLowerCase() === cleanSub)
      : null;

    if (!subHier && !subCat) {
      throw new Error(`Subcategory "${subId}" was not found under "${hier?.name || cat?.name || parentCategory}".`);
    }

    const subName = subHier?.name || subCat?.name || subId;

    // 1. Dependency check: linked products
    const linkedProducts = (state.products || []).filter(p => {
      const pSub = (p.subcategory || "").toLowerCase();
      return pSub === cleanSub || pSub === (subHier?.name || "").toLowerCase() || pSub === (subCat?.name || "").toLowerCase() || pSub === (subHier?.id || "").toLowerCase();
    });

    if (linkedProducts.length > 0) {
      const sampleTitles = linkedProducts.slice(0, 3).map(p => p.title || p.productName || p.sku);
      throw new Error(`Cannot delete subcategory "${subName}": ${linkedProducts.length} product(s) are assigned to it (e.g. "${sampleTitles.join('", "')}"). Please reassign or remove these products before deleting this subcategory.`);
    }

    // 2. Dependency check: verified equipment types
    const eqTypes = subHier && Array.isArray(subHier.equipmentTypes) ? subHier.equipmentTypes : [];
    if (eqTypes.length > 0) {
      throw new Error(`Cannot delete subcategory "${subName}": ${eqTypes.length} verified equipment type(s) depend on it. Please delete them first.`);
    }

    // Safe deletion
    if (hier && Array.isArray(hier.subcategories)) {
      hier.subcategories = hier.subcategories.filter(s => (s.id || "").toLowerCase() !== cleanSub && (s.name || "").toLowerCase() !== subName.toLowerCase());
      if (initialCatalogueHierarchy[hierKey]?.subcategories) {
        initialCatalogueHierarchy[hierKey].subcategories = hier.subcategories;
      }
    }
    if (cat && Array.isArray(cat.subcategories)) {
      cat.subcategories = cat.subcategories.filter(s => (s.id || "").toLowerCase() !== cleanSub && (s.name || "").toLowerCase() !== subName.toLowerCase());
    }

    persist();
    return { success: true, message: `Subcategory "${subName}" deleted successfully.` };
  },
  deleteEquipmentType: (parentCategory, subcategory, eqId) => {
    checkReload();
    const cleanParent = (parentCategory || "").trim().toLowerCase();
    const cleanSub = (subcategory || "").trim().toLowerCase();
    const cleanEq = (eqId || "").trim().toLowerCase();

    const hierKey = Object.keys(state.catalogueHierarchy || {}).find(
      k => k.toLowerCase() === cleanParent || (state.catalogueHierarchy[k]?.name || "").toLowerCase() === cleanParent
    );
    const hier = hierKey ? state.catalogueHierarchy[hierKey] : null;

    if (!hier) {
      throw new Error(`Primary category "${parentCategory}" was not found.`);
    }

    const sub = (hier.subcategories || []).find(
      s => (s.id || "").toLowerCase() === cleanSub || (s.name || "").toLowerCase() === cleanSub || (s.slug || "").toLowerCase() === cleanSub
    );

    if (!sub) {
      throw new Error(`Subcategory "${subcategory}" was not found under "${hier.name}".`);
    }

    const eq = (sub.equipmentTypes || []).find(
      e => (e.id || "").toLowerCase() === cleanEq || (e.name || "").toLowerCase() === cleanEq
    );

    if (!eq) {
      throw new Error(`Equipment type "${eqId}" was not found under "${sub.name}".`);
    }

    const eqName = eq.name;

    // 1. Dependency check: linked products
    const linkedProducts = (state.products || []).filter(p => {
      const pEq = (p.equipmentType || "").toLowerCase();
      return pEq === cleanEq || pEq === eqName.toLowerCase() || pEq === (eq.id || "").toLowerCase();
    });

    if (linkedProducts.length > 0) {
      const sampleTitles = linkedProducts.slice(0, 3).map(p => p.title || p.productName || p.sku);
      throw new Error(`Cannot delete verified equipment type "${eqName}": ${linkedProducts.length} product(s) are assigned to it (e.g. "${sampleTitles.join('", "')}"). Please reassign or remove these products before deleting this equipment type.`);
    }

    // Safe deletion
    sub.equipmentTypes = sub.equipmentTypes.filter(e => (e.id || "").toLowerCase() !== cleanEq && (e.name || "").toLowerCase() !== eqName.toLowerCase());
    if (initialCatalogueHierarchy[hierKey]) {
      Object.assign(initialCatalogueHierarchy, state.catalogueHierarchy);
    }

    persist();
    return { success: true, message: `Verified equipment type "${eqName}" deleted successfully.` };
  },
  updateSubcategory: (parentCategory, subId, { name }) => {
    checkReload();
    const cleanParent = (parentCategory || "").trim().toLowerCase();
    const cleanSub = (subId || "").trim().toLowerCase();
    const cleanName = (name || "").trim();
    if (!cleanName) throw new Error("Subcategory name is required.");

    const cat = state.categories.find(c => c.id.toLowerCase() === cleanParent || (c.slug && c.slug.toLowerCase() === cleanParent) || c.name.toLowerCase() === cleanParent);
    const hierKey = Object.keys(state.catalogueHierarchy || {}).find(
      k => k.toLowerCase() === cleanParent || (state.catalogueHierarchy[k]?.name || "").toLowerCase() === cleanParent
    );
    const hier = hierKey ? state.catalogueHierarchy[hierKey] : null;

    if (hier && Array.isArray(hier.subcategories)) {
      const s = hier.subcategories.find(x => (x.id || "").toLowerCase() === cleanSub || (x.name || "").toLowerCase() === cleanSub);
      if (s) s.name = cleanName;
    }
    if (cat && Array.isArray(cat.subcategories)) {
      const s = cat.subcategories.find(x => (x.id || "").toLowerCase() === cleanSub || (x.name || "").toLowerCase() === cleanSub);
      if (s) s.name = cleanName;
    }

    persist();
    return { success: true, message: `Subcategory updated to "${cleanName}".` };
  },
  updateEquipmentType: (parentCategory, subcategory, eqId, { name, code }) => {
    checkReload();
    const cleanParent = (parentCategory || "").trim().toLowerCase();
    const cleanSub = (subcategory || "").trim().toLowerCase();
    const cleanEq = (eqId || "").trim().toLowerCase();
    const cleanName = (name || "").trim();
    if (!cleanName) throw new Error("Equipment type name is required.");

    const hierKey = Object.keys(state.catalogueHierarchy || {}).find(
      k => k.toLowerCase() === cleanParent || (state.catalogueHierarchy[k]?.name || "").toLowerCase() === cleanParent
    );
    const hier = hierKey ? state.catalogueHierarchy[hierKey] : null;
    if (!hier) throw new Error("Parent category not found.");

    const sub = (hier.subcategories || []).find(
      s => (s.id || "").toLowerCase() === cleanSub || (s.name || "").toLowerCase() === cleanSub
    );
    if (!sub) throw new Error("Subcategory not found.");

    const eq = (sub.equipmentTypes || []).find(
      e => (e.id || "").toLowerCase() === cleanEq || (e.name || "").toLowerCase() === cleanEq
    );
    if (!eq) throw new Error("Equipment type not found.");

    eq.name = cleanName;
    if (code) eq.defaultCode = String(code).trim().toUpperCase();

    persist();
    return { success: true, message: `Equipment type updated to "${cleanName}".` };
  },
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
    checkReload();

    if (!orderPayload || !Array.isArray(orderPayload.items) || orderPayload.items.length === 0) {
      throw new Error("Order must contain at least one item.");
    }

    // 1. Idempotency check: Prevent duplicate deduction if transaction was already processed
    const incomingTx = orderPayload.transactionId || (orderPayload.payment && orderPayload.payment.transactionId);
    if (incomingTx) {
      const existing = state.orders.find(o => 
        (o.transactionId && o.transactionId === incomingTx) ||
        (o.payment && o.payment.transactionId === incomingTx)
      );
      if (existing) {
        return existing;
      }
    }

    // 2. Validate inventory availability before accepting order
    for (const it of orderPayload.items) {
      const p = state.products.find(prod => prod.id === it.productId);
      if (!p) {
        throw new Error(`Product not found in catalogue: ${it.productId}`);
      }
      const qty = it.quantity || 1;
      const currentStock = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
      if (currentStock < qty) {
        throw new Error(`Insufficient inventory for "${p.title || p.productName || p.id}". Requested: ${qty}, Available: ${currentStock}`);
      }
    }

    const orderNumber = "MC-" + Math.floor(10000 + Math.random() * 90000);
    const targetCurrency = orderPayload.currency || "INR";
    const exchangeRateUsed = currencyService.getRateForCurrency(targetCurrency);
    const now = new Date().toISOString();
    const resolvedTxId = incomingTx || ("TXN_" + Math.random().toString(36).substring(2, 12).toUpperCase());

    const newOrder = {
      id: orderNumber,
      orderNumber,
      transactionId: resolvedTxId,
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
        transactionId: resolvedTxId,
        status: "PAID",
        paidAt: now
      },
      fulfillmentStatus: "CONFIRMED",
      status: "PROCESSING",
      stockRestored: false,
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

    // 3. Atomically deduct inventory by purchased quantity
    newOrder.items.forEach(it => {
      const p = state.products.find(prod => prod.id === it.productId);
      if (p) {
        const qty = it.quantity || 1;
        const currentStock = p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
        p.stock = Math.max(0, currentStock - qty);
        p.stockQuantity = p.stock;
        p.stockStatus = p.stock <= 0 ? "OUT_OF_STOCK" : (p.stock <= (p.lowStockThreshold || 3) ? "LOW_STOCK" : "IN_STOCK");
        p.updatedAt = new Date().toISOString();
      }
    });

    state.orders.unshift(newOrder);
    persist();
    return newOrder;
  },
  updateOrderStatus: (orderId, status, stageToComplete = null) => {
    checkReload();
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return null;
    const oldStatus = order.status;
    order.status = status;
    if (stageToComplete && order.trackingTimeline) {
      const st = order.trackingTimeline.find(t => t.stage === stageToComplete);
      if (st) {
        st.completed = true;
        st.timestamp = new Date().toISOString();
      }
    }

    // 4. Restore inventory when order is cancelled or refunded (idempotent)
    if (!order.stockRestored && (status === "CANCELLED" || status === "REFUNDED") && oldStatus !== "CANCELLED" && oldStatus !== "REFUNDED") {
      (order.items || []).forEach(it => {
        const p = state.products.find(prod => prod.id === it.productId);
        if (p) {
          const qty = it.quantity || 1;
          const currentStock = p.stock !== undefined ? p.stock : (p.stockQuantity || 0);
          p.stock = currentStock + qty;
          p.stockQuantity = p.stock;
          p.stockStatus = p.stock <= 0 ? "OUT_OF_STOCK" : (p.stock <= (p.lowStockThreshold || 3) ? "LOW_STOCK" : "IN_STOCK");
          p.updatedAt = new Date().toISOString();
        }
      });
      order.stockRestored = true;
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
  getReviews: () => {
    // Deprecated: Reviews are persisted exclusively in Cloud Firestore (drmedex project).
    // All queries must use firestoreService.getApprovedReviews or firestoreService.getAdminReviews.
    return [];
  },
  addReview: () => {
    // Deprecated: Reviews are persisted exclusively in Cloud Firestore (drmedex project).
    // All submissions must use firestoreService.createReview.
    throw new Error("Local review creation deprecated: Reviews must be saved to Cloud Firestore via firestoreService.createReview");
  },
  persist: () => persist(),
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
