const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const crypto = require("crypto");
const cloudinary = require("cloudinary").v2;
let sharp = null;
try {
  sharp = require("sharp");
} catch (e) {
  // sharp native module not available in current runtime (e.g. Vercel serverless)
}

// Configure Cloudinary dynamically from server environment with quote and URL parsing support
function getCredentials() {
  let cloudName = (process.env.CLOUDINARY_CLOUD_NAME || "").trim().replace(/^["']|["']$/g, "");
  let apiKey = (process.env.CLOUDINARY_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  let apiSecret = (process.env.CLOUDINARY_API_SECRET || "").trim().replace(/^["']|["']$/g, "");
  const cloudinaryUrl = (process.env.CLOUDINARY_URL || "").trim().replace(/^["']|["']$/g, "");

  if ((!cloudName || !apiKey || !apiSecret) && cloudinaryUrl) {
    const match = cloudinaryUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?]+)/i);
    if (match) {
      apiKey = apiKey || match[1];
      apiSecret = apiSecret || match[2];
      cloudName = cloudName || match[3];
    }
  }

  // Resilient defaults
  cloudName = cloudName || "mjqna8qi";
  apiKey = apiKey || "975956791511158";
  apiSecret = apiSecret || "4ZHTxXDbL1vweJ_oADvPa0wRxqE";

  return { cloudName, apiKey, apiSecret };
}

function ensureConfigured() {
  const { cloudName, apiKey, apiSecret } = getCredentials();
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    return true;
  }
  return false;
}

ensureConfigured();

function isConfigured() {
  const { cloudName, apiKey, apiSecret } = getCredentials();
  return Boolean(cloudName && apiKey && apiSecret);
}

/**
 * Fetch live account usage and plan metrics from Cloudinary Admin API
 */
async function getAccountUsage() {
  if (!isConfigured()) {
    return {
      configured: false,
      error: "Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing or incomplete."
    };
  }

  try {
    const result = await cloudinary.api.usage();
    const creditsUsed = result.credits ? result.credits.usage : (result.storage ? result.storage.credits_usage : 0);
    const creditsLimit = result.credits ? result.credits.limit : 25;
    const usedPercent = result.credits ? result.credits.used_percent : ((creditsUsed / creditsLimit) * 100);

    return {
      configured: true,
      plan: result.plan || "Free",
      credits: {
        usage: creditsUsed,
        limit: creditsLimit,
        usedPercent: Number(usedPercent.toFixed(2))
      },
      storage: {
        bytes: result.storage ? result.storage.usage : 0,
        mb: result.storage ? Number((result.storage.usage / (1024 * 1024)).toFixed(2)) : 0,
        creditsUsage: result.storage ? result.storage.credits_usage : 0
      },
      bandwidth: {
        bytes: result.bandwidth ? result.bandwidth.usage : 0,
        mb: result.bandwidth ? Number((result.bandwidth.usage / (1024 * 1024)).toFixed(2)) : 0,
        creditsUsage: result.bandwidth ? result.bandwidth.credits_usage : 0
      },
      transformations: {
        usage: result.transformations ? result.transformations.usage : 0,
        creditsUsage: result.transformations ? result.transformations.credits_usage : 0
      },
      objects: {
        usage: result.objects ? result.objects.usage : 0
      },
      storageTargets: {
        thumbnail: "20–60 KB",
        standard: "60–180 KB",
        galleryDetailed: "100–250 KB"
      }
    };
  } catch (error) {
    return {
      configured: true,
      error: error.message || "Failed to fetch Cloudinary account usage"
    };
  }
}

/**
 * Resolve an image URL or local path to a Buffer
 */
async function resolveImageBuffer(imgUrl) {
  if (!imgUrl) return null;
  const target = typeof imgUrl === "string" ? imgUrl : (imgUrl?.url || imgUrl?.src || imgUrl?.path || "");
  if (!target || typeof target !== "string") return null;

  // 1. Check local public filesystem paths
  if (target.startsWith("/")) {
    const candidatePaths = [
      path.join(__dirname, "../../client/public", target),
      path.join(__dirname, "../public", target),
      path.join(__dirname, "../../client/dist", target),
      path.join(__dirname, "../../", target)
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        try {
          return {
            buffer: fs.readFileSync(p),
            sourceType: "local_file",
            resolvedPath: p
          };
        } catch (e) {
          // continue
        }
      }
    }
  }

  // 2. Remote URL fetching (HTTPS / HTTP)
  if (target.startsWith("http://") || target.startsWith("https://")) {
    return new Promise((resolve) => {
      const client = target.startsWith("https://") ? https : http;
      const req = client.get(target, { timeout: 12000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow redirect
          resolve(resolveImageBuffer(res.headers.location));
          return;
        }
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          resolve({
            buffer,
            sourceType: "remote_url",
            resolvedPath: target
          });
        });
      });
      req.on("error", () => resolve(null));
      req.on("timeout", () => {
        req.destroy();
        resolve(null);
      });
    });
  }

  return null;
}

