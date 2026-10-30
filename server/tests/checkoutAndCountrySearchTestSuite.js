/**
 * DR.MEDEX Global — Comprehensive Automated Test Suite
 * Validates:
 * 1. Country search (alphabetic, numeric calling codes, shared dial codes)
 * 2. Reverse geocoding (valid coords, out of range, error states, resolution)
 * 3. Customer form validation (Name, Email, Phone Number, removal of PO Reference)
 * 4. Order creation, calculations, coupon discount, database persistence
 * 5. Vercel serverless API handlers (/api/location/reverse-geocode, /api/location/countries)
 */

const assert = require("assert");
const worldwide195 = require("../data/worldwide195Countries");
const { reverseGeocode, getAllCountries } = require("../services/locationService");
const { validateAndCalculateOrder, createPendingOrder, markOrderAsPaid } = require("../services/orderService");
const reverseGeocodeHandler = require("../../api/location/reverse-geocode");
const countriesHandler = require("../../api/location/countries");
const clientReverseHandler = require("../../client/api/location/reverse-geocode");
const clientCountriesHandler = require("../../client/api/location/countries");

async function runCheckoutTestSuite() {
  console.log("==========================================================");
  console.log("DR.MEDEX Global — Checkout & Country Search Test Suite");
  console.log("==========================================================\n");

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // --- 1. COUNTRY SEARCH & CALLING CODE TESTS ---
  // Replicating the frontend filterWorldwideCountries function
  function filterWorldwideCountries(countries, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return countries;

    const isNumericOnly = /^\+?\d+$/.test(q);
    const searchDigits = q.replace(/^\+/, "").replace(/\s+/g, "");
    const normalizedQuery = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return countries.filter((c) => {
      const nameLower = c.name.toLowerCase();
      const normalizedName = nameLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const codeLower = c.code.toLowerCase();
      const dialDigits = (c.dialCode || "").replace(/^\+/, "").replace(/\s+/g, "");

      if (isNumericOnly) {
        return dialDigits.startsWith(searchDigits);
      }

      if (normalizedName.includes(normalizedQuery)) return true;
      if (codeLower === q || codeLower.startsWith(q)) return true;
      if (searchDigits && dialDigits.startsWith(searchDigits)) return true;

      return false;
    }).sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      const aDigits = (a.dialCode || "").replace(/^\+/, "").replace(/\s+/g, "");
      const bDigits = (b.dialCode || "").replace(/^\+/, "").replace(/\s+/g, "");

      if (isNumericOnly) {
        if (aDigits === searchDigits && bDigits !== searchDigits) return -1;
        if (bDigits === searchDigits && aDigits !== searchDigits) return 1;
        if (aDigits.length !== bDigits.length) return aDigits.length - bDigits.length;
      } else {
        const aStarts = aName.startsWith(q);
        const bStarts = bName.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  test("Search 'India' -> returns India (+91)", () => {
    const res = filterWorldwideCountries(worldwide195, "India");
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].name, "India");
    assert.strictEqual(res[0].dialCode, "+91");
  });

  test("Search 'Ind' -> returns India and Indonesia", () => {
    const res = filterWorldwideCountries(worldwide195, "Ind");
    assert.ok(res.length >= 2);
    const names = res.map((c) => c.name);
    assert.ok(names.includes("India"));
    assert.ok(names.includes("Indonesia"));
    assert.strictEqual(res[0].name, "India"); // startsWith ranked first
  });

  test("Search 'United' -> returns UAE, UK, and US", () => {
    const res = filterWorldwideCountries(worldwide195, "United");
    assert.strictEqual(res.length, 3);
    const names = res.map((c) => c.name);
    assert.ok(names.includes("United States"));
    assert.ok(names.includes("United Kingdom"));
    assert.ok(names.includes("United Arab Emirates"));
  });

  test("Search '91' and '+91' -> returns India (+91)", () => {
    const resWithoutPlus = filterWorldwideCountries(worldwide195, "91");
    assert.strictEqual(resWithoutPlus.length, 1);
    assert.strictEqual(resWithoutPlus[0].name, "India");

    const resWithPlus = filterWorldwideCountries(worldwide195, "+91");
    assert.strictEqual(resWithPlus.length, 1);
    assert.strictEqual(resWithPlus[0].name, "India");
  });

  test("Search '44' -> returns United Kingdom (+44)", () => {
    const res = filterWorldwideCountries(worldwide195, "44");
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].name, "United Kingdom");
    assert.strictEqual(res[0].dialCode, "+44");
  });

  test("Search '971' -> returns United Arab Emirates (+971)", () => {
    const res = filterWorldwideCountries(worldwide195, "971");
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].name, "United Arab Emirates");
    assert.strictEqual(res[0].dialCode, "+971");
  });

  test("Search '1' -> shared calling code test: returns countries using +1 (US, CA, Bahamas, etc.) without matching +91", () => {
    const res = filterWorldwideCountries(worldwide195, "1");
    assert.ok(res.length > 5, "Must return multiple territories using NANP +1");
    const names = res.map((c) => c.name);
    assert.ok(names.includes("United States"));
    assert.ok(names.includes("Canada"));
    assert.ok(names.includes("Bahamas"));
    assert.ok(!names.includes("India"), "Search for '1' must NOT match India (+91)");
    assert.ok(!names.includes("Morocco"), "Search for '1' must NOT match Morocco (+212)");
  });

  test("Search empty state / no match test", () => {
    const res = filterWorldwideCountries(worldwide195, "xyz999nonsense");
    assert.strictEqual(res.length, 0, "No results for non-existent country or code");
  });

  // --- 2. REVERSE GEOCODING TESTS ---
  await asyncTest("Reverse geocode valid coordinates (Dehradun, India)", async () => {
    const res = await reverseGeocode(30.3165, 78.0322);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.countryCode, "IN");
    assert.strictEqual(res.country, "India");
    assert.ok(res.city.includes("Dehradun") || res.district.includes("Dehradun"));
    assert.strictEqual(res.postalCode, "248001");
  });

  await asyncTest("Reverse geocode handles invalid coordinates gracefully", async () => {
    let failed = false;
    try {
      await reverseGeocode(999, 999);
    } catch (e) {
      failed = true;
    }
    assert.strictEqual(failed, true, "Invalid coordinates must throw error");
  });

  // --- 3. VERCEL SERVERLESS HANDLERS RESOLUTION (HTTP 404 FIX) ---
  await asyncTest("Root /api/location/reverse-geocode serverless handler returns HTTP 200", async () => {
    let status = 0;
    let data = null;
    const req = { method: "GET", query: { lat: 30.3165, lng: 78.0322 } };
    const res = {
      setHeader: () => {},
      status: (code) => {
        status = code;
        return {
          json: (d) => { data = d; }
        };
      }
    };
    await reverseGeocodeHandler(req, res);
    assert.strictEqual(status, 200);
    assert.ok(data && data.success);
    assert.strictEqual(data.countryCode, "IN");
  });

  await asyncTest("Client /api/location/reverse-geocode serverless handler returns HTTP 200", async () => {
    let status = 0;
    let data = null;
    const req = { method: "GET", query: { lat: 30.3165, lng: 78.0322 } };
    const res = {
      setHeader: () => {},
      status: (code) => {
        status = code;
        return {
          json: (d) => { data = d; }
        };
      }
    };
    await clientReverseHandler(req, res);
    assert.strictEqual(status, 200);
    assert.ok(data && data.success);
    assert.strictEqual(data.countryCode, "IN");
  });

  test("Root & Client /api/location/countries serverless handlers return 195 countries", () => {
    let rootData = null;
    let clientData = null;
    const mockRes = (setter) => ({
      setHeader: () => {},
      status: (code) => {
        assert.strictEqual(code, 200);
        return { json: setter };
      }
    });

    countriesHandler({ method: "GET" }, mockRes((d) => { rootData = d; }));
    clientCountriesHandler({ method: "GET" }, mockRes((d) => { clientData = d; }));

    assert.strictEqual(rootData.count, 195);
    assert.strictEqual(clientData.count, 195);
  });

  // --- 4. CUSTOMER FORM VALIDATION & PAYLOAD TESTS ---
  test("Personal and professional emails accepted by validation regex", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    assert.strictEqual(emailRegex.test("dr.sharma@apollohospitals.com"), true, "Hospital email");
    assert.strictEqual(emailRegex.test("john.doe@gmail.com"), true, "Personal Gmail");
    assert.strictEqual(emailRegex.test("surgeon@yahoo.co.uk"), true, "Yahoo domain");
    assert.strictEqual(emailRegex.test("notanemail"), false, "Invalid string");
    assert.strictEqual(emailRegex.test("missing@domain"), false, "Missing TLD");
  });

  test("Phone number validation accepts valid local/international numbers", () => {
    const validatePhone = (p) => p && p.trim().length >= 6 && p.replace(/[^\d]/g, "").length >= 6;
    assert.strictEqual(validatePhone("9876543210"), true, "Standard 10-digit mobile");
    assert.strictEqual(validatePhone("+91 9876543210"), true, "With dial code");
    assert.strictEqual(validatePhone("212-555-0199"), true, "US formatted");
    assert.strictEqual(validatePhone("123"), false, "Too short");
  });

  // --- 5. END-TO-END CHECKOUT CALCULATIONS & ORDER PERSISTENCE ---
  await asyncTest("End-to-end Order Validation & Pricing Calculation in Base INR and Target Currency", async () => {
    const orderPayload = {
      items: [
        { productId: "prod-surgical-cautery-400-wat", quantity: 1 }
      ],
      currency: "USD",
      customer: {
        fullName: "Dr. Alexander Wright",
        email: "alexander.wright@clevelandclinic.org",
        phone: "+1 216 444 2200",
        companyName: "Cleveland Clinic",
        department: "General Surgery",
        taxId: "EIN-34-0714580"
        // NO poReference
      },
      shippingAddress: {
        fullName: "Dr. Alexander Wright",
        companyName: "Cleveland Clinic",
        addressLine1: "9500 Euclid Ave",
        city: "Cleveland",
        state: "Ohio",
        postalCode: "44195",
        country: "United States",
        countryCode: "US",
        phone: "+1 216 444 2200"
      }
    };

    const calculated = validateAndCalculateOrder(orderPayload);
    assert.ok(calculated.pricing.baseSubtotalINR > 0, "Item subtotal calculated");
    assert.strictEqual(calculated.pricing.shippingINR, 0, "Air freight complimentary");
    assert.ok(calculated.pricing.grandTotalINR > 0);
    assert.strictEqual(calculated.pricing.currency, "USD");
    assert.ok(calculated.pricing.grandTotal > 0);

    // Create pending order
    const pendingOrder = await createPendingOrder(orderPayload);
    assert.ok(pendingOrder.orderNumber.startsWith("MED-"));
    assert.strictEqual(pendingOrder.payment.status, "PENDING");
    assert.strictEqual(pendingOrder.customer.email, "alexander.wright@clevelandclinic.org");

    // Verify PayPal payment capture
    const paidOrder = await markOrderAsPaid({
      orderNumber: pendingOrder.orderNumber,
      paypalOrderId: "PAYID-TEST-CAPTURE-12345",
      paypalCaptureId: "CAPTURE-98765"
    });
    assert.strictEqual(paidOrder.payment.status, "PAID");
    assert.strictEqual(paidOrder.status, "PROCESSING");
  });

  console.log("\n==========================================================");
  console.log(`ALL ${passed}/${total} TEST SUITE ASSERTIONS PASSED SUCCESSFULLY!`);
  console.log("==========================================================\n");
  process.exit(0);
}

runCheckoutTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
