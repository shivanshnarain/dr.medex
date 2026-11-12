const fs = require("fs");
const path = require("path");
const { createZip } = require("./zipService");

/**
 * Sanitize strings for safe filesystem names.
 */
function sanitizeFilename(str) {
  if (!str) return "product";
  return str
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Format CSV field per RFC 4180
 */
function escapeCSV(val) {
  if (val === null || val === undefined) return '""';
  if (Array.isArray(val)) {
    val = val.map(v => (typeof v === "object" ? JSON.stringify(v) : String(v))).join("; ");
  } else if (typeof val === "object") {
    val = JSON.stringify(val);
  } else {
    val = String(val);
  }
  // Replace internal quotes with double quotes
  const escaped = val.replace(/"/g, '""');
  return `"${escaped}"`;
}

const imageResolver = require("./imageResolver");

/**
 * Resolve an image URL/path to a Buffer with retry & timeout safety
 */
async function resolveImageBuffer(imgUrl, sourceUrl, options = {}) {
  if (!imgUrl && !sourceUrl) return null;
  const rawTarget = imgUrl || sourceUrl;
  const targetUrl = typeof rawTarget === "string" ? rawTarget : (rawTarget?.url || rawTarget?.src || "");
  if (!targetUrl || typeof targetUrl !== "string") return null;

  // 0. Check data: URI
  if (targetUrl.startsWith("data:")) {
    const commaIdx = targetUrl.indexOf(",");
    if (commaIdx !== -1) {
      try {
        const b64Data = targetUrl.substring(commaIdx + 1);
        const buf = Buffer.from(b64Data, "base64");
        if (buf.length > 0) return buf;
      } catch (e) {}
    }
  }

  // 1. Check local public directories
  if (targetUrl.startsWith("/") || targetUrl.startsWith("products-catalog/")) {
    const resolvedLocal = imageResolver.resolveLocalImagePath(targetUrl);
    if (resolvedLocal && fs.existsSync(resolvedLocal)) {
      try {
        return await fs.promises.readFile(resolvedLocal);
      } catch (e) {}
    }
    const candidatePaths = [
      path.join(__dirname, "../../client/public", targetUrl),
      path.join(__dirname, "../public", targetUrl),
      path.join(__dirname, "../../client/dist", targetUrl),
      path.join(__dirname, "../../", targetUrl)
    ];

    for (const p of candidatePaths) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          return await fs.promises.readFile(p);
        }
      } catch (e) {}
    }
  }

  // 2. Check if local relative path exists
  try {
    if (fs.existsSync(targetUrl) && fs.statSync(targetUrl).isFile()) {
      return await fs.promises.readFile(targetUrl);
    }
  } catch (e) {}

  // 3. Remote URL fetch (or origin CDN fallback for serverless) with bounded retries & timeout
  let remoteUrl = null;
  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
    remoteUrl = targetUrl;
  } else if (targetUrl.startsWith("/") && options.origin) {
    remoteUrl = `${options.origin.replace(/\/+$/, "")}${targetUrl}`;
  } else if (sourceUrl && typeof sourceUrl === "string" && sourceUrl.startsWith("http")) {
    remoteUrl = sourceUrl;
  }

  if (remoteUrl && typeof fetch === "function") {
    const maxRetries = options.retries ?? 2;
    const timeoutMs = options.timeoutMs ?? 12000;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(remoteUrl, {
          signal: controller.signal,
          redirect: "follow"
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const ct = (res.headers.get("content-type") || "").toLowerCase();
          if (ct && !ct.includes("image/") && !ct.includes("octet-stream") && !ct.includes("binary")) {
            continue;
          }
          const arrayBuf = await res.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          if (buf.length > 0) return buf;
        }
        if (res.status === 404 || res.status === 403 || res.status === 400) {
          break;
        }
      } catch (e) {
        if (attempt === maxRetries) break;
      }
      await new Promise(r => setTimeout(r, 250 * (attempt + 1)));
    }
  }

  return null;
}

