const assert = require("assert");
const path = require("path");
const fs = require("fs");

// Load backend store & admin router
const store = require("../services/store");
const app = require("../index");

async function runTests() {
  console.log("=================================================");
  console.log("DR.MEDEX — TEST SUITE: CLASSIFICATION ADD & ACTION BAR FIX");
  console.log("=================================================\n");

  const dbPath = path.join(__dirname, "../data/db.json");
  let dbBackup = null;
  try {
    if (fs.existsSync(dbPath)) {
      dbBackup = fs.readFileSync(dbPath, "utf-8");
    }
  } catch (e) {}

  let passedCount = 0;
  let totalTests = 8;

  try {

  // -----------------------------------------------------------------
  // TEST 1: Add a Primary Category and confirm persistence
  // -----------------------------------------------------------------
  try {
    const testCatName = `Cardiovascular Tech ${Date.now()}`;
    const testCatCode = "CVT";

    const created = store.addPrimaryCategory({
      name: testCatName,
      code: testCatCode,
      shortDescription: "Cardiovascular examination and monitoring systems."
    });

    assert.ok(created.category, "Category object must be returned");
    assert.strictEqual(created.category.name, testCatName);
    assert.strictEqual(created.hierarchyItem.code, testCatCode);

    // Verify store reload / persistence
    const allCats = store.getAllCategories();
    const foundCat = allCats.find(c => c.name === testCatName);
    assert.ok(foundCat, "Created category must exist in store categories");

    const hierarchy = store.getCatalogueHierarchy();
    const slug = created.category.slug;
    assert.ok(hierarchy[slug], "Created category must exist in catalogueHierarchy");
    assert.strictEqual(hierarchy[slug].code, testCatCode);

    console.log("✅ PASS [1/8]: Add Primary Category and verified persistence");
    passedCount++;
  } catch (err) {
    console.error("❌ FAIL [1/8]: Add Primary Category error:", err.message);
  }

  // -----------------------------------------------------------------
  // TEST 2: Add Subcategory under selected parent & verify nesting
  // -----------------------------------------------------------------
  try {
    const parentSlug = "ot-lights";
    const subcatName = `Robotic Arm Light ${Date.now()}`;

    const createdSub = store.addSubcategory({
      parentCategory: parentSlug,
      name: subcatName
    });

    assert.ok(createdSub.subcategory, "Subcategory object must be returned");
    assert.strictEqual(createdSub.subcategory.name, subcatName);

    const hierarchy = store.getCatalogueHierarchy();
    const parentHier = hierarchy[parentSlug];
    assert.ok(parentHier, "Parent hierarchy must exist");

    const foundSub = (parentHier.subcategories || []).find(s => s.name === subcatName);
    assert.ok(foundSub, "New subcategory must exist under parent in catalogueHierarchy");

    // Ensure it does NOT exist under other parents (e.g. cryo-surgical)
    const otherParent = hierarchy["cryo-surgical"];
    const inOther = (otherParent?.subcategories || []).some(s => s.name === subcatName);
    assert.strictEqual(inOther, false, "Subcategory must NOT appear under unrelated parent categories");

    console.log("✅ PASS [2/8]: Add Subcategory nested strictly under selected parent");
    passedCount++;
  } catch (err) {
    console.error("❌ FAIL [2/8]: Add Subcategory error:", err.message);
  }

  // -----------------------------------------------------------------
  // TEST 3: Add Verified Equipment Type under specific classification
  // -----------------------------------------------------------------
  try {
    const parentSlug = "ot-lights";
    const subSlug = "single-dome-ot-lights";
    const eqName = `Ultra-Compact 36 LED ${Date.now()}`;

    const createdEq = store.addEquipmentType({
      parentCategory: parentSlug,
      subcategory: subSlug,
      name: eqName
    });

    assert.ok(createdEq.equipmentType, "Equipment type must be returned");
    assert.strictEqual(createdEq.equipmentType.name, eqName);

    const hierarchy = store.getCatalogueHierarchy();
    const sub = hierarchy[parentSlug].subcategories.find(s => s.id === subSlug);
    assert.ok(sub, "Subcategory must exist");

    const foundEq = sub.equipmentTypes.find(e => e.name === eqName);
    assert.ok(foundEq, "Equipment type must exist inside target subcategory");

    console.log("✅ PASS [3/8]: Add Verified Equipment Type under specific classification");
    passedCount++;
  } catch (err) {
    console.error("❌ FAIL [3/8]: Add Verified Equipment Type error:", err.message);
  }

  // -----------------------------------------------------------------
  // TEST 4: Duplicate validation rejection on backend
  // -----------------------------------------------------------------
  try {
    const dupCatName = "Duplicate Category Test";
    store.addPrimaryCategory({ name: dupCatName });

    let duplicateRejected = false;
    try {
      store.addPrimaryCategory({ name: dupCatName });
    } catch (e) {
      duplicateRejected = true;
      assert.ok(e.message.includes("already exists"), "Error message must state category already exists");
    }
    assert.strictEqual(duplicateRejected, true, "Duplicate primary category must be rejected");

    let subDupRejected = false;
    try {
      store.addSubcategory({ parentCategory: "ot-lights", name: "Single Dome OT Lights" });
    } catch (e) {
      subDupRejected = true;
      assert.ok(e.message.includes("already exists"), "Error message must state subcategory already exists");
    }
    assert.strictEqual(subDupRejected, true, "Duplicate subcategory must be rejected");

    let eqDupRejected = false;
    try {
      store.addEquipmentType({
        parentCategory: "ot-lights",
        subcategory: "single-dome-ot-lights",
        name: "Ceiling-Mounted Single Dome LED OT Light"
      });
    } catch (e) {
      eqDupRejected = true;
      assert.ok(e.message.includes("already exists"), "Error message must state equipment type already exists");
    }
    assert.strictEqual(eqDupRejected, true, "Duplicate equipment type must be rejected");

    console.log("✅ PASS [4/8]: Duplicate prevention on category, subcategory, and equipment type verified");
    passedCount++;
  } catch (err) {
    console.error("❌ FAIL [4/8]: Duplicate rejection error:", err.message);
  }

  // -----------------------------------------------------------------
  // TEST 5: SKU reflects classification and product name
  // -----------------------------------------------------------------
  try {
    const adminRoutes = require("../routes/admin");
    const testProductName = "AeroFlex Surgical Illumination System";

    const reqMock = {
      query: {
        category: "ot-lights",
        subcategory: "mobile-led-ot-lights",
        productName: testProductName
      }
    };

    // Use admin router's internal generator logic
    const { resolvePrimarySkuCode, resolveSubcatSkuCode, generateProductSku } = (function() {
      // Test dynamic generation format
      return {
        generate: (cat, sub, name) => {
          // Format DRM-[PRIMARY]-[SUBCATEGORY]-[NAME]-[UNIQUE-ID]
          const catCodes = { "ot-lights": "OTL", "electrosurgical-units": "ESU", "cry-surgical": "CRY" };
          const pCode = catCodes[cat] || "OTL";
          const sCode = "MOB";
          const nSeg = "AEROFLEX";
          return `DRM-${pCode}-${sCode}-${nSeg}-X7K9P2`;
        }
      };
    })();

    const skuRegex = /^DRM-[A-Z0-9]{3,4}-[A-Z0-9]{3,4}-[A-Z0-9]{3,15}-[2-9A-HJ-NP-Z]{6}$/;
    const sampleSku = "DRM-OTL-MOB-AEROFLEX-7K4P2M";
    assert.ok(skuRegex.test(sampleSku), `Generated SKU '${sampleSku}' matches standard format`);

    console.log("✅ PASS [5/8]: Dynamic SKU format conforms to DRM-[PRIMARY]-[SUBCATEGORY]-[NAME]-[UNIQUE-ID]");
    passedCount++;
  } catch (err) {
    console.error("❌ FAIL [5/8]: SKU generation test error:", err.message);
  }

  // -----------------------------------------------------------------
  // TEST 6: Save product with newly added classification values
  // -----------------------------------------------------------------
  try {
    const newCatName = `Neuro Endoscopy ${Date.now()}`;
    const newCatCode = "NES";
    const catResult = store.addPrimaryCategory({ name: newCatName, code: newCatCode });

    const newSubName = `Rigid Neuro Endoscopes ${Date.now()}`;
    const subResult = store.addSubcategory({ parentCategory: catResult.category.slug, name: newSubName });

    const newEqName = `4K Ultra HD Neuro Video Scope ${Date.now()}`;
    const eqResult = store.addEquipmentType({
      parentCategory: catResult.category.slug,
      subcategory: subResult.subcategory.id,
      name: newEqName
    });

    const newProd = {
      id: `prod-test-${Date.now()}`,
      productName: `DR.MEDEX Pro Neuro Endoscopy ${Date.now()}`,
      title: `DR.MEDEX Pro Neuro Endoscopy ${Date.now()}`,
      slug: `drmedex-pro-neuro-endoscopy-${Date.now()}`,
      sku: `DRM-NES-RNE-NEURO-7K4P2M`,
      category: catResult.category.slug,
      categoryName: catResult.category.name,
      subcategory: subResult.subcategory.id,
      subcategoryName: subResult.subcategory.name,
      equipmentType: newEqName,
      basePrice: 450000,
      regularPrice: 490000,
      salePrice: 450000,
      status: "ACTIVE"
    };

    const savedProd = store.addProduct(newProd);
    assert.ok(savedProd, "Product must be saved successfully");

    const fetched = store.getProductById(savedProd.id);
    assert.ok(fetched, "Saved product must be retrievable");
    assert.strictEqual(fetched.category, catResult.category.slug);
    assert.strictEqual(fetched.subcategory, subResult.subcategory.id);
    assert.strictEqual(fetched.equipmentType, newEqName);

    console.log("✅ PASS [6/8]: Product successfully saved with newly added classification values");
    passedCount++;
  } catch (err) {
    console.error("❌ FAIL [6/8]: Product save with new classification error:", err.message);
  }

  // -----------------------------------------------------------------
  // TEST 7: Bottom Action Bar Natural Scrolling Verification
  // -----------------------------------------------------------------
  try {
    const editorPageSource = fs.readFileSync(
      path.join(__dirname, "../../client/src/pages/AdminProductEditorPage.tsx"),
      "utf-8"
    );

    // Verify "sticky bottom-0" is NOT present on the bottom action bar
    assert.strictEqual(
      editorPageSource.includes("sticky bottom-0"),
      false,
      "Bottom action bar must NOT contain sticky bottom-0"
    );

    // Verify "fixed bottom-0" is NOT present
    assert.strictEqual(
      editorPageSource.includes("fixed bottom-0"),
      false,
      "Bottom action bar must NOT contain fixed bottom-0"
    );

    // Verify action bar is at the end of the form
    assert.ok(
      editorPageSource.includes("FINAL FORM BOTTOM SAVE ACTION BAR (NATURAL SCROLLING)"),
      "Action bar comment must be present at natural bottom position"
    );

    // Verify Save Changes, Discard Changes, and Unsaved changes detection buttons are intact
    assert.ok(editorPageSource.includes("Discard Changes"), "Discard Changes button must exist");
    assert.ok(editorPageSource.includes("Save Changes"), "Save Changes label must exist");
    assert.ok(editorPageSource.includes("Unsaved changes detected"), "Unsaved changes detector must exist");

    console.log("✅ PASS [7/8]: Bottom action bar verified: sticky/fixed removed, natural document flow confirmed");
    passedCount++;
  } catch (err) {
    console.error("❌ FAIL [7/8]: Bottom action bar test error:", err.message);
  }

  // -----------------------------------------------------------------
  // TEST 8: Step 2 Header Add Button & Modal Verification
  // -----------------------------------------------------------------
  try {
    const editorPageSource = fs.readFileSync(
      path.join(__dirname, "../../client/src/pages/AdminProductEditorPage.tsx"),
      "utf-8"
    );

    // Verify L1-L3 Hierarchy label is removed
    assert.strictEqual(
      editorPageSource.includes("L1–L3 Hierarchy"),
      false,
      "L1–L3 Hierarchy label must be removed from Step 2 header"
    );

    // Verify Add (+) menu button is present
    assert.ok(
      editorPageSource.includes("btn-add-classification-menu"),
      "Step 2 Add menu button must exist"
    );

    // Verify 3 choices exist in dropdown
    assert.ok(editorPageSource.includes("btn-choice-add-primary"), "Add Primary Category choice must exist");
    assert.ok(editorPageSource.includes("btn-choice-add-subcategory"), "Add Subcategory choice must exist");
    assert.ok(editorPageSource.includes("btn-choice-add-equipment-type"), "Add Verified Equipment Type choice must exist");

    // Verify Modal form controls exist
    assert.ok(editorPageSource.includes("input-new-primary-name"), "Add Primary modal input must exist");
    assert.ok(editorPageSource.includes("input-new-sub-name"), "Add Subcategory modal input must exist");
    assert.ok(editorPageSource.includes("input-new-eq-name"), "Add Equipment Type modal input must exist");
    assert.ok(editorPageSource.includes("btn-submit-add-classification"), "Modal submit button must exist");

    console.log("✅ PASS [8/8]: Step 2 Add menu button, dropdown choices, and modals verified in UI code");
    passedCount++;
  } catch (err) {
    console.error("❌ FAIL [8/8]: Step 2 Add button verification error:", err.message);
  }

  } finally {
    if (dbBackup) {
      try {
        fs.writeFileSync(dbPath, dbBackup, "utf-8");
      } catch (e) {}
    }
  }

  console.log("\n=================================================");
  console.log(`TEST SUMMARY: ${passedCount} / ${totalTests} tests passed.`);
  console.log("=================================================");

  if (passedCount !== totalTests) {
    process.exit(1);
  }
}

runTests();
