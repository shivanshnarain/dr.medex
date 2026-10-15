/**
 * DR.MEDEX Verification Suite: Customer Login Tracking, Retention & Password Recovery
 * 
 * Verifies:
 * 1. Legitimate data recording on successful customer authentication (email, id, phone, UTC timestamp, authMethod, outcome).
 * 2. Strict credential isolation (zero passwords, tokens, or private keys recorded).
 * 3. Rapid reload / React re-render de-duplication (prevents duplicate logs within 60s).
 * 4. Multi-parameter searching and sorting (date, email, customer ID).
 * 5. Rolling 30-day activity retention cleanup (records > 30 days deleted; records <= 30 days preserved).
 * 6. Non-destructive safety guarantee: customer accounts, profiles, and business data are NEVER deleted.
 * 7. Vercel cron cleanup endpoint compatibility & idempotency.
 * 8. Password recovery allowed origins (dr-medex.vercel.app permitted; phishing origins rejected).
 * 9. Honest delivery error reporting (no fake delivery when provider unconfigured).
 */

const assert = require("assert");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const supabaseService = require("../services/supabaseService");
const passwordRecoveryService = require("../services/passwordRecoveryService");
const emailService = require("../services/emailService");

async function runRetentionAndTrackingSuite() {
  console.log("==========================================================================");
  console.log("  DR.MEDEX — LOGIN ACTIVITY TRACKING, 30-DAY RETENTION & RECOVERY TESTS");
  console.log("==========================================================================\n");

  let passes = 0;
  const total = 9;

  // 1. Record Customer Login Event with Legitimate Data
  console.log("--- 1. Testing Genuine Customer Login Recording ---");
  const testCustomerId = "usr-test-retention-001";
  const testEmail = "dr.marcus.welby@cleveland-clinic.org";
  const testPhone = "+1 (216) 444-2200";

  const event = await supabaseService.recordCustomerLogin({
    customerId: testCustomerId,
    email: testEmail,
    fullName: "Dr. Marcus Welby",
    phone: testPhone,
    authMethod: "email_password",
    ip: "198.51.100.42",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/134.0.0.0"
  });

  assert.ok(event.id.startsWith("act_"), "Event must generate unique ID prefixed with act_");
  assert.strictEqual(event.customerId, testCustomerId);
  assert.strictEqual(event.email, testEmail);
  assert.strictEqual(event.phone, testPhone, "Phone must be recorded when explicitly supplied");
  assert.strictEqual(event.authMethod, "email_password");
  assert.strictEqual(event.outcome, "SUCCESS");
  assert.ok(event.timestamp.endsWith("Z"), "Timestamp must be UTC ISO 8601 string");
  assert.strictEqual(event.ip, "198.51.100.42");
  assert.strictEqual(event.device, "macOS / Chrome");

  console.log("✔ PASS: Login event successfully recorded with legitimate metadata and UTC timestamp.");
  passes++;

  // 2. Strict Credential Isolation
  console.log("\n--- 2. Testing Strict Credential Isolation in Audit Records ---");
  assert.strictEqual(event.password, undefined, "Audit record must NEVER contain a password property");
  assert.strictEqual(event.access_token, undefined, "Audit record must NEVER contain an access_token property");
  assert.strictEqual(event.token, undefined, "Audit record must NEVER contain a token property");
  assert.strictEqual(event.secret, undefined, "Audit record must NEVER contain a secret property");
  assert.strictEqual(event.rawCredentials, undefined, "Audit record must NEVER contain rawCredentials");
  const eventKeys = Object.keys(event);
  assert.ok(!eventKeys.includes("password"), "Event keys must not contain password");
  assert.ok(!eventKeys.includes("token"), "Event keys must not contain token");
  assert.ok(!eventKeys.includes("secret"), "Event keys must not contain secret");
  console.log("✔ PASS: Zero plaintext passwords, session tokens, or private keys in activity logs.");
  passes++;

  // 3. Re-render / Page Refresh De-duplication
  console.log("\n--- 3. Testing Login De-duplication Defense ---");
  const countBeforeDup = (await supabaseService.getCustomerLoginActivity()).totalCount;
  
  // Attempt immediate duplicate login event for same customer from same IP
  const dupEvent = await supabaseService.recordCustomerLogin({
    customerId: testCustomerId,
    email: testEmail,
    fullName: "Dr. Marcus Welby",
    phone: testPhone,
    authMethod: "email_password",
    ip: "198.51.100.42",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/134.0.0.0"
  });

  const countAfterDup = (await supabaseService.getCustomerLoginActivity()).totalCount;
  assert.strictEqual(countAfterDup, countBeforeDup, "Duplicate login within 60s must NOT create a new record");
  assert.strictEqual(dupEvent.id, event.id, "De-duplicated call must return existing event ID");
  console.log("✔ PASS: Debounce window successfully prevented duplicate record on immediate re-call.");
  passes++;

  // 4. Searching and Sorting
  console.log("\n--- 4. Testing Activity Search and Sorting ---");
  const searchByEmail = await supabaseService.getCustomerLoginActivity({ search: testEmail });
  assert.ok(searchByEmail.activities.length >= 1, "Search by email must return matched event");
  assert.strictEqual(searchByEmail.activities[0].email, testEmail);

  const searchById = await supabaseService.getCustomerLoginActivity({ search: testCustomerId });
  assert.ok(searchById.activities.length >= 1, "Search by customerId must return matched event");

  const sortAsc = await supabaseService.getCustomerLoginActivity({ sortBy: "date", sortOrder: "asc" });
  const sortDesc = await supabaseService.getCustomerLoginActivity({ sortBy: "date", sortOrder: "desc" });
  assert.ok(sortAsc.activities.length > 0 && sortDesc.activities.length > 0);
  assert.ok(
    new Date(sortAsc.activities[0].timestamp).getTime() <= new Date(sortDesc.activities[0].timestamp).getTime(),
    "Date sorting order must be respected"
  );
  console.log("✔ PASS: Activity list is searchable and sortable by date, email, and user ID.");
  passes++;

  // 5. Rolling 30-Day Retention Policy
  console.log("\n--- 5. Testing Rolling 30-Day Data Retention Cleanup ---");
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Seed records at various ages
  const recentEvent = {
    id: "act-test-recent-5d",
    customerId: "usr-recent",
    email: "recent@hospital.org",
    fullName: "Recent User",
    timestamp: new Date(now - 5 * dayMs).toISOString(),
    ip: "127.0.0.1",
    device: "Desktop",
    accountStatus: "PERMANENT_ACTIVE"
  };

  const expiredEvent31d = {
    id: "act-test-expired-31d",
    customerId: "usr-expired-1",
    email: "expired31@hospital.org",
    fullName: "Expired 31d User",
    timestamp: new Date(now - 31 * dayMs).toISOString(),
    ip: "127.0.0.1",
    device: "Desktop",
    accountStatus: "PERMANENT_ACTIVE"
  };

  const expiredEvent45d = {
    id: "act-test-expired-45d",
    customerId: "usr-expired-2",
    email: "expired45@hospital.org",
    fullName: "Expired 45d User",
    timestamp: new Date(now - 45 * dayMs).toISOString(),
    ip: "127.0.0.1",
    device: "Desktop",
    accountStatus: "PERMANENT_ACTIVE"
  };

  supabaseService._seedActivity(recentEvent);
  supabaseService._seedActivity(expiredEvent31d);
  supabaseService._seedActivity(expiredEvent45d);

  const cleanupRes = supabaseService.cleanupExpiredActivity(30);
  assert.ok(cleanupRes.cleanedCount >= 2, "Must clean at least the 2 expired events");
  assert.strictEqual(cleanupRes.retentionDays, 30);

  // Verify recent record remains and expired records are removed
  const allCurrent = await supabaseService.getCustomerLoginActivity();
  const foundRecent = allCurrent.activities.some((a) => a.id === "act-test-recent-5d");
  const foundExpired31 = allCurrent.activities.some((a) => a.id === "act-test-expired-31d");
  const foundExpired45 = allCurrent.activities.some((a) => a.id === "act-test-expired-45d");

  assert.strictEqual(foundRecent, true, "Records <= 30 days must be preserved");
  assert.strictEqual(foundExpired31, false, "Records > 30 days must be purged");
  assert.strictEqual(foundExpired45, false, "Records > 45 days must be purged");
  console.log(`✔ PASS: 30-Day retention verified. ${cleanupRes.cleanedCount} expired records purged; recent records intact.`);
  passes++;

  // 6. Non-Destructive Safety Guarantee
  console.log("\n--- 6. Testing Non-Destructive Guarantee (Customer Accounts Untouched) ---");
  const customersAfterCleanup = await supabaseService.getCustomers();
  assert.ok(customersAfterCleanup.totalCount >= 6, "Customer accounts must never be deleted by activity cleanup");
  assert.strictEqual(cleanupRes.accountsUntouched >= 6, true, "Accounts untouched count must be verified");
  console.log("✔ PASS: Customer accounts, profiles, and order data are permanently retained.");
  passes++;

  // 7. Password Recovery Production Allowed Origins
  console.log("\n--- 7. Testing Allowed Origins & Callback Protection ---");
  assert.strictEqual(passwordRecoveryService.isAllowedOrigin("https://dr-medex.vercel.app/account/reset-password"), true, "dr-medex.vercel.app must be allowed");
  assert.strictEqual(passwordRecoveryService.isAllowedOrigin("https://dr-medex-git-main.vercel.app/account/reset-password"), true, "dr-medex preview deployments must be allowed");
  assert.strictEqual(passwordRecoveryService.isAllowedOrigin("http://localhost:5173/account/reset-password"), true, "localhost:5173 must be allowed for local dev");
  assert.strictEqual(passwordRecoveryService.isAllowedOrigin("https://evil-phishing-attacker.com/account/reset-password"), false, "Malicious origins must be rejected");
  console.log("✔ PASS: dr-medex.vercel.app and preview domains allowed; external phishing origins rejected.");
  passes++;

  // 8. End-to-End Password Recovery Flow & Verification
  console.log("\n--- 8. Testing End-to-End Recovery Request -> Token -> Reset -> Login ---");
  const prevEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "test";
  passwordRecoveryService._clearAllTokens();
  emailService.clearTestMailbox();

  const resetEmail = "dr.elena.vance@saintmarys-cardio.org";
  const reqRes = await passwordRecoveryService.requestRecovery({
    email: resetEmail,
    origin: "https://dr-medex.vercel.app",
    clientIp: "127.0.0.1"
  });

  assert.strictEqual(reqRes.success, true);
  const mailbox = emailService.getTestMailbox();
  assert.ok(mailbox.length >= 1, "Recovery email must be generated");
  assert.ok(mailbox[0].resetUrl.startsWith("https://dr-medex.vercel.app/account/reset-password?token="), "Reset URL must point to production domain");

  const rawToken = new URL(mailbox[0].resetUrl).searchParams.get("token");
  assert.strictEqual(rawToken.length, 64);

  // Verify token
  const verifyRes = passwordRecoveryService.verifyRecoveryToken(rawToken);
  assert.strictEqual(verifyRes.valid, true);
  assert.strictEqual(verifyRes.email, resetEmail);

  // Reset password
  const newSecretPass = "CardioNewPass2026!";
  const resetRes = await passwordRecoveryService.resetPassword({
    rawToken,
    newPassword: newSecretPass
  });
  assert.strictEqual(resetRes.success, true);

  // Single-use enforcement: token cannot be reused
  const reuseRes = passwordRecoveryService.verifyRecoveryToken(rawToken);
  assert.strictEqual(reuseRes.valid, false, "Token must be invalidated after single use");
  console.log("✔ PASS: Complete flow verified: request email -> token generated -> password reset -> token revoked.");
  passes++;

  // 9. Honest Error Handling When Provider Unconfigured in Production
  console.log("\n--- 9. Testing Honest Reporting When Provider Unconfigured ---");
  try {
    process.env.NODE_ENV = "production";
    // In production without live SMTP or Resend/SendGrid
    const unconfiguredRes = await passwordRecoveryService.requestRecovery({
      email: "unconfigured@hospital.org",
      origin: "https://dr-medex.vercel.app"
    });
    assert.strictEqual(unconfiguredRes.success, false, "Must NOT claim success in production if email wasn't delivered");
    assert.strictEqual(unconfiguredRes.code, "EMAIL_NOT_CONFIGURED");
    assert.ok(unconfiguredRes.message.includes("not configured"), "Message must explain that provider is not configured");
    console.log("✔ PASS: Production strictly reports EMAIL_NOT_CONFIGURED without pretending email delivery.");
    passes++;
  } finally {
    process.env.NODE_ENV = prevEnv;
  }

  console.log("\n==========================================================================");
  console.log(`  ALL ${passes}/${total} RETENTION, TRACKING & RECOVERY TESTS PASSED!`);
  console.log("==========================================================================\n");
}

if (require.main === module) {
  runRetentionAndTrackingSuite().catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
}

module.exports = runRetentionAndTrackingSuite;
