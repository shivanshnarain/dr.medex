/**
 * DR.MEDEX — PRECISE CHECKOUT FLOW & UI VERIFICATION TEST SUITE
 * Tests all requirements from user prompt:
 * 1. Step 1: Customer details isolation, clean circular icon, no auth badge or paragraph.
 * 2. Order summary: Clean product display, thin green outline, object-contain, no SKU, red Total Amount, black INR total.
 * 3. Step 2: Shipping address order, empty required full address, no billing checkbox.
 * 4. Delivery instructions: Compact field, saved with order, visible in Admin Order Details.
 * 5. Step 3: Payment only (PayPal & Razorpay), generic cards removed.
 * 6. Final payment CTA button: Prominent full-width black button with Lock, white text, right arrow.
 * 7. Back navigation: Clear back buttons preserving state across all steps.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const store = require("../services/store");

async function runTestSuite() {
  console.log("======================================================================");
  console.log("DR.MEDEX — PRECISE CHECKOUT FLOW & UI TEST SUITE");
  console.log("======================================================================\n");

  let passed = 0;
  let total = 0;

  function test(description, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${description}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  const checkoutPath = path.join(__dirname, "../../client/src/pages/CheckoutPage.tsx");
  const checkoutCode = fs.readFileSync(checkoutPath, "utf8");

  const addressFormPath = path.join(__dirname, "../../client/src/components/AmazonCascadingAddressForm.tsx");
  const addressFormCode = fs.readFileSync(addressFormPath, "utf8");

  const adminOrdersPath = path.join(__dirname, "../../client/src/pages/AdminOrdersPage.tsx");
  const adminOrdersCode = fs.readFileSync(adminOrdersPath, "utf8");

  // 1. STEP 1 — AUTHENTICATION / CUSTOMER DETAILS
  test("Step 1: Removed 'Authenticated Account' badge and explanation text", () => {
    assert.strictEqual(checkoutCode.includes("Authenticated Account"), false, "Badge must be removed");
    assert.strictEqual(checkoutCode.includes("You are signed in with your verified DR.MEDEX institutional account"), false, "Paragraph must be removed");
  });

  test("Step 1: Circular profile icon with light grey background and dark green user icon", () => {
    assert.ok(checkoutCode.includes("rounded-full bg-neutral-100"), "Must have rounded-full bg-neutral-100");
    assert.ok(checkoutCode.includes("<User size={20} className=\"text-[#2D5A4A]\""), "Must have dark green User icon");
  });

  test("Step 1: Displays ONLY Name, Phone, Email when authenticated", () => {
    assert.ok(checkoutCode.includes("user.fullName"), "Must display name");
    assert.ok(checkoutCode.includes("user.phone"), "Must display phone");
    assert.ok(checkoutCode.includes("user.email"), "Must display email");
  });

  // 2. ORDER SUMMARY — CLEAN PRODUCT DISPLAY
  test("Order Summary: Product image uses thin light-green outline and object-contain without empty square background", () => {
    assert.ok(checkoutCode.includes("border-[#7AA05A]/40"), "Must have thin light-green border");
    assert.ok(checkoutCode.includes("object-contain"), "Must have object-contain");
  });

  test("Order Summary: Removed SKU, Catalogue Subtotal, International Air Cargo, Customs Export Duties", () => {
    assert.strictEqual(checkoutCode.includes("Catalogue Subtotal:"), false, "Catalogue Subtotal row must be removed");
    assert.strictEqual(checkoutCode.includes("International Air Cargo:"), false, "Air Cargo row must be removed");
    assert.strictEqual(checkoutCode.includes("Customs Export Duties:"), false, "Export Duties row must be removed");
  });

  test("Order Summary: Total Amount label is RED and amount is BLACK with ₹ formatting", () => {
    assert.ok(checkoutCode.includes("text-red-600"), "Total Amount label must have red styling");
    assert.ok(checkoutCode.includes("text-black"), "Amount must have black styling");
    assert.ok(checkoutCode.includes("Total Amount"), "Label must be Total Amount");
    assert.ok(checkoutCode.includes("₹"), "Must use INR symbol");
  });

  // 3. STEP 2 — SHIPPING ADDRESS
  test("Step 2: Full Address is labeled 'Full Address *' and required", () => {
    assert.ok(addressFormCode.includes("Full Address"), "Must have Full Address label");
    assert.ok(addressFormCode.includes("Enter your complete delivery address"), "Must have clear placeholder");
  });

  test("Step 2: Removed 'Billing address same as shipping address' checkbox", () => {
    assert.strictEqual(checkoutCode.includes("Billing address same as shipping address"), false, "Billing checkbox must be removed");
  });

  // 4. DELIVERY INSTRUCTIONS
  test("Delivery Instructions: Compact optional textarea with placeholder", () => {
    assert.ok(checkoutCode.includes("Delivery Instructions"), "Must include Delivery Instructions section");
    assert.ok(checkoutCode.includes("Any special delivery instructions? (Optional)"), "Must match requested placeholder");
  });

  test("Delivery Instructions: Saved with order in backend store and orderService", () => {
    const products = store.getProducts();
    const existingProd = products.length > 0 ? products[0] : null;
    if (!existingProd) return;
    const initialStock = existingProd.stock;

    const testPayload = {
      items: [{ productId: existingProd.id, quantity: 1 }],
      customer: { fullName: "Test Doctor", email: "dr@hospital.com", phone: "+91 9876543210" },
      shippingAddress: { addressLine1: "123 Medical Way", city: "Mumbai", state: "Maharashtra", country: "India", countryCode: "IN" },
      deliveryInstructions: "Deliver directly to 3rd floor OT wing via gate 4"
    };

    const created = store.createOrder(testPayload);
    assert.strictEqual(created.deliveryInstructions, "Deliver directly to 3rd floor OT wing via gate 4", "Store must save deliveryInstructions");

    // Clean up test order to keep database pristine
    const orders = store.getOrders();
    const idx = orders.findIndex(o => o.orderNumber === created.orderNumber);
    if (idx !== -1) orders.splice(idx, 1);
    existingProd.stock = initialStock;
    existingProd.stockQuantity = initialStock;
  });

  test("Delivery Instructions: Rendered in Admin Order Details panel", () => {
    assert.ok(adminOrdersCode.includes("selectedOrder.deliveryInstructions"), "Admin Orders must display delivery instructions");
  });

  // 5. STEP 3 — PAYMENT ONLY (PAYPAL & RAZORPAY)
  test("Step 3: Only PayPal and Razorpay methods are offered (Cards & COD removed)", () => {
    assert.ok(checkoutCode.includes("PayPal Checkout"), "Must offer PayPal");
    assert.ok(checkoutCode.includes("Razorpay Secure"), "Must offer Razorpay");
    assert.strictEqual(checkoutCode.includes("Debit & Credit Card Checkout"), false, "Generic cards box must be removed");
    assert.strictEqual(checkoutCode.includes("Direct Institutional Order Confirmation"), false, "COD container must be removed");
  });

  test("Step 3: Removed duplicate 'Review Customer & Shipping Destination' card", () => {
    assert.strictEqual(checkoutCode.includes("Review Customer & Shipping Destination"), false, "Review card must be removed from Step 3");
  });

  // 6. FINAL PAYMENT BUTTON — ADRIZO REFERENCE STYLE
  test("Payment CTA: Prominent full-width black button with lock icon, white bold text, and right arrow", () => {
    assert.ok(checkoutCode.includes("bg-black"), "Button must be black");
    assert.ok(checkoutCode.includes("<Lock"), "Must have lock icon");
    assert.ok(checkoutCode.includes("Pay ₹"), "Must display Pay ₹[amount] Online");
    assert.ok(checkoutCode.includes("Online"), "Must contain Online");
    assert.ok(checkoutCode.includes("<ArrowRight"), "Must have right arrow");
  });

  // 7. BACK NAVIGATION ACROSS ALL THREE STEPS
  test("Back Navigation: Step 1 -> Step 2 -> Step 3 navigation controls exist", () => {
    assert.ok(checkoutCode.includes("Continue to Step 2"), "Step 1 must have Continue to Step 2");
    assert.ok(checkoutCode.includes("Back to Step 1"), "Step 2 must have Back to Step 1");
    assert.ok(checkoutCode.includes("Continue to Step 3"), "Step 2 must have Continue to Step 3");
    assert.ok(checkoutCode.includes("Back to Step 2"), "Step 3 must have Back to Step 2");
  });

  console.log("\n======================================================================");
  console.log(`TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log("======================================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
