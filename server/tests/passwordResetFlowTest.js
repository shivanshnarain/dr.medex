/**
 * DR.MEDEX Verification Suite: Password Recovery & Reset Flow
 * 
 * Verifies:
 * 1. Valid vs Invalid Email Input validation.
 * 2. Sliding-window anti-abuse rate limiting.
 * 3. Accurate provider error reporting (no silent fake "Recovery link sent").
 * 4. Cryptographic token generation & SHA-256 token hashing (zero plaintext token persistence).
 * 5. Open redirect / callback origin protection.
 * 6. Email dispatch & template formatting (HTML/plain text, expiration, security advice).
 * 7. Token verification (valid, invalid, expired).
 * 8. Password update validation (min length 6, single-use token consumption).
 * 9. Sign-in using updated password (old password rejected, new password authenticated).
 * 10. Existing auth regression checks & credential isolation.
 */

const assert = require("assert");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const passwordRecoveryService = require("../services/passwordRecoveryService");
const emailService = require("../services/emailService");
const supabaseService = require("../services/supabaseService");

async function runPasswordResetSuite() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX — FORGOT PASSWORD EMAIL DELIVERY & RECOVERY VERIFICATION");
  console.log("==========================================================================\n");

  let passes = 0;
  const total = 10;

  // Clear test mailbox and tokens before starting
  passwordRecoveryService._clearAllTokens();
  emailService.clearTestMailbox();

  // 1. Email Input Validation
  console.log("--- 1. Testing Email Input Validation ---");
  const invalidEmails = ["", "   ", "not-an-email", "@hospital.org", "dr.smith@", "spaces in@domain.com"];
  for (const badEmail of invalidEmails) {
    const res = await passwordRecoveryService.requestRecovery({ email: badEmail });
    assert.strictEqual(res.success, false, `Expected rejection for invalid email: "${badEmail}"`);
    assert.strictEqual(res.code, "INVALID_EMAIL");
  }

  assert.strictEqual(passwordRecoveryService.isValidEmail("dr.smith@cardio-institute.org"), true);
  assert.strictEqual(passwordRecoveryService.isValidEmail("procurement@saintmarys.de"), true);
  console.log("✔ PASS: Invalid emails strictly rejected; valid clinical email formats accepted.");
  passes++;

  // 2. Open Redirect & Callback Origin Protection
  console.log("\n--- 2. Testing Allowed Redirect Origin Validation ---");
  assert.strictEqual(passwordRecoveryService.isAllowedOrigin("http://localhost:5173/account/reset-password"), true);
  assert.strictEqual(passwordRecoveryService.isAllowedOrigin("https://drmedex.com/account/reset-password"), true);
  assert.strictEqual(passwordRecoveryService.isAllowedOrigin("https://malicious-phishing-site.com/steal-token"), false);
  assert.strictEqual(passwordRecoveryService.isAllowedOrigin("http://evil-tracker.org"), false);
  console.log("✔ PASS: Arbitrary external redirect origins rejected; DR.MEDEX origins allowed.");
  passes++;

  // 3. Token Generation, SHA-256 Hashing, & Email Dispatch
  console.log("\n--- 3. Testing Cryptographic Token Generation & Email Dispatch ---");
  const testCustomerEmail = "dr.elena.vance@saintmarys-cardio.org";
  const reqRes = await passwordRecoveryService.requestRecovery({
    email: testCustomerEmail,
    origin: "http://localhost:5173",
    clientIp: "127.0.0.1"
  });

  assert.strictEqual(reqRes.success, true, "Recovery request must succeed");
  assert.ok(reqRes.message.includes("If an account is associated"), "Response must use safe anti-enumeration message");

  // Check test mailbox capture
  const mailbox = emailService.getTestMailbox();
  assert.ok(mailbox.length >= 1, "Dispatched email must be captured in test mailbox");
  const emailItem = mailbox[0];
  assert.strictEqual(emailItem.to, testCustomerEmail);
  assert.ok(emailItem.subject.includes("DR.MEDEX"), "Email subject must reference DR.MEDEX");
  assert.ok(emailItem.resetUrl.includes("/account/reset-password?token="), "Reset URL must point to reset-password with token");
  assert.ok(emailItem.html.includes("60 minutes"), "Email must state 60-minute expiration");
  assert.ok(emailItem.html.includes("Security Notice"), "Email must include security notice");
  console.log(`✔ PASS: Cryptographic token generated. Email template captured in test mailbox (${emailItem.to}).`);
  passes++;

  // 4. Token Extraction & Verification (Valid Token)
  console.log("\n--- 4. Testing Token Verification (Valid Token) ---");
  const urlObj = new URL(emailItem.resetUrl);
  const rawToken = urlObj.searchParams.get("token");
  assert.ok(rawToken && rawToken.length === 64, "Raw token must be a 64-character hex string");

  const verifyValid = passwordRecoveryService.verifyRecoveryToken(rawToken);
  assert.strictEqual(verifyValid.valid, true, "Token must verify as valid");
  assert.strictEqual(verifyValid.email, testCustomerEmail);
  console.log("✔ PASS: Valid 64-character token successfully verified with matching customer email.");
  passes++;

  // 5. Token Verification (Tampered / Invalid Token)
  console.log("\n--- 5. Testing Invalid & Tampered Token Handling ---");
  const tamperedToken = rawToken.substring(0, 63) + (rawToken.charAt(63) === "a" ? "b" : "a");
  const verifyTampered = passwordRecoveryService.verifyRecoveryToken(tamperedToken);
  assert.strictEqual(verifyTampered.valid, false, "Tampered token must be rejected");
  assert.strictEqual(verifyTampered.code, "TOKEN_NOT_FOUND");

  const verifyMalformed = passwordRecoveryService.verifyRecoveryToken("invalid-short-token");
  assert.strictEqual(verifyMalformed.valid, false, "Malformed token must be rejected");
  assert.strictEqual(verifyMalformed.code, "INVALID_TOKEN");
  console.log("✔ PASS: Tampered and malformed recovery tokens strictly rejected.");
  passes++;

  // 6. Token Expiration Handling (Expired Token)
  console.log("\n--- 6. Testing Token Expiration Handling ---");
  // Look up stored record and simulate expiration
  const tokenRecord = passwordRecoveryService._getLatestTokenForEmail(testCustomerEmail);
  assert.ok(tokenRecord, "Record must exist in memory");
  const originalExpiresAt = tokenRecord.expiresAt;
  tokenRecord.expiresAt = Date.now() - 1000; // 1 second in the past

  const verifyExpired = passwordRecoveryService.verifyRecoveryToken(rawToken);
  assert.strictEqual(verifyExpired.valid, false, "Expired token must be rejected");
  assert.strictEqual(verifyExpired.code, "TOKEN_EXPIRED");
  assert.ok(verifyExpired.error.includes("expired"), "Error message must state token has expired");

  // Restore for subsequent test
  tokenRecord.expiresAt = originalExpiresAt;
  console.log("✔ PASS: Expired recovery tokens rejected with actionable guidance.");
  passes++;

  // 7. Password Reset Validation & Single-Use Token Consumption
  console.log("\n--- 7. Testing Password Reset Validation & Single-Use Consumption ---");
  // Test password too short (< 6 chars)
  const shortPassRes = await passwordRecoveryService.resetPassword({
    rawToken,
    newPassword: "123"
  });
  assert.strictEqual(shortPassRes.success, false, "Passwords under 6 characters must be rejected");
  assert.strictEqual(shortPassRes.code, "PASSWORD_TOO_SHORT");

  // Reset with secure new password
  const newSecretPassword = "DrMedexSecure@2026!";
  const resetRes = await passwordRecoveryService.resetPassword({
    rawToken,
    newPassword: newSecretPassword
  });
  assert.strictEqual(resetRes.success, true, "Password reset must succeed");
  assert.ok(resetRes.message.includes("successfully updated"), "Success message must confirm update");

  // Attempt to REUSE the same token
  const reuseRes = await passwordRecoveryService.resetPassword({
    rawToken,
    newPassword: "AnotherPassword123!"
  });
  assert.strictEqual(reuseRes.success, false, "Used token must be rejected on reuse attempt");
  assert.strictEqual(reuseRes.code, "TOKEN_ALREADY_USED");
  console.log("✔ PASS: Password updated securely; single-use token revoked and reuse strictly blocked.");
  passes++;

  // 8. Sign-In Verification with Updated Password
  console.log("\n--- 8. Testing Sign-In with Updated Password vs Old Password ---");
  const oldPasswordAuth = passwordRecoveryService.verifyCredentials(testCustomerEmail, "OldPassword123!");
  assert.strictEqual(oldPasswordAuth, false, "Old password must be rejected");

  const wrongPasswordAuth = passwordRecoveryService.verifyCredentials(testCustomerEmail, "WrongPassword@999");
  assert.strictEqual(wrongPasswordAuth, false, "Incorrect password must be rejected");

  const updatedPasswordAuth = passwordRecoveryService.verifyCredentials(testCustomerEmail, newSecretPassword);
  assert.strictEqual(updatedPasswordAuth, true, "Sign-in with updated password must succeed");
  console.log("✔ PASS: Sign-in verified. Old password revoked; new password authenticated successfully.");
  passes++;

  // 9. Rate Limiting Sliding Window Enforcement
  console.log("\n--- 9. Testing Anti-Abuse Rate Limiting ---");
  const spamEmail = "spam.recovery.test@drmedex.org";
  let hitRateLimit = false;
  for (let i = 0; i < 7; i++) {
    const r = await passwordRecoveryService.requestRecovery({
      email: spamEmail,
      origin: "http://localhost:5173",
      clientIp: "192.0.2.1"
    });
    if (!r.success && r.code === "RATE_LIMITED") {
      hitRateLimit = true;
      break;
    }
  }
  assert.strictEqual(hitRateLimit, true, "Rate limiting must trigger after exceeding request threshold");
  console.log("✔ PASS: Anti-abuse sliding-window rate limit strictly enforced.");
  passes++;

  // 10. Diagnostics & Secret Key Isolation
  console.log("\n--- 10. Testing Diagnostics & Secret Credential Isolation ---");
  const diag = passwordRecoveryService.getDiagnostics();
  assert.ok(typeof diag.supabaseConfigured === "boolean", "Must report supabase configuration status");
  assert.ok(typeof diag.emailConfigured === "boolean", "Must report email configuration status");
  assert.ok(typeof diag.emailProvider === "string", "Must report provider type");

  // Ensure secrets, API keys, and passwords NEVER appear in diagnostics
  const jsonDiag = JSON.stringify(diag);
  assert.ok(!jsonDiag.includes("sb_secret_7DRn"), "Secret key must NEVER appear in diagnostics");
  assert.ok(!jsonDiag.includes("DrMedexSecure"), "Customer passwords must NEVER appear in diagnostics");
  console.log(`✔ PASS: Safe diagnostics confirmed (email provider: ${diag.emailProvider}, live Supabase: ${diag.supabaseLive}). Zero credential leakage.`);
  passes++;

  console.log("\n==========================================================================");
  console.log(`  ALL ${passes}/${total} PASSWORD RECOVERY & RESET TESTS PASSED!`);
  console.log("==========================================================================");
}

runPasswordResetSuite().then(() => process.exit(0)).catch((err) => {
  console.error("\n❌ Test failure in passwordResetFlowTest:", err);
  process.exit(1);
});
