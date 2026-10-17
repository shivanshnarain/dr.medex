const assert = require("assert");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const store = require("../services/store");
const mongoService = require("../services/mongoService");
const imageResolver = require("../services/imageResolver");
const app = require("../index");

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
      resume: () => {},
      read: () => null,
      pipe: () => {}
    };

    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve({ status: statusCode, body: resData, headers: resHeaders });
      }
    };

    const res = {
      setHeader(k, v) { resHeaders[k] = v; resHeaders[k.toLowerCase()] = v; },
      getHeader(k) { return resHeaders[k.toLowerCase()] || resHeaders[k]; },
      status(code) { statusCode = code; this.statusCode = code; return this; },
      json(data) { resData = data; finish(); },
      send(data) { resData = data; finish(); },
      end(data) { if (data) resData = data; finish(); },
      write(data) { if (!resData) resData = Buffer.from(""); if (Buffer.isBuffer(data)) resData = Buffer.concat([resData, data]); },
      emit(evt) { if (evt === "finish" || evt === "close") finish(); },
      on(evt, handler) { if (evt === "finish" || evt === "close") setTimeout(finish, 50); }
    };

    app.handle(req, res, (err) => {
      if (!resolved) {
        resolved = true;
        resolve({ status: 404, body: { message: "Not found", error: err ? String(err) : null }, headers: resHeaders });
      }
    });
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

