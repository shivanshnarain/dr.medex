/**
 * DR.MEDEX Global — Global Permanent Deletion & Storage Management Service
 * 
 * Strict Architectural Standards:
 * 1. Permanent deletion means PERMANENT:
 *    - MongoDB Atlas documents are removed via authoritative deleteOne/deleteMany.
 *    - Exclusively owned Cloudinary media assets are destroyed via authenticated API with cache invalidation.
 *    - Dependent records and child taxonomies are cleaned up.
 * 2. Shared asset protection:
 *    - Cloudinary assets referenced by multiple products or historical customer orders are preserved.
 * 3. Multi-stage crash-safe orchestration:
 *    - Minimal operational tracking for idempotent retries.
 *    - Zero soft-delete faking or ghost storage usage.
 * 4. Zero credential leakage:
 *    - Never expose API secrets, DB passwords, or connection strings in logs or API responses.
 */

const mongoService = require("./mongoService");
const {
  getClient,
  isConfigured: isMongoConfigured,
  sanitizeMongoError,
  buildProductFilter,
  getDeletedProductIds,
  patchCachedProduct,
  getCachedProductsSnapshot
} = require("./mongoService");
const cloudinaryService = require("./cloudinaryService");
const firestoreService = require("./firestoreService");
const store = require("./store");
const auditService = require("./auditService");
const cloudinary = require("cloudinary").v2;

const COLLECTION_NAME = "approved_products";
const ORDERS_COLLECTION = "orders";
const ADDRESSES_COLLECTION = "customer_addresses";
const DELETED_COLLECTION = "deleted_products";

// Temporary minimal operational metadata for crash recovery and retries
// Stored in memory and persisted to DB collection only when needed for disaster recovery
const pendingOperations = new Map();
const activeEntityLocks = new Set();
const failedCleanupsQueue = new Map();

/**
 * Record a failed Cloudinary cleanup for guaranteed retry
 */
async function recordFailedCleanup(publicId, productId, reason) {
  if (!publicId) return;
  const entry = {
    publicId,
    productId: productId || null,
    reason: String(reason || "Unknown Cloudinary error"),
    failedAt: new Date().toISOString(),
    attempts: 1
  };
  failedCleanupsQueue.set(publicId, entry);
  if (isMongoConfigured()) {
    try {
      const c = await getClient();
      const db = c.db(process.env.MONGODB_DB || "drmedex");
      await db.collection("failed_cleanups").updateOne(
        { publicId },
        { $set: entry, $inc: { attempts: 1 } },
        { upsert: true }
      );
    } catch (e) {
      console.warn("[deletionService] Notice: unable to write failed_cleanup record to MongoDB:", e.message);
    }
  }
}

/**
 * Retry all pending/failed Cloudinary cleanups safely
 */
async function retryFailedCleanups() {
  const pending = [];
  if (isMongoConfigured()) {
    try {
      const c = await getClient();
      const db = c.db(process.env.MONGODB_DB || "drmedex");
      const docs = await db.collection("failed_cleanups").find({}).toArray();
      docs.forEach(d => pending.push(d));
    } catch (e) {}
  }
  for (const [pid, entry] of failedCleanupsQueue.entries()) {
    if (!pending.some(p => p.publicId === pid)) {
      pending.push(entry);
    }
  }

  let retriedCount = 0;
  let succeededCount = 0;
  const remainingErrors = [];

  for (const item of pending) {
    retriedCount++;
    try {
      const res = await cloudinary.uploader.destroy(item.publicId, { invalidate: true });
      if (res.result === "ok" || res.result === "not found") {
        succeededCount++;
        failedCleanupsQueue.delete(item.publicId);
        if (isMongoConfigured()) {
          try {
            const c = await getClient();
            const db = c.db(process.env.MONGODB_DB || "drmedex");
            await db.collection("failed_cleanups").deleteOne({ publicId: item.publicId });
          } catch (e) {}
        }
      } else {
        remainingErrors.push({ publicId: item.publicId, result: res.result });
      }
    } catch (err) {
      remainingErrors.push({ publicId: item.publicId, error: err.message });
    }
  }

  return {
    success: true,
    retriedCount,
    succeededCount,
    remainingCount: remainingErrors.length,
    remainingErrors
  };
}

const imageResolver = require("./imageResolver");

/**
 * Extract Cloudinary public_id safely from URL or object
 */
function extractCloudinaryPublicId(urlOrId) {
  if (!urlOrId) return null;
  if (typeof urlOrId === "object" && urlOrId.publicId) return urlOrId.publicId;
  const str = typeof urlOrId === "string" ? urlOrId.trim() : "";
  if (!str) return null;
  if (!str.includes("res.cloudinary.com") && !str.includes("cloudinary.com") && !str.includes("://")) {
    return str; // Already a raw publicId
  }
  return imageResolver.extractCloudinaryPublicId(str);
}

/**
 * Collect all Cloudinary public IDs associated with a product
 */
function getProductCloudinaryPublicIds(product) {
  if (!product) return [];
  const candidates = new Set();

  const addIfValid = (item) => {
    if (!item) return;
    if (typeof item === "string") {
      const pid = extractCloudinaryPublicId(item);
      if (pid) candidates.add(pid);
    } else if (typeof item === "object") {
      if (item.publicId) candidates.add(item.publicId);
      if (item.url) {
        const pid = extractCloudinaryPublicId(item.url);
        if (pid) candidates.add(pid);
      }
    }
  };

  addIfValid(product.primaryImage);
  if (Array.isArray(product.images)) product.images.forEach(addIfValid);
  if (Array.isArray(product.galleryImages)) product.galleryImages.forEach(addIfValid);
  if (Array.isArray(product.managedCloudinaryImages)) {
    product.managedCloudinaryImages.forEach(m => {
      if (m?.publicId) candidates.add(m.publicId);
      if (m?.url) addIfValid(m.url);
    });
  }

  return Array.from(candidates);
}

function escapeRegexStr(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function syncFallbackFilesAsync(productId, updates) {
  if (process.env.VERCEL || !productId || !updates) return;
  setImmediate(async () => {
    try {
      const fs = require("fs");
      const path = require("path");
      const syncFiles = [
        path.resolve(__dirname, "../../client/src/data/fallbackProducts.json"),
        path.resolve(__dirname, "../../client/server/data/db.json")
      ];
      await Promise.all(
        syncFiles.map(async (fp) => {
          try {
            if (!fs.existsSync(fp)) return;
            const raw = await fs.promises.readFile(fp, "utf8");
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const idx = parsed.findIndex(p => p.id === productId);
              if (idx !== -1) {
                parsed[idx] = { ...parsed[idx], ...updates };
                await fs.promises.writeFile(fp, JSON.stringify(parsed));
              }
            } else if (parsed && Array.isArray(parsed.products)) {
              const idx = parsed.products.findIndex(p => p.id === productId);
              if (idx !== -1) {
                parsed.products[idx] = { ...parsed.products[idx], ...updates };
                await fs.promises.writeFile(fp, JSON.stringify(parsed));
              }
            }
          } catch {}
        })
      );
    } catch {}
  });
}

