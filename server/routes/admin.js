const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const auditService = require("../services/auditService");
const mediaService = require("../services/mediaService");
const aiGeneratorService = require("../services/aiGeneratorService");
const store = require("../services/store");
const catalogueHierarchy = require("../data/catalogueHierarchy");
const exportService = require("../services/exportService");
const cloudinaryService = require("../services/cloudinaryService");
const mongoService = require("../services/mongoService");
const geminiVisionService = require("../services/geminiVisionService");
const firestoreService = require("../services/firestoreService");
const supabaseService = require("../services/supabaseService");

/**
 * Authentication Middleware
 */
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.substring(7) : req.headers["x-admin-token"];

  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized. Admin session required." });
  }

  const session = authService.validateSession(token);
  if (!session) {
    return res.status(401).json({ success: false, message: "Session expired or invalid. Please log in again." });
  }

  req.admin = session;
  next();
}

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || req.connection.remoteAddress || "127.0.0.1";

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const result = authService.login(email, password, ip);
  if (!result.success) {
    auditService.logAction(email, "LOGIN_FAILED", null, { ip, remainingAttempts: result.remainingAttempts });
    return res.status(result.status || 401).json(result);
  }

  auditService.logAction(result.user.email, "LOGIN_SUCCESS", null, { ip });
  res.json({
    success: true,
    token: result.token,
    user: result.user
  });
});

router.post("/logout", requireAdmin, (req, res) => {
  const token = req.headers.authorization?.substring(7) || req.headers["x-admin-token"];
  authService.logout(token);
  auditService.logAction(req.admin.email, "LOGOUT", null, {});
  res.json({ success: true, message: "Logged out successfully" });
});

router.get("/me", requireAdmin, (req, res) => {
  res.json({
    success: true,
    user: {
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role
    }
  });
});

// ==========================================
// 2. DASHBOARD METRICS
// ==========================================

router.get("/dashboard", requireAdmin, (req, res) => {
  const products = store.getProducts({ includeInactive: true });
  const categories = store.getAllCategories();
  const orders = store.getOrders();
  const quotes = store.getQuotes();
  const auditLogs = auditService.getLogs({ limit: 12 });

  const totalProducts = products.length;
  const publishedProducts = products.filter(p => (p.status || "ACTIVE") === "ACTIVE").length;
  const draftProducts = products.filter(p => p.status === "DRAFT").length;
  const archivedProducts = products.filter(p => p.status === "ARCHIVED").length;
  const outOfStock = products.filter(p => (p.stockQuantity !== undefined ? p.stockQuantity : p.stock) <= 0).length;
  const lowStock = products.filter(p => {
    const s = p.stockQuantity !== undefined ? p.stockQuantity : p.stock;
    const thresh = p.lowStockThreshold || 5;
    return s > 0 && s <= thresh;
  }).length;
  const featuredProducts = products.filter(p => p.featured || p.isFeatured).length;

  // Media inspection
  let totalImages = 0;
  let localImages = 0;
  let replacementRequired = 0;

  products.forEach(p => {
    const imgs = p.galleryImages || (p.images ? p.images.map((u, i) => ({ url: u, isPrimary: i === 0 })) : []);
    totalImages += imgs.length;
    imgs.forEach(img => {
      const url = typeof img === "string" ? img : img.url;
      if (url && (url.startsWith("/products-") || url.startsWith("/uploads"))) {
        localImages += 1;
      }
      if (img.status === "REPLACEMENT_REQUIRED") {
        replacementRequired += 1;
      }
    });
  });

  res.json({
    success: true,
    stats: {
      totalProducts,
      activeProducts: publishedProducts,
      draftProducts,
      archivedProducts,
      outOfStockProducts: outOfStock,
      lowStockProducts: lowStock,
      featuredProducts,
      totalCategories: categories.length,
      mediaStatus: {
        totalImages,
        localStoredImages: localImages,
        replacementRequiredCount: replacementRequired
      }
    },
    metrics: {
      totalProducts,
      publishedProducts,
      draftProducts,
      archivedProducts,
      outOfStock,
      lowStock,
      featuredProducts,
      categoriesCount: categories.length,
      ordersCount: orders.length,
      pendingQuotesCount: quotes.filter(q => q.status === "PENDING" || q.status === "NEW").length,
      media: {
        totalImages,
        localImages,
        externalImages: totalImages - localImages,
        replacementRequired
      }
    },
    recentProducts: products.slice(0, 8).map(p => ({
      id: p.id,
      title: p.title || p.productName,
      sku: p.sku || p.SKU,
      basePrice: p.basePrice,
      status: p.status || "ACTIVE",
      stock: p.stockQuantity !== undefined ? p.stockQuantity : p.stock,
      images: p.images || (p.primaryImage ? [p.primaryImage] : []),
      category: p.category,
      updatedAt: p.updatedAt || p.createdAt
    })),
    auditLogs
  });
});

// ==========================================
// 3. PRODUCT MANAGEMENT ENDPOINTS
// ==========================================

