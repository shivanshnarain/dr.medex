/**
 * DR.MEDEX Global 195 Countries, Phone, Address & Checkout Test Suite
 * Validates the exact 195 supplied sovereign countries, calling codes, flags,
 * phone input duplication removal, dynamic administrative subdivisions,
 * address autocomplete fallback, and PayPal order creation.
 */

require("dotenv").config();
const assert = require("assert");
const locationService = require("../services/locationService");
const orderService = require("../services/orderService");
const paypalService = require("../services/paypalService");
const store = require("../services/store");
const worldwide195 = require("../data/worldwide195Countries");

const expected195 = [
  ["Afghanistan", "+93"],
  ["Albania", "+355"],
  ["Algeria", "+213"],
  ["Andorra", "+376"],
  ["Angola", "+244"],
  ["Antigua and Barbuda", "+1 268"],
  ["Argentina", "+54"],
  ["Armenia", "+374"],
  ["Australia", "+61"],
  ["Austria", "+43"],
  ["Azerbaijan", "+994"],
  ["Bahamas", "+1 242"],
  ["Bahrain", "+973"],
  ["Bangladesh", "+880"],
  ["Barbados", "+1 246"],
  ["Belarus", "+375"],
  ["Belgium", "+32"],
  ["Belize", "+501"],
  ["Benin", "+229"],
  ["Bhutan", "+975"],
  ["Bolivia", "+591"],
  ["Bosnia and Herzegovina", "+387"],
  ["Botswana", "+267"],
  ["Brazil", "+55"],
  ["Brunei", "+673"],
  ["Bulgaria", "+359"],
  ["Burkina Faso", "+226"],
  ["Burundi", "+257"],
  ["Cabo Verde", "+238"],
  ["Cambodia", "+855"],
  ["Cameroon", "+237"],
  ["Canada", "+1"],
  ["Central African Republic", "+236"],
  ["Chad", "+235"],
  ["Chile", "+56"],
  ["China", "+86"],
  ["Colombia", "+57"],
  ["Comoros", "+269"],
  ["Republic of the Congo", "+242"],
  ["Costa Rica", "+506"],
  ["Côte d’Ivoire", "+225"],
  ["Croatia", "+385"],
  ["Cuba", "+53"],
  ["Cyprus", "+357"],
  ["Czechia", "+420"],
  ["Democratic Republic of the Congo", "+243"],
  ["Denmark", "+45"],
  ["Djibouti", "+253"],
  ["Dominica", "+1 767"],
  ["Dominican Republic", "+1 809"],
  ["Ecuador", "+593"],
  ["Egypt", "+20"],
  ["El Salvador", "+503"],
  ["Equatorial Guinea", "+240"],
  ["Eritrea", "+291"],
  ["Estonia", "+372"],
  ["Eswatini", "+268"],
  ["Ethiopia", "+251"],
  ["Fiji", "+679"],
  ["Finland", "+358"],
  ["France", "+33"],
  ["Gabon", "+241"],
  ["Gambia", "+220"],
  ["Georgia", "+995"],
  ["Germany", "+49"],
  ["Ghana", "+233"],
  ["Greece", "+30"],
  ["Grenada", "+1 473"],
  ["Guatemala", "+502"],
  ["Guinea", "+224"],
  ["Guinea-Bissau", "+245"],
  ["Guyana", "+592"],
  ["Haiti", "+509"],
  ["Honduras", "+504"],
  ["Hungary", "+36"],
  ["Iceland", "+354"],
  ["India", "+91"],
  ["Indonesia", "+62"],
  ["Iran", "+98"],
  ["Iraq", "+964"],
  ["Ireland", "+353"],
  ["Israel", "+972"],
  ["Italy", "+39"],
  ["Jamaica", "+1 876"],
  ["Japan", "+81"],
  ["Jordan", "+962"],
  ["Kazakhstan", "+7"],
  ["Kenya", "+254"],
  ["Kiribati", "+686"],
  ["Kuwait", "+965"],
  ["Kyrgyzstan", "+996"],
  ["Laos", "+856"],
  ["Latvia", "+371"],
  ["Lebanon", "+961"],
  ["Lesotho", "+266"],
  ["Liberia", "+231"],
  ["Libya", "+218"],
  ["Liechtenstein", "+423"],
  ["Lithuania", "+370"],
  ["Luxembourg", "+352"],
  ["Madagascar", "+261"],
  ["Malawi", "+265"],
  ["Malaysia", "+60"],
  ["Maldives", "+960"],
  ["Mali", "+223"],
  ["Malta", "+356"],
  ["Marshall Islands", "+692"],
  ["Mauritania", "+222"],
  ["Mauritius", "+230"],
  ["Mexico", "+52"],
  ["Micronesia", "+691"],
  ["Moldova", "+373"],
  ["Monaco", "+377"],
  ["Mongolia", "+976"],
  ["Montenegro", "+382"],
  ["Morocco", "+212"],
  ["Mozambique", "+258"],
  ["Myanmar", "+95"],
  ["Namibia", "+264"],
  ["Nauru", "+674"],
  ["Nepal", "+977"],
  ["Netherlands", "+31"],
  ["New Zealand", "+64"],
  ["Nicaragua", "+505"],
  ["Niger", "+227"],
  ["Nigeria", "+234"],
  ["North Korea", "+850"],
  ["North Macedonia", "+389"],
  ["Norway", "+47"],
  ["Oman", "+968"],
  ["Pakistan", "+92"],
  ["Palau", "+680"],
  ["Palestine", "+970"],
  ["Panama", "+507"],
  ["Papua New Guinea", "+675"],
  ["Paraguay", "+595"],
  ["Peru", "+51"],
  ["Philippines", "+63"],
  ["Poland", "+48"],
  ["Portugal", "+351"],
  ["Qatar", "+974"],
  ["Romania", "+40"],
  ["Russia", "+7"],
  ["Rwanda", "+250"],
  ["Saint Kitts and Nevis", "+1 869"],
  ["Saint Lucia", "+1 758"],
  ["Saint Vincent and the Grenadines", "+1 784"],
  ["Samoa", "+685"],
  ["San Marino", "+378"],
  ["Sao Tome and Principe", "+239"],
  ["Saudi Arabia", "+966"],
  ["Senegal", "+221"],
  ["Serbia", "+381"],
  ["Seychelles", "+248"],
  ["Sierra Leone", "+232"],
  ["Singapore", "+65"],
  ["Slovakia", "+421"],
  ["Slovenia", "+386"],
  ["Solomon Islands", "+677"],
  ["Somalia", "+252"],
  ["South Africa", "+27"],
  ["South Korea", "+82"],
  ["South Sudan", "+211"],
  ["Spain", "+34"],
  ["Sri Lanka", "+94"],
  ["Sudan", "+249"],
  ["Suriname", "+597"],
  ["Sweden", "+46"],
  ["Switzerland", "+41"],
  ["Syria", "+963"],
  ["Tajikistan", "+992"],
  ["Tanzania", "+255"],
  ["Thailand", "+66"],
  ["Timor-Leste", "+670"],
  ["Togo", "+228"],
  ["Tonga", "+676"],
  ["Trinidad and Tobago", "+1 868"],
  ["Tunisia", "+216"],
  ["Turkey", "+90"],
  ["Turkmenistan", "+993"],
  ["Tuvalu", "+688"],
  ["Uganda", "+256"],
  ["Ukraine", "+380"],
  ["United Arab Emirates", "+971"],
  ["United Kingdom", "+44"],
  ["United States", "+1"],
  ["Uruguay", "+598"],
  ["Uzbekistan", "+998"],
  ["Vanuatu", "+678"],
  ["Vatican City (Holy See)", "+39"],
  ["Venezuela", "+58"],
  ["Vietnam", "+84"],
  ["Yemen", "+967"],
  ["Zambia", "+260"],
  ["Zimbabwe", "+263"]
];

