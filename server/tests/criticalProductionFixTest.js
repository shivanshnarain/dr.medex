const assert = require("assert");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const store = require("../services/store");
const authService = require("../services/authService");
const mongoService = require("../services/mongoService");
const cloudinaryService = require("../services/cloudinaryService");
const app = require("../index");

// Helper to simulate requests directly through Express app without loopback socket
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
      json(data) { resData = data; resolve({ status: statusCode, body: data, headers: resHeaders }); },
      send(data) { resData = data; resolve({ status: statusCode, body: data, headers: resHeaders }); },
      end(data) { if (data) resData = data; resolve({ status: statusCode, body: resData, headers: resHeaders }); }
    };

    app.handle(req, res, (err) => {
      resolve({ status: 404, body: { message: "Not found", error: err ? String(err) : null }, headers: resHeaders });
    });
  });
}

async function runTests() {
  console.log("\n==========================================================================");
  console.log("  DR.MEDEX — CRITICAL PRODUCTION FIX: MONGODB & RETIREMENT TEST SUITE");
  console.log("==========================================================================\n");

  const baselineCount = store.getProducts({ includeInactive: true }).length;
  console.log(`[Baseline] Total authoritative catalogue products: ${baselineCount}`);

  // Obtain verified admin token
  const adminEmail = (process.env.ADMIN_EMAIL || "roshan.official0009@gmail.com").toLowerCase().trim();
  const testAdminPassword = "SecureTestPassword2026!";
  const testSalt = crypto.randomBytes(32).toString("hex");
  const testHash = authService.hashPassword(testAdminPassword, testSalt);

  const originalSalt = process.env.ADMIN_PASSWORD_SALT;
  const originalHash = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_SALT = testSalt;
  process.env.ADMIN_PASSWORD_HASH = testHash;

  let adminToken;
  try {
    const adminLoginRes = await makeRequest("/api/auth/login", "POST", {
      body: { email: adminEmail, password: testAdminPassword }
    });
    assert.strictEqual(adminLoginRes.status, 200, "Admin login must succeed");
    adminToken = adminLoginRes.body.token;
    assert.ok(adminToken, "Admin token must be present");
  } finally {
    process.env.ADMIN_PASSWORD_SALT = originalSalt;
    process.env.ADMIN_PASSWORD_HASH = originalHash;
  }

  // --- PART A: MongoDB Sync & Retry ---
  console.log("\n--- Part A: Test 1: Product List Retrieval & mongoSyncStatus Integrity ---");
  const listRes = await makeRequest("/api/admin/products?limit=20", "GET", {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(listRes.status, 200, "Must return HTTP 200");
  assert.strictEqual(listRes.body.success, true);
  assert.ok(Array.isArray(listRes.body.products), "Products must be an array");

  const cautery = listRes.body.products.find(p => p.id === "prod-surgical-cautery-400-wat");
  assert.ok(cautery, "prod-surgical-cautery-400-wat must exist in admin list");
  assert.strictEqual(cautery.mongoSyncStatus, "SYNCED", "prod-surgical-cautery-400-wat must be SYNCED, not SYNC_FAILED");
  console.log("✔ PASS: Active product list returns SYNCED status; no persistent SYNC_FAILED on refresh.");

  console.log("\n--- Part A: Test 2: Retry Sync Endpoint Execution ---");
  const origUpsert = mongoService.upsertProduct;
  mongoService.upsertProduct = async (prod, email) => ({
    success: true,
    status: "SYNCED",
    id: prod.id,
    upserted: false,
    modified: true,
    matched: true
  });

  const retryRes = await makeRequest("/api/admin/products/prod-surgical-cautery-400-wat/sync-mongodb", "POST", {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(retryRes.status, 200, "Retry sync must return HTTP 200");
  assert.strictEqual(retryRes.body.success, true);
  assert.strictEqual(retryRes.body.product.mongoSyncStatus, "SYNCED");
  mongoService.upsertProduct = origUpsert;
  console.log("✔ PASS: Manual/Retry sync updates record and returns SYNCED status.");

  // --- PART B: Safe Catalogue Retirement & Customer Order Protection ---
  console.log("\n--- Part B: Test 3: Product Deletion with Order References (Safe Retirement) ---");
  const retiredTestId = `test-ret-prod-${Date.now()}`;
  const testProduct = {
    id: retiredTestId,
    title: "TEST SURGICAL CO2 LASER SYSTEM",
    slug: `test-surgical-co2-laser-system-${Date.now()}`,
    sku: `TEST-LAS-${Date.now()}`,
    category: "ot-lights",
    basePrice: 85000,
    status: "ACTIVE",
    primaryImage: "https://res.cloudinary.com/mjqna8qi/image/upload/v1791729326/dr-medex/reviewed-products/test/img_1.jpg",
    images: ["https://res.cloudinary.com/mjqna8qi/image/upload/v1791729326/dr-medex/reviewed-products/test/img_1.jpg"],
    createdAt: new Date().toISOString()
  };
  store.addProduct(testProduct);

  const testOrder = {
    id: `ORD-TEST-RET-${Date.now()}`,
    orderNumber: `ORD-TEST-RET-${Date.now()}`,
    customerName: "Dr. Evelyn Reed",
    shippingAddress: {
      fullName: "Dr. Evelyn Reed",
      addressLine1: "100 Medical Plaza",
      city: "Chicago",
      state: "IL",
      postalCode: "60611",
      country: "United States"
    },
    shippingMethod: {
      carrier: "DHL Express",
      trackingNumber: "DHL-999-1234",
      estimatedDays: "3-5 Days",
      trackingUrl: "https://www.dhl.com"
    },
    trackingTimeline: [
      { stage: "ORDER_PLACED", title: "Order Placed", timestamp: new Date().toISOString(), completed: true, details: "Verified" }
    ],
    items: [
      {
        productId: retiredTestId,
        title: testProduct.title,
        sku: testProduct.sku,
        quantity: 1,
        basePriceUSD: 85000,
        convertedUnitPrice: 85000,
        currency: "USD",
        image: testProduct.primaryImage
      }
    ],
    status: "PAID",
    createdAt: new Date().toISOString()
  };
  store.getOrders().push(testOrder);

  try {
    // Attempt deletion — must be blocked with HTTP 409 Conflict
    const deleteRes = await makeRequest(`/api/admin/products/${retiredTestId}`, "DELETE", {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(deleteRes.status, 409, "Must return HTTP 409 Conflict when product is referenced in orders");
    assert.strictEqual(deleteRes.body.success, false);
    assert.strictEqual(deleteRes.body.error, "PRODUCT_HAS_ORDER_REFERENCES");
    assert.strictEqual(deleteRes.body.canArchive, true);
    assert.ok(deleteRes.body.message.includes("is referenced in"));

    // Verify product was not silently archived or deleted
    const preArchive = store.getProductById(retiredTestId, true);
    assert.strictEqual(preArchive.status, "ACTIVE");

    // Execute explicit archive request
    const archiveRes = await makeRequest(`/api/admin/products/${retiredTestId}/archive`, "POST", {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(archiveRes.status, 200, "Archive must return HTTP 200");
    assert.strictEqual(archiveRes.body.success, true);
    assert.strictEqual(archiveRes.body.archived, true);

    // Check store record
    const recordInStore = store.getProductById(retiredTestId, true);
    assert.ok(recordInStore, "Product must remain stored for order history");
    assert.strictEqual(recordInStore.status, "ARCHIVED");
    assert.strictEqual(recordInStore.isRetired, true);

    // Verify excluded from public storefront product queries
    const publicLookup = store.getProductById(retiredTestId, false);
    assert.strictEqual(publicLookup, null, "Retired product must be excluded from public storefront");

    // Verify customer order is 100% intact
    const orderLookup = await makeRequest(`/api/orders/${testOrder.id}`, "GET");
    assert.strictEqual(orderLookup.status, 200);
    assert.strictEqual(orderLookup.body.success, true);
    assert.strictEqual(orderLookup.body.order.items[0].productId, retiredTestId);
    assert.strictEqual(orderLookup.body.order.items[0].isRetired, true);
    assert.strictEqual(orderLookup.body.order.items[0].availability, "UNAVAILABLE_RETIRED");

    // Verify tracking page view
    const trackLookup = await makeRequest(`/api/track/${testOrder.id}`, "GET");
    assert.strictEqual(trackLookup.status, 200);
    assert.strictEqual(trackLookup.body.items[0].title, testProduct.title);
    assert.strictEqual(trackLookup.body.items[0].isRetired, true);

    console.log("✔ PASS: Product safely retired from catalogue; customer orders, tracking & history 100% intact.");
  } finally {
    // Cleanup temporary order and test product
    const oIdx = store.getOrders().findIndex(o => o.id === testOrder.id);
    if (oIdx !== -1) store.getOrders().splice(oIdx, 1);
    store.deleteProduct(retiredTestId);
  }

  // --- PART B: Test 4: Physical Deletion for Products Without Orders ---
  console.log("\n--- Part B: Test 4: Permanent Deletion for Unreferenced Product ---");
  const unreferencedTestId = `test-unref-${Date.now()}`;
  const unreferencedProduct = {
    id: unreferencedTestId,
    title: "TEST DISPOSABLE FORCEPS",
    slug: `test-disposable-forceps-${Date.now()}`,
    sku: `TEST-FOR-${Date.now()}`,
    category: "surgical-instruments",
    basePrice: 120,
    status: "ACTIVE",
    createdAt: new Date().toISOString()
  };
  store.addProduct(unreferencedProduct);

  const origRemove = mongoService.removeApprovedProduct;
  mongoService.removeApprovedProduct = async (id) => ({
    success: true,
    status: "REMOVED",
    id,
    deletedCount: 1
  });

  try {
    const unrefDelete = await makeRequest(`/api/admin/products/${unreferencedTestId}`, "DELETE", {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(unrefDelete.status, 200);
    assert.strictEqual(unrefDelete.body.success, true);
    assert.strictEqual(unrefDelete.body.deleted, true);
    assert.strictEqual(unrefDelete.body.retired, false);

    const checkStore = store.getProductById(unreferencedTestId, true);
    assert.strictEqual(checkStore, null, "Unreferenced product must be permanently removed");
    console.log("✔ PASS: Unreferenced product permanently deleted from database and store.");
  } finally {
    mongoService.removeApprovedProduct = origRemove;
    store.deleteProduct(unreferencedTestId);
  }

  // --- Final Catalogue Preservation Verification ---
  console.log("\n--- Verification: Catalogue Integrity & Count Preservation ---");
  const finalCount = store.getProducts({ includeInactive: true }).length;
  assert.strictEqual(finalCount, baselineCount, `Total catalogue products must match baseline (${baselineCount})`);
  console.log(`✔ PASS: Catalogue preserved at exactly ${baselineCount} products without corruption or loss.`);

  console.log("\n==========================================================================");
  console.log("  ALL TESTS PASSED SUCCESSFULLY! (100% PASS RATE)");
  console.log("==========================================================================\n");
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failure:", err);
  process.exit(1);
});
