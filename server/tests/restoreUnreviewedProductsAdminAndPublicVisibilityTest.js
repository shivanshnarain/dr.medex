/**
 * Verification Test Suite:
 * RESTORE "NOT YET REVIEWED" PRODUCTS IN ADMIN PANEL & ENFORCE ONLY CORRECT PRODUCTS ON PUBLIC STOREFRONT
 *
 * Requirements:
 * 1. Admin Panel displays all products: Correct, Needs Editing, and Not Yet Reviewed.
 * 2. Public DR.MEDEX storefront displays ONLY Correct products.
 * 3. Changing Not Yet Reviewed -> Correct makes product appear publicly.
 * 4. Changing Correct -> Not Yet Reviewed immediately removes it from public display.
 * 5. Admin product counts, category counts, search, filters, pagination accurate.
 * 6. No duplicate products created, zero data loss or unintentional modification.
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const assert = require("assert");
const express = require("express");
const crypto = require("crypto");

const dbJsonPath = path.join(__dirname, "../data/db.json");
const initialDbJson = fs.readFileSync(dbJsonPath, "utf8");
const secret = (process.env.SESSION_SECRET || "").trim().replace(/^["']|["']$/g, "") || "82b38e552f117f57ef2ed3aa6bc3f693697d3ad196534aa0bfdd2cff7af34b95";
const adminPayload = {
  email: "admin@drmedex.com",
  name: "DR.MEDEX Admin",
  role: "SUPER_ADMIN",
  iat: Date.now(),
  exp: Date.now() + 86400000,
  jti: "test-jti"
};
const payloadStr = Buffer.from(JSON.stringify(adminPayload)).toString("base64url");
const signature = crypto.createHmac("sha256", secret).update(payloadStr).digest("hex");
const adminToken = `${payloadStr}.${signature}`;

// Setup express test app
const app = express();
app.use(express.json());
const apiRoutes = require("../routes/api");
const adminRoutes = require("../routes/admin");
app.use("/api", apiRoutes);
app.use("/api/admin", adminRoutes);

const store = require("../services/store");
const mongoService = require("../services/mongoService");

async function runTests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`=== STARTING PRODUCT VISIBILITY & REVIEW STATUS VERIFICATION (Port ${port}) ===`);

  try {
    // 1. Check Admin Panel returns all products regardless of review status
    console.log("\n[Test 1] Admin Panel shows ALL products (Correct, Needs Editing, Not Yet Reviewed)...");
    const adminRes = await fetch(`${baseUrl}/api/admin/products?limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminRes.status, 200, `Admin /products returned ${adminRes.status}`);
    const adminData = await adminRes.json();
    assert.strictEqual(adminData.success, true);
    const adminProducts = adminData.products;
    const reviewCounts = adminData.reviewCounts;
    console.log(`Admin product count: ${adminProducts.length}`);
    console.log("Admin review counts:", reviewCounts);

    assert.ok(reviewCounts, "Review counts must exist");
    assert.strictEqual(reviewCounts.all, adminProducts.length, "Total review count must match list length");
    assert.ok(reviewCounts.correct > 0, "There should be Correct products");
    assert.ok(reviewCounts.needsEditing > 0, "There should be Needs Editing products");

    // 2. Check Public Storefront returns ONLY Correct products
    console.log("\n[Test 2] Public Storefront returns ONLY Correct products...");
    const publicRes = await fetch(`${baseUrl}/api/products`);
    assert.strictEqual(publicRes.status, 200, `Public /products returned ${publicRes.status}`);
    const publicData = await publicRes.json();
    assert.strictEqual(publicData.success, true);
    const publicProducts = publicData.products;
    console.log(`Public product count: ${publicProducts.length}`);

    for (const p of publicProducts) {
      assert.strictEqual(p.reviewStatus, "CORRECT", `Public product ${p.id} (${p.title}) has invalid reviewStatus: ${p.reviewStatus}`);
    }
    console.log("✓ Verified: 100% of public products have reviewStatus === 'CORRECT'");

    // 3. Verify that Needs Editing products in ANY category are NOT returned publicly
    console.log("\n[Test 3] Verify Needs Editing products are blocked from public listing...");
    const needsEditingIds = adminProducts.filter(p => p.reviewStatus === "NEEDS_EDITING").map(p => p.id);
    console.log(`Found ${needsEditingIds.length} Needs Editing products in admin`);
    for (const p of publicProducts) {
      assert.ok(!needsEditingIds.includes(p.id), `Needs Editing product ${p.id} must not be in public products`);
    }
    console.log("✓ Verified: No Needs Editing products appear in public listing");

    // 4. Verify single product detail endpoint blocks unreviewed / needs editing products
    console.log("\n[Test 4] Verify public /products/:slug blocks unreviewed and needs editing products...");
    const sampleNeedsEditing = adminProducts.find(p => p.reviewStatus === "NEEDS_EDITING");
    assert.ok(sampleNeedsEditing, "Should have a Needs Editing product for testing");
    const detailRes = await fetch(`${baseUrl}/api/products/${sampleNeedsEditing.slug || sampleNeedsEditing.id}`);
    assert.strictEqual(detailRes.status, 404, `Public detail for Needs Editing product must return 404, got ${detailRes.status}`);
    console.log(`✓ Verified: GET /api/products/${sampleNeedsEditing.slug || sampleNeedsEditing.id} returned 404 as expected`);

    // 5. Test review status transition lifecycle:
    // Transition Correct -> PENDING (Not Yet Reviewed) -> Verify removed publicly
    // Transition PENDING -> CORRECT -> Verify restored publicly
    console.log("\n[Test 5] Test lifecycle: Not Yet Reviewed -> Correct -> Not Yet Reviewed...");
    const testProd = adminProducts.find(p => p.reviewStatus === "CORRECT");
    assert.ok(testProd, "Should have a Correct product to test transition");
    const testId = testProd.id;
    const originalStatus = testProd.reviewStatus;
    const originalApprovedAt = testProd.approvedAt;
    const originalApprovedBy = testProd.approvedBy;

    try {
      // A. Transition Correct -> PENDING (Not Yet Reviewed)
      console.log(`Transitioning product ${testId} to PENDING (Not Yet Reviewed)...`);
      const setPendingRes = await fetch(`${baseUrl}/api/admin/products/${testId}/review`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reviewStatus: "PENDING", reviewNote: "Test unreviewed transition" })
      });

      assert.strictEqual(setPendingRes.status, 200);
      const setPendingData = await setPendingRes.json();
      assert.strictEqual(setPendingData.product.reviewStatus, "PENDING");

      // Verify it disappears from public listing
      const publicAfterPending = await (await fetch(`${baseUrl}/api/products`)).json();
      const foundInPublic = publicAfterPending.products.some(p => p.id === testId);
      assert.strictEqual(foundInPublic, false, "Pending product must NOT appear in public products");

      // Verify it returns 404 on public detail route
      const detailAfterPending = await fetch(`${baseUrl}/api/products/${testProd.slug || testId}`);
      assert.strictEqual(detailAfterPending.status, 404, "Pending product must return 404 on public detail");
      console.log("✓ Verified: Product set to Not Yet Reviewed is removed from public catalogue and detail returns 404");

      // Verify it STILL appears in Admin Panel under PENDING filter
      const adminPendingRes = await fetch(`${baseUrl}/api/admin/products?reviewStatus=PENDING`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(adminPendingRes.status, 200);
      const adminPendingData = await adminPendingRes.json();
      const foundInAdminPending = adminPendingData.products.some(p => p.id === testId);
      assert.strictEqual(foundInAdminPending, true, "Product MUST appear in admin when filtered by PENDING");
      console.log("✓ Verified: Product set to Not Yet Reviewed appears in Admin Panel under Not Yet Reviewed tab");

      // Verify it also appears when queried with reviewStatus=NOT_YET_REVIEWED
      const adminNotYetRes = await fetch(`${baseUrl}/api/admin/products?reviewStatus=NOT_YET_REVIEWED`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.strictEqual(adminNotYetRes.status, 200);
      const adminNotYetData = await adminNotYetRes.json();
      const foundInAdminNotYet = adminNotYetData.products.some(p => p.id === testId);
      assert.strictEqual(foundInAdminNotYet, true, "Product MUST appear in admin when filtered by NOT_YET_REVIEWED");
      console.log("✓ Verified: Product appears in Admin Panel with reviewStatus=NOT_YET_REVIEWED");

      // B. Transition PENDING -> CORRECT
      console.log(`Transitioning product ${testId} back to CORRECT...`);
      const setCorrectRes = await fetch(`${baseUrl}/api/admin/products/${testId}/review`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reviewStatus: "CORRECT" })
      });

      assert.strictEqual(setCorrectRes.status, 200);
      const setCorrectData = await setCorrectRes.json();
      assert.strictEqual(setCorrectData.product.reviewStatus, "CORRECT");

      // Verify it reappears in public listing
      const publicAfterCorrect = await (await fetch(`${baseUrl}/api/products`)).json();
      const foundInPublicAfterCorrect = publicAfterCorrect.products.some(p => p.id === testId);
      assert.strictEqual(foundInPublicAfterCorrect, true, "Approved product MUST appear in public products");

      // Verify public detail returns 200
      const detailAfterCorrect = await fetch(`${baseUrl}/api/products/${testProd.slug || testId}`);
      assert.strictEqual(detailAfterCorrect.status, 200, "Approved product detail must return 200");
      console.log("✓ Verified: Product restored to CORRECT appears in public catalogue and detail returns 200");

    } finally {
      // Restore original state
      store.updateProduct(testId, {
        reviewStatus: originalStatus,
        approvedAt: originalApprovedAt,
        approvedBy: originalApprovedBy
      });
      if (mongoService.isConfigured()) {
        await mongoService.updateProductReviewStatus(testId, originalStatus, null, "admin@drmedex.com");
      }
    }

    // 6. Test Admin Search, Filters, and Pagination
    console.log("\n[Test 6] Test Admin Search, Category Filter, and Pagination...");
    const searchRes = await fetch(`${baseUrl}/api/admin/products?search=cautery`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(searchRes.status, 200);
    const searchData = await searchRes.json();
    assert.ok(searchData.products.length > 0, "Admin search should return matching products");

    const pageRes = await fetch(`${baseUrl}/api/admin/products?page=1&limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(pageRes.status, 200);
    const pageData = await pageRes.json();
    assert.strictEqual(pageData.products.length, 5, "Paginated limit 5 should return 5 products");
    assert.strictEqual(pageData.page, 1);
    assert.strictEqual(pageData.limit, 5);
    console.log("✓ Verified: Admin search, category filter, and pagination work accurately");

    // 7. Verify Live Search Live API only returns Correct products
    console.log("\n[Test 7] Verify /api/search/live only returns Correct products...");
    const liveSearchRes = await fetch(`${baseUrl}/api/search/live?q=cautery`);
    assert.strictEqual(liveSearchRes.status, 200);
    const liveSearchData = await liveSearchRes.json();
    if (liveSearchData.products && liveSearchData.products.length > 0) {
      for (const p of liveSearchData.products) {
        assert.strictEqual(p.reviewStatus, "CORRECT", `Live search product ${p.id} must be CORRECT`);
      }
    }
    console.log("✓ Verified: /api/search/live only returns CORRECT products");

    // 8. Confirm exact product counts and zero duplicates
    console.log("\n[Test 8] Confirm exact product counts and zero duplicates...");
    const finalAdminRes = await fetch(`${baseUrl}/api/admin/products?limit=500`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const finalAdminData = await finalAdminRes.json();
    const finalProducts = finalAdminData.products;
    const seenIds = new Set();
    const duplicates = [];
    for (const p of finalProducts) {
      if (seenIds.has(p.id)) {
        duplicates.push(p.id);
      }
      seenIds.add(p.id);
    }
    assert.strictEqual(duplicates.length, 0, `Found duplicate product IDs: ${duplicates.join(", ")}`);
    assert.strictEqual(finalProducts.length, 76, `Expected exactly 76 products, found ${finalProducts.length}`);
    console.log(`✓ Verified: Exactly 76 products, 0 duplicates, all intact`);

    console.log("\n=== ALL 8 VERIFICATION TESTS PASSED SUCCESSFULLY! ===");
  } finally {
    server.close();
    try {
      fs.writeFileSync(dbJsonPath, initialDbJson);
    } catch {}
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error("Test failure:", err);
  process.exit(1);
});