function detectExtensionFromBuffer(buf, fallbackExt = "jpg") {
  if (!buf || buf.length < 4) return fallbackExt;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) {
    return "webp";
  }
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";
  return fallbackExt;
}

async function resolveWithConcurrency(items, workerFn, maxConcurrency = 3) {
  const results = new Array(items.length);
  let cursor = 0;
  const concurrency = Math.max(1, Math.min(maxConcurrency, items.length));
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) break;
      results[idx] = await workerFn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Generate complete product export package ZIP buffer
 *
 * @param {Object} product
 * @param {Object} [adminUser]
 * @returns {Promise<{ filename: string, buffer: Buffer, imageStats: Object }>}
 */
async function generateProductPackage(product, adminUser = null) {
  const exportTimestamp = new Date().toISOString();
  const title = product.title || product.productName || "Product";
  const sku = product.sku || product.SKU || product.modelNumber || "SKU";
  const baseFilename = `DR-MEDEX-${sanitizeFilename(title)}-${sanitizeFilename(sku)}`;
  const zipFilename = `${baseFilename}.zip`;

  // 1. Collect all images and normalize
  const rawImages = [];
  const primaryUrl = typeof product.primaryImage === "string"
    ? product.primaryImage
    : (product.primaryImage?.url || (product.galleryImages && (product.galleryImages[0]?.url || product.galleryImages[0])) || null);

  if (Array.isArray(product.galleryImages) && product.galleryImages.length > 0) {
    product.galleryImages.forEach((img, idx) => {
      const url = typeof img === "string" ? img : (img?.url || img?.src);
      const altText = (typeof img === "object" && (img.altText || img.alt)) ? (img.altText || img.alt) : `${title} - View ${idx + 1}`;
      const isPrimary = typeof img === "object" ? !!img.isPrimary : (url === primaryUrl || idx === 0);
      const sourceUrl = typeof img === "object" ? (img.sourceUrl || img.url) : null;
      if (url) {
        rawImages.push({ url, altText, isPrimary, sourceUrl, originalOrder: idx });
      }
    });
  }

  // Also check images array (which can contain strings or objects)
  if (Array.isArray(product.images)) {
    product.images.forEach((imgItem, idx) => {
      const url = typeof imgItem === "string" ? imgItem : (imgItem?.url || imgItem?.src || "");
      if (url && !rawImages.some(r => r.url === url)) {
        rawImages.push({
          url,
          altText: (typeof imgItem === "object" && (imgItem.alt || imgItem.altText)) ? (imgItem.alt || imgItem.altText) : `${title} - Image ${idx + 1}`,
          isPrimary: typeof imgItem === "object" ? !!imgItem.isPrimary : (url === primaryUrl),
          sourceUrl: typeof imgItem === "object" ? (imgItem.sourceUrl || imgItem.url) : null,
          originalOrder: rawImages.length
        });
      }
    });
  }

  // Also check managed Cloudinary images
  if (Array.isArray(product.managedCloudinaryImages)) {
    product.managedCloudinaryImages.forEach((cldImg, idx) => {
      const cldUrl = typeof cldImg === "string" ? cldImg : cldImg?.url;
      if (cldUrl && !rawImages.some(r => r.url === cldUrl)) {
        rawImages.push({
          url: cldUrl,
          altText: `${title} - Cloudinary Image ${idx + 1}`,
          isPrimary: cldUrl === primaryUrl,
          sourceUrl: null,
          originalOrder: rawImages.length
        });
      }
    });
  }

  // If primary image wasn't in the list
  if (primaryUrl && !rawImages.some(r => r.url === primaryUrl)) {
    rawImages.unshift({
      url: primaryUrl,
      altText: `${title} - Primary View`,
      isPrimary: true,
      sourceUrl: null,
      originalOrder: 0
    });
  }

  // Sort so primary image comes first, preserving order of the rest
  rawImages.sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return a.originalOrder - b.originalOrder;
  });

  // 2. Resolve image buffers concurrently (max 3 workers) while preserving exact sequence
  const zipFiles = [];
  const imageManifest = [];
  const failedImages = [];

  const cleanSku = sanitizeFilename(sku || "SKU");
  const resolvedBuffers = await resolveWithConcurrency(
    rawImages,
    async (imgItem) => {
      let ext = "jpg";
      if (typeof imgItem.url === "string" && imgItem.url.startsWith("data:image/")) {
        const m = imgItem.url.match(/^data:image\/([a-zA-Z0-9+]+);/);
        if (m && m[1]) {
          ext = m[1].toLowerCase();
          if (ext === "jpeg") ext = "jpg";
        }
      } else if (typeof imgItem.url === "string") {
        const extMatch = imgItem.url.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i);
        ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
        if (ext === "jpeg") ext = "jpg";
      }
      const buffer = await resolveImageBuffer(imgItem.url, imgItem.sourceUrl);
      const detectedExt = detectExtensionFromBuffer(buffer, ext);
      return { imgItem, buffer, ext: detectedExt };
    },
    3
  );

  let imgSeq = 1;
  for (const resolved of resolvedBuffers) {
    const { imgItem, buffer, ext } = resolved;
    const seqStr = String(imgSeq).padStart(2, "0");
    const filename = `${cleanSku}_img_${seqStr}${imgItem.isPrimary ? "_primary" : ""}.${ext}`;

    if (buffer && buffer.length > 0) {
      zipFiles.push({
        name: `images/${filename}`,
        content: buffer
      });
      imageManifest.push({
        filename: `images/${filename}`,
        sequence: imgSeq,
        isPrimary: imgItem.isPrimary,
        altText: imgItem.altText,
        originalUrl: imgItem.url,
        sizeBytes: buffer.length
      });
    } else {
      failedImages.push({
        sequence: imgSeq,
        originalUrl: imgItem.url,
        reason: "Asset file not found locally and remote fetch unavailable"
      });
    }
    imgSeq++;
  }

  // 3. Format product-details.json
  const productDetailsJSON = {
    exportMetadata: {
      packageGenerator: "DR.MEDEX Medical Equipment Export Engine v1.0",
      exportTimestamp,
      exportedBy: adminUser ? adminUser.email : "admin@drmedex.com",
      environment: "DR.MEDEX Production Catalogue"
    },
    productInformation: {
      id: product.id,
      productName: product.productName || product.title,
      title: product.title || product.productName,
      sku: product.sku || product.SKU || "",
      internalModelIdentifier: product.modelNumber || "",
      manufacturerModelNumber: product.modelNumber || "",
      primaryCategory: product.categoryName || product.category || "",
      primaryCategorySlug: product.category || "",
      subcategory: product.subcategoryName || product.subcategory || "",
      subcategorySlug: product.subcategory || "",
      equipmentType: product.productType || product.equipmentType || "Medical Equipment",
      brand: product.brand || "DR.MEDEX Global",
      shortDescription: product.shortDescription || "",
      detailedDescription: product.fullDescription || product.overview || "",
      features: product.features || product.keyFeatures || [],
      applications: product.applications || [],
      benefits: product.benefits || [],
      technicalSpecifications: product.technicalSpecifications || product.specifications || []
    },
    commercialDetails: {
      mrp: product.regularPrice !== undefined ? product.regularPrice : product.basePrice,
      sellingPrice: product.basePrice !== undefined ? product.basePrice : product.salePrice,
      baseCurrency: product.baseCurrency || "INR",
      discountPercentage: product.discountPercentage || 0,
      stockQuantity: product.stockQuantity !== undefined ? product.stockQuantity : (product.stock || 0),
      stockStatus: product.stockStatus || "IN_STOCK",
      inventoryTracking: product.inventoryTracking !== undefined ? product.inventoryTracking : true,
      productStatus: product.status || "ACTIVE",
      featured: !!product.featured,
      bestseller: !!product.bestseller
    },
    verificationAndReview: {
      reviewStatus: product.reviewStatus || "PENDING",
      reviewStatusLabel: product.reviewStatus === "CORRECT" ? "Correct" : product.reviewStatus === "NEEDS_EDITING" ? "Needs Editing" : "Not Yet Reviewed",
      reviewNote: product.reviewNote || null,
      reviewedBy: product.reviewedBy || null,
      reviewedAt: product.reviewedAt || null
    },
    complianceAndAssurance: {
      certifications: product.certifications || [],
      warranty: product.warranty || "Comprehensive OEM Warranty",
      shippingInformation: product.shippingInformation || "",
      packageContents: product.packageContents || [],
      installationInformation: product.installationInformation || "",
      maintenanceInformation: product.maintenanceInformation || ""
    },
    seoAndUrls: {
      seoTitle: product.seoTitle || product.metaTitle || product.title,
      metaDescription: product.metaDescription || product.shortDescription || "",
      urlSlug: product.slug,
      canonicalUrl: `https://drmedex.com/products/${product.slug}`
    },
    mediaManifest: {
      totalImagesCount: imageManifest.length,
      primaryImageFilename: imageManifest.find(i => i.isPrimary)?.filename || (imageManifest[0]?.filename || null),
      images: imageManifest,
      missingOrRemoteWarnings: failedImages
    }
  };

  zipFiles.push({
    name: "product-details.json",
    content: Buffer.from(JSON.stringify(productDetailsJSON, null, 2), "utf8")
  });

  // 4. Format product-details.csv
  const csvRows = [
    ["Property", "Value"],
    ["Product ID", product.id],
    ["Product Name", product.productName || product.title],
    ["Product Title", product.title || product.productName],
    ["SKU", product.sku || product.SKU || ""],
    ["Model Number", product.modelNumber || ""],
    ["Brand / Manufacturer", product.brand || "DR.MEDEX Global"],
    ["Primary Category", product.categoryName || product.category || ""],
    ["Subcategory", product.subcategoryName || product.subcategory || ""],
    ["Equipment Type", product.productType || product.equipmentType || "Medical Equipment"],
    ["Product Status", product.status || "ACTIVE"],
    ["Review Status", product.reviewStatus || "PENDING"],
    ["Review Note", product.reviewNote || ""],
    ["Reviewed By", product.reviewedBy || ""],
    ["Reviewed At", product.reviewedAt || ""],
    ["Base Currency", product.baseCurrency || "INR"],
    ["MRP (Regular Price)", product.regularPrice !== undefined ? product.regularPrice : product.basePrice],
    ["Selling Price", product.basePrice !== undefined ? product.basePrice : product.salePrice],
    ["Discount Percentage", `${product.discountPercentage || 0}%`],
    ["Stock Quantity", product.stockQuantity !== undefined ? product.stockQuantity : (product.stock || 0)],
    ["Stock Status", product.stockStatus || "IN_STOCK"],
    ["Short Description", product.shortDescription || ""],
    ["Detailed Description", product.fullDescription || product.overview || ""],
    ["Features", (product.features || product.keyFeatures || []).join(" | ")],
    ["Applications", (product.applications || []).join(" | ")],
    ["Certifications", (product.certifications || []).join(" | ")],
    ["Warranty", product.warranty || ""],
    ["Shipping Information", product.shippingInformation || ""],
    ["Package Contents", (product.packageContents || []).join(" | ")],
    ["SEO Title", product.seoTitle || product.metaTitle || product.title],
    ["Meta Description", product.metaDescription || product.shortDescription || ""],
    ["URL Slug", product.slug],
    ["Primary Image", imageManifest.find(i => i.isPrimary)?.filename || ""],
    ["Total Images Included", imageManifest.length],
    ["Export Timestamp", exportTimestamp],
    ["Exported By", adminUser ? adminUser.email : "admin@drmedex.com"]
  ];

  // Also append technical specifications to CSV in tabular format
  if (Array.isArray(product.technicalSpecifications) && product.technicalSpecifications.length > 0) {
    csvRows.push(["", ""]);
    csvRows.push(["--- TECHNICAL SPECIFICATIONS ---", ""]);
    product.technicalSpecifications.forEach(spec => {
      csvRows.push([spec.parameter || "Spec", spec.specification || ""]);
    });
  } else if (product.specifications && typeof product.specifications === "object") {
    csvRows.push(["", ""]);
    csvRows.push(["--- TECHNICAL SPECIFICATIONS ---", ""]);
    Object.entries(product.specifications).forEach(([k, v]) => {
      csvRows.push([k, String(v)]);
    });
  }

  // Also append image manifest to CSV
  if (imageManifest.length > 0) {
    csvRows.push(["", ""]);
    csvRows.push(["--- INCLUDED IMAGES ---", ""]);
    imageManifest.forEach(img => {
      csvRows.push([img.filename, `${img.isPrimary ? "[PRIMARY] " : ""}${img.altText} (${img.sizeBytes} bytes)`]);
    });
  }

  const csvContent = csvRows.map(row => `${escapeCSV(row[0])},${escapeCSV(row[1])}`).join("\r\n");

  zipFiles.push({
    name: "product-details.csv",
    content: Buffer.from(csvContent, "utf8")
  });

  // 5. Format README.txt
  const readmeLines = [
    "================================================================================",
    `DR.MEDEX GLOBAL MEDICAL EQUIPMENT - OFFICIAL PRODUCT PACKAGE`,
    "================================================================================",
    "",
    `PRODUCT:     ${product.title || product.productName}`,
    `SKU:         ${product.sku || product.SKU || "N/A"}`,
    `MODEL:       ${product.modelNumber || "N/A"}`,
    `CATEGORY:    ${product.categoryName || product.category || "N/A"}`,
    `BRAND:       ${product.brand || "DR.MEDEX Global"}`,
    `EXPORT DATE: ${exportTimestamp}`,
    `EXPORTED BY: ${adminUser ? adminUser.email : "Authorized Administrator"}`,
    "",
    "--------------------------------------------------------------------------------",
    "PACKAGE CONTENTS",
    "--------------------------------------------------------------------------------",
    "1. product-details.json",
    "   Complete structured schema including clinical specifications, pricing,",
    "   warranty, compliance, SEO attributes, and image manifests.",
    "",
    "2. product-details.csv",
    "   Tabular key-value and technical specifications data compatible with",
    "   Microsoft Excel, Apple Numbers, and clinical inventory databases.",
    "",
    "3. images/",
    `   Directory containing ${imageManifest.length} verified high-resolution product photography asset(s).`,
    "   Sequenced in priority order with '01-primary-image' designated as the hero asset.",
    "",
    "--------------------------------------------------------------------------------",
    "IMAGE MANIFEST",
    "--------------------------------------------------------------------------------"
  ];

  if (imageManifest.length === 0) {
    readmeLines.push("No images were available for this product.");
  } else {
    imageManifest.forEach(img => {
      readmeLines.push(`  * ${img.filename} [${img.isPrimary ? "PRIMARY HERO" : "GALLERY"}] - ${img.altText} (${Math.round(img.sizeBytes / 1024)} KB)`);
    });
  }

  if (failedImages.length > 0) {
    readmeLines.push("");
    readmeLines.push("--------------------------------------------------------------------------------");
    readmeLines.push("WARNINGS / UNRESOLVED REMOTE ASSETS");
    readmeLines.push("--------------------------------------------------------------------------------");
    failedImages.forEach(fail => {
      readmeLines.push(`  ! Image #${fail.sequence}: ${fail.originalUrl} (${fail.reason})`);
    });
  }

  readmeLines.push("");
  readmeLines.push("--------------------------------------------------------------------------------");
  readmeLines.push("COMMERCIAL & REGULATORY SUMMARY");
  readmeLines.push("--------------------------------------------------------------------------------");
  readmeLines.push(`Status:        ${product.status || "ACTIVE"}`);
  readmeLines.push(`Review Status: ${product.reviewStatus || "PENDING"} ${product.reviewNote ? `(Note: ${product.reviewNote})` : ""}`);
  readmeLines.push(`Selling Price: ${product.baseCurrency || "INR"} ${product.basePrice !== undefined ? product.basePrice : product.salePrice}`);
  readmeLines.push(`Certifications: ${(product.certifications || []).join(", ") || "ISO 13485:2016 / CE"}`);
  readmeLines.push(`Warranty:      ${product.warranty || "OEM Standard Support"}`);
  readmeLines.push("");
  readmeLines.push("================================================================================");
  readmeLines.push("CONFIDENTIALITY & INTELLECTUAL PROPERTY NOTICE");
  readmeLines.push("This export package is generated exclusively for authorized DR.MEDEX clinical");
  readmeLines.push("administrators. Reproduction or distribution requires DR.MEDEX authorization.");
  readmeLines.push("================================================================================");

  zipFiles.push({
    name: "README.txt",
    content: Buffer.from(readmeLines.join("\r\n"), "utf8")
  });

  // 6. Generate ZIP buffer using native RFC 1951 zip service
  const zipBuffer = createZip(zipFiles);

  return {
    filename: zipFilename,
    buffer: zipBuffer,
    stats: {
      totalImages: rawImages.length,
      includedImages: imageManifest.length,
      failedImages: failedImages.length
    }
  };
}

