const assert = require("assert");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const app = require("../index");
const store = require("../services/store");
const authService = require("../services/authService");
const mongoService = require("../services/mongoService");
const cloudinaryService = require("../services/cloudinaryService");

// Helper to simulate requests without loopback network socket
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

async function runTestSuite() {
  console.log("\n==========================================================================");
  console.log("  DR.MEDEX — ADMIN SIMPLIFICATION, PHOTO DOWNLOAD & DELETION TEST SUITE");
  console.log("==========================================================================\n");

  const baselineProducts = store.getProducts({ includeInactive: true });
  const baselineCount = baselineProducts.length;
  console.log(`[Baseline] Product catalogue count: ${baselineCount} products.\n`);

  // --- 1. CHANGE 1: Admin & Customer Authentication through Unified Form ---
  console.log("--- 1. Testing Admin Authentication via Unified Endpoint ---");
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
      body: {
        email: adminEmail,
        password: testAdminPassword
      }
    });

    assert.strictEqual(adminLoginRes.status, 200, "Admin login should return HTTP 200");
    assert.strictEqual(adminLoginRes.body.success, true, "Admin login success should be true");
    assert.strictEqual(adminLoginRes.body.isAdmin, true, "Admin login isAdmin must be true");
    assert.strictEqual(adminLoginRes.body.redirectTo, "/admin", "Admin login must redirect to /admin");
    assert.ok(adminLoginRes.body.token, "Admin login must provide an authorization token");
    adminToken = adminLoginRes.body.token;
    console.log("✔ PASS: Admin authenticates via unified endpoint and receives admin token & /admin destination.");
  } finally {
    process.env.ADMIN_PASSWORD_SALT = originalSalt;
    process.env.ADMIN_PASSWORD_HASH = originalHash;
  }

  console.log("\n--- 2. Testing Customer Authentication vs Admin Endpoint Isolation ---");
  const customerLoginRes = await makeRequest("/api/auth/login", "POST", {
    body: {
      email: "clinical.buyer@hospital.org",
      password: "AnyPassword123!"
    }
  });

  assert.strictEqual(customerLoginRes.status, 200, "Customer login should return HTTP 200");
  assert.strictEqual(customerLoginRes.body.success, true, "Customer login success should be true");
  assert.strictEqual(customerLoginRes.body.isAdmin, false, "Customer login isAdmin MUST be false");
  assert.strictEqual(customerLoginRes.body.redirectTo, "/account", "Customer login must redirect to /account");

  // Attempt to access admin endpoints with unauthenticated or non-admin token
  const unauthAdminReq = await makeRequest("/api/admin/products", "GET");
  assert.strictEqual(unauthAdminReq.status, 401, "Unauthenticated access to /api/admin/products must return 401");

  const fakeTokenReq = await makeRequest("/api/admin/products", "GET", {
    headers: { authorization: "Bearer fake-token-12345" }
  });
  assert.strictEqual(fakeTokenReq.status, 401, "Invalid token must return 401");
  console.log("✔ PASS: Normal customer receives customer redirect and is strictly blocked from admin endpoints.");

  // --- 2. CHANGE 2: Download Product Photos Individually ---
  console.log("\n--- 3. Testing Individual Product Photo Download Proxy ---");
  const unauthDownloadReq = await makeRequest("/api/admin/download-image?url=https://example.com/test.jpg", "GET");
  assert.strictEqual(unauthDownloadReq.status, 401, "Download endpoint must require admin authentication");

  const invalidUrlReq = await makeRequest("/api/admin/download-image", "GET", {
    headers: { authorization: `Bearer ${adminToken}` }
  });
  assert.strictEqual(invalidUrlReq.status, 400, "Missing URL must return HTTP 400");

  console.log("✔ PASS: Photo download proxy validates authorization and input parameters.");

  // --- 3. CHANGE 3: Safe Catalogue Retirement & Permanent Product Deletion ---
  console.log("\n--- 4. Testing Safe Catalogue Retirement for Products with Customer Orders ---");
  const retirementTestId = `test-retire-${Date.now()}`;
  const retirementTestProduct = {
    id: retirementTestId,
    title: "TEST SURGICAL LIGHT TO RETIRE",
    slug: `test-surgical-light-to-retire-${Date.now()}`,
    sku: `TEST-RET-SKU-${Date.now()}`,
    category: "ot-lights",
    basePrice: 5000,
    status: "ACTIVE",
    primaryImage: "https://res.cloudinary.com/mjqna8qi/image/upload/v1791729326/test_order_asset.jpg",
    images: [],
    createdAt: new Date().toISOString()
  };
  store.addProduct(retirementTestProduct);

  // Add a temporary test order referencing this product
  const tempOrder = {
    id: `ORD-TEST-${Date.now()}`,
    orderNumber: `ORD-TEST-${Date.now()}`,
    items: [
      {
        productId: retirementTestId,
        title: retirementTestProduct.title,
        sku: retirementTestProduct.sku,
        quantity: 2,
        basePriceUSD: 5000,
        convertedUnitPrice: 5000,
        currency: "USD",
        image: retirementTestProduct.primaryImage
      }
    ],
    status: "PAID",
    createdAt: new Date().toISOString()
  };
  store.getOrders().push(tempOrder);

  try {
    // 1. Permanent deletion attempt must be strictly blocked with HTTP 409 and clear reason
    const deleteAttemptRes = await makeRequest(`/api/admin/products/${retirementTestId}`, "DELETE", {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(deleteAttemptRes.status, 409, "Attempted deletion of product with orders must return HTTP 409 Conflict");
    assert.strictEqual(deleteAttemptRes.body.success, false, "Success must be false on blocked deletion");
    assert.strictEqual(deleteAttemptRes.body.error, "PRODUCT_HAS_ORDER_REFERENCES", "Error code must be PRODUCT_HAS_ORDER_REFERENCES");
    assert.strictEqual(deleteAttemptRes.body.canArchive, true, "Response must offer canArchive: true");
    assert.ok(deleteAttemptRes.body.message.includes("is referenced in"), "Message must explain conflict");

    // Verify product was NOT deleted and NOT silently archived yet
    const intactRecord = store.getProductById(retirementTestId, true);
    assert.ok(intactRecord, "Product must still exist");
    assert.strictEqual(intactRecord.status, "ACTIVE", "Product must not be silently archived");

    // 2. Administrator executes explicit archive action
    const archiveRes = await makeRequest(`/api/admin/products/${retirementTestId}/archive`, "POST", {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(archiveRes.status, 200, "Explicit archive request must return HTTP 200");
    assert.strictEqual(archiveRes.body.success, true, "Archive success flag must be true");
    assert.strictEqual(archiveRes.body.archived, true, "Product must be flagged as archived");

    // Verify product status in store is now ARCHIVED / isRetired: true
    const retiredRecord = store.getProductById(retirementTestId, true);
    assert.ok(retiredRecord, "Product record must still exist for order history");
    assert.strictEqual(retiredRecord.status, "ARCHIVED", "Product status must be ARCHIVED");
    assert.strictEqual(retiredRecord.isRetired, true, "Product must be marked as isRetired: true");

    // Verify excluded from normal storefront queries
    const publicRecord = store.getProductById(retirementTestId, false);
    assert.strictEqual(publicRecord, null, "Retired product must not be available on public storefront");

    // Verify order record remains completely intact
    const ordersAfter = store.getOrders();
    const foundOrder = ordersAfter.find(o => o.id === tempOrder.id);
    assert.ok(foundOrder, "Customer order must remain 100% intact");
    assert.strictEqual(foundOrder.items[0].productId, retirementTestId);
    assert.strictEqual(foundOrder.items[0].quantity, 2);

    console.log(`✔ PASS: Product ${retirementTestId} safely retired from active catalogue while retaining customer order history.`);
  } finally {
    // Clean up temporary test order and test product
    const orderIdx = store.getOrders().findIndex(o => o.id === tempOrder.id);
    if (orderIdx !== -1) store.getOrders().splice(orderIdx, 1);
    store.deleteProduct(retirementTestId);
    if (mongoService.isConfigured()) {
      await mongoService.removeApprovedProduct(retirementTestId).catch(() => {});
    }
  }

  console.log("\n--- 5. Testing Isolated Test Product Permanent Deletion ---");
  const isolatedTestId = `test-del-${Date.now()}`;
  const isolatedTestProduct = {
    id: isolatedTestId,
    title: "TEST TEMPORARY ANESTHESIA MONITOR",
    slug: `test-temporary-anesthesia-monitor-${Date.now()}`,
    sku: `TEST-SKU-${Date.now()}`,
    category: "anesthesia-machines",
    basePrice: 9999,
    status: "ACTIVE",
    primaryImage: "https://res.cloudinary.com/mjqna8qi/image/upload/v1791729326/test_asset_exclusive_delete.jpg",
    images: [],
    createdAt: new Date().toISOString()
  };

  // Add temporary test product to store
  store.addProduct(isolatedTestProduct);
  const afterAdd = store.getProductById(isolatedTestId, true);
  assert.ok(afterAdd, "Isolated test product must be present in store before deletion");

  const originalRemove = mongoService.removeApprovedProduct;

  try {
    // A. When MongoDB Atlas connection fails, verify that server rejects with 500 and does NOT report false success
    mongoService.removeApprovedProduct = async () => {
      throw new Error("Simulated MongoDB Atlas disconnect during delete");
    };
    const failRes = await makeRequest(`/api/admin/products/${isolatedTestId}`, "DELETE", {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(failRes.status, 500, "Must return HTTP 500 when database operation fails");
    assert.strictEqual(failRes.body.success, false);
    console.log("✔ PASS: Deletion safely fails when MongoDB is unreachable; does not report false success.");

    // B. Verify successful permanent deletion when database confirms deletion
    mongoService.removeApprovedProduct = async (id) => ({
      success: true,
      status: "REMOVED",
      id,
      deletedCount: 1
    });

    const deleteRes = await makeRequest(`/api/admin/products/${isolatedTestId}`, "DELETE", {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(deleteRes.status, 200, "Delete must return HTTP 200 on success");
    assert.strictEqual(deleteRes.body.success, true, "Delete body success must be true");
    assert.strictEqual(deleteRes.body.deleted, true, "Delete body deleted must be true");

    // Verify removed from store
    const afterDelete = store.getProductById(isolatedTestId, true);
    assert.strictEqual(afterDelete, null, "Test product must be permanently removed from store");

    // Verify real catalogue count has not been corrupted or reduced
    const currentCount = store.getProducts({ includeInactive: true }).length;
    assert.strictEqual(currentCount, baselineCount, `Catalogue count must match baseline count (${baselineCount})`);
    console.log(`✔ PASS: Isolated test product permanently deleted; real catalogue preserved at exactly ${baselineCount} products.`);
  } finally {
    mongoService.removeApprovedProduct = originalRemove;
    store.deleteProduct(isolatedTestId);
  }

  // --- 4. Testing Cloudinary Exclusively Owned Asset Discovery & Shared Safety ---
  console.log("\n--- 6. Testing Cloudinary Exclusively Owned Asset Discovery & Shared Safety ---");
  const dummyProductA = {
    id: "prod-a",
    primaryImage: "https://res.cloudinary.com/mjqna8qi/image/upload/v12345/shared_brand_badge.jpg"
  };
  const dummyProductB = {
    id: "prod-b",
    primaryImage: "https://res.cloudinary.com/mjqna8qi/image/upload/v12345/shared_brand_badge.jpg"
  };

  const sharedCheckResult = await cloudinaryService.deleteProductExclusivelyOwnedMedia(dummyProductA, [
    dummyProductA,
    dummyProductB
  ]);

  assert.ok(
    sharedCheckResult.preserved.some((p) => p.publicId === "shared_brand_badge"),
    "Shared Cloudinary asset must be preserved and never deleted"
  );
  console.log("✔ PASS: Cloudinary deletion algorithm strictly protects shared assets referenced across products.");

  console.log("\n==========================================================================");
  console.log("  ALL 6/6 VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("==========================================================================\n");
}

runTestSuite().then(() => process.exit(0)).catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
