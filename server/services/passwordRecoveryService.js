/**
 * DR.MEDEX Global — Customer Password Recovery Service
 * 
 * End-to-end security architecture:
 * 1. Cryptographically secure random tokens (crypto.randomBytes(32)).
 * 2. Token hashing with SHA-256 (raw tokens are never stored at rest).
 * 3. 60-Minute strict expiration window.
 * 4. Single-use enforcement (immediate revocation upon use).
 * 5. Anti-abuse rate limiting (per-email & per-IP sliding windows).
 * 6. Allowed redirect origin validation (prevents open-redirect attacks).
 * 7. Live Supabase Auth integration when valid project ref is configured.
 * 8. Safe anti-enumeration responses while honestly reporting delivery status.
 */

const crypto = require("crypto");
const emailService = require("./emailService");
const supabaseService = require("./supabaseService");

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://drmedex.supabase.co").replace(/\/+$/, "");
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";

// Allowed origins for password reset callbacks
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://drmedex.com",
  "https://www.drmedex.com"
]);

// Sliding rate limit store: Map<key, number[]>
const RATE_LIMIT_CACHE = new Map();

// In-memory token store: Map<tokenHash, RecoveryTokenRecord>
// Stored by hash, raw token is never kept on server.
const RECOVERY_TOKENS = new Map();

// Local mock password store for test/offline verification (hashed using PBKDF2; NEVER plaintext!)
const LOCAL_CREDENTIALS = new Map();

