const { MongoClient } = require("mongodb");
const assert = require("assert");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

async function runVerification() {
  console.log("=== DR.MEDEX TAXONOMY & PRODUCT VERIFICATION ===");

  // 1. Verify Fallback Data Files
  console.log("\n1. Checking local data files...");
  const serverProducts = require("../server/data/products.js");
  const fallbackProducts = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../client/src/data/fallbackProducts.json"), "utf8")
  );
  const dbJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../server/data/db.json"), "utf8")
  );

  assert.strictEqual(serverProducts.length, 193, `server/data/products.js should have 193 products, found ${serverProducts.length}`);
  assert.strictEqual(fallbackProducts.length, 193, `fallbackProducts.json should have 193 products, found ${fallbackProducts.length}`);
  assert.strictEqual(dbJson.products.length, 193, `db.json should have 193 products, found ${dbJson.products.length}`);

  const electroServer = serverProducts.filter(p => p.category === "electrosurgical-units" || p.category === "electrosurgical units");
  assert.strictEqual(electroServer.length, 28, `Electrosurgical should have 28 products, found ${electroServer.length}`);

  const surgeryServer = electroServer.filter(p => p.subcategory === "electrosurgical-surgery");
  assert.strictEqual(surgeryServer.length, 13, `Electrosurgical Surgery should have 13 products, found ${surgeryServer.length}`);

  const generatorsServer = electroServer.filter(p => p.subcategory === "electrosurgical-generator");
  assert.strictEqual(generatorsServer.length, 15, `Electrosurgical Generators should have 15 products, found ${generatorsServer.length}`);

  console.log(" Local files verified successfully:");
  console.log(`  - Total Products: ${serverProducts.length}`);
  console.log(`  - Electrosurgical Total: ${electroServer.length}`);
  console.log(`  - Electrosurgical Surgery: ${surgeryServer.length}`);
  console.log(`  - Electrosurgical Generators: ${generatorsServer.length}`);

  // 2. Verify MongoDB Database if URI present
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "drmedex";
  if (uri) {
    console.log(`\n2. Checking MongoDB database (${dbName})...`);
    const client = new MongoClient(uri);

    try {
      await client.connect();
      const db = client.db(dbName);
      const collection = db.collection("approved_products");

      const total = await collection.countDocuments();
      assert.strictEqual(total, 72, `MongoDB approved_products should have 72 products, found ${total}`);

      const electroUnits = await collection.find({
        category: { $in: ["electrosurgical-units", "electrosurgical units"] }
      }).toArray();
      assert.strictEqual(electroUnits.length, 28, `MongoDB Electrosurgical should have 28 products, found ${electroUnits.length}`);

      const surgeryUnits = electroUnits.filter(p => p.subcategory === "electrosurgical-surgery");
      assert.strictEqual(surgeryUnits.length, 13, `MongoDB Electrosurgical Surgery should have 13 products, found ${surgeryUnits.length}`);

      const generatorUnits = electroUnits.filter(p => p.subcategory === "electrosurgical-generator");
      assert.strictEqual(generatorUnits.length, 15, `MongoDB Electrosurgical Generators should have 15 products, found ${generatorUnits.length}`);

      console.log(" MongoDB Atlas verified successfully:");
      console.log(`  - Total Database Products: ${total}`);
      console.log(`  - Electrosurgical Units: ${electroUnits.length}`);
      console.log(`  - Electrosurgical Surgery: ${surgeryUnits.length}`);
      console.log(`  - Electrosurgical Generators: ${generatorUnits.length}`);

      // Verify category distribution across entire catalog
      const catCounts = {};
      const all = await collection.find({}).toArray();
      for (const p of all) {
        catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      }
      console.log("\nCategory Distribution in MongoDB approved_products:");
      for (const [cat, count] of Object.entries(catCounts)) {
        console.log(`  - ${cat}: ${count}`);
      }
    } finally {
      await client.close();
    }
  }

  console.log("\n ALL TAXONOMY & DATA VERIFICATIONS PASSED!");
  process.exit(0);
}

runVerification().catch(err => {
  console.error("Verification failed:", err);
  process.exit(1);
});
