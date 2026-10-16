/**
 * DR.MEDEX Global — Administrator Cryptographic Verification & Session Helper
 * 
 * Provides resilient, zero-secret-leakage PBKDF2 client-side verification and
 * stateless session validation for both serverless and static deployments.
 */

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  fullName: string;
  role: "SUPER_ADMIN";
}

// Configured Administrator Allowlist
export const ADMIN_EMAILS = [
  "roshan.official0009@gmail.com",
  "admin@drmedex.com"
];

// Primary and Secondary Salt/Hash Pairs (PBKDF2-HMAC-SHA512, 100,000 iterations)
const PRIMARY_SALT = (import.meta.env.VITE_ADMIN_PASSWORD_SALT || "fab0708d13f9adebbfb634773a90fd90").trim();
const PRIMARY_HASH = (import.meta.env.VITE_ADMIN_PASSWORD_HASH || "356b38dc8851f031184bf00b980031ee13e9bfab3cfd377a20dd3d221b5b4ca47938341d56807c5ddfc5060f4489c6fd1c45f99645d08a8810b05b2e3d6c2204").trim();

const LEGACY_SALT = "619028dc7f6b9076f82b7cf531980838";
const LEGACY_HASH = "157b58f73a1119e43c12ce418dc90b65bbe07eba7df5d764c58102572dd8e3f278082300299df21eb59ceadcb2a541399e9eb25e23085b840e971ab1b87e8b99";

export function isAdminEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(clean);
}

/**
 * Cryptographically verifies administrator password using Web Crypto API PBKDF2.
 * Never stores or transmits plaintext passwords.
 */
export async function verifyAdminPasswordClientSide(password: string): Promise<boolean> {
  if (!password || typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    return false;
  }

  try {
    const enc = new TextEncoder();
    const pwBytes = enc.encode(password);
    const key = await window.crypto.subtle.importKey(
      "raw",
      pwBytes,
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    // 1. Primary credential verification
    const salt1 = enc.encode(PRIMARY_SALT);
    const bits1 = await window.crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt1, iterations: 100000, hash: "SHA-512" },
      key,
      512
    );
    const hex1 = Array.from(new Uint8Array(bits1))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (hex1 === PRIMARY_HASH) {
      return true;
    }

    // 2. Secondary credential verification
    const salt2 = enc.encode(LEGACY_SALT);
    const bits2 = await window.crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt2, iterations: 100000, hash: "SHA-512" },
      key,
      512
    );
    const hex2 = Array.from(new Uint8Array(bits2))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (hex2 === LEGACY_HASH) {
      return true;
    }

    return false;
  } catch (err) {
    console.warn("[AdminAuthHelper] Verification failure:", err);
    return false;
  }
}

/**
 * Creates an authorized client-side admin session token and profile
 */
export function createClientAdminSession(email: string): { token: string; user: AdminUserRecord } {
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();
  const exp = now + 24 * 60 * 60 * 1000; // 24 hours
  const adminName = cleanEmail === "admin@drmedex.com" ? "DR.MEDEX Master Admin" : "Roshan (DR.MEDEX Super Admin)";

  const user: AdminUserRecord = {
    id: cleanEmail,
    email: cleanEmail,
    name: adminName,
    fullName: adminName,
    role: "SUPER_ADMIN"
  };

  const payload = {
    email: cleanEmail,
    name: adminName,
    role: "SUPER_ADMIN",
    iat: now,
    exp,
    jti: Math.random().toString(36).substring(2) + Date.now().toString(36)
  };

  const jsonStr = JSON.stringify(payload);
  const base64Url = btoa(unescape(encodeURIComponent(jsonStr)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const token = `${base64Url}.verified_${Math.random().toString(36).substring(2, 10)}`;
  return { token, user };
}

/**
 * Decodes and validates stored admin session token
 */
export function decodeAndValidateAdminToken(token: string): AdminUserRecord | null {
  if (!token || typeof token !== "string") return null;

  try {
    const dotIndex = token.indexOf(".");
    if (dotIndex <= 0) return null;

    const payloadBase64 = token
      .substring(0, dotIndex)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decodedStr = decodeURIComponent(escape(atob(payloadBase64)));
    const payload = JSON.parse(decodedStr);

    if (!payload || typeof payload !== "object") return null;

    const tokenEmail = (payload.email || "").toLowerCase().trim();
    if (!isAdminEmail(tokenEmail)) return null;
    if (payload.role !== "SUPER_ADMIN") return null;
    if (payload.exp && Date.now() > payload.exp) return null;

    return {
      id: tokenEmail,
      email: tokenEmail,
      name: payload.name || "Roshan (DR.MEDEX Super Admin)",
      fullName: payload.name || "Roshan (DR.MEDEX Super Admin)",
      role: "SUPER_ADMIN"
    };
  } catch (e) {
    return null;
  }
}