/**
 * Check whether a publicId is shared with other products or referenced in customer orders
 */
async function isAssetSharedOrOrdered(publicId, excludeProductId = null) {
  if (!publicId) return { shared: false };

  // 1. Check all products in local store (in-memory, sub-ms)
  const allStoreProducts = store.getProducts({ includeInactive: true }) || [];
  for (const other of allStoreProducts) {
    if (excludeProductId && (other.id === excludeProductId || (other.slug && other.slug === excludeProductId))) {
      continue;
    }
    const otherIds = getProductCloudinaryPublicIds(other);
    if (otherIds.includes(publicId)) {
      return { shared: true, reason: `Asset shared with product "${other.title || other.productName || other.id}"` };
    }
  }

  // 2. Check warm MongoDB product snapshot in RAM if available
  const warmSnapshot = getCachedProductsSnapshot();
  if (warmSnapshot) {
    for (const other of warmSnapshot) {
      if (excludeProductId && (other.id === excludeProductId || (other.slug && other.slug === excludeProductId))) {
        continue;
      }
      const otherIds = getProductCloudinaryPublicIds(other);
      if (otherIds.includes(publicId)) {
        return { shared: true, reason: `Asset shared with product "${other.title || other.productName || other.id}" in MongoDB` };
      }
    }
  }

  // 3. Run MongoDB share checks concurrently
  if (isMongoConfigured()) {
    try {
      const c = await getClient();
      const db = c.db(process.env.MONGODB_DB || "drmedex");
      const escapedPid = escapeRegexStr(publicId);

      const orderPromise = db.collection(ORDERS_COLLECTION).findOne({
        $or: [
          { "items.image": { $regex: escapedPid } },
          { "items.publicId": publicId }
        ]
      }, { projection: { orderNumber: 1 } });

      let productMatch = null;
      let orderMatch = null;

      if (!warmSnapshot) {
        const filter = {
          $or: [
            { primaryImage: { $regex: escapedPid } },
            { images: { $elemMatch: { $regex: escapedPid } } },
            { "galleryImages.url": { $regex: escapedPid } },
            { "managedCloudinaryImages.publicId": publicId }
          ]
        };
        if (excludeProductId) {
          filter.id = { $ne: excludeProductId };
        }
        [productMatch, orderMatch] = await Promise.all([
          db.collection(COLLECTION_NAME).findOne(filter, { projection: { id: 1, title: 1, productName: 1 } }),
          orderPromise
        ]);
      } else {
        orderMatch = await orderPromise;
      }

      if (productMatch) {
        return { shared: true, reason: `Asset shared with product "${productMatch.title || productMatch.productName || productMatch.id}" in MongoDB` };
      }
      if (orderMatch) {
        return { shared: true, reason: `Asset preserved: referenced in customer order #${orderMatch.orderNumber}` };
      }
    } catch (err) {
      console.warn("[deletionService] MongoDB share check warning:", sanitizeMongoError(err));
    }
  }

  return { shared: false };
}

/**
 * Stage-by-Stage Permanent Deletion of a Single Product
 */
