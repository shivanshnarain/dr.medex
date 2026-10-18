/**
 * DR.MEDEX: Admin Polish, Gemini Regeneration & SEO Metadata E2E Test Suite
 * Validates:
 * 1. Completed step circle styling (#FFD400, border-0, dark check)
 * 2. Admin Header styling (#2D5A4A background, white text/icons)
 * 3. SEO Meta Title & Description persistence end-to-end (store + mongo schema)
 * 4. Storefront document title & meta description fallback & isolation logic
 * 5. Product Description textarea expansion
 * 6. Field-specific Gemini regeneration mapping & error preservation
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const store = require("../services/store");
const mongoService = require("../services/mongoService");
const geminiVisionService = require("../services/geminiVisionService");

console.log("\n=======================================================");
console.log("DR.MEDEX: ADMIN POLISH, REGENERATION & SEO METADATA TEST");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function it(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name} ->`, err.message);
    failed++;
  }
}

// ---------------------------------------------------------------------
// TEST 1: Completed Step Indicators (#FFD400, no outline, text-black)
// ---------------------------------------------------------------------
console.log("--- 1. Completed Step Indicators ---");
const editorSrc = fs.readFileSync(path.join(__dirname, "../../client/src/pages/AdminProductEditorPage.tsx"), "utf8");

it("Completed circle uses bright yellow fill #FFD400", () => {
  assert(editorSrc.includes("bg-[#FFD400]"), "Should contain bg-[#FFD400]");
});

it("Completed circle removes visible outline/border (border-0 ring-0)", () => {
  assert(editorSrc.includes("bg-[#FFD400] text-black border-0 shadow-xs ring-0"), "Should have border-0 and ring-0 on completed step");
});

it("Check icon uses dark text-black for high contrast against yellow", () => {
  assert(editorSrc.includes('<Check size={14} strokeWidth={3} className="text-black" />'), "Check icon must be text-black with strokeWidth=3");
});

// ---------------------------------------------------------------------
// TEST 2: Admin Header (Slate Green #2D5A4A, White Text & Icons)
// ---------------------------------------------------------------------
console.log("\n--- 2. Admin Header Styling ---");
const adminLayoutSrc = fs.readFileSync(path.join(__dirname, "../../client/src/components/admin/AdminLayout.tsx"), "utf8");

it("Admin header has Slate Green #2D5A4A background", () => {
  assert(adminLayoutSrc.includes("bg-[#2D5A4A]"), "Header should use bg-[#2D5A4A]");
});

it("Admin header contains all white text and breadcrumbs", () => {
  assert(adminLayoutSrc.includes("text-white"), "Header should use text-white");
  assert(adminLayoutSrc.includes("text-white/80 font-medium"), "Breadcrumbs should use readable white text");
});

it("Header icons are white without conflicting white boxes", () => {
  assert(adminLayoutSrc.includes('<Menu size={20} className="text-white" />'), "Mobile menu icon should be white");
  assert(adminLayoutSrc.includes('<Clock size={16} className="text-white" />'), "Audit clock icon should be white");
  assert(adminLayoutSrc.includes('<LogOut size={14} className="text-white" />'), "Logout icon should be white");
});

it("Header retains user info 'Roshan' and 'DR.MEDEX Super Admin'", () => {
  assert(adminLayoutSrc.includes('adminUser?.name || "Roshan"'), "User name fallback should be Roshan");
  assert(adminLayoutSrc.includes('adminUser?.role || "DR.MEDEX Super Admin"'), "User role fallback should be DR.MEDEX Super Admin");
});

// ---------------------------------------------------------------------
// TEST 3: Storefront SEO Metadata Persistence & Fallback
// ---------------------------------------------------------------------
console.log("\n--- 3. SEO Metadata Persistence & Fallback ---");

const testProduct = {
  id: "test-seo-prod-" + Date.now(),
  title: "DR.MEDEX Pro OT Operating Lamp",
  productName: "DR.MEDEX Pro OT Operating Lamp",
  storefrontProductTitle: "DR.MEDEX Pro OT Surgical Illuminator",
  category: "operating-theatre",
  subcategory: "ot-lights",
  equipmentType: "Ceiling Mount OT Light",
  sku: "DRM-OT-TEST-01",
  basePrice: 150000,
  shortDescription: "Precision surgical lighting with shadow-reduction optics.",
  overview: "Advanced surgical luminaire engineered for deep cavity illumination.",
  metaTitle: "DR.MEDEX Pro OT Light | High-Lux Surgical Lighting",
  metaDescription: "Procure the DR.MEDEX Pro OT Operating Lamp with shadow-reduction optics and ISO certification."
};

it("Store persists custom metaTitle and metaDescription", () => {
  const created = store.addProduct(testProduct);
  assert.strictEqual(created.metaTitle, testProduct.metaTitle);
  assert.strictEqual(created.metaDescription, testProduct.metaDescription);

  const retrieved = store.getProductById(created.id, true);
  assert.strictEqual(retrieved.metaTitle, testProduct.metaTitle);
  assert.strictEqual(retrieved.metaDescription, testProduct.metaDescription);
});

it("Store update preserves updated metaTitle and metaDescription", () => {
  const updated = store.updateProduct(testProduct.id, {
    metaTitle: "Updated SEO Title 2026",
    metaDescription: "Updated SEO Description for clinical surgical equipment."
  });
  assert.strictEqual(updated.metaTitle, "Updated SEO Title 2026");
  assert.strictEqual(updated.metaDescription, "Updated SEO Description for clinical surgical equipment.");

  // Clean up
  store.deleteProduct(testProduct.id);
});

const mongoSrc = fs.readFileSync(path.join(__dirname, "../services/mongoService.js"), "utf8");
it("mongoService approvedRecord schema explicitly includes metaTitle, seoTitle, metaDescription, and seoDescription", () => {
  assert(mongoSrc.includes("metaTitle: product.metaTitle"), "approvedRecord must map metaTitle");
  assert(mongoSrc.includes("seoTitle: product.seoTitle"), "approvedRecord must map seoTitle");
  assert(mongoSrc.includes("metaDescription: product.metaDescription"), "approvedRecord must map metaDescription");
  assert(mongoSrc.includes("seoDescription: product.seoDescription"), "approvedRecord must map seoDescription");
});

const productDetailSrc = fs.readFileSync(path.join(__dirname, "../../client/src/pages/ProductDetailPage.tsx"), "utf8");
it("ProductDetailPage dynamically sets document.title with metaTitle fallback", () => {
  assert(productDetailSrc.includes("const customTitle = (product.metaTitle || product.seoTitle || \"\").trim();"), "Should resolve custom title");
  assert(productDetailSrc.includes("document.title = documentTitle;"), "Should assign document.title");
});

it("ProductDetailPage dynamically sets meta description with fallback and escapes HTML", () => {
  assert(productDetailSrc.includes("const customDesc = (product.metaDescription || product.seoDescription || \"\").trim();"), "Should resolve custom description");
  assert(productDetailSrc.includes("descMeta.setAttribute(\"content\", cleanDesc);"), "Should set meta description content");
  assert(productDetailSrc.includes('.replace(/<[^>]*>?/gm, "")'), "Must strip HTML tags from SEO description");
});

it("ProductDetailPage cleans up metadata on unmount to prevent leaking between products", () => {
  assert(productDetailSrc.includes("document.title = previousTitle || \"DR.MEDEX — Medical Equipment\";"), "Must restore previous title on unmount");
  assert(productDetailSrc.includes("descMeta.setAttribute(\"content\", prevDescContent);"), "Must restore previous meta description on unmount");
});

// ---------------------------------------------------------------------
// TEST 4: Product Description Editing Area
// ---------------------------------------------------------------------
console.log("\n--- 4. Product Description Editing Area ---");

it("Product Description textarea has expanded visible height (rows=12, min-h-[220px])", () => {
  assert(editorSrc.includes("rows={12}"), "Textarea must have rows={12}");
  assert(editorSrc.includes("min-h-[220px]"), "Textarea must have min-h-[220px]");
});

it("Product Description textarea enables vertical resizing (resize-y)", () => {
  assert(editorSrc.includes("resize-y"), "Textarea must have resize-y class");
});

// ---------------------------------------------------------------------
// TEST 5: Field-Specific Gemini Regeneration & Medical Safety
// ---------------------------------------------------------------------
console.log("\n--- 5. Field-Specific Regeneration & Safety ---");

const visionSrc = fs.readFileSync(path.join(__dirname, "../services/geminiVisionService.js"), "utf8");

it("geminiVisionService accepts targetField and context for focused prompts", () => {
  assert(visionSrc.includes("targetField = null, context = {}"), "buildPrompt must accept targetField and context");
  assert(visionSrc.includes("FOCUSED REGENERATION GOAL"), "Prompt must contain focused regeneration instructions");
});

const adminRouteSrc = fs.readFileSync(path.join(__dirname, "../routes/admin.js"), "utf8");
it("POST /api/admin/products/ai-identify forwards targetField and context", () => {
  assert(adminRouteSrc.includes("const targetField = req.body.targetField || null;"), "Route must extract targetField");
  assert(adminRouteSrc.includes("targetField,\n      context"), "Route must pass targetField and context to service");
});

it("Admin editor handles field-specific regeneration and preserves existing values on failure", () => {
  assert(editorSrc.includes('targetField: "productName"'), "Name regeneration must specify targetField: productName");
  assert(editorSrc.includes('targetField: "description"'), "Description regeneration must specify targetField: description");
  assert(editorSrc.includes('targetField: "clinicalIndications"'), "Indications regeneration must specify targetField: clinicalIndications");
  assert(editorSrc.includes('targetField: "engineeringHighlights"'), "Highlights regeneration must specify targetField: engineeringHighlights");
  assert(editorSrc.includes('targetField: "packageItems"'), "Package regeneration must specify targetField: packageItems");
  assert(editorSrc.includes("Existing name has been preserved"), "Must preserve name on failure");
  assert(editorSrc.includes("Existing description has been preserved"), "Must preserve description on failure");
});

console.log("\n=======================================================");
console.log(`POLISH & SEO TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
console.log("=======================================================\n");

if (failed > 0) {
  process.exit(1);
}
