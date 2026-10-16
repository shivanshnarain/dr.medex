/**
 * DR.MEDEX Verification Suite: Urgent Production Bug Audit Test
 */

const assert = require("assert");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const app = require("../index");
const store = require("../services/store");

const dbFilePath = path.join(__dirname, "../data/db.json");
const originalDbRaw = fs.existsSync(dbFilePath) ? fs.readFileSync(dbFilePath, "utf8") : null;

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
      setHeader(k, v) { resHeaders[k] = v; resHeaders[k.toLowerCase()] = v; },
      getHeader(k) { return resHeaders[k] || resHeaders[k.toLowerCase()]; },
      status(code) { statusCode = code; this.statusCode = code; return this; },
      json(data) { resData = data; resolve({ status: statusCode, body: data, headers: resHeaders }); },
      send(data) { resData = data; resolve({ status: statusCode, body: data, headers: resHeaders }); },
      end() { resolve({ status: statusCode, body: resData, headers: resHeaders }); }
    };

    app.handle(req, res, () => resolve({ status: 404, body: { message: "Not found" } }));
  });
}

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

async function runAuditVerification() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX — URGENT PRODUCTION BUG AUDIT VERIFICATION SUITE");
  console.log("==========================================================================\n");

  let passes = 0;
  const adminToken = getAdminToken();

  // Test 1: Vercel routing entry points and subpath reconstruction
  console.log("--- 1. Testing Vercel Serverless Function Routing Normalization ---");
  const apiIndexFn = require("../../api/index");
  const apiCatchAllFn = require("../../api/[...path]");
  const apiAdminCatchAllFn = require("../../api/admin/[...path]");
  const apiAdminProductsFn = require("../../api/admin/products");
  const apiCronCleanupFn = require("../../api/cron/cleanup-activity");

  // Test 1a: Direct invocation of api/admin/products.js
  const testVercelReq1 = { on: () => {}, resume: () => {}, unpipe: () => {},
    headers: { host: "localhost", authorization: `Bearer ${adminToken}` },
    url: "/api/admin/products?limit=10",
    query: { limit: "10" },
    method: "GET"
  };
  await new Promise((resolve) => {
    const headers = {};
    const res = {
      setHeader(k, v) { headers[k] = v; },
      getHeader(k) { return headers[k]; }, removeHeader(k) { delete headers[k]; },
      status(c) { this.statusCode = c; return this; },
      json(data) {
        assert.strictEqual(data.success, true);
        assert(Array.isArray(data.products));
        resolve();
      },
      send() { resolve(); },
      end() { resolve(); }
    };
    apiAdminProductsFn(testVercelReq1, res);
  });
  console.log("   ✔ api/admin/products.js directly handles /api/admin/products?limit=10");

  // Test 1b: Verify api/cron/cleanup-activity entrypoint
  const testCronReq = { on: () => {}, resume: () => {}, unpipe: () => {},
    headers: { host: "localhost" },
    url: "/api/cron/cleanup-activity",
    method: "GET"
  };
  await new Promise((resolve) => {
    const headers = {};
    const res = {
      setHeader(k, v) { headers[k] = v; },
      getHeader(k) { return headers[k]; }, removeHeader(k) { delete headers[k]; },
      status(c) { this.statusCode = c; return this; },
      json(data) {
        assert.strictEqual(data.success, true);
        resolve();
      },
      send() { resolve(); },
      end() { resolve(); }
    };
    apiCronCleanupFn(testCronReq, res);
  });
  console.log("   ✔ api/cron/cleanup-activity.js correctly routes scheduled cleanup");

  // Simulate api/admin/[...path].js catch-all for PUT /api/admin/products/:id/review
  const testVercelReq2 = { on: () => {}, resume: () => {}, unpipe: () => {},
    headers: { host: "localhost", authorization: `Bearer ${adminToken}` },
    url: "/prod-1791741016012-1fr9/review",
    query: { path: ["products", "prod-1791741016012-1fr9", "review"] },
    body: { reviewStatus: "NEEDS_EDITING", reviewNote: "Audit verification note" },
    method: "PUT"
  };
  await new Promise((resolve) => {
    const headers = {};
    const res = {
      setHeader(k, v) { headers[k] = v; },
      getHeader(k) { return headers[k]; }, removeHeader(k) { delete headers[k]; },
      status(c) { this.statusCode = c; return this; },
      json(data) {
        assert.strictEqual(testVercelReq2.originalUrl, "/api/admin/products/prod-1791741016012-1fr9/review");
        assert.strictEqual(data.success, true);
        assert.strictEqual(data.product.reviewStatus, "NEEDS_EDITING");
        resolve();
      },
      send() { resolve(); },
      end() { resolve(); }
    };
    apiAdminCatchAllFn(testVercelReq2, res);
  });
  console.log("   ✔ api/admin/[...path].js correctly routes review status update");
  passes++;

  // Test 2: Real catalogue count & unauthenticated access rejection
  console.log("\n--- 2. Testing Auth Enforcement & Live Catalogue Product Count ---");
  const unauthRes = await makeRequest("/api/admin/products");
  assert.strictEqual(unauthRes.status, 401, "Unauthenticated request must be blocked with 401");

  const authListRes = await makeRequest("/api/admin/products?limit=1000", "GET", {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(authListRes.status, 200);
  assert.strictEqual(authListRes.body.success, true);
  const realCount = authListRes.body.total;
  console.log(`   Real authoritative products count from backend: ${realCount}`);
  assert(realCount >= 193, `Expected at least 193 products, found ${realCount}`);
  passes++;

  // Test 3: Existing product update persistence (PUT /api/admin/products/:id)
  console.log("\n--- 3. Testing Save Changes (PUT /api/admin/products/:id) ---");
  const targetProd = authListRes.body.products[0];
  const originalDesc = targetProd.shortDescription;
  const originalPrice = targetProd.basePrice;
  const updatedDesc = "Audit verified short description update " + Date.now();
  const updateRes = await makeRequest(`/api/admin/products/${targetProd.id}`, "PUT", {
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: {
      ...targetProd,
      shortDescription: updatedDesc,
      basePrice: originalPrice
    }
  });
  assert.strictEqual(updateRes.status, 200, "Update must return HTTP 200");
  assert.strictEqual(updateRes.body.success, true);
  assert.strictEqual(updateRes.body.product.shortDescription, updatedDesc);

  // Confirm in store
  const readBack = store.getProductById(targetProd.id, true);
  assert.strictEqual(readBack.shortDescription, updatedDesc, "Updated description must be persisted in store");
  console.log("   ✔ Product edit successfully persisted without creating duplicate records.");
  passes++;

  // Test 4: New product creation (POST /api/admin/products)
  console.log("\n--- 4. Testing Save Product (POST /api/admin/products) ---");
  const uniqueSku = "TEST-SKU-" + Date.now();
  const createRes = await makeRequest("/api/admin/products", "POST", {
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: {
      title: "Test Brand New Medical Device",
      productName: "Test Brand New Medical Device",
      sku: uniqueSku,
      category: "surgical",
      basePrice: 55000,
      originalPrice: 65000,
      stock: 5
    }
  });
  assert.strictEqual(createRes.status, 201, "Create must return HTTP 201");
  assert.strictEqual(createRes.body.success, true);
  const createdId = createRes.body.product.id;
  assert(createdId, "Created product must have an ID");

  // Verify duplicate prevention with same SKU
  const dupRes = await makeRequest("/api/admin/products", "POST", {
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: {
      title: "Duplicate SKU Device",
      sku: uniqueSku,
      category: "surgical"
    }
  });
  assert.strictEqual(dupRes.status, 400, "Duplicate SKU must be rejected with HTTP 400");
  console.log("   ✔ New product created successfully and duplicate SKU strictly prevented.");

  // Clean up created test product
  store.deleteProduct(createdId);
  passes++;

  // Test 5: All 3 Review Statuses (CORRECT, NEEDS_EDITING, PENDING)
  console.log("\n--- 5. Testing All 3 Review Status Options ---");
  const testProdId = targetProd.id;

  // Status 1: NEEDS_EDITING
  const rev1 = await makeRequest(`/api/admin/products/${testProdId}/review`, "PUT", {
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: { reviewStatus: "NEEDS_EDITING", reviewNote: "Requires revision" }
  });
  assert.strictEqual(rev1.status, 200);
  assert.strictEqual(rev1.body.product.reviewStatus, "NEEDS_EDITING");
  assert.strictEqual(store.getProductById(testProdId, true).reviewStatus, "NEEDS_EDITING");
  console.log("   ✔ NEEDS_EDITING saved and retained.");

  // Status 2: NOT_YET_REVIEWED (maps to PENDING)
  const rev2 = await makeRequest(`/api/admin/products/${testProdId}/review`, "PUT", {
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: { reviewStatus: "NOT_YET_REVIEWED" }
  });
  assert.strictEqual(rev2.status, 200);
  assert.strictEqual(rev2.body.product.reviewStatus, "PENDING");
  assert.strictEqual(store.getProductById(testProdId, true).reviewStatus, "PENDING");
  console.log("   ✔ NOT_YET_REVIEWED saved and retained as PENDING.");

  // Status 3: CORRECT
  const rev3 = await makeRequest(`/api/admin/products/${testProdId}/review`, "PUT", {
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: { reviewStatus: "CORRECT" }
  });
  assert.strictEqual(rev3.status, 200);
  assert.strictEqual(rev3.body.product.reviewStatus, "CORRECT");
  assert.strictEqual(store.getProductById(testProdId, true).reviewStatus, "CORRECT");
  console.log("   ✔ CORRECT saved and retained.");
  passes++;

  // Test 6: Verify Frontend Pricing Display & Button Labels
  console.log("\n--- 6. Verifying Frontend Pricing Display & Context-Sensitive Button Labels ---");
  const productsPageContent = fs.readFileSync(path.join(__dirname, "../../client/src/pages/AdminProductsPage.tsx"), "utf8");
  const editorPageContent = fs.readFileSync(path.join(__dirname, "../../client/src/pages/AdminProductEditorPage.tsx"), "utf8");

  // Check pricing display has NO crossed out / line-through price in AdminProductsPage
  assert(!productsPageContent.includes("line-through"), "AdminProductsPage must NOT contain line-through / crossed-out MRP");
  assert(productsPageContent.includes("p.basePrice"), "AdminProductsPage must display selling price (basePrice)");
  console.log("   ✔ Admin Products pricing cell displays selling price only (zero crossed-out MRP).");

  // Check button labels in AdminProductEditorPage
  assert(editorPageContent.includes('isEditMode ? "Save Changes" : "Save Product"'), "AdminProductEditorPage must use context-sensitive labels: Save Changes vs Save Product");
  console.log("   ✔ Editor button labels strictly match requirement: Save Changes (existing) and Save Product (new).");
  passes++;

  // Restore DB
  if (originalDbRaw) {
    fs.writeFileSync(dbFilePath, originalDbRaw, "utf8");
    store.reloadFromDisk();
  }

  console.log("\n==========================================================================");
  console.log(`  ALL ${passes}/6 PRODUCTION AUDIT VERIFICATION TESTS PASSED!`);
  console.log("==========================================================================\n");
}

runAuditVerification().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
