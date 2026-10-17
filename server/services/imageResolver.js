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
 * Safely extract Cloudinary public ID from a remote Cloudinary URL
 */
function extractCloudinaryPublicId(url) {
  if (!url || typeof url !== "string") return null;
  if (!url.includes("cloudinary.com") && !url.includes("res.cloudinary.com")) return null;
  const parts = url.split(/\/upload\/(?:[a-zA-Z0-9_,]+(?:\/)?)*(?:v\d+\/)?/);
  if (parts.length > 1) {
    const afterUpload = parts[1].split("?")[0];
    return afterUpload.replace(/\.[a-zA-Z0-9]+$/, "");
  }
  return null;
}

/**
 * Authoritative canonical product image resolver
 * Resolves the product's single current gallery without unioning historical/deprecated arrays
 */
function resolveProductImages(product) {
  if (!product) return [];

  const baseSku = product.sku || product.SKU || product.id || "product";

  // 1. Establish the single authoritative current gallery array
  let canonicalList = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    canonicalList = product.images;
  } else if (Array.isArray(product.galleryImages) && product.galleryImages.length > 0) {
    canonicalList = product.galleryImages;
  } else if (product.primaryImage) {
    canonicalList = [product.primaryImage];
  }

  // 2. Resolve primary image candidate
  const primaryRaw = extractRawUrl(product.primaryImage) || extractRawUrl(product.originalPrimaryImage);
  let normPrimary = primaryRaw ? primaryRaw.trim() : "";
  if (normPrimary.startsWith("products-catalog/")) normPrimary = `/${normPrimary}`;

  // 3. Deduplicate genuine duplicate URLs preserving order
  const seenUrls = new Set();
  const rawCandidates = [];

  for (const item of canonicalList) {
    const raw = extractRawUrl(item);
    if (!raw) continue;
    let norm = raw.trim();
    if (norm.startsWith("products-catalog/")) norm = `/${norm}`;
    if (!seenUrls.has(norm)) {
      seenUrls.add(norm);
      rawCandidates.push(norm);
    }
  }

  // If primary image exists and is not represented in the list, place it at the front
  if (normPrimary && !seenUrls.has(normPrimary)) {
    rawCandidates.unshift(normPrimary);
    seenUrls.add(normPrimary);
  }

  // 4. Return normalized representations with primary flag
  const resolved = [];
  for (let i = 0; i < rawCandidates.length; i++) {
    const u = rawCandidates[i];
    const isPrimary = normPrimary ? (u === normPrimary) : (i === 0);
    resolved.push(normalizeImageRef(u, baseSku, i, isPrimary));
  }

  if (resolved.length > 0 && !resolved.some(r => r.isPrimary)) {
    resolved[0].isPrimary = true;
  }

  return resolved;
}

module.exports = {
  resolveProductImages,
  resolveLocalImagePath,
  isAllowedRemoteUrl,
  normalizeImageRef,
  extractCloudinaryPublicId
};

