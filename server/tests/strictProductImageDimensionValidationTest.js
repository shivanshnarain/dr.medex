const assert = require("assert");
const zlib = require("zlib");
const http = require("http");
const mediaService = require("../services/mediaService");
const store = require("../services/store");
const app = require("../index");

// Helper to generate a valid PNG buffer of any specified width and height
function createPngBuffer(width, height) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2; // RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  let crc = 0xffffffff;
  const ihdrFull = Buffer.concat([Buffer.from("IHDR"), ihdrData]);
  for (let i = 0; i < ihdrFull.length; i++) {
    crc ^= ihdrFull[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const ihdrCrc = Buffer.alloc(4);
  ihdrCrc.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);

  const ihdrChunk = Buffer.concat([Buffer.from([0, 0, 0, 13]), Buffer.from("IHDR"), ihdrData, ihdrCrc]);
  const rawScanlines = Buffer.alloc(height * (1 + width * 3), 0);
  const compressed = zlib.deflateSync(rawScanlines);

  crc = 0xffffffff;
  const idatFull = Buffer.concat([Buffer.from("IDAT"), compressed]);
  for (let i = 0; i < idatFull.length; i++) {
    crc ^= idatFull[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const idatCrc = Buffer.alloc(4);
  idatCrc.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);

  const idatLength = Buffer.alloc(4);
  idatLength.writeUInt32BE(compressed.length, 0);
  const idatChunk = Buffer.concat([idatLength, Buffer.from("IDAT"), compressed, idatCrc]);
  const iendChunk = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Helper to generate a valid JPEG buffer of any specified width and height
function createJpegBuffer(width, height) {
  return Buffer.from([
    0xFF, 0xD8, // SOI
    0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
    0xFF, 0xDB, 0x00, 0x43, 0x00,
    ...new Array(64).fill(1),
    0xFF, 0xC0, 0x00, 0x0B, 0x08, // SOF0: length 11, precision 8
    (height >> 8) & 0xFF, height & 0xFF, // height
    (width >> 8) & 0xFF, width & 0xFF,   // width
    0x01, 0x01, 0x11, 0x00,
    0xFF, 0xC4, 0x00, 0x1F, 0x00,
    ...new Array(29).fill(0),
    0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
    0xBF, 0x80,
    0xFF, 0xD9 // EOI
  ]);
}

async function runDimensionValidationTestSuite() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX STRICT PRODUCT IMAGE DIMENSION VALIDATION TEST SUITE");
  console.log("  MANDATORY REQUIREMENT: EXACT 1024 × 1536 PIXELS ONLY (2:3 RATIO)");
  console.log("==========================================================================\n");

  const expectedError = (w, h) =>
    `Invalid Image Dimensions. Only images of exactly 1024 × 1536 pixels (2:3 ratio) are accepted. Your uploaded image is ${w} × ${h} pixels. Please select a correctly sized image.`;

  // -------------------------------------------------------------------------
  // TEST 1: Buffer header dimension extraction (PNG & JPEG)
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: Binary Header Dimension Decoding Accuracy ---");
  const validPng = createPngBuffer(1024, 1536);
  const dimsPng = mediaService.detectImageDimensionsFromBuffer(validPng, "png");
  assert.deepStrictEqual(dimsPng, { width: 1024, height: 1536 }, "PNG dimensions must be exactly 1024x1536");
  console.log("  ✔ PASS: Valid PNG binary header decoded: 1024 × 1536 px");

  const validJpeg = createJpegBuffer(1024, 1536);
  const dimsJpeg = mediaService.detectImageDimensionsFromBuffer(validJpeg, "jpg");
  assert.deepStrictEqual(dimsJpeg, { width: 1024, height: 1536 }, "JPEG dimensions must be exactly 1024x1536");
  console.log("  ✔ PASS: Valid JPEG binary header decoded: 1024 × 1536 px");

  // -------------------------------------------------------------------------
  // TEST 2: Successful upload for exact 1024 × 1536 images
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: Direct MediaService Upload for Exact 1024 × 1536 Images ---");
  const uploadPngRes = await mediaService.uploadProductImage(
    validPng,
    "valid-operating-light.png",
    "image/png",
    "test-product-validation"
  );
  assert.ok(uploadPngRes && uploadPngRes.url, "Upload must succeed for valid 1024x1536 PNG");
  console.log(`  ✔ PASS: 1024 × 1536 PNG uploaded successfully -> ${uploadPngRes.url}`);

  const uploadJpegRes = await mediaService.uploadProductImage(
    validJpeg,
    "valid-operating-light.jpg",
    "image/jpeg",
    "test-product-validation"
  );
  assert.ok(uploadJpegRes && uploadJpegRes.url, "Upload must succeed for valid 1024x1536 JPEG");
  console.log(`  ✔ PASS: 1024 × 1536 JPEG uploaded successfully -> ${uploadJpegRes.url}`);

  // -------------------------------------------------------------------------
  // TEST 3: Strict rejection of off-by-one pixel dimensions
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 3: Off-By-One Pixel Dimensions Must Be Strictly Rejected ---");
  const offByOneCases = [
    { w: 1023, h: 1536, name: "1023 × 1536 (width - 1)" },
    { w: 1024, h: 1535, name: "1024 × 1535 (height - 1)" },
    { w: 1025, h: 1536, name: "1025 × 1536 (width + 1)" },
    { w: 1024, h: 1537, name: "1024 × 1537 (height + 1)" }
  ];

  for (const { w, h, name } of offByOneCases) {
    const testBuf = createPngBuffer(w, h);
    let rejected = false;
    let errMessage = "";
    let errCode = "";
    try {
      await mediaService.uploadProductImage(testBuf, `test-${w}x${h}.png`, "image/png", "test-product-validation");
    } catch (err) {
      rejected = true;
      errMessage = err.message;
      errCode = err.code;
    }
    assert.strictEqual(rejected, true, `${name} must be rejected`);
    assert.strictEqual(errCode, "INVALID_IMAGE_DIMENSIONS", `Error code must be INVALID_IMAGE_DIMENSIONS for ${name}`);
    assert.strictEqual(errMessage, expectedError(w, h), `Error message must match exact required phrasing for ${name}`);
    console.log(`  ✔ PASS: ${name} rejected with: "${errMessage}"`);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Strict rejection of scaled 2:3 images (proportional, but wrong resolution)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 4: Proportional 2:3 Aspect Ratio with Wrong Dimensions Must Be Rejected ---");
  const proportionalCases = [
    { w: 1000, h: 1500, name: "1000 × 1500 (2:3 scaled down)" },
    { w: 1080, h: 1620, name: "1080 × 1620 (2:3 scaled up)" },
    { w: 1200, h: 1800, name: "1200 × 1800 (2:3 scaled up)" }
  ];

  for (const { w, h, name } of proportionalCases) {
    const testBuf = createJpegBuffer(w, h);
    let rejected = false;
    let errMessage = "";
    let errCode = "";
    try {
      await mediaService.uploadProductImage(testBuf, `test-${w}x${h}.jpg`, "image/jpeg", "test-product-validation");
    } catch (err) {
      rejected = true;
      errMessage = err.message;
      errCode = err.code;
    }
    assert.strictEqual(rejected, true, `${name} must be rejected`);
    assert.strictEqual(errCode, "INVALID_IMAGE_DIMENSIONS", `Error code must be INVALID_IMAGE_DIMENSIONS for ${name}`);
    assert.strictEqual(errMessage, expectedError(w, h), `Error message must match exact required phrasing for ${name}`);
    console.log(`  ✔ PASS: ${name} rejected with: "${errMessage}"`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Strict rejection of inverted, square, and landscape dimensions
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 5: Inverted (Landscape 3:2), Square, and Non-2:3 Dimensions Must Be Rejected ---");
  const nonPortraitCases = [
    { w: 1536, h: 1024, name: "1536 × 1024 (Inverted 3:2 landscape)" },
    { w: 1024, h: 1024, name: "1024 × 1024 (Square 1:1)" },
    { w: 1920, h: 1080, name: "1920 × 1080 (16:9 landscape)" },
    { w: 800, h: 600, name: "800 × 600 (4:3 landscape)" }
  ];

  for (const { w, h, name } of nonPortraitCases) {
    const testBuf = createPngBuffer(w, h);
    let rejected = false;
    let errMessage = "";
    let errCode = "";
    try {
      await mediaService.uploadProductImage(testBuf, `test-${w}x${h}.png`, "image/png", "test-product-validation");
    } catch (err) {
      rejected = true;
      errMessage = err.message;
      errCode = err.code;
    }
    assert.strictEqual(rejected, true, `${name} must be rejected`);
    assert.strictEqual(errCode, "INVALID_IMAGE_DIMENSIONS", `Error code must be INVALID_IMAGE_DIMENSIONS for ${name}`);
    assert.strictEqual(errMessage, expectedError(w, h), `Error message must match exact required phrasing for ${name}`);
    console.log(`  ✔ PASS: ${name} rejected with: "${errMessage}"`);
  }

  // -------------------------------------------------------------------------
  // TEST 6: API Route Integration with Batch Upload (/api/admin/media/upload-batch)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6: Batch Upload API Route — Selective Validation & Granular Reporting ---");
  const authService = require("../services/authService");
  const crypto = require("crypto");
  const adminEmail = (process.env.ADMIN_EMAIL || "roshan.official0009@gmail.com").toLowerCase().trim();
  const testPassword = "DimensionAdminTest2026!";
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

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const validPngBase64 = `data:image/png;base64,${createPngBuffer(1024, 1536).toString("base64")}`;
  const invalid1000x1500Base64 = `data:image/jpeg;base64,${createJpegBuffer(1000, 1500).toString("base64")}`;
  const invalid1025x1536Base64 = `data:image/png;base64,${createPngBuffer(1025, 1536).toString("base64")}`;

  function apiPost(path, body) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const req = http.request(
        {
          hostname: "localhost",
          port,
          path,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
            Authorization: `Bearer ${adminToken}`
          }
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        }
      );
      req.on("error", reject);
      req.write(payload);
      req.end();
    });
  }

  // Batch upload with 1 valid file and 2 invalid dimension files
  const batchRes = await apiPost("/api/admin/media/upload-batch", {
    productId: "test-batch-product",
    items: [
      { filename: "correct-portrait.png", data: validPngBase64, mimeType: "image/png" },
      { filename: "wrong-proportional.jpg", data: invalid1000x1500Base64, mimeType: "image/jpeg" },
      { filename: "off-by-one.png", data: invalid1025x1536Base64, mimeType: "image/png" }
    ]
  });

  assert.strictEqual(batchRes.status, 201, "Batch upload with partial successes returns 201 Created");
  assert.strictEqual(batchRes.body.success, true, "success flag is true when valid files are uploaded");
  assert.strictEqual(batchRes.body.uploadedCount, 1, "Exactly 1 valid file must be uploaded");
  assert.strictEqual(batchRes.body.errors.length, 2, "Detailed errors must be provided for both rejected files");

  const err1 = batchRes.body.errors.find((e) => e.filename === "wrong-proportional.jpg");
  assert.ok(err1, "wrong-proportional.jpg must be in errors list");
  assert.strictEqual(err1.code, "INVALID_IMAGE_DIMENSIONS");
  assert.strictEqual(err1.error, expectedError(1000, 1500));

  const err2 = batchRes.body.errors.find((e) => e.filename === "off-by-one.png");
  assert.ok(err2, "off-by-one.png must be in errors list");
  assert.strictEqual(err2.code, "INVALID_IMAGE_DIMENSIONS");
  assert.strictEqual(err2.error, expectedError(1025, 1536));

  console.log("  ✔ PASS: Batch upload accepted valid 1024×1536 image and reported exact reasons for 2 rejected files");

  // Single upload route verification (/api/admin/media/upload)
  const singleRejectRes = await apiPost("/api/admin/media/upload", {
    productId: "test-single-product",
    filename: "bad-dimensions.png",
    data: invalid1025x1536Base64,
    contentType: "image/png"
  });

  assert.strictEqual(singleRejectRes.status, 400, "Single upload with invalid dimensions must return 400 Bad Request");
  assert.strictEqual(singleRejectRes.body.code, "INVALID_IMAGE_DIMENSIONS");
  assert.strictEqual(singleRejectRes.body.message, expectedError(1025, 1536));
  console.log(`  ✔ PASS: /api/admin/media/upload rejected with: "${singleRejectRes.body.message}"`);

  server.close();

  // -------------------------------------------------------------------------
  // TEST 7: Catalogue Integrity Check
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 7: Catalogue Integrity Verification ---");
  const allProducts = store.getProducts({ includeInactive: true });
  assert.ok(allProducts.length >= 190, `Catalogue must contain all products (found: ${allProducts.length})`);
  console.log(`  ✔ PASS: Catalogue remains 100% intact (${allProducts.length} total products verified, ${store.getProducts().length} live storefront products)`);

  console.log("\n==========================================================================");
  console.log("  ALL STRICT PRODUCT IMAGE DIMENSION VALIDATION TESTS PASSED (100%)");
  console.log("==========================================================================");
}

runDimensionValidationTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  });
