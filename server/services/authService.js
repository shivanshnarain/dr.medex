const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

// Load .env if present
require("dotenv").config();

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
    // Reload env to ensure fresh values
    require("dotenv").config();

    const cleanEmail = (email || "").toLowerCase().trim();
    const cleanPass = password || "";
    const key = `${cleanEmail}_${ip}`;
    const attemptRecord = loginAttempts.get(key) || { attempts: 0, lockedUntil: 0 };

    const targetEmail = (process.env.ADMIN_EMAIL || "roshan.official0009@gmail.com").toLowerCase().trim();
    const currentSalt = process.env.ADMIN_PASSWORD_SALT || "fab0708d13f9adebbfb634773a90fd90";
    const currentHash = process.env.ADMIN_PASSWORD_HASH || "356b38dc8851f031184bf00b980031ee13e9bfab3cfd377a20dd3d221b5b4ca47938341d56807c5ddfc5060f4489c6fd1c45f99645d08a8810b05b2e3d6c2204";

    let isValid = false;
    let adminName = "DR.MEDEX Super Admin";

    // 1. Primary credential: Roshan.official0009@gmail.com / Roshan1998@@
    if (cleanEmail === "roshan.official0009@gmail.com") {
      if (cleanPass === "Roshan1998@@" || verifyPassword(cleanPass, currentSalt, currentHash)) {
        isValid = true;
        adminName = "Roshan (DR.MEDEX Super Admin)";
      }
    }

    // 2. Check from configured environment
    if (!isValid && cleanEmail === targetEmail) {
      if (verifyPassword(cleanPass, currentSalt, currentHash)) {
        isValid = true;
      }
    }

    // 3. Fallback master admin
    if (!isValid && cleanEmail === "admin@drmedex.com") {
      if (cleanPass === "DrMedex@2026!Global" || cleanPass === "Roshan1998@@") {
        isValid = true;
      }
    }

    // Check lockout ONLY if credentials are not valid
    if (!isValid && Date.now() < attemptRecord.lockedUntil) {
      const waitMin = Math.ceil((attemptRecord.lockedUntil - Date.now()) / 60000);
      return {
        success: false,
        status: 429,
        message: `Too many failed login attempts. Account temporarily locked for ${waitMin} minutes for security.`
      };
    }

    if (!isValid) {
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
      email: cleanEmail,
      name: adminName,
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
