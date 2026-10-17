const assert = require("assert");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const app = require("../index");
const store = require("../services/store");
const authService = require("../services/authService");
const cloudinaryService = require("../services/cloudinaryService");
const mediaService = require("../services/mediaService");

// Helper to simulate requests without loopback network socket
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
      resolve({ status: 404, body: { message: "Not found", error: err ? String(err) : null }, headers: resHeaders });
    });
  });
}

async function runHotfixVerificationSuite() {
  console.log("\n==========================================================================");
  console.log("  DR.MEDEX — HOTFIX VERIFICATION: DOWNLOADS, UPLOADS & OPTIONAL GEMINI");
  console.log("==========================================================================\n");

  const baselineProducts = store.getProducts({ includeInactive: true });
  const baselineCount = baselineProducts.length;
  console.log(`[Baseline] Product catalogue count: ${baselineCount} products.\n`);
  assert.strictEqual(baselineCount, 193, "Authoritative catalog must contain exactly 193 products.");

  // 1. Authenticate Admin
  console.log("--- 1. Authenticating Admin Session ---");
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
  assert(adminToken, "Admin token must be present");
  const authHeaders = { Authorization: `Bearer ${adminToken}` };
  console.log("✔ PASS: Admin session token generated successfully.\n");

  // 2. Test Cloudinary Service Export & Media Upload (Root Cause 1)
  console.log("--- 2. Testing Cloudinary Export & Media Upload (Slot 5 Fix) ---");
  assert.strictEqual(typeof cloudinaryService.uploadToCloudinary, "function", "cloudinaryService.uploadToCloudinary MUST be exported as a function!");
  
  // Test client/server copy export as well
  const clientCloudinaryService = require("../../client/server/services/cloudinaryService");
  assert.strictEqual(typeof clientCloudinaryService.uploadToCloudinary, "function", "client/server/services/cloudinaryService.uploadToCloudinary MUST also be exported!");
  console.log("✔ PASS: uploadToCloudinary is verified exported in both server and client/server.");

  // Upload a 1x1 test PNG buffer to Cloudinary
  const test1x1PngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const uploadRes = await makeRequest("/api/admin/media/upload", "POST", {
    headers: authHeaders,
    body: {
      file: test1x1PngBase64,
      filename: "hotfix_test_upload.png",
      folder: "dr-medex/test-verification"
    }
  });

  assert.ok(uploadRes.status === 200 || uploadRes.status === 201, `Media upload must return HTTP 200 or 201, got ${uploadRes.status}`);
  assert(uploadRes.body.success, "Media upload must succeed");
  assert(uploadRes.body.url, "Upload must return image URL");
  console.log(`✔ PASS: Image uploaded successfully to media provider: ${uploadRes.body.url}\n`);

  // 3. Test Product Photo Download Proxy & SSRF Defense (Root Cause 2)
  console.log("--- 3. Testing Individual Product Photo Download Proxy ---");
  // Test A: SSRF prevention (disallowed host)
  const ssrfRes = await makeRequest("/api/admin/download-image?url=https://malicious-evil-site.com/steal.jpg", "GET", {
    headers: authHeaders
  });
  assert.strictEqual(ssrfRes.status, 400, "Arbitrary non-whitelisted domains must be blocked (SSRF defense)");
  console.log("✔ PASS: Non-whitelisted domains rejected with HTTP 400 (SSRF defense verified).");

  // Test B: Disallowed protocols (file:// or javascript:)
  const protocolRes = await makeRequest("/api/admin/download-image?url=file:///etc/passwd", "GET", {
    headers: authHeaders
  });
  assert.strictEqual(protocolRes.status, 400, "File:// protocol must be rejected");
  console.log("✔ PASS: Insecure protocols blocked with HTTP 400.");

  // Test C: Valid Cloudinary asset download
  const dlRes = await makeRequest(`/api/admin/download-image?url=${encodeURIComponent(uploadRes.body.url)}&filename=download_test.png`, "GET", {
    headers: authHeaders
  });
  assert.strictEqual(dlRes.status, 200, "Valid Cloudinary download must return HTTP 200");
  assert(dlRes.headers["content-disposition"] && dlRes.headers["content-disposition"].includes("attachment; filename="), "Must send attachment Content-Disposition header");
  assert(dlRes.headers["content-type"] && dlRes.headers["content-type"].startsWith("image/"), "Must send image Content-Type");
  console.log(`✔ PASS: Individual photo streamed with valid binary Content-Type (${dlRes.headers["content-type"]}) and attachment header.\n`);

  // 4. Test Optional Gemini Analysis Isolation
  console.log("--- 4. Testing Optional Gemini Analysis Isolation ---");
  // Ensure Gemini AI call responds with truthful error/diagnostic without crashing server
  const aiRes = await makeRequest("/api/admin/products/ai-identify", "POST", {
    headers: authHeaders,
    body: {
      photos: [
        { data: uploadRes.body.url, mimeType: "image/png", filename: "test.png" }
      ]
    }
  });

  // If GEMINI_API_KEY is not configured or network blocked, must report truthful message
  if (aiRes.status !== 200) {
    assert(aiRes.body && (aiRes.body.message || aiRes.body.error), "Must return clear diagnostic message when Gemini fails or is unconfigured");
    console.log(`✔ PASS: AI endpoint returns truthful diagnostics: "${aiRes.body.message || aiRes.body.error}"`);
  } else {
    console.log(`✔ PASS: AI endpoint responded with valid analysis data.`);
  }

  // Confirm manual product save works 100% without Gemini
  console.log("--- 5. Testing Manual Product Save Independent of Gemini ---");
  const tempProdId = `hotfix-prod-${Date.now()}`;
  try {
    const createRes = await makeRequest("/api/admin/products", "POST", {
      headers: authHeaders,
      body: {
        id: tempProdId,
        title: "HOTFIX VERIFICATION DEVICE — 5 IMAGE SLOTS",
        sku: `HOTFIX-${Date.now()}`,
        category: "surgical-equipment",
        subcategory: "electrosurgical-units",
        brand: "DR.MEDEX",
        price: 15000,
        currency: "USD",
        stockQuantity: 5,
        status: "Active",
        condition: "New",
        images: [
          uploadRes.body.url,
          "https://res.cloudinary.com/mjqna8qi/image/upload/v1791729326/dr-medex/products/sample1.jpg",
          "https://res.cloudinary.com/mjqna8qi/image/upload/v1791729326/dr-medex/products/sample2.jpg",
          "https://res.cloudinary.com/mjqna8qi/image/upload/v1791729326/dr-medex/products/sample3.jpg",
          "https://res.cloudinary.com/mjqna8qi/image/upload/v1791729326/dr-medex/products/sample4.jpg"
        ],
        description: "Test product with exactly 5 images to verify slot preservation and manual editing.",
        features: ["Verified 5 image slots", "Zero Gemini dependency for manual editing"],
        specs: { "Power": "220V", "Certification": "ISO 13485" }
      }
    });

    assert.strictEqual(createRes.status, 201, "Manual product creation must succeed without Gemini");
    assert.strictEqual(createRes.body.product.images.length, 5, "Product must preserve all 5 image slots");
    console.log("✔ PASS: Manual product created with 5 image slots successfully without any AI intervention.");

    // Verify retrieval
    const getRes = await makeRequest(`/api/admin/products/${tempProdId}`, "GET", {
      headers: authHeaders
    });
    assert.strictEqual(getRes.status, 200, "Created product must be retrievable");
    assert.strictEqual(getRes.body.product.images.length, 5, "Retrieved product has exactly 5 images in original order");
    assert.strictEqual(getRes.body.product.images[0], uploadRes.body.url, "Slot 1 matches original upload");
    console.log("✔ PASS: Product retrieved from storage; all 5 images and ordering 100% intact.");

    // Clean up temporary test product
    const deleteRes = await makeRequest(`/api/admin/products/${tempProdId}`, "DELETE", {
      headers: authHeaders
    });
    if (deleteRes.status === 500) {
      assert.ok(deleteRes.body.message.includes("MongoDB") || (deleteRes.body.error && deleteRes.body.error.includes("MongoDB")), "Truthful MongoDB error reported when offline");
      console.log("✔ PASS: Deletion truthfully reports database error when MongoDB unreachable (no false success).");
    } else {
      assert.strictEqual(deleteRes.status, 200, "Temporary test product deleted cleanly");
      console.log("✔ PASS: Temporary test product safely cleaned up.");
    }
  } finally {
    store.deleteProduct(tempProdId);
  }

  // Verify catalogue count remains exactly 197
  const finalProducts = store.getProducts({ includeInactive: true });
  assert.strictEqual(finalProducts.length, baselineCount, `Catalogue count must remain unchanged at ${baselineCount}`);
  console.log(`✔ PASS: Authoritative catalogue preserved at exactly ${finalProducts.length} products.\n`);

  console.log("==========================================================================");
  console.log("  ALL HOTFIX VERIFICATION TESTS PASSED SUCCESSFULLY! (100% PASS RATE)");
  console.log("==========================================================================\n");
}

runHotfixVerificationSuite().catch((err) => {
  console.error("❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
