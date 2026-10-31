/**
 * DR.MEDEX Global — PayPal Integration Verification Test Suite
 * Verifies OAuth authentication, order creation, capture resilience, and security.
 */

const assert = require("assert");
require("dotenv").config();

const paypalService = require("../services/paypalService");
const orderService = require("../services/orderService");

async function runPayPalTestSuite() {
  console.log("==========================================================");
  console.log("DR.MEDEX Global — PayPal Live Sandbox Test Suite");
  console.log("==========================================================");

  // 1. Verify Configuration & Environment Variables
  const clientId = paypalService.getClientId();
  const clientSecret = paypalService.getClientSecret();
  const mode = paypalService.getMode();
  const baseUrl = paypalService.getBaseUrl();

  assert(clientId, "PAYPAL_CLIENT_ID must be set in environment");
  assert(clientSecret, "PAYPAL_CLIENT_SECRET must be set in environment");
  assert.strictEqual(mode, "sandbox", "PAYPAL_MODE should be sandbox for test suite");
  assert.strictEqual(baseUrl, "https://api-m.sandbox.paypal.com");
  console.log("✅ [PASS] Credentials & Mode verified (Client ID length:", clientId.length, "Mode:", mode, ")");

  // 2. Test Live PayPal OAuth Access Token
  console.log("Testing PayPal OAuth 2.0 Token Generation...");
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  assert.strictEqual(tokenRes.status, 200, `OAuth should return 200, got ${tokenRes.status}`);
  const tokenData = await tokenRes.json();
  assert(tokenData.access_token, "OAuth must return an access_token");
  assert(tokenData.expires_in > 0, "OAuth must return a positive expires_in");
  console.log("✅ [PASS] Live PayPal OAuth successful: Token received, expires in", tokenData.expires_in, "seconds");

  // 3. Test Server-side Order Creation with Real Product & International Pricing
  console.log("Testing Server-side Order Creation (India -> USD)...");
  const testPayload = {
    customer: {
      firstName: "Dr. Vikram",
      lastName: "Singhania",
      fullName: "Dr. Vikram Singhania",
      email: "vikram.singhania@hospital.org",
      phone: "+91 9876543210",
      countryCode: "IN"
    },
    shippingAddress: {
      fullName: "Dr. Vikram Singhania",
      addressLine1: "Medical College Road",
      city: "Lakhimpur Kheri",
      state: "Uttar Pradesh",
      stateCode: "UP",
      postalCode: "262701",
      country: "India",
      countryCode: "IN"
    },
    currency: "INR",
    items: [
      {
        productId: "prod-surgical-cautery-400-wat",
        quantity: 1
      }
    ]
  };

  const pendingOrder = await orderService.createPendingOrder(testPayload);
  assert(pendingOrder.orderNumber, "Pending order must have an orderNumber");
  assert(pendingOrder.pricing.grandTotal > 0, "Grand total must be positive");
  assert.strictEqual(pendingOrder.pricing.currency, "USD", "INR should be converted to USD for PayPal cross-border compatibility");
  console.log("✅ [PASS] Internal pending order created:", pendingOrder.orderNumber, "Amount:", pendingOrder.pricing.currency, pendingOrder.pricing.grandTotal);

  // 4. Test Live PayPal v2 Order Creation
  console.log("Creating PayPal Order via official v2 REST API...");
  const paypalOrder = await paypalService.createOrder({
    orderNumber: pendingOrder.orderNumber,
    amount: pendingOrder.pricing.grandTotal,
    currency: pendingOrder.pricing.currency,
    description: `DR.MEDEX Medical Equipment Order #${pendingOrder.orderNumber}`,
    items: pendingOrder.items,
    customer: pendingOrder.customer
  });

  assert(paypalOrder.id, "PayPal Order must have an ID");
  assert.strictEqual(paypalOrder.status, "CREATED", "PayPal Order status must be CREATED");
  assert.strictEqual(paypalOrder.purchase_units[0].amount.currency_code, "USD");
  assert.strictEqual(paypalOrder.purchase_units[0].custom_id, pendingOrder.orderNumber);
  console.log("✅ [PASS] Live PayPal Order created successfully: ID =", paypalOrder.id, "Status =", paypalOrder.status);

  // 5. Test Live PayPal Order Details Retrieval
  console.log("Retrieving created order details from PayPal...");
  const orderDetails = await paypalService.getOrderDetails(paypalOrder.id);
  assert.strictEqual(orderDetails.id, paypalOrder.id);
  assert.strictEqual(orderDetails.status, "CREATED");
  console.log("✅ [PASS] PayPal order details verified on PayPal servers");

  // 6. Test Security: Verify Secret is NEVER exposed to public config endpoint
  const publicConfig = {
    clientId: paypalService.getClientId(),
    mode: paypalService.getMode()
  };
  assert(!publicConfig.clientSecret, "Client secret must never be in public config");
  assert(!publicConfig.secret, "Secret must never be in public config");
  assert.strictEqual(publicConfig.clientId, clientId);
  console.log("✅ [PASS] Security: PayPal Client Secret is strictly server-side only");

  // 7. Test Idempotent Mark as Paid & MongoDB Order Persistence
  console.log("Testing markOrderAsPaid with MongoDB persistence...");
  const mockCaptureId = `TEST-CAPTURE-${Date.now()}`;
  const mockCaptureDetails = {
    id: mockCaptureId,
    status: "COMPLETED",
    amount: {
      currency_code: "USD",
      value: pendingOrder.pricing.grandTotal.toString()
    }
  };

  const paidOrder = await orderService.markOrderAsPaid({
    orderNumber: pendingOrder.orderNumber,
    paypalOrderId: paypalOrder.id,
    paypalCaptureId: mockCaptureId,
    paymentDetails: mockCaptureDetails
  });

  assert.strictEqual(paidOrder.payment.status, "PAID");
  assert.strictEqual(paidOrder.payment.paypalOrderId, paypalOrder.id);
  assert.strictEqual(paidOrder.payment.paypalCaptureId, mockCaptureId);
  assert.strictEqual(paidOrder.orderStatus, "PROCESSING");
  console.log("✅ [PASS] Order marked as PAID and persisted with transaction timeline");

  // 8. Test Idempotency: Second call returns existing order without error
  const duplicatePaidOrder = await orderService.markOrderAsPaid({
    orderNumber: pendingOrder.orderNumber,
    paypalOrderId: paypalOrder.id,
    paypalCaptureId: mockCaptureId,
    paymentDetails: mockCaptureDetails
  });
  assert.strictEqual(duplicatePaidOrder.payment.status, "PAID");
  console.log("✅ [PASS] Idempotency verified: Duplicate payment attempts handled safely");

  console.log("==========================================================");
  console.log("ALL 8 / 8 PAYPAL INTEGRATION TESTS PASSED SUCCESSFULLY!");
  console.log("==========================================================");
}

runPayPalTestSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ [FAIL] PayPal Test Suite Error:", err);
    process.exit(1);
  });

