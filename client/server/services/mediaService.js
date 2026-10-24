const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const cloudinaryService = require("./cloudinaryService");

const LOCAL_STORAGE_DIR = path.join(__dirname, "../../client/public/products-catalog");
osEnsureDir(LOCAL_STORAGE_DIR);

function osEnsureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (e) {
    // Safe fallback for read-only serverless environments
  }
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/x-png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
  "image/avif",
  "image/bmp",
  "image/tiff"
]);

/**
 * Detect actual image format and magic signatures directly from raw buffer contents.
 * Prevents disguised non-image files from being accepted while supporting
 * genuine image formats even when the filename has no extension (e.g. C1).
 */
function detectImageFormatFromBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 3) {
    return { detectedMime: null, detectedExt: null, isValid: false };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { detectedMime: "image/jpeg", detectedExt: "jpg", isValid: true };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return { detectedMime: "image/png", detectedExt: "png", isValid: true };
  }

  // 3. WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { detectedMime: "image/webp", detectedExt: "webp", isValid: true };
  }

  // 4. GIF: GIF87a or GIF89a
  if (
    buffer.length >= 6 &&
    (buffer.toString("ascii", 0, 6) === "GIF87a" || buffer.toString("ascii", 0, 6) === "GIF89a")
  ) {
    return { detectedMime: "image/gif", detectedExt: "gif", isValid: true };
  }

  // 5. SVG: check text snippet
  if (buffer.length >= 4) {
    const head = buffer.slice(0, Math.min(buffer.length, 1024)).toString("utf8").trim().toLowerCase();
    if (
      head.startsWith("<svg") ||
      (head.startsWith("<?xml") && head.includes("<svg")) ||
      head.includes("<svg xmlns")
    ) {
      return { detectedMime: "image/svg+xml", detectedExt: "svg", isValid: true };
    }
  }

  // 6. AVIF: offset 4 ftyp, offset 8 avif/avis/heic/mif1
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 4, 8) === "ftyp" &&
    ["avif", "avis", "heic", "mif1"].includes(buffer.toString("ascii", 8, 12).toLowerCase())
  ) {
    return { detectedMime: "image/avif", detectedExt: "avif", isValid: true };
  }

  // 7. BMP: BM (0x42, 0x4D)
  if (buffer.length >= 2 && buffer[0] === 0x42 && buffer[1] === 0x4D) {
    return { detectedMime: "image/bmp", detectedExt: "bmp", isValid: true };
  }

  // 8. TIFF: II*. or MM.*
  if (
    buffer.length >= 4 &&
    ((buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2A && buffer[3] === 0x00) ||
     (buffer[0] === 0x4D && buffer[1] === 0x4D && buffer[2] === 0x00 && buffer[3] === 0x2A))
  ) {
    return { detectedMime: "image/tiff", detectedExt: "tiff", isValid: true };
  }

  return { detectedMime: null, detectedExt: null, isValid: false };
}

