/**
 * DR.MEDEX Verification Test: Redesigned Review System & Suggestions
 */

const assert = require("assert");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const geminiVisionService = require("../services/geminiVisionService");
const firestoreService = require("../services/firestoreService");

async function testSuggestionsAndPayload() {
  console.log("=== VERIFYING REVIEW REDESIGN, SUGGESTIONS & PAYLOAD ===\n");

  // 1. Verify 4-star review suggestions generation
  console.log("--- 1. Testing 4-Star Suggestions Generation ---");
  const suggestions4Star = await geminiVisionService.generateProductReviewSuggestions({
    productId: "surgery-operating-ot-table",
    productTitle: "DR.MEDEX Surgery Operating OT Table",
    category: "operating-theater",
    rating: 4
  });

  assert.ok(Array.isArray(suggestions4Star), "Suggestions must be an array");
  assert.strictEqual(suggestions4Star.length, 6, "Must provide exactly 6 suggestions");
  const themes = suggestions4Star.map(s => s.theme);
  assert.ok(themes.includes("Build Quality & Durability"), "Must include Build Quality & Durability");
  assert.ok(themes.includes("Ease of Operation"), "Must include Ease of Operation");
  assert.ok(themes.includes("Performance & Reliability"), "Must include Performance & Reliability");
  assert.ok(themes.includes("Ergonomics & Handling"), "Must include Ergonomics & Handling");
  assert.ok(themes.includes("Setup & Maintenance"), "Must include Setup & Maintenance");
  assert.ok(themes.includes("Value for Money"), "Must include Value for Money");
  console.log("✔ PASS: Generated 6 distinct 4-star suggestions covering all clinical themes.");

  // 2. Verify 5-star suggestions generation
  console.log("--- 2. Testing 5-Star Suggestions Generation ---");
  const suggestions5Star = await geminiVisionService.generateProductReviewSuggestions({
    productId: "surgery-operating-ot-table",
    productTitle: "DR.MEDEX Surgery Operating OT Table",
    category: "operating-theater",
    rating: 5
  });
  assert.strictEqual(suggestions5Star.length, 6, "5-star must provide 6 suggestions");
  console.log("✔ PASS: Generated 6 distinct 5-star suggestions.");

  // 3. Verify Customer Review Submission Without Mandatory Name/Facility
  console.log("--- 3. Testing Review Submission Without Name or Facility (Defaults to Email Prefix) ---");
  // Set up mock DB
  const mockDocs = new Map();
  let idGen = 1;
  const mockDb = {
    collection(col) {
      return {
        async add(data) {
          const id = "rev-" + idGen++;
          mockDocs.set(id, { ...data });
          return { id, get: async () => ({ id, exists: true, data: () => ({ ...mockDocs.get(id) }) }) };
        }
      };
    }
  };
  firestoreService.setMockFirestoreDb(mockDb);

  const createdReview = await firestoreService.createReview({
    productId: "surgery-operating-ot-table",
    productSlug: "surgery-operating-ot-table",
    productTitle: "DR.MEDEX Surgery Operating OT Table",
    rating: 4,
    reviewTitle: "Dependable Electro-Hydraulic Elevation",
    reviewText: "The hydraulic cylinders maintain smooth vertical travel without vibration during fine micro-dissections.",
    userEmail: "surgeon.alvarez@memorialhospital.org",
    aiAssisted: true
  });

  assert.ok(createdReview.id, "Must return created review ID");
  assert.strictEqual(createdReview.status, "PENDING", "Must force PENDING status");
  assert.strictEqual(createdReview.verifiedPurchase, false, "Must force unverified purchase");
  assert.strictEqual(createdReview.userEmail, "surgeon.alvarez@memorialhospital.org", "Must store customer userEmail");
  assert.strictEqual(createdReview.customerName, "surgeon.alvarez", "Must default customerName from email");
  console.log("✔ PASS: Review created with forced PENDING, unverified procurement, and email-based identity.");

  console.log("\n=== ALL REDESIGN VERIFICATION TESTS PASSED ===");
}

testSuggestionsAndPayload().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