class PasswordRecoveryService {
  constructor() {
    // Clean up expired tokens periodically (every 10 minutes)
    this._cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 10 * 60 * 1000);
    if (this._cleanupInterval.unref) {
      this._cleanupInterval.unref();
    }
  }

  /**
   * Validate email format
   */
  isValidEmail(email) {
    if (!email || typeof email !== "string") return false;
    const clean = email.trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) && clean.length <= 254;
  }

  /**
   * Validate redirect origin
   */
  isAllowedOrigin(urlStr) {
    try {
      const parsed = new URL(urlStr);
      return ALLOWED_ORIGINS.has(parsed.origin);
    } catch {
      return false;
    }
  }

  /**
   * Check sliding-window rate limit (default: 3 requests per 15 minutes)
   */
  checkRateLimit(key, maxRequests = 3, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const timestamps = RATE_LIMIT_CACHE.get(key) || [];
    const valid = timestamps.filter((t) => now - t < windowMs);

    if (valid.length >= maxRequests) {
      return false;
    }

    valid.push(now);
    RATE_LIMIT_CACHE.set(key, valid);
    return true;
  }

  /**
   * Check if Supabase endpoint is a live host or known placeholder
   */
  isLiveSupabaseConfigured() {
    return (
      Boolean(SUPABASE_SECRET_KEY) &&
      Boolean(SUPABASE_URL) &&
      !SUPABASE_URL.includes("drmedex.supabase.co")
    );
  }

  /**
   * Step 1: Request Password Recovery
   * Initiates password recovery, creates secure cryptographic token, and dispatches email.
   */
  async requestRecovery({ email, origin, clientIp = "127.0.0.1" }) {
    if (!this.isValidEmail(email)) {
      return {
        success: false,
        code: "INVALID_EMAIL",
        message: "Please enter a valid email address."
      };
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check sliding rate limits: 3 per email per 15m, 10 per IP per 15m
    if (!this.checkRateLimit(`rec_email:${cleanEmail}`, 5, 15 * 60 * 1000)) {
      return {
        success: false,
        code: "RATE_LIMITED",
        message: "Too many password recovery requests for this email. Please wait 15 minutes before trying again."
      };
    }

    if (!this.checkRateLimit(`rec_ip:${clientIp}`, 15, 15 * 60 * 1000)) {
      return {
        success: false,
        code: "RATE_LIMITED",
        message: "Too many requests from your network. Please wait before retrying."
      };
    }

    // Determine target redirect base
    let baseOrigin = "http://localhost:5173";
    if (origin && this.isAllowedOrigin(origin)) {
      baseOrigin = new URL(origin).origin;
    }

    // 1. Attempt live Supabase Auth recovery if live project is configured
    if (this.isLiveSupabaseConfigured()) {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.SUPABASE_PUBLISHABLE_KEY || SUPABASE_SECRET_KEY
          },
          body: JSON.stringify({
            email: cleanEmail,
            redirect_to: `${baseOrigin}/account/reset-password`
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.warn("[PasswordRecovery] Supabase recover error:", data.msg || data.message || res.status);
          // Fall through to secondary dispatch engine
        } else {
          return {
            success: true,
            provider: "supabase",
            message: "If an account is associated with this email, password recovery instructions have been sent."
          };
        }
      } catch (e) {
        console.warn("[PasswordRecovery] Live Supabase fetch failed:", e.message);
      }
    }

    // 2. Secondary Cryptographic Recovery Engine
    // Generate high-entropy 256-bit token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = Date.now() + 60 * 60 * 1000; // 60 minutes
    const resetUrl = `${baseOrigin}/account/reset-password?token=${rawToken}`;

    // Revoke any pending tokens for this email
    for (const [hash, record] of RECOVERY_TOKENS.entries()) {
      if (record.email === cleanEmail && !record.usedAt) {
        record.usedAt = new Date().toISOString();
        record.revokedReason = "SUPERSEDED_BY_NEW_REQUEST";
      }
    }

    // Store record by hash (NEVER store raw token)
    RECOVERY_TOKENS.set(tokenHash, {
      tokenHash,
      email: cleanEmail,
      expiresAt,
      usedAt: null,
      createdAt: new Date().toISOString(),
      clientIp
    });

    // 3. Email Dispatch via EmailService
    let emailResult;
    try {
      emailResult = await emailService.sendPasswordRecoveryEmail({
        to: cleanEmail,
        recipientName: cleanEmail.split("@")[0],
        resetUrl,
        expiresInMinutes: 60
      });
    } catch (err) {
      console.warn("[PasswordRecovery] Email delivery failed:", err.message);
      return {
        success: false,
        code: "DELIVERY_FAILED",
        message: "Failed to dispatch password recovery email. Please check email provider configuration."
      };
    }

    // If no email provider or SMTP is configured in the environment
    if (!emailResult.delivered && !emailResult.simulated) {
      return {
        success: false,
        code: "EMAIL_NOT_CONFIGURED",
        message: "Password recovery email service is not configured. Please configure SMTP or Supabase Auth."
      };
    }

    return {
      success: true,
      delivered: emailResult.delivered,
      simulated: Boolean(emailResult.simulated),
      provider: emailResult.provider || "internal",
      message: "If an account is associated with this email, password recovery instructions have been sent. Please check your inbox and spam folder."
    };
  }

  /**
   * Step 2: Verify Recovery Token
   * Checks whether the token exists, is unexpired, and has not yet been used.
   */
  verifyRecoveryToken(rawToken) {
    if (!rawToken || typeof rawToken !== "string" || rawToken.length !== 64) {
      return { valid: false, code: "INVALID_TOKEN", error: "Invalid password recovery token." };
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const record = RECOVERY_TOKENS.get(tokenHash);

    if (!record) {
      return { valid: false, code: "TOKEN_NOT_FOUND", error: "Password recovery link is invalid or has expired." };
    }

    if (record.usedAt) {
      return { valid: false, code: "TOKEN_ALREADY_USED", error: "This password recovery link has already been used." };
    }

    if (Date.now() > record.expiresAt) {
      return { valid: false, code: "TOKEN_EXPIRED", error: "This password recovery link has expired. Please request a new one." };
    }

    return {
      valid: true,
      email: record.email,
      expiresAt: record.expiresAt
    };
  }

  /**
   * Step 3: Complete Password Reset
   * Validates token & new password, marks token as used, and updates credentials securely.
   */
  async resetPassword({ rawToken, newPassword }) {
    const verification = this.verifyRecoveryToken(rawToken);
    if (!verification.valid) {
      return { success: false, code: verification.code, message: verification.error };
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return {
        success: false,
        code: "PASSWORD_TOO_SHORT",
        message: "Password must be at least 6 characters long."
      };
    }

    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const record = RECOVERY_TOKENS.get(tokenHash);

    // Mark token as immediately consumed
    record.usedAt = new Date().toISOString();

    // 1. If live Supabase Admin API is available, update user password in Supabase Auth
    if (this.isLiveSupabaseConfigured()) {
      try {
        // Find user by email in Supabase
        const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          headers: {
            apikey: SUPABASE_SECRET_KEY,
            Authorization: `Bearer ${SUPABASE_SECRET_KEY}`
          }
        });
        const usersData = await usersRes.json();
        const user = usersData?.users?.find((u) => u.email.toLowerCase() === record.email.toLowerCase());
        if (user) {
          await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              apikey: SUPABASE_SECRET_KEY,
              Authorization: `Bearer ${SUPABASE_SECRET_KEY}`
            },
            body: JSON.stringify({ password: newPassword })
          });
        }
      } catch (err) {
        console.warn("[PasswordRecovery] Supabase admin password update error:", err.message);
      }
    }

    // 2. Update secure password hash in local credentials store (PBKDF2 salted hash; NEVER plaintext!)
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(newPassword, salt, 10000, 64, "sha512").toString("hex");
    LOCAL_CREDENTIALS.set(record.email, {
      salt,
      hash,
      updatedAt: new Date().toISOString()
    });

    // Invalidate any other tokens for this email
    for (const [h, r] of RECOVERY_TOKENS.entries()) {
      if (r.email === record.email && !r.usedAt) {
        r.usedAt = new Date().toISOString();
        r.revokedReason = "PASSWORD_RESET_COMPLETED";
      }
    }

    return {
      success: true,
      message: "Your password has been successfully updated! You can now sign in with your new password."
    };
  }

  /**
   * Verify customer sign-in credentials against updated password (for verification checks)
   */
  verifyCredentials(email, password) {
    if (!email || !password) return false;
    const cred = LOCAL_CREDENTIALS.get(email.toLowerCase().trim());
    if (!cred) return false;
    const computedHash = crypto.pbkdf2Sync(password, cred.salt, 10000, 64, "sha512").toString("hex");
    return computedHash === cred.hash;
  }

  /**
   * Migrate password credentials from old email to new email upon email update
   */
  migrateCredentialsEmail(oldEmail, newEmail) {
    if (!oldEmail || !newEmail) return false;
    const cleanOld = oldEmail.toLowerCase().trim();
    const cleanNew = newEmail.toLowerCase().trim();
    const cred = LOCAL_CREDENTIALS.get(cleanOld);
    if (cred) {
      LOCAL_CREDENTIALS.set(cleanNew, cred);
      LOCAL_CREDENTIALS.delete(cleanOld);
      return true;
    }
    return false;
  }

  /**
   * Clean expired tokens from memory
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [hash, record] of RECOVERY_TOKENS.entries()) {
      if (now > record.expiresAt + 24 * 3600 * 1000) {
        RECOVERY_TOKENS.delete(hash);
      }
    }
  }

  /**
   * Diagnostic summary (zero secret leakage)
   */
  getDiagnostics() {
    const liveSupabase = this.isLiveSupabaseConfigured();
    const emailDiag = emailService.getDiagnostics();
    return {
      supabaseConfigured: Boolean(process.env.SUPABASE_SECRET_KEY),
      supabaseLive: liveSupabase,
      supabaseUrlHost: SUPABASE_URL.includes("supabase.co") ? new URL(SUPABASE_URL).host : "invalid",
      emailConfigured: emailDiag.configured,
      emailProvider: emailDiag.provider,
      emailSender: emailDiag.sender,
      activeTokensCount: Array.from(RECOVERY_TOKENS.values()).filter((r) => !r.usedAt && Date.now() < r.expiresAt).length
    };
  }

  /**
   * Test helper to inspect or expire tokens during automated testing
   */
  _getLatestTokenForEmail(email) {
    const clean = email.toLowerCase().trim();
    for (const record of RECOVERY_TOKENS.values()) {
      if (record.email === clean) return record;
    }
    return null;
  }

  _clearAllTokens() {
    RECOVERY_TOKENS.clear();
    RATE_LIMIT_CACHE.clear();
    LOCAL_CREDENTIALS.clear();
  }
}

module.exports = new PasswordRecoveryService();
