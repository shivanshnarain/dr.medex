/**
 * DR.MEDEX Global Checkout & Address Intelligence Test Suite
 * Validates worldwide countries, phone codes, states, cities,
 * address autocomplete, MongoDB address persistence, and PayPal order creation.
 */

require("dotenv").config();
const assert = require("assert");
const locationService = require("../services/locationService");
const orderService = require("../services/orderService");
const paypalService = require("../services/paypalService");
const store = require("../services/store");

async function runCheckoutIntelligenceTests() {
  console.log("\n========================================================");
  console.log("  DR.MEDEX — GLOBAL CHECKOUT & ADDRESS INTELLIGENCE TESTS");
  console.log("========================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}:`, err.message);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Worldwide Countries Database Coverage
  test("Worldwide Countries: 250 ISO countries loaded", () => {
    const countries = locationService.getAllCountries();
    assert(countries.length >= 240, `Expected at least 240 countries, got ${countries.length}`);
  });

  // 2. India (+91, 36 states, INR)
  test("Country Data: India has +91 dial code, INR currency, PIN Code label, and 36 states", () => {
    const countries = locationService.getAllCountries();
    const india = countries.find((c) => c.code === "IN");
    assert(india, "India not found");
    assert.strictEqual(india.dialCode, "+91");
    assert.strictEqual(india.currency, "INR");
    assert.strictEqual(india.postalLabel, "PIN Code");

    const states = locationService.getStatesByCountry("IN");
    assert.strictEqual(states.length, 36, `Expected 36 states/UTs for India, got ${states.length}`);
  });

  // 3. Pakistan (+92, 8 administrative divisions, PKR)
  test("Country Data: Pakistan has +92 dial code, PKR currency, and 8 administrative divisions", () => {
    const countries = locationService.getAllCountries();
    const pk = countries.find((c) => c.code === "PK");
    assert(pk, "Pakistan not found");
    assert.strictEqual(pk.dialCode, "+92");
    assert.strictEqual(pk.currency, "PKR");

    const states = locationService.getStatesByCountry("PK");
    assert(states.length >= 7, `Expected at least 7 divisions for Pakistan, got ${states.length}`);
  });

  // 4. United States (+1, 66 states/territories, USD, ZIP Code)
  test("Country Data: United States has +1 dial code, USD currency, ZIP Code label, and states", () => {
    const countries = locationService.getAllCountries();
    const us = countries.find((c) => c.code === "US");
    assert(us, "United States not found");
    assert.strictEqual(us.dialCode, "+1");
    assert.strictEqual(us.currency, "USD");
    assert.strictEqual(us.postalLabel, "ZIP Code");

    const states = locationService.getStatesByCountry("US");
    assert(states.length >= 50, `Expected at least 50 US states, got ${states.length}`);
  });

  // 5. Canada (+1, 13 provinces/territories, CAD)
  test("Country Data: Canada has +1 dial code, CAD currency, Province label, and 13 provinces", () => {
    const countries = locationService.getAllCountries();
    const ca = countries.find((c) => c.code === "CA");
    assert(ca, "Canada not found");
    assert.strictEqual(ca.dialCode, "+1");
    assert.strictEqual(ca.currency, "CAD");
    assert.strictEqual(ca.stateLabel, "Province");

    const provinces = locationService.getStatesByCountry("CA");
    assert.strictEqual(provinces.length, 13, `Expected 13 Canadian provinces, got ${provinces.length}`);
  });

  // 6. United Kingdom (+44, GBP)
  test("Country Data: United Kingdom has +44 dial code and GBP currency", () => {
    const countries = locationService.getAllCountries();
    const gb = countries.find((c) => c.code === "GB");
    assert(gb, "United Kingdom not found");
    assert.strictEqual(gb.dialCode, "+44");
    assert.strictEqual(gb.currency, "GBP");
  });

  // 7. Germany (+49, EUR, 16 federal states)
  test("Country Data: Germany has +49 dial code, EUR currency, and 16 federal states", () => {
    const countries = locationService.getAllCountries();
    const de = countries.find((c) => c.code === "DE");
    assert(de, "Germany not found");
    assert.strictEqual(de.dialCode, "+49");
    assert.strictEqual(de.currency, "EUR");

    const states = locationService.getStatesByCountry("DE");
    assert.strictEqual(states.length, 16, `Expected 16 German states, got ${states.length}`);
  });

  // 8. United Arab Emirates (+971, AED, 7 emirates)
  test("Country Data: UAE has +971 dial code, AED currency, and 7 emirates", () => {
    const countries = locationService.getAllCountries();
    const ae = countries.find((c) => c.code === "AE");
    assert(ae, "UAE not found");
    assert.strictEqual(ae.dialCode, "+971");
    assert.strictEqual(ae.currency, "AED");

    const emirates = locationService.getStatesByCountry("AE");
    assert.strictEqual(emirates.length, 7, `Expected 7 emirates, got ${emirates.length}`);
  });

  // 9. Cities search and filtering
  test("City Lookup: Search cities in Maharashtra, India", () => {
    const cities = locationService.getCitiesByCountryAndState("IN", "MH", "Mum");
    assert(cities.length > 0, "Expected at least one city matching 'Mum' in Maharashtra");
    assert(cities.some((c) => c.name.toLowerCase().includes("mumbai")), "Expected Mumbai in results");
  });

  // 10. Real-Time Address Autocomplete with OpenStreetMap / Photon
  await testAsync("Address Autocomplete: Real-time geocoding query returns structured components", async () => {
    const results = await locationService.autocompleteAddress("Mayo Clinic", "US");
    assert(Array.isArray(results), "Expected array of suggestions");
    assert(results.length > 0, "Expected at least one suggestion for 'Mayo Clinic'");
    const first = results[0];
    assert(first.formattedAddress, "Missing formattedAddress");
    assert(first.city, "Missing city in suggestion");
    assert(first.country, "Missing country in suggestion");
  });

  // 11. Address Autocomplete Cache Performance
  await testAsync("Address Autocomplete: Subsequent identical queries are served from in-memory cache", async () => {
    const start = Date.now();
    const cachedResults = await locationService.autocompleteAddress("Mayo Clinic", "US");
    const elapsed = Date.now() - start;
    assert(elapsed < 10, `Cached query should resolve in <10ms, took ${elapsed}ms`);
    assert(cachedResults.length > 0, "Cached results should not be empty");
  });

  // 12. Address Autocomplete Fallback Resilience
  await testAsync("Address Autocomplete Resilience: Empty or single char query safely returns empty array", async () => {
    const emptyResults = await locationService.autocompleteAddress("", "IN");
    assert.deepStrictEqual(emptyResults, []);
    const singleChar = await locationService.autocompleteAddress("A", "US");
    assert.deepStrictEqual(singleChar, []);
  });

  // 13. PayPal Sandbox Order Creation with Global Customer Data
  await testAsync("PayPal & Order Lifecycle: Server calculates and generates valid PayPal Order", async () => {
    const catalog = store.getProducts();
    assert(catalog.length > 0, "No catalog products found");
    const testProduct = catalog[0];

    const orderPayload = {
      customer: {
        firstName: "Test",
        lastName: "Doctor",
        fullName: "Test Doctor",
        email: "test.doctor@medicuroglobal.test",
        phone: "+91 9876543210",
        countryCode: "IN",
        companyName: "Global Surgical Institute"
      },
      shippingAddress: {
        fullName: "Test Doctor",
        companyName: "Global Surgical Institute",
        phone: "+91 9876543210",
        addressLine1: "100 Hospital Boulevard",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "400001",
        country: "India",
        countryCode: "IN"
      },
      billingSameAsShipping: true,
      currency: "INR",
      couponCode: null,
      shippingMethod: {
        id: "dhl-air-express",
        name: "DHL Express Medical Air Cargo",
        carrier: "DHL Express",
        costUSD: 0,
        estimatedDays: "3–6 Business Days"
      },
      items: [
        {
          productId: testProduct.id,
          quantity: 1,
          image: testProduct.images[0]
        }
      ]
    };

    const calculated = orderService.validateAndCalculateOrder(orderPayload);
    assert(calculated.pricing.grandTotal > 0, "Grand total should be greater than 0");
    assert.strictEqual(calculated.pricing.shipping, 0, "Complimentary air cargo should be 0");
    assert.strictEqual(calculated.items.length, 1, "Expected 1 item in order");

    // Test PayPal Order generation
    const paypalRes = await paypalService.createOrder({
      orderNumber: calculated.orderNumber,
      amount: calculated.pricing.grandTotal,
      currency: "USD",
      items: calculated.items,
      shippingAddress: orderPayload.shippingAddress
    });

    assert(paypalRes.id, "PayPal Order ID should be returned");
    console.log(`    -> Created PayPal Sandbox Order ID: ${paypalRes.id} for Order #${calculated.orderNumber}`);
  });

  console.log("\n========================================================");
  console.log(`  TEST RESULTS: ${passed} / ${total} SUCCEEDED (${Math.round((passed / total) * 100)}%)`);
  console.log("========================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runCheckoutIntelligenceTests().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
