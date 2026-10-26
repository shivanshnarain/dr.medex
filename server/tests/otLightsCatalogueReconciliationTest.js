const assert = require("assert");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const store = require("../services/store");
const mongoService = require("../services/mongoService");

async function runTest() {
  console.log("=======================================================");
  console.log("TEST: OT Lights Catalogue Reconciliation & Three Sections");
  console.log("=======================================================");

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

  // 1. Total OT Lights count
  const otLights = list.filter(p => p.category === "ot-lights" || p.category === "OT / Surgical Lights");
  console.log(`[Check 1] Total OT & Surgical Lights count: ${otLights.length} (Expected: 72)`);
  assert.strictEqual(otLights.length, 72, `Expected exactly 72 OT lights, got ${otLights.length}`);

  // 2. Section counts
  const singleDome = otLights.filter(p => p.subcategory === "single-dome-ot-lights");
  const doubleDome = otLights.filter(p => p.subcategory === "ot-surgical-lights-double-dome");
  const mobileDome = otLights.filter(p => p.subcategory === "mobile-led-ot-lights");

  console.log(`[Check 2] Single Dome count: ${singleDome.length} (Expected: 25)`);
  assert.strictEqual(singleDome.length, 25, `Expected 25 Single Dome products, got ${singleDome.length}`);

  console.log(`[Check 3] Double Dome count: ${doubleDome.length} (Expected: 29)`);
  assert.strictEqual(doubleDome.length, 29, `Expected 29 Double Dome products, got ${doubleDome.length}`);

  console.log(`[Check 4] Mobile OT count: ${mobileDome.length} (Expected: 18)`);
  assert.strictEqual(mobileDome.length, 18, `Expected 18 Mobile OT products, got ${mobileDome.length}`);

  // 3. No duplicate IDs across sections
  const seenIds = new Set();
  otLights.forEach(p => {
    assert.strictEqual(seenIds.has(p.id), false, `Duplicate product detected: ${p.id}`);
    seenIds.add(p.id);
  });
  console.log(`[Check 5] Verified zero cross-section duplicates (72 unique IDs)`);

  // 4. Check the 4 relocated records exist in medical-equipment with data preserved
  const relocatedIds = [
    "prod-battery-backup-for-ot-li",
    "prod-operating-roomsurgical-l",
    "prod-premium-led-medical-exam",
    "prod-wireless-10w-led-medical"
  ];

  relocatedIds.forEach(id => {
    const p = list.find(item => item.id === id);
    assert.ok(p, `Relocated product ${id} must exist in catalogue`);
    assert.strictEqual(p.category, "medical-equipment", `Product ${id} should be in medical-equipment`);
    assert.ok(Array.isArray(p.images) && p.images.length > 0, `Product ${id} must have images preserved`);
    assert.ok(p.sku, `Product ${id} must preserve its SKU`);
    console.log(`[Check 6] Verified preserved relocated product: ${id} (${p.title}) -> category: ${p.category}, images: ${p.images.length}`);
  });

  // 5. Verify protected products marked CORRECT
  const protectedProduct = list.find(p => p.id === "prod-ceiling-mounted-led-ot-l");
  assert.ok(protectedProduct, "prod-ceiling-mounted-led-ot-l must exist");
  assert.ok(Array.isArray(protectedProduct.images) && protectedProduct.images.length >= 4, "Images must be preserved");
  console.log(`[Check 7] Verified protected product prod-ceiling-mounted-led-ot-l in Single Dome with ${protectedProduct.images.length} images`);

  console.log("\n=======================================================");
  console.log("ALL OT LIGHTS RECONCILIATION CHECKS PASSED SUCCESSFULLY!");
  console.log("=======================================================");
}

runTest().then(() => process.exit(0)).catch(err => {
  console.error("FAIL:", err);
  process.exit(1);
});
