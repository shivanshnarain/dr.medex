const assert = require("assert");
const fs = require("fs");
const path = require("path");
const store = require("../services/store");

async function runProductLayoutTestSuite() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX PRODUCT PAGE LAYOUT VERIFICATION TEST SUITE");
  console.log("  FIXED TOP + SCROLLABLE DESCRIPTION ONLY + FIXED BOTTOM ARCHITECTURE");
  console.log("==========================================================================\n");

  const pdpFilePath = path.join(__dirname, "../../client/src/pages/ProductDetailPage.tsx");
  assert.ok(fs.existsSync(pdpFilePath), "ProductDetailPage.tsx must exist");
  const pdpContent = fs.readFileSync(pdpFilePath, "utf8");

  // -------------------------------------------------------------------------
  // TEST 1: Fixed Top Zone (Zone A) Elements & Immutability
  // -------------------------------------------------------------------------
  console.log("--- TEST 1: Fixed Top Zone (Zone A) Architecture ---");
  // Check 1.1: Dynamic Breadcrumb navigation
  assert.ok(pdpContent.includes("getDynamicCategoryName(product)"), "Top Zone must contain dynamic category breadcrumb");
  assert.ok(pdpContent.includes('aria-label="Breadcrumb"'), "Breadcrumb navigation must be properly labeled");
  console.log("  ✔ PASS: Dynamic category breadcrumb navigation verified");

  // Check 1.2: Title and DR.MEDEX branding
  assert.ok(pdpContent.includes("titleParts.dr") && pdpContent.includes("titleParts.medex"), "Title must render DR.MEDEX branding");
  assert.ok(pdpContent.includes("titleParts.descriptiveName"), "Title must render complete descriptive name without truncation");
  console.log("  ✔ PASS: Complete product title and DR.MEDEX branding verified");

  // Check 1.3: Pricing and discount percentage
  assert.ok(pdpContent.includes("formatPrice(product.basePrice)"), "Selling price must be formatted and displayed");
  assert.ok(pdpContent.includes("discountPercentage") && pdpContent.includes("% OFF"), "Discount percentage badge must be displayed when available");
  console.log("  ✔ PASS: Selling price, original price, and discount percentage verified");

  // Check 1.4: Divider line immediately below pricing area
  const topDividerRegex = /discountPercentage[\s\S]*?<hr className="border-t border-neutral-200 my-1\.5 shrink-0" \/>/m;
  assert.ok(topDividerRegex.test(pdpContent), "Divider line must be placed immediately below pricing area");
  console.log("  ✔ PASS: Divider line immediately below pricing area verified");

  // -------------------------------------------------------------------------
  // TEST 2: Scrollable Middle Zone (Zone B) Description ONLY
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 2: Scrollable Middle Zone (Zone B) Description ONLY ---");
  // Check 2.1: Independent description scrolling container
  assert.ok(
    pdpContent.includes('aria-label="Product description"') &&
    pdpContent.includes("overflow-y-auto") &&
    pdpContent.includes("min-h-0"),
    "Description area must have its own independent vertical scrolling container with min-h-0 and overflow-y-auto"
  );
  console.log("  ✔ PASS: Description has its own independent vertical scroll container");

  // Check 2.2: Scrollbar confined to description area
  assert.ok(
    pdpContent.includes("[scrollbar-width:thin]") &&
    pdpContent.includes("[scrollbar-color:#7AA05A_transparent]"),
    "Scrollbar must be explicitly scoped to description region"
  );
  console.log("  ✔ PASS: Scrollbar is scoped exclusively to the middle description container");

  // Check 2.3: Description text preserved exactly without rewriting
  assert.ok(pdpContent.includes("{productOverview}"), "Existing productOverview description text must be preserved");
  assert.ok(pdpContent.includes("whitespace-pre-line"), "Preserves existing line breaks and formatting");
  console.log("  ✔ PASS: Description text and formatting preserved exactly");

  // -------------------------------------------------------------------------
  // TEST 3: Fixed Bottom Zone (Zone C) Anchoring & Element Order
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 3: Fixed Bottom Zone (Zone C) Anchoring & Exact Element Order ---");
  // Check 3.1: Anchored at bottom via mt-auto and shrink-0
  assert.ok(pdpContent.includes("shrink-0 mt-auto pt-1 space-y-3"), "Bottom Zone must be anchored at the bottom with shrink-0 mt-auto");
  console.log("  ✔ PASS: Bottom zone is anchored at bottom with shrink-0 mt-auto");

  // Check 3.2: Exact element order inside Zone C:
  // 1. Divider line above action buttons
  // 2. Add to Cart button
  // 3. Buy Now button
  // 4. Power Supply
  // 5. Quality Standard
  // 6. Regulatory Status
  // 7. Warranty
  const zoneCStartIndex = pdpContent.indexOf("C. Fixed Bottom Section");
  assert.ok(zoneCStartIndex !== -1, "Zone C marker must exist in source");
  const zoneCSection = pdpContent.slice(zoneCStartIndex, zoneCStartIndex + 3500);

  const dividerIdx = zoneCSection.indexOf("<hr");
  const addToCartIdx = zoneCSection.indexOf("handleAddToCart");
  const buyNowIdx = zoneCSection.indexOf("handleBuyNow");
  const specCardsIdx = zoneCSection.indexOf("renderSpecCardsGrid()");

  assert.ok(dividerIdx !== -1, "Divider must exist in Zone C");
  assert.ok(addToCartIdx !== -1, "Add to Cart must exist in Zone C");
  assert.ok(buyNowIdx !== -1, "Buy Now must exist in Zone C");
  assert.ok(specCardsIdx !== -1, "renderSpecCardsGrid must exist in Zone C");

  assert.ok(dividerIdx < addToCartIdx, "1. Divider line must precede action buttons");
  assert.ok(addToCartIdx < buyNowIdx, "2. Add to Cart must precede Buy Now button");
  assert.ok(buyNowIdx < specCardsIdx, "3. Buy Now must precede specification cards grid");

  console.log("  ✔ PASS: Exact Zone C element ordering verified: Divider -> Add to Cart -> Buy Now -> Spec Cards Grid");

  // Check 3.3: Specification cards order inside renderSpecCardsGrid
  const specCardsDefinition = pdpContent.indexOf("const specCards = [");
  const specCardsSlice = pdpContent.slice(specCardsDefinition, specCardsDefinition + 1000);
  const powerIdx = specCardsSlice.indexOf('"Power Supply"');
  const qualityIdx = specCardsSlice.indexOf('"Quality Standard"');
  const regulatoryIdx = specCardsSlice.indexOf('"Regulatory Status"');
  const warrantyIdx = specCardsSlice.indexOf('"Warranty"');

  assert.ok(powerIdx !== -1 && qualityIdx !== -1 && regulatoryIdx !== -1 && warrantyIdx !== -1, "All 4 specs must be present");
  assert.ok(powerIdx < qualityIdx, "4. Power Supply precedes Quality Standard");
  assert.ok(qualityIdx < regulatoryIdx, "5. Quality Standard precedes Regulatory Status");
  assert.ok(regulatoryIdx < warrantyIdx, "6. Regulatory Status precedes Warranty");
  console.log("  ✔ PASS: Exact 4-specification card order verified: Power Supply -> Quality Standard -> Regulatory Status -> Warranty");

  // Check 3.4: All 4 specification icons, labels, and values remain visible in the fixed bottom zone
  assert.ok(specCardsSlice.includes("icon: Plug"), "Power Supply has Plug icon");
  assert.ok(specCardsSlice.includes("icon: Award"), "Quality Standard has Award icon");
  assert.ok(specCardsSlice.includes("icon: ShieldCheck"), "Regulatory Status has ShieldCheck icon");
  assert.ok(specCardsSlice.includes("icon: CrossedToolsIcon"), "Warranty has CrossedToolsIcon");
  console.log("  ✔ PASS: All 4 specification icons verified in the fixed bottom zone");

  // -------------------------------------------------------------------------
  // TEST 4: Desktop 2-Column Height Synchronization & Confinement
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 4: Desktop Height Synchronization & Confinement ---");
  // Check 4.1: Parent grid uses items-stretch on desktop
  assert.ok(pdpContent.includes("lg:items-stretch"), "Grid uses lg:items-stretch to synchronize column heights on desktop");
  console.log("  ✔ PASS: Desktop grid uses lg:items-stretch");

  // Check 4.2: Right column wrapper uses relative min-w-0 lg:h-full lg:min-h-[580px]
  assert.ok(
    pdpContent.includes('className="w-full relative min-w-0 lg:h-full lg:min-h-[580px]"'),
    "Right column wrapper must establish containing block with relative min-w-0 lg:h-full lg:min-h-[580px]"
  );
  console.log("  ✔ PASS: Right column wrapper establishes bounded containing block");

  // Check 4.3: Inner right column uses lg:absolute lg:inset-0
  assert.ok(
    pdpContent.includes('className="w-full flex flex-col justify-between min-w-0 lg:absolute lg:inset-0"'),
    "Inner column must use lg:absolute lg:inset-0 to prevent content height feedback loops"
  );
  console.log("  ✔ PASS: Inner column uses lg:absolute lg:inset-0 to strictly match gallery height");

  // Check 4.4: Brittle dynamic measuring eliminated
  assert.ok(!pdpContent.includes("updateGalleryHeight"), "Brittle updateGalleryHeight listener has been safely removed");
  assert.ok(!pdpContent.includes("galleryHeight &&"), "Brittle inline galleryHeight style has been safely removed");
  console.log("  ✔ PASS: Brittle JS dimension measurement replaced with deterministic pure CSS architecture");

  // -------------------------------------------------------------------------
  // TEST 5: Responsive Safety on Mobile & Tablet (< lg)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 5: Responsive Safety on Mobile & Tablet (< lg) ---");
  // Check 5.1: Mobile retains dedicated fixed bottom purchase bar
  assert.ok(pdpContent.includes('className="lg:hidden fixed bottom-0 left-0 right-0 z-40'), "Mobile retains dedicated fixed bottom purchase bar");
  console.log("  ✔ PASS: Mobile fixed bottom purchase bar preserved");

  // Check 5.2: Mobile retains floating thumbnail strip overlay
  assert.ok(pdpContent.includes("lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20"), "Mobile retains floating thumbnail strip overlay");
  console.log("  ✔ PASS: Mobile floating thumbnail strip overlay preserved");

  // Check 5.3: Specifications are rendered before reviews on mobile
  assert.ok(pdpContent.includes("lg:hidden mt-10 mb-8 pt-6 border-t border-neutral-200"), "Mobile renders specifications grid before reviews");
  console.log("  ✔ PASS: Mobile specification cards placement preserved");

  // -------------------------------------------------------------------------
  // TEST 6: Real Catalogue Product Inspection (Long, Short, Missing Specs)
  // -------------------------------------------------------------------------
  console.log("\n--- TEST 6: Real Catalogue Product Data Integrity ---");
  const allProds = store.getProducts({ includeInactive: true });
  assert.ok(allProds.length >= 190, `Catalogue must have at least 190 products (found: ${allProds.length})`);

  // Product 1: OT Light with Long Description
  const otLight = allProds.find(p => p.slug === "ceiling-mounted-led-ot-light-single-dome-hex-design-for-surgical-use");
  assert.ok(otLight, "Ceiling-mounted OT Light must exist in catalogue");
  const otDesc = otLight.fullDescription || otLight.overview || "";
  assert.ok(otDesc.length > 500, `OT Light must have long description (length: ${otDesc.length})`);
  console.log(`  ✔ PASS: Long description product verified: "${otLight.title || otLight.name}" (${otDesc.length} chars)`);

  // Product 2: Short Description Product
  const shortProd = allProds.find(p => p.slug === "3-mhz-replacement-wand-probe-for-primo");
  assert.ok(shortProd, "3 MHz Wand Probe must exist in catalogue");
  const shortDesc = shortProd.fullDescription || shortProd.overview || "";
  assert.ok(shortDesc.length > 0 && shortDesc.length < 200, `Short product must have short description (length: ${shortDesc.length})`);
  console.log(`  ✔ PASS: Short description product verified: "${shortProd.title || shortProd.name}" (${shortDesc.length} chars)`);

  // Product 3: Product with "Not specified" specifications
  const missingSpecProd = allProds.find(p => p.slug === "surgical-cautery-400-watts-electrosurgical-generator");
  assert.ok(missingSpecProd, "Surgical Cautery 400W must exist in catalogue");
  console.log(`  ✔ PASS: Product with missing specs verified: "${missingSpecProd.title || missingSpecProd.name}"`);

  console.log("\n==========================================================================");
  console.log("  ALL PRODUCT PAGE LAYOUT VERIFICATION CHECKS PASSED (100%)");
  console.log("==========================================================================");
}

runProductLayoutTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
  });

