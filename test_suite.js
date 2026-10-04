const fs = require("fs");
const path = require("path");

async function runTests() {
  console.log("=================================================");
  console.log("  DR.MEDEX PRODUCTION VERIFICATION TEST SUITE   ");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // TEST 1 — SEARCH BACKEND & LIVE AUTOCOMPLETE
  console.log("\n--- TEST GROUP 1: SEARCH FUNCTIONALITY ---");
  try {
    const store = require("./server/services/store");
    const testQueries = ["F", "OT", "laser", "electro", "table"];
    for (const q of testQueries) {
      const liveRes = store.searchLive(q);
      assert(
        liveRes.products && liveRes.products.length > 0,
        `Live search query '${q}' returns products (found: ${liveRes.products.length}, total: ${liveRes.totalCount})`
      );
      if (q === "OT" || q === "table" || q === "electro") {
        assert(
          liveRes.categories && liveRes.categories.length > 0,
          `Live search query '${q}' returns matching categories (found: ${liveRes.categories.map(c => c.name).join(", ")})`
        );
      }
    }
  } catch (err) {
    assert(false, `Search testing failed: ${err.message}`);
  }

  // TEST 2 — CURRENCY & FX RATES LOGIC
  console.log("\n--- TEST GROUP 2: CURRENCY & LIVE FX CONVERSION ---");
  try {
    const cs = require("./server/services/currencyService");
    const ratesData = cs.getExchangeRates();
    assert(ratesData.baseCurrency === "INR", `Base currency is INR (received: ${ratesData.baseCurrency})`);
    assert(ratesData.rates && ratesData.rates.USD > 0, `Live USD rate exists against INR (${ratesData.rates.USD})`);
    assert(ratesData.rates && ratesData.rates.GBP > 0, `Live GBP rate exists against INR (${ratesData.rates.GBP})`);
    assert(ratesData.rates && ratesData.rates.EUR > 0, `Live EUR rate exists against INR (${ratesData.rates.EUR})`);

    // Verify INR 1,000 conversions
    const inrVal = cs.convertPrice(1000, "INR");
    const inrFormatted = cs.formatPrice(inrVal, "INR");
    assert(inrVal === 1000 && inrFormatted.includes("1,000"), `INR 1,000 displays as ₹1,000 (got: ${inrFormatted})`);

    const usdVal = cs.convertPrice(1000, "USD");
    const usdFormatted = cs.formatPrice(usdVal, "USD");
    assert(usdVal > 0 && (usdFormatted.includes("$") || usdFormatted.includes("USD")), `INR 1,000 converts dynamically to USD (got: ${usdFormatted})`);

    const gbpVal = cs.convertPrice(1000, "GBP");
    const gbpFormatted = cs.formatPrice(gbpVal, "GBP");
    assert(gbpVal > 0 && gbpFormatted.includes("£"), `INR 1,000 converts dynamically to GBP (got: ${gbpFormatted})`);
  } catch (err) {
    assert(false, `Currency testing failed: ${err.message}`);
  }

  // TEST 3 — NAVBAR STRUCTURE & REQUIREMENTS
  console.log("\n--- TEST GROUP 3: NAVBAR UI & STRUCTURE ---");
  try {
    const headerPath = path.join(__dirname, "client/src/components/Header.tsx");
    const headerContent = fs.readFileSync(headerPath, "utf-8");

    assert(!headerContent.includes("Request a Quote"), "Navbar has NO 'Request a Quote' button");
    assert(headerContent.includes("bg-[#167A4A]") || headerContent.includes("bg-[#13673e]"), "Navbar has green search button");
    assert(headerContent.includes("wishlistCount"), "Navbar displays wishlist count badge");
    assert(headerContent.includes("itemCount"), "Navbar displays cart quantity badge");
    assert(headerContent.includes("Heart"), "Navbar includes Heart/Wishlist icon");
    assert(headerContent.includes("Globe"), "Navbar includes Country/Currency Globe selector");
    assert(headerContent.includes("Search Results"), "Navbar includes Live Search dropdown with Search Results");
    assert(headerContent.includes("Categories"), "Navbar live search dropdown includes Categories section");
    assert(headerContent.includes("h-[2px] bg-[#167A4A]"), "Navbar second row has elegant green active underline");
    assert(headerContent.includes("{item.label} Subcategories"), "Navbar includes mega menu dropdown for categories");
    assert(headerContent.includes("Ultrasound Therapy Machines"), "Physiotherapy mega menu includes real subcategories");
    assert(headerContent.includes("Single Dome OT Lights"), "OT Lights mega menu includes real subcategories");
    assert(headerContent.includes("Operating Tables"), "OT Tables mega menu includes real subcategories");
  } catch (err) {
    assert(false, `Navbar structure check failed: ${err.message}`);
  }

  // TEST 4 — HERO SECTION & 5 CATEGORY CARDS
  console.log("\n--- TEST GROUP 4: HERO SECTION & 5 CARDS ---");
  try {
    const heroPath = path.join(__dirname, "client/src/components/HeroSection.tsx");
    const heroContent = fs.readFileSync(heroPath, "utf-8");

    assert(heroContent.includes("hero-bg.png"), "Hero uses provided background image (/hero-bg.png)");
    assert(heroContent.includes("linear-gradient(90deg,"), "Hero uses left-side cinematic gradient overlay");
    assert(heroContent.includes("Trusted Medical Equipment Partner"), "Hero has clean eyebrow");
    assert(heroContent.includes("Advanced Medical"), "Hero has headline 'Advanced Medical Technology for Better Care'");
    assert(heroContent.includes("Reliable Performance"), "Hero has 'Reliable Performance' trust badge");
    assert(heroContent.includes("Global Standards"), "Hero has 'Global Standards' trust badge");
    assert(heroContent.includes("Expert Support"), "Hero has 'Expert Support' trust badge");

    // Check 5 Cards
    const cardsMatch = heroContent.match(/id:\s*"([^"]+)"/g);
    assert(cardsMatch && cardsMatch.length === 5, `Hero contains EXACTLY 5 category cards (found: ${cardsMatch ? cardsMatch.length : 0})`);
    assert(heroContent.includes("Physiotherapy"), "Card 1: Physiotherapy is present");
    assert(heroContent.includes("Electrosurgical Units"), "Card 2: Electrosurgical Units is present");
    assert(heroContent.includes("OT Tables"), "Card 3: OT Tables is present");
    assert(heroContent.includes("OT Lights"), "Card 4: OT Lights is present");
    assert(heroContent.includes("Cryo Surgical"), "Card 5: Cryo Surgical is present");

    // Check images in public
    const publicHeroBg = fs.existsSync(path.join(__dirname, "client/public/hero-bg.png"));
    assert(publicHeroBg, "Hero background file exists in client/public/hero-bg.png");

    const img1 = fs.existsSync(path.join(__dirname, "client/public/products-hero/ultrasound_therapy.jpg"));
    const img2 = fs.existsSync(path.join(__dirname, "client/public/products-hero/electrosurgical_generator.jpg"));
    const img3 = fs.existsSync(path.join(__dirname, "client/public/products-hero/ot_surgical_table.jpg"));
    const img4 = fs.existsSync(path.join(__dirname, "client/public/products-hero/ot_light_petal.jpg"));
    const img5 = fs.existsSync(path.join(__dirname, "client/public/products-hero/cryo_surgical_gun.jpg"));
    assert(img1 && img2 && img3 && img4 && img5, "All 5 product card images exist in client/public/products-hero/");
  } catch (err) {
    assert(false, `Hero structure check failed: ${err.message}`);
  }

  // TEST 5 — COLOR SYSTEM & ZERO BLUE
  console.log("\n--- TEST GROUP 5: ZERO BLUE & COLOR PALETTE ---");
  try {
    const cssPath = path.join(__dirname, "client/src/index.css");
    const cssContent = fs.readFileSync(cssPath, "utf-8");
    assert(cssContent.includes("#167A4A") || cssContent.includes("#1F7A4D"), "Primary accent green is defined");
    assert(cssContent.includes("#EAF5EF"), "Light green #EAF5EF is defined");
    assert(cssContent.includes("#111111"), "Black #111111 is defined");

    // Check for unwanted blue classes across client/src components
    const headerContent = fs.readFileSync(path.join(__dirname, "client/src/components/Header.tsx"), "utf-8");
    const heroContent = fs.readFileSync(path.join(__dirname, "client/src/components/HeroSection.tsx"), "utf-8");
    assert(!headerContent.includes("bg-blue") && !headerContent.includes("text-blue"), "Header has NO blue classes");
    assert(!heroContent.includes("bg-blue") && !heroContent.includes("text-blue"), "HeroSection has NO blue classes");
  } catch (err) {
    assert(false, `Color check failed: ${err.message}`);
  }

  // TEST 6 — DEDICATED WISHLIST PAGE & ROUTE
  console.log("\n--- TEST GROUP 6: WISHLIST SYSTEM ---");
  try {
    const appPath = path.join(__dirname, "client/src/App.tsx");
    const appContent = fs.readFileSync(appPath, "utf-8");
    assert(appContent.includes('<Route path="/wishlist" element={<WishlistPage />} />'), "App.tsx routes /wishlist to WishlistPage");

    const wishlistPagePath = path.join(__dirname, "client/src/pages/WishlistPage.tsx");
    assert(fs.existsSync(wishlistPagePath), "WishlistPage.tsx exists");
  } catch (err) {
    assert(false, `Wishlist check failed: ${err.message}`);
  }

  console.log("\n=================================================");
  console.log(`  TOTAL PASSED: ${passed}`);
  console.log(`  TOTAL FAILED: ${failed}`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
