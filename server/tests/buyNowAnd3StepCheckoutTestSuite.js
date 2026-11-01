/**
 * DR.MEDEX Global — Buy Now Location Detection & 3-Step Checkout Verification Suite
 */

const assert = require("assert");
const locationService = require("../services/locationService");
const orderService = require("../services/orderService");
const store = require("../services/store");

async function runTestSuite() {
  console.log("================================================================================");
  console.log("DR.MEDEX Global — Buy Now Location Detection & 3-Step Checkout Verification Suite");
  console.log("================================================================================");

  let passed = 0;
  let total = 0;

  async function test(description, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] Test ${total}: ${description}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${total}: ${description}`);
      console.error("   Error:", err.message);
      process.exit(1);
    }
  }

  // --- PART 1: ACCURATE COUNTRY AND STATE REVERSE GEOCODING ---
  console.log("\n--- PART 1: ACCURATE GPS LOCATION DETECTION & REGIONAL RESOLUTION ---");

  await test("Odisha, India coordinates resolve correctly to Country: India (+91) and State: Odisha", async () => {
    // Bhubaneswar coordinates: 20.2961° N, 85.8245° E
    const resolved = await locationService.reverseGeocode(20.2961, 85.8245, 15);

    assert.strictEqual(resolved.success, true);
    assert.strictEqual(resolved.country, "India");
    assert.strictEqual(resolved.countryCode, "IN");
    assert.strictEqual(resolved.state, "Odisha");
    assert.ok(resolved.stateCode === "OR" || resolved.stateCode === "OD");
    assert.strictEqual(resolved.countryData.dialCode, "+91");
  });

  await test("Assam, India coordinates resolve correctly to State: Assam (AS)", async () => {
    // Guwahati coordinates: 26.1445° N, 91.7362° E
    const resolved = await locationService.reverseGeocode(26.1445, 91.7362, 20);

    assert.strictEqual(resolved.success, true);
    assert.strictEqual(resolved.country, "India");
    assert.strictEqual(resolved.countryCode, "IN");
    assert.strictEqual(resolved.state, "Assam");
    assert.strictEqual(resolved.stateCode, "AS");
  });

  await test("California, United States coordinates resolve correctly to State: California (CA)", async () => {
    // Los Angeles coordinates: 34.0522° N, -118.2437° W
    const resolved = await locationService.reverseGeocode(34.0522, -118.2437, 25);

    assert.strictEqual(resolved.success, true);
    assert.strictEqual(resolved.country, "United States");
    assert.strictEqual(resolved.countryCode, "US");
    assert.strictEqual(resolved.state, "California");
    assert.strictEqual(resolved.stateCode, "CA");
    assert.strictEqual(resolved.countryData.dialCode, "+1");
  });

  // --- PART 2: 3-STEP CHECKOUT VALIDATION LOGIC ---
  console.log("\n--- PART 2: 3-STEP CHECKOUT PROGRESSION & VALIDATION ---");

  function validateStep1Pure(data) {
    const fName = (data.firstName || "").trim();
    const lName = (data.lastName || "").trim();
    if (!fName || !lName) return { valid: false, error: "Please enter both First Name and Last Name." };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email.trim())) return { valid: false, error: "Please enter a valid Email Address." };
    const cleanPhone = (data.phone || "").replace(/[^\d]/g, "");
    if (!cleanPhone || cleanPhone.length < 6) return { valid: false, error: "Please enter a valid Phone Number with calling code." };
    return { valid: true };
  }

  function validateStep2Pure(data) {
    if (!data.countryCode) return { valid: false, error: "Please select a Destination Country." };
    if (!data.state || !data.state.trim()) return { valid: false, error: "Please select your State / Province." };
    if (!data.city || !data.city.trim()) return { valid: false, error: "Please specify your Delivery City / Locality." };
    if (!data.streetAddress || !data.streetAddress.trim()) return { valid: false, error: "Please enter your Street Address." };
    return { valid: true };
  }

  await test("Step 1 fails when customer details (Name, Email, Phone) are incomplete", () => {
    const res1 = validateStep1Pure({ firstName: "", lastName: "Doe", email: "john@example.com", phone: "+91 9876543210" });
    assert.strictEqual(res1.valid, false);

    const res2 = validateStep1Pure({ firstName: "John", lastName: "Doe", email: "invalid-email", phone: "+91 9876543210" });
    assert.strictEqual(res2.valid, false);

    const res3 = validateStep1Pure({ firstName: "John", lastName: "Doe", email: "john@example.com", phone: "123" });
    assert.strictEqual(res3.valid, false);
  });

  await test("Step 1 passes with valid Customer Details without requiring Hospital or Department", () => {
    const res = validateStep1Pure({
      firstName: "Dr. Sarah",
      lastName: "Jenkins",
      email: "sarah.jenkins@hospital.org",
      phone: "+1 4155550199"
    });
    assert.strictEqual(res.valid, true);
  });

  await test("Step 2 fails when Shipping Address is missing Country, State, City, or Street", () => {
    const res1 = validateStep2Pure({ countryCode: "", state: "Odisha", city: "Bhubaneswar", streetAddress: "Janpath Rd" });
    assert.strictEqual(res1.valid, false);

    const res2 = validateStep2Pure({ countryCode: "IN", state: "", city: "Bhubaneswar", streetAddress: "Janpath Rd" });
    assert.strictEqual(res2.valid, false);

    const res3 = validateStep2Pure({ countryCode: "IN", state: "Odisha", city: "", streetAddress: "Janpath Rd" });
    assert.strictEqual(res3.valid, false);

    const res4 = validateStep2Pure({ countryCode: "IN", state: "Odisha", city: "Bhubaneswar", streetAddress: "" });
    assert.strictEqual(res4.valid, false);
  });

  await test("Step 2 passes with complete Shipping Address", () => {
    const res = validateStep2Pure({
      countryCode: "IN",
      state: "Odisha",
      city: "Bhubaneswar",
      streetAddress: "Plot 42, Infocity Avenue"
    });
    assert.strictEqual(res.valid, true);
  });

  // --- PART 3: BACKEND ORDER CALCULATION & INTEGRATION ---
  console.log("\n--- PART 3: BACKEND ORDER CALCULATION & REVENUE INTEGRATION ---");

  await test("Backend calculate order accepts clean customer and shipping address without optional fields", () => {
    const testProd = store.getProducts(true)[0];
    assert(testProd, "Active catalog must have products");

    const orderCalc = orderService.validateAndCalculateOrder({
      items: [{ productId: testProd.id, quantity: 2 }],
      currency: "USD",
      customer: {
        firstName: "Dr. Sarah",
        lastName: "Jenkins",
        email: "sarah.jenkins@hospital.org",
        phone: "+1 4155550199"
      },
      shippingAddress: {
        addressLine1: "Plot 42, Infocity Avenue",
        city: "Bhubaneswar",
        state: "Odisha",
        stateCode: "OD",
        country: "India",
        countryCode: "IN",
        postalCode: "751024"
      }
    });

    assert(orderCalc.pricing.grandTotal > 0);
    assert.strictEqual(orderCalc.items[0].quantity, 2);
  });

  console.log("\n================================================================================");
  console.log(`ALL TESTS PASSED: ${passed} / ${total} assertions verified.`);
  console.log("================================================================================");
}

runTestSuite();