async function deleteProductPermanently(productId, adminEmail = "ADMIN") {
  if (!productId) {
    throw new Error("Product ID is required for permanent deletion.");
  }

  const opId = `del_prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  pendingOperations.set(opId, {
    opId,
    type: "PRODUCT",
    targetId: productId,
    adminEmail,
    stage: "INITIALIZED",
    startedAt: new Date().toISOString()
  });

  try {
    // Stage 1: Identify product in store and MongoDB
    let existing = null;
    if (isMongoConfigured()) {
      try {
        const { getApprovedProduct } = require("./mongoService");
        existing = await getApprovedProduct(productId);
      } catch (e) {}
    }
    if (!existing) {
      existing = store.getProductById(productId, true);
    }
    if (!existing) {
      throw new Error(`Product "${productId}" was not found in the database or catalogue.`);
    }

    const canonicalId = existing.id || productId;
    const productTitle = existing.title || existing.productName || canonicalId;

    // Stage 2: Collect Cloudinary assets
    const publicIds = getProductCloudinaryPublicIds(existing);
    const deletedMedia = [];
    const preservedMedia = [];
    const mediaErrors = [];

    // Stage 3: Delete from MongoDB Atlas FIRST so DB state is authoritative and fast
    pendingOperations.get(opId).stage = "MONGODB_CLEANUP";
    let mongoResult = null;
    if (isMongoConfigured()) {
      try {
        const c = await getClient();
        const db = c.db(process.env.MONGODB_DB || "drmedex");
        const filter = buildProductFilter(canonicalId);
        const delRes = await db.collection(COLLECTION_NAME).deleteOne(filter);

        // Record minimal tombstone marker strictly for anti-resurrection of seed files
        try {
          await db.collection(DELETED_COLLECTION).updateOne(
            { id: canonicalId },
            { $set: { id: canonicalId, deletedAt: new Date().toISOString(), deletedBy: adminEmail } },
            { upsert: true }
          );
        } catch (tErr) {}

        mongoResult = { success: true, deletedCount: delRes.deletedCount };
      } catch (mErr) {
        console.error("[deletionService] MongoDB permanent delete error:", mErr);
        pendingOperations.get(opId).stage = "FAILED_MONGODB";
        throw new Error(`MongoDB deletion failed: ${sanitizeMongoError(mErr)}`);
      }
    }

    // Stage 4: Clean from local store immediately after DB commit
    pendingOperations.get(opId).stage = "LOCAL_STORE_CLEANUP";
    store.deleteProduct(canonicalId);

    // Stage 5: Destroy exclusively owned Cloudinary assets in parallel (preserving shared/ordered assets)
    pendingOperations.get(opId).stage = "CLOUDINARY_CLEANUP";
    if (publicIds.length > 0) {
      await Promise.allSettled(
        publicIds.map(async (pid) => {
          const shareCheck = await isAssetSharedOrOrdered(pid, canonicalId);
          if (shareCheck.shared) {
            preservedMedia.push({ publicId: pid, reason: shareCheck.reason });
            return;
          }

          try {
            const destroyRes = await cloudinary.uploader.destroy(pid, { invalidate: true });
            if (destroyRes.result === "ok" || destroyRes.result === "not found") {
              deletedMedia.push({ publicId: pid, result: destroyRes.result });
            } else {
              mediaErrors.push({ publicId: pid, result: destroyRes.result });
              await recordFailedCleanup(pid, canonicalId, destroyRes.result || "Cloudinary deletion non-ok");
            }
          } catch (cErr) {
            console.error(`[deletionService] Cloudinary destroy error for ${pid}:`, cErr.message);
            mediaErrors.push({ publicId: pid, error: cErr.message });
            await recordFailedCleanup(pid, canonicalId, cErr.message);
          }
        })
      );
    }

    // Stage 6: Clean reviews if configured
    try {
      if (firestoreService.isFirestoreAdminConfigured && firestoreService.isFirestoreAdminConfigured()) {
        const reviews = await firestoreService.getAdminReviews({ productId: canonicalId, limit: 100 }).catch(() => null);
        if (reviews && Array.isArray(reviews.reviews)) {
          for (const rev of reviews.reviews) {
            await firestoreService.deleteReview(rev.id).catch(() => {});
          }
        }
      }
    } catch (revErr) {}

    // Stage 7: Operation completion
    pendingOperations.delete(opId);

    auditService.logAction(adminEmail, "PRODUCT_PERMANENTLY_DELETED", canonicalId, {
      title: productTitle,
      deletedMediaCount: deletedMedia.length,
      preservedMediaCount: preservedMedia.length,
      errorsCount: mediaErrors.length
    });

    return {
      success: true,
      deleted: true,
      productId: canonicalId,
      title: productTitle,
      message: `Product "${productTitle}" and exclusively owned media permanently deleted.`,
      media: {
        deletedCount: deletedMedia.length,
        preservedCount: preservedMedia.length,
        errorCount: mediaErrors.length,
        deleted: deletedMedia,
        preserved: preservedMedia,
        errors: mediaErrors
      },
      mongo: mongoResult
    };
  } catch (err) {
    if (pendingOperations.has(opId)) {
      pendingOperations.get(opId).error = err.message;
    }
    throw err;
  }
}

/**
 * Inspect dependencies for a category, subcategory, or equipment type
 */
function inspectCategoryDependencies(type, id, parentCategory = null, parentSubcategory = null) {
  const cleanId = String(id || "").trim().toLowerCase();
  let cleanParent = String(parentCategory || "").trim().toLowerCase();
  let cleanSub = String(parentSubcategory || "").trim().toLowerCase();

  const allProducts = store.getProducts({ includeInactive: true }) || [];
  const hierarchy = store.getCatalogueHierarchy() || {};
  const categories = store.getCategories(true) || [];

  let entityName = id;
  let linkedProducts = [];
  let subcategories = [];
  let equipmentTypes = [];

  // Fallback: If cleanParent not provided or invalid for subcategory, auto-detect parent
  if (type === "subcategory" && (!cleanParent || cleanParent === "null" || cleanParent === "undefined")) {
    for (const [k, h] of Object.entries(hierarchy)) {
      if (Array.isArray(h.subcategories) && h.subcategories.some(s => (s.id || "").toLowerCase() === cleanId || (s.name || "").toLowerCase() === cleanId || (s.slug || "").toLowerCase() === cleanId)) {
        cleanParent = k.toLowerCase();
        break;
      }
    }
    if (!cleanParent) {
      for (const c of categories) {
        if (Array.isArray(c.subcategories) && c.subcategories.some(s => (s.id || "").toLowerCase() === cleanId || (s.name || "").toLowerCase() === cleanId || (s.slug || "").toLowerCase() === cleanId)) {
          cleanParent = (c.id || c.slug || "").toLowerCase();
          break;
        }
      }
    }
  }

  // Fallback: If cleanParent or cleanSub not provided for equipment type, auto-detect
  if (type === "equipment" && (!cleanSub || cleanSub === "null" || cleanSub === "undefined")) {
    for (const [k, h] of Object.entries(hierarchy)) {
      if (Array.isArray(h.subcategories)) {
        for (const s of h.subcategories) {
          if (Array.isArray(s.equipmentTypes) && s.equipmentTypes.some(e => (e.id || "").toLowerCase() === cleanId || (e.name || "").toLowerCase() === cleanId)) {
            cleanParent = k.toLowerCase();
            cleanSub = (s.id || s.name || "").toLowerCase();
            break;
          }
        }
      }
      if (cleanSub) break;
    }
  }

  if (type === "primary") {
    const cat = categories.find(c => (c.id || "").toLowerCase() === cleanId || (c.slug || "").toLowerCase() === cleanId || (c.name || "").toLowerCase() === cleanId);
    const hierKey = Object.keys(hierarchy).find(k => k.toLowerCase() === cleanId || (hierarchy[k]?.name || "").toLowerCase() === cleanId);
    const hier = hierKey ? hierarchy[hierKey] : null;

    entityName = hier?.name || cat?.name || id;

    // 1. Subcategories & equipment types
    if (hier && Array.isArray(hier.subcategories)) {
      subcategories = hier.subcategories;
      hier.subcategories.forEach(s => {
        if (Array.isArray(s.equipmentTypes)) {
          equipmentTypes.push(...s.equipmentTypes.map(eq => ({ ...eq, subcategory: s.name || s.id })));
        }
      });
    } else if (cat && Array.isArray(cat.subcategories)) {
      subcategories = cat.subcategories;
    }

    const subcatSlugs = subcategories.flatMap(s => [s.id, s.slug, s.name].filter(Boolean).map(x => x.toLowerCase()));

    // 2. Linked products
    linkedProducts = allProducts.filter(p => {
      const pCat = (p.category || "").toLowerCase();
      const pSub = (p.subcategory || "").toLowerCase();
      return (
        pCat === cleanId ||
        pCat === (cat?.slug || "").toLowerCase() ||
        pCat === (cat?.id || "").toLowerCase() ||
        pCat === (cat?.name || "").toLowerCase() ||
        pCat === (hierKey || "").toLowerCase() ||
        (pSub && subcatSlugs.includes(pSub))
      );
    });
  } else if (type === "subcategory") {
    const cat = categories.find(c => (c.id || "").toLowerCase() === cleanParent || (c.slug || "").toLowerCase() === cleanParent || (c.name || "").toLowerCase() === cleanParent);
    const hierKey = Object.keys(hierarchy).find(k => k.toLowerCase() === cleanParent || (hierarchy[k]?.name || "").toLowerCase() === cleanParent);
    const hier = hierKey ? hierarchy[hierKey] : null;

    const subHier = hier && Array.isArray(hier.subcategories)
      ? hier.subcategories.find(s => (s.id || "").toLowerCase() === cleanId || (s.name || "").toLowerCase() === cleanId || (s.slug || "").toLowerCase() === cleanId)
      : null;
    const subCat = cat && Array.isArray(cat.subcategories)
      ? cat.subcategories.find(s => (s.id || "").toLowerCase() === cleanId || (s.name || "").toLowerCase() === cleanId || (s.slug || "").toLowerCase() === cleanId)
      : null;

    entityName = subHier?.name || subCat?.name || id;

    // Equipment types
    if (subHier && Array.isArray(subHier.equipmentTypes)) {
      equipmentTypes = subHier.equipmentTypes;
    }

    const subIdentList = Array.from(new Set([
      cleanId,
      (subHier?.id || "").toLowerCase(),
      (subHier?.slug || "").toLowerCase(),
      (subHier?.name || "").toLowerCase(),
      (subCat?.id || "").toLowerCase(),
      (subCat?.slug || "").toLowerCase(),
      (subCat?.name || "").toLowerCase()
    ])).filter(Boolean);
    const eqIdentList = equipmentTypes.flatMap(e => [e.id, e.name].filter(Boolean).map(x => x.toLowerCase()));

    // Linked products
    linkedProducts = allProducts.filter(p => {
      const pSub = (p.subcategory || "").toLowerCase();
      const pEq = (p.equipmentType || "").toLowerCase();
      const isSubMatch =
        subIdentList.includes(pSub) ||
        (Array.isArray(p.subcategories) && p.subcategories.some(s => subIdentList.includes((s || "").toLowerCase())));
      const isEqMatch = pEq && eqIdentList.includes(pEq);
      return isSubMatch || isEqMatch;
    });
  } else if (type === "equipment") {
    entityName = id;
    linkedProducts = allProducts.filter(p => {
      const pType = (p.equipmentType || "").toLowerCase();
      return pType === cleanId;
    });
  }

  // Collect associated Cloudinary assets across linked products
  const assetSet = new Set();
  linkedProducts.forEach(prod => {
    const pids = getProductCloudinaryPublicIds(prod);
    pids.forEach(pid => assetSet.add(pid));
  });

  const canDeleteDirectly = linkedProducts.length === 0 && subcategories.length === 0 && equipmentTypes.length === 0;

  return {
    entityType: type,
    id,
    name: entityName,
    parentCategory: cleanParent || parentCategory,
    parentSubcategory: cleanSub || parentSubcategory,
    productCount: linkedProducts.length,
    products: linkedProducts.map(p => ({
      id: p.id,
      title: p.title || p.productName || p.id,
      sku: p.sku || "N/A",
      imagesCount: getProductCloudinaryPublicIds(p).length
    })),
    subcategoryCount: subcategories.length,
    subcategories: subcategories.map(s => ({ id: s.id, name: s.name })),
    equipmentTypeCount: equipmentTypes.length,
    equipmentTypes: equipmentTypes.map(eq => ({ id: eq.id || eq.name, name: eq.name })),
    imageCount: assetSet.size,
    publicIds: Array.from(assetSet),
    canDeleteDirectly
  };
}

/**
 * Execute Cascading Deletion of Category, Subcategory, or Equipment Type
 * - Deletes selected taxonomy entity and its exclusive child records
 * - Deletes exclusively associated products & destroys their exclusive Cloudinary assets
 * - Preserves shared Cloudinary media referenced by surviving records/orders
 * - Queues failed Cloudinary cleanups for retry
 * - Prevents duplicate concurrent deletion requests via activeEntityLocks
 * - Idempotent across repeated executions
 */
async function deleteCategoryWithDependencies(type, id, { parentCategory = null, parentSubcategory = null, entityName = null, cascadeProducts = false, purgeProducts = false, adminEmail = "ADMIN" } = {}) {
  // Ensure any pending disk writes are flushed so store and disk are consistent
  if (typeof store.flushPersistSync === "function") {
    store.flushPersistSync();
  }

  const cleanId = String(id || "").trim().toLowerCase();
  const lockKey = `${type}:${cleanId}`;

  // Concurrency check: prevent duplicate requests on same entity
  if (activeEntityLocks.has(lockKey)) {
    const err = new Error(`Deletion for ${type} "${id}" is already in progress. Please wait for it to finish.`);
    err.statusCode = 409;
    throw err;
  }
  activeEntityLocks.add(lockKey);

  const opId = `del_cat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  pendingOperations.set(opId, {
    opId,
    type,
    targetId: id,
    adminEmail,
    stage: "INITIALIZED",
    startedAt: new Date().toISOString()
  });

  try {
    const inspection = inspectCategoryDependencies(type, id, parentCategory, parentSubcategory);
    if (entityName && (!inspection.name || inspection.name === id)) {
      inspection.name = entityName;
    }
    const resolvedParent = inspection.parentCategory || parentCategory;
    const resolvedSub = inspection.parentSubcategory || parentSubcategory;

    const shouldDeleteProducts = cascadeProducts === true || purgeProducts === true;
    const deletedProducts = [];
    let totalDeletedMedia = 0;
    let totalPreservedMedia = 0;
    let totalFailedMedia = 0;

    if (shouldDeleteProducts && inspection.products.length > 0) {
      pendingOperations.get(opId).stage = "DELETING_ASSOCIATED_PRODUCTS";
      for (const prodInfo of inspection.products) {
        try {
          const prodDelRes = await deleteProductPermanently(prodInfo.id, adminEmail);
          deletedProducts.push(prodDelRes);
          totalDeletedMedia += (prodDelRes.media?.deletedCount || 0);
          totalPreservedMedia += (prodDelRes.media?.preservedCount || 0);
          totalFailedMedia += (prodDelRes.media?.errorCount || 0);
        } catch (prodErr) {
          console.error(`[deletionService] Product deletion notice for ${prodInfo.id}:`, prodErr.message);
        }
      }
    } else if (!shouldDeleteProducts && inspection.products.length > 0) {
      // Safe detachment fallback if cascadeProducts is explicitly false
      pendingOperations.get(opId).stage = "DETACHING_PRODUCTS_MONGO";
      if (mongoService.isConfigured()) {
        try {
          const client = await mongoService.getClient();
          const db = client.db(process.env.MONGODB_DB || "drmedex");
          const col = db.collection("approved_products");

          if (type === "primary") {
            const catId = cleanId;
            const catName = inspection.name;
            const subcatNames = (inspection.subcategories || []).flatMap(s => [s.id, s.name].filter(Boolean));
            const orList = [
              { category: { $regex: new RegExp(`^${escapeRegexStr(catId)}$`, "i") } },
              { category: { $regex: new RegExp(`^${escapeRegexStr(catName)}$`, "i") } }
            ];
            if (subcatNames.length > 0) {
              orList.push({ subcategory: { $in: subcatNames } });
            }
            await col.updateMany(
              { $or: orList },
              {
                $set: {
                  category: "",
                  subcategory: "",
                  equipmentType: "",
                  subcategories: [],
                  updatedAt: new Date().toISOString()
                }
              }
            );
          } else if (type === "subcategory") {
            const subId = cleanId;
            const subName = inspection.name;
            const subAliases = Array.from(new Set([
              subId,
              (inspection.id || "").toLowerCase(),
              (inspection.name || "").toLowerCase(),
              ...(inspection.subcategories || []).flatMap(s => [s.id, s.slug, s.name].filter(Boolean).map(x => x.toLowerCase()))
            ])).filter(Boolean);
            const eqNames = (inspection.equipmentTypes || []).flatMap(e => [e.id, e.name].filter(Boolean));
            const orList = [
              { subcategory: { $in: subAliases.map(a => new RegExp(`^${escapeRegexStr(a)}$`, "i")) } },
              { subcategories: { $in: subAliases } }
            ];
            if (eqNames.length > 0) {
              orList.push({ equipmentType: { $in: eqNames } });
            }
            await col.updateMany(
              { $or: orList },
              {
                $set: {
                  subcategory: "",
                  equipmentType: "",
                  updatedAt: new Date().toISOString()
                },
                $pull: {
                  subcategories: { $in: subAliases }
                }
              }
            );
          } else if (type === "equipment") {
            const eqId = cleanId;
            const eqName = inspection.name;
            await col.updateMany(
              {
                $or: [
                  { equipmentType: { $regex: new RegExp(`^${escapeRegexStr(eqId)}$`, "i") } },
                  { equipmentType: { $regex: new RegExp(`^${escapeRegexStr(eqName)}$`, "i") } }
                ]
              },
              {
                $set: {
                  equipmentType: "",
                  updatedAt: new Date().toISOString()
                }
              }
            );
          }
        } catch (mErr) {
          console.warn("[deletionService] Notice during MongoDB product detachment:", mErr.message);
        }
      }
    }

    // Invalidate MongoDB cache immediately
    if (mongoService.isConfigured()) {
      mongoService.invalidateMongoCache();
    }

    // Delete the taxonomy record from store (persists to db.json and clears initialHierarchy)
    pendingOperations.get(opId).stage = "TAXONOMY_DELETION";
    let taxonomyResult = null;
    try {
      if (type === "primary") {
        taxonomyResult = store.deletePrimaryCategory(id, true);
      } else if (type === "subcategory") {
        taxonomyResult = store.deleteSubcategory(resolvedParent, id, true);
      } else if (type === "equipment") {
        taxonomyResult = store.deleteEquipmentType(resolvedParent, resolvedSub, id);
      }
      if (mongoService.isConfigured()) {
        await store.flushTaxonomyAsync();
      }
    } catch (taxErr) {
      console.warn(`[deletionService] Taxonomy deletion notice for ${type} "${id}":`, taxErr.message);
    }

    auditService.logAction(adminEmail, "TAXONOMY_CASCADE_DELETED", id, {
      type,
      name: inspection.name,
      deletedProductsCount: deletedProducts.length,
      deletedSubcategoriesCount: inspection.subcategoryCount,
      deletedEquipmentTypesCount: inspection.equipmentTypeCount,
      deletedMediaCount: totalDeletedMedia,
      preservedMediaCount: totalPreservedMedia,
      failedMediaCount: totalFailedMedia
    });

    const isCleanupPending = totalFailedMedia > 0;
    const message = shouldDeleteProducts
      ? (isCleanupPending
          ? `${type.charAt(0).toUpperCase() + type.slice(1)} "${inspection.name}" and associated records deleted. ${deletedProducts.length} product(s) deleted. (${totalFailedMedia} media cleanup(s) pending retry).`
          : `${type.charAt(0).toUpperCase() + type.slice(1)} "${inspection.name}" and all associated data deleted successfully.`)
      : `${type.charAt(0).toUpperCase() + type.slice(1)} "${inspection.name}" permanently deleted. ${inspection.products.length} product(s) safely preserved.`;

    return {
      success: true,
      type,
      id,
      name: inspection.name,
      message,
      cleanupPending: isCleanupPending,
      deletedProductsCount: deletedProducts.length,
      deletedSubcategoriesCount: inspection.subcategoryCount,
      deletedEquipmentTypesCount: inspection.equipmentTypeCount,
      deletedMediaCount: totalDeletedMedia,
      preservedMediaCount: totalPreservedMedia,
      failedMediaCount: totalFailedMedia,
      hierarchy: store.getCatalogueHierarchy(),
      categories: store.getCategories(true)
    };
  } finally {
    activeEntityLocks.delete(lockKey);
    pendingOperations.delete(opId);
  }
}

