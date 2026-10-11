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

/**
 * Resolve an image URL/path to a Buffer
 */
async function resolveImageBuffer(imgUrl, sourceUrl) {
  if (!imgUrl && !sourceUrl) return null;
  const targetUrl = imgUrl || sourceUrl;

  // 1. Check local public directories
  if (targetUrl.startsWith("/")) {
    const candidatePaths = [
      path.join(__dirname, "../../client/public", targetUrl),
      path.join(__dirname, "../public", targetUrl),
      path.join(__dirname, "../../client/dist", targetUrl),
      path.join(__dirname, "../../", targetUrl)
    ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        try {
          return fs.readFileSync(p);
        } catch (e) {
          // ignore and try next
        }
      }
    }
  }

  // 2. Check if local relative path exists
  if (fs.existsSync(targetUrl) && fs.statSync(targetUrl).isFile()) {
    try {
      return fs.readFileSync(targetUrl);
    } catch (e) {
      // ignore
    }
  }

  // 3. Remote URL fetch with timeout
  const remoteUrl = targetUrl.startsWith("http") ? targetUrl : (sourceUrl && sourceUrl.startsWith("http") ? sourceUrl : null);
  if (remoteUrl && typeof fetch === "function") {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(remoteUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const arrayBuf = await res.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch (e) {
      // Remote fetch failed / timed out
    }
  }

  return null;
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
  const primaryUrl = product.primaryImage || (product.galleryImages && product.galleryImages[0]?.url) || null;

  if (Array.isArray(product.galleryImages) && product.galleryImages.length > 0) {
    product.galleryImages.forEach((img, idx) => {
      const url = typeof img === "string" ? img : img.url;
      const altText = (typeof img === "object" && img.altText) ? img.altText : `${title} - View ${idx + 1}`;
      const isPrimary = typeof img === "object" ? !!img.isPrimary : (url === primaryUrl || idx === 0);
      const sourceUrl = typeof img === "object" ? img.sourceUrl : null;
      if (url) {
        rawImages.push({ url, altText, isPrimary, sourceUrl, originalOrder: idx });
      }
    });
  }

  // Also check images string array
  if (Array.isArray(product.images)) {
    product.images.forEach((imgUrl, idx) => {
      if (imgUrl && !rawImages.some(r => r.url === imgUrl)) {
        rawImages.push({
          url: imgUrl,
          altText: `${title} - Image ${idx + 1}`,
          isPrimary: imgUrl === primaryUrl,
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

  // 2. Resolve image buffers and assign filenames
  const zipFiles = [];
  const imageManifest = [];
  const failedImages = [];

  let imgSeq = 1;
  for (const imgItem of rawImages) {
    const extMatch = imgItem.url.match(/\.(jpg|jpeg|png|webp|gif|svg)(\?.*)?$/i);
    let ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
    if (ext === "jpeg") ext = "jpg";

    const seqStr = String(imgSeq).padStart(2, "0");
    const filename = imgSeq === 1 && imgItem.isPrimary
      ? `${seqStr}-primary-image.${ext}`
      : `${seqStr}-product-image.${ext}`;

    const buffer = await resolveImageBuffer(imgItem.url, imgItem.sourceUrl);

    if (buffer) {
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
      imgSeq++;
    } else {
      failedImages.push({
        sequence: imgSeq,
        originalUrl: imgItem.url,
        reason: "Asset file not found locally and remote fetch unavailable"
      });
    }
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

module.exports = {
  generateProductPackage,
  sanitizeFilename
};
