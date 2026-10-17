const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "mongodb+srv://roshanofficial0009_db_user:ExUyOvI6KQ5NNJOq@cluster0.7y0dbdy.mongodb.net/?appName=Cluster0";
const dbName = process.env.MONGODB_DB || "drmedex";
const COLLECTION_NAME = "approved_products";

let indexesEnsured = false;
const COOLDOWN_MS = 30000; // 30 seconds connection failure cooldown to prevent page hang
let lastFailureTime = 0;
let lastFailureError = null;

function isConfigured() {
  return Boolean(uri);
}

function isCoolingDown() {
  return Date.now() - lastFailureTime < COOLDOWN_MS;
}

/**
 * Get or initialize MongoDB Atlas client singleton
 */
async function getClient() {
  if (!isConfigured()) {
    throw new Error("MONGODB_URI is not configured in server environment.");
  }

  if (isCoolingDown()) {
    throw new Error(`MongoDB connection in cooldown (${Math.ceil((COOLDOWN_MS - (Date.now() - lastFailureTime)) / 1000)}s remaining): ${lastFailureError}`);
  }

  // Serverless-safe global singleton
  if (!global._mongoClientPromise) {
    global._mongoClient = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
      socketTimeoutMS: 5000
    });
    global._mongoClientPromise = global._mongoClient.connect().catch(err => {
      lastFailureTime = Date.now();
      lastFailureError = err.message;
      global._mongoClientPromise = null;
      throw err;
    });
  }

  try {
    await global._mongoClientPromise;
    return global._mongoClient;
  } catch (err) {
    lastFailureTime = Date.now();
    lastFailureError = err.message;
    global._mongoClientPromise = null;
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
    reviewStatus: product.reviewStatus || "PENDING",
    reviewNote: product.reviewNote || null,
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
async function getApprovedProduct(productId) {
  if (!isConfigured() || isCoolingDown()) return null;
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
  if (!isConfigured() || isCoolingDown()) return null;
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
    console.warn("[mongoService] getProductsFromMongo error:", err.message);
    return null;
  }
}

/**
 * Get product count in MongoDB collection
 */
async function getProductsCount() {
  if (!isConfigured() || isCoolingDown()) return null;
  try {
    const collection = await getCollection();
    return await collection.countDocuments();
  } catch {
    return null;
  }
}

/**
 * Get MongoDB Atlas status and collection counts
 */
async function getMongoStatus() {
  if (!isConfigured()) {
    return { configured: false };
  }

  if (isCoolingDown()) {
    return {
      configured: true,
      connected: false,
      coolingDown: true,
      cooldownSecondsRemaining: Math.ceil((COOLDOWN_MS - (Date.now() - lastFailureTime)) / 1000),
      error: lastFailureError
    };
  }

  try {
    const c = await getClient();
    const db = c.db(process.env.MONGODB_DB || "drmedex");
    const ping = await db.command({ ping: 1 });
    const collection = db.collection(COLLECTION_NAME);
    const count = await collection.countDocuments();

    return {
      configured: true,
      connected: Boolean(ping.ok === 1),
      database: process.env.MONGODB_DB || "drmedex",
      collection: COLLECTION_NAME,
      approvedProductsCount: count
    };
  } catch (err) {
    return {
      configured: true,
      connected: false,
      error: err.message
    };
  }
}

module.exports = {
  isConfigured,
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