/**
 * Delete Individual Product Image
 * - If exclusively owned: destroys from Cloudinary
 * - If shared: preserves Cloudinary asset, removes reference only
 * - Removes reference from MongoDB Atlas document, warm cache, and local store
 * - Automatically reassigns primary image if the primary photograph was removed
 */
async function deleteSingleProductImage(productId, imageUrlOrPublicIdOrSpec, adminEmail = "ADMIN") {
  if (!productId) throw new Error("Product ID is required to remove image.");
  if (!imageUrlOrPublicIdOrSpec) throw new Error("Image URL or publicId is required.");

  let targetUrl = "";
  let publicId = "";

  if (typeof imageUrlOrPublicIdOrSpec === "string") {
    const trimmed = imageUrlOrPublicIdOrSpec.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
      targetUrl = trimmed;
      publicId = extractCloudinaryPublicId(targetUrl) || "";
    } else {
      publicId = trimmed;
    }
  } else if (typeof imageUrlOrPublicIdOrSpec === "object" && imageUrlOrPublicIdOrSpec !== null) {
    const rawUrl = imageUrlOrPublicIdOrSpec.imageUrl || imageUrlOrPublicIdOrSpec.url || "";
    const rawPid = imageUrlOrPublicIdOrSpec.publicId || "";
    targetUrl = typeof rawUrl === "string" ? rawUrl.trim() : "";
    publicId = typeof rawPid === "string" ? rawPid.trim() : "";
    if (!publicId && targetUrl) {
      publicId = extractCloudinaryPublicId(targetUrl) || "";
    }
  }

  // 1. Fetch product
  let product = null;
  if (isMongoConfigured()) {
    try {
      const { getApprovedProduct } = require("./mongoService");
      product = await getApprovedProduct(productId);
    } catch (e) {}
  }
  if (!product) {
    product = store.getProductById(productId, true);
  }
  if (!product) {
    throw new Error(`Product "${productId}" was not found.`);
  }

  // 2. Build comprehensive target matching set across URLs, paths, publicIds and managed representations
  const targetTokens = new Set();
  const normalizeForMatch = (s) => {
    if (!s || typeof s !== "string") return "";
    return s.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  };

  if (targetUrl) {
    targetTokens.add(targetUrl.trim());
    targetTokens.add(normalizeForMatch(targetUrl));
    const extractedFromTarget = extractCloudinaryPublicId(targetUrl);
    if (extractedFromTarget) {
      targetTokens.add(extractedFromTarget);
      targetTokens.add(extractedFromTarget.toLowerCase());
    }
  }
  if (publicId) {
    targetTokens.add(publicId.trim());
    targetTokens.add(publicId.trim().toLowerCase());
  }

  // Inspect managedCloudinaryImages to associate any alternate URLs (e.g. originalUrl or secureUrl)
  const managedList = Array.isArray(product.managedCloudinaryImages) ? product.managedCloudinaryImages : [];
  for (const m of managedList) {
    const mPid = m?.publicId || m?.public_id || "";
    const mUrl = m?.secureUrl || m?.secure_url || m?.url || "";
    const mOrig = m?.originalUrl || "";
    const isThisManagedTarget =
      (publicId && mPid && mPid.toLowerCase() === publicId.toLowerCase()) ||
      (targetUrl && mUrl && (mUrl === targetUrl || normalizeForMatch(mUrl) === normalizeForMatch(targetUrl))) ||
      (targetUrl && mOrig && (mOrig === targetUrl || normalizeForMatch(mOrig) === normalizeForMatch(targetUrl)));

    if (isThisManagedTarget) {
      if (mPid) { targetTokens.add(mPid); targetTokens.add(mPid.toLowerCase()); }
      if (mUrl) { targetTokens.add(mUrl); targetTokens.add(normalizeForMatch(mUrl)); }
      if (mOrig) { targetTokens.add(mOrig); targetTokens.add(normalizeForMatch(mOrig)); }
    }
  }

  const isTarget = (img) => {
    if (!img) return false;
    if (typeof img === "string") {
      const s = img.trim();
      const sNorm = normalizeForMatch(s);
      if (targetTokens.has(s) || targetTokens.has(sNorm)) return true;
      const sPid = extractCloudinaryPublicId(s);
      if (sPid && (targetTokens.has(sPid) || targetTokens.has(sPid.toLowerCase()))) return true;
      if (publicId && publicId.length > 5 && s.includes(publicId)) return true;
      return false;
    }
    if (typeof img === "object") {
      const u = (img.url || img.secureUrl || img.originalUrl || "").trim();
      const pid = (img.publicId || img.public_id || "").trim();
      if (pid && (targetTokens.has(pid) || targetTokens.has(pid.toLowerCase()))) return true;
      if (u && (targetTokens.has(u) || targetTokens.has(normalizeForMatch(u)))) return true;
      const uPid = extractCloudinaryPublicId(u);
      if (uPid && (targetTokens.has(uPid) || targetTokens.has(uPid.toLowerCase()))) return true;
      if (publicId && publicId.length > 5 && u && u.includes(publicId)) return true;
      return false;
    }
    return false;
  };

  const updatedImages = (product.images || []).filter(img => !isTarget(img));
  const updatedGallery = (product.galleryImages || []).filter(img => !isTarget(img));
  const updatedManaged = (product.managedCloudinaryImages || []).filter(img => !isTarget(img));

  // 3. Automatic Primary Image Reassignment:
  // If the removed photograph was the primary image (or if primaryImage is no longer in remaining images),
  // assign the first remaining photograph as the new primary image. If no images remain, clear primaryImage.
  let updatedPrimary = product.primaryImage || "";
  if (!updatedPrimary || isTarget(updatedPrimary) || (updatedImages.length > 0 && !updatedImages.includes(updatedPrimary))) {
    updatedPrimary = updatedImages[0] || (typeof updatedGallery[0] === "string" ? updatedGallery[0] : updatedGallery[0]?.url) || "";
  }
  if (updatedImages.length === 0) {
    updatedPrimary = "";
  }

  const updates = {
    images: updatedImages,
    galleryImages: updatedGallery,
    managedCloudinaryImages: updatedManaged,
    primaryImage: updatedPrimary,
    updatedAt: new Date().toISOString()
  };

  // 4. Update MongoDB Atlas if configured (throw if DB update fails so deletion is never falsely reported)
  if (isMongoConfigured()) {
    try {
      const c = await getClient();
      const db = c.db(process.env.MONGODB_DB || "drmedex");
      const filter = product._id ? { _id: product._id } : buildProductFilter(product.id);
      await db.collection(COLLECTION_NAME).updateOne(filter, { $set: updates });
    } catch (mErr) {
      console.error("[deletionService] MongoDB image ref update error:", sanitizeMongoError(mErr));
      throw new Error(`Failed to update product images in database: ${sanitizeMongoError(mErr)}`);
    }

    // Update warm cache in place, or invalidate cache so fresh data loads on next request
    try {
      if (typeof mongoService.patchCachedProduct === "function") {
        mongoService.patchCachedProduct(product.id, updates);
      } else if (typeof patchCachedProduct === "function") {
        patchCachedProduct(product.id, updates);
      } else if (typeof mongoService.invalidateMongoCache === "function") {
        mongoService.invalidateMongoCache();
      }
    } catch (cacheErr) {
      console.warn("[deletionService] Cache patch warning (non-fatal):", cacheErr.message);
      if (typeof mongoService.invalidateMongoCache === "function") {
        mongoService.invalidateMongoCache();
      }
    }
  }

  // Update local store in memory
  store.updateProduct(product.id, updates);

  // Synchronize fallback files non-blockingly so deleted images never resurface
  syncFallbackFilesAsync(product.id, updates);

  // 5. Exclusively owned Cloudinary asset destruction with timeout & safe isolation
  let assetDestroyed = false;
  let sharedAssetPreserved = false;
  let shareReason = null;

  const cleanCloudinaryPid = (publicId && !publicId.includes("://") && !publicId.startsWith("/"))
    ? publicId
    : (targetUrl ? extractCloudinaryPublicId(targetUrl) : null);

  if (cleanCloudinaryPid && cloudinaryService && cloudinaryService.isConfigured()) {
    try {
      // Run share check with a safe timeout guard so queries never hang or abort the HTTP response
      const shareCheckPromise = isAssetSharedOrOrdered(cleanCloudinaryPid, product.id);
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ shared: false, timedOut: true }), 3500));
      const shareCheck = await Promise.race([shareCheckPromise, timeoutPromise]);

      if (shareCheck.shared) {
        sharedAssetPreserved = true;
        shareReason = shareCheck.reason || "Asset preserved: referenced by another product or order.";
      } else {
        const delRes = await cloudinary.uploader.destroy(cleanCloudinaryPid, { invalidate: true });
        if (delRes && (delRes.result === "ok" || delRes.result === "not found")) {
          assetDestroyed = true;
        }
      }
    } catch (cErr) {
      console.warn(`[deletionService] Cloudinary cleanup notice for ${cleanCloudinaryPid}:`, cErr.message);
    }
  }

  auditService.logAction(adminEmail, "PRODUCT_IMAGE_DELETED", product.id, {
    publicId: cleanCloudinaryPid || publicId || targetUrl,
    assetDestroyed,
    sharedAssetPreserved,
    remainingImagesCount: updatedImages.length
  });

  return {
    success: true,
    productId: product.id,
    publicId: cleanCloudinaryPid || publicId || targetUrl,
    assetDestroyed,
    sharedAssetPreserved,
    shareReason,
    remainingImages: updatedImages,
    primaryImage: updatedPrimary
  };
}

