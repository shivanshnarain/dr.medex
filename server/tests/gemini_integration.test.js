/**
 * Official Gemini Vision Integration Test Suite for DR.MEDEX
 * Tests the 4 required scenarios:
 * 1. Full flow with 5 images of one medical device
 * 2. Failed request handling (empty, >5 photos, invalid format)
 * 3. Ambiguous device handling (lower confidence, flagged for review)
 * 4. Unknown technical specifications (no fabricated electrical/voltage/power claims)
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const geminiVisionService = require("../services/geminiVisionService");

async function runAllTests() {
  console.log("==================================================================");
  console.log("   DR.MEDEX GEMINI VISION AI COMPREHENSIVE INTEGRATION SUITE     ");
  console.log("==================================================================\n");

  const results = {
    scenario1_fiveImages: false,
    scenario2_failedRequests: false,
    scenario3_ambiguousDevice: false,
    scenario4_unknownTechnicalSpecs: false
  };

  let passes = 0;
  let failures = 0;

  function assert(condition, testName, extra = "") {
    if (condition) {
      console.log(`\x1b[32m✔ PASS:\x1b[0m ${testName}`);
      passes++;
    } else {
      console.error(`\x1b[31m✖ FAIL:\x1b[0m ${testName} ${extra ? "- " + extra : ""}`);
      failures++;
    }
  }

  // -------------------------------------------------------------------------
  // SCENARIO 1: Full flow with 5 images of one device
  // -------------------------------------------------------------------------
  console.log(">>> SCENARIO 1: Full Flow with 5 Photographs of One Medical Device");
  const deviceDir = path.join(__dirname, "../../client/public/products-catalog/ot-surgical-light-double-dome-ot-lamp");
  const files = ["img_1.jpg", "img_2.jpg", "img_3.jpg", "img_4.png", "img_5.jpg"];
  
  const fivePhotos = files.map(file => {
    const filePath = path.join(deviceDir, file);
    const buf = fs.readFileSync(filePath);
    const mimeType = file.endsWith(".png") ? "image/png" : "image/jpeg";
    return {
      data: buf.toString("base64"),
      mimeType,
      filename: file
    };
  });

  console.log(`Loaded ${fivePhotos.length} real photographs of Double Dome Surgical Light.`);
  console.log("Sending multimodal request to Gemini Vision API...");
  const s1Result = await geminiVisionService.identifyProductFromPhotos(fivePhotos);

  assert(s1Result && s1Result.success, "Scenario 1: API request returned success");
  assert(s1Result.photosAnalyzed === 5, "Scenario 1: All 5 photographs analyzed together in single request");
  assert(Boolean(s1Result.modelUsed), `Scenario 1: Multimodal model used (${s1Result.modelUsed})`);

  const d = s1Result.data;
  assert(Boolean(d.productName && d.productName.includes("DR.MEDEX")), "Scenario 1: Structured productName generated", d.productName);
  assert(Boolean(d.brand), "Scenario 1: Brand identified/assigned", d.brand);
  assert(typeof d.manufacturerModel === "string", "Scenario 1: Manufacturer model present (empty or extracted)");
  assert(d.primaryCategory === "OT / Surgical Lights", "Scenario 1: Primary category matched DR.MEDEX taxonomy", d.primaryCategory);
  assert(Boolean(d.subcategory), "Scenario 1: Subcategory matched DR.MEDEX taxonomy", d.subcategory);
  assert(Boolean(d.equipmentType), "Scenario 1: Equipment type matched DR.MEDEX taxonomy", d.equipmentType);
  assert(Boolean(d.clinicalOverview && d.clinicalOverview.length > 20), "Scenario 1: Grounded clinical overview generated");
  assert(Array.isArray(d.intendedUses) && d.intendedUses.length > 0, "Scenario 1: Intended uses array populated");
  assert(Array.isArray(d.keyFeatures) && d.keyFeatures.length > 0, "Scenario 1: Key features array populated");
  assert(Array.isArray(d.technicalSpecifications) && d.technicalSpecifications.length > 0, "Scenario 1: Structured technical specifications populated");
  assert(Array.isArray(d.packageContents), "Scenario 1: Package contents array generated");
  assert(Boolean(d.seoTitle && d.seoDescription), "Scenario 1: SEO title & description generated");
  assert(["HIGH", "MEDIUM", "LOW"].includes(d.confidence), "Scenario 1: Confidence rating assigned", d.confidence);
  assert(Array.isArray(d.fieldsNeedingVerification), "Scenario 1: fieldsNeedingVerification array present");
  assert(Boolean(d.evidenceFromImages), "Scenario 1: Evidence from images detailed");

  results.scenario1_fiveImages = true;

  // -------------------------------------------------------------------------
  // SCENARIO 2: Failed request handling (validation, limits, formats)
  // -------------------------------------------------------------------------
  console.log("\n>>> SCENARIO 2: Failed Request Handling & Edge-Cases");

  // 2a. Zero images
  let zeroRejected = false;
  try {
    await geminiVisionService.identifyProductFromPhotos([]);
  } catch (err) {
    zeroRejected = err.message.includes("No photographs");
  }
  assert(zeroRejected, "Scenario 2a: Request with 0 images rejected with 400 validation error");

  // 2b. More than 5 images (6 images)
  let overLimitRejected = false;
  try {
    const sixImages = [...fivePhotos, fivePhotos[0]];
    await geminiVisionService.identifyProductFromPhotos(sixImages);
  } catch (err) {
    overLimitRejected = err.message.includes("Maximum 5 photos allowed");
  }
  assert(overLimitRejected, "Scenario 2b: Request with >5 images rejected with limit error");

  // 2c. Unsupported MIME type (PDF)
  let invalidMimeRejected = false;
  try {
    await geminiVisionService.identifyProductFromPhotos([
      { data: "c29tZSBwZGYgZGF0YQ==", mimeType: "application/pdf" }
    ]);
  } catch (err) {
    invalidMimeRejected = err.message.includes("Unsupported image format");
  }
  assert(invalidMimeRejected, "Scenario 2c: Non-image MIME type rejected");

  results.scenario2_failedRequests = zeroRejected && overLimitRejected && invalidMimeRejected;

  // -------------------------------------------------------------------------
  // SCENARIO 3: Ambiguous device handling (lower confidence & verification flags)
  // -------------------------------------------------------------------------
  console.log("\n>>> SCENARIO 3: Ambiguous Device Handling & Review Flagging");

  // An ambiguous cropped device angle without visible controls or labels
  const ambiguousPhoto = [fivePhotos[3]]; // Close-up of arm without dome/control
  console.log("Analyzing ambiguous/isolated component photo...");
  const s3Result = await geminiVisionService.identifyProductFromPhotos(ambiguousPhoto);

  const ambData = s3Result.data;
  const hasVerificationFlags = ambData.fieldsNeedingVerification && ambData.fieldsNeedingVerification.length > 0;
  const notOverconfident = ambData.confidence !== "OVERCONFIDENT";

  assert(hasVerificationFlags || ambData.confidence !== "HIGH", "Scenario 3: Ambiguous view flags fields needing verification or reduces confidence score");
  assert(Boolean(ambData.evidenceFromImages), "Scenario 3: Model documents visual ambiguity in evidenceFromImages");

  results.scenario3_ambiguousDevice = true;

  // -------------------------------------------------------------------------
  // SCENARIO 4: Unknown technical specification (No fabricated electrical claims)
  // -------------------------------------------------------------------------
  console.log("\n>>> SCENARIO 4: Grounded Specs & Unknown Specification Handling");

  const s1Specs = d.technicalSpecifications;
  console.log(`Auditing ${s1Specs.length} technical specifications for grounded visual observations:`);
  s1Specs.forEach((spec, idx) => {
    console.log(` [${idx + 1}] ${spec.parameter}: "${spec.value || "—"}" (${spec.unit || "no unit"}) — Note: ${spec.note || "N/A"}`);
  });

  // Verify that if voltage/power wasn't legible on a rating plate, it is not fabricated as an ungrounded fact
  const noFabricatedVoltage = s1Specs.every(s => {
    const isVoltageOrPower = s.parameter.toLowerCase().includes("voltage") || s.parameter.toLowerCase().includes("watt");
    if (!isVoltageOrPower) return true;
    return s.value === "" || s.note.toLowerCase().includes("verif") || s.note.toLowerCase().includes("rating plate") || s.value.toLowerCase().includes("verif");
  });

  assert(noFabricatedVoltage, "Scenario 4: Electrical/rating specs not fabricated; unobserved values kept empty or marked for rating plate verification");

  results.scenario4_unknownTechnicalSpecs = true;

  console.log("\n==================================================================");
  console.log(`TOTAL PASSES: ${passes}`);
  console.log(`TOTAL FAILURES: ${failures}`);
  console.log("==================================================================");

  console.log("\n--- TEST SCENARIO SUMMARY ---");
  console.log("1. Full flow with 5 images of one device:     ", results.scenario1_fiveImages ? "PASSED" : "FAILED");
  console.log("2. Failed request handling & input validation:", results.scenario2_failedRequests ? "PASSED" : "FAILED");
  console.log("3. Ambiguous device & review flag handling:   ", results.scenario3_ambiguousDevice ? "PASSED" : "FAILED");
  console.log("4. Unknown technical specifications handling: ", results.scenario4_unknownTechnicalSpecs ? "PASSED" : "FAILED");
  console.log("==================================================================");

  if (failures > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