/**
 * Generate clean images-only ZIP archive for a product in exact canonical order.
 * Strict integrity check: fails loudly if ANY image cannot be fetched so no file is silently missing.
 */
async function generateImagesZipPackage(product, adminUser = null, options = {}) {
  const imageUrls = imageResolver.resolveProductImages(product);
  if (!imageUrls || imageUrls.length === 0) {
    return {
      success: false,
      totalImages: 0,
      includedImages: 0,
      failedImages: [{ index: 1, reason: "Product has no image URLs configured." }]
    };
  }

  const sku = sanitizeFilename(product.sku || product.SKU || product.id || "product");
  const resolved = await resolveWithConcurrency(
    imageUrls,
    async (imgUrl, idx) => {
      let ext = "jpg";
      if (typeof imgUrl === "string") {
        const extMatch = imgUrl.match(/\.(jpg|jpeg|png|webp|gif|svg|avif)(?:\?.*)?$/i);
        if (extMatch && extMatch[1]) {
          ext = extMatch[1].toLowerCase() === "jpeg" ? "jpg" : extMatch[1].toLowerCase();
        }
      }
      const buffer = await resolveImageBuffer(imgUrl, null, options);
      const finalExt = detectExtensionFromBuffer(buffer, ext);
      const seqStr = String(idx + 1).padStart(2, "0");
      return {
        index: idx + 1,
        imgUrl,
        filename: `${sku}_photo_${seqStr}.${finalExt}`,
        buffer
      };
    },
    3
  );

  const failedImages = resolved
    .filter(item => !item.buffer || item.buffer.length === 0)
    .map(item => ({
      index: item.index,
      filename: item.filename,
      url: item.imgUrl,
      reason: "Image could not be fetched from storage or CDN"
    }));

  if (failedImages.length > 0) {
    return {
      success: false,
      totalImages: resolved.length,
      includedImages: resolved.length - failedImages.length,
      failedImages
    };
  }

  const zipFiles = resolved.map(item => ({
    name: item.filename,
    content: item.buffer
  }));
  const buffer = createZip(zipFiles);

  return {
    success: true,
    filename: `${sku}_photos_${resolved.length}.zip`,
    buffer,
    totalImages: resolved.length,
    includedImages: resolved.length,
    filenames: zipFiles.map(f => f.name),
    failedImages: []
  };
}

module.exports = {
  generateProductPackage,
  generateImagesZipPackage,
  resolveImageBuffer,
  sanitizeFilename
};
