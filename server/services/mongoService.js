const { MongoClient } = require("mongodb");

const dbName = process.env.MONGODB_DB || "drmedex";
const COLLECTION_NAME = "approved_products";

function getNormalizedUri() {
  let raw = process.env.MONGODB_URI || "mongodb+srv://roshanofficial0009_db_user:ExUyOvI6KQ5NNJOq@cluster0.7y0dbdy.mongodb.net/?appName=Cluster0";
  if ((raw.startsWith("mongodb+srv://") || raw.startsWith("mongodb://")) && !raw.includes(`/${dbName}`)) {
    raw = raw.replace("/?", `/${dbName}?`);
  }
  return raw;
}

const uri = getNormalizedUri();
let indexesEnsured = false;
let connectionFailureCount = 0;
let lastFailureTime = 0;
let lastFailureError = null;

function isConfigured() {
  return Boolean(uri);
}

function sanitizeMongoError(err) {
  if (!err) return "Unknown database error";
  const msg = typeof err === "string" ? err : err.message || String(err);
  if (msg.includes("SSL alert number 80") || msg.includes("tlsv1 alert internal error")) {
    return "MongoDB Atlas TLS connection rejected (SSL alert 80): Connecting IP address is not whitelisted in MongoDB Atlas Network Access.";
  }
  if (msg.includes("Authentication failed") || msg.includes("bad auth")) {
    return "MongoDB Atlas authentication failed: invalid credentials or authSource.";
  }
  if (msg.includes("ETIMEDOUT") || msg.includes("timed out") || msg.includes("ECONNREFUSED")) {
    return "MongoDB Atlas cluster unreachable (network timeout or connection refused).";
  }
  return msg.replace(/mongodb(\+srv)?:\/\/[^@]+@/g, "mongodb$1://***:***@");
}

/**
 * Get or initialize MongoDB Atlas client singleton
 */
async function getClient(forceRetry = false) {
  if (!isConfigured()) {
    throw new Error("MONGODB_URI is not configured in server environment.");
  }

  // If forceRetry is requested, clear any cached failed state
  if (forceRetry) {
    global._mongoClientPromise = null;
    global._mongoClient = null;
  }

  // Serverless-safe global singleton
  if (!global._mongoClientPromise) {
    global._mongoClient = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 15000,
      retryWrites: true,
      retryReads: true
    });
    global._mongoClientPromise = global._mongoClient.connect()
      .then(c => {
        connectionFailureCount = 0;
        lastFailureError = null;
        return c;
      })
      .catch(err => {
        connectionFailureCount++;
        lastFailureTime = Date.now();
        lastFailureError = sanitizeMongoError(err);
        global._mongoClientPromise = null;
        global._mongoClient = null;
        throw new Error(lastFailureError);
      });
  }

  try {
    await global._mongoClientPromise;
    return global._mongoClient;
  } catch (err) {
    global._mongoClientPromise = null;
    global._mongoClient = null;
    throw err;
  }
}

/**
 * Get approved products collection
 */
async function getCollection() {
  const c = await getClient();
  const db = c.db(process.env.MONGODB_DB || "drmedex");
  const collection = db.collection(COLLECTION_NAME);

  if (!indexesEnsured) {
    try {
      await collection.createIndex({ id: 1 }, { unique: true });
      await collection.createIndex({ sku: 1 });
      await collection.createIndex({ category: 1 });
      indexesEnsured = true;
    } catch (e) {
      // index might already exist
      indexesEnsured = true;
    }
  }

  return collection;
}

/**
 * Validate product required fields
 */
function validateProduct(product) {
  if (!product) throw new Error("Product data is required");
  if (!product.id) throw new Error("Product ID is required for MongoDB synchronization");
  const title = product.title || product.productName;
  if (!title) throw new Error("Product title/name is required");
  return true;
}

/**
 * Upsert approved product text data into MongoDB Atlas
 * - Uses stable product ID as unique key (no duplicates on repeated clicks)
 * - Compact structured BSON
 * - Image URLs/references only (no base64 or binaries)
 * - Never alters existing source database
 */
