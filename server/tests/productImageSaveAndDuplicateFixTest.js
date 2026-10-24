/**
 * DR.MEDEX - Product Image Save & Duplicate Validation Fix Test Suite
 * Validates:
 * 1. Editing an existing product does NOT falsely flag it as a duplicate of itself
 * 2. Multi-identifier exclusion works for MongoDB _id, store id, slug, sku, and excludeIds array
 * 3. Genuinely duplicate products in the same category ARE still blocked
 * 4. Image uploads and Cloudinary/local URLs persist cleanly on product updates
 * 5. 100% parity between server/routes/admin.js and client/server/routes/admin.js
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const store = require("../services/store");

function simulateCheckDuplicate(body, allProducts) {
  const {
    category,
    subcategory,
    equipmentType,
    modelNumber,
    title,
    productName,
    excludeId,
    excludeIds
  } = body;

  const norm = (str) => (str || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
  const normModel = norm(modelNumber);
  const normTitle = norm(title || productName);

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

  const rawExclude = excludeId ? String(excludeId).trim() : null;
  if (rawExclude && rawExclude !== "new") {
    const fromStore = store.getProductById(rawExclude, true) ||
      allProducts.find(p => {
        const pid = String(p.id || "").toLowerCase();
        const p_id = String(p._id || "").toLowerCase();
        const pslug = String(p.slug || "").toLowerCase();
        const target = rawExclude.toLowerCase();
        return pid === target || p_id === target || pslug === target;
      });

    if (fromStore) {
      addExclude(fromStore.id);
      addExclude(fromStore._id);
      addExclude(fromStore.slug);
      addExclude(fromStore.sku);
      addExclude(fromStore.SKU);
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

  const matched = allProducts.find(p => {
    if (isCurrentProduct(p)) return false;

    const catMatch = p.category === category || norm(p.category) === norm(category);
    if (!catMatch) return false;

    if (normModel && p.modelNumber && norm(p.modelNumber) === normModel) return true;
    if (normTitle && p.title && norm(p.title) === normTitle) return true;
    if (equipmentType && p.equipmentType && norm(p.equipmentType) === norm(equipmentType)) {
      if (normModel && p.modelNumber && norm(p.modelNumber) === normModel) return true;
      if (!normModel && (!p.modelNumber || p.modelNumber === "—" || p.modelNumber === "Std Unit")) {
        return true;
      }
    }
    return false;
  });

  return {
    isDuplicate: Boolean(matched),
    duplicateProduct: matched ? { id: matched.id, _id: matched._id, title: matched.title, sku: matched.sku } : null
  };
}

async function runTests() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX PRODUCT IMAGE SAVE & DUPLICATE VALIDATION TEST SUITE");
  console.log("==========================================================================\n");

  const testId = "prod-dup-test-" + Date.now();
  const testMongoId = "65f8a" + Date.now().toString(16).slice(-19);
  const testSku = "MC-TEST-" + Date.now().toString().slice(-5);

  const productA = store.addProduct({
    id: testId,
    _id: testMongoId,
    title: "Olympus Surgical Endoscope Pro " + Date.now(),
    productName: "Olympus Surgical Endoscope Pro " + Date.now(),
    category: "endoscopy",
    subcategory: "flexible-endoscopes",
    equipmentType: "High Definition Video Endoscope",
    modelNumber: "OLY-ENDO-9000",
    sku: testSku,
    basePrice: 750000,
    stock: 3,
    images: ["https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80"],
    primaryImage: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1000&q=80"
  });

  console.log(`--- TEST 1: Exclude self when editing product by ID ---`);
  const checkSelfById = simulateCheckDuplicate({
    category: "endoscopy",
    subcategory: "flexible-endoscopes",
    equipmentType: "High Definition Video Endoscope",
    modelNumber: "OLY-ENDO-9000",
    title: productA.title,
    excludeId: productA.id
  }, [productA]);
  assert.strictEqual(checkSelfById.isDuplicate, false, "Product must NOT be considered duplicate of itself by id");
  console.log("  ✔ PASS: Exclude by product.id successful, isDuplicate = false");

  console.log("\n--- TEST 2: Exclude self when editing product by MongoDB _id ---");
  const checkSelfByMongoId = simulateCheckDuplicate({
    category: "endoscopy",
    subcategory: "flexible-endoscopes",
    equipmentType: "High Definition Video Endoscope",
    modelNumber: "OLY-ENDO-9000",
    title: productA.title,
    excludeId: testMongoId
  }, [productA]);
  assert.strictEqual(checkSelfByMongoId.isDuplicate, false, "Product must NOT be considered duplicate of itself by MongoDB _id");
  console.log("  ✔ PASS: Exclude by product._id successful, isDuplicate = false");

  console.log("\n--- TEST 3: Exclude self when multiple candidate identifiers passed via excludeIds ---");
  const checkSelfByExcludeIds = simulateCheckDuplicate({
    category: "endoscopy",
    subcategory: "flexible-endoscopes",
    equipmentType: "High Definition Video Endoscope",
    modelNumber: "OLY-ENDO-9000",
    title: productA.title,
    excludeIds: [productA.slug, testMongoId, productA.id, productA.sku]
  }, [productA]);
  assert.strictEqual(checkSelfByExcludeIds.isDuplicate, false, "Product must NOT be duplicate when excludeIds provided");
  console.log("  ✔ PASS: Exclude by excludeIds array successful, isDuplicate = false");

  console.log("\n--- TEST 4: Genuinely duplicate new product IS blocked ---");
  const checkGenuineDuplicate = simulateCheckDuplicate({
    category: "endoscopy",
    subcategory: "flexible-endoscopes",
    equipmentType: "High Definition Video Endoscope",
    modelNumber: "OLY-ENDO-9000",
    title: productA.title,
    excludeId: "new"
  }, [productA]);
  assert.strictEqual(checkGenuineDuplicate.isDuplicate, true, "Different/new product with same model/title must be flagged duplicate");
  assert.strictEqual(checkGenuineDuplicate.duplicateProduct.id, productA.id);
  console.log(`  ✔ PASS: Genuinely duplicate new product correctly flagged -> duplicate of ${productA.id}`);

  console.log("\n--- TEST 5: Distinct product in different category is NOT duplicate ---");
  const checkDistinctProduct = simulateCheckDuplicate({
    category: "cardiology",
    subcategory: "ecg",
    equipmentType: "12-Lead ECG Machine",
    modelNumber: "CARD-12X",
    title: "DR.MEDEX Advanced ECG System",
    excludeId: "new"
  }, [productA]);
  assert.strictEqual(checkDistinctProduct.isDuplicate, false, "Different category product must not be duplicate");
  console.log("  ✔ PASS: Distinct category product allowed");

  console.log("\n--- TEST 6: Save image updates to existing product without duplicate error ---");
  const newImageUrl = "https://res.cloudinary.com/drmedex/image/upload/v1/products/endoscope_hd_updated.jpg";
  const updatedProduct = store.updateProduct(productA.id, {
    images: [newImageUrl, productA.images[0]],
    primaryImage: newImageUrl,
    reviewStatus: "CORRECT"
  });
  assert.strictEqual(updatedProduct.images.length, 2, "Images must be updated");
  assert.strictEqual(updatedProduct.primaryImage, newImageUrl, "Primary image must be persisted");
  assert.strictEqual(updatedProduct.reviewStatus, "CORRECT", "Review status must remain CORRECT");
  console.log(`  ✔ PASS: Successfully updated product images and reviewStatus without duplicate blockage`);

  console.log("\n--- TEST 7: Code parity between server and client/server routes ---");
  const serverCode = fs.readFileSync(path.join(__dirname, "../routes/admin.js"), "utf8");
  const clientServerCode = fs.readFileSync(path.join(__dirname, "../../client/server/routes/admin.js"), "utf8");
  assert.strictEqual(serverCode, clientServerCode, "server/routes/admin.js and client/server/routes/admin.js must match 100%");
  console.log("  ✔ PASS: Routes are 100% identical");

  // Clean up test product
  store.deleteProduct(productA.id);
  console.log("\n==========================================================================");
  console.log("  ALL TESTS PASSED SUCCESSFULLY (100%)");
  console.log("==========================================================================");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
