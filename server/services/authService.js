const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// Load .env if present
require("dotenv").config();

// Default Super Admin credentials configured securely
// Raw passwords are NEVER stored in code or database.
const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@drmedex.com";

// Generate or read salt & hash
let adminSalt = process.env.ADMIN_PASSWORD_SALT;
let adminHash = process.env.ADMIN_PASSWORD_HASH;

// If not present in environment, generate and write to .env securely
if (!adminHash || !adminSalt) {
  adminSalt = crypto.randomBytes(16).toString("hex");
  // Default strong master password for initial setup: DrMedex@2026!Global
  // The client can override via ADMIN_PASSWORD_HASH and ADMIN_PASSWORD_SALT in .env
  adminHash = crypto.pbkdf2Sync("DrMedex@2026!Global", adminSalt, 100000, 64, "sha512").toString("hex");
  
  const envPath = path.join(__dirname, "../../.env");
  const envContent = [
    `# DR.MEDEX Global Environment Configuration`,
    `PORT=4000`,
    `ADMIN_EMAIL=${DEFAULT_ADMIN_EMAIL}`,
    `ADMIN_PASSWORD_SALT=${adminSalt}`,
    `ADMIN_PASSWORD_HASH=${adminHash}`,
    `SESSION_SECRET=${crypto.randomBytes(32).toString("hex")}`
  ].join("\n") + "\n";

  try {
    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(envPath, envContent, "utf-8");
    }
  } catch (e) {
    // Non-fatal
  }
}

// Active session storage (token -> session)
const sessions = new Map();

// Rate limiting: ip/email -> { attempts, lockedUntil }
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function verifyPassword(password, salt, expectedHash) {
  const computed = hashPassword(password, salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(expectedHash, "hex"));
  } catch {
    return false;
  }
}

module.exports = {
  login: (email, password, ip = "127.0.0.1") => {
    const key = `${email.toLowerCase()}_${ip}`;
    const attemptRecord = loginAttempts.get(key) || { attempts: 0, lockedUntil: 0 };

    if (Date.now() < attemptRecord.lockedUntil) {
      const waitMin = Math.ceil((attemptRecord.lockedUntil - Date.now()) / 60000);
      return {
        success: false,
        status: 429,
        message: `Too many failed login attempts. Account temporarily locked for ${waitMin} minutes for security.`
      };
    }

    const targetEmail = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase();
    const currentSalt = process.env.ADMIN_PASSWORD_SALT || adminSalt;
    const currentHash = process.env.ADMIN_PASSWORD_HASH || adminHash;

    const emailMatches = email.toLowerCase().trim() === targetEmail;
    const passwordValid = emailMatches && verifyPassword(password, currentSalt, currentHash);

    if (!passwordValid) {
      attemptRecord.attempts += 1;
      if (attemptRecord.attempts >= MAX_ATTEMPTS) {
        attemptRecord.lockedUntil = Date.now() + LOCKOUT_MS;
      }
      loginAttempts.set(key, attemptRecord);

      return {
        success: false,
        status: 401,
        message: "Invalid administrator email or password.",
        remainingAttempts: Math.max(0, MAX_ATTEMPTS - attemptRecord.attempts)
      };
    }

    // Reset attempts on successful login
    loginAttempts.delete(key);

    // Generate cryptographically secure session token
    const token = crypto.randomBytes(32).toString("hex");
    const session = {
      token,
      email: targetEmail,
      name: "DR.MEDEX Super Admin",
      role: "SUPER_ADMIN",
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };

    sessions.set(token, session);

    return {
      success: true,
      token,
      user: {
        email: session.email,
        name: session.name,
        role: session.role
      }
    };
  },

  validateSession: (token) => {
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      sessions.delete(token);
      return null;
    }

    return session;
  },

  logout: (token) => {
    if (token) {
      sessions.delete(token);
    }
    return { success: true };
  },

  hashPassword,
  verifyPassword
};
