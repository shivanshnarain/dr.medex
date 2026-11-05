/**
 * Automated Verification Test Suite:
 * DR.MEDEX Current Location Detection, Race Condition Safety & Atomic Address Autofill
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================================');
console.log('DR.MEDEX — CURRENT LOCATION DETECTION & ADDRESS AUTOFILL TEST SUITE');
console.log('================================================================================\n');

const promptPath = path.join(__dirname, '../../client/src/components/SmartLocationPrompt.tsx');
const contextPath = path.join(__dirname, '../../client/src/context/BuyNowLocationContext.tsx');
const checkoutPath = path.join(__dirname, '../../client/src/pages/CheckoutPage.tsx');
const addressFormPath = path.join(__dirname, '../../client/src/components/AmazonCascadingAddressForm.tsx');

const promptSrc = fs.readFileSync(promptPath, 'utf8');
const contextSrc = fs.readFileSync(contextPath, 'utf8');
const checkoutSrc = fs.readFileSync(checkoutPath, 'utf8');
const addressFormSrc = fs.readFileSync(addressFormPath, 'utf8');

// 1. VERIFY STRICT maximumAge: 0 ACROSS ALL GEOLOCATION CALLS
console.log('TEST 1: Strict maximumAge: 0 enforced on all geolocation calls (no stale coordinates)...');
const maxAgeMatches = (promptSrc + checkoutSrc).match(/maximumAge:\s*(\d+)/g) || [];
assert(maxAgeMatches.length >= 4, 'Expected at least 4 maximumAge configurations in prompt and checkout');
for (const match of maxAgeMatches) {
  const age = parseInt(match.replace(/[^0-9]/g, ''), 10);
  assert.strictEqual(age, 0, `All geolocation calls must strictly enforce maximumAge: 0, found: ${match}`);
}
console.log(`✅ [PASS] All ${maxAgeMatches.length} geolocation calls strictly enforce maximumAge: 0\n`);

// 2. VERIFY RACE CONDITION GUARDS WITH REQUEST TOKENS
console.log('TEST 2: Race condition guards with monotonic request tokens...');
assert(promptSrc.includes('requestIdRef.current'), 'SmartLocationPrompt must guard async responses with requestIdRef');
assert(checkoutSrc.includes('locationRequestIdRef.current'), 'CheckoutPage must guard async responses with locationRequestIdRef');
assert(checkoutSrc.includes('Detecting fresh device location...'), 'CheckoutPage must invalidate/clear previous location notice when new detection starts');
console.log('✅ [PASS] Race condition monotonic request tokens and fresh detection notices verified\n');

// 3. VERIFY CACHE-BUSTING TIMESTAMP ON REVERSE GEOCODE CALLS
console.log('TEST 3: Cache-busting timestamp appended to reverse geocode calls...');
assert(promptSrc.includes('&_t='), 'SmartLocationPrompt must append cache-busting timestamp to reverse geocode');
assert(checkoutSrc.includes('&_t='), 'CheckoutPage must append cache-busting timestamp to reverse geocode');
console.log('✅ [PASS] Cache-busting timestamps prevent HTTP response caching\n');

// 4. VERIFY SHARED GUEST CHECKOUT STORAGE KEY AND DRAFT PERSISTENCE
console.log('TEST 4: Consistent guest checkout storage key and atomic draft persistence...');
assert(contextSrc.includes('"drmedex_guest_checkout_v4"'), 'BuyNowLocationContext must use drmedex_guest_checkout_v4');
assert(checkoutSrc.includes('const GUEST_CHECKOUT_STORAGE_KEY = "drmedex_guest_checkout_v4"'), 'CheckoutPage must use drmedex_guest_checkout_v4');
assert(!checkoutSrc.includes('sessionStorage.getItem("drmedex_detected_location")'), 'CheckoutPage must not resurrect stale sessionStorage detections');
console.log('✅ [PASS] Storage key aligned to drmedex_guest_checkout_v4 without stale sessionStorage zombies\n');

// 5. VERIFY DRAFT DOES NOT OVERWRITE FRESH LOCATION DETECTION
console.log('TEST 5: Stale localStorage draft strictly isolated from fresh location detection...');
assert(checkoutSrc.includes('const hasFreshDetectedLocation = Boolean((routeLocation.state as any)?.detectedLocation)'), 'CheckoutPage must detect fresh navigation location state');
assert(checkoutSrc.includes('if (!hasFreshDetectedLocation)'), 'Draft address fields must only pre-populate when no fresh location detection exists');
console.log('✅ [PASS] Stale draft addresses cannot stomp or contradict fresh location detection\n');

// 6. VERIFY LOCATION NOTICE MATCHES FORM FIELDS EXACTLY
console.log('TEST 6: Location notice message matches form fields exactly...');
assert(checkoutSrc.includes('const locSummary = [newCity, newState, loc.country].filter(Boolean).join(", ")'), 'locSummary must use identical newCity, newState, loc.country variables');
assert(checkoutSrc.includes('setCity(newCity)'), 'setCity must receive newCity');
assert(checkoutSrc.includes('setState(newState)'), 'setState must receive newState');
assert(checkoutSrc.includes('setCountryCode(newCountryCode)'), 'setCountryCode must receive newCountryCode');
console.log('✅ [PASS] Location notice and form inputs are derived atomically from the same tuple\n');

// 7. VERIFY MANUAL USER OVERRIDES CLEAR CONFLICTING LOCATION NOTICE
console.log('TEST 7: Manual user adjustments clear conflicting location notice...');
assert(checkoutSrc.includes('if (updated.countryCode !== undefined) {\n                      setCountryCode(updated.countryCode);\n                      if (billingSameAsShipping) setBillingCountryCode(updated.countryCode);\n                      setLocationNotice(null);'), 'Manual country change must clear locationNotice');
assert(checkoutSrc.includes('if (updated.state !== undefined) {\n                      setState(updated.state);\n                      setLocationNotice(null);'), 'Manual state change must clear locationNotice');
assert(checkoutSrc.includes('onCountryChange={(selected) => {\n                    setCountryCode(selected.code);\n                    if (billingSameAsShipping) setBillingCountryCode(selected.code);\n                    if (selected.currency && selected.currency !== currentCurrency) {\n                      setCurrencyManually(selected.currency);\n                    }\n                    setLocationNotice(null);'), 'onCountryChange must clear locationNotice');
console.log('✅ [PASS] Manual user edits cleanly dismiss outdated location detection notices\n');

// 8. SIMULATE REVERSE GEOCODE LOCATION NORMALIZATION
console.log('TEST 8: Testing locationService reverse geocoding normalization logic...');
const locationService = require('../services/locationService');
const jaitCoords = { lat: 27.5706, lng: 77.6593, acc: 20 }; // Jait, Mathura, Uttar Pradesh, India

(async () => {
  try {
    const geoResult = await locationService.reverseGeocode(jaitCoords.lat, jaitCoords.lng, jaitCoords.acc);
    assert(geoResult.success, 'Reverse geocode should succeed');
    assert.strictEqual(geoResult.countryCode, 'IN', 'Country code must be IN');
    assert.strictEqual(geoResult.country, 'India', 'Country must be India');
    assert(geoResult.state.includes('Uttar Pradesh'), `State should be Uttar Pradesh, got: ${geoResult.state}`);
    const cityOrDistrict = geoResult.city || geoResult.district;
    assert(cityOrDistrict, 'City or district must be resolved');
    console.log(`✅ [PASS] Reverse geocode simulation succeeded: ${cityOrDistrict}, ${geoResult.state}, ${geoResult.country} (${geoResult.countryCode})\n`);

    console.log('================================================================================');
    console.log('ALL TESTS PASSED (8/8)!');
    console.log('================================================================================\n');
  } catch (err) {
    console.error('❌ [FAIL] Test 8 error:', err.message);
    process.exit(1);
  }
})();
