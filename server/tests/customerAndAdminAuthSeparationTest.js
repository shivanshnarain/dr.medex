/**
 * DR.MEDEX Global — Customer & Admin Authentication Separation Test Suite
 * Validates:
 * 1. Customer Sign In & Sign Up on /account
 * 2. Customer signup and login flows
 * 3. Forgot Password and recovery engine
 * 4. Strict customer/admin authorization boundaries (zero privilege escalation)
 * 5. Dedicated Admin login with valid/invalid credentials
 * 6. Protected admin routes rejection of unauthenticated requests
 * 7. Admin session persistence and verification
 * 8. Vercel SPA routing and production API configuration
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const authService = require("../services/authService");
const passwordRecoveryService = require("../services/passwordRecoveryService");
const emailService = require("../services/emailService");

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✔ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`✖ FAIL: ${testName}`);
    console.error(`  Error: ${err.message}`);
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✔ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`✖ FAIL: ${testName}`);
    console.error(`  Error: ${err.message}`);
  }
}

async function main() {
  console.log("==========================================================================");
  console.log("   DR.MEDEX — CUSTOMER LOGIN, SIGNUP, ADMIN & ROUTING VERIFICATION       ");
  console.log("==========================================================================\n");

  // Clear test tokens and mailbox
  passwordRecoveryService._clearAllTokens();
  emailService.clearTestMailbox();

  // --- 1. /account Customer Sign In & Sign Up UI Structure ---
  runTest("AccountPage.tsx implements customer Sign In and Create Account interface", () => {
    const accountPageContent = fs.readFileSync(
      path.join(__dirname, "../../client/src/pages/AccountPage.tsx"),
      "utf8"
    );

    // Verify Tab switcher exists
    assert(accountPageContent.includes("Sign In"), "Must include Sign In tab");
    assert(accountPageContent.includes("Create Account"), "Must include Create Account tab");

    // Verify Sign In fields
    assert(accountPageContent.includes("loginEmail"), "Must have login email state");
    assert(accountPageContent.includes("loginPassword"), "Must have login password state");
    assert(accountPageContent.includes("Forgot password?"), "Must have Forgot Password link");
    assert(accountPageContent.includes("/account/forgot-password"), "Forgot password must route properly");

    // Verify Sign Up fields
    assert(accountPageContent.includes("signupFullName"), "Must have signup full name");
    assert(accountPageContent.includes("signupEmail"), "Must have signup email");
    assert(accountPageContent.includes("signupPassword"), "Must have signup password");
    assert(accountPageContent.includes("signupConfirmPassword"), "Must have confirm password");
    assert(accountPageContent.includes("account-terms"), "Must have terms acceptance checkbox");

    // Verify No customer sees 'Open Admin Panel'
    assert(!accountPageContent.includes("Open Admin Panel"), "Must never show 'Open Admin Panel' to customers");
    assert(accountPageContent.includes("isAdminAuthenticated"), "Admin access must strictly depend on AdminAuthContext");
  });

  // --- 2. Customer Authentication & Credential Storage ---
  await runAsyncTest("Customer credential verification and password management", async () => {
    const testEmail = `test.physician.${Date.now()}@hospital.org`;
    const newPass = "NewSecurePassword2026!";

    // Request reset to generate a token and email
    const resetReq = await passwordRecoveryService.requestRecovery({
      email: testEmail,
      origin: "http://localhost:5173"
    });
    assert.strictEqual(resetReq.success, true, "Password reset request must succeed");

    // Retrieve raw token from captured test email
    const mailbox = emailService.getTestMailbox();
    const sentEmail = mailbox.find(m => m.to === testEmail);
    assert(sentEmail, "Dispatched email must exist in test mailbox");
    const rawToken = new URL(sentEmail.resetUrl).searchParams.get("token");
    assert(rawToken, "Raw token must exist in reset URL");

    // Complete password reset
    const resetResult = await passwordRecoveryService.resetPassword({
      rawToken,
      newPassword: newPass
    });
    assert.strictEqual(resetResult.success, true, "Password reset must succeed");

    // Verify credentials with updated password
    const validCheck = passwordRecoveryService.verifyCredentials(testEmail, newPass);
    assert.strictEqual(validCheck, true, "Valid customer password must authenticate");

    // Verify invalid password rejection
    const invalidCheck = passwordRecoveryService.verifyCredentials(testEmail, "WrongPassword123!");
    assert.strictEqual(invalidCheck, false, "Invalid customer password must be rejected");
  });

  // --- 3. Forgot Password & Recovery Engine ---
  await runAsyncTest("Forgot Password token generation, verification, and reset", async () => {
    const recoverEmail = `dr.recovery.${Date.now()}@surgerycenter.com`;
    const newPass = "NewSecurePassword2026!";

    // Request reset
    const resetReq = await passwordRecoveryService.requestRecovery({
      email: recoverEmail,
      origin: "http://localhost:5173"
    });
    assert.strictEqual(resetReq.success, true, "Password reset request must succeed");

    const mailbox = emailService.getTestMailbox();
    const sentEmail = mailbox.find(m => m.to === recoverEmail);
    assert(sentEmail, "Sent email must be found in mailbox");
    const rawToken = new URL(sentEmail.resetUrl).searchParams.get("token");
    assert(rawToken, "Token must be parsed from email resetUrl");

    // Verify token
    const tokenCheck = passwordRecoveryService.verifyRecoveryToken(rawToken);
    assert.strictEqual(tokenCheck.valid, true, "Reset token must be valid");
    assert.strictEqual(tokenCheck.email, recoverEmail, "Token must be associated with customer email");

    // Reset password with token
    const resetResult = await passwordRecoveryService.resetPassword({
      rawToken,
      newPassword: newPass
    });
    assert.strictEqual(resetResult.success, true, "Password reset with valid token must succeed");

    // Verify new password works
    const newAuthCheck = passwordRecoveryService.verifyCredentials(recoverEmail, newPass);
    assert.strictEqual(newAuthCheck, true, "Customer must authenticate with new password");
  });

  // --- 4. Customer Sessions Cannot Grant Admin Privileges ---
  runTest("Customer role in client profile strictly never grants admin access", () => {
    const authContextContent = fs.readFileSync(
      path.join(__dirname, "../../client/src/context/AuthContext.tsx"),
      "utf8"
    );

    // Verify isAdmin is hardcoded to false in AuthContext
    assert(
      authContextContent.includes("isAdmin: false"),
      "Customer AuthContext must enforce isAdmin: false unconditionally"
    );

    // Verify mapSupabaseUserToProfile sets role to buyer
    assert(
      authContextContent.includes('role: "buyer"'),
      "Customer profiles must default strictly to buyer role"
    );
  });

  // --- 5. Dedicated Admin Login Validation ---
  runTest("Admin Login authenticates valid admin credentials and rejects invalid credentials", () => {
    // Valid admin login
    const validLogin = authService.login("roshan.official0009@gmail.com", "Roshan1998@@", "127.0.0.1");
    assert.strictEqual(validLogin.success, true, "Valid admin credentials must succeed");
    assert(validLogin.token, "Valid admin login must return secure session token");
    assert.strictEqual(validLogin.user.role.toLowerCase(), "super_admin", "Admin user role must be super_admin");

    // Invalid admin password
    const invalidLogin = authService.login("roshan.official0009@gmail.com", "WrongAdminPass123", "127.0.0.1");
    assert.strictEqual(invalidLogin.success, false, "Invalid password must be rejected");
    assert.strictEqual(invalidLogin.status, 401, "Invalid credentials must return 401 status");

    // Unregistered admin email
    const unknownAdmin = authService.login("hacker@malicious.com", "SomePass123!", "127.0.0.1");
    assert.strictEqual(unknownAdmin.success, false, "Unknown email must be rejected");
  });

  // --- 6. Protected Admin Routes Reject Unauthenticated Requests ---
  runTest("Protected admin session validation middleware logic", () => {
    // Without token
    assert.strictEqual(authService.validateSession(null), null, "Null token must return null");
    assert.strictEqual(authService.validateSession(""), null, "Empty token must return null");
    assert.strictEqual(authService.validateSession("fake_token_abc123"), null, "Invalid token must return null");

    // With valid token from real login
    const adminSession = authService.login("roshan.official0009@gmail.com", "Roshan1998@@", "127.0.0.1");
    assert(adminSession.token, "Must obtain active admin token");

    const validated = authService.validateSession(adminSession.token);
    assert(validated, "Session must validate successfully with active token");
    assert.strictEqual(validated.email, "roshan.official0009@gmail.com", "Session must contain correct admin email");
  });

  // --- 7. Admin Session Survival & Logout Flow ---
  runTest("Admin sessions survive page reload simulation and terminate cleanly on logout", () => {
    const loginRes = authService.login("roshan.official0009@gmail.com", "Roshan1998@@", "127.0.0.1");
    const activeToken = loginRes.token;

    // Simulate page refresh (re-validating stored token)
    const refreshedSession = authService.validateSession(activeToken);
    assert(refreshedSession, "Token in localStorage must successfully survive browser refresh");

    // Admin Logout
    authService.logout(activeToken);

    // Verify session terminated
    const afterLogout = authService.validateSession(activeToken);
    assert.strictEqual(afterLogout, null, "Terminated session token must return null after logout");
  });

  // --- 8. Vercel Production Routing & API Configuration ---
  runTest("Vercel routing configurations and apiConfig exist with SPA rewrites", () => {
    // Root vercel.json
    const rootVercel = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../vercel.json"), "utf8")
    );
    assert(Array.isArray(rootVercel.rewrites), "Root vercel.json must define rewrites");
    const hasSpaRewrite = rootVercel.rewrites.some(r => r.destination === "/index.html");
    assert(hasSpaRewrite, "Root vercel.json must rewrite non-API routes to /index.html");

    // Client vercel.json
    const clientVercel = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../../client/vercel.json"), "utf8")
    );
    assert(Array.isArray(clientVercel.rewrites), "Client vercel.json must define rewrites");
    assert(clientVercel.rewrites.some(r => r.destination === "/index.html"), "Client vercel.json must rewrite to /index.html");

    // apiConfig.ts
    const apiConfigContent = fs.readFileSync(
      path.join(__dirname, "../../client/src/lib/apiConfig.ts"),
      "utf8"
    );
    assert(apiConfigContent.includes("VITE_API_BASE_URL"), "Must support configurable production API base URL");
    assert(!apiConfigContent.includes("http://localhost"), "Must never hardcode localhost into production config");
  });

  // --- 9. Git Safety: Secrets are strictly Git-ignored ---
  runTest("Git safety: .env, serviceAccountKey, and secrets are strictly excluded", () => {
    const gitignoreContent = fs.readFileSync(path.join(__dirname, "../../.gitignore"), "utf8");
    assert(gitignoreContent.includes(".env"), ".gitignore must include .env");
    assert(
      gitignoreContent.includes("serviceAccountKey.json") || gitignoreContent.includes("*serviceAccount*.json"),
      ".gitignore must exclude service account files"
    );
  });

  console.log("\n==========================================================================");
  console.log(`   TOTAL: ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("==========================================================================");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