function normalizeFilenameAndMime(originalFilename = "image.jpg", rawMime = "image/jpeg", detectedExt = null) {
  let cleanName = String(originalFilename || "image.jpg").trim().replace(/[/\\?%*:|"<>]/g, "");

  // Collapse duplicate extensions e.g. "dr_medex_table_2.jpg.jpeg" -> "dr_medex_table_2.jpg"
  cleanName = cleanName.replace(/(\.(jpe?g|png|webp))+\.(jpe?g|png|webp)$/i, (m, p1, p2, lastExt) => {
    const normExt = lastExt.toLowerCase() === "jpeg" ? "jpg" : lastExt.toLowerCase();
    return `.${normExt}`;
  });

  const extMatch = cleanName.match(/\.([a-zA-Z0-9]+)$/);
  let ext = extMatch ? extMatch[1].toLowerCase() : (detectedExt || "jpg");
  if (ext === "jpeg") ext = "jpg";

  // If cleanName has NO extension (e.g. "C1", "Product1"), assign the detected extension
  if (!extMatch && (detectedExt || ext)) {
    const safeExt = (detectedExt || ext).replace(/^\./, "");
    cleanName = `${cleanName}.${safeExt}`;
    ext = safeExt;
  }

  let mimeType = (rawMime || "").toLowerCase().trim();
  if (!mimeType || mimeType === "application/octet-stream") {
    if (ext === "png") mimeType = "image/png";
    else if (ext === "webp") mimeType = "image/webp";
    else if (ext === "svg") mimeType = "image/svg+xml";
    else if (ext === "gif") mimeType = "image/gif";
    else if (ext === "avif") mimeType = "image/avif";
    else mimeType = "image/jpeg";
  } else if (mimeType === "image/jpg" || mimeType === "image/pjpeg") {
    mimeType = "image/jpeg";
  } else if (mimeType === "image/x-png") {
    mimeType = "image/png";
  }

  return { cleanName, mimeType, ext };
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

/**
 * Media Provider Interface (Phase 1: Local; Phase 2: Cloudinary plug-in)
 */
class LocalMediaProvider {
  async upload(buffer, filename, mimeType, productId = "general") {
    const prodDir = path.join(LOCAL_STORAGE_DIR, productId.replace(/[^a-zA-Z0-9_-]/g, "_"));
    osEnsureDir(prodDir);

    let ext = path.extname(filename);
    if (!ext || ext.length <= 1) {
      if (mimeType === "image/png") ext = ".png";
      else if (mimeType === "image/webp") ext = ".webp";
      else if (mimeType === "image/gif") ext = ".gif";
      else if (mimeType === "image/svg+xml") ext = ".svg";
      else if (mimeType === "image/avif") ext = ".avif";
      else ext = ".jpg";
    }
    if (ext.toLowerCase() === ".jpeg") ext = ".jpg";
    const safeName = `img_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    const targetPath = path.join(prodDir, safeName);

    try {
      fs.writeFileSync(targetPath, buffer);
    } catch (e) {
      // Handle read-only serverless environment gracefully
      try {
        const tmpDir = path.join("/tmp/products-catalog", productId.replace(/[^a-zA-Z0-9_-]/g, "_"));
        osEnsureDir(tmpDir);
        fs.writeFileSync(path.join(tmpDir, safeName), buffer);
      } catch (err2) {}
    }

    const publicUrl = `/products-catalog/${productId.replace(/[^a-zA-Z0-9_-]/g, "_")}/${safeName}`;
    return {
      url: publicUrl,
      sourceUrl: "admin-upload",
      sizeBytes: buffer.length,
      storageProvider: "local"
    };
  }

  async delete(publicUrl) {
    if (!publicUrl || !publicUrl.startsWith("/products-catalog/")) {
      return false;
    }
    const relativePath = publicUrl.replace("/products-catalog/", "");
    const fullPath = path.join(LOCAL_STORAGE_DIR, relativePath);

    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }
}

// Active provider instance (Local for Phase 1)
const activeProvider = new LocalMediaProvider();

module.exports = {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,

  /**
   * Upload image for a product
   */
  uploadProductImage: async (base64OrBuffer, originalFilename = "image.jpg", mimeType = "image/jpeg", productId = "general", altText = "") => {
    let buffer;
    if (Buffer.isBuffer(base64OrBuffer)) {
      buffer = base64OrBuffer;
    } else if (typeof base64OrBuffer === "string") {
      // Handle data URI or raw base64 safely
      const commaIdx = base64OrBuffer.indexOf(",");
      const base64Data = commaIdx !== -1 && base64OrBuffer.startsWith("data:")
        ? base64OrBuffer.substring(commaIdx + 1)
        : base64OrBuffer;
      buffer = Buffer.from(base64Data.trim(), "base64");
    } else {
      throw new Error("Invalid image data provided");
    }

    if (!buffer || buffer.length === 0) {
      throw new Error("Image data is empty (0 bytes)");
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`Image exceeds maximum allowed size of 15MB (actual: ${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    }

    // Inspect actual file content magic bytes to detect real image format
    const formatInfo = detectImageFormatFromBuffer(buffer);
    if (!formatInfo.isValid) {
      throw new Error("File content is not a supported image format. Corrupted files or disguised non-image files are rejected.");
    }

    const { cleanName, mimeType: finalMime } = normalizeFilenameAndMime(
      originalFilename,
      formatInfo.detectedMime || mimeType,
      formatInfo.detectedExt
    );

    if (finalMime && !ALLOWED_MIME_TYPES.has(finalMime)) {
      throw new Error(`Unsupported image MIME type: ${finalMime}. Allowed types: JPEG, PNG, WEBP, SVG, GIF, AVIF`);
    }

    let uploadResult;
    if (cloudinaryService && cloudinaryService.isConfigured()) {
      try {
        const safePid = (productId || "general").replace(/[^a-zA-Z0-9_-]/g, "_");
        const publicId = `dr-medex/products/${safePid}/img_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
        const cRes = await cloudinaryService.uploadToCloudinary(buffer, publicId, {
          tags: ["dr-medex", "admin-upload", safePid]
        });
        uploadResult = {
          url: cRes.secure_url || cRes.url,
          sourceUrl: "admin-upload",
          sizeBytes: buffer.length,
          storageProvider: "cloudinary",
          publicId: cRes.public_id
        };
      } catch (cErr) {
        console.warn("[MediaService] Cloudinary upload failed:", cErr.message);
        if (process.env.VERCEL) {
          throw new Error(`Cloudinary upload failed: ${cErr.message}`);
        }
        uploadResult = await activeProvider.upload(buffer, cleanName, finalMime, productId);
      }
    } else {
      if (process.env.VERCEL) {
        throw new Error("Cloudinary storage is not configured in this serverless environment.");
      }
      uploadResult = await activeProvider.upload(buffer, cleanName, finalMime, productId);
    }

    return {
      id: `img-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      url: uploadResult.url,
      altText: altText || cleanName,
      sourceUrl: uploadResult.sourceUrl,
      isPrimary: false,
      importedAt: new Date().toISOString(),
      sizeBytes: uploadResult.sizeBytes,
      storageProvider: uploadResult.storageProvider,
      publicId: uploadResult.publicId || null,
      status: "READY"
    };
  },


  /**
   * Delete image file from storage
   */
  deleteProductImage: async (publicUrl) => {
    return await activeProvider.delete(publicUrl);
  },

  uploadImage: async (base64OrBuffer, opts = {}) => {
    const filename = typeof opts === "string" ? opts : (opts.originalFilename || "image.png");
    const mime = (typeof opts === "object" && opts.mimeType) || "image/png";
    const pid = (typeof opts === "object" && opts.productId) || "general";
    const alt = (typeof opts === "object" && opts.altText) || filename;
    return await module.exports.uploadProductImage(base64OrBuffer, filename, mime, pid, alt);
  },

  normalizeFilenameAndMime,
  detectImageFormatFromBuffer
};
