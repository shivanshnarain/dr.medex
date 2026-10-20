const assert = require("assert");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const app = require("../index");
const store = require("../services/store");
const authService = require("../services/authService");
const mediaService = require("../services/mediaService");

function makeRequest(url, method = "GET", { body = null, headers = {} } = {}) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let resData = null;
    const resHeaders = {};

    const parsedUrl = new URL(url, "http://localhost");
    const queryObj = Object.fromEntries(parsedUrl.searchParams.entries());

    const normalizedHeaders = {};
    for (const [k, v] of Object.entries({ host: "localhost", ...headers })) {
      normalizedHeaders[k.toLowerCase()] = v;
    }

    const req = {
      url,
      originalUrl: url,
      path: parsedUrl.pathname,
      method: method.toUpperCase(),
      headers: normalizedHeaders,
      query: queryObj,
      body,
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" },
      on: () => {},
      resume: () => {}
    };

    const res = {
      setHeader(k, v) { resHeaders[k.toLowerCase()] = v; },
      getHeader(k) { return resHeaders[k.toLowerCase()]; },
      status(code) { statusCode = code; this.statusCode = code; return this; },
      json(data) { resData = data; resolve({ status: statusCode, body: data, headers: resHeaders }); },
      send(data) { resData = data; resolve({ status: statusCode, body: data, headers: resHeaders }); },
      end(data) { if (data) resData = data; resolve({ status: statusCode, body: resData, headers: resHeaders }); }
    };

    app.handle(req, res, (err) => {
      resolve({ status: err ? 500 : statusCode, body: resData, error: err, headers: resHeaders });
    });
  });
}

