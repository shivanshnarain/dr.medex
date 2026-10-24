const assert = require("assert");
const mediaService = require("../services/mediaService");

async function runExtensionlessTests() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX EXTENSIONLESS PRODUCT IMAGE UPLOAD TEST SUITE");
  console.log("==========================================================================");

  // 1. Valid JPEG data (1x1 transparent JPEG minimal bytes)
  const jpegBuffer = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
    0x00, 0xBF, 0x80, 0xFF, 0xD9
  ]);

  // 2. Valid PNG data (1x1 PNG minimal bytes)
  const pngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const pngBuffer = Buffer.from(pngBase64.replace("data:image/png;base64,", ""), "base64");

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
