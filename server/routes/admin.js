const express = require("express");
const router = express.Router();
const authService = require("../services/authService");
const auditService = require("../services/auditService");
const mediaService = require("../services/mediaService");
const aiGeneratorService = require("../services/aiGeneratorService");
const store = require("../services/store");

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
  const products = store.getProducts();
  const categories = store.getCategories();
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
  const { search, category, status, stock, sort = "updated_desc", page = 1, limit = 20 } = req.query;
  let list = store.getProducts();

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

  // Status filter
  if (status && status !== "ALL") {
    list = list.filter(p => (p.status || "ACTIVE") === status);
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
    if (sort === "name_asc") return (a.title || a.productName || "").localeCompare(b.title || b.productName || "");
    if (sort === "name_desc") return (b.title || b.productName || "").localeCompare(a.title || a.productName || "");
    // Default: updated_desc / recent
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
    products: paginated
  });
});

router.post("/products", requireAdmin, (req, res) => {
  try {
    const data = req.body;
    if (!data.productName && !data.title) {
      return res.status(400).json({ success: false, message: "Product name is required" });
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
  const existing = store.getProductById(req.params.id);
  if (!existing) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }

  const updates = {
    ...req.body,
    updatedBy: req.admin.email,
    updatedAt: new Date().toISOString()
  };

  const updated = store.updateProduct(req.params.id, updates);

  // Detect specific changes for granular audit logging
  const changes = {};
  if (existing.basePrice !== updated.basePrice) {
    changes.price = { from: existing.basePrice, to: updated.basePrice };
    auditService.logAction(req.admin.email, "PRICE_CHANGED", updated.id, changes.price);
  }
  if (existing.status !== updated.status) {
    changes.status = { from: existing.status, to: updated.status };
    auditService.logAction(req.admin.email, "STATUS_CHANGED", updated.id, changes.status);
  }

  auditService.logAction(req.admin.email, "PRODUCT_UPDATED", updated.id, {
    title: updated.title || updated.productName,
    changes
  });

  res.json({ success: true, product: updated });
});

router.delete("/products/:id", requireAdmin, (req, res) => {
  const permanent = req.query.permanent === "true";
  const existing = store.getProductById(req.params.id);

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
  const existing = store.getProductById(req.params.id);
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
    const p = store.getProductById(id);
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
// 4. AI DESCRIPTION GENERATOR ENDPOINT
// ==========================================

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
      data: generated.data
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. MEDIA MANAGEMENT ENDPOINTS
// ==========================================

router.post("/media/upload", requireAdmin, async (req, res) => {
  try {
    const { imageBase64, filename = "image.jpg", mimeType = "image/jpeg", productId = "general", altText = "" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ success: false, message: "imageBase64 payload is required" });
    }

    const uploaded = await mediaService.uploadProductImage(imageBase64, filename, mimeType, productId, altText);

    auditService.logAction(req.admin.email, "IMAGE_UPLOADED", productId, {
      url: uploaded.url,
      filename
    });

    res.status(201).json({ success: true, image: uploaded });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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
      const p = store.getProductById(productId);
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

module.exports = router;
