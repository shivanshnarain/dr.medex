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
  "image/svg+xml"
]);

function normalizeFilenameAndMime(originalFilename = "image.jpg", rawMime = "image/jpeg") {
  let cleanName = String(originalFilename || "image.jpg").trim().replace(/[/\\?%*:|"<>]/g, "");

  // Collapse duplicate extensions e.g. "dr_medex_table_2.jpg.jpeg" -> "dr_medex_table_2.jpg"
  cleanName = cleanName.replace(/(\.(jpe?g|png|webp))+\.(jpe?g|png|webp)$/i, (m, p1, p2, lastExt) => {
    const normExt = lastExt.toLowerCase() === "jpeg" ? "jpg" : lastExt.toLowerCase();
    return `.${normExt}`;
  });

  const extMatch = cleanName.match(/\.([a-zA-Z0-9]+)$/);
  let ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
  if (ext === "jpeg") ext = "jpg";

  let mimeType = (rawMime || "").toLowerCase().trim();
  if (!mimeType || mimeType === "application/octet-stream") {
    if (ext === "png") mimeType = "image/png";
    else if (ext === "webp") mimeType = "image/webp";
    else if (ext === "svg") mimeType = "image/svg+xml";
    else mimeType = "image/jpeg";
  } else if (mimeType === "image/jpg" || mimeType === "image/pjpeg") {
    mimeType = "image/jpeg";
  } else if (mimeType === "image/x-png") {
    mimeType = "image/png";
  }

  return { cleanName, mimeType, ext };
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Media Provider Interface (Phase 1: Local; Phase 2: Cloudinary plug-in)
 */
class LocalMediaProvider {
  async upload(buffer, filename, mimeType, productId = "general") {
    const prodDir = path.join(LOCAL_STORAGE_DIR, productId.replace(/[^a-zA-Z0-9_-]/g, "_"));
    osEnsureDir(prodDir);

    let ext = path.extname(filename) || (mimeType === "image/png" ? ".png" : (mimeType === "image/webp" ? ".webp" : ".jpg"));
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
    const { cleanName, mimeType: finalMime } = normalizeFilenameAndMime(originalFilename, mimeType);

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
      throw new Error(`Image exceeds maximum allowed size of 10MB (actual: ${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    }

    if (finalMime && !ALLOWED_MIME_TYPES.has(finalMime)) {
      throw new Error(`Unsupported image MIME type: ${finalMime}. Allowed types: JPEG, PNG, WEBP, SVG`);
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

  normalizeFilenameAndMime
};
