const fs = require("fs");
const path = require("path");

const ALLOWED_LOCAL_ROOTS = [
  path.resolve(__dirname, "../../client/public/products-catalog"),
  path.resolve(__dirname, "../public/products-catalog"),
  path.resolve("/tmp/products-catalog")
];

const ALLOWED_REMOTE_HOSTS = new Set([
  "res.cloudinary.com",
  "cloudinary.com",
  "dr-medex.vercel.app",
  "drmedex.vercel.app"
]);

/**
 * Check if a host is an internal/private IP or loopback address (SSRF guard)
 */
function isPrivateHost(hostname) {
  if (!hostname) return true;
  const h = hostname.toLowerCase().trim();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0") return true;
  if (h.startsWith("10.") || h.startsWith("192.168.") || h.startsWith("169.254.")) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(h)) return true;
  if (h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".lan")) return true;
  return false;
}

/**
 * Validate whether a remote URL is safe to retrieve
 */
function isAllowedRemoteUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname.toLowerCase();
    if (isPrivateHost(hostname)) return false;
    if (ALLOWED_REMOTE_HOSTS.has(hostname)) return true;
    if (hostname.endsWith(".cloudinary.com") || hostname.endsWith(".vercel.app")) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Safely resolve a local product image path within allowed public directory boundaries
 */
function resolveLocalImagePath(relativeUrl) {
  if (!relativeUrl || typeof relativeUrl !== "string") return null;
  let cleanRel = relativeUrl.replace(/^\/+/, "");
  if (cleanRel.startsWith("products-catalog/")) {
    cleanRel = cleanRel.replace(/^products-catalog\//, "");
  }

  for (const root of ALLOWED_LOCAL_ROOTS) {
    if (!fs.existsSync(root)) continue;
    const resolved = path.resolve(root, cleanRel);
    // Strict directory containment check
    if (resolved.startsWith(root) && fs.existsSync(resolved)) {
      try {
        const stat = fs.statSync(resolved);
        if (stat.isFile()) return resolved;
      } catch {}
    }
  }

  return null;
}

/**
 * Extract URL string from any supported legacy or modern image item representation
 */
function extractRawUrl(item) {
  if (!item) return "";
  if (typeof item === "string") {
    const s = item.trim();
    if (s.startsWith("data:")) return "";
    return s;
  }
  if (typeof item === "object") {
    const candidate = item.secureUrl || item.secure_url || item.url || item.originalUrl || item.src || "";
    if (typeof candidate === "string") {
      const s = candidate.trim();
      if (s.startsWith("data:")) return "";
      return s;
    }
  }
  return "";
}

/**
 * Normalize and canonicalize image reference
 */
function normalizeImageRef(rawUrl, baseSku, index, isPrimary = false) {
  let url = rawUrl.trim();
  if (url.startsWith("products-catalog/")) {
    url = `/${url}`;
  }

  let source = "remote";
  let localPath = null;

  if (url.startsWith("/products-catalog/")) {
    source = "local";
    localPath = resolveLocalImagePath(url);
  } else if (url.includes("cloudinary.com") || url.includes("res.cloudinary.com")) {
    source = "cloudinary";
  }

  let ext = "jpg";
  const extMatch = url.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)(?:\?.*)?$/i);
  if (extMatch && extMatch[1]) {
    ext = extMatch[1].toLowerCase();
  }

  const safeSku = String(baseSku || "product").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `${safeSku}_photo_${index + 1}.${ext}`;

  return {
    url,
    source,
    localPath,
    filename,
    isPrimary,
    index
  };
}

/**
 * Canonical product image resolver
 * Extracts all legitimate product photos across all historical schemas, formats and arrays
 */
function resolveProductImages(product) {
  if (!product) return [];

  const baseSku = product.sku || product.SKU || product.id || "product";
  const primaryRaw = extractRawUrl(product.primaryImage) || extractRawUrl(product.originalPrimaryImage);

  const rawCandidates = [];
  if (primaryRaw) {
    rawCandidates.push({ raw: primaryRaw, isPrimary: true });
  }

  // 1. Check images array
  if (Array.isArray(product.images)) {
    product.images.forEach(it => {
      const u = extractRawUrl(it);
      if (u) rawCandidates.push({ raw: u, isPrimary: Boolean(it && it.isPrimary) });
    });
  }

  // 2. Check originalImages array
  if (Array.isArray(product.originalImages)) {
    product.originalImages.forEach(it => {
      const u = extractRawUrl(it);
      if (u) rawCandidates.push({ raw: u, isPrimary: false });
    });
  }

  // 3. Check galleryImages array
  if (Array.isArray(product.galleryImages)) {
    product.galleryImages.forEach(it => {
      const u = extractRawUrl(it);
      if (u) rawCandidates.push({ raw: u, isPrimary: Boolean(it && it.isPrimary) });
    });
  }

  // 4. Check managedCloudinaryImages array
  if (Array.isArray(product.managedCloudinaryImages)) {
    product.managedCloudinaryImages.forEach(it => {
      const u = extractRawUrl(it);
      if (u) rawCandidates.push({ raw: u, isPrimary: Boolean(it && it.isPrimary) });
    });
  }

  // Deduplicate preserving order
  const seenUrls = new Set();
  const resolved = [];

  for (const cand of rawCandidates) {
    let norm = cand.raw.trim();
    if (norm.startsWith("products-catalog/")) norm = `/${norm}`;
    if (!seenUrls.has(norm)) {
      seenUrls.add(norm);
      resolved.push(normalizeImageRef(norm, baseSku, resolved.length, cand.isPrimary || (resolved.length === 0)));
    }
  }

  return resolved;
}

module.exports = {
  resolveProductImages,
  resolveLocalImagePath,
  isAllowedRemoteUrl,
  normalizeImageRef
};
