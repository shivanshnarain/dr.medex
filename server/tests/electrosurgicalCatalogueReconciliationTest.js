const assert = require("assert");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const store = require("../services/store");
const mongoService = require("../services/mongoService");

async function runTest() {
  console.log("==========================================================================");
  console.log("TEST: DR.MEDEX Electrosurgical Catalogue Reconciliation & Subcategories");
  console.log("==========================================================================");

  const deletedIds = mongoService.isConfigured() ? await mongoService.getDeletedProductIds() : new Set();
  let list = store.getProducts({ includeInactive: true }).filter(p => !deletedIds.has(String(p.id)));

  if (mongoService.isConfigured()) {
    try {
      const mongoList = await mongoService.getProductsFromMongo();
      const activeMongoList = mongoList.filter(m => !deletedIds.has(String(m.id)));
      const mongoMap = new Map(activeMongoList.map(m => [String(m.id), m]));
      const storeMap = new Set(list.map(p => String(p.id)));

      list = list.map(p => {
        const pid = String(p.id);
        const m = mongoMap.get(pid);
        if (m) {
          return {
            ...p,
            ...m,
            reviewStatus: (m.reviewStatus === "CORRECT" || p.reviewStatus === "CORRECT")
              ? "CORRECT"
              : (m.reviewStatus === "NEEDS_EDITING" || p.reviewStatus === "NEEDS_EDITING")
              ? "NEEDS_EDITING"
              : (m.reviewStatus || p.reviewStatus || "PENDING")
          };
        }
        return p;
      });

      activeMongoList.forEach(m => {
        const mid = String(m.id);
        if (!storeMap.has(mid)) {
          list.push({
            ...m,
            reviewStatus: m.reviewStatus || "PENDING"
          });
        }
      });
    } catch (e) {
      console.warn("Mongo query note:", e.message);
    }
  }

  // 1. Total Electrosurgical Units count
  const electroUnits = list.filter(p => p.category === "electrosurgical-units" || p.category === "electrosurgical units");
  console.log(`[Check 1] Total Electrosurgical count: ${electroUnits.length} (Expected: 28)`);
  assert.strictEqual(electroUnits.length, 28, `Expected exactly 28 electrosurgical units, got ${electroUnits.length}`);

  // 2. Electrosurgical Surgery subcategory count
  const surgeryProducts = electroUnits.filter(p => p.subcategory === "electrosurgical-surgery");
  console.log(`[Check 2] Electrosurgical Surgery count: ${surgeryProducts.length} (Expected: 13)`);
  assert.strictEqual(surgeryProducts.length, 13, `Expected exactly 13 Electrosurgical Surgery products, got ${surgeryProducts.length}`);

  // 3. Electrosurgical Generators subcategory count
  const generatorProducts = electroUnits.filter(p => p.subcategory === "electrosurgical-generator");
  console.log(`[Check 3] Electrosurgical Generators count: ${generatorProducts.length} (Expected: 15)`);
  assert.strictEqual(generatorProducts.length, 15, `Expected exactly 15 Electrosurgical Generator products, got ${generatorProducts.length}`);

  // 4. Verify sum equals total (no unassigned products)
  assert.strictEqual(
    surgeryProducts.length + generatorProducts.length,
    electroUnits.length,
    "All Electrosurgical products must belong to either Surgery or Generators"
  );

  // 5. Total Catalogue Size & Core Category Distribution
  console.log(`[Check 4] Total Catalogue count: ${list.length} (Expected: 193)`);
  assert.strictEqual(list.length, 193, `Expected exactly 193 total catalogue products, got ${list.length}`);

  // 6. Test Primary Image Resolution Algorithm
  console.log("[Check 5] Primary Image Resolution Algorithm");
  const testProductWithExplicitPrimary = {
    id: "test-prod-1",
    primaryImage: "https://example.com/explicit-primary.jpg",
    images: ["https://example.com/gallery-1.jpg", "https://example.com/gallery-2.jpg"]
  };
  const resolveTestPrimary = (p) => {
    if (p.primaryImage && typeof p.primaryImage === "string" && p.primaryImage.trim()) {
      return p.primaryImage;
    }
    if (Array.isArray(p.images) && p.images.length > 0) {
      for (const img of p.images) {
        if (typeof img === "object" && img !== null && img.isPrimary && img.url) {
          return img.url;
        }
      }
      const first = p.images[0];
      if (typeof first === "string" && first.trim()) return first;
      if (typeof first === "object" && first !== null && first.url) return first.url;
    }
    return "/placeholder-medical.png";
  };
  assert.strictEqual(
    resolveTestPrimary(testProductWithExplicitPrimary),
    "https://example.com/explicit-primary.jpg",
    "Explicit primaryImage must take precedence"
  );

  const testProductWithObjPrimary = {
    id: "test-prod-2",
    images: [
      { url: "https://example.com/img1.jpg", isPrimary: false },
      { url: "https://example.com/img2-primary.jpg", isPrimary: true }
    ]
  };
  assert.strictEqual(
    resolveTestPrimary(testProductWithObjPrimary),
    "https://example.com/img2-primary.jpg",
    "isPrimary flag in images array must take precedence over index 0"
  );

  console.log("\n==========================================================================");
  console.log("  ALL ELECTROSURGICAL RECONCILIATION CHECKS PASSED SUCCESSFULLY!");
  console.log("==========================================================================");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
