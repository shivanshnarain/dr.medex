/**
 * DR.MEDEX — Unified Cart Cards, Pricing, Checkout & Authentication Test Suite
 */

const fs = require("fs");
const path = require("path");
const assert = require("assert");

const CLIENT_ROOT = path.resolve(__dirname, "../../client/src");

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    return true;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    return false;
  }
}

async function runAll() {
  console.log("======================================================================");
  console.log("DR.MEDEX — UNIFIED CART CARDS, PRICING & AUTH SYNC TEST SUITE");
  console.log("======================================================================\n");

  let passed = 0;
  let total = 0;

  // 1. Reusable CartItemCard Component Verification
  const cardPath = path.join(CLIENT_ROOT, "components/cart/CartItemCard.tsx");
  const cardCode = fs.readFileSync(cardPath, "utf-8");

  total++;
  if (runTest("Task 1 & 6: Reusable CartItemCard component exists and exports CartItemCard", () => {
    assert.ok(cardCode.includes("export const CartItemCard"), "Must export CartItemCard");
    assert.ok(cardCode.includes("renderBrandTitle"), "Must render formatted brand title");
    assert.ok(cardCode.includes("formatPrice"), "Must format price with CurrencyContext");
    assert.ok(cardCode.includes("rounded-lg"), "Must apply rounded-lg to product image");
  })) passed++;

  total++;
  if (runTest("Task 1.A & 1.B: CartItemCard uses Quantity-Adjusted Total and excludes per-unit text", () => {
    assert.ok(cardCode.includes("basePrice || 0) * quantity"), "Must calculate quantity-adjusted total");
    assert.strictEqual(cardCode.includes("each ×"), false, "Must not contain 'each ×'");
    assert.strictEqual(cardCode.includes("each *"), false, "Must not contain 'each *'");
    assert.strictEqual(cardCode.includes("/ unit"), false, "Must not contain '/ unit'");
  })) passed++;

  // 2. Cart Drawer Verification
  const drawerPath = path.join(CLIENT_ROOT, "components/CartDrawer.tsx");
  const drawerCode = fs.readFileSync(drawerPath, "utf-8");

  total++;
  if (runTest("Task 1.C: CartDrawer uses shared CartItemCard for all items", () => {
    assert.ok(drawerCode.includes("<CartItemCard"), "CartDrawer must render CartItemCard");
    assert.ok(drawerCode.includes("onUpdateQuantity={updateQuantity}"), "Must wire quantity updates");
    assert.ok(drawerCode.includes("onRemove={removeFromCart}"), "Must wire item removal");
  })) passed++;

  total++;
  if (runTest("Task 1.D: CartDrawer removed coupon and subtotal rows, renamed to 'Total'", () => {
    assert.strictEqual(drawerCode.includes("placeholder=\"Coupon"), false, "Coupon input must be removed");
    assert.strictEqual(drawerCode.includes("Estimated Total"), false, "Must rename Estimated Total");
    assert.ok(drawerCode.includes("<span>Total</span>"), "Heading must be Total");
  })) passed++;

  total++;
  if (runTest("Task 1.E & 1.F: CartDrawer dynamic currency and clean 'Checkout' button", () => {
    assert.ok(drawerCode.includes("{currentCurrency}"), "Must dynamically reflect currentCurrency");
    assert.ok(drawerCode.includes("<span>Checkout</span>"), "Button must be Checkout");
    assert.strictEqual(drawerCode.includes("Proceed to International Checkout"), false, "Old button text removed");
    assert.strictEqual(drawerCode.includes("Secure Checkout</span>"), false, "Secure checkout badge removed");
  })) passed++;

  // 3. Checkout Order Summary Verification
  const checkoutPath = path.join(CLIENT_ROOT, "pages/CheckoutPage.tsx");
  const checkoutCode = fs.readFileSync(checkoutPath, "utf-8");

  total++;
  if (runTest("Task 2: Checkout Order Summary uses identical CartItemCard without coupon UI", () => {
    assert.ok(checkoutCode.includes("<CartItemCard"), "Order Summary must render CartItemCard");
    assert.strictEqual(checkoutCode.includes("Discount or Coupon Code"), false, "Coupon input removed from Order Summary");
    assert.strictEqual(checkoutCode.includes("handleApplyCoupon"), false, "Coupon handle removed from Order Summary");
  })) passed++;

  // 4. Full Cart Page Verification
  const cartPagePath = path.join(CLIENT_ROOT, "pages/CartPage.tsx");
  const cartPageCode = fs.readFileSync(cartPagePath, "utf-8");

  total++;
  if (runTest("Task 3: Full Cart Page single-line header, red Clear All Items, and CartItemCard", () => {
    assert.ok(cartPageCode.includes("Hospital &amp; Clinical Equipment Cart"), "Must contain heading");
    assert.ok(cartPageCode.includes("whitespace-nowrap"), "Heading must be single-line with nowrap");
    assert.ok(cartPageCode.includes("Clear All Items"), "Must have Clear All Items");
    assert.ok(cartPageCode.includes("text-rose-600"), "Clear All Items must have red text");
    assert.ok(cartPageCode.includes("<CartItemCard"), "Must render shared CartItemCard");
  })) passed++;

  // 5. Customer Authentication Modal Branding Verification
  const authModalPath = path.join(CLIENT_ROOT, "components/auth/CustomerAuthModal.tsx");
  const authModalCode = fs.readFileSync(authModalPath, "utf-8");

  total++;
  if (runTest("Task 4: CustomerAuthModal removes 'Customer Portal' and displays DR.MEDEX branding", () => {
    assert.strictEqual(authModalCode.includes("Customer Portal"), false, "Must not contain 'Customer Portal'");
    assert.ok(authModalCode.includes("text-[#2D5A4A]\">DR."), "Must style DR. with #2D5A4A");
    assert.ok(authModalCode.includes("text-[#7AA05A]\">MEDEX"), "Must style MEDEX with #7AA05A");
    assert.ok(authModalCode.includes("Sign In to Your Account"), "Sign In heading");
    assert.ok(authModalCode.includes("Create Your Account"), "Create Your Account heading");
    assert.ok(authModalCode.includes("Access your hospital orders, RFQs, and saved equipment."), "Supporting text across both views");
  })) passed++;

  // 6. Global Auth State Synchronisation Verification
  const authContextPath = path.join(CLIENT_ROOT, "context/AuthContext.tsx");
  const authContextCode = fs.readFileSync(authContextPath, "utf-8");

  total++;
  if (runTest("Task 5: Global AuthContext broadcasts and synchronizes auth events", () => {
    assert.ok(authContextCode.includes("drmedex_customer_auth_sync"), "Must broadcast custom auth sync event");
    assert.ok(authContextCode.includes("handleStorageChange"), "Must listen to multi-tab storage event");
    assert.ok(authContextCode.includes("drmedex_customer_profile"), "Must persist customer profile");
    assert.ok(authContextCode.includes("drmedex_customer_user"), "Must synchronize customer user key");
  })) passed++;

  console.log("\n======================================================================");
  console.log(`TEST SUMMARY: ${passed} / ${total} tests passed (${Math.round((passed / total) * 100)}%)`);
  console.log("======================================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runAll().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});

