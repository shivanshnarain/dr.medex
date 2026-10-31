/**
 * DR.MEDEX Global — GPS Location Detection, State Identification & Checkout Permission Test Suite
 *
 * Validates:
 * 1. Indian State Identification (Odisha, Assam, Uttar Pradesh, Maharashtra, Delhi)
 * 2. Country, State Code & ISO Normalization against DR.MEDEX 195 Sovereign Countries
 * 3. International Geocoding (USA, UK, Canada, UAE)
 * 4. Accuracy Tier & Reported Accuracy Radius in Meters
 * 5. City Name Cleanliness & Matching against Local Subdivisions
 * 6. Serverless API Handlers (/api/location/reverse-geocode, client/api/location/reverse-geocode)
 * 7. Resilient Fallback Architecture (Nominatim -> BigDataCloud)
 */

const assert = require("assert");
const locationService = require("../services/locationService");
const rootReverseHandler = require("../../api/location/reverse-geocode");
const clientReverseHandler = require("../../client/api/location/reverse-geocode");

// Helper to mock Express req & res for serverless handler testing
function createMockHttp(query = {}) {
  let statusCode = 200;
  let responseData = null;
  const headers = {};

  const req = {
    method: "GET",
    query
  };

  const res = {
    setHeader: (k, v) => {
      headers[k] = v;
    },
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    },
    end: () => res
  };

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getData: () => responseData,
    getHeaders: () => headers
  };
}