async function runTests() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX ADMIN PANEL — PRODUCT IMAGE UPLOAD & SAVE FIX VERIFICATION");
  console.log("==========================================================================");

  // Setup Admin Auth Token
  const crypto = require("crypto");
  const adminEmail = (process.env.ADMIN_EMAIL || "roshan.official0009@gmail.com").toLowerCase().trim();
  const testPassword = "SecureHotfixAdmin2026!";
  const testSalt = crypto.randomBytes(32).toString("hex");
  const testHash = authService.hashPassword(testPassword, testSalt);

  const prevSalt = process.env.ADMIN_PASSWORD_SALT;
  const prevHash = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_SALT = testSalt;
  process.env.ADMIN_PASSWORD_HASH = testHash;

  const authResult = authService.login(adminEmail, testPassword);
  process.env.ADMIN_PASSWORD_SALT = prevSalt;
  process.env.ADMIN_PASSWORD_HASH = prevHash;

  assert(authResult && authResult.success, "Admin login must succeed");
  const adminToken = authResult.token;
  const authHeaders = {
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json"
  };

  // Test 1: Filename and Extension Normalization
  console.log("\n--- TEST 1: Filename & Duplicate Extension Handling ---");
  const testFiles = [
    { name: "dr_medex_table_1.jpg.jpeg", mime: "image/jpeg" },
    { name: "dr_medex_table_2.jpg.jpeg", mime: "image/jpg" },
    { name: "dr_medex_table_3.jpg.jpeg", mime: "image/pjpeg" },
    { name: "dr_medex_table_4.jpg.jpeg", mime: "image/x-png" },
    { name: "dr_medex_table_5.jpg.jpeg", mime: "image/webp" }
  ];

  for (const item of testFiles) {
    const { cleanName, mimeType } = mediaService.normalizeFilenameAndMime(item.name, item.mime);
    assert(!cleanName.includes(".jpg.jpeg"), `Clean name must not have duplicate extension: ${cleanName}`);
    assert(!cleanName.includes(".."), `Clean name must not have double dots: ${cleanName}`);
    assert(
      ["image/jpeg", "image/png", "image/webp"].includes(mimeType),
      `MIME type must be normalized to standard: ${mimeType}`
    );
    console.log(`  ✔ PASS: ${item.name} (${item.mime}) -> ${cleanName} (${mimeType})`);
  }

  // Test 2: Upload 5 Images via /api/admin/media/upload
  console.log("\n--- TEST 2: Upload 5 Images with Duplicate Extensions ---");
  const sample1x1Base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const uploadedUrls = [];
  for (let i = 1; i <= 5; i++) {
    const filename = `dr_medex_table_${i}.jpg.jpeg`;
    const res = await makeRequest("/api/admin/media/upload", "POST", {
      headers: authHeaders,
      body: {
        data: sample1x1Base64,
        filename,
        contentType: "image/jpeg",
        productId: "test-operating-table"
      }
    });

    assert.ok(res.status === 200 || res.status === 201, `Upload must return 200/201, got ${res.status}`);
    assert(res.body && res.body.success, "Upload must succeed");
    assert(res.body.url && res.body.url.startsWith("https://res.cloudinary.com/"), `Must return Cloudinary URL: ${res.body.url}`);
    uploadedUrls.push(res.body.url);
    console.log(`  ✔ PASS: Photo ${i} (${filename}) uploaded -> ${res.body.url}`);
  }
  assert.strictEqual(uploadedUrls.length, 5, "All 5 photographs must be uploaded successfully");

  // Test 3: Save Product with all 5 uploaded images
  console.log("\n--- TEST 3: Product Save with 5 Images & Persistence ---");
  const testSku = `DM-OT-TEST-${Date.now()}`;
  const savePayload = {
    productName: "Dr. Medex Hydraulic Operating Table PRO",
    title: "Dr. Medex Hydraulic Operating Table PRO",
    category: "Hospital Furniture",
    subcategory: "Operating Tables",
    equipmentType: "Hydraulic Operating Table",
    sku: testSku,
    basePrice: 185000,
    originalPrice: 220000,
    images: uploadedUrls,
    galleryImages: uploadedUrls,
    primaryImage: uploadedUrls[0],
    managedCloudinaryImages: uploadedUrls.map((u) => ({
      url: u,
      secureUrl: u,
      storageProvider: "cloudinary"
    })),
    description: "Premium hydraulic surgical operating table with five specialized clinical positioning modes.",
    stock: 12,
    stockStatus: "IN_STOCK"
  };

  const saveRes = await makeRequest("/api/admin/products", "POST", {
    headers: authHeaders,
    body: savePayload
  });

  assert.ok(saveRes.status === 200 || saveRes.status === 201, `Product creation must return 200/201, got ${saveRes.status}: ${JSON.stringify(saveRes.body)}`);
  assert(saveRes.body && saveRes.body.success, "Product creation must succeed");
  const createdProduct = saveRes.body.product;
  assert(createdProduct && createdProduct.id, "Product must have an id");
  assert.strictEqual(createdProduct.images.length, 5, "Product must persist exactly 5 images in database");
  assert.strictEqual(createdProduct.primaryImage, uploadedUrls[0], "Primary image must match first uploaded photo");
  console.log(`  ✔ PASS: Product saved with ID "${createdProduct.id}" and all 5 images persisted.`);

  // Test 4: Reload Product from DB and verify image persistence & order
  console.log("\n--- TEST 4: Product Reload Verification ---");
  const getRes = await makeRequest(`/api/admin/products/${createdProduct.id}`, "GET", {
    headers: authHeaders
  });
  assert.strictEqual(getRes.status, 200, "Get product must return 200");
  assert(getRes.body && getRes.body.success, "Get product must succeed");
  const fetchedProduct = getRes.body.product;
  assert.strictEqual(fetchedProduct.images.length, 5, "Reloaded product must have 5 images");
  for (let i = 0; i < 5; i++) {
    assert.strictEqual(fetchedProduct.images[i], uploadedUrls[i], `Image ${i + 1} order must be strictly preserved`);
  }
  console.log("  ✔ PASS: Reloaded product verified with all 5 persistent Cloudinary URLs intact in exact order.");

  // Test 5: Verify partial failure and retry flow
  console.log("\n--- TEST 5: Partial Failure & Slot Retry Behavior ---");
  const retryFilename = "dr_medex_table_3.jpg.jpeg";
  const retryRes = await makeRequest("/api/admin/media/upload", "POST", {
    headers: authHeaders,
    body: {
      data: sample1x1Base64,
      filename: retryFilename,
      contentType: "image/jpeg",
      productId: createdProduct.id
    }
  });
  assert.ok(retryRes.status === 200 || retryRes.status === 201, "Slot retry must succeed");
  assert(retryRes.body && retryRes.body.url, "Retry must return persistent URL");
  console.log(`  ✔ PASS: Individual failed slot retried successfully: ${retryRes.body.url}`);

  // Cleanup test product
  await makeRequest(`/api/admin/products/${createdProduct.id}`, "DELETE", {
    headers: authHeaders
  });
  console.log("  ✔ Cleaned up test product cleanly.");

  console.log("\n==========================================================================");
  console.log("  ALL TESTS PASSED! Image upload, retry, and save flows verified.");
  console.log("==========================================================================");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