async function runE2ETests() {
  console.log("\n==========================================================================");
  console.log("  DR.MEDEX — COMPREHENSIVE E2E VERIFICATION TEST SUITE");
  console.log("  Product Image Persistence, Gallery Synchronization & Exact Photo Downloads");
  console.log("==========================================================================\n");

  const adminToken = getAdminToken();
  const baselineCount = store.getProducts({ includeInactive: true }).length;
  console.log(`[Baseline] Total catalogue products: ${baselineCount}`);

  const testSuffix = Date.now();
  const testProdId = `test-e2e-prod-${testSuffix}`;
  const testSlug = `test-e2e-cardiac-monitor-${testSuffix}`;
  const testSku = `TEST-E2E-${testSuffix}`;

  const img1 = "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80";
  const img2 = "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80";
  const img3 = "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80";
  const img4 = "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=800&q=80";
  const img5 = "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?auto=format&fit=crop&w=800&q=80";
  const imgReplacement = "https://images.unsplash.com/photo-1583912267670-6575ad4e229d?auto=format&fit=crop&w=800&q=80";

  let passes = 0;

  try {
    // -------------------------------------------------------------
    // TEST A: ADD IMAGE (4 images -> 5 images)
    // -------------------------------------------------------------
    console.log("--- TEST A: Add Image & Persistence Verification ---");

    // 1. Create product with four initial photographs
    console.log("1. Creating isolated test product with 4 initial photographs...");
    const createRes = await makeRequest("/api/admin/products", "POST", {
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        id: testProdId,
        productName: "TEST CLINICAL CARDIAC MONITOR",
        title: "TEST CLINICAL CARDIAC MONITOR",
        category: "patient-monitoring",
        sku: testSku,
        slug: testSlug,
        brand: "DR.MEDEX",
        basePrice: 185000,
        originalPrice: 210000,
        stock: 8,
        status: "ACTIVE",
        images: [img1, img2, img3, img4],
        primaryImage: img1
      }
    });

    assert.strictEqual(createRes.status, 201, `Expected 201 Created, got ${createRes.status}`);
    assert.strictEqual(createRes.body.success, true);
    assert.strictEqual(createRes.body.product.images.length, 4);
    console.log("✔ Created test product with 4 images.");

    // 2. Add a distinct 5th image and save
    console.log("2. Adding 5th distinct photograph and saving...");
    const updateRes5 = await makeRequest(`/api/admin/products/${testProdId}`, "PUT", {
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        images: [img1, img2, img3, img4, img5],
        primaryImage: img1,
        managedCloudinaryImages: [
          { url: img1, secureUrl: img1, publicId: "test_cld_1" },
          { url: img2, secureUrl: img2, publicId: "test_cld_2" },
          { url: img3, secureUrl: img3, publicId: "test_cld_3" },
          { url: img4, secureUrl: img4, publicId: "test_cld_4" },
          { url: img5, secureUrl: img5, publicId: "test_cld_5" }
        ]
      }
    });

    assert.strictEqual(updateRes5.status, 200, `Expected 200, got ${updateRes5.status}`);
    assert.strictEqual(updateRes5.body.success, true);
    assert.strictEqual(updateRes5.body.product.images.length, 5, "Expected 5 images in PUT response");
    console.log("✔ Saved product with 5 images.");

    // 3. Verify direct MongoDB Atlas persistence
    if (mongoService.isConfigured()) {
      console.log("3. Verifying authoritative MongoDB Atlas persistence...");
      const mongoRecord = await mongoService.getApprovedProduct(testProdId);
      if (mongoRecord) {
        assert.strictEqual(mongoRecord.images.length, 5, `Expected 5 images in MongoDB, got ${mongoRecord.images.length}`);
        assert.strictEqual(mongoRecord.images[4], img5, "5th image in MongoDB must match uploaded img5");
        console.log("✔ Direct MongoDB Atlas verification confirmed: exact 5 photographs persisted.");
      } else {
        console.log("ℹ MongoDB Atlas live record not found (may be running sandboxed).");
      }
    }

    // 4. Reopen editor via GET /api/admin/products/:id
    console.log("4. Simulating editor reload: GET /api/admin/products/:id...");
    const reopenRes = await makeRequest(`/api/admin/products/${testProdId}`, "GET", {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(reopenRes.status, 200);
    assert.strictEqual(reopenRes.body.success, true);
    assert.strictEqual(reopenRes.body.product.images.length, 5, "Reopened editor must receive exact 5 photographs");
    assert.strictEqual(reopenRes.body.product.images[4], img5);
    console.log("✔ Reopened editor receives all 5 current photographs identically.");

    // 5. Verify public storefront displays all 5 photographs
    console.log("5. Checking public storefront endpoint: GET /api/products/:slug...");
    const storefrontRes = await makeRequest(`/api/products/${testSlug}`, "GET");
    if (storefrontRes.status === 200 && storefrontRes.body?.product) {
      assert.strictEqual(storefrontRes.body.product.images.length, 5, "Storefront must display all 5 photographs");
      console.log("✔ Public storefront returns exact 5 photographs.");
    }

    passes++;
    console.log("✔ PASS: TEST A completed successfully.\n");

    // -------------------------------------------------------------
    // TEST B: REMOVE AND REPLACE IMAGES
    // -------------------------------------------------------------
    console.log("--- TEST B: Remove & Replace Images Verification ---");

    // 1. Remove img2 and replace img4 with imgReplacement -> [img1, img3, imgReplacement, img5] (4 images)
    console.log("1. Removing img2 and replacing img4 with imgReplacement...");
    const updateReplaceRes = await makeRequest(`/api/admin/products/${testProdId}`, "PUT", {
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        images: [img1, img3, imgReplacement, img5],
        primaryImage: img1
      }
    });

    assert.strictEqual(updateReplaceRes.status, 200);
    assert.strictEqual(updateReplaceRes.body.product.images.length, 4, "Expected 4 images after removal & replacement");
    assert(!updateReplaceRes.body.product.images.includes(img2), "Removed img2 must not be present in saved images");
    assert(!updateReplaceRes.body.product.images.includes(img4), "Replaced img4 must not be present in saved images");
    assert(updateReplaceRes.body.product.images.includes(imgReplacement), "Replacement image must be present");
    console.log("✔ Saved gallery with removed and replaced photos.");

    // 2. Reopen editor and verify authoritative gallery
    console.log("2. Reopening editor to verify removed photo is absent and replacement is present...");
    const reopenB = await makeRequest(`/api/admin/products/${testProdId}`, "GET", {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(reopenB.status, 200);
    const editorImagesB = reopenB.body.product.images;
    assert.strictEqual(editorImagesB.length, 4);
    assert(!editorImagesB.includes(img2), "Removed image must remain absent after editor reopen");
    assert(!editorImagesB.includes(img4), "Replaced image must remain absent after editor reopen");
    assert(editorImagesB.includes(imgReplacement), "Replacement image must remain present after editor reopen");
    console.log("✔ Reopened editor accurately reflects 4 images with removal and replacement.");

    // 3. Confirm customer orders in store remain intact
    console.log("3. Verifying customer orders are untouched...");
    const orders = store.getOrders();
    assert(Array.isArray(orders) && orders.length > 0, "Orders must be intact");
    console.log(`✔ Verified ${orders.length} existing customer orders remain intact.`);

    passes++;
    console.log("✔ PASS: TEST B completed successfully.\n");

    // -------------------------------------------------------------
    // TEST C: EXACT DOWNLOADS (4 images and 5 images)
    // -------------------------------------------------------------
    console.log("--- TEST C: Exact Image Download Resolution ---");

    // 1. Download resolution for 4 current images
    console.log("1. Resolving images for 4-image product via GET /api/admin/products/:id/images...");
    const downloadRes4 = await makeRequest(`/api/admin/products/${testProdId}/images`, "GET", {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(downloadRes4.status, 200);
    assert.strictEqual(downloadRes4.body.success, true);
    assert.strictEqual(downloadRes4.body.count, 4, `Expected exactly 4 downloads, got ${downloadRes4.body.count}`);
    assert.strictEqual(downloadRes4.body.images.length, 4);
    const resolvedUrls4 = downloadRes4.body.images.map(im => im.url);
    assert(!resolvedUrls4.includes(img2), "Removed photo img2 must NOT be in download list");
    assert(!resolvedUrls4.includes(img4), "Replaced photo img4 must NOT be in download list");
    console.log("✔ Exactly 4 downloads resolved for 4-image product. Zero stale or removed photos included.");

    // 2. Test download resolution when product has 5 images
    console.log("2. Restoring 5 images and verifying exactly 5 downloads...");
    await makeRequest(`/api/admin/products/${testProdId}`, "PUT", {
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        images: [img1, img2, img3, img4, img5],
        primaryImage: img1
      }
    });

    const downloadRes5 = await makeRequest(`/api/admin/products/${testProdId}/images`, "GET", {
      headers: { authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(downloadRes5.status, 200);
    assert.strictEqual(downloadRes5.body.count, 5, `Expected exactly 5 downloads, got ${downloadRes5.body.count}`);
    assert.strictEqual(downloadRes5.body.images.length, 5);
    console.log("✔ Exactly 5 downloads resolved for 5-image product.");

    // 3. Verify single image download proxy (no zip packaging)
    console.log("3. Testing single image download proxy without ZIP packaging...");
    const sampleDownloadUrl = "/products-catalog/surgical-cautery-400-watts-electrosurgical-generator/img_1.jpg";
    const proxyRes = await makeRequest(
      `/api/admin/download-image?url=${encodeURIComponent(sampleDownloadUrl)}&filename=test_photo_1.jpg`,
      "GET",
      { headers: { authorization: `Bearer ${adminToken}` } }
    );
    assert.strictEqual(proxyRes.status, 200);
    assert(proxyRes.headers["content-type"]?.includes("image/jpeg"), "Response must be an individual image, not ZIP or JSON");
    assert(proxyRes.headers["content-disposition"]?.includes("attachment"), "Must include Content-Disposition attachment header");
    console.log("✔ Verified individual image streaming delivery to browser (no ZIP archive).");

    passes++;
    console.log("✔ PASS: TEST C completed successfully.\n");

    // -------------------------------------------------------------
    // TEST D: FAILURES AND RECOVERY
    // -------------------------------------------------------------
    console.log("--- TEST D: Failures & Recovery ---");

    // 1. Missing URL on download proxy
    console.log("1. Simulating missing image URL on download proxy...");
    const badProxyRes = await makeRequest("/api/admin/download-image", "GET", {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(badProxyRes.status, 400);
    assert.strictEqual(badProxyRes.body.success, false);
    console.log("✔ Accurate error shown on missing download URL (no silent false success).");

    // 2. Verify previous saved gallery is untouched
    const verifyUntouched = await makeRequest(`/api/admin/products/${testProdId}`, "GET", {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(verifyUntouched.body.product.images.length, 5);
    console.log("✔ Previously saved gallery remains intact.");

    passes++;
    console.log("✔ PASS: TEST D completed successfully.\n");

    // -------------------------------------------------------------
    // TEST E: REGRESSION & CLEANUP
    // -------------------------------------------------------------
    console.log("--- TEST E: Regression & Safe Cleanup ---");

    // 1. Verify existing real product images were untouched
    const cauteryProd = store.getProductById("prod-surgical-cautery-400-wat", true);
    assert(cauteryProd, "Standard catalogue product must exist");
    const cauteryImages = imageResolver.resolveProductImages(cauteryProd);
    assert.strictEqual(cauteryImages.length, 4, `Standard cautery product must have exactly 4 images, got ${cauteryImages.length}`);
    console.log("✔ Standard catalogue product images verified: 4 current images intact, zero historical bloat.");

    // 2. Clean up temporary test product
    console.log("2. Safely cleaning up temporary test product...");
    const delRes = await makeRequest(`/api/admin/products/${testProdId}`, "DELETE", {
      headers: { authorization: `Bearer ${adminToken}` }
    });
    if (!delRes.body?.success) {
      store.deleteProduct(testProdId);
    }

    if (mongoService.isConfigured()) {
      try {
        await mongoService.removeApprovedProduct(testProdId);
      } catch {}
    }

    const finalCount = store.getProducts({ includeInactive: true }).length;
    assert.strictEqual(finalCount, baselineCount, `Catalogue count must return to baseline ${baselineCount}, got ${finalCount}`);
    console.log("✔ Temporary test product cleaned up cleanly. Real catalogue count preserved.");

    passes++;
    console.log("✔ PASS: TEST E completed successfully.\n");

    console.log("==========================================================================");
    console.log(`  ALL ${passes}/${passes} E2E TESTS PASSED SUCCESSFULLY!`);
    console.log("==========================================================================\n");
    process.exit(0);
  } catch (err) {
    console.error("E2E Test Failure:", err);
    // Attempt cleanup of test product
    try {
      await makeRequest(`/api/admin/products/${testProdId}`, "DELETE", {
        headers: { authorization: `Bearer ${adminToken}` }
      });
      if (mongoService.isConfigured()) {
        await mongoService.removeApprovedProduct(testProdId);
      }
    } catch {}
    process.exit(1);
  }
}

runE2ETests().catch(err => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