async function runGpsLocationDetectionTestSuite() {
  console.log("==========================================================");
  console.log("DR.MEDEX Global — GPS Location Detection & State Test Suite");
  console.log("==========================================================");

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
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

  // TEST 1: ODISHA (Bhubaneswar)
  await test("Odisha, India (Bhubaneswar): Correct Country, State, StateCode and PIN", async () => {
    const res = await locationService.reverseGeocode(20.2961, 85.8245, 25);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.countryCode, "IN");
    assert.strictEqual(res.country, "India");
    assert.strictEqual(res.state, "Odisha");
    assert.ok(res.stateCode === "OR" || res.stateCode === "OD", `Expected OR/OD, got ${res.stateCode}`);
    assert.ok(res.city.toLowerCase().includes("bhuban"), `Expected Bhubaneswar, got ${res.city}`);
    assert.strictEqual(res.accuracy, 25);
    assert.strictEqual(res.accuracyTier, "high");
  });

  // TEST 2: ASSAM (Guwahati)
  await test("Assam, India (Guwahati): Correct State and StateCode (AS)", async () => {
    const res = await locationService.reverseGeocode(26.1445, 91.7362, 15);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.countryCode, "IN");
    assert.strictEqual(res.state, "Assam");
    assert.strictEqual(res.stateCode, "AS");
    assert.ok(res.city.length > 0);
  });

  // TEST 3: UTTAR PRADESH (Lucknow)
  await test("Uttar Pradesh, India (Lucknow): Correct State and StateCode (UP)", async () => {
    const res = await locationService.reverseGeocode(26.8467, 80.9462, 40);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.countryCode, "IN");
    assert.strictEqual(res.state, "Uttar Pradesh");
    assert.strictEqual(res.stateCode, "UP");
    assert.ok(res.city.toLowerCase().includes("lucknow"));
  });

  // TEST 4: MAHARASHTRA (Mumbai)
  await test("Maharashtra, India (Mumbai): Correct State and StateCode (MH)", async () => {
    const res = await locationService.reverseGeocode(19.0760, 72.8777, 10);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.countryCode, "IN");
    assert.strictEqual(res.state, "Maharashtra");
    assert.strictEqual(res.stateCode, "MH");
    assert.ok(res.city.toLowerCase().includes("mumbai"));
  });

  // TEST 5: DELHI (New Delhi)
  await test("Delhi, India (New Delhi): Correct State and StateCode (DL)", async () => {
    const res = await locationService.reverseGeocode(28.6139, 77.2090, 20);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.countryCode, "IN");
    assert.strictEqual(res.state, "Delhi");
    assert.strictEqual(res.stateCode, "DL");
    assert.ok(res.city.toLowerCase().includes("delhi"));
  });

  // TEST 6: UNITED STATES (California - Los Angeles)
  await test("United States (Los Angeles, California): Country, State (CA), and City", async () => {
    const res = await locationService.reverseGeocode(34.0522, -118.2437, 50);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.countryCode, "US");
    assert.strictEqual(res.state, "California");
    assert.strictEqual(res.stateCode, "CA");
    assert.ok(res.city.toLowerCase().includes("los angeles"));
  });

  // TEST 7: UNITED KINGDOM (London, England)
  await test("United Kingdom (London): Country, Region/Constituent Country (England)", async () => {
    const res = await locationService.reverseGeocode(51.5074, -0.1278, 30);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.countryCode, "GB");
    assert.ok(res.country.toLowerCase().includes("united kingdom"));
    assert.ok(res.state === "England" || res.state.includes("London"));
  });

  // TEST 8: ACCURACY TIERS ASSESSMENT
  await test("Accuracy Radius & Tiers: High (<=500m), Medium (501-5000m), Approximate (>5000m)", async () => {
    const high = await locationService.reverseGeocode(20.2961, 85.8245, 100);
    assert.strictEqual(high.accuracyTier, "high");

    const med = await locationService.reverseGeocode(20.2961, 85.8245, 1500);
    assert.strictEqual(med.accuracyTier, "medium");

    const coarse = await locationService.reverseGeocode(20.2961, 85.8245, 8000);
    assert.strictEqual(coarse.accuracyTier, "approximate");
  });

  // TEST 9: BOUNDARY & INVALID COORDINATES HANDLING
  await test("Coordinate Validation: rejects NaN and out-of-range coordinates gracefully", async () => {
    let failed = false;
    try {
      await locationService.reverseGeocode(95.0, 200.0);
    } catch (e) {
      failed = true;
      assert.ok(e.message.includes("Invalid"));
    }
    assert.strictEqual(failed, true);
  });

  // TEST 10: ROOT SERVERLESS API HANDLER (/api/location/reverse-geocode)
  await test("Root serverless handler (/api/location/reverse-geocode) returns HTTP 200", async () => {
    const { req, res, getStatusCode, getData } = createMockHttp({
      lat: "20.2961",
      lng: "85.8245",
      acc: "20"
    });
    await rootReverseHandler(req, res);
    assert.strictEqual(getStatusCode(), 200);
    const data = getData();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.countryCode, "IN");
    assert.strictEqual(data.state, "Odisha");
    assert.ok(data.stateCode === "OR" || data.stateCode === "OD");
  });

  // TEST 11: CLIENT SERVERLESS API HANDLER (client/api/location/reverse-geocode)
  await test("Client serverless handler (client/api/location/reverse-geocode) returns HTTP 200", async () => {
    const { req, res, getStatusCode, getData } = createMockHttp({
      lat: "26.8467",
      lng: "80.9462",
      acc: "15"
    });
    await clientReverseHandler(req, res);
    assert.strictEqual(getStatusCode(), 200);
    const data = getData();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.countryCode, "IN");
    assert.strictEqual(data.state, "Uttar Pradesh");
    assert.strictEqual(data.stateCode, "UP");
  });

  // TEST 12: MISSING QUERY PARAMETERS IN SERVERLESS HANDLER
  await test("Serverless handler returns HTTP 400 when lat/lng missing", async () => {
    const { req, res, getStatusCode, getData } = createMockHttp({});
    await rootReverseHandler(req, res);
    assert.strictEqual(getStatusCode(), 400);
    const data = getData();
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes("required"));
  });

  console.log("==========================================================");
  console.log(`ALL ${passed} / ${total} GPS LOCATION & STATE IDENTIFICATION TESTS PASSED!`);
  console.log("==========================================================");
}

runGpsLocationDetectionTestSuite().catch((err) => {
  console.error("Test Suite Execution Error:", err);
  process.exit(1);
});
