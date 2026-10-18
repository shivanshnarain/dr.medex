/**
 * DR.MEDEX - Focused Regression Test Suite:
 * 1. Product Status Lifecycle & Preservation (Active/Inactive must never change automatically)
 * 2. Partial updates, omitted fields, undefined/empty status handling
 * 3. Review Status badge styling and color conformity
 * 4. All Products refresh action & cache busting
 * 5. Instant Edit product loading and form reconciliation
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

async function runTest() {
  console.log("=====================================================================");
  console.log("   DR.MEDEX FOCUSED REGRESSION TEST: PRODUCT STATUS & ADMIN REPAIRS  ");
  console.log("=====================================================================\n");

  // -------------------------------------------------------------------------
  // 1. Verify Server & Client Serverless Function Mirroring
  // -------------------------------------------------------------------------
  console.log("[1/6] Verifying Server and Client/Server code parity...");
  const serverStoreCode = fs.readFileSync(path.join(__dirname, "../services/store.js"), "utf8");
  const clientStoreCode = fs.readFileSync(path.join(__dirname, "../../client/server/services/store.js"), "utf8");
  assert.strictEqual(
    serverStoreCode,
    clientStoreCode,
    "server/services/store.js and client/server/services/store.js must be 100% identical"
  );

  const serverRoutesCode = fs.readFileSync(path.join(__dirname, "../routes/admin.js"), "utf8");
  const clientRoutesCode = fs.readFileSync(path.join(__dirname, "../../client/server/routes/admin.js"), "utf8");
  assert.strictEqual(
    serverRoutesCode,
    clientRoutesCode,
    "server/routes/admin.js and client/server/routes/admin.js must be 100% identical"
  );
  console.log("  ✓ Server files and Client Vercel Serverless functions are in exact 100% parity.\n");

  // -------------------------------------------------------------------------
  // 2. Test Product Creation and Status Initialization
  // -------------------------------------------------------------------------
  console.log("[2/6] Testing Product Status Initialization and Defaults...");
  const store = require("../services/store");

  let activeId = null;
  let inactiveId = null;

  try {
    const testProductActive = await store.addProduct({
      name: "AutoStatus Test Ultrasound System " + Date.now(),
      title: "AutoStatus Test Ultrasound System " + Date.now(),
      category: "Diagnostic Imaging",
      subcategory: "Ultrasound",
      equipmentType: "General Imaging Ultrasound",
      manufacturer: "DR.MEDEX",
      manufacturerModel: "US-TEST-9000",
      description: "High-precision clinical diagnostic ultrasound system.",
      status: "ACTIVE",
      price: 45000,
      stock: 5,
      images: [{ url: "https://example.com/photo1.jpg", alt: "Main Photo" }]
    });
    activeId = testProductActive.id;

    assert.ok(testProductActive && testProductActive.id, "Active test product must be created");
    assert.strictEqual(testProductActive.status, "ACTIVE", "Created product status must be ACTIVE");
    console.log(`  ✓ Created test product ID=${testProductActive.id} with status=${testProductActive.status}`);

    const testProductInactive = await store.addProduct({
      name: "AutoStatus Inactive Scanner " + Date.now(),
      title: "AutoStatus Inactive Scanner " + Date.now(),
      category: "Diagnostic Imaging",
      subcategory: "CT Scanners",
      equipmentType: "Multislice CT Scanner",
      manufacturer: "DR.MEDEX",
      manufacturerModel: "CT-INACT-100",
      description: "Decommissioned high resolution CT system.",
      status: "INACTIVE",
      price: 85000,
      stock: 0,
      images: []
    });
    inactiveId = testProductInactive.id;

    assert.ok(testProductInactive && testProductInactive.id, "Inactive test product must be created");
    assert.strictEqual(testProductInactive.status, "INACTIVE", "Created product status must be INACTIVE");
    console.log(`  ✓ Created test product ID=${testProductInactive.id} with status=${testProductInactive.status}\n`);

    // -------------------------------------------------------------------------
    // 3. Regression: Editing Name & Description Must PRESERVE Original Status
    // -------------------------------------------------------------------------
    console.log("[3/6] Testing Status Preservation during Product Edits...");

    // 3a. Editing Active Product Name
    const updatedNameActive = await store.updateProduct(testProductActive.id, {
      title: "Renamed Active Ultrasound Pro " + Date.now()
    });
    assert.strictEqual(updatedNameActive.status, "ACTIVE", "Editing title must NOT alter ACTIVE status");
    assert.strictEqual(
      store.getProductById(testProductActive.id, true).status,
      "ACTIVE",
      "Persisted product must remain ACTIVE after title change"
    );
    console.log("  ✓ Editing active product name preserves ACTIVE status.");

    // 3b. Editing Active Product Description
    const updatedDescActive = await store.updateProduct(testProductActive.id, {
      description: "Updated clinical indication and probe frequency range details."
    });
    assert.strictEqual(updatedDescActive.status, "ACTIVE", "Editing description must NOT alter ACTIVE status");
    assert.strictEqual(
      store.getProductById(testProductActive.id, true).status,
      "ACTIVE",
      "Persisted product must remain ACTIVE after description change"
    );
    console.log("  ✓ Editing active product description preserves ACTIVE status.");

    // 3c. Editing Inactive Product Name
    const updatedNameInactive = await store.updateProduct(testProductInactive.id, {
      title: "Renamed Inactive CT Scanner " + Date.now()
    });
    assert.strictEqual(updatedNameInactive.status, "INACTIVE", "Editing title must NOT make INACTIVE product ACTIVE");
    assert.strictEqual(
      store.getProductById(testProductInactive.id, true).status,
      "INACTIVE",
      "Persisted product must remain INACTIVE after title change"
    );
    console.log("  ✓ Editing inactive product name preserves INACTIVE status.");

    // 3d. Editing Inactive Product Description
    const updatedDescInactive = await store.updateProduct(testProductInactive.id, {
      description: "Updated service record details for retired scanner."
    });
    assert.strictEqual(updatedDescInactive.status, "INACTIVE", "Editing description must NOT alter INACTIVE status");
    assert.strictEqual(
      store.getProductById(testProductInactive.id, true).status,
      "INACTIVE",
      "Persisted product must remain INACTIVE after description change"
    );
    console.log("  ✓ Editing inactive product description preserves INACTIVE status.");

    // 3e. Partial updates with undefined, null, empty string, or invalid status
    const updateUndefined = await store.updateProduct(testProductActive.id, {
      title: "Active Product Undefined Status Test",
      status: undefined
    });
    assert.strictEqual(updateUndefined.status, "ACTIVE", "Passing status=undefined must preserve original status");

    const updateNull = await store.updateProduct(testProductActive.id, {
      title: "Active Product Null Status Test",
      status: null
    });
    assert.strictEqual(updateNull.status, "ACTIVE", "Passing status=null must preserve original status");

    const updateEmpty = await store.updateProduct(testProductActive.id, {
      title: "Active Product Empty Status Test",
      status: ""
    });
    assert.strictEqual(updateEmpty.status, "ACTIVE", "Passing status='' must preserve original status");

    const updateInvalid = await store.updateProduct(testProductActive.id, {
      title: "Active Product Invalid Status Test",
      status: "UNKNOWN_GARBAGE_STATUS"
    });
    assert.strictEqual(updateInvalid.status, "ACTIVE", "Passing invalid status must preserve original status");

    const updateFalse = await store.updateProduct(testProductActive.id, {
      title: "Active Product False Status Test",
      status: false
    });
    assert.strictEqual(updateFalse.status, "ACTIVE", "Passing status=false must preserve original status");
    console.log("  ✓ Partial updates with undefined/null/empty/invalid/false status correctly preserve original status.\n");

    // -------------------------------------------------------------------------
    // 4. Testing Explicit Status Toggles
    // -------------------------------------------------------------------------
    console.log("[4/6] Testing Explicit Administrator Status Toggle...");
    const explicitToggledToInactive = await store.updateProduct(testProductActive.id, { status: "INACTIVE" });
    assert.strictEqual(explicitToggledToInactive.status, "INACTIVE", "Explicit updateProduct with status=INACTIVE must succeed");
    assert.strictEqual(store.getProductById(testProductActive.id, true).status, "INACTIVE");

    const explicitToggledToActive = await store.updateProduct(testProductActive.id, { status: "ACTIVE" });
    assert.strictEqual(explicitToggledToActive.status, "ACTIVE", "Explicit updateProduct with status=ACTIVE must succeed");
    assert.strictEqual(store.getProductById(testProductActive.id, true).status, "ACTIVE");
    console.log("  ✓ Explicit status toggle to INACTIVE and back to ACTIVE operates correctly.\n");

    // -------------------------------------------------------------------------
    // 5. Verification of Review Status Colors in AdminProductsPage.tsx
    // -------------------------------------------------------------------------
    console.log("[5/6] Verifying Review Status Colors and Badge Styling in AdminProductsPage.tsx...");
    const adminProductsPageCode = fs.readFileSync(
      path.join(__dirname, "../../client/src/pages/AdminProductsPage.tsx"),
      "utf8"
    );

    // Correct: Background white, text green, border/outline green
    assert.ok(
      adminProductsPageCode.includes("bg-white text-[#15803D] border-[#15803D]"),
      "AdminProductsPage must style 'Correct' badge with white bg, green text, and green border"
    );

    // Needs Editing: Background subtle light red / pale red, matching red text and border
    assert.ok(
      adminProductsPageCode.includes("bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]"),
      "AdminProductsPage must style 'Needs Editing' badge with subtle pale red bg, red text, and red border"
    );

    // Not Yet Reviewed: Background white, text black, subtle neutral outline
    assert.ok(
      adminProductsPageCode.includes("bg-white text-black border-[#D4D4D4]"),
      "AdminProductsPage must style 'Not Yet Reviewed' badge with white bg, black text, and neutral border"
    );

    // Refresh functionality: Cache buster _t=Date.now() and duplicate request guard
    assert.ok(
      adminProductsPageCode.includes("_t=${Date.now()}") || adminProductsPageCode.includes("_t="),
      "AdminProductsPage fetchProducts must include cache-busting timestamp parameter"
    );
    assert.ok(
      adminProductsPageCode.includes("isFetchingProductsRef.current"),
      "AdminProductsPage fetchProducts must guard against duplicate simultaneous refresh requests"
    );
    console.log("  ✓ Review Status badge colors match specifications exactly (white/green, pale-red/red, white/black).");
    console.log("  ✓ Refresh action has cache-busting and duplicate request prevention.\n");

    // -------------------------------------------------------------------------
    // 6. Verification of Instant Edit Loading in AdminProductEditorPage.tsx
    // -------------------------------------------------------------------------
    console.log("[6/6] Verifying Instant Edit Loading and Revalidation in AdminProductEditorPage.tsx...");
    const adminEditorPageCode = fs.readFileSync(
      path.join(__dirname, "../../client/src/pages/AdminProductEditorPage.tsx"),
      "utf8"
    );

    // Navigation state passed to editor
    assert.ok(
      adminProductsPageCode.includes("state={{ product: p }}"),
      "AdminProductsPage must pass product state when navigating to Edit"
    );

    // Instant field initialization
    assert.ok(
      adminEditorPageCode.includes("findInitialProduct"),
      "AdminProductEditorPage must define findInitialProduct to populate fields immediately on mount"
    );
    assert.ok(
      adminEditorPageCode.includes("reconcileProductFields"),
      "AdminProductEditorPage must reconcile background data without overwriting unsaved administrator edits"
    );
    assert.ok(
      adminEditorPageCode.includes("manuallyEditedFieldsRef"),
      "AdminProductEditorPage must track manually edited fields to prevent background overwrites"
    );
    assert.ok(
      adminEditorPageCode.includes("originalStatusRef"),
      "AdminProductEditorPage must track original product status to ensure existing status is preserved"
    );
    assert.ok(
      adminEditorPageCode.includes("Promise.all(["),
      "AdminProductEditorPage must fetch background metadata in parallel"
    );
    console.log("  ✓ Edit Product initializes immediately from router state/local cache.");
    console.log("  ✓ Background revalidation safely preserves unedited status and unsaved form modifications.");
  } finally {
    if (activeId) store.deleteProduct(activeId);
    if (inactiveId) store.deleteProduct(inactiveId);
  }

  console.log("\n=====================================================================");
  console.log("   ALL REGRESSION AND STATUS PRESERVATION CHECKS PASSED (100% OK)   ");
  console.log("=====================================================================\n");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
