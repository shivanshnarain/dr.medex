/**
 * Cloudinary and product image normalization helpers.
 * Uses only standardized width buckets to avoid redundant transforms and maximize browser HTTP cache reuse.
 */

export function extractImageUrl(item: unknown): string {
  if (!item) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "object" && item !== null) {
    const obj = item as Record<string, unknown>;
    const candidate = obj.secureUrl || obj.secure_url || obj.url || obj.src || "";
    return typeof candidate === "string" ? candidate.trim() : "";
  }
  return "";
}

/**
 * Injects Cloudinary automatic format/quality optimization (and optional bounded width)
 * onto raw res.cloudinary.com `/image/upload/` URLs when no transform segment is present.
 * Leaves already-transformed Cloudinary URLs and non-Cloudinary URLs untouched.
 */
export function optimizeCloudinaryUrl(rawUrl: string, targetWidth?: number): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  const trimmed = rawUrl.trim();
  if (!trimmed || !trimmed.includes("res.cloudinary.com/") || !trimmed.includes("/image/upload/")) {
    return trimmed;
  }

  const [baseAndQuery, hash] = trimmed.split("#");
  const [urlWithoutQuery, query] = baseAndQuery.split("?");
  const marker = "/image/upload/";
  const idx = urlWithoutQuery.indexOf(marker);
  if (idx === -1) return trimmed;

  const prefix = urlWithoutQuery.slice(0, idx + marker.length);
  const rest = urlWithoutQuery.slice(idx + marker.length);
  const firstSegment = rest.split("/")[0] || "";

  // Preserve URLs that already contain Cloudinary transformation directives
  if (firstSegment && !/^v\d+$/.test(firstSegment) && (firstSegment.includes("_") || firstSegment.includes(","))) {
    return trimmed;
  }

  const transforms = targetWidth
    ? `f_auto,q_auto,w_${targetWidth},c_limit`
    : "f_auto,q_auto";

  let result = `${prefix}${transforms}/${rest}`;
  if (query) result += `?${query}`;
  if (hash) result += `#${hash}`;
  return result;
}