async function upsertApprovedProduct(product, adminEmail = "admin@drmedex.com") {
  if (!isConfigured()) {
    return { success: false, status: "NOT_CONFIGURED", message: "MongoDB Atlas is not configured." };
  }

  validateProduct(product);
  const collection = await getCollection();

  // Extract clean, compact text fields
  const approvedRecord = {
    id: String(product.id),
    title: String(product.title || product.productName).trim(),
    productName: product.productName || product.title,
    sku: String(product.sku || product.SKU || "").trim(),
    modelNumber: product.modelNumber && product.modelNumber !== "—" ? String(product.modelNumber).trim() : "",
    brand: product.brand || "DR.MEDEX Global",
    category: product.category || "",
    categoryName: product.categoryName || "",
    subcategory: product.subcategory || "",
    subcategoryName: product.subcategoryName || "",
    productType: product.productType || product.equipmentType || "Medical Equipment",
    shortDescription: product.shortDescription || "",
    overview: product.overview || "",
    fullDescription: product.fullDescription || "",
    features: Array.isArray(product.features) ? product.features : [],
    applications: Array.isArray(product.applications) ? product.applications : [],
    specifications: product.technicalSpecifications || product.specifications || {},
    basePrice: Number(product.basePrice || 0),
    regularPrice: product.regularPrice !== undefined ? Number(product.regularPrice) : null,
    salePrice: product.salePrice !== undefined ? Number(product.salePrice) : null,
    baseCurrency: product.baseCurrency || "INR",
    stock: Number(product.stock || 0),
    stockStatus: product.stockStatus || (Number(product.stock || 0) > 0 ? "IN_STOCK" : "OUT_OF_STOCK"),
    status: product.status || "ACTIVE",
    isRetired: Boolean(product.isRetired),
    inCatalogue: product.inCatalogue !== undefined ? Boolean(product.inCatalogue) : (product.status !== "ARCHIVED" && !product.isRetired),
    archivedAt: product.archivedAt || null,
    archivedBy: product.archivedBy || null,
    reviewStatus: product.reviewStatus || "PENDING",
    reviewNote: product.reviewNote || null,
    mongoSyncStatus: "SYNCED",
    mongoSyncedAt: new Date().toISOString(),
    // Store only verified image URLs/references — NEVER raw binaries or base64
    images: Array.isArray(product.images) ? product.images.filter(i => typeof i === "string" && !i.startsWith("data:")) : [],
    primaryImage: typeof product.primaryImage === "string" && !product.primaryImage.startsWith("data:") ? product.primaryImage : "",
    managedCloudinaryImages: Array.isArray(product.managedCloudinaryImages) ? product.managedCloudinaryImages : [],
    cloudinarySyncStatus: product.cloudinarySyncStatus || null,
    approvedAt: product.reviewStatus === "CORRECT" ? (product.approvedAt || new Date().toISOString()) : (product.approvedAt || null),
    approvedBy: product.reviewStatus === "CORRECT" ? adminEmail : (product.approvedBy || null),
    updatedAt: new Date().toISOString()
  };

  const result = await collection.updateOne(
    { id: approvedRecord.id },
    { $set: approvedRecord },
    { upsert: true }
  );

  return {
    success: true,
    status: "SYNCED",
    id: approvedRecord.id,
    upserted: Boolean(result.upsertedCount > 0),
    modified: Boolean(result.modifiedCount > 0),
    matched: Boolean(result.matchedCount > 0)
  };
}

/**
 * Update review status in MongoDB Atlas without deleting any product data or images
 */
