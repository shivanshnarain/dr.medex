const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LOCAL_STORAGE_DIR = path.join(__dirname, "../../client/public/products-catalog");
osEnsureDir(LOCAL_STORAGE_DIR);

function osEnsureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml"
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Media Provider Interface (Phase 1: Local; Phase 2: Cloudinary plug-in)
 */
class LocalMediaProvider {
  async upload(buffer, filename, mimeType, productId = "general") {
    const prodDir = path.join(LOCAL_STORAGE_DIR, productId.replace(/[^a-zA-Z0-9_-]/g, "_"));
    osEnsureDir(prodDir);

    const ext = path.extname(filename) || (mimeType === "image/png" ? ".png" : ".jpg");
    const safeName = `img_${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    const targetPath = path.join(prodDir, safeName);

    fs.writeFileSync(targetPath, buffer);

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
  uploadProductImage: async (base64OrBuffer, originalFilename, mimeType, productId, altText = "") => {
    let buffer;
    if (Buffer.isBuffer(base64OrBuffer)) {
      buffer = base64OrBuffer;
    } else if (typeof base64OrBuffer === "string") {
      // Handle data URI
      const base64Data = base64OrBuffer.replace(/^data:image\/\w+;base64,/, "");
      buffer = Buffer.from(base64Data, "base64");
    } else {
      throw new Error("Invalid image data provided");
    }

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(`Image exceeds maximum allowed size of 10MB (actual: ${(buffer.length / 1024 / 1024).toFixed(1)}MB)`);
    }

    if (mimeType && !ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Unsupported image MIME type: ${mimeType}. Allowed types: JPEG, PNG, WEBP, SVG`);
    }

    const uploadResult = await activeProvider.upload(buffer, originalFilename, mimeType, productId);

    return {
      id: `img-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
      url: uploadResult.url,
      altText: altText || originalFilename,
      sourceUrl: uploadResult.sourceUrl,
      isPrimary: false,
      importedAt: new Date().toISOString(),
      sizeBytes: uploadResult.sizeBytes,
      status: "READY"
    };
  },

  /**
   * Delete image file from storage
   */
  deleteProductImage: async (publicUrl) => {
    return await activeProvider.delete(publicUrl);
  }
};
