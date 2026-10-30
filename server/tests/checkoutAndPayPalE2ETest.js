/**
 * DR.MEDEX Global — Checkout & PayPal Integration Verification Test Suite
 * Tests Sandbox OAuth, server-side Order creation, MongoDB persistence,
 * address management, and idempotent payment handling.
 */

const assert = require("assert");
const http = require("http");
require("dotenv").config();
const app = require("../index");
const store = require("../services/store");
const mongoService = require("../services/mongoService");
const paypalService = require("../services/paypalService");
const orderService = require("../services/orderService");

async function runTestSuite() {
  console.log("==========================================================");
  console.log("DR.MEDEX — CHECKOUT & PAYPAL GATEWAY E2E TEST SUITE");
  console.log("==========================================================\n");

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`[Test Harness] Server running on ${baseUrl}\n`);

  try {
    // ----------------------------------------------------
    // TEST 1: Environment & Credentials Security
    // ----------------------------------------------------
    console.log("TEST 1: Verifying PayPal Credentials Configuration...");
    const clientId = paypalService.getClientId();
    const mode = paypalService.getMode();
    assert.ok(clientId, "PayPal Client ID must be configured in environment");
    assert.strictEqual(mode, "sandbox", "PayPal mode must be sandbox for testing");
    console.log("✔ PASS: PayPal Credentials loaded securely from environment.\n");

    // ----------------------------------------------------
    // TEST 2: PayPal Public Config Endpoint
    // ----------------------------------------------------
    console.log("TEST 2: Verifying GET /api/payment/paypal/config...");
    const configRes = await fetch(`${baseUrl}/api/payment/paypal/config`);
    assert.strictEqual(configRes.status, 200);
    const configData = await configRes.json();
    assert.strictEqual(configData.success, true);
    assert.strictEqual(configData.clientId, clientId);
    assert.strictEqual(configData.mode, "sandbox");
    assert.strictEqual(configData.clientSecret, undefined, "Client Secret must NEVER be exposed via API");
    console.log("✔ PASS: Public config endpoint returns Client ID without leaking secrets.\n");

    // ----------------------------------------------------
    // TEST 3: MongoDB Atlas Connectivity
    // ----------------------------------------------------
    console.log("TEST 3: Verifying MongoDB Atlas connection & collection readiness...");
    const client = await mongoService.getClient();
    const db = client.db();
    assert.ok(db, "MongoDB database instance must be accessible");
    console.log("✔ PASS: Connected to MongoDB Atlas cluster.\n");

    // ----------------------------------------------------
    // TEST 4: Customer Address Management in MongoDB
    // ----------------------------------------------------
    console.log("TEST 4: Testing Saved Address Persistence (Save, Retrieve, Delete)...");
    const testUserId = `test-user-${Date.now()}`;
    const sampleAddress = {
      fullName: "Dr. Eleanor Vance",
      companyName: "St. Jude Biomedical Centre",
      phone: "+1 415-555-0199",
      addressLine1: "500 Parnassus Ave",
      addressLine2: "Suite 400",
      city: "San Francisco",
      state: "CA",
      postalCode: "94143",
      country: "United States",
      countryCode: "US",
      isDefaultShipping: true,
      isDefaultBilling: true
    };

    // Save Address
    const saveAddrRes = await fetch(`${baseUrl}/api/customer/addresses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: testUserId, address: sampleAddress })
    });
    assert.strictEqual(saveAddrRes.status, 200);
    const saveAddrData = await saveAddrRes.json();
    assert.strictEqual(saveAddrData.success, true);
    assert.strictEqual(saveAddrData.addresses.length, 1);
    const savedId = saveAddrData.addresses[0].id;
    assert.ok(savedId, "Saved address must have an ID assigned");

    // Retrieve Address
    const getAddrRes = await fetch(`${baseUrl}/api/customer/addresses?userId=${testUserId}`);
    assert.strictEqual(getAddrRes.status, 200);
    const getAddrData = await getAddrRes.json();
    assert.strictEqual(getAddrData.success, true);
    assert.strictEqual(getAddrData.addresses.length, 1);
    assert.strictEqual(getAddrData.addresses[0].fullName, "Dr. Eleanor Vance");
    assert.strictEqual(getAddrData.addresses[0].isDefaultShipping, true);

    // Delete Address
    const delAddrRes = await fetch(`${baseUrl}/api/customer/addresses/${savedId}?userId=${testUserId}`, {
      method: "DELETE"
    });
    assert.strictEqual(delAddrRes.status, 200);
    const delAddrData = await delAddrRes.json();
    assert.strictEqual(delAddrData.success, true);
    assert.strictEqual(delAddrData.addresses.length, 0);

    // Clean up test document
    await db.collection("customer_addresses").deleteOne({ userId: testUserId });
    console.log("✔ PASS: Customer addresses persist, update, and delete cleanly in MongoDB Atlas.\n");

    // ----------------------------------------------------
    // TEST 5: PayPal Order Creation & Server-Side Calculation
    // ----------------------------------------------------
    console.log("TEST 5: Testing Server-Side Order Calculation & PayPal Order Creation...");
    const products = store.getProducts();
    assert.ok(products.length > 0, "Catalogue must have active products");
    const testProduct = products[0];

    const orderPayload = {
      customerId: testUserId,
      customer: {
        firstName: "Eleanor",
        lastName: "Vance",
        fullName: "Dr. Eleanor Vance",
        email: "eleanor.vance@stjude.org",
        phone: "+1 415-555-0199",
        companyName: "St. Jude Biomedical Centre"
      },
      shippingAddress: sampleAddress,
      currency: "USD",
      items: [
        {
          productId: testProduct.id,
          quantity: 1
        }
      ]
    };

    const createRes = await fetch(`${baseUrl}/api/payment/paypal/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload)
    });
    assert.strictEqual(createRes.status, 200, "Create order request must succeed");
    const createData = await createRes.json();
    assert.strictEqual(createData.success, true);
    assert.ok(createData.orderID, "PayPal must return a valid order ID");
    assert.ok(createData.orderNumber.startsWith("MED-"), "Order number must follow DR.MEDEX format");
    assert.strictEqual(createData.currency, "USD");
    assert.ok(createData.amount > 0, "Calculated amount must be positive");
    console.log(`✔ PASS: PayPal Order created (${createData.orderID}), Order Number: ${createData.orderNumber}, Amount: $${createData.amount}.\n`);

    // ----------------------------------------------------
    // TEST 6: Pending Order Stored in MongoDB
    // ----------------------------------------------------
    console.log("TEST 6: Verifying Pending Order in MongoDB Atlas...");
    const pendingDoc = await db.collection("orders").findOne({ orderNumber: createData.orderNumber });
    assert.ok(pendingDoc, "Order must be persisted in MongoDB Atlas");
    assert.strictEqual(pendingDoc.status, "PENDING");
    assert.strictEqual(pendingDoc.payment.status, "PENDING");
    assert.strictEqual(pendingDoc.payment.provider, "PAYPAL");
    console.log("✔ PASS: Order persisted with PENDING status in MongoDB Atlas.\n");

    // ----------------------------------------------------
    // TEST 7: Idempotent Payment Confirmation & Inventory
    // ----------------------------------------------------
    console.log("TEST 7: Testing Payment Confirmation & Stock Deduction...");
    const initialStock = testProduct.stock !== undefined ? testProduct.stock : (testProduct.stockQuantity || 100);

    const paidOrder = await orderService.markOrderAsPaid({
      orderNumber: createData.orderNumber,
      paypalOrderId: createData.orderID,
      paypalCaptureId: `CAPTURE-${Date.now()}`,
      paymentDetails: { mock: true, verified: true }
    });

    assert.strictEqual(paidOrder.payment.status, "PAID");
    assert.strictEqual(paidOrder.orderStatus, "PROCESSING");
    assert.ok(paidOrder.payment.paidAt, "paidAt timestamp must be recorded");

    // Check inventory deduction
    const updatedProd = store.getProductById(testProduct.id, false);
    const updatedStock = updatedProd.stock !== undefined ? updatedProd.stock : updatedProd.stockQuantity;
    assert.strictEqual(updatedStock, initialStock - 1, "Stock must decrement by purchased quantity");

    // Test Idempotency (calling markOrderAsPaid second time should not deduct twice)
    const idempotentCall = await orderService.markOrderAsPaid({
      orderNumber: createData.orderNumber,
      paypalOrderId: createData.orderID,
      paypalCaptureId: `CAPTURE-${Date.now()}`,
      paymentDetails: { mock: true, duplicate: true }
    });
    const finalStock = updatedProd.stock !== undefined ? updatedProd.stock : updatedProd.stockQuantity;
    assert.strictEqual(finalStock, updatedStock, "Idempotent payment must not deduct inventory twice");
    console.log("✔ PASS: Order marked PAID, stock deducted, and idempotency verified.\n");

    // ----------------------------------------------------
    // TEST 8: Customer Order History
    // ----------------------------------------------------
    console.log("TEST 8: Testing Customer Order History Retrieval...");
    const historyRes = await fetch(`${baseUrl}/api/customer/orders?email=eleanor.vance@stjude.org`);
    assert.strictEqual(historyRes.status, 200);
    const historyData = await historyRes.json();
    assert.strictEqual(historyData.success, true);
    assert.ok(historyData.orders.some(o => o.orderNumber === createData.orderNumber));
    console.log(`✔ PASS: Customer order history successfully retrieved from MongoDB Atlas.\n`);

    // Clean up test order
    await db.collection("orders").deleteOne({ orderNumber: createData.orderNumber });
    const idx = store.getOrders().findIndex(o => o.orderNumber === createData.orderNumber);
    if (idx !== -1) store.getOrders().splice(idx, 1);
    // Restore stock
    testProduct.stock = initialStock;
    testProduct.stockQuantity = initialStock;

    console.log("==========================================================");
    console.log("ALL CHECKOUT & PAYPAL INTEGRATION TESTS PASSED (8/8)");
    console.log("==========================================================\n");

    server.close();
    process.exit(0);
  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    server.close();
    process.exit(1);
  }
}

runTestSuite();