async function updateProductReviewStatus(productId, reviewStatus, reviewNote = null, adminEmail = "admin@drmedex.com", fullProduct = null) {
  if (!isConfigured()) {
    return { success: false, status: "NOT_CONFIGURED", message: "MongoDB Atlas is not configured." };
  }

  if (!productId) throw new Error("Product ID is required for review status update");
  const collection = await getCollection();

  const updates = {
    reviewStatus,
    reviewNote: reviewNote !== undefined ? (reviewNote ? String(reviewNote).trim() : null) : null,
    mongoSyncStatus: "SYNCED",
    mongoSyncedAt: new Date().toISOString(),
    reviewedBy: adminEmail,
    reviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (reviewStatus === "CORRECT") {
    updates.approvedAt = new Date().toISOString();
    updates.approvedBy = adminEmail;
  }

  if (fullProduct) {
    const candidate = { ...fullProduct, ...updates };
    return await upsertApprovedProduct(candidate, adminEmail);
  }

  const result = await collection.updateOne(
    { id: String(productId) },
    { $set: updates },
    { upsert: true }
  );

  return {
    success: true,
    status: "UPDATED",
    id: String(productId),
    reviewStatus,
    modified: Boolean(result.modifiedCount > 0),
    matched: Boolean(result.matchedCount > 0),
    upserted: Boolean(result.upsertedCount > 0)
  };
}

/**
 * Remove approved product from MongoDB Atlas ONLY on explicit permanent deletion
 * - Preserves records for status changes
 */
async function removeApprovedProduct(productId) {
  if (!isConfigured()) {
    return { success: false, status: "NOT_CONFIGURED", message: "MongoDB Atlas is not configured." };
  }

  if (!productId) throw new Error("Product ID is required for removal");
  const collection = await getCollection();

  const result = await collection.deleteOne({ id: String(productId) });

  return {
    success: true,
    status: "REMOVED",
    id: productId,
    deletedCount: result.deletedCount
  };
}

/**
 * Get product by ID from MongoDB
 */
/**
 * Get product by ID from MongoDB
 */
async function getApprovedProduct(productId) {
  if (!isConfigured()) return null;
  if (Date.now() - lastFailureTime < 15000 && connectionFailureCount > 0) return null;
  try {
    const collection = await getCollection();
    return await collection.findOne({ id: String(productId) });
  } catch (err) {
    return null;
  }
}

/**
 * Query all products directly from MongoDB collection
 */
async function getProductsFromMongo(filters = {}) {
  if (!isConfigured()) return null;
  // If connection failed within last 15s, avoid blocking page load
  if (Date.now() - lastFailureTime < 15000 && connectionFailureCount > 0) {
    return null;
  }
  try {
    const collection = await getCollection();
    const query = {};
    if (filters.category && filters.category !== "ALL") {
      query.category = filters.category;
    }
    if (filters.reviewStatus && filters.reviewStatus !== "ALL" && filters.reviewStatus !== "all") {
      if (filters.reviewStatus === "PENDING" || filters.reviewStatus === "NOT_REVIEWED") {
        query.$or = [{ reviewStatus: "PENDING" }, { reviewStatus: { $exists: false } }];
      } else {
        query.reviewStatus = filters.reviewStatus;
      }
    }
    return await collection.find(query).toArray();
  } catch (err) {
    console.warn("[mongoService] getProductsFromMongo:", sanitizeMongoError(err));
    return null;
  }
}

/**
 * Get product count in MongoDB collection
 */
async function getProductsCount() {
  if (!isConfigured()) return null;
  if (Date.now() - lastFailureTime < 15000 && connectionFailureCount > 0) return null;
  try {
    const collection = await getCollection();
    return await collection.countDocuments();
  } catch {
    return null;
  }
}

function getEgressIp() {
  return new Promise((resolve) => {
    const https = require("https");
    const req = https.get("https://api.ipify.org?format=json", { timeout: 2000 }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data).ip);
        } catch {
          resolve(data.trim() || "unknown");
        }
      });
    });
    req.on("error", () => resolve("unknown"));
    req.on("timeout", () => {
      req.destroy();
      resolve("timeout");
    });
  });
}

/**
 * Get MongoDB Atlas status and collection counts
 */
async function getMongoStatus() {
  if (!isConfigured()) {
    return { configured: false };
  }

  let clusterHost = "unknown";
  let hasCustomEnv = Boolean(process.env.MONGODB_URI);
  try {
    const raw = getNormalizedUri();
    const urlObj = new URL(raw.replace(/^mongodb(\+srv)?:\/\//, "http://"));
    clusterHost = urlObj.host;
  } catch (e) {}

  const egressIp = await getEgressIp().catch(() => "unknown");

  try {
    const c = await getClient(true);
    const db = c.db(process.env.MONGODB_DB || "drmedex");
    const ping = await db.command({ ping: 1 });
    const collection = db.collection(COLLECTION_NAME);
    const count = await collection.countDocuments();

    return {
      configured: true,
      connected: Boolean(ping.ok === 1),
      database: process.env.MONGODB_DB || "drmedex",
      collection: COLLECTION_NAME,
      approvedProductsCount: count,
      clusterHost,
      egressIp,
      hasCustomEnv
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      clusterHost,
      egressIp,
      hasCustomEnv,
      error: sanitizeMongoError(err)
    };
  }
}

module.exports = {
  isConfigured,
  sanitizeMongoError,
  upsertApprovedProduct,
  upsertProduct: upsertApprovedProduct,
  updateProductReviewStatus,
  removeApprovedProduct,
  getApprovedProduct,
  getProduct: getApprovedProduct,
  getProductsFromMongo,
  getProductsCount,
  getMongoStatus
};
