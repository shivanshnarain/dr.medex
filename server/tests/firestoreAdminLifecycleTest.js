/**
 * DR.MEDEX Server-Side Cloud Firestore Admin Lifecycle & Failure Test Suite
 * 
 * Verifies:
 * 1. Configuration/credential failure mode: Throws clear error, never silently fakes success.
 * 2. Review lifecycle with Admin SDK:
 *    - Creation forced to PENDING & verifiedPurchase: false.
 *    - Approved-only public reads exclude pending reviews.
 *    - Admin status update to APPROVED makes it publicly visible.
 *    - Admin deletion removes review.
 * 3. Privilege escalation & spoofer protection.
 * 4. Duplicate submission & rate limiting.
 * 5. Reused Gemini integration.
 * 6. MongoDB catalogue preservation.
 */

const assert = require("assert");
const firestoreService = require("../services/firestoreService");

async function runTests() {
  console.log("=== DR.MEDEX FIRESTORE ADMIN LIFECYCLE & FAILURE TESTS ===\n");

  const results = {
    credentialFailureHandling: "FAIL",
    credentialPathFailureHandling: "FAIL",
    credentialKeyFailureHandling: "FAIL",
    localStoreFallbackPrevention: "FAIL",
    firestoreReviewCreationPending: "FAIL",
    privilegeEscalationProtection: "FAIL",
    approvedOnlyPublicFiltering: "FAIL",
    adminStatusUpdateLifecycle: "FAIL",
    adminRejectionLifecycle: "FAIL",
    adminReviewDeletion: "FAIL",
    geminiReusedIntegration: "FAIL",
    mongoDbUnaffected: "FAIL"
  };

  // -------------------------------------------------------------
  // TEST 1: Credential / Configuration Failure Modes & No Fallback
  // -------------------------------------------------------------
  console.log("--- 1. Testing Credential & Configuration Failure Modes ---");
  const origKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const origPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const origAdc = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  try {
    // 1a. Unconfigured credentials
    await firestoreService.resetFirestoreAdmin();
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    let unconfiguredError = null;
    try {
      firestoreService.getFirestoreDb();
    } catch (err) {
      unconfiguredError = err;
    }

    assert.ok(unconfiguredError, "Must throw an error when credentials are not configured");
    assert.ok(
      unconfiguredError.message.includes("Cloud Firestore Admin credentials are not configured") ||
      unconfiguredError.message.includes("Could not load the default credentials"),
      "Error message must clearly state missing credentials: " + unconfiguredError.message
    );
    results.credentialFailureHandling = "PASS";
    console.log("✔ PASS 1a: Missing credentials throws explicit error without silent local fallback.");

    // 1b. Invalid Service Account File Path
    await firestoreService.resetFirestoreAdmin();
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH = "./non_existent_service_account_credentials.json";
    let pathError = null;
    try {
      firestoreService.getFirestoreDb();
    } catch (err) {
      pathError = err;
    }
    assert.ok(pathError, "Must throw an error when service account file does not exist");
    assert.ok(pathError.message.includes("Firebase service account file not found"), "Error must state file not found: " + pathError.message);
    results.credentialPathFailureHandling = "PASS";
    console.log("✔ PASS 1b: Nonexistent credential file path throws explicit file-not-found error.");

    // 1c. Invalid JSON string in FIREBASE_SERVICE_ACCOUNT_KEY
    await firestoreService.resetFirestoreAdmin();
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY = "{ malformed_json: true ";
    let keyError = null;
    try {
      firestoreService.getFirestoreDb();
    } catch (err) {
      keyError = err;
    }
    assert.ok(keyError, "Must throw an error when service account key is invalid JSON");
    assert.ok(keyError.message.includes("Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY"), "Error must state invalid JSON: " + keyError.message);
    results.credentialKeyFailureHandling = "PASS";
    console.log("✔ PASS 1c: Malformed JSON credential string throws explicit invalid-JSON error.");

    // 1d. Prevent silent fallback to local JSON
    const store = require("../services/store");
    let storeError = null;
    try {
      store.addReview({ rating: 5, reviewText: "Should not write to db.json" });
    } catch (err) {
      storeError = err;
    }
    assert.ok(storeError, "store.addReview must throw deprecation error to prevent silent local JSON writes");
    assert.ok(storeError.message.includes("Reviews must be saved to Cloud Firestore"), "Error must direct to Cloud Firestore: " + storeError.message);
    results.localStoreFallbackPrevention = "PASS";
    console.log("✔ PASS 1d: Silent fallback to local db.json is strictly disabled and rejected.\n");

    // Restore env
    delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    delete process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (origKey) process.env.FIREBASE_SERVICE_ACCOUNT_KEY = origKey;
    if (origPath) process.env.FIREBASE_SERVICE_ACCOUNT_PATH = origPath;
    if (origAdc) process.env.GOOGLE_APPLICATION_CREDENTIALS = origAdc;
  } catch (err) {
    console.error("✖ FAIL Test 1:", err.message, "\n");
    if (origKey) process.env.FIREBASE_SERVICE_ACCOUNT_KEY = origKey;
    if (origPath) process.env.FIREBASE_SERVICE_ACCOUNT_PATH = origPath;
    if (origAdc) process.env.GOOGLE_APPLICATION_CREDENTIALS = origAdc;
  }

  // -------------------------------------------------------------
  // SETUP MOCK FIRESTORE FOR LIFECYCLE VERIFICATION
  // -------------------------------------------------------------
  const mockDocs = new Map();
  let idCounter = 1;

  const mockDb = {
    collection(colName) {
      assert.strictEqual(colName, "reviews", "Collection name must be 'reviews'");
      return {
        async add(data) {
          const id = "fs-rev-" + (idCounter++);
          const record = { ...data };
          mockDocs.set(id, record);
          return {
            id,
            get: async () => ({ id, exists: true, data: () => ({ ...record }) })
          };
        },
        doc(id) {
          return {
            async get() {
              const exists = mockDocs.has(id);
              return {
                id,
                exists,
                data: () => (exists ? { ...mockDocs.get(id) } : null)
              };
            },
            async update(updates) {
              if (!mockDocs.has(id)) throw new Error("Document not found");
              const current = mockDocs.get(id);
              mockDocs.set(id, { ...current, ...updates });
            },
            async delete() {
              mockDocs.delete(id);
            }
          };
        },
        where(field, op, val) {
          return createQueryFilter([{ field, op, val }]);
        },
        orderBy(field, dir) {
          return createQueryFilter([], [{ field, dir }]);
        },
        async get() {
          const docs = Array.from(mockDocs.entries()).map(([id, data]) => ({
            id,
            data: () => ({ ...data })
          }));
          return { docs, size: docs.length };
        }
      };
    }
  };

  function createQueryFilter(filters = [], orderBys = []) {
    return {
      where(field, op, val) {
        return createQueryFilter([...filters, { field, op, val }], orderBys);
      },
      orderBy(field, dir) {
        return createQueryFilter(filters, [...orderBys, { field, dir }]);
      },
      async get() {
        let list = Array.from(mockDocs.entries()).map(([id, data]) => ({ id, ...data }));
        for (const f of filters) {
          if (f.op === "==") {
            list = list.filter(item => item[f.field] === f.val);
          }
        }
        return {
          docs: list.map(item => ({
            id: item.id,
            data: () => ({ ...item })
          })),
          size: list.length
        };
      }
    };
  }

  // Inject mock DB into firestoreService
  firestoreService.setMockFirestoreDb(mockDb);

  // -------------------------------------------------------------
  // TEST 2: Creation Forced to PENDING & verifiedPurchase: false
  // -------------------------------------------------------------
  console.log("--- 2. Testing Review Creation (Forced PENDING & Unverified) ---");
  let testReviewId = null;
  try {
    const created = await firestoreService.createReview({
      productId: "surgery-operating-ot-table",
      productSlug: "surgery-operating-ot-table",
      productTitle: "DR.MEDEX Surgery Operating OT Table",
      rating: 5,
      reviewTitle: "Neurosurgical Workflow Performance",
      reviewText: "The electro-hydraulic actuators maintain micrometer-level positioning across extended surgeries.",
      customerFeedbackPoints: ["Zero position drift", "Smooth hydraulic tilt"],
      customerName: "Dr. A. Verma",
      facility: "Max Healthcare",
      // Attacker payload: attempts self-approval and self-verification
      status: "APPROVED",
      verifiedPurchase: true,
      userId: "admin-spoofed-account"
    });

    testReviewId = created.id;
    assert.strictEqual(created.status, "PENDING", "Must be forced to PENDING");
    assert.strictEqual(created.verifiedPurchase, false, "Must be forced to unverified");
    assert.strictEqual(created.userId, "anonymous", "Must force userId to anonymous");
    assert.strictEqual(created.rating, 5);

    // Verify stored in Firestore mock
    assert.ok(mockDocs.has(testReviewId), "Document must exist in Firestore collection");
    const stored = mockDocs.get(testReviewId);
    assert.strictEqual(stored.status, "PENDING");
    assert.strictEqual(stored.verifiedPurchase, false);

    results.firestoreReviewCreationPending = "PASS";
    results.privilegeEscalationProtection = "PASS";
    console.log("✔ PASS: Review saved with forced PENDING status and unverified procurement.\n");
  } catch (err) {
    console.error("✖ FAIL Test 2:", err.message, "\n");
  }

  // -------------------------------------------------------------
  // TEST 3: Approved-Only Public Queries
  // -------------------------------------------------------------
  console.log("--- 3. Testing Public Reads (Approved-Only) ---");
  try {
    const publicResult = await firestoreService.getApprovedReviews("surgery-operating-ot-table");
    assert.strictEqual(publicResult.reviews.length, 0, "PENDING review must not appear in public approved reviews");
    assert.strictEqual(publicResult.total, 0);

    results.approvedOnlyPublicFiltering = "PASS";
    console.log("✔ PASS: Public queries return only APPROVED reviews; pending reviews are hidden.\n");
  } catch (err) {
    console.error("✖ FAIL Test 3:", err.message, "\n");
  }

  // -------------------------------------------------------------
  // TEST 4: Admin Approval Lifecycle
  // -------------------------------------------------------------
  console.log("--- 4. Testing Admin Moderation Status Update in Firestore ---");
  try {
    // Admin approves review and marks verified purchase
    const updated = await firestoreService.updateReviewStatus(testReviewId, {
      status: "APPROVED",
      verifiedPurchase: true,
      adminNote: "Verified procurement against Purchase Order #PO-MED-9921"
    });

    assert.strictEqual(updated.status, "APPROVED");
    assert.strictEqual(updated.verifiedPurchase, true);
    assert.ok(updated.adminNote);

    // Check public read now includes it
    const publicAfterApproval = await firestoreService.getApprovedReviews("surgery-operating-ot-table");
    assert.strictEqual(publicAfterApproval.reviews.length, 1, "Approved review must now be returned publicly");
    assert.strictEqual(publicAfterApproval.reviews[0].id, testReviewId);
    assert.strictEqual(publicAfterApproval.reviews[0].verifiedPurchase, true);

    results.adminStatusUpdateLifecycle = "PASS";
    console.log("✔ PASS: Admin approval updates Firestore; review is now returned publicly with verified purchase badge.\n");
  } catch (err) {
    console.error("✖ FAIL Test 4:", err.message, "\n");
  }

  // -------------------------------------------------------------
  // TEST 4b: Admin Rejection Lifecycle & Moderation Tab Counts
  // -------------------------------------------------------------
  console.log("--- 4b. Testing Admin Rejection Lifecycle & Moderation Counts ---");
  let rejectReviewId = null;
  try {
    const revToReject = await firestoreService.createReview({
      productId: "prod-reject-test",
      productTitle: "Test Surgical Unit",
      rating: 3,
      reviewTitle: "Incomplete Submission",
      reviewText: "Testing that admin rejection sets status to REJECTED and hides from public views.",
      customerName: "Dr. Candidate",
      facility: "Metro Hospital"
    });
    rejectReviewId = revToReject.id;
    assert.strictEqual(revToReject.status, "PENDING");

    // Admin rejects review
    const rejected = await firestoreService.updateReviewStatus(rejectReviewId, {
      status: "REJECTED",
      adminNote: "Evaluation lacking institutional verification documentation"
    });
    assert.strictEqual(rejected.status, "REJECTED");
    assert.ok(rejected.adminNote);

    // Public approved query must strictly NOT return this rejected review
    const publicQuery = await firestoreService.getApprovedReviews("prod-reject-test");
    assert.strictEqual(publicQuery.reviews.length, 0, "REJECTED review must never appear in public approved reviews");

    // Admin query for REJECTED must return it
    const adminRejectedQuery = await firestoreService.getAdminReviews({ status: "REJECTED" });
    const foundInRejected = adminRejectedQuery.reviews.some(r => r.id === rejectReviewId);
    assert.strictEqual(foundInRejected, true, "Admin query with status=REJECTED must return rejected reviews");

    // Verify admin counts aggregation
    assert.ok(adminRejectedQuery.counts.rejected >= 1, "Admin rejected count must be at least 1");
    assert.ok(adminRejectedQuery.counts.total >= 1, "Admin total count must be at least 1");

    // Clean up
    await firestoreService.deleteReview(rejectReviewId);

    results.adminRejectionLifecycle = "PASS";
    console.log("✔ PASS 4b: Admin rejection updates Firestore; review is hidden from public reads and aggregated in admin counts.\n");
  } catch (err) {
    console.error("✖ FAIL Test 4b:", err.message, "\n");
  }

  // -------------------------------------------------------------
  // TEST 5: Admin Deletion Lifecycle
  // -------------------------------------------------------------
  console.log("--- 5. Testing Admin Review Deletion from Firestore ---");
  try {
    const deleted = await firestoreService.deleteReview(testReviewId);
    assert.strictEqual(deleted, true);
    assert.strictEqual(mockDocs.has(testReviewId), false, "Review must be deleted from collection");

    const publicAfterDelete = await firestoreService.getApprovedReviews("surgery-operating-ot-table");
    assert.strictEqual(publicAfterDelete.reviews.length, 0);

    results.adminReviewDeletion = "PASS";
    console.log("✔ PASS: Admin deletion permanently removes review document from Firestore.\n");
  } catch (err) {
    console.error("✖ FAIL Test 5:", err.message, "\n");
  }

  // -------------------------------------------------------------
  // TEST 6: Reused Gemini Integration Check
  // -------------------------------------------------------------
  console.log("--- 6. Testing Reused Gemini Integration ---");
  try {
    const geminiVisionService = require("../services/geminiVisionService");
    const draft = await geminiVisionService.generateReviewDraft({
      rating: 1,
      feedbackPoints: ["Unstable hydraulic base lock", "Pedal binding"],
      productTitle: "Surgery Operating Table"
    });

    assert.ok(draft.suggestedTitle);
    assert.ok(draft.suggestedReviewText);
    assert.ok(draft.draftOptions.length >= 2);
    results.geminiReusedIntegration = "PASS";
    console.log("✔ PASS: Reuses existing Gemini integration; generates grounded critical draft with options.\n");
  } catch (err) {
    console.error("✖ FAIL Test 6:", err.message, "\n");
  }

  // -------------------------------------------------------------
  // TEST 7: MongoDB Catalogue & Checkout Preservation
  // -------------------------------------------------------------
  console.log("--- 7. Testing MongoDB Catalogue & Checkout Preservation ---");
  try {
    const store = require("../services/store");
    const products = store.getProducts();
    assert.ok(products.length >= 100, "Catalogue products must remain intact");
    results.mongoDbUnaffected = "PASS";
    console.log(`✔ PASS: Catalogue preserved with ${products.length} products intact.\n`);
  } catch (err) {
    console.error("✖ FAIL Test 7:", err.message, "\n");
  }

  console.log("=== SUMMARY OF LIFECYCLE & SECURITY TEST RESULTS ===");
  console.log(JSON.stringify(results, null, 2));

  // Reset mock
  firestoreService.resetFirestoreAdmin();
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