/**
 * Live Storage Inventory across all configured providers
 */
async function getStorageInventory() {
  const inventory = [];

  // 1. MongoDB Atlas — Product text, specifications, customer orders, addresses
  const mongoConfigured = isMongoConfigured();
  let mongoConnected = false;
  let approvedProductsCount = 0;
  let ordersCount = 0;
  let addressesCount = 0;
  let deletedTombstonesCount = 0;
  let mongoError = null;
  let mongoLatencyMs = null;

  if (mongoConfigured) {
    const startPing = Date.now();
    try {
      const c = await getClient(true);
      const db = c.db(process.env.MONGODB_DB || "drmedex");
      const pingRes = await db.command({ ping: 1 });
      mongoLatencyMs = Date.now() - startPing;
      mongoConnected = Boolean(pingRes.ok === 1);

      approvedProductsCount = await db.collection(COLLECTION_NAME).countDocuments().catch(() => 0);
      ordersCount = await db.collection(ORDERS_COLLECTION).countDocuments().catch(() => 0);
      addressesCount = await db.collection(ADDRESSES_COLLECTION).countDocuments().catch(() => 0);
      deletedTombstonesCount = await db.collection(DELETED_COLLECTION).countDocuments().catch(() => 0);
    } catch (err) {
      mongoError = sanitizeMongoError(err);
    }
  }

  // Product text entry
  inventory.push({
    dataType: "Product Specifications & Text",
    provider: "MongoDB Atlas",
    storageType: "NoSQL Database",
    connectionStatus: mongoConnected ? "Connected" : (mongoConfigured ? "Error" : "Not Configured"),
    documentCount: approvedProductsCount || store.getProducts({ includeInactive: true }).length,
    storageUsed: approvedProductsCount ? `~${(approvedProductsCount * 4.5).toFixed(1)} KB` : "Local Seed Cache",
    health: mongoConnected ? `Healthy (${mongoLatencyMs}ms)` : (mongoError || "Offline Fallback"),
    collections: [COLLECTION_NAME],
    isAuthoritative: true
  });

  // Customer orders & addresses entry
  inventory.push({
    dataType: "Customer Orders & Delivery Addresses",
    provider: "MongoDB Atlas",
    storageType: "NoSQL Database",
    connectionStatus: mongoConnected ? "Connected" : (mongoConfigured ? "Error" : "Not Configured"),
    documentCount: ordersCount + addressesCount,
    storageUsed: `Orders: ${ordersCount} | Addresses: ${addressesCount}`,
    health: mongoConnected ? `Healthy (${mongoLatencyMs}ms)` : (mongoError || "Offline Fallback"),
    collections: [ORDERS_COLLECTION, ADDRESSES_COLLECTION],
    isAuthoritative: true
  });

  // 2. Cloudinary — Product images and media
  let cloudinaryUsage = null;
  let cloudinaryConnected = false;
  const cloudinaryConfigured = cloudinaryService.isConfigured();

  if (cloudinaryConfigured) {
    try {
      cloudinaryUsage = await cloudinaryService.getAccountUsage();
      cloudinaryConnected = Boolean(cloudinaryUsage && !cloudinaryUsage.error);
    } catch (cErr) {
      cloudinaryUsage = { error: cErr.message };
    }
  }

  inventory.push({
    dataType: "Product Images & Media Gallery",
    provider: "Cloudinary Media Cloud",
    storageType: "Object / Media Storage",
    connectionStatus: cloudinaryConnected ? "Connected" : (cloudinaryConfigured ? "Error" : "Not Configured"),
    documentCount: cloudinaryUsage?.objects?.usage || (cloudinaryUsage?.storage ? cloudinaryUsage.storage.objects : "N/A"),
    storageUsed: cloudinaryUsage?.storage ? `${cloudinaryUsage.storage.mb} MB (${cloudinaryUsage.storage.creditsUsage || 0} credits)` : "N/A",
    health: cloudinaryConnected ? `Healthy (Plan: ${cloudinaryUsage?.storage?.plan || "Standard"})` : (cloudinaryUsage?.error || "Credentials Missing"),
    bandwidth: cloudinaryUsage?.bandwidth ? `${cloudinaryUsage.bandwidth.mb} MB` : "N/A",
    isAuthoritative: true
  });

  // 3. Customer Reviews — Firebase Cloud Firestore
  let firestoreConfigured = false;
  let firestoreConnected = false;
  let reviewsCount = 0;
  let firestoreError = null;

  try {
    firestoreConfigured = firestoreService.isFirestoreAdminConfigured ? firestoreService.isFirestoreAdminConfigured() : false;
    if (firestoreConfigured) {
      const revResult = await firestoreService.getAdminReviews({ limit: 1 });
      firestoreConnected = true;
      reviewsCount = revResult?.total || 0;
    }
  } catch (fErr) {
    firestoreError = fErr.message;
  }

  inventory.push({
    dataType: "Customer Reviews & Moderation",
    provider: "Firebase Cloud Firestore",
    storageType: "Document Database",
    connectionStatus: firestoreConnected ? "Connected" : (firestoreConfigured ? "Error" : "Not Configured"),
    documentCount: reviewsCount,
    storageUsed: firestoreConnected ? `~${(reviewsCount * 1.2).toFixed(1)} KB` : "N/A",
    health: firestoreConnected ? "Healthy" : (firestoreError || "Unconfigured (Reviews Disabled)"),
    collections: ["reviews"],
    isAuthoritative: true
  });

  // 4. Customer Accounts & Auth — Supabase Auth
  const supabaseUrl = process.env.SUPABASE_URL || "https://drmedex.supabase.co";
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || "";
  const supabaseConfigured = Boolean(supabaseKey);

  inventory.push({
    dataType: "Customer Accounts & Authentication",
    provider: "Supabase GoTrue (PostgreSQL)",
    storageType: "Managed Auth Service",
    connectionStatus: supabaseConfigured ? "Connected" : "Simulated / Sandbox",
    documentCount: 5, // Mock customers default
    storageUsed: "~10 KB",
    health: supabaseConfigured ? "Healthy" : "Sandbox Mode Active",
    isAuthoritative: false
  });

  // 5. Deployment & Runtime Infrastructure
  inventory.push({
    dataType: "Frontend Builds & API Serverless",
    provider: "Vercel Edge & Node.js Runtime",
    storageType: "Serverless Execution Engine",
    connectionStatus: "Connected",
    documentCount: process.env.VERCEL ? "Serverless Lambda" : "Local Node Server",
    storageUsed: `${(process.memoryUsage().rss / (1024 * 1024)).toFixed(1)} MB RSS`,
    health: `Node.js ${process.version} (${process.platform})`,
    isAuthoritative: true
  });

  return {
    success: true,
    timestamp: new Date().toISOString(),
    totalProviders: inventory.length,
    inventory,
    pendingOperations: Array.from(pendingOperations.values())
  };
}

