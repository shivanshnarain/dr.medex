/**
 * DR.MEDEX Global — Automated Test Suite
 * Smart Location Reverse Geocoding & Web Push Notification System
 */

const assert = require("assert");
const { reverseGeocode, getCountry, getAllCountries } = require("../services/locationService");
const notificationService = require("../services/notificationService");

async function runTests() {
  console.log("=================================================");
  console.log("DR.MEDEX Global — Location & Push Notifications Test");
  console.log("=================================================\n");

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

  // --- 1. COUNTRIES & LOCATION TESTS ---
  test("195 sovereign countries list integrity", () => {
    const countries = getAllCountries();
    assert.strictEqual(countries.length, 195, "Must contain exactly 195 sovereign countries");
    const india = getCountry("IN");
    assert.ok(india, "Must find India");
    assert.strictEqual(india.dialCode, "+91");
    assert.strictEqual(india.currency, "INR");

    const us = getCountry("US");
    assert.ok(us, "Must find United States");
    assert.strictEqual(us.dialCode, "+1");
    assert.strictEqual(us.currency, "USD");
  });

  await asyncTest("Reverse geocode valid coordinates (Dehradun, India)", async () => {
    const res = await reverseGeocode(30.3165, 78.0322);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.countryCode, "IN");
    assert.strictEqual(res.country, "India");
    assert.ok(res.state.includes("Uttarakhand"));
    assert.ok(res.city.includes("Dehradun"));
    assert.strictEqual(res.postalCode, "248001");
    assert.ok(res.streetAddress.length > 0);
  });

  await asyncTest("Reverse geocode valid international coordinates (New York, US)", async () => {
    const res = await reverseGeocode(40.7128, -74.0060);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.countryCode, "US");
    assert.strictEqual(res.country, "United States");
    assert.strictEqual(res.stateCode, "NY");
  });

  await asyncTest("Reverse geocode rejects invalid out-of-range coordinates", async () => {
    let errorCaught = false;
    try {
      await reverseGeocode(999, 999);
    } catch (e) {
      errorCaught = true;
    }
    assert.strictEqual(errorCaught, true, "Must reject invalid coordinates");
  });

  // --- 2. VAPID & PUSH NOTIFICATION TESTS ---
  test("VAPID Keys initialization & format", () => {
    const pubKey = notificationService.getVapidPublicKey();
    assert.ok(pubKey, "VAPID public key must not be empty");
    assert.strictEqual(typeof pubKey, "string");
    assert.strictEqual(pubKey.length, 87, "Standard uncompressed P-256 public key base64 length is 87 characters");
  });

  await asyncTest("Save browser push subscription & retrieve preferences", async () => {
    const testEndpoint = `https://fcm.googleapis.com/fcm/send/test-sub-${Date.now()}`;
    const testSub = {
      endpoint: testEndpoint,
      keys: {
        p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YwfldC8GE1gG5GfCjYk_kR",
        auth: "tBHItJI5svbpez7KI4CCXg"
      }
    };

    const saveRes = await notificationService.saveSubscription({
      subscription: testSub,
      userId: "cust_test_999",
      customerEmail: "procurement@apollohospitals.com",
      preferences: {
        orderUpdates: true,
        websiteAnnouncements: true,
        customerSupport: true,
        marketing: false
      }
    });

    assert.strictEqual(saveRes.success, true);
    assert.strictEqual(saveRes.endpoint, testEndpoint);

    // Retrieve preferences
    const prefs = await notificationService.getPreferences(testEndpoint);
    assert.strictEqual(prefs.orderUpdates, true);
    assert.strictEqual(prefs.marketing, false);

    // Update preferences
    const updateRes = await notificationService.updatePreferences(testEndpoint, { marketing: true });
    assert.strictEqual(updateRes.success, true);
    assert.strictEqual(updateRes.preferences.marketing, true);

    // Verify stats
    const stats = await notificationService.getSubscribersStats();
    assert.ok(stats.total >= 1);
    assert.ok(stats.marketingSubscribers >= 1);

    // Cleanup
    await notificationService.deleteSubscription(testEndpoint);
  });

  await asyncTest("Order push notification dispatch automation", async () => {
    const mockOrder = {
      orderNumber: `DM-TEST-${Date.now()}`,
      customerId: "cust_test_999",
      items: [{ productId: "esu-400", title: "Dr. Medex Electrosurgical Unit ESU-400" }],
      pricing: { currency: "USD", grandTotal: 3450 }
    };

    const notifRes = await notificationService.sendOrderNotification(mockOrder, "placed");
    // Should complete cleanly (even with 0 live mock devices)
    assert.ok(notifRes !== undefined);

    // Verify broadcast history contains the record
    const history = await notificationService.getNotificationHistory(10);
    assert.ok(Array.isArray(history));
    const found = history.find((h) => h.title.includes(mockOrder.orderNumber));
    assert.ok(found, "Order notification must be logged to history");
    assert.strictEqual(found.category, "order");
  });

  await asyncTest("Admin push broadcast & expired subscription cleanup", async () => {
    const broadcastRes = await notificationService.sendPushNotification({
      title: "Automated Clinical Alert Test",
      message: "Testing broadcast infrastructure for critical OT table notifications.",
      category: "website",
      targetAudience: "all",
      sentBy: "Central Automated Test"
    });

    assert.strictEqual(broadcastRes.success, true);
    assert.ok(broadcastRes.stats);
    assert.strictEqual(typeof broadcastRes.stats.sent, "number");
    assert.strictEqual(typeof broadcastRes.stats.failed, "number");
  });

  console.log("\n=================================================");
  console.log(`ALL ${passed}/${total} TESTS PASSED SUCCESSFULLY!`);
  console.log("=================================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