router.get("/products", requireAdmin, (req, res) => {
  const { search, category, status, stock, reviewStatus, sort = "updated_desc", page = 1, limit = 20 } = req.query;
  let list = store.getProducts({ includeInactive: true });

  // Calculate live review counts across all products before filtering
  const allProducts = list;
  const reviewCounts = {
    all: allProducts.length,
    correct: allProducts.filter(p => p.reviewStatus === "CORRECT").length,
    needsEditing: allProducts.filter(p => p.reviewStatus === "NEEDS_EDITING").length,
    pending: allProducts.filter(p => !p.reviewStatus || p.reviewStatus === "PENDING").length
  };

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(p => {
      const t = (p.title || p.productName || "").toLowerCase();
      const sku = (p.sku || p.SKU || "").toLowerCase();
      const m = (p.modelNumber || "").toLowerCase();
      const d = (p.shortDescription || p.overview || "").toLowerCase();
      return t.includes(q) || sku.includes(q) || m.includes(q) || d.includes(q);
    });
  }

  // Category filter
  if (category && category !== "ALL") {
    list = list.filter(p => p.category === category);
  }

  // Status filter (Publication status: ACTIVE, DRAFT, ARCHIVED)
  if (status && status !== "ALL") {
    list = list.filter(p => (p.status || "ACTIVE") === status);
  }

  // Review Status filter (Decoupled from publication status)
  if (reviewStatus && reviewStatus !== "ALL" && reviewStatus !== "all") {
    if (reviewStatus === "CORRECT") {
      list = list.filter(p => p.reviewStatus === "CORRECT");
    } else if (reviewStatus === "NEEDS_EDITING") {
      list = list.filter(p => p.reviewStatus === "NEEDS_EDITING");
    } else if (reviewStatus === "PENDING" || reviewStatus === "NOT_REVIEWED") {
      list = list.filter(p => !p.reviewStatus || p.reviewStatus === "PENDING");
    }
  }

  // Stock filter
  if (stock && stock !== "ALL") {
    if (stock === "IN_STOCK") {
      list = list.filter(p => (p.stockQuantity !== undefined ? p.stockQuantity : p.stock) > 0);
    } else if (stock === "OUT_OF_STOCK") {
      list = list.filter(p => (p.stockQuantity !== undefined ? p.stockQuantity : p.stock) <= 0);
    } else if (stock === "LOW_STOCK") {
      list = list.filter(p => {
        const s = p.stockQuantity !== undefined ? p.stockQuantity : p.stock;
        return s > 0 && s <= (p.lowStockThreshold || 5);
      });
    }
  }

  // Sorting
  list.sort((a, b) => {
    if (sort === "price_asc") return (a.basePrice || 0) - (b.basePrice || 0);
    if (sort === "price_desc") return (b.basePrice || 0) - (a.basePrice || 0);
    // Default: recently updated / newest (updatedAt takes precedence over createdAt)
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const total = list.length;
  const p = Math.max(1, parseInt(page));
  const l = Math.max(1, parseInt(limit));
  const paginated = list.slice((p - 1) * l, p * l);

  res.json({
    success: true,
    total,
    page: p,
    limit: l,
    totalPages: Math.ceil(total / l),
    reviewCounts,
    products: paginated
  });
});

router.get("/catalogue/hierarchy", requireAdmin, (req, res) => {
  res.json({ success: true, hierarchy: catalogueHierarchy });
});

router.get("/products/check-sku", requireAdmin, (req, res) => {
  const { sku, excludeId } = req.query;
  if (!sku) {
    return res.json({ success: true, isUnique: true });
  }
  const clean = sku.trim().toLowerCase();
  const all = store.getProducts({ includeInactive: true });
  const conflict = all.find(p => {
    if (excludeId && (p.id === excludeId || p.slug === excludeId)) return false;
    const s = (p.sku || p.SKU || "").toLowerCase();
    return s === clean;
  });
  res.json({
    success: true,
    isUnique: !conflict,
    conflictingProduct: conflict ? { id: conflict.id, title: conflict.title || conflict.productName, sku: conflict.sku } : null
  });
});

router.get("/products/generate-sku", requireAdmin, (req, res) => {
  const { category = "ot-lights" } = req.query;
  const catCodeMap = {
    "ot-lights": "OTL",
    "electrosurgical-units": "ESU",
    "cryo-surgical": "CRY",
    "examination-ot-tables": "TAB",
    "obstetrics-and-gynaecology": "OBG",
    "medical-equipment": "MED",
    "physiotherapy": "PHY"
  };
  const prefix = catCodeMap[category] || "MED";
  const allProducts = store.getProducts({ includeInactive: true });

  // Find max sequence in this category
  let maxSeq = 0;
  const regex = new RegExp(`^DRM-${prefix}-(\\d+)`, "i");
  allProducts.forEach(p => {
    const s = p.sku || p.SKU || "";
    const m = s.match(regex);
    if (m && m[1]) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  let candidateSeq = maxSeq + 1;
  let candidateSku = `DRM-${prefix}-${String(candidateSeq).padStart(4, "0")}`;

  // Guarantee uniqueness against ANY existing SKU in the entire DB
  const existingSkus = new Set(allProducts.map(p => (p.sku || p.SKU || "").toLowerCase()));
  while (existingSkus.has(candidateSku.toLowerCase())) {
    candidateSeq += 1;
    candidateSku = `DRM-${prefix}-${String(candidateSeq).padStart(4, "0")}`;
  }

  res.json({
    success: true,
    category,
    prefix,
    sku: candidateSku,
    sequence: candidateSeq
  });
});

router.post("/products/check-duplicate", requireAdmin, (req, res) => {
  const {
    category,
    subcategory,
    equipmentType,
    modelNumber,
    title,
    productName,
    excludeId
  } = req.body;

  const allProducts = store.getProducts({ includeInactive: true });
  const norm = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const normModel = norm(modelNumber);
  const normTitle = norm(title || productName);

  const matched = allProducts.find(p => {
    if (excludeId && (p.id === excludeId || p.slug === excludeId)) return false;

    // Check same category
    const catMatch = p.category === category || norm(p.category) === norm(category);
    if (!catMatch) return false;

    // 1. If manufacturer model number is provided and matches an existing model number
    if (normModel && p.modelNumber) {
      if (norm(p.modelNumber) === normModel) return true;
    }

    // 2. If exact title or normalized identity matches in the same category
    if (normTitle && p.title) {
      if (norm(p.title) === normTitle) return true;
    }

    // 3. If category + subcategory + equipmentType match, and models match or both lack a specific distinct model
    if (equipmentType && p.equipmentType) {
      if (norm(p.equipmentType) === norm(equipmentType)) {
        if (normModel && p.modelNumber) {
          return norm(p.modelNumber) === normModel;
        }
        if (!normModel && (!p.modelNumber || p.modelNumber === "—" || p.modelNumber === "Std Unit")) {
          return true;
        }
      }
    }

    return false;
  });

  if (matched) {
    return res.json({
      success: true,
      isDuplicate: true,
      message: "A matching product already exists in this category. Please open the existing product instead of creating a duplicate.",
      duplicateProduct: {
        id: matched.id,
        title: matched.title || matched.productName,
        sku: matched.sku || matched.SKU,
        modelNumber: matched.modelNumber,
        category: matched.category,
        slug: matched.slug
      }
    });
  }

  res.json({
    success: true,
    isDuplicate: false,
    message: null,
    duplicateProduct: null
  });
});

router.get("/products/:id", requireAdmin, (req, res) => {
  const product = store.getProductById(req.params.id, true);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  res.json({ success: true, product });
});

/**
 * Export complete product package (JSON + CSV + README + all original images in ZIP)
 */
router.get("/products/:id/download-package", requireAdmin, async (req, res) => {
  try {
    const product = store.getProductById(req.params.id, true);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const pkg = await exportService.generateProductPackage(product, req.admin);

    auditService.logAction(req.admin.email, "PRODUCT_PACKAGE_DOWNLOADED", product.id, {
      title: product.title || product.productName,
      sku: product.sku || product.SKU,
      filename: pkg.filename,
      stats: pkg.stats
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${pkg.filename}"`);
    res.setHeader("Content-Length", pkg.buffer.length);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.send(pkg.buffer);
  } catch (err) {
    console.error("Export product package error:", err);
    res.status(500).json({ success: false, message: "Failed to generate product package: " + err.message });
  }
});

/**
 * Update Admin Review Status (CORRECT, NEEDS_EDITING, PENDING) with optional review note
 */
router.put("/products/:id/review", requireAdmin, async (req, res) => {
  try {
    let { reviewStatus, reviewNote } = req.body;
    if (reviewStatus === "NOT_YET_REVIEWED" || reviewStatus === "NOT_REVIEWED") {
      reviewStatus = "PENDING";
    }
    const permittedStatuses = ["CORRECT", "NEEDS_EDITING", "PENDING"];

    if (!reviewStatus || !permittedStatuses.includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid review status. Must be one of: ${permittedStatuses.join(", ")}`
      });
    }

    const existing = store.getProductById(req.params.id, true);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const previousReviewStatus = existing.reviewStatus || "PENDING";

    // Base review metadata updates
    const updates = {
      reviewStatus,
      reviewNote: reviewNote !== undefined ? (reviewNote ? String(reviewNote).trim() : null) : (reviewStatus === "CORRECT" ? null : existing.reviewNote || null),
      reviewedBy: req.admin.email,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    let cloudinaryResult = null;

    // IMAGE LIFECYCLE HOOKS
    if (cloudinaryService.isConfigured()) {
      if (reviewStatus === "CORRECT") {
        // Upload / optimize images to Cloudinary
        try {
          const syncRes = await cloudinaryService.syncProductReviewToCorrect(existing);
          cloudinaryResult = syncRes;
          updates.managedCloudinaryImages = syncRes.managedImages;
          updates.originalImages = syncRes.originalImages;
          updates.originalPrimaryImage = syncRes.originalPrimaryImage;
          updates.images = syncRes.images;
          updates.primaryImage = syncRes.primaryImage;
          updates.cloudinarySyncStatus = syncRes.status;
          updates.cloudinaryLastSyncedAt = new Date().toISOString();
        } catch (syncErr) {
          console.error("Cloudinary sync to CORRECT error:", syncErr);
          cloudinaryResult = { status: "UPLOAD_FAILED", error: syncErr.message };
          updates.cloudinarySyncStatus = "UPLOAD_FAILED";
        }
      } else if (reviewStatus === "NEEDS_EDITING" || reviewStatus === "PENDING") {
        // Remove managed Cloudinary copies and restore source images
        try {
          const allProducts = store.getProducts({ includeInactive: true });
          const removalRes = await cloudinaryService.syncProductReviewRemoval(existing, allProducts);
          cloudinaryResult = removalRes;
          updates.images = removalRes.restoredImages;
          updates.primaryImage = removalRes.restoredPrimaryImage;
          updates.managedCloudinaryImages = [];
          updates.cloudinarySyncStatus = removalRes.status;
          updates.cloudinaryLastSyncedAt = new Date().toISOString();
        } catch (remErr) {
          console.error("Cloudinary removal error:", remErr);
          cloudinaryResult = { status: "REMOVAL_FAILED", error: remErr.message };
          updates.cloudinarySyncStatus = "REMOVAL_FAILED";
        }
      }
    }

    // MONGODB TEXT-DATA LIFECYCLE HOOKS
    let mongoResult = null;
    if (mongoService.isConfigured()) {
      if (reviewStatus === "CORRECT") {
        try {
          const candidateProduct = { ...existing, ...updates };
          const mRes = await mongoService.upsertApprovedProduct(candidateProduct, req.admin.email);
          mongoResult = mRes;
          updates.mongoSyncStatus = mRes.status;
          updates.mongoSyncedAt = new Date().toISOString();
        } catch (mErr) {
          console.error("MongoDB Atlas sync to CORRECT error:", mErr.message);
          mongoResult = { status: "SYNC_FAILED", error: mErr.message };
          updates.mongoSyncStatus = "SYNC_FAILED";
        }
      } else if (reviewStatus === "NEEDS_EDITING" || reviewStatus === "PENDING") {
        try {
          const mDel = await mongoService.removeApprovedProduct(existing.id);
          mongoResult = mDel;
          updates.mongoSyncStatus = mDel.status;
          updates.mongoSyncedAt = new Date().toISOString();
        } catch (mDelErr) {
          console.error("MongoDB Atlas removal error:", mDelErr.message);
          mongoResult = { status: "REMOVAL_FAILED", error: mDelErr.message };
          updates.mongoSyncStatus = "REMOVAL_FAILED";
        }
      }
    }

    const updated = store.updateProduct(req.params.id, updates);

    auditService.logAction(req.admin.email, "PRODUCT_REVIEW_UPDATED", updated.id, {
      title: updated.title || updated.productName,
      sku: updated.sku || updated.SKU,
      fromStatus: previousReviewStatus,
      toStatus: reviewStatus,
      note: updates.reviewNote,
      cloudinaryStatus: cloudinaryResult ? cloudinaryResult.status : "NOT_CONFIGURED",
      mongoStatus: mongoResult ? mongoResult.status : "NOT_CONFIGURED"
    });

    res.json({
      success: true,
      message: `Product review status set to ${reviewStatus}`,
      product: updated,
      cloudinary: cloudinaryResult,
      mongo: mongoResult
    });
  } catch (err) {
    console.error("Update review status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Cloudinary Account Usage & Quota
 */
router.get("/cloudinary/usage", requireAdmin, async (req, res) => {
  try {
    const usage = await cloudinaryService.getAccountUsage();
    res.json({ success: true, usage });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Catalogue-Wide Cloudinary Dry Run Report
 */
router.get("/cloudinary/dry-run", requireAdmin, async (req, res) => {
  try {
    const allProducts = store.getProducts({ includeInactive: true });
    const dryRun = await cloudinaryService.getCatalogueDryRun(allProducts);
    res.json({ success: true, dryRun });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Manual/Retry Product Cloudinary Sync
 */
router.post("/products/:id/sync-cloudinary", requireAdmin, async (req, res) => {
  try {
    const product = store.getProductById(req.params.id, true);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.reviewStatus === "CORRECT") {
      const syncRes = await cloudinaryService.syncProductReviewToCorrect(product, { forceReupload: true });
      const updated = store.updateProduct(product.id, {
        managedCloudinaryImages: syncRes.managedImages,
        images: syncRes.images,
        primaryImage: syncRes.primaryImage,
        originalImages: syncRes.originalImages,
        originalPrimaryImage: syncRes.originalPrimaryImage,
        cloudinarySyncStatus: syncRes.status,
        cloudinaryLastSyncedAt: new Date().toISOString()
      });
      return res.json({ success: true, product: updated, cloudinary: syncRes });
    } else {
      const allProducts = store.getProducts({ includeInactive: true });
      const remRes = await cloudinaryService.syncProductReviewRemoval(product, allProducts);
      const updated = store.updateProduct(product.id, {
        images: remRes.restoredImages,
        primaryImage: remRes.restoredPrimaryImage,
        managedCloudinaryImages: [],
        cloudinarySyncStatus: remRes.status,
        cloudinaryLastSyncedAt: new Date().toISOString()
      });
      return res.json({ success: true, product: updated, cloudinary: remRes });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * MongoDB Atlas Connection Status & Document Counts
 */
router.get("/mongodb/status", requireAdmin, async (req, res) => {
  try {
    const status = await mongoService.getMongoStatus();
    res.json({ success: true, mongodb: status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Manual/Retry Product MongoDB Atlas Synchronization
 */
router.post("/products/:id/sync-mongodb", requireAdmin, async (req, res) => {
  try {
    const product = store.getProductById(req.params.id, true);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.reviewStatus === "CORRECT") {
      const mRes = await mongoService.upsertApprovedProduct(product, req.admin.email);
      const updated = store.updateProduct(product.id, {
        mongoSyncStatus: mRes.status,
        mongoSyncedAt: new Date().toISOString()
      });
      return res.json({ success: true, product: updated, mongodb: mRes });
    } else {
      const mRes = await mongoService.removeApprovedProduct(product.id);
      const updated = store.updateProduct(product.id, {
        mongoSyncStatus: mRes.status,
        mongoSyncedAt: new Date().toISOString()
      });
      return res.json({ success: true, product: updated, mongodb: mRes });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Toggle Active/Inactive Status for Product
 */
router.put("/products/:id/status", requireAdmin, (req, res) => {
  try {
    const { status } = req.body;
    const permitted = ["ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"];
    if (!status || !permitted.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${permitted.join(", ")}`
      });
    }

    const existing = store.getProductById(req.params.id, true);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const updated = store.updateProduct(existing.id, {
      status,
      updatedBy: req.admin?.email || "SYSTEM_ADMIN",
      updatedAt: new Date().toISOString()
    });

    if (!updated) {
      return res.status(500).json({ success: false, message: "Failed to persist product status update in store." });
    }

    auditService.logAction(req.admin?.email || "SYSTEM_ADMIN", "PRODUCT_STATUS_TOGGLED", existing.id, {
      title: updated.title || updated.productName,
      fromStatus: existing.status || "ACTIVE",
      toStatus: status
    });

    res.json({
      success: true,
      message: `Product status updated to ${status}`,
      product: updated
    });
  } catch (err) {
    console.error("Update product status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/products", requireAdmin, (req, res) => {
  try {
    const data = req.body;
    if (!data.productName && !data.title) {
      return res.status(400).json({ success: false, message: "Product name is required" });
    }

    const allProducts = store.getProducts({ includeInactive: true });

    // Enforce SKU Uniqueness
    if (data.sku) {
      const cleanSku = data.sku.trim().toLowerCase();
      const skuConflict = allProducts.find(p => (p.sku || p.SKU || "").toLowerCase() === cleanSku);
      if (skuConflict) {
        return res.status(400).json({
          success: false,
          message: `SKU '${data.sku}' is already assigned to '${skuConflict.title || skuConflict.productName}'. Please provide a unique SKU.`
        });
      }
    }

    // Duplicate Check
    const norm = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    const normModel = norm(data.modelNumber);
    const normTitle = norm(data.title || data.productName);

    const duplicate = allProducts.find(p => {
      const catMatch = p.category === data.category || norm(p.category) === norm(data.category);
      if (!catMatch) return false;

      if (normModel && p.modelNumber && norm(p.modelNumber) === normModel) return true;
      if (normTitle && p.title && norm(p.title) === normTitle) return true;
      if (data.equipmentType && p.equipmentType && norm(p.equipmentType) === norm(data.equipmentType)) {
        if (normModel && p.modelNumber && norm(p.modelNumber) === normModel) return true;
      }
      return false;
    });

    if (duplicate && !data.forceCreate) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        message: "A matching product already exists in this category. Please open the existing product instead of creating a duplicate.",
        duplicateProduct: {
          id: duplicate.id,
          title: duplicate.title || duplicate.productName,
          sku: duplicate.sku || duplicate.SKU,
          modelNumber: duplicate.modelNumber
        }
      });
    }

    const created = store.addProduct({
      ...data,
      createdBy: req.admin.email,
      updatedBy: req.admin.email
    });

    auditService.logAction(req.admin.email, "PRODUCT_CREATED", created.id, {
      title: created.title || created.productName,
      basePrice: created.basePrice,
      sku: created.sku
    });

    res.status(201).json({ success: true, product: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/products/:id", requireAdmin, (req, res) => {
  try {
    const existing = store.getProductById(req.params.id, true);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const updates = {
      ...req.body,
      updatedBy: req.admin?.email || "SYSTEM_ADMIN",
      updatedAt: new Date().toISOString()
    };

    const updated = store.updateProduct(existing.id, updates);
    if (!updated) {
      return res.status(500).json({ success: false, message: "Failed to persist product update in store." });
    }

    // Detect specific changes for granular audit logging
    const changes = {};
    if (existing.basePrice !== updated.basePrice) {
      changes.price = { from: existing.basePrice, to: updated.basePrice };
      auditService.logAction(req.admin?.email || "SYSTEM_ADMIN", "PRICE_CHANGED", updated.id, changes.price);
    }
    if (existing.status !== updated.status) {
      changes.status = { from: existing.status, to: updated.status };
      auditService.logAction(req.admin?.email || "SYSTEM_ADMIN", "STATUS_CHANGED", updated.id, changes.status);
    }

    auditService.logAction(req.admin?.email || "SYSTEM_ADMIN", "PRODUCT_UPDATED", updated.id, {
      title: updated.title || updated.productName,
      changes
    });

    res.json({ success: true, product: updated });
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/products/:id/sync-price", requireAdmin, (req, res) => {
  const existing = store.getProductById(req.params.id, true);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const auditPath = path.join(__dirname, "../data/reference_catalogue_audit.json");
  let auditItems = [];
  if (fs.existsSync(auditPath)) {
    auditItems = JSON.parse(fs.readFileSync(auditPath, "utf-8"));
  }

  const pslug = existing.slug;
  const ptitle = (existing.title || "").toLowerCase();
  const matched = auditItems.find(a => a.slug === pslug || (a.modelRibbon && ptitle.includes(a.modelRibbon.toLowerCase())));

  if (!matched || matched.status === "NO_PRICE" || !matched.regularPriceINR) {
    return res.json({
      success: false,
      message: "No public reference price available for this product on source catalogue.",
      product: existing
    });
  }

  const refPricing = {
    referenceSource: "SKRILIX Global Public Catalogue",
    referenceProductName: matched.referenceProductName,
    referenceModel: matched.modelRibbon,
    category: matched.category,
    referenceURL: matched.referenceURL,
    referenceRegularINR: matched.regularPriceINR,
    referenceSaleINR: matched.salePriceINR,
    referenceRegularUSD: matched.regularPriceUSD,
    referenceSaleUSD: matched.salePriceUSD,
    hasDiscount: matched.hasDiscount,
    discountPercentage: matched.regularPriceINR > matched.salePriceINR ? Math.round(((matched.regularPriceINR - matched.salePriceINR) / matched.regularPriceINR) * 100) : 0,
    lastSyncedAt: new Date().toISOString(),
    syncStatus: "SYNCED"
  };

  const applyToSelling = req.body.applyToSelling === true;
  const updates = {
    referencePricing: refPricing,
    lastPriceSync: refPricing.lastSyncedAt,
    priceSyncStatus: "SYNCED"
  };

  if (applyToSelling) {
    updates.basePrice = matched.salePriceINR || matched.regularPriceINR;
    updates.regularPrice = matched.regularPriceINR;
    updates.salePrice = matched.salePriceINR || matched.regularPriceINR;
    updates.discountPercentage = refPricing.discountPercentage;
  }

  const updated = store.updateProduct(existing.id, updates);
  auditService.logAction(req.admin.email, "PRICE_SYNCED", updated.id, {
    referenceRegularINR: matched.regularPriceINR,
    referenceSaleINR: matched.salePriceINR,
    appliedToSelling: applyToSelling
  });

  res.json({ success: true, product: updated, referencePricing: refPricing });
});

router.delete("/products/:id", requireAdmin, (req, res) => {
  const permanent = req.query.permanent === "true";
  const existing = store.getProductById(req.params.id, true);

  if (!existing) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  if (permanent) {
    // Check if in historical orders
    const orders = store.getOrders();
    const hasOrder = orders.some(o => o.items && o.items.some(it => it.productId === existing.id));
    if (hasOrder) {
      // Prevent corruption of orders: automatically archive instead of raw deletion
      const archived = store.updateProduct(existing.id, { status: "ARCHIVED", updatedBy: req.admin.email });
      auditService.logAction(req.admin.email, "PRODUCT_ARCHIVED", existing.id, { reason: "Preserved for historical orders" });
      return res.json({
        success: true,
        message: "Product has associated customer order history. Product archived to protect order records.",
        product: archived
      });
    }

    const removed = store.deleteProduct(req.params.id);
    auditService.logAction(req.admin.email, "PRODUCT_DELETED", existing.id, { title: existing.title || existing.productName });
    res.json({ success: true, deleted: true, message: "Product permanently deleted", product: removed });
  } else {
    // Soft delete / archive
    const archived = store.updateProduct(existing.id, { status: "ARCHIVED", updatedBy: req.admin.email });
    auditService.logAction(req.admin.email, "PRODUCT_ARCHIVED", existing.id, { title: existing.title || existing.productName });
    res.json({ success: true, archived: true, message: "Product archived successfully", product: archived });
  }
});

router.post("/products/:id/duplicate", requireAdmin, (req, res) => {
  const existing = store.getProductById(req.params.id, true);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const copySlug = `${existing.slug}-copy-${Math.random().toString(36).substring(2, 6)}`;
  const copyTitle = `${existing.title || existing.productName} (Copy)`;
  const copySku = `${existing.sku || existing.SKU || "DRM"}-CPY`;

  const duplicatedData = {
    ...existing,
    id: undefined, // auto-generated
    title: copyTitle,
    productName: copyTitle,
    slug: copySlug,
    sku: copySku,
    status: "DRAFT",
    featured: false,
    isFeatured: false,
    bestseller: false,
    isBestSeller: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: req.admin.email,
    updatedBy: req.admin.email
  };

  const created = store.addProduct(duplicatedData);
  auditService.logAction(req.admin.email, "PRODUCT_DUPLICATED", created.id, { originalId: existing.id, copyTitle });
  res.status(201).json({ success: true, product: created });
});

router.post("/products/bulk", requireAdmin, (req, res) => {
  const { ids, action, value } = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || !action) {
    return res.status(400).json({ success: false, message: "ids array and action are required" });
  }

  let affected = 0;
  ids.forEach(id => {
    const p = store.getProductById(id, true);
    if (p) {
      if (action === "publish") {
        store.updateProduct(id, { status: "ACTIVE", updatedBy: req.admin.email });
        affected++;
      } else if (action === "unpublish") {
        store.updateProduct(id, { status: "DRAFT", updatedBy: req.admin.email });
        affected++;
      } else if (action === "archive") {
        store.updateProduct(id, { status: "ARCHIVED", updatedBy: req.admin.email });
        affected++;
      } else if (action === "delete") {
        store.deleteProduct(id);
        affected++;
      } else if (action === "set_category" && value) {
        store.updateProduct(id, { category: value, updatedBy: req.admin.email });
        affected++;
      }
    }
  });

  auditService.logAction(req.admin.email, "BULK_ACTION", null, { action, affectedCount: affected, ids });
  res.json({ success: true, action, affectedCount: affected });
});

// ==========================================
// 4. AI & IDENTITY GENERATOR ENDPOINTS
// ==========================================

router.post("/products/suggest-identity", requireAdmin, (req, res) => {
  try {
    const { category, subcategory, equipmentType, currentProduct = {} } = req.body;
    const suggestions = aiGeneratorService.generateIdentitySuggestions({
      category,
      subcategory,
      equipmentType,
      currentProduct
    });

    res.json({ success: true, suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/products/ai-generate", requireAdmin, (req, res) => {
  try {
    const productContext = req.body;
    const generated = aiGeneratorService.generateProductContent(productContext);

    auditService.logAction(req.admin.email, "AI_DESCRIPTION_GENERATED", productContext.id || null, {
      productName: productContext.productName || productContext.title,
      modelNumber: productContext.modelNumber
    });

    res.json({
      success: true,
      generated: {
        shortDescription: generated.data.shortDescription,
        fullDescription: generated.data.fullDescription,
        features: generated.data.keyFeatures,
        keyFeatures: generated.data.keyFeatures,
        benefits: generated.data.benefits,
        applications: generated.data.applications,
        metaTitle: generated.data.seo.metaTitle,
        metaDescription: generated.data.seo.metaDescription
      },
      data: generated.data,
      metadata: generated.metadata
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/products/ai-identify", requireAdmin, async (req, res) => {
  try {
    const rawPhotos = (req.body && req.body.photos) || 
                      (req.body && req.body.images) || 
                      (req.body && req.body.photo ? [req.body.photo] : null) || 
                      (req.body && req.body.image ? [req.body.image] : null);

    if (!rawPhotos || !Array.isArray(rawPhotos) || rawPhotos.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one photograph is required for AI product identification."
      });
    }

    if (rawPhotos.length > geminiVisionService.MAX_PHOTOS) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${geminiVisionService.MAX_PHOTOS} photographs allowed per identification request.`
      });
    }

    // Format incoming photos (supports array of base64 strings or objects with { data, mimeType, filename })
    const photos = rawPhotos.map((item, idx) => {
      if (typeof item === "string") {
        let mimeType = "image/jpeg";
        const match = item.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
        if (match) {
          mimeType = match[1];
        }
        return {
          data: item,
          mimeType,
          filename: `photo_${idx + 1}.jpg`
        };
      }
      return {
        data: item.data || item.base64 || item.url || item.file,
        mimeType: item.mimeType || item.contentType || "image/jpeg",
        filename: item.filename || item.name || `photo_${idx + 1}.jpg`
      };
    });

    const result = await geminiVisionService.identifyProductFromPhotos(photos);

    auditService.logAction(req.admin.email, "AI_PRODUCT_IDENTIFIED", null, {
      photosCount: photos.length,
      modelUsed: result.modelUsed,
      equipmentType: result.data.equipmentType,
      confidence: result.data.confidence
    });

    res.json({
      success: true,
      data: result.data,
      metadata: {
        engine: "AI Product Identification",
        photosAnalyzed: result.photosAnalyzed,
        identifiedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("[Admin API] AI Product Identification Error:", err.message);
    const msg = err.message || "Failed to identify medical equipment.";
    let statusCode = 500;
    if (msg.includes("GEMINI_API_KEY") || msg.includes("API key")) {
      statusCode = 503;
    } else if (msg.includes("rate limit") || msg.includes("RESOURCE_EXHAUSTED")) {
      statusCode = 429;
    } else if (msg.includes("high demand") || msg.includes("503")) {
      statusCode = 503;
    } else if (msg.includes("Maximum") || msg.includes("Unsupported") || msg.includes("No photographs") || msg.includes("Invalid")) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      message: msg
    });
  }
});

// ==========================================
// 5. MEDIA MANAGEMENT ENDPOINTS
// ==========================================

router.post("/media/upload", requireAdmin, async (req, res) => {
  try {
    const rawImage = req.body.imageBase64 || req.body.data || req.body.file || req.body.image;
    const { filename = "image.jpg", mimeType, contentType, productId = "general", altText = "" } = req.body;
    const finalMime = mimeType || contentType || "image/jpeg";

    if (!rawImage) {
      return res.status(400).json({ success: false, message: "Image base64 payload is required" });
    }

    const uploaded = await mediaService.uploadProductImage(rawImage, filename, finalMime, productId, altText);

    auditService.logAction(req.admin.email, "IMAGE_UPLOADED", productId, {
      url: uploaded.url,
      filename
    });

    res.status(201).json({
      success: true,
      image: uploaded,
      asset: uploaded,
      url: uploaded.url
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/media/upload-batch", requireAdmin, async (req, res) => {
  try {
    const { items = [], images = [], productId = "general" } = req.body;
    const filesToUpload = items.length > 0 ? items : images;

    if (!Array.isArray(filesToUpload) || filesToUpload.length === 0) {
      return res.status(400).json({ success: false, message: "No images provided for batch upload" });
    }

    const uploadedResults = [];
    const errors = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      const item = filesToUpload[i];
      const rawImage = item.imageBase64 || item.data || item.file || item.image;
      const filename = item.filename || `image_${i + 1}.jpg`;
      const mimeType = item.mimeType || item.contentType || "image/jpeg";
      const altText = item.altText || filename;

      if (!rawImage) {
        errors.push({ filename, error: "Missing image data" });
        continue;
      }

      try {
        const uploaded = await mediaService.uploadProductImage(rawImage, filename, mimeType, productId, altText);
        uploadedResults.push(uploaded);
      } catch (uploadErr) {
        errors.push({ filename, error: uploadErr.message });
      }
    }

    auditService.logAction(req.admin.email, "BATCH_IMAGES_UPLOADED", productId, {
      uploadedCount: uploadedResults.length,
      failedCount: errors.length
    });

    res.status(201).json({
      success: true,
      uploadedCount: uploadedResults.length,
      images: uploadedResults,
      urls: uploadedResults.map(u => u.url),
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/media", requireAdmin, async (req, res) => {
  try {
    const { url, productId } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: "Image url is required" });
    }

    await mediaService.deleteProductImage(url);

    // If productId provided, clean up product record gallery
    if (productId) {
      const p = store.getProductById(productId, true);
      if (p) {
        let updatedGallery = (p.galleryImages || []).filter(img => (typeof img === "string" ? img : img.url) !== url);
        let updatedImages = (p.images || []).filter(u => u !== url);
        let newPrimary = p.primaryImage === url ? (updatedImages[0] || null) : p.primaryImage;

        store.updateProduct(productId, {
          galleryImages: updatedGallery,
          images: updatedImages,
          primaryImage: newPrimary,
          updatedBy: req.admin.email
        });
      }
    }

    auditService.logAction(req.admin.email, "IMAGE_DELETED", productId || null, { url });
    res.json({ success: true, message: "Image removed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 6. AUDIT LOGS ENDPOINT
// ==========================================

router.get("/audit-logs", requireAdmin, (req, res) => {
  const logs = auditService.getLogs(req.query);
  res.json({ success: true, count: logs.length, logs });
});

// ==========================================
// 7. CATEGORY MANAGEMENT ENDPOINTS
// ==========================================

router.get("/categories", requireAdmin, (req, res) => {
  const allCats = store.getAllCategories();
  const allProds = store.getProducts({ includeInactive: true });
  const categoryStats = allCats.map(cat => {
    const prods = allProds.filter(p => p.category === cat.id || p.category === cat.slug);
    const published = prods.filter(p => (p.status || "ACTIVE") === "ACTIVE");
    return {
      ...cat,
      totalProducts: prods.length,
      publishedProducts: published.length
    };
  });
  res.json({ success: true, categories: categoryStats });
});

router.put("/categories/:id", requireAdmin, (req, res) => {
  const cat = store.getAllCategories().find(c => c.id === req.params.id || c.slug === req.params.id);
  if (!cat) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }
  const updates = req.body;
  const updated = store.updateCategory(cat.id, updates);
  auditService.logAction(req.admin.email, "CATEGORY_UPDATED", cat.id, updates);
  res.json({ success: true, category: updated });
});

router.put("/categories/:id/status", requireAdmin, (req, res) => {
  const cat = store.getAllCategories().find(c => c.id === req.params.id || c.slug === req.params.id);
  if (!cat) {
    return res.status(404).json({ success: false, message: "Category not found" });
  }
  const { status, active } = req.body;
  const newStatus = status || (active ? "ACTIVE" : "INACTIVE");
  const newActive = active !== undefined ? active : newStatus === "ACTIVE";

  const updated = store.updateCategory(cat.id, { status: newStatus, active: newActive });
  auditService.logAction(req.admin.email, "CATEGORY_STATUS_CHANGED", cat.id, {
    categoryName: cat.name,
    status: newStatus,
    active: newActive
  });
  res.json({ success: true, category: updated });
});

// ==========================================
// 8. CUSTOMER REVIEWS & CLINICAL FEEDBACK MODERATION
// ==========================================

router.get("/reviews", requireAdmin, async (req, res) => {
  try {
    const { status, productId, page, limit } = req.query;
    const result = await firestoreService.getAdminReviews({
      status: status || "ALL",
      productId: productId || null,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put("/reviews/:id/status", requireAdmin, async (req, res) => {
  try {
    const { status, verifiedPurchase, adminNote } = req.body;
    const updated = await firestoreService.updateReviewStatus(req.params.id, {
      status,
      verifiedPurchase,
      adminNote
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    auditService.logAction(req.admin.email, "REVIEW_STATUS_UPDATED", req.params.id, {
      status,
      verifiedPurchase,
      adminNote
    });

    res.json({ success: true, review: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.delete("/reviews/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await firestoreService.deleteReview(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    auditService.logAction(req.admin.email, "REVIEW_DELETED", req.params.id, {});
    res.json({ success: true, message: "Review permanently deleted." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 9. CUSTOMER ACCOUNTS & DIRECTORY (SUPABASE AUTH)
// ==========================================

router.get("/customers", requireAdmin, async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const result = await supabaseService.getCustomers({
      search,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/customers/:id", requireAdmin, async (req, res) => {
  try {
    const customer = await supabaseService.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 10. CUSTOMER LOGIN ACTIVITY AUDIT (30-DAY RETENTION)
// ==========================================

router.get("/customer-activity", requireAdmin, async (req, res) => {
  try {
    const { search, page, limit, sortBy, sortOrder } = req.query;
    const result = await supabaseService.getCustomerLoginActivity({
      search,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      sortBy: sortBy || "date",
      sortOrder: sortOrder || "desc"
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/customer-activity/cleanup", requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.body;
    const result = supabaseService.cleanupExpiredActivity(parseInt(days, 10) || 30);
    auditService.logAction(req.admin.email, "CUSTOMER_ACTIVITY_CLEANED", null, result);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