async function runComprehensiveTests() {
  console.log("\n==================================================================");
  console.log("  DR.MEDEX — 195 COUNTRIES, PHONE, ADDRESS & CHECKOUT TEST SUITE");
  console.log("==================================================================\n");

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

  // TEST 1: Exact 195 Countries Count
  test("Country Count: Exactly 195 sovereign countries present", () => {
    assert.strictEqual(worldwide195.length, 195, `Expected 195 countries, got ${worldwide195.length}`);
  });

  // TEST 2: Every single supplied country name and calling code matches exactly
  test("Country Integrity: Every supplied country name and calling code matches exactly", () => {
    for (const [expectedName, expectedDial] of expected195) {
      const found = worldwide195.find((c) => c.name === expectedName);
      assert(found, `Missing country: ${expectedName}`);
      assert.strictEqual(
        found.dialCode,
        expectedDial,
        `Calling code mismatch for ${expectedName}. Expected ${expectedDial}, got ${found.dialCode}`
      );
      assert(found.flag, `Missing flag for ${expectedName}`);
      assert(found.code && found.code.length === 2, `Invalid ISO code for ${expectedName}`);
    }
  });

  // TEST 3: Shared Calling Codes Distinguishability
  test("Shared Calling Codes: Distinguishes US (+1), Canada (+1), Russia (+7), Kazakhstan (+7), Vatican (+39)", () => {
    const us = worldwide195.find((c) => c.code === "US");
    const ca = worldwide195.find((c) => c.code === "CA");
    assert(us && ca, "US or Canada missing");
    assert.strictEqual(us.dialCode, "+1");
    assert.strictEqual(ca.dialCode, "+1");
    assert.notStrictEqual(us.code, ca.code);

    const ru = worldwide195.find((c) => c.code === "RU");
    const kz = worldwide195.find((c) => c.code === "KZ");
    assert(ru && kz, "Russia or Kazakhstan missing");
    assert.strictEqual(ru.dialCode, "+7");
    assert.strictEqual(kz.dialCode, "+7");
    assert.notStrictEqual(ru.code, kz.code);

    const it = worldwide195.find((c) => c.code === "IT");
    const va = worldwide195.find((c) => c.code === "VA");
    assert(it && va, "Italy or Vatican missing");
    assert.strictEqual(it.dialCode, "+39");
    assert.strictEqual(va.dialCode, "+39");
    assert.notStrictEqual(it.code, va.code);
  });

  // TEST 4: Phone Input Duplicate Code Sanitization
  test("Phone Input: Right-side input strictly strips dial code and prevents duplication", () => {
    function sanitize(raw, dialCode) {
      if (!raw) return "";
      let s = String(raw).trim();
      if (s.startsWith("+")) s = s.substring(1);
      const dialDigits = (dialCode || "").replace(/[^0-9]/g, "");
      const digitsOnly = s.replace(/[^0-9]/g, "");
      if (dialDigits && digitsOnly.startsWith(dialDigits)) {
        let count = 0;
        let idx = 0;
        while (idx < s.length && count < dialDigits.length) {
          if (/[0-9]/.test(s[idx])) count++;
          idx++;
        }
        s = s.substring(idx);
      }
      return s.replace(/^[+\s-]+/, "").replace(/[^\d\s-]/g, "").trim();
    }

    assert.strictEqual(sanitize("+91 9876543210", "+91"), "9876543210");
    assert.strictEqual(sanitize("+919876543210", "+91"), "9876543210");
    assert.strictEqual(sanitize("+92 3001234567", "+92"), "3001234567");
    assert.strictEqual(sanitize("+1 4155550192", "+1"), "4155550192");
    assert.strictEqual(sanitize("+44 7911123456", "+44"), "7911123456");
    assert.strictEqual(sanitize("+49 15123456789", "+49"), "15123456789");
    assert.strictEqual(sanitize("+971 501234567", "+971"), "501234567");
    assert.strictEqual(sanitize("+1 268 7654321", "+1 268"), "7654321");
  });

  // TEST 5: libphonenumber-js Validation Across Focus Countries
  test("libphonenumber-js: Validates international numbering formats", () => {
    const inVal = locationService.validatePhoneNumber("9876543210", "IN");
    assert(inVal.isValid, "Expected valid Indian phone number");
    assert.strictEqual(inVal.callingCode, "+91");

    const pkVal = locationService.validatePhoneNumber("3001234567", "PK");
    assert(pkVal.isValid, "Expected valid Pakistani phone number");
    assert.strictEqual(pkVal.callingCode, "+92");

    const usVal = locationService.validatePhoneNumber("4155550192", "US");
    assert(usVal.isValid, "Expected valid US phone number");
    assert.strictEqual(usVal.callingCode, "+1");

    const ukVal = locationService.validatePhoneNumber("7911123456", "GB");
    assert(ukVal.isValid, "Expected valid UK phone number");
    assert.strictEqual(ukVal.callingCode, "+44");
  });

  // TEST 6: Dynamic Subdivisions for Major Nations
  test("Dynamic Subdivisions: Loads correct regional states and administrative areas", () => {
    const inStates = locationService.getStatesByCountry("IN");
    assert.strictEqual(inStates.length, 36, `Expected 36 Indian states, got ${inStates.length}`);

    const usStates = locationService.getStatesByCountry("US");
    assert(usStates.length >= 50, `Expected at least 50 US states, got ${usStates.length}`);

    const caStates = locationService.getStatesByCountry("CA");
    assert.strictEqual(caStates.length, 13, `Expected 13 Canadian provinces, got ${caStates.length}`);

    const deStates = locationService.getStatesByCountry("DE");
    assert.strictEqual(deStates.length, 16, `Expected 16 German states, got ${deStates.length}`);

    const aeStates = locationService.getStatesByCountry("AE");
    assert.strictEqual(aeStates.length, 7, `Expected 7 UAE emirates, got ${aeStates.length}`);
  });

  // TEST 7: Country-Specific Postal Handling
  test("Country-Specific Postal: Identifies countries without postal codes and country-specific labels", () => {
    const inC = worldwide195.find((c) => c.code === "IN");
    assert.strictEqual(inC.postalLabel, "PIN Code");
    assert.strictEqual(inC.hasPostalCode, true);

    const usC = worldwide195.find((c) => c.code === "US");
    assert.strictEqual(usC.postalLabel, "ZIP Code");
    assert.strictEqual(usC.hasPostalCode, true);

    const gbC = worldwide195.find((c) => c.code === "GB");
    assert.strictEqual(gbC.postalLabel, "Postcode");
    assert.strictEqual(gbC.hasPostalCode, true);

    const aoC = worldwide195.find((c) => c.code === "AO"); // Angola
    assert.strictEqual(aoC.hasPostalCode, false);
    assert.strictEqual(aoC.postalLabel, null);
  });

  // TEST 8: Address Autocomplete & Provider Status
  await testAsync("Address Autocomplete & Provider Status: Returns suggestions and provider status", async () => {
    const status = locationService.getProviderStatus();
    assert.strictEqual(status.countriesCount, 195);
    assert(status.activeProvider, "Missing activeProvider");

    const suggestions = await locationService.autocompleteAddress("Mayo Clinic", "US");
    assert(Array.isArray(suggestions));
    assert(suggestions.length > 0, "Expected autocomplete suggestions for Mayo Clinic");
  });

  // TEST 9: PayPal Order Creation & Lifecycle
  await testAsync("PayPal & Order Lifecycle: Server validates payload and creates valid PayPal order", async () => {
    const catalog = store.getProducts();
    const testProduct = catalog[0];

    const orderPayload = {
      customer: {
        firstName: "Chief",
        lastName: "Procurement",
        fullName: "Chief Procurement",
        email: "procurement@apollo.org",
        phone: "+91 9876543210",
        countryCode: "IN",
        companyName: "Apollo Medical Institute"
      },
      shippingAddress: {
        fullName: "Chief Procurement",
        companyName: "Apollo Medical Institute",
        phone: "+91 9876543210",
        addressLine1: "100 Medical City Road",
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
    assert(calculated.pricing.grandTotal > 0);

    const paypalRes = await paypalService.createOrder({
      orderNumber: calculated.orderNumber,
      amount: calculated.pricing.grandTotal,
      currency: "USD",
      items: calculated.items,
      shippingAddress: orderPayload.shippingAddress
    });

    assert(paypalRes.id, "PayPal Order ID should be returned");
    console.log(`    -> Created Live PayPal Sandbox Order ID: ${paypalRes.id} for Order #${calculated.orderNumber}`);
  });

  console.log("\n==================================================================");
  console.log(`  TEST RESULTS: ${passed} / ${total} SUCCEEDED (${Math.round((passed / total) * 100)}%)`);
  console.log("==================================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runComprehensiveTests().catch((err) => {
  console.error("Test Suite error:", err);
  process.exit(1);
});
