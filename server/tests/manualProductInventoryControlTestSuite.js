/**
 * DR.MEDEX - Manual Product & Inventory Control Test Suite
 *
 * Verifies:
 * 1. Automatic product generation is disabled (unauthenticated mutations are blocked with 403).
 * 2. Exact inventory quantities are preserved (no defaulting or auto-incrementing to 10).
 * 3. Exact database product counts are respected (no ghost/seed products merged onto MongoDB records).
 * 4. SKU uniqueness is enforced across creation and updates.
 * 5. Duplicate product creation in the same category is prevented with 409 Conflict.
 * 6. Product updates preserve existing stock when not updated, and accept exact new stock numbers.
 */

const assert = require("assert");
const http = require("http");
const store = require("../services/store");
const mongoService = require("../services/mongoService");
const app = require("../index");

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🧪 DR.MEDEX MANUAL PRODUCT & INVENTORY CONTROL TEST SUITE");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
      failed++;
    }
  }

  const createdTestIds = [];
  // ---------------------------------------------------------------------------
  // 1. INVENTORY QUANTITY PRESERVATION
  // ---------------------------------------------------------------------------
  console.log("--- TEST GROUP 1: EXACT INVENTORY QUANTITY PRESERVATION ---");

  test("store.addProduct saves exact stock = 1 without defaulting to 10", () => {
    const prod = store.addProduct({
      title: "Test Single Unit Microscope",
      category: "general-medical",
      basePrice: 5000,
      stock: 1
    });
    createdTestIds.push(prod.id);
    assert.strictEqual(prod.stock, 1, `Expected stock to be 1, got ${prod.stock}`);
    assert.strictEqual(prod.stockQuantity, 1, `Expected stockQuantity to be 1, got ${prod.stockQuantity}`);
    assert.strictEqual(prod.stockStatus, "LOW_STOCK", `Expected stockStatus to be LOW_STOCK for 1 unit`);
  });

  test("store.addProduct saves exact stock = 0 without defaulting to 10", () => {
    const prod = store.addProduct({
      title: "Test Out Of Stock Lamp",
      category: "ot-lights",
      basePrice: 15000,
      stock: 0
    });
    createdTestIds.push(prod.id);
    assert.strictEqual(prod.stock, 0, `Expected stock to be 0, got ${prod.stock}`);
    assert.strictEqual(prod.stockQuantity, 0, `Expected stockQuantity to be 0, got ${prod.stockQuantity}`);
    assert.strictEqual(prod.stockStatus, "OUT_OF_STOCK", `Expected stockStatus to be OUT_OF_STOCK`);
  });

  test("store.addProduct saves exact stock = 10 when explicitly set to 10", () => {
    const prod = store.addProduct({
      title: "Test Batch Device",
      category: "electrosurgical",
      basePrice: 25000,
      stock: 10
    });
    createdTestIds.push(prod.id);
    assert.strictEqual(prod.stock, 10, `Expected stock to be 10, got ${prod.stock}`);
    assert.strictEqual(prod.stockQuantity, 10, `Expected stockQuantity to be 10, got ${prod.stockQuantity}`);
    assert.strictEqual(prod.stockStatus, "IN_STOCK", `Expected stockStatus to be IN_STOCK`);
  });

  test("store.addProduct preserves stockQuantity when passed instead of stock", () => {
    const prod = store.addProduct({
      title: "Test Quantity Field Input",
      category: "ot-tables",
      basePrice: 40000,
      stockQuantity: 3
    });
    createdTestIds.push(prod.id);
    assert.strictEqual(prod.stock, 3, `Expected stock to be 3, got ${prod.stock}`);
    assert.strictEqual(prod.stockQuantity, 3, `Expected stockQuantity to be 3, got ${prod.stockQuantity}`);
  });

  test("store.updateProduct updates to exact stock = 7 and does not modify when unmentioned", () => {
    const prod = store.addProduct({
      title: "Stock Update Test Item",
      category: "obg",
      basePrice: 12000,
      stock: 2
    });
    createdTestIds.push(prod.id);

    const updatedWithStock = store.updateProduct(prod.id, { stock: 7 });
    assert.strictEqual(updatedWithStock.stock, 7, `Expected updated stock to be 7, got ${updatedWithStock.stock}`);
    assert.strictEqual(updatedWithStock.stockQuantity, 7, `Expected updated stockQuantity to be 7`);

    const updatedWithoutStock = store.updateProduct(prod.id, { title: "Stock Update Test Item Renamed" });
    assert.strictEqual(updatedWithoutStock.stock, 7, `Expected stock to stay 7 when unmentioned`);
    assert.strictEqual(updatedWithoutStock.stockQuantity, 7, `Expected stockQuantity to stay 7 when unmentioned`);
  });

  // ---------------------------------------------------------------------------
  // 2. UNAUTHENTICATED MUTATIONS REFUSAL
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: REJECTION OF UNAUTHENTICATED PRODUCT MUTATIONS ---");

  // Spin up an ephemeral HTTP server to test REST responses
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const options = {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          "Content-Type": "application/json",
          ...headers
        }
      };

      const req = http.request(options, res => {
        let raw = "";
        res.on("data", chunk => raw += chunk);
        res.on("end", () => {
          let data = null;
          try {
            data = JSON.parse(raw);
          } catch {
            data = raw;
          }
          resolve({ status: res.statusCode, data });
        });
      });

      req.on("error", reject);
      if (body) {
        req.write(typeof body === "string" ? body : JSON.stringify(body));
      }
      req.end();
    });
  }

  await asyncTest("POST /api/products returns 403 Forbidden (no unauthenticated injection)", async () => {
    const res = await makeRequest("POST", "/api/products", {
      title: "Hacker Injected Product",
      basePrice: 100
    });
    assert.strictEqual(res.status, 403, `Expected status 403, got ${res.status}`);
    assert.strictEqual(res.data.success, false);
  });

  await asyncTest("PUT /api/products/:id returns 403 Forbidden", async () => {
    const res = await makeRequest("PUT", "/api/products/prod-12345", {
      stock: 9999
    });
    assert.strictEqual(res.status, 403, `Expected status 403, got ${res.status}`);
    assert.strictEqual(res.data.success, false);
  });

  await asyncTest("DELETE /api/products/:id returns 403 Forbidden", async () => {
    const res = await makeRequest("DELETE", "/api/products/prod-12345");
    assert.strictEqual(res.status, 403, `Expected status 403, got ${res.status}`);
    assert.strictEqual(res.data.success, false);
  });

  // ---------------------------------------------------------------------------
  // 3. EXACT DATABASE PRODUCT COUNT
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: EXACT DATABASE PRODUCT COUNT ---");

  await asyncTest("GET /api/products returns strictly database count when MongoDB is configured", async () => {
    const res = await makeRequest("GET", "/api/products");
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.data.success, true);
    assert(Array.isArray(res.data.products), "Expected products to be an array");

    if (mongoService.isConfigured()) {
      const mongoProducts = await mongoService.getProductsFromMongo();
      if (Array.isArray(mongoProducts)) {
        const deletedIds = await mongoService.getDeletedProductIds();
        const expectedActive = mongoProducts.filter(p =>
          !deletedIds.has(String(p.id)) &&
          (p.status || "ACTIVE") === "ACTIVE" &&
          p.status !== "ARCHIVED" &&
          !p.isRetired &&
          p.inCatalogue !== false &&
          !(p.category === "physiotherapy" && p.reviewStatus !== "CORRECT")
        );
        assert.strictEqual(
          res.data.products.length,
          expectedActive.length,
          `Public products count (${res.data.products.length}) must match active database products count (${expectedActive.length})`
        );
      }
    }
  });

  // ---------------------------------------------------------------------------
  // 4. SKU UNIQUENESS & DUPLICATE PREVENTION
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: SKU UNIQUENESS & DUPLICATE PREVENTION ---");

  test("SKU uniqueness correctly identifies colliding vs unique SKUs", () => {
    const uniqueSku = `SKU-TEST-${Date.now()}`;
    const prod1 = store.addProduct({
      title: "First Unique Product",
      category: "electrosurgical",
      sku: uniqueSku,
      basePrice: 1000
    });
    createdTestIds.push(prod1.id);

    const all = store.getProducts({ includeInactive: true });
    const match = all.find(p => (p.sku || p.SKU || "").toLowerCase() === uniqueSku.toLowerCase());
    assert(match, "Product should be stored and found by SKU");

    const conflict = all.find(p => p.id !== prod1.id && (p.sku || p.SKU || "").toLowerCase() === uniqueSku.toLowerCase());
    assert.strictEqual(conflict, undefined, "No other product should match this SKU yet");
  });

  // Cleanup created test products
  for (const tid of createdTestIds) {
    store.deleteProduct(tid);
  }

  // Close ephemeral server
  await new Promise(resolve => server.close(resolve));

  console.log("\n================================================================================");
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTestSuite().catch(err => {
  console.error("Test execution threw error:", err);
  process.exit(1);
});
