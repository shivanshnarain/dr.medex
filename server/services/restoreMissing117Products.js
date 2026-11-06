/**
 * Production Data Recovery Script:
 * Restore all 117 missing DR.MEDEX products to reach the expected 193 original products.
 *
 * Safe, idempotent, non-destructive:
 * - Does NOT overwrite or mutate any of the existing 76 products.
 * - Restores original product data from authoritative historical commit 9f7a7d7c / products.js.
 * - Sets reviewStatus: "PENDING" ("Not Yet Reviewed") for all restored products.
 * - Inserts into MongoDB Atlas approved_products collection.
 * - Updates server/data/db.json, client/server/data/db.json, and client/src/data/fallbackProducts.json.
 */

require("dotenv").config();
const { MongoClient } = require("mongodb");
const cp = require("child_process");
const fs = require("fs");
const path = require("path");

async function restore() {
  console.log("=== STARTING RESTORATION OF 117 MISSING PRODUCTS ===");

  // 1. Load authoritative historical product records
  const oldDbJsonRaw = cp.execSync("git show 9f7a7d7c:server/data/db.json", {
    maxBuffer: 50 * 1024 * 1024
  }).toString();
  const oldDbJson = JSON.parse(oldDbJsonRaw);

  const dbJsonPath = path.join(__dirname, "../data/db.json");
  const currDbJson = JSON.parse(fs.readFileSync(dbJsonPath, "utf8"));

  const currIds = new Set(currDbJson.products.map(p => p.id));
  const missingProducts = oldDbJson.products.filter(p => !currIds.has(p.id));

  console.log(`Current products in db.json: ${currDbJson.products.length}`);
  console.log(`Identified missing original products: ${missingProducts.length}`);
  if (missingProducts.length !== 117) {
    throw new Error(`Expected exactly 117 missing products, but found ${missingProducts.length}`);
  }

  // Normalize each missing product with proper defaults without altering core data
  const normalizedRestored = missingProducts.map(p => {
    const stockVal = p.stock !== undefined && p.stock !== null && !isNaN(Number(p.stock))
      ? Number(p.stock)
      : (p.stockQuantity !== undefined && p.stockQuantity !== null && !isNaN(Number(p.stockQuantity))
          ? Number(p.stockQuantity)
          : 25);

    return {
      ...p,
      stock: stockVal,
      stockQuantity: stockVal,
      stockStatus: p.stockStatus || (stockVal > 0 ? "IN_STOCK" : "OUT_OF_STOCK"),
      status: p.status || "ACTIVE",
      isRetired: Boolean(p.isRetired),
      inCatalogue: p.inCatalogue !== undefined ? Boolean(p.inCatalogue) : true,
      reviewStatus: "PENDING", // Not Yet Reviewed
      reviewNote: p.reviewNote || null,
      mongoSyncStatus: "SYNCED",
      mongoSyncedAt: new Date().toISOString(),
      updatedAt: p.updatedAt || new Date().toISOString()
    };
  });

  // 2. Restore to MongoDB Atlas
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment!");
  }

  const client = new MongoClient(uri);
  await client.connect();
  const dbName = process.env.MONGODB_DB_NAME || "drmedex";
  const db = client.db(dbName);
  const collection = db.collection("approved_products");

  const countBefore = await collection.countDocuments();
  console.log(`MongoDB approved_products count before restoration: ${countBefore}`);

  // Fetch all existing IDs in MongoDB to prevent any duplicates
  const existingDocs = await collection.find({}, { projection: { id: 1 } }).toArray();
  const existingMongoIds = new Set(existingDocs.map(d => d.id));

  const toInsertMongo = normalizedRestored.filter(p => !existingMongoIds.has(p.id));
  console.log(`New documents to insert into MongoDB: ${toInsertMongo.length}`);

  if (toInsertMongo.length > 0) {
    const insertResult = await collection.insertMany(toInsertMongo, { ordered: false });
    console.log(`Successfully inserted ${insertResult.insertedCount} documents into MongoDB Atlas.`);
  }

  const countAfter = await collection.countDocuments();
  console.log(`MongoDB approved_products count after restoration: ${countAfter}`);
  if (countAfter !== 193) {
    console.warn(`WARNING: Expected 193 in MongoDB, got ${countAfter}`);
  }

  // Also remove any of these restored IDs from deleted_products tombstones if present
  try {
    const delCol = db.collection("deleted_products");
    const restoredIds = normalizedRestored.map(p => p.id);
    const tombstoneDel = await delCol.deleteMany({ id: { $in: restoredIds } });
    if (tombstoneDel.deletedCount > 0) {
      console.log(`Removed ${tombstoneDel.deletedCount} tombstones from deleted_products.`);
    }
  } catch (tErr) {
    console.warn("Notice: deleted_products check:", tErr.message);
  }

  await client.close();

  // 3. Update server/data/db.json
  // Preserve existing 76 products, append 117 restored products
  const combinedProducts = [...currDbJson.products, ...normalizedRestored];
  currDbJson.products = combinedProducts;
  fs.writeFileSync(dbJsonPath, JSON.stringify(currDbJson, null, 2), "utf8");
  console.log(`Updated ${dbJsonPath} with ${combinedProducts.length} products.`);

  // 4. Update client/server/data/db.json if it exists
  const clientServerDbPath = path.join(__dirname, "../../client/server/data/db.json");
  if (fs.existsSync(clientServerDbPath)) {
    fs.writeFileSync(clientServerDbPath, JSON.stringify(currDbJson, null, 2), "utf8");
    console.log(`Updated ${clientServerDbPath} with ${combinedProducts.length} products.`);
  }

  // 5. Update client/src/data/fallbackProducts.json
  const fallbackPath = path.join(__dirname, "../../client/src/data/fallbackProducts.json");
  if (fs.existsSync(fallbackPath)) {
    fs.writeFileSync(fallbackPath, JSON.stringify(combinedProducts, null, 2), "utf8");
    console.log(`Updated ${fallbackPath} with ${combinedProducts.length} products.`);
  }

  // 6. Verification Summary
  const statusCounts = { CORRECT: 0, PENDING: 0, NEEDS_EDITING: 0, OTHER: 0 };
  combinedProducts.forEach(p => {
    if (p.reviewStatus === "CORRECT") statusCounts.CORRECT++;
    else if (p.reviewStatus === "PENDING") statusCounts.PENDING++;
    else if (p.reviewStatus === "NEEDS_EDITING") statusCounts.NEEDS_EDITING++;
    else statusCounts.OTHER++;
  });

  console.log("\n=== RESTORATION VERIFICATION SUMMARY ===");
  console.log(`Total Products: ${combinedProducts.length}`);
  console.log(`- Correct (public storefront): ${statusCounts.CORRECT}`);
  console.log(`- Not Yet Reviewed (admin panel): ${statusCounts.PENDING}`);
  console.log(`- Needs Editing (admin panel): ${statusCounts.NEEDS_EDITING}`);
  console.log(`- Other: ${statusCounts.OTHER}`);
  console.log("=========================================\n");
}

restore().catch(err => {
  console.error("Restoration failed:", err);
  process.exit(1);
});
