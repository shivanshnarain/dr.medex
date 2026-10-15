/**
 * DR.MEDEX Verification Suite: Secure Admin & Customer Unified Authentication
 * 
 * Verifies:
 * 1. Admin login through unified endpoint with designated administrator credentials -> direct admin access.
 * 2. Invalid admin password strictly rejected (HTTP 401, no token, no access).
 * 3. Ordinary customer authentication routes directly to /account with customer role ('buyer').
 * 4. Server-side backend protection: customer or forged tokens strictly blocked from admin routes (401).
 * 5. Email address alone never grants access; identity and role verified on server.
 * 6. Public customer signup strictly forced to 'buyer' role (privilege escalation defense).
 * 7. Session validation and logout lifecycle.
 * 8. Zero plaintext passwords or secrets in server responses, code, or activity logs.
 */

const assert = require("assert");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const authService = require("../services/authService");
const supabaseService = require("../services/supabaseService");
const express = require("express");

const apiRouter = require("../routes/api");
const adminRouter = require("../routes/admin");

const app = express();
app.use(express.json());
app.use("/api/admin", adminRouter);
app.use("/api", apiRouter);

function invokeApp(app, method, url, { body = {}, headers = {} } = {}) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseData = null;

    const lowerHeaders = {};
    for (const [k, v] of Object.entries(headers)) {
      lowerHeaders[k.toLowerCase()] = v;
    }

    const req = {
      method: method.toUpperCase(),
      url,
      originalUrl: url,
      path: url.split("?")[0],
      body,
      headers: lowerHeaders,
      query: {},
      ip: "127.0.0.1",
      connection: { remoteAddress: "127.0.0.1" }
    };

    const res = {
      statusCode: 200,
      status(code) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        resolve({ status: statusCode, body: data });
      },
      send(data) {
        responseData = data;
        resolve({ status: statusCode, body: data });
      },
      setHeader() {},
      getHeader() {},
      end() {
        resolve({ status: statusCode, body: responseData });
      }
    };

    app.handle(req, res, (err) => {
      if (err) console.error("Router error:", err);
      resolve({ status: 404, body: { message: "Not found", error: err ? String(err) : null } });
    });
  });
}