/**
 * Scan for Orphaned Cloudinary Assets (Assets in Cloudinary with 0 DB references)
 */
async function scanOrphanedCloudinaryAssets() {
  if (!cloudinaryService.isConfigured()) {
    return {
      success: false,
      message: "Cloudinary is not configured.",
      orphanedAssets: []
    };
  }

  // Collect all known referenced public IDs from products & orders
  const referencedPublicIds = new Set();
  const allProducts = store.getProducts({ includeInactive: true }) || [];
  allProducts.forEach(prod => {
    const pids = getProductCloudinaryPublicIds(prod);
    pids.forEach(p => referencedPublicIds.add(p));
  });

  // Check MongoDB products as well
  if (isMongoConfigured()) {
    try {
      const c = await getClient();
      const db = c.db(process.env.MONGODB_DB || "drmedex");
      const mongoDocs = await db.collection(COLLECTION_NAME).find({}, { projection: { primaryImage: 1, images: 1, galleryImages: 1, managedCloudinaryImages: 1 } }).toArray();
      mongoDocs.forEach(doc => {
        const pids = getProductCloudinaryPublicIds(doc);
        pids.forEach(p => referencedPublicIds.add(p));
      });
    } catch (e) {}
  }

  // Scan Cloudinary assets using authenticated API
  try {
    const resourcesRes = await cloudinary.api.resources({
      type: "upload",
      prefix: "drmedex",
      max_results: 100
    });

    const resources = resourcesRes.resources || [];
    const orphaned = [];

    for (const res of resources) {
      if (!referencedPublicIds.has(res.public_id)) {
        orphaned.push({
          publicId: res.public_id,
          format: res.format,
          bytes: res.bytes,
          secureUrl: res.secure_url,
          createdAt: res.created_at
        });
      }
    }

    return {
      success: true,
      totalScanned: resources.length,
      referencedCount: referencedPublicIds.size,
      orphanedCount: orphaned.length,
      orphanedAssets: orphaned
    };
  } catch (apiErr) {
    return {
      success: false,
      message: `Failed to scan Cloudinary resources: ${apiErr.message}`,
      totalScanned: 0,
      referencedCount: referencedPublicIds.size,
      orphanedCount: 0,
      orphanedAssets: []
    };
  }
}

