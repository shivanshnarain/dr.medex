const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB || "drmedex";
const COLLECTION_NAME = "approved_products";

let client = null;
let clientPromise = null;
let indexesEnsured = false;

function isConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

/**
 * Get or initialize MongoDB Atlas client singleton
 */
async function getClient() {
  if (!isConfigured()) {
    throw new Error("MONGODB_URI is not configured in server environment.");
  }

  if (!clientPromise) {
    client = new MongoClient(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000
    });
    clientPromise = client.connect();
  }

  await clientPromise;
  return client;
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
    reviewStatus: "CORRECT",
    reviewNote: product.reviewNote || null,
    // Store only verified image URLs/references — NEVER raw binaries or base64
    images: Array.isArray(product.images) ? product.images.filter(i => typeof i === "string" && !i.startsWith("data:")) : [],
    primaryImage: typeof product.primaryImage === "string" && !product.primaryImage.startsWith("data:") ? product.primaryImage : "",
    cloudinarySyncStatus: product.cloudinarySyncStatus || null,
    approvedAt: new Date().toISOString(),
    approvedBy: adminEmail,
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
 * Remove approved product from MongoDB Atlas when status changes to NEEDS_EDITING or PENDING
 * - Targeted delete by stable product ID
 * - Preserves editable source record in source store
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
 * Get approved product by ID
 */
async function getApprovedProduct(productId) {
  if (!isConfigured()) return null;
  const collection = await getCollection();
  return collection.findOne({ id: String(productId) });
}

/**
 * Get MongoDB Atlas status and collection counts
 */
async function getMongoStatus() {
  if (!isConfigured()) {
    return { configured: false };
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
  removeApprovedProduct,
  getApprovedProduct,
  getMongoStatus
};
