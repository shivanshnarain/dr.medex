const assert = require("assert");
const mediaService = require("../services/mediaService");

async function runExtensionlessTests() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX EXTENSIONLESS PRODUCT IMAGE UPLOAD TEST SUITE");
  console.log("==========================================================================");

  // 1. Valid JPEG data (1024x1536 JPEG bytes matching strict required dimensions)
  const jpegBuffer = Buffer.from([
    0xFF, 0xD8,
    0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
    0xFF, 0xDB, 0x00, 0x43, 0x00,
    ...new Array(64).fill(1),
    0xFF, 0xC0, 0x00, 0x0B, 0x08,
    0x06, 0x00, // height = 1536 (0x0600)
    0x04, 0x00, // width = 1024 (0x0400)
    0x01, 0x01, 0x11, 0x00,
    0xFF, 0xC4, 0x00, 0x1F, 0x00,
    ...new Array(29).fill(0),
    0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
    0xBF, 0x80,
    0xFF, 0xD9
  ]);

  // 2. Valid PNG data (1024x1536 PNG bytes matching strict required dimensions)
  const zlib = require("zlib");
  function createTestPng(width, height) {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;
    ihdrData[9] = 2;
    ihdrData[10] = 0;
    ihdrData[11] = 0;
    ihdrData[12] = 0;

    let crc = 0xffffffff;
    const ihdrFull = Buffer.concat([Buffer.from("IHDR"), ihdrData]);
    for (let i = 0; i < ihdrFull.length; i++) {
      crc ^= ihdrFull[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
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
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
      }
    }
    const idatCrc = Buffer.alloc(4);
    idatCrc.writeUInt32BE((crc ^ 0xffffffff) >>> 0, 0);

    const idatLength = Buffer.alloc(4);
    idatLength.writeUInt32BE(compressed.length, 0);
    const idatChunk = Buffer.concat([idatLength, Buffer.from("IDAT"), compressed, idatCrc]);
    const iendChunk = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  }
  const pngBuffer = createTestPng(1024, 1536);

  // 3. Fake non-image file renamed to C1 (e.g. plain text or executable bytes)
  const fakeNonImageBuffer = Buffer.from("THIS_IS_A_TEXT_DOCUMENT_NOT_AN_IMAGE_CONTENT");

  console.log("\n--- TEST 1: Binary Format Detection (Magic Bytes) ---");
  const detectJpeg = mediaService.detectImageFormatFromBuffer(jpegBuffer);
  assert.strictEqual(detectJpeg.isValid, true, "JPEG must be detected as valid");
  assert.strictEqual(detectJpeg.detectedMime, "image/jpeg", "JPEG must have image/jpeg MIME");
  assert.strictEqual(detectJpeg.detectedExt, "jpg", "JPEG must have jpg extension");
  console.log("  ✔ PASS: JPEG magic bytes detected correctly:", detectJpeg);

  const detectPng = mediaService.detectImageFormatFromBuffer(pngBuffer);
  assert.strictEqual(detectPng.isValid, true, "PNG must be detected as valid");
  assert.strictEqual(detectPng.detectedMime, "image/png", "PNG must have image/png MIME");
  assert.strictEqual(detectPng.detectedExt, "png", "PNG must have png extension");
  console.log("  ✔ PASS: PNG magic bytes detected correctly:", detectPng);

  const detectFake = mediaService.detectImageFormatFromBuffer(fakeNonImageBuffer);
  assert.strictEqual(detectFake.isValid, false, "Non-image buffer must be rejected as invalid");
  console.log("  ✔ PASS: Fake non-image file correctly rejected:", detectFake);

  console.log("\n--- TEST 2: Extensionless Filename Normalization ---");
  const normC1 = mediaService.normalizeFilenameAndMime("C1", "application/octet-stream", "jpg");
  assert.strictEqual(normC1.cleanName, "C1.jpg", "C1 must be normalized to C1.jpg");
  assert.strictEqual(normC1.mimeType, "image/jpeg", "MIME must be image/jpeg");
  console.log("  ✔ PASS: C1 -> " + normC1.cleanName + " (" + normC1.mimeType + ")");

  const normC2 = mediaService.normalizeFilenameAndMime("C2", "application/octet-stream", "png");
  assert.strictEqual(normC2.cleanName, "C2.png", "C2 must be normalized to C2.png");
  assert.strictEqual(normC2.mimeType, "image/png", "MIME must be image/png");
  console.log("  ✔ PASS: C2 -> " + normC2.cleanName + " (" + normC2.mimeType + ")");

  const normMedical = mediaService.normalizeFilenameAndMime("MedicalDevice", "", "webp");
  assert.strictEqual(normMedical.cleanName, "MedicalDevice.webp", "MedicalDevice must be normalized to MedicalDevice.webp");
  console.log("  ✔ PASS: MedicalDevice -> " + normMedical.cleanName);

  console.log("\n--- TEST 3: Upload Extensionless JPEG (C1) ---");
  const uploadC1 = await mediaService.uploadProductImage(jpegBuffer, "C1", "application/octet-stream", "test-product-c1");
  assert.ok(uploadC1.url, "Must return valid URL for C1");
  assert.strictEqual(uploadC1.status, "READY", "Status must be READY");
  console.log("  ✔ PASS: C1 uploaded successfully -> " + uploadC1.url);

  console.log("\n--- TEST 4: Upload Extensionless PNG (C2) ---");
  const uploadC2 = await mediaService.uploadProductImage(pngBuffer, "C2", "application/octet-stream", "test-product-c2");
  assert.ok(uploadC2.url, "Must return valid URL for C2");
  assert.strictEqual(uploadC2.status, "READY", "Status must be READY");
  console.log("  ✔ PASS: C2 uploaded successfully -> " + uploadC2.url);

  console.log("\n--- TEST 5: Upload Standard Image with Extension ---");
  const uploadStandard = await mediaService.uploadProductImage(jpegBuffer, "standard_photo.jpg", "image/jpeg", "test-product-standard");
  assert.ok(uploadStandard.url, "Must return valid URL for standard_photo.jpg");
  console.log("  ✔ PASS: standard_photo.jpg uploaded successfully -> " + uploadStandard.url);

  console.log("\n--- TEST 6: Reject Disguised Non-Image / Corrupted File Renamed to C1 ---");
  let rejected = false;
  try {
    await mediaService.uploadProductImage(fakeNonImageBuffer, "C1", "image/jpeg", "test-product-fake");
  } catch (err) {
    rejected = true;
    console.log("  ✔ PASS: Disguised non-image safely rejected with error:", err.message);
  }
  assert.strictEqual(rejected, true, "Disguised file renamed to C1 MUST be rejected by server");

  console.log("\n==========================================================================");
  console.log("  ALL EXTENSIONLESS IMAGE UPLOAD TESTS PASSED WITH 100% SUCCESS!");
  console.log("==========================================================================");
}

runExtensionlessTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