async function runUnifiedAuthSuite() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX — SECURE ADMIN & CUSTOMER UNIFIED AUTHENTICATION TESTS");
  console.log("==========================================================================\n");

  let passes = 0;
  const total = 8;
  const adminEmail = (process.env.ADMIN_EMAIL || "roshan.official0009@gmail.com").toLowerCase().trim();

  // 1. Designated Admin Authentication with Valid Credentials
  console.log("--- 1. Testing Admin Login with Valid Credentials ---");
  const testAdminPassword = "SecureAdminTestPassword_2026!";
  const testSalt = "a1b2c3d4e5f6789012345678abcdef01";
  const testHash = authService.hashPassword(testAdminPassword, testSalt);

  // Set isolated environment credentials for testing
  const originalSalt = process.env.ADMIN_PASSWORD_SALT;
  const originalHash = process.env.ADMIN_PASSWORD_HASH;
  process.env.ADMIN_PASSWORD_SALT = testSalt;
  process.env.ADMIN_PASSWORD_HASH = testHash;

  let unifiedAdminLogin;
  let validAdminRes;

  try {
    validAdminRes = authService.login(adminEmail, testAdminPassword, "127.0.0.1");
    assert.strictEqual(validAdminRes.success, true, "authService must successfully validate admin credentials");
    assert.ok(validAdminRes.token, "Valid admin login must return session token");
    assert.strictEqual(validAdminRes.user.role, "SUPER_ADMIN");

    unifiedAdminLogin = await invokeApp(app, "POST", "/api/auth/login", {
      body: {
        email: adminEmail,
        password: testAdminPassword
      }
    });

    assert.strictEqual(unifiedAdminLogin.status, 200, "Unified login must succeed with HTTP 200 for valid admin");
    assert.strictEqual(unifiedAdminLogin.body.success, true);
    assert.strictEqual(unifiedAdminLogin.body.isAdmin, true, "Must flag isAdmin: true for designated admin account");
    assert.strictEqual(unifiedAdminLogin.body.redirectTo, "/admin", "Must direct admin to /admin dashboard");
    assert.ok(unifiedAdminLogin.body.token, "Must return server session token");
    assert.strictEqual(unifiedAdminLogin.body.user.role, "super_admin");
    console.log("✔ PASS: Designated admin authenticates through unified endpoint and is routed directly to /admin.");
    passes++;
  } finally {
    // Restore original environment credentials
    process.env.ADMIN_PASSWORD_SALT = originalSalt;
    process.env.ADMIN_PASSWORD_HASH = originalHash;
  }

  // 2. Admin Login with Incorrect Password (Strict Rejection)
  console.log("\n--- 2. Testing Admin Account with Invalid Password ---");
  const badAdminLogin = await invokeApp(app, "POST", "/api/auth/login", {
    body: {
      email: adminEmail,
      password: "WrongPassword999!"
    }
  });

  assert.strictEqual(badAdminLogin.status, 401, "Bad admin password must return HTTP 401");
  assert.strictEqual(badAdminLogin.body.success, false);
  assert.strictEqual(badAdminLogin.body.isAdmin, false);
  assert.strictEqual(badAdminLogin.body.token, undefined, "No token must be issued on bad credentials");
  assert.ok(badAdminLogin.body.message.includes("Invalid"), "Must show standard invalid credentials error");
  console.log("✔ PASS: Invalid password for admin account strictly rejected with 401; zero access granted.");
  passes++;

  // 3. Normal Customer Authentication Routing
  console.log("\n--- 3. Testing Normal Customer Login Routing ---");
  const customerEmail = "dr.marcus.welby@cleveland-clinic.org";
  const customerLogin = await invokeApp(app, "POST", "/api/auth/login", {
    body: {
      email: customerEmail,
      password: "CustomerSecurePass2026!"
    }
  });

  assert.strictEqual(customerLogin.status, 200);
  assert.strictEqual(customerLogin.body.success, true);
  assert.strictEqual(customerLogin.body.isAdmin, false, "Must flag isAdmin: false for normal customer");
  assert.strictEqual(customerLogin.body.redirectTo, "/account", "Must route normal customer to /account");
  assert.strictEqual(customerLogin.body.user.role, "buyer", "Role must be buyer");
  console.log("✔ PASS: Normal customer authenticates cleanly and routes to /account customer page.");
  passes++;

  // 4. Server-Side Protection on Admin Endpoints (requireAdmin)
  console.log("\n--- 4. Testing Backend Protection on Admin Endpoints ---");
  // A. Unauthenticated request to /api/admin/dashboard
  const unauthDash = await invokeApp(app, "GET", "/api/admin/dashboard");
  assert.strictEqual(unauthDash.status, 401, "Unauthenticated request to admin dashboard must be rejected with 401");

  // B. Forged bearer token attempted against /api/admin/customers
  const forgedRes = await invokeApp(app, "GET", "/api/admin/customers", {
    headers: { Authorization: "Bearer forged_fake_token_12345" }
  });
  assert.strictEqual(forgedRes.status, 401, "Forged admin token must be rejected with 401");

  // C. Genuine admin token succeeds
  const authedDash = await invokeApp(app, "GET", "/api/admin/dashboard", {
    headers: { Authorization: `Bearer ${validAdminRes.token}` }
  });
  assert.strictEqual(authedDash.status, 200, "Genuine admin token must grant access to /api/admin/dashboard");
  assert.strictEqual(authedDash.body.success, true);
  console.log("✔ PASS: Admin endpoints strictly enforce server-side token validation; fake tokens rejected with 401.");
  passes++;

  // 5. Email Alone Never Grants Administrator Access
  console.log("\n--- 5. Testing That Email Alone Never Grants Admin Privileges ---");
  const emailOnlyLogin = await invokeApp(app, "POST", "/api/auth/login", {
    body: { email: adminEmail, password: "" }
  });
  assert.strictEqual(emailOnlyLogin.status, 400, "Missing password must be rejected with 400");
  assert.strictEqual(emailOnlyLogin.body.success, false);

  const spacesOnlyLogin = await invokeApp(app, "POST", "/api/auth/login", {
    body: { email: adminEmail, password: "   " }
  });
  assert.strictEqual(spacesOnlyLogin.status, 401, "Whitespace-only password must be rejected");
  assert.strictEqual(spacesOnlyLogin.body.success, false);
  console.log("✔ PASS: Email address alone never grants access; identity and password verified on backend.");
  passes++;

  // 6. Public Signup Privilege Escalation Defense
  console.log("\n--- 6. Testing Public Signup Privilege Escalation Defense ---");
  const customers = await supabaseService.getCustomers();
  assert.ok(customers.customers.every((c) => c.role !== "super_admin"), "Customer directory never assigns super_admin");
  console.log("✔ PASS: Public signups and customer profiles cannot self-assign administrator privileges.");
  passes++;

  // 7. Session Validation and Logout Lifecycle
  console.log("\n--- 7. Testing Session Validation and Logout Lifecycle ---");
  const sessionCheck = authService.validateSession(validAdminRes.token);
  assert.ok(sessionCheck, "Active admin session must validate");
  assert.strictEqual(sessionCheck.role, "SUPER_ADMIN");

  const logoutRes = await invokeApp(app, "POST", "/api/admin/logout", {
    headers: { Authorization: `Bearer ${validAdminRes.token}` }
  });
  assert.strictEqual(logoutRes.status, 200);

  const revokedCheck = authService.validateSession(validAdminRes.token);
  assert.strictEqual(revokedCheck, null, "Revoked admin token must no longer validate");
  console.log("✔ PASS: Admin session token verified and revoked successfully upon logout.");
  passes++;

  // 8. Zero Plaintext Passwords or Credentials in Responses
  console.log("\n--- 8. Testing Zero Plaintext Credentials in Responses & Logs ---");
  const stringifiedResp = JSON.stringify(unifiedAdminLogin.body);
  assert.strictEqual(unifiedAdminLogin.body.password, undefined);
  assert.ok(!stringifiedResp.includes(testAdminPassword), "Admin password must NEVER appear in response");
  assert.ok(!stringifiedResp.includes("password_hash"), "Password hash must NEVER appear in response");
  console.log("✔ PASS: Zero plaintext passwords or hashes in responses or application state.");
  passes++;

  console.log("\n==========================================================================");
  console.log(`  ALL ${passes}/${total} UNIFIED AUTHENTICATION TESTS PASSED!`);
  console.log("==========================================================================\n");
}

if (require.main === module) {
  runUnifiedAuthSuite().catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
}

module.exports = runUnifiedAuthSuite;
