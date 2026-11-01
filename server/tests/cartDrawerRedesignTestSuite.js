/**
 * DR.MEDEX Global — Equipment Cart Drawer Redesign Verification Suite
 */

const assert = require("assert");
const orderService = require("../services/orderService");
const store = require("../services/store");

async function runTests() {
  console.log("==========================================================");
  console.log("DR.MEDEX Global — Equipment Cart Drawer Redesign Verification Suite");
  console.log("==========================================================");

  // Setup test product
  const testProduct = {
    id: "cart-test-product-01",
    slug: "cart-test-product-01",
    title: "DR.MEDEX Advanced Surgical Illuminator",
    productName: "DR.MEDEX Advanced Surgical Illuminator",
    basePrice: 1500,
    stock: 60,
    status: "ACTIVE",
    isPublished: true,
  };

  store.addProduct(testProduct);

  // Test 1: Quantity up to 50 accepted
  try {
    const calc = orderService.validateAndCalculateOrder({
      items: [{ productId: testProduct.id, quantity: 50 }],
      currency: "USD",
      shippingAddress: { country: "US" },
    });
    assert.strictEqual(calc.items[0].quantity, 50);
    assert(calc.pricing.subtotal > 0, "Subtotal must be greater than 0");
    console.log("✅ [PASS] Test 1: Quantity of 50 is accepted and calculated correctly");
  } catch (err) {
    console.error("❌ [FAIL] Test 1 failed:", err.message);
    process.exit(1);
  }

  // Test 2: Quantity > 50 rejected by backend
  try {
    orderService.validateAndCalculateOrder({
      items: [{ productId: testProduct.id, quantity: 51 }],
      currency: "USD",
      shippingAddress: { country: "US" },
    });
    console.error("❌ [FAIL] Test 2: Should have rejected quantity > 50");
    process.exit(1);
  } catch (err) {
    assert(err.message.includes("Maximum allowed order quantity per item is 50"));
    console.log("✅ [PASS] Test 2: Backend rejects quantities > 50 as required");
  }

  // Test 3: Inventory boundary check (when stock < 50)
  const lowStockProduct = {
    id: "cart-low-stock-02",
    slug: "cart-low-stock-02",
    title: "DR.MEDEX Compact Diathermy Unit",
    productName: "DR.MEDEX Compact Diathermy Unit",
    basePrice: 800,
    stock: 5,
    status: "ACTIVE",
    isPublished: true,
  };
  store.addProduct(lowStockProduct);

  try {
    orderService.validateAndCalculateOrder({
      items: [{ productId: lowStockProduct.id, quantity: 6 }],
      currency: "USD",
      shippingAddress: { country: "US" },
    });
    console.error("❌ [FAIL] Test 3: Should have rejected quantity exceeding stock");
    process.exit(1);
  } catch (err) {
    assert(err.message.includes("Insufficient inventory"));
    console.log("✅ [PASS] Test 3: Inventory limits respected when stock < 50");
  }

  console.log("==========================================================");
  console.log("ALL CART REDESIGN TESTS PASSED!");
  console.log("==========================================================");
}

runTests();