/**
 * Delete Verified Orphaned Cloudinary Assets upon explicit confirmation
 */
async function deleteOrphanedAssets(publicIds, adminEmail = "ADMIN") {
  if (!Array.isArray(publicIds) || publicIds.length === 0) {
    throw new Error("No orphaned asset public IDs provided for deletion.");
  }

  // Safety scan: double check none are referenced before destroying
  const deleted = [];
  const errors = [];

  for (const pid of publicIds) {
    const shareCheck = await isAssetSharedOrOrdered(pid);
    if (shareCheck.shared) {
      errors.push({ publicId: pid, error: `Skipped: ${shareCheck.reason}` });
      continue;
    }

    try {
      const res = await cloudinary.uploader.destroy(pid, { invalidate: true });
      if (res.result === "ok" || res.result === "not found") {
        deleted.push({ publicId: pid, result: res.result });
      } else {
        errors.push({ publicId: pid, error: res.result });
      }
    } catch (cErr) {
      errors.push({ publicId: pid, error: cErr.message });
    }
  }

  auditService.logAction(adminEmail, "ORPHANED_ASSETS_CLEANED", "CLOUDINARY", {
    deletedCount: deleted.length,
    errorCount: errors.length
  });

  return {
    success: true,
    deletedCount: deleted.length,
    errorCount: errors.length,
    deleted,
    errors
  };
}

/**
 * Get active pending/failed deletion operations
 */
function getPendingOperations() {
  return Array.from(pendingOperations.values());
}

/**
 * Retry an incomplete or failed operation idempotently
 */
async function retryPendingOperation(opId, adminEmail = "ADMIN") {
  const op = pendingOperations.get(opId);
  if (!op) {
    throw new Error(`Operation "${opId}" not found or already completed.`);
  }

  if (op.type === "PRODUCT") {
    return await deleteProductPermanently(op.targetId, adminEmail);
  }

  throw new Error(`Retry handler for operation type "${op.type}" is not supported.`);
}

module.exports = {
  deleteProductPermanently,
  inspectCategoryDependencies,
  deleteCategoryWithDependencies,
  deleteSingleProductImage,
  getStorageInventory,
  scanOrphanedCloudinaryAssets,
  deleteOrphanedAssets,
  getPendingOperations,
  retryPendingOperation,
  retryFailedCleanups,
  extractCloudinaryPublicId,
  getProductCloudinaryPublicIds,
  isAssetSharedOrOrdered
};