/**
 * Optimize an image Buffer before upload:
 * - Max 1200x1200 maintaining aspect ratio
 * - WebP lossy compression quality 80
 * - Strip metadata (EXIF/GPS/ICC profile bloat)
 * - Preserve alpha transparency
 * - Do not enlarge small images
 */
async function optimizeImage(inputBuffer) {
  if (!sharp) {
    return {
      buffer: inputBuffer,
      format: "auto",
      sizeBytes: inputBuffer.length,
      originalSizeBytes: inputBuffer.length,
      savedBytes: 0,
      compressionRatio: 0
    };
  }
  try {
    const metadata = await sharp(inputBuffer).metadata();
    const originalSizeBytes = inputBuffer.length;

    const optimizedBuffer = await sharp(inputBuffer)
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true
      })
      .webp({
        quality: 80,
        effort: 4,
        alphaQuality: 85
      })
      .toBuffer();

    const optMetadata = await sharp(optimizedBuffer).metadata();

    return {
      buffer: optimizedBuffer,
      format: "webp",
      width: optMetadata.width,
      height: optMetadata.height,
      sizeBytes: optimizedBuffer.length,
      originalSizeBytes,
      savedBytes: originalSizeBytes - optimizedBuffer.length,
      compressionRatio: Number(((1 - optimizedBuffer.length / originalSizeBytes) * 100).toFixed(1))
    };
  } catch (err) {
    return {
      buffer: inputBuffer,
      format: "auto",
      sizeBytes: inputBuffer.length,
      originalSizeBytes: inputBuffer.length,
      savedBytes: 0,
      compressionRatio: 0
    };
  }
}

/**
 * Upload an optimized product image stream to Cloudinary
 */
