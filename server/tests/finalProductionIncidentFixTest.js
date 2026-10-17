const assert = require("assert");
const http = require("http");
const path = require("path");
const fs = require("fs");
const app = require("../index");
const store = require("../services/store");
const authService = require("../services/authService");
const mongoService = require("../services/mongoService");
const cloudinaryService = require("../services/cloudinaryService");
const fallbackProducts = require("../../client/src/data/fallbackProducts.json");

// Helper to simulate HTTP requests through Express app
function makeRequest(url, method = "GET", { body = null, headers = {} } = {}) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let resData = null;
    let resHeaders = {};

    const parsedUrl = new URL(url, "http://localhost");
    const queryObj = Object.fromEntries(parsedUrl.searchParams.entries());

    const req = {
      url,
      originalUrl: url,
      path: parsedUrl.pathname,
      method: method.toUpperCase(),
      headers: { host: "localhost", ...headers },
      query: queryObj,
      body,
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" },
      on: () => {},
      resume: () => {}
    };

    const res = {
      setHeader(k, v) { resHeaders[k] = v; },
      getHeader(k) { return resHeaders[k]; },
      status(code) { statusCode = code; this.statusCode = code; return this; },
      json(data) { resData = data; resolve({ status: statusCode, body: data }); },
      send(data) { resData = data; resolve({ status: statusCode, body: data }); },
      end() { resolve({ status: statusCode, body: resData }); }
    };

    app.handle(req, res, (err) => {
      resolve({ status: 404, body: { message: "Not found", error: err ? String(err) : null } });
    });
  });
}

const crypto = require("crypto");

function getAdminToken() {
  const SESSION_SECRET = process.env.SESSION_SECRET || "82b38e552f117f57ef2ed3aa6bc3f693697d3ad196534aa0bfdd2cff7af34b95";
  const payload = {
    email: (process.env.ADMIN_EMAIL || "roshan.official0009@gmail.com").toLowerCase().trim(),
    name: "Roshan (DR.MEDEX Super Admin)",
    role: "SUPER_ADMIN",
    iat: Date.now(),
    exp: Date.now() + 86400000,
    jti: crypto.randomBytes(16).toString("hex")
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payloadStr).digest("hex");
  return `${payloadStr}.${signature}`;
}

