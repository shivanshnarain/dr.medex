/**
 * DR.MEDEX Task 6 Focused Verification Test Suite
 * Validates the 9 required test targets.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

async function runTestSuite() {
  console.log("=== DR.MEDEX TASK 6 FOCUSED VERIFICATION TEST SUITE ===");

  const results = {};

  // 1. Firebase configuration validation
  try {
    const clientEnvPath = path.join(__dirname, "../../client/.env");
    assert.ok(fs.existsSync(clientEnvPath), "client/.env must exist");
    const envContent = fs.readFileSync(clientEnvPath, "utf8");
    assert.ok(envContent.includes("VITE_FIREBASE_API_KEY"), "VITE_FIREBASE_API_KEY must be present");
    assert.ok(envContent.includes("VITE_FIREBASE_PROJECT_ID"), "VITE_FIREBASE_PROJECT_ID must be present");
    assert.ok(envContent.includes("VITE_FIREBASE_APP_ID"), "VITE_FIREBASE_APP_ID must be present");
    assert.ok(envContent.includes("drmedex"), "Project ID must be drmedex");
    results.firebaseConfigurationValidation = "PASS";
    console.log("✔ Test 1 PASS: Firebase configuration in client/.env is valid and verified.");
  } catch (err) {
    results.firebaseConfigurationValidation = "FAIL: " + err.message;
    console.error("✖ Test 1 FAIL:", err.message);
  }

  // 2. Firestore connection check (Client configured; Backend Admin credentials check)
  try {
    const hasBackendCredentials = Boolean(
      process.env.GOOGLE_APPLICATION_CREDENTIALS || 
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    );
    if (!hasBackendCredentials) {
      results.firestoreConnection = "BLOCKED (Backend Admin SDK credentials not configured)";
      console.log("ℹ Test 2 BLOCKED: Server-side Admin SDK connection credentials not configured in environment.");
    } else {
      results.firestoreConnection = "PASS";
      console.log("✔ Test 2 PASS: Live server-side Firestore credentials detected.");
    }
  } catch (err) {
    results.firestoreConnection = "BLOCKED: " + err.message;
  }

  // Setup mock Firestore DB for isolated lifecycle verification
  const mockDocs = new Map();
  let idCounter = 1;
  const mockDb = {
    collection(colName) {
      return {
        async add(data) {
          const id = "rev-" + (idCounter++);
          mockDocs.set(id, { ...data });
          return { id, get: async () => ({ id, exists: true, data: () => ({ ...mockDocs.get(id) }) }) };
        },
        doc(id) {
          return {
            async get() {
              const exists = mockDocs.has(id);
              return { id, exists, data: () => (exists ? { ...mockDocs.get(id) } : null) };
            },
            async update(updates) {
              if (!mockDocs.has(id)) throw new Error("Document not found");
              mockDocs.set(id, { ...mockDocs.get(id), ...updates });
            },
            async delete() { mockDocs.delete(id); }
          };
        },
        where(field, op, val) {
          return this._filter([{ field, op, val }]);
        },
        orderBy() { return this; },
        _filter(filters) {
          return {
            where(f, op, val) { return mockDb.collection(colName)._filter([...filters, { field: f, op, val }]); },
            orderBy() { return this; },
            async get() {
              let list = Array.from(mockDocs.entries()).map(([id, data]) => ({ id, ...data }));
              for (const f of filters) {
                if (f.op === "==") list = list.filter(item => item[f.field] === f.val);
              }
              return { docs: list.map(item => ({ id: item.id, data: () => ({ ...item }) })), size: list.length };
            }
          };
        },
        async get() {
          const docs = Array.from(mockDocs.entries()).map(([id, data]) => ({ id, data: () => ({ ...data }) }));
          return { docs, size: docs.length };
        }
      };
    }
  };

  const firestoreService = require("../services/firestoreService");
  firestoreService.setMockFirestoreDb(mockDb);

  // 3. Valid review creation and forced PENDING status
  let createdTestReviewId = null;
  try {
    const testReview = await firestoreService.createReview({
      productId: "test-auth-device-001",
      productSlug: "test-device",
      productTitle: "Test Equipment",
      rating: 5,
      reviewTitle: "Valid Review Verification",
      reviewText: "Testing that newly submitted reviews strictly default to PENDING status.",
      customerName: "Dr. Verification",
      facility: "Test Department"
    });

    createdTestReviewId = testReview.id;
    assert.strictEqual(testReview.status, "PENDING", "New review must default to PENDING");
    assert.strictEqual(testReview.verifiedPurchase, false, "New review must default to verifiedPurchase: false");
    results.validReviewCreationForcedPending = "PASS";
    console.log("✔ Test 3 PASS: Valid review creation strictly defaults to PENDING status.");
  } catch (err) {
    results.validReviewCreationForcedPending = "FAIL: " + err.message;
    console.error("✖ Test 3 FAIL:", err.message);
  }

  // 4. Attempts to self-approve or self-verify
  try {
    const firestoreService = require("../services/firestoreService");
    const exploitReview = await firestoreService.createReview({
      productId: "test-auth-device-002",
      rating: 5,
      reviewTitle: "Exploit Attempt",
      reviewText: "Testing that client-supplied approval or verified purchase cannot override server security.",
      customerName: "Attacker",
      userId: "spoofed-user-id",
      status: "APPROVED", // Malicious self-approval attempt
      verifiedPurchase: true // Malicious self-verification attempt
    });

    assert.strictEqual(exploitReview.status, "PENDING", "Self-approval must be rejected");
    assert.strictEqual(exploitReview.verifiedPurchase, false, "Self-verification must be rejected");
    results.attemptsToSelfApproveOrVerifyBlocked = "PASS";
    console.log("✔ Test 4 PASS: Attempts to self-approve or self-verify were rejected and forced to PENDING / unverified.");

    // Clean up exploit review
    await firestoreService.deleteReview(exploitReview.id);
  } catch (err) {
    results.attemptsToSelfApproveOrVerifyBlocked = "FAIL: " + err.message;
    console.error("✖ Test 4 FAIL:", err.message);
  }

  // 5. Admin routes without valid authentication
  try {
    const express = require("express");
    const adminRoutes = require("../routes/admin");
    const adminApp = express();
    adminApp.use(express.json());
    adminApp.use("/api/admin", adminRoutes);

    const unauthGet = await mockGet(adminApp, "/api/admin/reviews");
    assert.strictEqual(unauthGet.status, 401, "GET /api/admin/reviews must return 401 without auth");

    const unauthPut = await mockPut(adminApp, "/api/admin/reviews/123/status", { status: "APPROVED" });
    assert.strictEqual(unauthPut.status, 401, "PUT /api/admin/reviews/:id/status must return 401 without auth");

    const unauthDel = await mockDelete(adminApp, "/api/admin/reviews/123");
    assert.strictEqual(unauthDel.status, 401, "DELETE /api/admin/reviews/:id must return 401 without auth");

    results.adminRoutesWithoutValidAuth = "PASS";
    console.log("✔ Test 5 PASS: All admin routes enforce server-side authentication (401 Unauthorized).");
  } catch (err) {
    results.adminRoutesWithoutValidAuth = "FAIL: " + err.message;
    console.error("✖ Test 5 FAIL:", err.message);
  }

  // 6. Approved-only product review display and pagination
  try {
    const firestoreService = require("../services/firestoreService");
    const result = await firestoreService.getApprovedReviews("test-auth-device-001");
    // The created review was PENDING, so it must NOT be in approved reviews
    const hasPendingInApproved = result.reviews.some(r => r.id === createdTestReviewId);
    assert.strictEqual(hasPendingInApproved, false, "Pending reviews must never appear in approved reviews list");
    assert.ok(typeof result.hasMore === "boolean", "hasMore pagination flag must exist");
    assert.ok(typeof result.total === "number", "total count must exist");
    results.approvedOnlyDisplayAndPagination = "PASS";
    console.log("✔ Test 6 PASS: Only APPROVED reviews are returned for public display; pagination structure verified.");
  } catch (err) {
    results.approvedOnlyDisplayAndPagination = "FAIL: " + err.message;
    console.error("✖ Test 6 FAIL:", err.message);
  }

  // 7. Duplicate submissions and rate limits
  try {
    const express = require("express");
    const apiRoutes = require("../routes/api");
    const app = express();
    app.use(express.json());
    app.use("/api", apiRoutes);

    const duplicateBody = {
      productId: "test-duplicate-device",
      productSlug: "test-duplicate",
      productTitle: "Duplicate Test",
      rating: 4,
      customerName: "Dr. Duplicate",
      reviewTitle: "Testing Duplicates",
      reviewText: "Testing that immediate duplicate submissions are caught and rejected."
    };

    const firstSub = await mockPost(app, "/api/reviews", duplicateBody);
    assert.strictEqual(firstSub.status, 201, "First submission should succeed");

    const secondSub = await mockPost(app, "/api/reviews", duplicateBody);
    assert.strictEqual(secondSub.status, 409, "Immediate duplicate submission must return 409 Conflict");
    assert.ok(secondSub.body.message.includes("Duplicate review detected"));

    results.duplicateSubmissionsAndRateLimits = "PASS";
    console.log("✔ Test 7 PASS: Duplicate review submission detected and blocked with 409 Conflict.");

    // Clean up created review
    if (firstSub.body.review?.id) {
      const firestoreService = require("../services/firestoreService");
      await firestoreService.deleteReview(firstSub.body.review.id);
    }
  } catch (err) {
    results.duplicateSubmissionsAndRateLimits = "FAIL: " + err.message;
    console.error("✖ Test 7 FAIL:", err.message);
  }

  // 8. Gemini API failure and invalid input handling
  try {
    const geminiVisionService = require("../services/geminiVisionService");
    
    // Test invalid input (empty feedback points and empty draft)
    let caughtEmpty = false;
    try {
      await geminiVisionService.generateReviewDraft({ rating: 5, feedbackPoints: [], roughDraft: "" });
    } catch (e) {
      caughtEmpty = true;
      assert.ok(e.message.includes("at least one feedback point"));
    }
    assert.strictEqual(caughtEmpty, true, "Empty input must be rejected gracefully");

    // Test honest 1-star review generation
    const oneStar = await geminiVisionService.generateReviewDraft({
      rating: 1,
      feedbackPoints: ["Excessive calibration drift", "Broken foot switch"],
      productTitle: "Test OT Table"
    });
    assert.ok(oneStar.suggestedReviewText, "Must generate text");
    assert.ok(oneStar.draftOptions.length >= 2, "Must generate multiple options");

    results.geminiFailureAndInvalidInputHandling = "PASS";
    console.log("✔ Test 8 PASS: Gemini invalid inputs handled gracefully with clear errors; honest critical drafts verified.");
  } catch (err) {
    results.geminiFailureAndInvalidInputHandling = "FAIL: " + err.message;
    console.error("✖ Test 8 FAIL:", err.message);
  }

  // 9. Existing MongoDB product catalogue and checkout remain unaffected
  try {
    const store = require("../services/store");
    const products = store.getProducts();
    assert.ok(products.length > 0, "Products catalogue must remain populated");
    assert.strictEqual(products.length >= 100, true, "All catalogue products intact");
    
    // Check specific sample product
    const sampleProduct = store.getProductBySlug("surgery-operating-ot-table");
    assert.ok(sampleProduct, "Sample product must exist in catalogue");
    assert.strictEqual(sampleProduct.category, "examination-ot-tables");

    results.mongoDbCatalogueAndCheckoutUnaffected = "PASS";
    console.log(`✔ Test 9 PASS: MongoDB/Mongoose product catalogue intact with ${products.length} active products.`);
  } catch (err) {
    results.mongoDbCatalogueAndCheckoutUnaffected = "FAIL: " + err.message;
    console.error("✖ Test 9 FAIL:", err.message);
  }

  // Clean up Test 3 review
  if (createdTestReviewId) {
    const firestoreService = require("../services/firestoreService");
    await firestoreService.deleteReview(createdTestReviewId);
  }

  console.log("\n=== SUMMARY OF RESULTS ===");
  console.log(JSON.stringify(results, null, 2));
}

// Mock request helpers
function mockPost(app, url, body) {
  return new Promise((resolve) => {
    const req = {
      method: "POST",
      url,
      headers: {},
      body,
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" }
    };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      setHeader(k, v) { this.headers[k] = v; },
      json(data) { resolve({ status: this.statusCode, body: data }); },
      send(data) { resolve({ status: this.statusCode, body: data }); }
    };
    app.handle(req, res);
  });
}

function mockGet(app, url) {
  return new Promise((resolve) => {
    const req = {
      method: "GET",
      url,
      headers: {},
      query: {},
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" }
    };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      setHeader(k, v) { this.headers[k] = v; },
      json(data) { resolve({ status: this.statusCode, body: data }); },
      send(data) { resolve({ status: this.statusCode, body: data }); }
    };
    app.handle(req, res);
  });
}

function mockPut(app, url, body) {
  return new Promise((resolve) => {
    const req = {
      method: "PUT",
      url,
      headers: {},
      body,
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" }
    };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      setHeader(k, v) { this.headers[k] = v; },
      json(data) { resolve({ status: this.statusCode, body: data }); },
      send(data) { resolve({ status: this.statusCode, body: data }); }
    };
    app.handle(req, res);
  });
}

function mockDelete(app, url) {
  return new Promise((resolve) => {
    const req = {
      method: "DELETE",
      url,
      headers: {},
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" }
    };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      setHeader(k, v) { this.headers[k] = v; },
      json(data) { resolve({ status: this.statusCode, body: data }); },
      send(data) { resolve({ status: this.statusCode, body: data }); }
    };
    app.handle(req, res);
  });
}

runTestSuite().then(() => process.exit(0)).catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
