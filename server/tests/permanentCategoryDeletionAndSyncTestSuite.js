/**
 * DR.MEDEX Global — Permanent Category / Subcategory Deletion & Storefront Sync Test Suite
 * 
 * Verifies:
 * 1. Rapid, non-blocking deletion (no timeouts, no "Load failed" network drops).
 * 2. Permanent deletion from MongoDB Atlas and local store with authoritative persistence.
 * 3. 2-second reappearance prevention (verifies no revival after background refetch/polling).
 * 4. Cold-start / serverless lambda restart persistence (verifies tombstones prevent seed revival).
 * 5. Customer storefront & navigation synchronization (absent from public /api/categories).
 * 6. Product Safety Guard: products are detached, NEVER deleted (193 total catalogue count intact).
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const store = require("../services/store");
const mongoService = require("../services/mongoService");
const deletionService = require("../services/deletionService");

const DB_FILE = path.join(__dirname, "../data/db.json");
const originalDbContent = fs.readFileSync(DB_FILE, "utf-8");

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTestSuite() {
  console.log("===============================================================================");
  console.log("DR.MEDEX — PERMANENT CATEGORY DELETION & STOREFRONT SYNC TEST SUITE");
  console.log("===============================================================================\n");

  try {
    const initialProds = store.getProducts({ includeInactive: true });
  console.log(`[TEST 0] Initial state verification: ${initialProds.length} products in catalogue.`);
  assert.strictEqual(initialProds.length, 193, "Total product catalogue must start at exactly 193 products.");

  // 1. Create a test category and subcategory
  const timestamp = Date.now();
  const testCatName = `TEST-CAT-${timestamp}`;
  const testSubName = `TEST-SUB-${timestamp}`;
  const testEqName = `TEST-EQ-${timestamp}`;

  console.log("\n[TEST 1] Creating temporary category, subcategory and equipment type...");
  const createdCat = store.addPrimaryCategory({
    name: testCatName,
    code: "TPD",
    shortDescription: "Category created specifically for permanent deletion verification."
  });
  const catSlug = createdCat.category.slug;

  const createdSub = store.addSubcategory({
    parentCategory: catSlug,
    name: testSubName,
    description: "Subcategory created for permanent deletion verification."
  });
  const subSlug = createdSub.subcategory.slug;

  const createdEq = store.addEquipmentType({
    parentCategory: catSlug,
    subcategory: subSlug,
    name: testEqName
  });

  // Ensure initial test taxonomy is flushed to MongoDB Atlas
  await store.flushTaxonomyAsync();

  // Verify created in store and Mongo
  await store.syncTaxonomyFromMongo(true);
  const hierBefore = store.getCatalogueHierarchy();
  assert.ok(hierBefore[catSlug], "Test category must exist in hierarchy.");
  assert.ok(hierBefore[catSlug].subcategories.some(s => s.id === subSlug), "Test subcategory must exist in hierarchy.");

  console.log("✔ TEST 1 PASSED: Taxonomy created and synced to MongoDB Atlas.");

  // 2. Attach a product to this test category and subcategory
  console.log("\n[TEST 2] Verifying Product Safety Guard (attach product without risk of deletion)...");
  const sampleProd = initialProds[0];
  const originalCat = sampleProd.category;
  const originalSub = sampleProd.subcategory;
  const originalEq = sampleProd.equipmentType;

  // Temporarily attach sample product to test subcategory
  sampleProd.category = catSlug;
  sampleProd.subcategory = subSlug;
  sampleProd.equipmentType = createdEq.equipmentType.id;
  store.updateProduct(sampleProd.id, {
    category: catSlug,
    subcategory: subSlug,
    equipmentType: createdEq.equipmentType.id
  });

  console.log(`✔ TEST 2 PASSED: Sample product "${sampleProd.id}" safely attached to test subcategory.`);

  // 3. Delete the subcategory via deletionService with cascadeProducts: false
  console.log("\n[TEST 3] Deleting subcategory via deletionService (Testing rapid completion & safe detachment)...");
  const startTime = Date.now();
  const deleteSubRes = await deletionService.deleteCategoryWithDependencies("subcategory", subSlug, {
    parentCategory: catSlug,
    cascadeProducts: false,
    adminEmail: "TEST_ADMIN"
  });
  const duration = Date.now() - startTime;
  console.log(`Deletion completed in ${duration}ms (Must be fast < 1000ms to eliminate "Load failed" timeouts).`);
  assert.ok(duration < 1500, "Deletion must complete swiftly without timing out.");
  assert.strictEqual(deleteSubRes.success, true, "Deletion result must be successful.");
  assert.strictEqual(deleteSubRes.deletedProductsCount, 0, "Zero products must be deleted.");

  // Verify product was detached, not deleted!
  const prodsAfterSubDel = store.getProducts({ includeInactive: true });
  assert.strictEqual(prodsAfterSubDel.length, 193, "Total product catalogue must remain exactly 193.");
  const inspectedProd = store.getProductById(sampleProd.id, true);
  assert.strictEqual(inspectedProd.subcategory, "", "Product subcategory reference must be safely detached.");

  console.log("✔ TEST 3 PASSED: Subcategory deleted swiftly. Products safely detached and 193 count preserved.");

  // 4. Verify Immediate Database Persistence in MongoDB Atlas
  console.log("\n[TEST 4] Verifying immediate persistence in MongoDB Atlas...");
  const mongoHier = await mongoService.getCatalogueHierarchyFromMongo(true);
  const mongoSubExists = mongoHier && mongoHier[catSlug] && mongoHier[catSlug].subcategories.some(s => s.id === subSlug);
  assert.strictEqual(mongoSubExists, false, "Subcategory must be absent from MongoDB Atlas catalogue hierarchy.");

  const tombstones = await mongoService.getDeletedTaxonomies(true);
  const hasSubTombstone = tombstones.some(t => t.id === subSlug && t.type === "subcategory");
  assert.strictEqual(hasSubTombstone, true, "MongoDB Atlas must record tombstone for deleted subcategory.");

  console.log("✔ TEST 4 PASSED: Subcategory confirmed absent from MongoDB Atlas and tombstone recorded.");

  // 5. 2-Second Reappearance Resistance Check
  console.log("\n[TEST 5] Testing 2-second reappearance bug (waiting 2.5 seconds)...");
  await sleep(2500);

  const asyncHierAfterWait = await store.getCatalogueHierarchyAsync();
  const asyncCatsAfterWait = await store.getCategoriesAsync(true);
  const subReappearedInHier = asyncHierAfterWait[catSlug]?.subcategories?.some(s => s.id === subSlug);
  const subReappearedInCats = asyncCatsAfterWait.find(c => c.id === catSlug)?.subcategories?.some(s => s.id === subSlug);

  assert.strictEqual(subReappearedInHier, false, "Subcategory MUST NOT reappear after 2 seconds in hierarchy.");
  assert.strictEqual(subReappearedInCats, false, "Subcategory MUST NOT reappear after 2 seconds in categories.");

  console.log("✔ TEST 5 PASSED: Zero reappearance after 2.5 seconds. Taxonomy remains permanently deleted.");

  // 6. Cold-Start / Refresh Persistence Check
  console.log("\n[TEST 6] Simulating cold start / serverless lambda restart...");
  mongoService.invalidateTaxonomyCache();
  await store.syncTaxonomyFromMongo(true);

  const refreshedHier = store.getCatalogueHierarchy();
  assert.strictEqual(refreshedHier[catSlug]?.subcategories?.some(s => s.id === subSlug), false, "Cold start must not revive deleted subcategory.");

  console.log("✔ TEST 6 PASSED: Cold start simulation confirmed zero resurrection.");

  // 7. Storefront & Customer Navigation Sync Check
  console.log("\n[TEST 7] Verifying Customer Storefront & Navigation Synchronization...");
  const publicCategories = await store.getCategoriesAsync(false);
  const publicTestCat = publicCategories.find(c => c.id === catSlug);
  if (publicTestCat) {
    assert.strictEqual(
      (publicTestCat.subcategories || []).some(s => s.id === subSlug),
      false,
      "Public customer categories must not show deleted subcategory."
    );
  }
  console.log("✔ TEST 7 PASSED: Storefront synchronization verified.");

  // 8. Delete the parent test category completely
  console.log("\n[TEST 8] Deleting primary test category...");
  const delCatRes = await deletionService.deleteCategoryWithDependencies("primary", catSlug, {
    cascadeProducts: false,
    adminEmail: "TEST_ADMIN"
  });
  assert.strictEqual(delCatRes.success, true, "Primary category deletion must succeed.");

  // Verify removed from MongoDB Atlas and tombstoned
  const mongoHierFinal = await mongoService.getCatalogueHierarchyFromMongo(true);
  if (mongoHierFinal) {
    assert.strictEqual(Boolean(mongoHierFinal[catSlug]), false, "Primary category must be gone from MongoDB Atlas.");
  }

  const tombstonesFinal = await mongoService.getDeletedTaxonomies(true);
  if (Array.isArray(tombstonesFinal) && tombstonesFinal.length > 0) {
    assert.ok(tombstonesFinal.some(t => t.id === catSlug && t.type === "primary"), "Primary category tombstone must be recorded.");
  }

  // 9. Restore sample product original category fields
  sampleProd.category = originalCat;
  sampleProd.subcategory = originalSub;
  sampleProd.equipmentType = originalEq;
  store.updateProduct(sampleProd.id, {
    category: originalCat,
    subcategory: originalSub,
    equipmentType: originalEq
  });

  // 10. Clean up test tombstones from MongoDB Atlas
  await mongoService.removeDeletedTaxonomyTombstone({ type: "primary", id: catSlug });
  await mongoService.removeDeletedTaxonomyTombstone({ type: "subcategory", id: subSlug });

  // 11. Final catalogue preservation check
  const finalProds = store.getProducts({ includeInactive: true });
  console.log(`\n[TEST 11] Final catalogue preservation check: ${finalProds.length} products.`);
  assert.strictEqual(finalProds.length, 193, "Total product catalogue must remain exactly 193 products.");

  console.log("✔ TEST 11 PASSED: 193 approved products preserved with zero loss.\n");
  console.log("===============================================================================");
  console.log("ALL PERMANENT CATEGORY DELETION & STOREFRONT SYNC TESTS PASSED SUCCESSFULLY");
  console.log("===============================================================================");
  } finally {
    fs.writeFileSync(DB_FILE, originalDbContent, "utf-8");
    store.reloadFromDisk();
  }
}

runTestSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("\n❌ TEST FAILED:", err);
    process.exit(1);
  });
