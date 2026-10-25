const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
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
const imageResolver = require("../services/imageResolver");

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
      const rawUrl = typeof img === "string" ? img : (img && img.url ? img.url : null);
      const url = typeof rawUrl === "string" ? rawUrl : (rawUrl && typeof rawUrl.url === "string" ? rawUrl.url : null);
      if (typeof url === "string" && (url.startsWith("/products-") || url.startsWith("/uploads"))) {
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

router.get("/products", requireAdmin, async (req, res) => {
  const { search, category, status, includeArchived, stock, reviewStatus, sort = "updated_desc", page = 1, limit = 20 } = req.query;

  // 1. Get tombstone deleted product IDs from MongoDB Atlas
  const deletedIds = mongoService.isConfigured() ? await mongoService.getDeletedProductIds() : new Set();

  // 2. Pre-calculate orders reference map so frontend knows whether each product has order history
  const orders = store.getOrders();
  const orderProductIds = new Set();
  orders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach(it => {
        if (it && it.productId) orderProductIds.add(String(it.productId));
      });
    }
  });

  // 3. Load base list from store, excluding permanently deleted IDs
  let list = store.getProducts({ includeInactive: true }).filter(p => !deletedIds.has(String(p.id)));

  // 4. Merge authoritative records from MongoDB if configured and reachable
  if (mongoService.isConfigured()) {
    try {
      const mongoList = await mongoService.getProductsFromMongo();
      if (Array.isArray(mongoList)) {
        const activeMongoList = mongoList.filter(m => !deletedIds.has(String(m.id)));
        const mongoMap = new Map(activeMongoList.map(m => [String(m.id), m]));
        const storeMap = new Set(list.map(p => String(p.id)));

        // Merge onto existing store items
        list = list.map(p => {
          const pid = String(p.id);
          const hasOrders = orderProductIds.has(pid);
          const m = mongoMap.get(pid);
          if (m) {
            return {
              ...p,
              ...m,
              hasOrders,
              mongoSyncStatus: "SYNCED",
              mongoSyncedAt: m.mongoSyncedAt || p.mongoSyncedAt || new Date().toISOString(),
              reviewStatus: (m.reviewStatus === "CORRECT" || p.reviewStatus === "CORRECT")
                ? "CORRECT"
                : (m.reviewStatus === "NEEDS_EDITING" || p.reviewStatus === "NEEDS_EDITING")
                ? "NEEDS_EDITING"
                : (m.reviewStatus || p.reviewStatus || "PENDING"),
              reviewNote: m.reviewNote !== undefined ? m.reviewNote : p.reviewNote
            };
          }
          return {
            ...p,
            hasOrders,
            mongoSyncStatus: p.mongoSyncStatus === "SYNC_FAILED" ? "SYNC_FAILED" : (p.mongoSyncStatus || "PENDING")
          };
        });

        // Add any products that exist in MongoDB but NOT in store
        activeMongoList.forEach(m => {
          const mid = String(m.id);
          if (!storeMap.has(mid)) {
            list.push({
              ...m,
              hasOrders: orderProductIds.has(mid),
              mongoSyncStatus: "SYNCED",
              mongoSyncedAt: m.mongoSyncedAt || new Date().toISOString(),
              reviewStatus: m.reviewStatus || "PENDING"
            });
          }
        });
      }
    } catch (e) {
      // Fallback gracefully to store
      list = list.map(p => ({
        ...p,
        hasOrders: orderProductIds.has(String(p.id))
      }));
    }
  } else {
    list = list.map(p => ({
      ...p,
      hasOrders: orderProductIds.has(String(p.id))
    }));
  }

  // 5. Exclude archived/retired products from active catalogue list unless explicitly requested
  // CRITICAL: Filter AFTER merging MongoDB authoritative status so database status is respected!
  if (status === "ARCHIVED") {
    list = list.filter(p => p.status === "ARCHIVED" || p.isRetired === true);
  } else if (!includeArchived && status !== "ALL_WITH_ARCHIVED") {
    list = list.filter(p => p.status !== "ARCHIVED" && !p.isRetired && p.inCatalogue !== false);
  }

  // Calculate live review counts across active catalogue products before filtering
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
  if (status && status !== "ALL" && status !== "ARCHIVED") {
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
  res.json({ success: true, hierarchy: store.getCatalogueHierarchy() });
});

