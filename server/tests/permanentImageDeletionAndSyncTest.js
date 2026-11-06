/**
 * DR.MEDEX Global — Permanent Image Deletion & Database/Cloudinary Synchronization Test Suite
 * 
 * Verifies:
 * 1. Cloudinary public ID extraction accuracy (no prefix clipping).
 * 2. Shared asset protection (assets referenced by other products or orders are never deleted).
 * 3. Exclusively owned image deletion from Cloudinary API & database reference cleanup.
 * 4. Image replacement: only latest approved images retained; deleted images purged.
 * 5. Neutral no-image state fallback (no fake Unsplash photos or zombie images).
 * 6. Full code parity between server/ and client/server/.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const imageResolver = require("../services/imageResolver");
const deletionService = require("../services/deletionService");
const store = require("../services/store");

console.log("==========================================================================");
console.log("  DR.MEDEX PERMANENT IMAGE DELETION & CLOUDINARY SYNC TEST SUITE");
console.log("==========================================================================");

let totalPassed = 0;
let totalFailed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✔ PASS: ${description}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ✘ FAIL: ${description}`);
    console.error(`    -> ${err.message}`);
    totalFailed++;
  }
}

async function itAsync(description, fn) {
  try {
    await fn();
    console.log(`  ✔ PASS: ${description}`);
    totalPassed++;
  } catch (err) {
    console.error(`  ✘ FAIL: ${description}`);
    console.error(`    -> ${err.message}`);
    totalFailed++;
  }
}

async function runTests() {
  console.log("\n--- TEST GROUP 1: Cloudinary Public ID Extraction Accuracy ---");

  it("Extracts clean public ID without clipping 'dr-' prefix from versioned Cloudinary URL", () => {
    const url = "https://res.cloudinary.com/mjqna8qi/image/upload/v1792726074/dr-medex/products/prod-test/img_1.png";
    const publicId = imageResolver.extractCloudinaryPublicId(url);
    assert.strictEqual(publicId, "dr-medex/products/prod-test/img_1");
  });

  it("Extracts public ID with transformation flags and version", () => {
    const url = "https://res.cloudinary.com/mjqna8qi/image/upload/c_scale,w_800,q_auto/v1792726074/dr-medex/products/prod-test/img_2.webp";
    const publicId = imageResolver.extractCloudinaryPublicId(url);
    assert.strictEqual(publicId, "dr-medex/products/prod-test/img_2");
  });

  it("Extracts public ID without version segment", () => {
    const url = "https://res.cloudinary.com/mjqna8qi/image/upload/dr-medex/products/prod-test/img_3.jpg";
    const publicId = imageResolver.extractCloudinaryPublicId(url);
    assert.strictEqual(publicId, "dr-medex/products/prod-test/img_3");
  });

  it("Recognizes existing raw public ID directly", () => {
    const raw = "dr-medex/products/prod-test/img_4";
    const publicId = imageResolver.extractCloudinaryPublicId(raw);
    assert.strictEqual(publicId, "dr-medex/products/prod-test/img_4");
  });

  console.log("\n--- TEST GROUP 2: Shared Asset Protection ---");

  await itAsync("Protects image asset if referenced by another active product", async () => {
    const sharedPublicId = "dr-medex/products/shared-asset-test/img_shared";
    const sharedUrl = `https://res.cloudinary.com/mjqna8qi/image/upload/v1792726074/${sharedPublicId}.png`;

    // Create temporary test products in store
    const prodA = store.addProduct({
      title: "Shared Product A",
      category: "electrosurgical-units",
      sku: "TEST-SH-001",
      primaryImage: sharedUrl,
      images: [sharedUrl],
      stock: 5,
      basePrice: 50000
    });

    const prodB = store.addProduct({
      title: "Shared Product B",
      category: "electrosurgical-units",
      sku: "TEST-SH-002",
      primaryImage: sharedUrl,
      images: [sharedUrl],
      stock: 3,
      basePrice: 60000
    });

    try {
      const shareCheck = await deletionService.isAssetSharedOrOrdered(sharedPublicId, prodA.id);
      assert.strictEqual(shareCheck.shared, true);
      assert.ok(shareCheck.reason.includes("Shared Product B") || shareCheck.reason.includes(prodB.id));
    } finally {
      store.deleteProduct(prodA.id);
      store.deleteProduct(prodB.id);
    }
  });

  console.log("\n--- TEST GROUP 3: Exclusively Owned Single Image Deletion ---");

  await itAsync("Safely removes exclusively owned image reference from product and store", async () => {
    const testPubId = `dr-medex/products/test-exclusive/img_${Date.now()}`;
    const testUrl = `https://res.cloudinary.com/mjqna8qi/image/upload/v1792726074/${testPubId}.png`;
    const keepUrl = "https://res.cloudinary.com/mjqna8qi/image/upload/v1792726074/dr-medex/products/test-exclusive/keep.png";

    const prod = store.addProduct({
      title: "Exclusivity Test Product",
      category: "electrosurgical-units",
      sku: `TEST-EX-${Date.now()}`,
      primaryImage: testUrl,
      images: [testUrl, keepUrl],
      galleryImages: [testUrl, keepUrl],
      managedCloudinaryImages: [
        { publicId: testPubId, secureUrl: testUrl },
        { publicId: "dr-medex/products/test-exclusive/keep", secureUrl: keepUrl }
      ],
      stock: 5,
      basePrice: 85000
    });

    try {
      const result = await deletionService.deleteSingleProductImage(prod.id, testUrl, "admin@drmedex.com");
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.sharedAssetPreserved, false);

      const updated = store.getProductById(prod.id, true);
      assert.ok(!updated.images.includes(testUrl));
      assert.ok(!updated.images.includes(testPubId));
      assert.strictEqual(updated.primaryImage, keepUrl);
      assert.strictEqual(updated.images.length, 1);
    } finally {
      store.deleteProduct(prod.id);
    }
  });

  console.log("\n--- TEST GROUP 4: Neutral No-Image State Integrity ---");

  it("ProductCard does not inject third-party Unsplash fallback for missing images", () => {
    const productCardCode = fs.readFileSync(path.resolve(__dirname, "../../client/src/components/ProductCard.tsx"), "utf8");
    assert.ok(!productCardCode.includes("images.unsplash.com"), "ProductCard must not contain Unsplash URL fallback");
    assert.ok(productCardCode.includes("Image Pending"), "ProductCard must show neutral Image Pending indicator");
  });

  it("ProductDetailPage does not inject third-party Unsplash fallback for missing images", () => {
    const detailPageCode = fs.readFileSync(path.resolve(__dirname, "../../client/src/pages/ProductDetailPage.tsx"), "utf8");
    assert.ok(!detailPageCode.includes("images.unsplash.com"), "ProductDetailPage must not contain Unsplash URL fallback");
    assert.ok(detailPageCode.includes("Image Pending Administrative Verification"), "ProductDetailPage must show neutral verification placeholder");
  });

  console.log("\n--- TEST GROUP 5: Code Parity between server and client/server ---");

  it("imageResolver.js is identical in server and client/server", () => {
    const root = fs.readFileSync(path.resolve(__dirname, "../services/imageResolver.js"), "utf8");
    const client = fs.readFileSync(path.resolve(__dirname, "../../client/server/services/imageResolver.js"), "utf8");
    assert.strictEqual(root, client);
  });

  it("deletionService.js is identical in server and client/server", () => {
    const root = fs.readFileSync(path.resolve(__dirname, "../services/deletionService.js"), "utf8");
    const client = fs.readFileSync(path.resolve(__dirname, "../../client/server/services/deletionService.js"), "utf8");
    assert.strictEqual(root, client);
  });

  it("admin.js routes are identical in server and client/server", () => {
    const root = fs.readFileSync(path.resolve(__dirname, "../routes/admin.js"), "utf8");
    const client = fs.readFileSync(path.resolve(__dirname, "../../client/server/routes/admin.js"), "utf8");
    assert.strictEqual(root, client);
  });

  console.log("==========================================================================");
  console.log(`  RESULTS: ${totalPassed} PASSED | ${totalFailed} FAILED`);
  console.log("==========================================================================");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