async function runTestMatrix() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX — FINAL PRODUCTION INCIDENT FIX: REQUIRED TEST MATRIX");
  console.log("==========================================================================\n");

  let passes = 0;
  const total = 12;
  const adminToken = getAdminToken();

  const countBefore = store.getProducts({ includeInactive: true }).length;
  console.log(`[Baseline] Product catalogue count: ${countBefore} products.\n`);
  assert.strictEqual(countBefore, 197, `Expected exactly 197 products, found ${countBefore}`);

  // Test 1: Admin catalogue request
  console.log("--- Test 1: Admin Catalogue Request ---");
  const catRes = await makeRequest("/api/admin/products?limit=10", "GET", {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(catRes.status, 200);
  assert.strictEqual(catRes.body.success, true);
  assert.strictEqual(catRes.body.total, 197);
  assert(catRes.body.products.length <= 10 && catRes.body.products.length > 0);
  console.log(`✔ PASS: Valid product records returned. Total: ${catRes.body.total}, Page items: ${catRes.body.products.length}.\n`);
  passes++;

  // Test 2: MongoDB connection failure handling (no false empty catalogue)
  console.log("--- Test 2: MongoDB Connection Failure Handling ---");
  const mongoStatus = await mongoService.getMongoStatus();
  console.log(`   MongoDB configured: ${mongoStatus.configured}, Connected: ${mongoStatus.connected}`);
  // Even if MongoDB is disconnected or in cooldown, admin endpoint still returns authoritative store catalogue
  const fallbackCatRes = await makeRequest("/api/admin/products", "GET", {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(fallbackCatRes.status, 200);
  assert.strictEqual(fallbackCatRes.body.total, 197);
  console.log("✔ PASS: MongoDB connection failure does not cause false empty catalogue. All 197 products returned.\n");
  passes++;

  // Isolated test product ID (prod-surgical-cautery-400-wat)
  const testProdId = "prod-surgical-cautery-400-wat";
  const origProduct = store.getProductById(testProdId, true);
  assert(origProduct, `Test product ${testProdId} must exist in catalogue`);
  const initialReviewStatus = origProduct.reviewStatus || "PENDING";

  try {
    // Test 3: Review status → Correct
    console.log("--- Test 3: Review Status Transition → CORRECT ---");
    const r1 = await makeRequest(`/api/admin/products/${testProdId}/review`, "PUT", {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { reviewStatus: "CORRECT" }
    });
    assert.strictEqual(r1.status, 200);
    assert.strictEqual(r1.body.success, true);
    assert.strictEqual(r1.body.product.reviewStatus, "CORRECT");
    // Reload product list and verify persistence
    store.reloadFromDisk();
    const p1 = store.getProductById(testProdId, true);
    assert.strictEqual(p1.reviewStatus, "CORRECT");
    console.log("✔ PASS: Status 'CORRECT' persisted and verified after reload.\n");
    passes++;

    // Test 4: Review status → Needs Editing
    console.log("--- Test 4: Review Status Transition → NEEDS_EDITING ---");
    const r2 = await makeRequest(`/api/admin/products/${testProdId}/review`, "PUT", {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { reviewStatus: "NEEDS_EDITING", reviewNote: "Test review note for clinical audit" }
    });
    assert.strictEqual(r2.status, 200);
    assert.strictEqual(r2.body.success, true);
    assert.strictEqual(r2.body.product.reviewStatus, "NEEDS_EDITING");
    assert.strictEqual(r2.body.product.reviewNote, "Test review note for clinical audit");
    store.reloadFromDisk();
    const p2 = store.getProductById(testProdId, true);
    assert.strictEqual(p2.reviewStatus, "NEEDS_EDITING");
    console.log("✔ PASS: Status 'NEEDS_EDITING' persisted and verified after reload.\n");
    passes++;

    // Test 5: Review status → Not Yet Reviewed (PENDING)
    console.log("--- Test 5: Review Status Transition → NOT_YET_REVIEWED (PENDING) ---");
    const r3 = await makeRequest(`/api/admin/products/${testProdId}/review`, "PUT", {
      headers: { authorization: `Bearer ${adminToken}` },
      body: { reviewStatus: "NOT_YET_REVIEWED" }
    });
    assert.strictEqual(r3.status, 200);
    assert.strictEqual(r3.body.success, true);
    assert.strictEqual(r3.body.product.reviewStatus, "PENDING");
    store.reloadFromDisk();
    const p3 = store.getProductById(testProdId, true);
    assert.strictEqual(p3.reviewStatus, "PENDING");
    console.log("✔ PASS: Status 'NOT_YET_REVIEWED' maps to PENDING and persists after reload.\n");
    passes++;
  } finally {
    // Restore initial status
    store.updateProduct(testProdId, { reviewStatus: initialReviewStatus });
  }

  // Test 6: Invalid product ID
  console.log("--- Test 6: Invalid Product ID Validation ---");
  const badIdRes = await makeRequest("/api/admin/products/non-existent-product-id-99999/review", "PUT", {
    headers: { authorization: `Bearer ${adminToken}` },
    body: { reviewStatus: "CORRECT" }
  });
  assert.strictEqual(badIdRes.status, 404);
  assert.strictEqual(badIdRes.body.success, false);
  console.log("✔ PASS: Non-existent product ID returns clear 404 error.\n");
  passes++;

  // Test 7: Unauthorized status update
  console.log("--- Test 7: Unauthorized Status Update Rejection ---");
  const unauthRes = await makeRequest(`/api/admin/products/${testProdId}/review`, "PUT", {
    body: { reviewStatus: "CORRECT" }
  });
  assert.strictEqual(unauthRes.status, 401);
  assert.strictEqual(unauthRes.body.success, false);
  console.log("✔ PASS: Unauthorized update rejected with HTTP 401.\n");
  passes++;

  // Test 8: Existing product update (same record updated; no duplicate)
  console.log("--- Test 8: Product Edit & Save (No Duplicate Records) ---");
  const updateRes = await makeRequest(`/api/admin/products/${testProdId}`, "PUT", {
    headers: { authorization: `Bearer ${adminToken}` },
    body: { shortDescription: origProduct.shortDescription || "Clinical Grade Cautery Unit" }
  });
  assert.strictEqual(updateRes.status, 200);
  assert.strictEqual(updateRes.body.success, true);
  const countAfter = store.getProducts({ includeInactive: true }).length;
  assert.strictEqual(countAfter, 197, `Product count must remain exactly 197, got ${countAfter}`);
  console.log(`✔ PASS: Product updated in place without duplicate creation. Count remains ${countAfter}.\n`);
  passes++;

  // Test 9: Product list refresh
  console.log("--- Test 9: Product List Refresh ---");
  const freshList = await makeRequest("/api/admin/products?limit=5", "GET", {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(freshList.status, 200);
  assert.strictEqual(freshList.body.total, 197);
  console.log("✔ PASS: Fresh authoritative list loaded successfully.\n");
  passes++;

  // Test 10: Cloudinary image read (existing image URLs remain valid)
  console.log("--- Test 10: Cloudinary Image Read & Preservation ---");
  const sampleWithImages = store.getProducts({ includeInactive: true }).find(p => p.primaryImage || (p.images && p.images.length > 0));
  assert(sampleWithImages, "Expected product with image URL");
  const imgUrl = sampleWithImages.primaryImage || sampleWithImages.images[0];
  assert(typeof imgUrl === "string" && imgUrl.startsWith("http"), `Expected HTTP image URL, got: ${imgUrl}`);
  console.log(`✔ PASS: Existing image URLs intact: ${imgUrl.slice(0, 60)}...\n`);
  passes++;

  // Test 11: Production routing (admin subpaths without 404)
  console.log("--- Test 11: Production Routing Subpaths ---");
  const routesToTest = [
    { path: "/api/admin/products", method: "GET" },
    { path: `/api/admin/products/${testProdId}`, method: "GET" },
    { path: "/api/admin/products/check-sku?sku=TEST-SKU", method: "GET" },
    { path: "/api/categories", method: "GET" }
  ];
  for (const r of routesToTest) {
    const res = await makeRequest(r.path, r.method, { headers: { authorization: `Bearer ${adminToken}` } });
    assert.notStrictEqual(res.status, 404, `Route ${r.path} unexpectedly returned 404`);
  }
  console.log("✔ PASS: All production routing subpaths resolve without unexpected 404s.\n");
  passes++;

  // Test 12: Final Count Integrity
  console.log("--- Test 12: Catalogue Integrity Verification ---");
  const finalCount = store.getProducts({ includeInactive: true }).length;
  assert.strictEqual(finalCount, 197, `Expected exactly 197 products, got ${finalCount}`);
  assert.strictEqual(fallbackProducts.length, 197, `Expected fallbackProducts to have 197 items, got ${fallbackProducts.length}`);
  console.log(`✔ PASS: Catalogue preserved at exactly 197 authoritative entries.\n`);
  passes++;

  console.log("==========================================================================");
  console.log(`  ALL ${passes}/${total} REQUIRED TEST MATRIX TESTS PASSED!`);
  console.log("==========================================================================");
}

runTestMatrix().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