router.post("/catalogue/primary-category", requireAdmin, (req, res) => {
  try {
    const { name, code, shortDescription } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }
    const result = store.addPrimaryCategory({ name: name.trim(), code, shortDescription });
    auditService.logAction(req.admin?.email || "ADMIN", "PRIMARY_CATEGORY_CREATED", result.category.id, { name, code });
    res.json({
      success: true,
      message: `Primary category "${result.category.name}" created successfully.`,
      category: result.category,
      hierarchy: store.getCatalogueHierarchy(),
      categories: store.getCategories(true)
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/catalogue/subcategory", requireAdmin, (req, res) => {
  try {
    const { parentCategory, name } = req.body;
    if (!parentCategory || typeof parentCategory !== "string" || !parentCategory.trim()) {
      return res.status(400).json({ success: false, message: "Parent primary category is required." });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Subcategory name is required." });
    }
    const result = store.addSubcategory({ parentCategory: parentCategory.trim(), name: name.trim() });
    auditService.logAction(req.admin?.email || "ADMIN", "SUBCATEGORY_CREATED", result.subcategory.id, { parentCategory, name });
    res.json({
      success: true,
      message: `Subcategory "${result.subcategory.name}" created successfully.`,
      subcategory: result.subcategory,
      parentCategory: result.parentCategory,
      hierarchy: store.getCatalogueHierarchy(),
      categories: store.getCategories(true)
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/catalogue/equipment-type", requireAdmin, (req, res) => {
  try {
    const { parentCategory, subcategory, name } = req.body;
    if (!parentCategory || typeof parentCategory !== "string" || !parentCategory.trim()) {
      return res.status(400).json({ success: false, message: "Primary category is required." });
    }
    if (!subcategory || typeof subcategory !== "string" || !subcategory.trim()) {
      return res.status(400).json({ success: false, message: "Subcategory is required." });
    }
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Equipment type name is required." });
    }
    const result = store.addEquipmentType({
      parentCategory: parentCategory.trim(),
      subcategory: subcategory.trim(),
      name: name.trim()
    });
    auditService.logAction(req.admin?.email || "ADMIN", "EQUIPMENT_TYPE_CREATED", result.equipmentType.id, { parentCategory, subcategory, name });
    res.json({
      success: true,
      message: `Verified equipment type "${result.equipmentType.name}" created successfully.`,
      equipmentType: result.equipmentType,
      hierarchy: store.getCatalogueHierarchy()
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Also alias POST /categories to primary-category creation for standard REST consistency
router.post("/categories", requireAdmin, (req, res) => {
  try {
    const { name, code, shortDescription } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required." });
    }
    const result = store.addPrimaryCategory({ name: name.trim(), code, shortDescription });
    auditService.logAction(req.admin?.email || "ADMIN", "PRIMARY_CATEGORY_CREATED", result.category.id, { name, code });
    res.json({
      success: true,
      message: `Primary category "${result.category.name}" created successfully.`,
      category: result.category,
      hierarchy: store.getCatalogueHierarchy(),
      categories: store.getCategories(true)
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update Primary Category
router.put("/catalogue/primary-category/:id", requireAdmin, (req, res) => {
  try {
    const { name, shortDescription, code } = req.body;
    const cat = store.getAllCategories().find(c => c.id === req.params.id || c.slug === req.params.id);
    if (!cat) {
      return res.status(404).json({ success: false, message: "Category not found." });
    }
    const updates = {};
    if (name && typeof name === "string" && name.trim()) updates.name = name.trim();
    if (shortDescription !== undefined) updates.shortDescription = shortDescription;
    const updated = store.updateCategory(cat.id, updates);
    auditService.logAction(req.admin?.email || "ADMIN", "PRIMARY_CATEGORY_UPDATED", cat.id, updates);
    res.json({
      success: true,
      message: `Primary category "${updated.name}" updated successfully.`,
      category: updated,
      hierarchy: store.getCatalogueHierarchy(),
      categories: store.getCategories(true)
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete Primary Category
router.delete("/catalogue/primary-category/:id", requireAdmin, (req, res) => {
  try {
    const result = store.deletePrimaryCategory(req.params.id);
    auditService.logAction(req.admin?.email || "ADMIN", "PRIMARY_CATEGORY_DELETED", req.params.id, {});
    res.json({
      success: true,
      message: result.message,
      hierarchy: store.getCatalogueHierarchy(),
      categories: store.getCategories(true)
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Alias DELETE /categories/:id
router.delete("/categories/:id", requireAdmin, (req, res) => {
  try {
    const result = store.deletePrimaryCategory(req.params.id);
    auditService.logAction(req.admin?.email || "ADMIN", "PRIMARY_CATEGORY_DELETED", req.params.id, {});
    res.json({
      success: true,
      message: result.message,
      hierarchy: store.getCatalogueHierarchy(),
      categories: store.getCategories(true)
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update Subcategory
router.put("/catalogue/subcategory/:parentCategory/:subId", requireAdmin, (req, res) => {
  try {
    const { name } = req.body;
    const result = store.updateSubcategory(req.params.parentCategory, req.params.subId, { name });
    auditService.logAction(req.admin?.email || "ADMIN", "SUBCATEGORY_UPDATED", req.params.subId, { parentCategory: req.params.parentCategory, name });
    res.json({
      success: true,
      message: result.message,
      hierarchy: store.getCatalogueHierarchy()
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete Subcategory
router.delete("/catalogue/subcategory/:parentCategory/:subId", requireAdmin, (req, res) => {
  try {
    const result = store.deleteSubcategory(req.params.parentCategory, req.params.subId);
    auditService.logAction(req.admin?.email || "ADMIN", "SUBCATEGORY_DELETED", req.params.subId, { parentCategory: req.params.parentCategory });
    res.json({
      success: true,
      message: result.message,
      hierarchy: store.getCatalogueHierarchy()
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update Equipment Type
router.put("/catalogue/equipment-type/:parentCategory/:subcategory/:eqId", requireAdmin, (req, res) => {
  try {
    const { name, code } = req.body;
    const result = store.updateEquipmentType(req.params.parentCategory, req.params.subcategory, req.params.eqId, { name, code });
    auditService.logAction(req.admin?.email || "ADMIN", "EQUIPMENT_TYPE_UPDATED", req.params.eqId, { name, code });
    res.json({
      success: true,
      message: result.message,
      hierarchy: store.getCatalogueHierarchy()
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete Equipment Type
router.delete("/catalogue/equipment-type/:parentCategory/:subcategory/:eqId", requireAdmin, (req, res) => {
  try {
    const result = store.deleteEquipmentType(req.params.parentCategory, req.params.subcategory, req.params.eqId);
    auditService.logAction(req.admin?.email || "ADMIN", "EQUIPMENT_TYPE_DELETED", req.params.eqId, { parentCategory: req.params.parentCategory, subcategory: req.params.subcategory });
    res.json({
      success: true,
      message: result.message,
      hierarchy: store.getCatalogueHierarchy()
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Global Admin Search
router.get("/search", requireAdmin, async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    if (!q) {
      return res.json({ success: true, results: [] });
    }

    const results = [];

    // 1. Products (title, sku, brand, model)
    const allProducts = store.getProducts({ includeInactive: true }) || [];
    for (const p of allProducts) {
      const title = p.title || p.productName || "";
      const sku = p.sku || p.SKU || "";
      const brand = p.brand || "";
      const model = p.model || "";
      if (
        title.toLowerCase().includes(q) ||
        sku.toLowerCase().includes(q) ||
        brand.toLowerCase().includes(q) ||
        model.toLowerCase().includes(q)
      ) {
        results.push({
          type: "product",
          id: p.id,
          title: title,
          subtitle: `SKU: ${sku || "N/A"} • ${brand || "DR.MEDEX"} • ${p.category || ""}`,
          url: `/admin/products/${p.id}/edit`
        });
        if (results.filter(r => r.type === "product").length >= 6) break;
      }
    }

    // 2. Categories & Taxonomy (primary, subcategory, equipment type)
    const hierarchy = store.getCatalogueHierarchy() || {};
    for (const [catKey, cat] of Object.entries(hierarchy)) {
      if ((cat.name || "").toLowerCase().includes(q) || catKey.toLowerCase().includes(q)) {
        results.push({
          type: "category",
          id: cat.id || catKey,
          title: cat.name,
          subtitle: `Primary Category • ${cat.code || "MED"} • ${cat.subcategories?.length || 0} subcategories`,
          url: `/admin/categories?tab=primary&search=${encodeURIComponent(cat.name)}`
        });
      }

      if (Array.isArray(cat.subcategories)) {
        for (const sub of cat.subcategories) {
          if ((sub.name || "").toLowerCase().includes(q) || (sub.id || "").toLowerCase().includes(q)) {
            results.push({
              type: "subcategory",
              id: `${catKey}-${sub.id}`,
              title: sub.name,
              subtitle: `Subcategory under ${cat.name}`,
              url: `/admin/categories?tab=subcategories&search=${encodeURIComponent(sub.name)}`
            });
          }

          if (Array.isArray(sub.equipmentTypes)) {
            for (const eq of sub.equipmentTypes) {
              if ((eq.name || "").toLowerCase().includes(q) || (eq.id || "").toLowerCase().includes(q)) {
                results.push({
                  type: "equipment-type",
                  id: `${catKey}-${sub.id}-${eq.id || eq.name}`,
                  title: eq.name,
                  subtitle: `Verified Equipment Type (${eq.defaultCode || eq.code || "EQP"}) • ${sub.name}`,
                  url: `/admin/categories?tab=equipment-types&search=${encodeURIComponent(eq.name)}`
                });
              }
            }
          }
        }
      }
    }

    // 3. Orders (order id, orderNumber, customer name)
    const allOrders = store.getOrders() || [];
    for (const o of allOrders) {
      const orderId = o.id || "";
      const orderNum = o.orderNumber || "";
      const custName = o.customerName || o.shippingAddress?.fullName || "";
      if (
        orderId.toLowerCase().includes(q) ||
        orderNum.toLowerCase().includes(q) ||
        custName.toLowerCase().includes(q)
      ) {
        results.push({
          type: "order",
          id: orderId,
          title: `Order #${(orderNum || orderId).slice(0, 10).toUpperCase()}`,
          subtitle: `${custName || "Customer"} • $${Number(o.totalAmount || o.total || 0).toLocaleString()} • ${o.status || "Pending"}`,
          url: `/admin`
        });
        if (results.filter(r => r.type === "order").length >= 4) break;
      }
    }

    // 4. Customers
    try {
      const custRes = await supabaseService.getCustomers({ search: q, limit: 4 });
      if (custRes && Array.isArray(custRes.customers)) {
        for (const c of custRes.customers) {
          results.push({
            type: "customer",
            id: c.id,
            title: c.fullName || c.name || c.email,
            subtitle: `Customer • ${c.email} • ${c.institution || "Healthcare Organization"}`,
            url: `/admin/customers?search=${encodeURIComponent(c.email || c.fullName || "")}`
          });
        }
      }
    } catch (e) {
      // Supabase customer search is optional fallback
    }

    res.json({ success: true, results: results.slice(0, 15) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message, results: [] });
  }
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

// ==========================================
// SKU GENERATION TAXONOMY CODES & GENERATOR
// Format: DRM-[PRIMARY]-[SUBCATEGORY]-[NAME]-[UNIQUE-ID]
// Example: DRM-OTL-TRC-ADJUSTABLE-7K4P2M
// ==========================================
const SKU_CAT_CODES = {
  "ot-lights": "OTL",
  "electrosurgical-units": "ESU",
  "cryo-surgical": "CRY",
  "examination-ot-tables": "TAB",
  "obstetrics-and-gynaecology": "OBG",
  "medical-equipment": "MED",
  "physiotherapy": "PHY"
};

const SKU_SUBCAT_CODES = {
  "single-dome-ot-lights": "SDL",
  "ot-surgical-lights-double-dome": "DDL",
  "mobile-led-ot-lights": "MOB",
  "ceiling-mounted-systems": "CMS",
  "examination-lights": "EXL",
  "electro-surgical-skin-cautery": "ESC",
  "electrosurgical-generator": "ESG",
  "surgical-accessories": "ACC",
  "smoke-evacuation-systems": "SMK",
  "cryo-gun": "CGN",
  "cryotherapy-systems": "CTS",
  "cryo-replacement-nozzles": "NOZ",
  "operating-tables": "OPT",
  "examination-tables": "EXT",
  "treatment-tables": "TRT",
  "obstetric-tables": "OBT",
  "gynaecology-examination-tables": "GYN",
  "fetal-monitoring-equipment": "FME",
  "diagnostic-equipment": "DIA",
  "sterilization-autoclaves": "STE",
  "suction-units": "SUC",
  "hospital-furniture": "HFN",
  "physiotherapy-equipment": "PHY",
  "electrotherapy": "ELT",
  "traction-units": "TRC",
  "exercise-therapy": "EXT"
};

function resolvePrimarySkuCode(cat) {
  if (!cat) return "MED";
  const norm = String(cat).trim().toLowerCase();
  if (SKU_CAT_CODES[norm]) return SKU_CAT_CODES[norm];

  const match = Object.values(catalogueHierarchy).find(c =>
    c.id.toLowerCase() === norm ||
    c.name.toLowerCase() === norm ||
    norm.includes(c.id.toLowerCase()) ||
    c.name.toLowerCase().includes(norm)
  );
  if (match && match.code) return match.code;
  const clean = norm.replace(/[^a-z]/g, "").toUpperCase();
  return clean.substring(0, 3) || "MED";
}

function resolveSubcatSkuCode(sub) {
  if (!sub) return "GEN";
  const norm = String(sub).trim().toLowerCase();
  if (SKU_SUBCAT_CODES[norm]) return SKU_SUBCAT_CODES[norm];

  for (const cat of Object.values(catalogueHierarchy)) {
    const found = (cat.subcategories || []).find(s =>
      s.id.toLowerCase() === norm ||
      s.name.toLowerCase() === norm ||
      norm.includes(s.id.toLowerCase())
    );
    if (found) {
      if (SKU_SUBCAT_CODES[found.id]) return SKU_SUBCAT_CODES[found.id];
      const words = found.name.split(/[\s-]+/).filter(Boolean);
      if (words.length >= 2) return words.map(w => w[0]).join("").toUpperCase().substring(0, 3);
      return found.id.replace(/[^a-z0-9]/gi, "").toUpperCase().substring(0, 3);
    }
  }

  const words = norm.split(/[\s-]+/).filter(w => w.length > 0 && !["and", "or", "for", "the"].includes(w));
  if (words.length >= 2) {
    const acronym = words.map(w => w[0]).join("").toUpperCase();
    if (acronym.length >= 2) return acronym.padEnd(3, "X").substring(0, 3);
  }
  return norm.replace(/[^a-z0-9]/gi, "").toUpperCase().substring(0, 3) || "GEN";
}

function resolveNameSkuSegment(name) {
  if (!name) return "EQUIP";
  const clean = String(name)
    .replace(/^DR\.?\s*MEDEX/i, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim();
  const stopWords = new Set(["THE", "AND", "WITH", "FOR", "IN", "ON", "AT", "TO", "A", "AN", "OF", "SERIES", "UNIT", "SYSTEM", "GRADE", "DRMEDEX"]);
  const tokens = clean.split(/\s+/).filter(t => t.length > 2 && !stopWords.has(t.toUpperCase()));
  if (tokens.length > 0) return tokens[0].toUpperCase().substring(0, 10);
  return "EQUIP";
}

function generateCollisionResistantId(length = 6) {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude ambiguous 0, 1, I, O
  let result = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length];
  }
  return result;
}

function generateProductSku({ category, subcategory, productName }) {
  const primaryCode = resolvePrimarySkuCode(category);
  const subcatCode = resolveSubcatSkuCode(subcategory);
  const nameSegment = resolveNameSkuSegment(productName);

  const allProducts = store.getProducts({ includeInactive: true });
  const existingSkus = new Set(allProducts.map(p => (p.sku || p.SKU || "").toLowerCase()));

  for (let attempt = 0; attempt < 50; attempt++) {
    const uniqueId = generateCollisionResistantId(6);
    const candidateSku = `DRM-${primaryCode}-${subcatCode}-${nameSegment}-${uniqueId}`;
    if (!existingSkus.has(candidateSku.toLowerCase())) {
      return candidateSku;
    }
  }

  return `DRM-${primaryCode}-${subcatCode}-${nameSegment}-${Date.now().toString(36).toUpperCase()}`;
}

router.get("/products/generate-sku", requireAdmin, async (req, res) => {
  const { category = "ot-lights", subcategory = "", productName = "" } = req.query;

  let sku = generateProductSku({ category, subcategory, productName });

  if (mongoService.isConfigured()) {
    try {
      const col = await mongoService.getCollection();
      let exists = await col.findOne({ $or: [{ sku: sku }, { SKU: sku }] });
      let attempts = 0;
      while (exists && attempts < 20) {
        sku = generateProductSku({ category, subcategory, productName });
        exists = await col.findOne({ $or: [{ sku: sku }, { SKU: sku }] });
        attempts++;
      }
    } catch {}
  }

  res.json({
    success: true,
    category,
    subcategory,
    productName,
    sku
  });
});

router.post("/products/check-duplicate", requireAdmin, async (req, res) => {
  const {
    category,
    subcategory,
    equipmentType,
    modelNumber,
    title,
    productName,
    sku,
    excludeId,
    excludeIds
  } = req.body;

  const allProducts = store.getProducts({ includeInactive: true });
  const norm = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const normModel = norm(modelNumber);
  const normTitle = norm(title || productName);
  const reqSku = norm(sku);

  // Collect all normalized representations of IDs / slugs / SKUs identifying the current product being edited
  const excludedSet = new Set();
  const addExclude = (val) => {
    if (val === undefined || val === null) return;
    const s = String(val).trim().toLowerCase();
    if (s && s !== "new" && s !== "undefined" && s !== "null") {
      excludedSet.add(s);
    }
  };

  if (Array.isArray(excludeIds)) {
    excludeIds.forEach(addExclude);
  }
  addExclude(excludeId);
  addExclude(req.body.id);
  addExclude(req.body._id);
  addExclude(req.body.productId);
  addExclude(req.body.currentId);

  // If candidate identifiers provided, resolve additional aliases from store and MongoDB
  for (const raw of Array.from(excludedSet)) {
    const fromStore = store.getProductById(raw, true) ||
      allProducts.find(p => {
        const pid = String(p.id || "").toLowerCase();
        const p_id = String(p._id || "").toLowerCase();
        const pslug = String(p.slug || "").toLowerCase();
        const psku = String(p.sku || p.SKU || "").toLowerCase();
        return pid === raw || p_id === raw || pslug === raw || (raw.length > 5 && psku === raw);
      });

    if (fromStore) {
      addExclude(fromStore.id);
      addExclude(fromStore._id);
      addExclude(fromStore.slug);
      addExclude(fromStore.sku);
      addExclude(fromStore.SKU);
    }

    if (mongoService.isConfigured()) {
      try {
        const fromMongo = await mongoService.getApprovedProduct(raw);
        if (fromMongo) {
          addExclude(fromMongo.id);
          addExclude(fromMongo._id);
          addExclude(fromMongo.slug);
          addExclude(fromMongo.sku);
          addExclude(fromMongo.SKU);
        }
      } catch {}
    }
  }

  const isCurrentProduct = (p) => {
    if (excludedSet.size === 0) return false;
    const candidates = [p.id, p._id, p.slug, p.sku, p.SKU];
    for (const c of candidates) {
      if (c !== undefined && c !== null) {
        const s = String(c).trim().toLowerCase();
        if (s && excludedSet.has(s)) return true;
      }
    }
    return false;
  };

  const genericModels = ["stdunit", "standard", "unit", "na", "none", "tbd", ""];

  const matched = allProducts.find(p => {
    // Current product being edited is never a duplicate of itself
    if (isCurrentProduct(p)) return false;

    // Check same category
    const catMatch = p.category === category || norm(p.category) === norm(category);
    if (!catMatch) return false;

    // 1. Check SKU collision (SKUs must be unique)
    const pSku = norm(p.sku || p.SKU);
    if (reqSku && pSku && reqSku === pSku) {
      return true;
    }

    // 2. Exact Title / Product Name match in the same category
    const pTitle = norm(p.title || p.productName);
    if (normTitle && pTitle && normTitle === pTitle && normTitle.length >= 3) {
      return true;
    }

    // 3. Specific manufacturer model number match in the same category
    if (normModel && !genericModels.includes(normModel)) {
      const pModel = norm(p.modelNumber);
      if (pModel && !genericModels.includes(pModel) && pModel === normModel) {
        return true;
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
        _id: matched._id,
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

router.get("/products/:id", requireAdmin, async (req, res) => {
  try {
    let product = store.getProductById(req.params.id, true);
    if (mongoService.isConfigured()) {
      try {
        const mongoProd = await mongoService.getApprovedProduct(req.params.id);
        if (mongoProd) {
          product = product ? { ...product, ...mongoProd } : mongoProd;
        }
      } catch (mErr) {
        console.warn("[admin.js] Mongo fetch on getProductById:", mErr.message);
      }
    }

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Export complete product package (JSON + CSV + README + all original images in ZIP)
 */
router.get("/products/:id/download-package", requireAdmin, async (req, res) => {
  try {
    let product = store.getProductById(req.params.id, true);
    if (!product && mongoService.isConfigured()) {
      try {
        product = await mongoService.getApprovedProduct(req.params.id);
      } catch (mErr) {}
    } else if (product && mongoService.isConfigured()) {
      try {
        const mongoProd = await mongoService.getApprovedProduct(req.params.id);
        if (mongoProd) {
          product = { ...product, ...mongoProd };
        }
      } catch (mErr) {}
    }

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
 * Canonical Product Images Retrieval Endpoint
 * Resolves all valid photos across historical and modern formats
 */
router.get("/products/:id/images", requireAdmin, async (req, res) => {
  try {
    let product = store.getProductById(req.params.id, true);
    if (mongoService.isConfigured()) {
      try {
        const mongoProd = await mongoService.getApprovedProduct(req.params.id);
        if (mongoProd) {
          product = product ? { ...product, ...mongoProd } : mongoProd;
        }
      } catch (mErr) {}
    }

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const images = imageResolver.resolveProductImages(product);
    res.json({
      success: true,
      productId: product.id,
      title: product.title || product.productName,
      sku: product.sku || product.SKU,
      count: images.length,
      images
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Direct Product Photo Proxy Download (preserves original content without ZIP packaging)
 * Supports both local catalogue storage and remote Cloudinary assets with SSRF protection
 */
router.get("/download-image", requireAdmin, async (req, res) => {
  try {
    const { url, filename, productId } = req.query;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, message: "Image URL parameter is required" });
    }

    const rawUrl = url.trim();
    const cleanFilename = String(filename || "product-image.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");

    // Case 1: Local catalog image file
    if (rawUrl.startsWith("/products-catalog/") || rawUrl.startsWith("products-catalog/")) {
      const localPath = imageResolver.resolveLocalImagePath(rawUrl);
      if (localPath && fs.existsSync(localPath)) {
        const ext = path.extname(localPath).toLowerCase();
        let contentType = "image/jpeg";
        if (ext === ".png") contentType = "image/png";
        else if (ext === ".webp") contentType = "image/webp";
        else if (ext === ".svg") contentType = "image/svg+xml";

        res.setHeader("Content-Type", contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${cleanFilename}"`);
        res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

        const fileStream = fs.createReadStream(localPath);
        fileStream.on("error", (sErr) => {
          if (!res.headersSent) res.status(500).json({ success: false, message: "Failed to stream image" });
        });
        return fileStream.pipe(res);
      }

      // Fallback for Vercel Serverless environment where static assets are served from Edge CDN
      try {
        const host = req.headers["x-forwarded-host"] || req.get("host") || "dr-medex.vercel.app";
        const proto = req.headers["x-forwarded-proto"] || "https";
        const normalizedRel = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
        const cdnUrl = `${proto}://${host}${normalizedRel}`;

        const fetchRes = await fetch(cdnUrl);
        if (fetchRes.ok) {
          const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
          if (contentType.includes("image/") || contentType.includes("octet-stream")) {
            res.setHeader("Content-Type", contentType);
            res.setHeader("Content-Disposition", `attachment; filename="${cleanFilename}"`);
            res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

            const buffer = await fetchRes.arrayBuffer();
            return res.send(Buffer.from(buffer));
          }
        }
      } catch (cdnErr) {
        console.warn("[download-image] CDN fallback fetch failed:", cdnErr.message);
      }

      return res.status(404).json({ success: false, message: "Local photo asset not found on server or CDN" });
    }

    // Case 2: Remote image (Cloudinary or allowed external URL)
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
      if (!imageResolver.isAllowedRemoteUrl(rawUrl)) {
        return res.status(400).json({ success: false, message: "Remote image URL host is not permitted (SSRF protection)" });
      }

      const fetchRes = await fetch(rawUrl);
      if (!fetchRes.ok) {
        return res.status(fetchRes.status).json({ success: false, message: `Failed to fetch image: HTTP ${fetchRes.status}` });
      }

      const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${cleanFilename}"`);
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

      const buffer = await fetchRes.arrayBuffer();
      return res.send(Buffer.from(buffer));
    }

    return res.status(400).json({ success: false, message: "Unsupported image URL format" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

    if (reviewStatus === "CORRECT") {
      updates.approvedAt = new Date().toISOString();
      updates.approvedBy = req.admin.email;
    }

    // Preserve existing images without triggering Cloudinary uploads on review status change (Rule D)
    let mongoResult = null;
    if (mongoService.isConfigured()) {
      try {
        const candidateProduct = { ...existing, ...updates };
        const mRes = await mongoService.updateProductReviewStatus(
          existing.id,
          reviewStatus,
          updates.reviewNote,
          req.admin.email,
          candidateProduct
        );
        mongoResult = mRes;
        updates.mongoSyncStatus = mRes.status;
        updates.mongoSyncedAt = new Date().toISOString();
      } catch (mErr) {
        console.error("MongoDB Atlas sync error:", mErr.message);
        mongoResult = { status: "SYNC_FAILED", error: mongoService.sanitizeMongoError(mErr) };
        updates.mongoSyncStatus = "SYNC_FAILED";
      }
    }

    const updated = store.updateProduct(req.params.id, updates);

    auditService.logAction(req.admin.email, "PRODUCT_REVIEW_UPDATED", updated.id, {
      title: updated.title || updated.productName,
      sku: updated.sku || updated.SKU,
      fromStatus: previousReviewStatus,
      toStatus: reviewStatus,
      note: updates.reviewNote,
      mongoStatus: mongoResult ? mongoResult.status : "NOT_CONFIGURED"
    });

    res.json({
      success: true,
      message: `Product review status set to ${reviewStatus}`,
      product: updated,
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
 * Safe Server-Side Gemini AI Configuration & Health Diagnostic
 * Returns status without exposing secret keys
 */
router.get("/ai/status", requireAdmin, (req, res) => {
  const gemini = geminiVisionService.getGeminiStatus();
  res.json({
    success: true,
    gemini,
    timestamp: new Date().toISOString()
  });
});

router.get("/gemini/status", requireAdmin, (req, res) => {
  const gemini = geminiVisionService.getGeminiStatus();
  res.json({
    success: true,
    gemini,
    timestamp: new Date().toISOString()
  });
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

    const mRes = await mongoService.upsertProduct(product, req.admin.email);
    const updated = store.updateProduct(product.id, {
      mongoSyncStatus: mRes.status,
      mongoSyncedAt: new Date().toISOString()
    });
    return res.json({ success: true, product: updated, mongodb: mRes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Toggle Active/Inactive Status for Product
 */
router.put("/products/:id/status", requireAdmin, async (req, res) => {
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

    const statusUpdates = {
      status,
      isRetired: status === "ARCHIVED",
      inCatalogue: status !== "ARCHIVED",
      archivedAt: status === "ARCHIVED" ? new Date().toISOString() : null,
      archivedBy: status === "ARCHIVED" ? (req.admin?.email || "SYSTEM_ADMIN") : null,
      updatedBy: req.admin?.email || "SYSTEM_ADMIN",
      updatedAt: new Date().toISOString()
    };

    const updated = store.updateProduct(existing.id, statusUpdates);

    if (!updated) {
      return res.status(500).json({ success: false, message: "Failed to persist product status update in store." });
    }

    // Persist status change to MongoDB Atlas
    let mongoResult = null;
    if (mongoService.isConfigured()) {
      try {
        mongoResult = await mongoService.upsertApprovedProduct(updated, req.admin?.email || "SYSTEM_ADMIN");
      } catch (mErr) {
        console.warn("[admin.js] MongoDB Atlas sync on status toggle error:", mErr.message);
      }
    }

    auditService.logAction(req.admin?.email || "SYSTEM_ADMIN", "PRODUCT_STATUS_TOGGLED", existing.id, {
      title: updated.title || updated.productName,
      fromStatus: existing.status || "ACTIVE",
      toStatus: status
    });

    res.json({
      success: true,
      message: `Product status updated to ${status}`,
      product: updated,
      mongo: mongoResult
    });
  } catch (err) {
    console.error("Update product status error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/products", requireAdmin, async (req, res) => {
  try {
    const data = { ...req.body };
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

    // 1. Process and normalize canonical images array
    let inputImages = [];
    if (Array.isArray(data.images)) {
      inputImages = data.images
        .map(img => (typeof img === "string" ? img.trim() : (img?.url || img?.secureUrl || "").trim()))
        .filter(u => u && !u.startsWith("blob:"));
    } else if (data.primaryImage) {
      const p = typeof data.primaryImage === "string" ? data.primaryImage.trim() : "";
      if (p) inputImages = [p];
    }

    const processedImages = [];
    for (let i = 0; i < inputImages.length; i++) {
      const img = inputImages[i];
      if (typeof img === "string" && img.startsWith("data:image/")) {
        try {
          const uploadRes = await mediaService.uploadProductImage(
            img,
            `img_${i}_${Date.now()}.jpg`,
            "image/jpeg",
            "new_product",
            data.title || data.productName || "Product"
          );
          if (uploadRes && uploadRes.url) {
            processedImages.push(uploadRes.url);
          } else {
            processedImages.push(img);
          }
        } catch (upErr) {
          console.warn("[admin.js] Image upload error during product create:", upErr.message);
          processedImages.push(img);
        }
      } else if (img) {
        processedImages.push(img);
      }
    }
    data.images = processedImages;

    if (data.primaryImage && typeof data.primaryImage === "string") {
      const pRaw = data.primaryImage.trim();
      if (pRaw && !pRaw.startsWith("blob:") && !pRaw.startsWith("data:")) {
        data.primaryImage = pRaw;
        if (data.images.length > 0 && !data.images.includes(data.primaryImage)) {
          data.images.unshift(data.primaryImage);
        }
      } else {
        data.primaryImage = data.images[0] || "";
      }
    } else {
      data.primaryImage = data.images[0] || "";
    }

    data.galleryImages = data.images.map((u, idx) => ({
      id: `new-img-${idx + 1}`,
      url: u,
      altText: `${data.title || data.productName || "Product"} - Photo ${idx + 1}`,
      isPrimary: u === data.primaryImage,
      status: "active"
    }));

    const clientManagedOnCreate = Array.isArray(data.managedCloudinaryImages) ? data.managedCloudinaryImages : [];
    const currentManagedOnCreate = [];
    data.images.forEach((url, idx) => {
      if (typeof url === "string" && (url.includes("cloudinary.com") || url.includes("res.cloudinary.com"))) {
        const matchingClient = clientManagedOnCreate.find(m => (m?.secureUrl === url || m?.url === url) && m?.publicId);
        const pubId = (matchingClient && matchingClient.publicId) || imageResolver.extractCloudinaryPublicId(url);
        currentManagedOnCreate.push({
          publicId: pubId || `cld_new_${idx + 1}`,
          secureUrl: url,
          order: idx,
          isPrimary: url === data.primaryImage,
          uploadState: "UPLOADED"
        });
      }
    });
    data.managedCloudinaryImages = currentManagedOnCreate;

    const created = store.addProduct({
      ...data,
      reviewStatus: data.reviewStatus || "CORRECT",
      approvedAt: new Date().toISOString(),
      approvedBy: req.admin.email,
      createdBy: req.admin.email,
      updatedBy: req.admin.email
    });

    // Persist to MongoDB Atlas if configured
    if (mongoService.isConfigured()) {
      try {
        const mRes = await mongoService.upsertProduct(created, req.admin.email);
        if (mRes && mRes.success) {
          created.mongoSyncStatus = "SYNCED";
          store.updateProduct(created.id, { mongoSyncStatus: "SYNCED", mongoSyncedAt: new Date().toISOString() });
        }
      } catch (mErr) {
        console.warn("[admin.js] MongoDB Atlas sync on create:", mErr.message);
      }
    }

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

router.put("/products/:id", requireAdmin, async (req, res) => {
  try {
    let existing = store.getProductById(req.params.id, true);
    if (mongoService.isConfigured()) {
      try {
        const mongoProd = await mongoService.getApprovedProduct(req.params.id);
        if (mongoProd) {
          existing = existing ? { ...existing, ...mongoProd } : mongoProd;
        }
      } catch (mErr) {
        console.warn("[admin.js] Mongo fetch on PUT /products/:id:", mErr.message);
      }
    }

    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Preserve existing Active/Inactive status unless explicitly changed to a permitted valid status
    const validStatuses = ["ACTIVE", "INACTIVE", "DRAFT", "ARCHIVED"];
    let finalStatus = existing.status || "ACTIVE";
    if (req.body.status && validStatuses.includes(String(req.body.status).toUpperCase().trim())) {
      finalStatus = String(req.body.status).toUpperCase().trim();
    }

    let finalReviewStatus = "CORRECT";
    if (req.body.reviewStatus !== undefined && req.body.reviewStatus !== null) {
      const rawRS = String(req.body.reviewStatus).toUpperCase().trim();
      if (rawRS === "CORRECT" || rawRS === "APPROVED") {
        finalReviewStatus = "CORRECT";
      } else if (rawRS === "NEEDS_EDITING" || rawRS === "NEEDS-EDITING") {
        finalReviewStatus = "NEEDS_EDITING";
      } else if (rawRS === "PENDING" || rawRS === "NOT_YET_REVIEWED" || rawRS === "NOT_REVIEWED") {
        finalReviewStatus = "PENDING";
      }
    }

    const isNowCorrect = finalReviewStatus === "CORRECT";
    const updates = {
      ...req.body,
      status: finalStatus,
      reviewStatus: finalReviewStatus,
      reviewNote: req.body.reviewNote !== undefined ? (req.body.reviewNote ? String(req.body.reviewNote).trim() : null) : (isNowCorrect ? null : existing.reviewNote || null),
      approvedAt: isNowCorrect ? (existing.approvedAt || new Date().toISOString()) : (existing.approvedAt || null),
      approvedBy: isNowCorrect ? (req.admin?.email || "SYSTEM_ADMIN") : (existing.approvedBy || null),
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.admin?.email || "SYSTEM_ADMIN",
      updatedBy: req.admin?.email || "SYSTEM_ADMIN",
      updatedAt: new Date().toISOString()
    };

    // Enforce SKU Uniqueness on update
    if (updates.sku) {
      const cleanSku = updates.sku.trim().toLowerCase();
      const existingClean = (existing.sku || existing.SKU || "").trim().toLowerCase();
      if (cleanSku !== existingClean) {
        const allProducts = store.getProducts({ includeInactive: true });
        const skuConflict = allProducts.find(
          p => p.id !== existing.id && p.slug !== existing.slug && (p.sku || p.SKU || "").toLowerCase() === cleanSku
        );
        if (skuConflict) {
          return res.status(400).json({
            success: false,
            message: `SKU '${updates.sku}' is already assigned to '${skuConflict.title || skuConflict.productName}'. Please provide a unique SKU.`
          });
        }
      }
    }

    // Only process and update gallery images if explicitly included in request body
    const hasImageUpdates = req.body.images !== undefined || req.body.primaryImage !== undefined || req.body.galleryImages !== undefined;
    if (hasImageUpdates) {
      // 1. Process and normalize canonical images array
      let inputImages = [];
      if (Array.isArray(updates.images)) {
        inputImages = updates.images
          .map(img => (typeof img === "string" ? img.trim() : (img?.url || img?.secureUrl || "").trim()))
          .filter(u => u && !u.startsWith("blob:"));
      } else if (updates.primaryImage) {
        const p = typeof updates.primaryImage === "string" ? updates.primaryImage.trim() : "";
        if (p) inputImages = [p];
      } else if (Array.isArray(updates.galleryImages)) {
        inputImages = updates.galleryImages
          .map(img => (typeof img === "string" ? img.trim() : (img?.url || img?.secureUrl || "").trim()))
          .filter(u => u && !u.startsWith("blob:"));
      }

      const processedImages = [];
      for (let i = 0; i < inputImages.length; i++) {
        const img = inputImages[i];
        if (typeof img === "string" && img.startsWith("data:image/")) {
          try {
            const uploadRes = await mediaService.uploadProductImage(
              img,
              `img_${i}_${Date.now()}.jpg`,
              "image/jpeg",
              existing.id,
              existing.title || existing.productName || "Product"
            );
            if (uploadRes && uploadRes.url) {
              processedImages.push(uploadRes.url);
            } else {
              processedImages.push(img);
            }
          } catch (upErr) {
            console.warn("[admin.js] Image upload error during product save:", upErr.message);
            processedImages.push(img);
          }
        } else if (img) {
          processedImages.push(img);
        }
      }
      updates.images = processedImages;

      // 2. Canonical primary image resolution
      if (updates.primaryImage && typeof updates.primaryImage === "string") {
        const pRaw = updates.primaryImage.trim();
        if (pRaw && !pRaw.startsWith("blob:") && !pRaw.startsWith("data:")) {
          updates.primaryImage = pRaw;
          if (updates.images.length > 0 && !updates.images.includes(updates.primaryImage)) {
            updates.images.unshift(updates.primaryImage);
          }
        } else {
          updates.primaryImage = updates.images[0] || "";
        }
      } else {
        updates.primaryImage = updates.images[0] || "";
      }

      // 3. Keep galleryImages in exact sync with canonical images
      updates.galleryImages = updates.images.map((u, idx) => ({
        id: `${existing.id}-img-${idx + 1}`,
        url: u,
        altText: `${updates.title || updates.productName || existing.title || "Product"} - Photo ${idx + 1}`,
        isPrimary: u === updates.primaryImage,
        status: "active"
      }));

      // 4. Synchronize managedCloudinaryImages
      const prevManaged = Array.isArray(existing.managedCloudinaryImages) ? existing.managedCloudinaryImages : [];
      const clientManaged = Array.isArray(req.body.managedCloudinaryImages) ? req.body.managedCloudinaryImages : [];
      const currentManaged = [];

      updates.images.forEach((url, idx) => {
        if (typeof url === "string" && (url.includes("cloudinary.com") || url.includes("res.cloudinary.com"))) {
          const matchingClient = clientManaged.find(m => (m?.secureUrl === url || m?.url === url) && m?.publicId);
          const matchingPrev = prevManaged.find(m => (m?.secureUrl === url || m?.url === url) && m?.publicId);
          const pubId = (matchingClient && matchingClient.publicId) ||
                        (matchingPrev && matchingPrev.publicId) ||
                        imageResolver.extractCloudinaryPublicId(url);

          currentManaged.push({
            publicId: pubId || `cld_${existing.id}_${idx + 1}`,
            secureUrl: url,
            order: idx,
            isPrimary: url === updates.primaryImage,
            uploadState: "UPLOADED"
          });
        }
      });
      updates.managedCloudinaryImages = currentManaged;

      // 5. Exclusively owned removed Cloudinary asset cleanup (Issue 3)
      const currentPublicIds = new Set(currentManaged.map(m => m.publicId).filter(Boolean));
      const currentUrls = new Set(updates.images);
      const removedPublicIds = [];

      prevManaged.forEach(m => {
        if (m && m.publicId && !currentPublicIds.has(m.publicId) && !currentUrls.has(m.secureUrl)) {
          removedPublicIds.push(m.publicId);
        }
      });

      if (removedPublicIds.length > 0) {
        setImmediate(async () => {
          try {
            const allProds = store.getProducts({ includeInactive: true });
            const allOrders = store.getOrders();
            for (const pubId of removedPublicIds) {
              const isShared = allProds.some(other => {
                if (other.id === existing.id) return false;
                const oUrls = [other.primaryImage, ...(other.images || [])];
                return oUrls.some(u => typeof u === "string" && u.includes(pubId));
              });
              if (isShared) continue;

              const inOrders = allOrders.some(o =>
                Array.isArray(o.items) && o.items.some(it => (it.image && it.image.includes(pubId)) || it.publicId === pubId)
              );
              if (inOrders) continue;

              if (cloudinaryService && cloudinaryService.isConfigured()) {
                try {
                  const cloudinary = require("cloudinary").v2;
                  await cloudinary.uploader.destroy(pubId, { invalidate: true });
                  console.log(`[admin.js] Safely cleaned up exclusively owned removed asset: ${pubId}`);
                } catch (cDelErr) {
                  console.warn(`[admin.js] Cloudinary cleanup task retry recorded for ${pubId}:`, cDelErr.message);
                }
              }
            }
          } catch (cleanupErr) {
            console.warn("[admin.js] Background asset cleanup check error:", cleanupErr.message);
          }
        });
      }
    } else {
      // Preserve existing canonical image state
      const existingImages = Array.isArray(existing.images) && existing.images.length > 0
        ? existing.images.map(img => (typeof img === "string" ? img : (img?.url || img?.secureUrl || "")).trim()).filter(Boolean)
        : (existing.primaryImage ? [existing.primaryImage] : []);
      updates.images = existingImages;
      updates.primaryImage = existing.primaryImage || (existingImages[0] || "");
      updates.galleryImages = existing.galleryImages || [];
      updates.managedCloudinaryImages = existing.managedCloudinaryImages || [];
    }

    const updated = store.updateProduct(existing.id, updates);
    if (!updated) {
      return res.status(500).json({ success: false, message: "Failed to persist product update in store." });
    }

    // Persist to MongoDB Atlas if configured
    let mongoResult = null;
    if (mongoService.isConfigured()) {
      try {
        const mRes = await mongoService.upsertProduct(updated, req.admin?.email || "admin@drmedex.com");
        if (mRes && mRes.success) {
          updated.mongoSyncStatus = "SYNCED";
          store.updateProduct(existing.id, { mongoSyncStatus: "SYNCED", mongoSyncedAt: new Date().toISOString() });
        }
        mongoResult = mRes;
      } catch (mErr) {
        console.warn("[admin.js] MongoDB Atlas sync on update:", mErr.message);
        mongoResult = { status: "SYNC_FAILED", error: mongoService.sanitizeMongoError(mErr) };
      }
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

    res.json({ success: true, product: updated, mongo: mongoResult });
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

router.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    const productId = req.params.id;
    if (!productId || typeof productId !== "string") {
      return res.status(400).json({ success: false, message: "Valid product ID is required." });
    }

    // 1. Fetch exact product from MongoDB Atlas (authoritative) or store
    let existing = null;
    if (mongoService.isConfigured()) {
      try {
        existing = await mongoService.getApprovedProduct(productId);
      } catch (mErr) {
        console.warn("[admin.js] Mongo lookup error on delete:", mErr.message);
      }
    }
    if (!existing) {
      existing = store.getProductById(productId, true) || store.getProductBySlug(productId, true);
    }

    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const canonicalId = existing.id || productId;
    const productTitle = existing.title || existing.productName || "Product";
    const productSku = existing.sku || existing.SKU || "N/A";

    // 2. Order safety check: if customer orders reference this product, BLOCK permanent deletion
    const orders = store.getOrders();
    const referencingOrders = orders.filter(o =>
      Array.isArray(o.items) && o.items.some(it => it && (
        String(it.productId) === String(canonicalId) ||
        String(it.productId) === String(existing.id) ||
        String(it.productId) === String(existing.slug)
      ))
    );

    if (referencingOrders.length > 0) {
      const orderCount = referencingOrders.length;
      const sampleOrders = referencingOrders.slice(0, 3).map(o => o.orderNumber || o.id);
      return res.status(409).json({
        success: false,
        conflict: "PROTECTED_ORDER_REFERENCE",
        error: "PRODUCT_HAS_ORDER_REFERENCES",
        blocked: true,
        canArchive: true,
        orderCount,
        message: `Permanent deletion blocked: Product "${productTitle}" (SKU: ${productSku}) is referenced in ${orderCount} customer order(s) (e.g. Order #${sampleOrders.join(", ")}). Preserving order integrity, invoice history, and payment compliance. You can safely archive/deactivate this product instead to remove it from the active catalogue.`,
        productId: canonicalId,
        product: existing
      });
    }

    // 3. No order references: Clean up exclusively owned Cloudinary assets
    const allProducts = store.getProducts({ includeInactive: true });
    let cloudinaryResult = null;
    try {
      cloudinaryResult = await cloudinaryService.deleteProductExclusivelyOwnedMedia(existing, allProducts, orders);
    } catch (cErr) {
      console.warn("[admin.js] Cloudinary media deletion error:", cErr.message);
      cloudinaryResult = { status: "ERROR", success: false, error: cErr.message };
    }

    // 4. Delete from MongoDB Atlas (authoritative collection)
    let mongoResult = null;
    if (mongoService.isConfigured()) {
      try {
        mongoResult = await mongoService.removeApprovedProduct(canonicalId, req.admin.email);
        if (!mongoResult || !mongoResult.success) {
          return res.status(500).json({
            success: false,
            message: "Failed to delete product from database: Authoritative deletion returned unsuccessful status.",
            mongo: mongoResult
          });
        }
      } catch (mErr) {
        console.error("MongoDB Atlas deletion error:", mErr);
        return res.status(500).json({
          success: false,
          message: "Failed to delete product from database: " + mongoService.sanitizeMongoError(mErr)
        });
      }
    }

    // 5. Delete from local store & persistence file
    const removed = store.deleteProduct(canonicalId) || store.deleteProduct(existing.id);

    // 6. Audit log
    auditService.logAction(req.admin.email, "PRODUCT_PERMANENTLY_DELETED", canonicalId, {
      title: productTitle,
      sku: productSku,
      cloudinary: cloudinaryResult,
      mongo: mongoResult
    });

    res.json({
      success: true,
      deleted: true,
      retired: false,
      productId: canonicalId,
      message: `Product "${productTitle}" and exclusively owned media permanently deleted.`,
      product: removed || existing,
      cloudinary: cloudinaryResult,
      mongo: mongoResult
    });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Dedicated Safe Archive Route for Order-Referenced Products
 */
router.post("/products/:id/archive", requireAdmin, async (req, res) => {
  try {
    let existing = null;
    if (mongoService.isConfigured()) {
      try {
        existing = await mongoService.getApprovedProduct(req.params.id);
      } catch (e) {}
    }
    if (!existing) {
      existing = store.getProductById(req.params.id, true);
    }
    if (!existing) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const retiredUpdates = {
      status: "ARCHIVED",
      isRetired: true,
      inCatalogue: false,
      archivedAt: new Date().toISOString(),
      archivedBy: req.admin.email,
      updatedAt: new Date().toISOString()
    };

    let mongoResult = null;
    if (mongoService.isConfigured()) {
      try {
        const candidate = { ...existing, ...retiredUpdates };
        mongoResult = await mongoService.upsertApprovedProduct(candidate, req.admin.email);
      } catch (mErr) {
        console.warn("[admin.js] MongoDB archive error:", mErr.message);
        mongoResult = { status: "SYNC_FAILED", error: mongoService.sanitizeMongoError(mErr) };
      }
    }

    const retiredProduct = store.updateProduct(existing.id, retiredUpdates);

    auditService.logAction(req.admin.email, "PRODUCT_CATALOGUE_RETIRED", existing.id, {
      title: existing.title || existing.productName,
      sku: existing.sku || existing.SKU,
      reason: "Administrator explicitly retired product from active catalogue to preserve customer order history",
      mongo: mongoResult
    });

    res.json({
      success: true,
      retired: true,
      archived: true,
      deleted: false,
      message: `Product "${existing.title || existing.productName}" safely retired from active catalogue. Customer order history preserved.`,
      product: retiredProduct,
      mongo: mongoResult
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
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

    const namingStyle = req.body.namingStyle || "clinical";
    const preliminaryBrand = req.body.preliminaryBrand || req.body.brand || "DR.MEDEX";
    const targetField = req.body.targetField || null;
    const context = req.body.context || {};
    const result = await geminiVisionService.identifyProductFromPhotos(photos, {
      namingStyle,
      preliminaryBrand,
      targetField,
      context
    });

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
    if (msg.includes("GEMINI_API_KEY") || msg.includes("API key") || msg.includes("not configured")) {
      statusCode = 503;
    } else if (msg.includes("rate limit") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
      statusCode = 429;
    } else if (msg.includes("high demand") || msg.includes("503") || msg.includes("temporarily unavailable")) {
      statusCode = 503;
    } else if (msg.includes("timed out") || msg.includes("timeout")) {
      statusCode = 504;
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
    const rawImage = req.body.imageBase64 || req.body.data || req.body.dataUrl || req.body.file || req.body.image;
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
      const rawImage = item.imageBase64 || item.data || item.dataUrl || item.file || item.image;
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