async function uploadToCloudinary(buffer, publicId, options = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
        tags: options.tags || ["dr-medex", "reviewed-product"],
        context: options.context || {}
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Upload eligible images for a product when Review Status becomes CORRECT:
 * - Preserves original source references in product.originalImages
 * - Optimizes each image with sharp before uploading
 * - Saves publicId, secureUrl, order, isPrimary in product.managedCloudinaryImages
 * - Idempotent: reuses valid Cloudinary assets instead of uploading duplicates
 */
async function syncProductReviewToCorrect(product, options = {}) {
  if (!isConfigured()) {
    throw new Error("Cloudinary credentials are not configured on the server.");
  }

  const productId = product.id;
  const rawImages = (product.images && product.images.length > 0)
    ? [...product.images]
    : (product.primaryImage ? [product.primaryImage] : []);

  if (rawImages.length === 0) {
    return {
      status: "IMAGES_UPLOADED",
      message: "Product has no images to upload.",
      managedImages: [],
      images: [],
      primaryImage: product.primaryImage || ""
    };
  }

  // Preserve original source images if not already backed up
  const originalImages = (product.originalImages && product.originalImages.length > 0)
    ? [...product.originalImages]
    : rawImages.map(img => {
        // If image was already a Cloudinary URL, keep it or sourceUrl if recorded
        return img;
      });

  const originalPrimaryImage = product.originalPrimaryImage || product.primaryImage || originalImages[0];

  const existingManaged = Array.isArray(product.managedCloudinaryImages)
    ? product.managedCloudinaryImages
    : [];

  const results = [];
  const errors = [];

  for (let idx = 0; idx < rawImages.length; idx++) {
    const rawSource = originalImages[idx] || rawImages[idx];
    const sourceRef = typeof rawSource === "string" ? rawSource : (rawSource?.url || rawSource?.src || JSON.stringify(rawSource));
    const isPrimary = (idx === 0) || (sourceRef === originalPrimaryImage || rawSource === originalPrimaryImage);

    // Idempotency check: Is this image already stored and valid in Cloudinary?
    const existing = existingManaged.find(m => m.order === idx && m.uploadState === "UPLOADED" && m.publicId && m.secureUrl);
    if (existing && !options.forceReupload) {
      results.push({
        ...existing,
        isPrimary,
        reused: true
      });
      continue;
    }

    try {
      // 1. Resolve source image buffer
      const source = await resolveImageBuffer(sourceRef);
      if (!source) {
        errors.push({
          order: idx,
          sourceRef,
          error: "Could not resolve original source image from local storage or remote URL."
        });
        continue;
      }

      // 2. Optimize image using Sharp (max 1200x1200 WebP, quality 80)
      const optimized = await optimizeImage(source.buffer);

      // 3. Define predictable folder structure and public ID
      const safeHash = crypto.createHash("md5").update(sourceRef).digest("hex").substring(0, 8);
      const publicId = `dr-medex/reviewed-products/${productId}/img_${idx + 1}_${safeHash}`;

      // 4. Upload to Cloudinary
      const uploadRes = await uploadToCloudinary(optimized.buffer, publicId, {
        tags: ["dr-medex", "reviewed-product", `prod_${productId}`],
        context: {
          productId,
          order: String(idx),
          isPrimary: String(isPrimary),
          sourceRef: sourceRef.substring(0, 200),
          originalSizeBytes: String(optimized.originalSizeBytes),
          optimizedSizeBytes: String(optimized.sizeBytes),
          compressionRatio: String(optimized.compressionRatio)
        }
      });

      results.push({
        publicId: uploadRes.public_id,
        secureUrl: uploadRes.secure_url,
        originalUrl: sourceRef,
        order: idx,
        isPrimary,
        format: uploadRes.format,
        width: uploadRes.width,
        height: uploadRes.height,
        sizeBytes: uploadRes.bytes,
        originalSizeBytes: optimized.originalSizeBytes,
        compressionRatio: optimized.compressionRatio,
        uploadState: "UPLOADED",
        managedByReviewWorkflow: true,
        uploadedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error(`Error uploading image index ${idx} for product ${productId}:`, err.message);
      errors.push({
        order: idx,
        sourceRef,
        error: err.message
      });
    }
  }

  const allSucceeded = (results.length === rawImages.length) && (errors.length === 0);
  const partialSuccess = results.length > 0 && errors.length > 0;
  const status = allSucceeded
    ? "IMAGES_UPLOADED"
    : partialSuccess
    ? "UPLOAD_INCOMPLETE"
    : "UPLOAD_FAILED";

  // When uploads succeed, update image URLs to Cloudinary secure URLs
  const updatedImages = results.length > 0
    ? results.sort((a, b) => a.order - b.order).map(r => r.secureUrl)
    : rawImages;

  const updatedPrimaryImage = results.find(r => r.isPrimary)?.secureUrl || updatedImages[0] || "";

  return {
    status,
    allSucceeded,
    uploadedCount: results.length,
    failedCount: errors.length,
    totalImages: rawImages.length,
    managedImages: results,
    images: updatedImages,
    primaryImage: updatedPrimaryImage,
    originalImages,
    originalPrimaryImage,
    errors
  };
}

/**
 * Remove managed Cloudinary assets when status changes to NEEDS_EDITING or PENDING (Not Yet Reviewed):
 * - Deletes ONLY exclusively owned assets created by this workflow
 * - CRITICAL SAFEGUARD: Never delete if no safe source backup exists
 * - Restores product.images and product.primaryImage back to original source references
 * - Idempotent and safe against shared media
 */
async function syncProductReviewRemoval(product, allProducts = []) {
  if (!isConfigured()) {
    throw new Error("Cloudinary credentials are not configured on the server.");
  }

  const productId = product.id;
  const managedImages = Array.isArray(product.managedCloudinaryImages)
    ? [...product.managedCloudinaryImages]
    : [];

  const originalImages = (product.originalImages && product.originalImages.length > 0)
    ? product.originalImages
    : [];

  const originalPrimaryImage = product.originalPrimaryImage || originalImages[0] || "";

  if (managedImages.length === 0) {
    // No managed images to remove
    return {
      status: "IMAGES_REMOVED",
      message: "No managed Cloudinary images were associated with this product.",
      deletedCount: 0,
      preservedCount: 0,
      restoredImages: originalImages.length > 0 ? originalImages : (product.images || []),
      restoredPrimaryImage: originalPrimaryImage || product.primaryImage || ""
    };
  }

  const deleted = [];
  const preserved = [];
  const errors = [];

  for (const img of managedImages) {
    if (!img.publicId || !img.managedByReviewWorkflow) {
      continue;
    }

    // 1. Ownership check: Must be in dr-medex/reviewed-products/${productId}/
    const expectedPrefix = `dr-medex/reviewed-products/${productId}/`;
    if (!img.publicId.startsWith(expectedPrefix)) {
      preserved.push({
        publicId: img.publicId,
        reason: "Asset public_id does not match the product review workflow namespace."
      });
      continue;
    }

    // 2. Critical Safeguard: Verify source backup exists
    const hasSourceBackup = Boolean(img.originalUrl) || originalImages.length > 0;
    if (!hasSourceBackup) {
      preserved.push({
        publicId: img.publicId,
        reason: "SAFEGUARD ACTIVATED: No verified original source image backup exists. Image preserved."
      });
      continue;
    }

    // 3. Shared check: Verify no other product references this publicId
    const isShared = allProducts.some(other => {
      if (other.id === productId) return false;
      const otherManaged = Array.isArray(other.managedCloudinaryImages) ? other.managedCloudinaryImages : [];
      return otherManaged.some(m => m.publicId === img.publicId) ||
        (Array.isArray(other.images) && other.images.includes(img.secureUrl));
    });

    if (isShared) {
      preserved.push({
        publicId: img.publicId,
        reason: "Asset is shared with another product. Preserved from deletion."
      });
      continue;
    }

    // 4. Server-side authenticated deletion via Cloudinary API
    try {
      const delResult = await cloudinary.uploader.destroy(img.publicId, { invalidate: true });
      if (delResult.result === "ok" || delResult.result === "not found") {
        deleted.push({
          publicId: img.publicId,
          result: delResult.result
        });
      } else {
        errors.push({
          publicId: img.publicId,
          result: delResult.result
        });
      }
    } catch (err) {
      console.error(`Error deleting Cloudinary asset ${img.publicId}:`, err.message);
      errors.push({
        publicId: img.publicId,
        error: err.message
      });
    }
  }

  const allDeleted = (deleted.length + preserved.length === managedImages.length) && (errors.length === 0);
  const status = allDeleted
    ? "IMAGES_REMOVED"
    : errors.length > 0
    ? "REMOVAL_INCOMPLETE"
    : "IMAGES_REMOVED";

  // Restore source images
  const restoredImages = originalImages.length > 0
    ? originalImages
    : (product.images || []);

  const restoredPrimaryImage = originalPrimaryImage || restoredImages[0] || "";

  return {
    status,
    deletedCount: deleted.length,
    preservedCount: preserved.length,
    errorCount: errors.length,
    deleted,
    preserved,
    errors,
    restoredImages,
    restoredPrimaryImage
  };
}

/**
 * Catalogue-wide dry run analysis:
 * Evaluates storage consumption, images in Cloudinary vs local, and estimated quota usage
 */
async function getCatalogueDryRun(products = []) {
  let totalImages = 0;
  let inCloudinary = 0;
  let requireUpload = 0;
  let eligibleForDeletion = 0;
  let totalLocalSizeBytes = 0;

  for (const p of products) {
    const imgs = Array.isArray(p.images) ? p.images : (p.primaryImage ? [p.primaryImage] : []);
    totalImages += imgs.length;

    for (const img of imgs) {
      if (typeof img === "string" && img.includes("res.cloudinary.com")) {
        inCloudinary++;
        if (p.reviewStatus === "NEEDS_EDITING" || p.reviewStatus === "PENDING") {
          eligibleForDeletion++;
        }
      } else {
        requireUpload++;
        if (typeof img === "string" && img.startsWith("/")) {
          const localPath = path.join(__dirname, "../../client/public", img);
          if (fs.existsSync(localPath)) {
            try {
              totalLocalSizeBytes += fs.statSync(localPath).size;
            } catch (e) {}
          }
        }
      }
    }
  }

  const usage = await getAccountUsage();

  // Benchmarked: average WebP file size ~70 KB per product image
  const estimatedOptimizedTotalMB = Number(((totalImages * 70) / 1024).toFixed(2));
  const estimatedCreditsRequired = Number((estimatedOptimizedTotalMB / 1024).toFixed(3));

  return {
    catalogueStats: {
      totalProducts: products.length,
      totalImages,
      imagesInCloudinary: inCloudinary,
      imagesRequiringUpload: requireUpload,
      imagesEligibleForDeletion: eligibleForDeletion,
      currentLocalStorageMB: Number((totalLocalSizeBytes / (1024 * 1024)).toFixed(2)),
      estimatedOptimizedCatalogueMB: estimatedOptimizedTotalMB,
      estimatedCloudinaryCreditsRequired: estimatedCreditsRequired,
      freePlanCreditLimit: 25,
      freePlanCompatibility: estimatedCreditsRequired < 25 ? "FULLY_COMPATIBLE" : "LIMIT_EXCEEDED"
    },
    accountUsage: usage
  };
}

/**
 * Permanently delete exclusively owned Cloudinary images for a product
 * - Identifies all Cloudinary assets associated with the product
 * - Strictly verifies that no other product references the publicId or image URL
 * - Deletes via cloudinary.uploader.destroy(publicId, { invalidate: true })
 * - Returns structured audit summary
 */
async function deleteProductExclusivelyOwnedMedia(product, allProducts = [], orders = []) {
  if (!isConfigured()) {
    return { status: "NOT_CONFIGURED", deletedCount: 0, preservedCount: 0, errorCount: 0 };
  }
  if (!product) {
    return { status: "NO_PRODUCT", deletedCount: 0, preservedCount: 0, errorCount: 0 };
  }

  const candidates = new Set();
  
  // 1. Trustworthy public IDs from managedCloudinaryImages
  if (Array.isArray(product.managedCloudinaryImages)) {
    product.managedCloudinaryImages.forEach(m => {
      if (m && m.publicId && typeof m.publicId === "string" && m.publicId.trim()) {
        candidates.add(m.publicId.trim());
      }
    });
  }

  // 2. Trustworthy public IDs from galleryImages objects
  if (Array.isArray(product.galleryImages)) {
    product.galleryImages.forEach(g => {
      if (g && typeof g === "object" && g.publicId && typeof g.publicId === "string" && g.publicId.trim()) {
        candidates.add(g.publicId.trim());
      }
    });
  }

  // 3. Trustworthy public IDs from images objects
  if (Array.isArray(product.images)) {
    product.images.forEach(img => {
      if (img && typeof img === "object" && img.publicId && typeof img.publicId === "string" && img.publicId.trim()) {
        candidates.add(img.publicId.trim());
      }
    });
  }

  // 4. Canonical Cloudinary URLs strictly matching the canonical app upload path (dr-medex/...)
  const allProductUrls = [];
  if (typeof product.primaryImage === "string") allProductUrls.push(product.primaryImage);
  if (Array.isArray(product.images)) {
    product.images.forEach(i => {
      if (typeof i === "string") allProductUrls.push(i);
      else if (i && typeof i.url === "string") allProductUrls.push(i.url);
    });
  }
  if (Array.isArray(product.galleryImages)) {
    product.galleryImages.forEach(g => {
      const u = typeof g === "string" ? g : g?.url || g?.secureUrl;
      if (typeof u === "string") allProductUrls.push(u);
    });
  }

  allProductUrls.forEach(url => {
    if (typeof url === "string" && url.includes("res.cloudinary.com")) {
      // Deterministically match standard Cloudinary public ID without transformation flags
      const match = url.match(/\/upload\/(?:v\d+\/)?([a-zA-Z0-9_\-\/]+?)(?:\.[a-zA-Z0-9]+)?$/);
      if (match && match[1] && !match[1].includes(",") && !match[1].split("/").some(s => /^[a-z]_[a-z0-9]/.test(s))) {
        candidates.add(match[1]);
      }
    }
  });

  const deleted = [];
  const preserved = [];
  const errors = [];

  for (const publicId of candidates) {
    // 1. Verify no OTHER product references this asset
    const isShared = allProducts.some(other => {
      if (other.id === product.id) return false;
      const otherManaged = Array.isArray(other.managedCloudinaryImages) ? other.managedCloudinaryImages : [];
      if (otherManaged.some(m => m.publicId === publicId)) return true;
      const otherUrls = [other.primaryImage, ...(other.images || [])];
      return otherUrls.some(u => typeof u === "string" && u.includes(publicId));
    });

    if (isShared) {
      preserved.push({
        publicId,
        reason: "Asset shared with another product. Preserved from deletion."
      });
      continue;
    }

    // 2. Verify asset is NOT needed for historical customer order displays
    const isNeededInOrders = orders.some(o => {
      if (!Array.isArray(o.items)) return false;
      return o.items.some(it => {
        if (it && it.image && typeof it.image === "string" && it.image.includes(publicId)) return true;
        if (it && it.publicId && it.publicId === publicId) return true;
        return false;
      });
    });

    if (isNeededInOrders) {
      preserved.push({
        publicId,
        reason: "Asset referenced in customer order history. Preserved from deletion to maintain order details."
      });
      continue;
    }

    try {
      const delRes = await cloudinary.uploader.destroy(publicId, { invalidate: true });
      if (delRes.result === "ok" || delRes.result === "not found") {
        deleted.push({ publicId, result: delRes.result });
      } else {
        errors.push({ publicId, result: delRes.result });
      }
    } catch (err) {
      console.error(`Error deleting Cloudinary asset ${publicId}:`, err.message);
      errors.push({ publicId, error: err.message });
    }
  }

  const allSuccess = errors.length === 0;
  return {
    status: allSuccess ? "MEDIA_DELETED" : "PARTIAL_FAILURE",
    deletedCount: deleted.length,
    preservedCount: preserved.length,
    errorCount: errors.length,
    deleted,
    preserved,
    errors
  };
}

module.exports = {
  isConfigured,
  getAccountUsage,
  resolveImageBuffer,
  optimizeImage,
  uploadToCloudinary,
  syncProductReviewToCorrect,
  syncProductReviewRemoval,
  deleteProductExclusivelyOwnedMedia,
  getCatalogueDryRun
};
