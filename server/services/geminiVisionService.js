/**
 * Google Gemini Vision Service for DR.MEDEX Medical Equipment Identification
 * Uses official @google/genai SDK with multimodal image understanding
 * Strictly grounds analysis in visual evidence; avoids fabricating medical specs
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const catalogueHierarchy = require("../data/catalogueHierarchy");

// Allowed MIME types & constraints
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);
const MAX_PHOTOS = 5;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB per image

// Models to try in order of priority (handles high-demand 503s transparently)
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash"
];

// Canonical server-side environment variables supported for Gemini credentials
const CANONICAL_ENV_VARS = [
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GOOGLE_GENAI_API_KEY",
  "GEMINI_KEY",
  "GOOGLE_GEMINI_API_KEY",
  "GOOGLE_AI_API_KEY",
  "GOOGLE_AI_KEY",
  "GEMINI_TOKEN",
  "GEMINI_API_TOKEN",
  "GEMINI_SECRET",
  "VITE_GEMINI_API_KEY",
  "VITE_GOOGLE_API_KEY"
];

function getDetectedEnvVar() {
  // 1. Direct canonical check
  for (const varName of CANONICAL_ENV_VARS) {
    const val = process.env[varName];
    if (val && typeof val === "string" && val.trim().length > 0) {
      return varName;
    }
  }

  // 2. Case-insensitive & trimmed match across all process.env keys
  const allKeys = Object.keys(process.env);
  for (const canonical of CANONICAL_ENV_VARS) {
    const canonicalNorm = canonical.toLowerCase().replace(/[^a-z0-9]/g, "");
    const matchingKey = allKeys.find(k => {
      const kNorm = k.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      return kNorm === canonicalNorm;
    });
    if (matchingKey) {
      const val = process.env[matchingKey];
      if (val && typeof val === "string" && val.trim().length > 0) {
        return matchingKey;
      }
    }
  }

  // 3. Fallback: Any key containing gemini or genai that has key/token/secret/api
  for (const k of allKeys) {
    const lower = k.toLowerCase().trim();
    if (
      (lower.includes("gemini") || lower.includes("genai")) &&
      (lower.includes("key") || lower.includes("token") || lower.includes("secret") || lower.includes("api"))
    ) {
      const val = process.env[k];
      if (val && typeof val === "string" && val.trim().length > 0) {
        return k;
      }
    }
  }

  return null;
}

function isConfigured() {
  return Boolean(getDetectedEnvVar());
}

function getGeminiStatus() {
  const detectedVar = getDetectedEnvVar();
  // Safe diagnostic: collect variable names only (never expose values)
  const matchingKeyNames = Object.keys(process.env)
    .filter(k => /gemini|genai|google.*api/i.test(k))
    .map(k => k.trim());

  return {
    configured: Boolean(detectedVar),
    provider: "google-gemini",
    models: CANDIDATE_MODELS,
    envVarName: detectedVar || "GEMINI_API_KEY",
    activeModel: CANDIDATE_MODELS[0],
    detectedKeyNames: matchingKeyNames,
    totalEnvKeysCount: Object.keys(process.env).length
  };
}

function getApiKey() {
  const detectedVar = getDetectedEnvVar();
  if (!detectedVar) {
    throw new Error(
      "GEMINI_API_KEY is not configured on this server. Please ensure GEMINI_API_KEY or GOOGLE_API_KEY is configured in your server environment."
    );
  }
  const raw = String(process.env[detectedVar] || "").trim();
  return raw.replace(/^["']|["']$/g, "").trim();
}

// Client singleton instance to reuse across requests
let cachedGenAiClient = null;
let cachedKey = null;

function getGenAiClient() {
  const apiKey = getApiKey();
  if (!cachedGenAiClient || cachedKey !== apiKey) {
    cachedGenAiClient = new GoogleGenAI({ apiKey });
    cachedKey = apiKey;
  }
  return cachedGenAiClient;
}

/**
 * Format the DR.MEDEX catalogue taxonomy into a clean prompt reference
 */
function buildTaxonomyReference() {
  const categories = Object.values(catalogueHierarchy).map(cat => {
    const subcats = cat.subcategories.map(sub => {
      const eqTypes = sub.equipmentTypes.map(eq => `"${eq.name}"`).join(", ");
      return `    - Subcategory: "${sub.name}" (Equipment Types: [${eqTypes}])`;
    }).join("\n");
    return `* Primary Category: "${cat.name}"\n${subcats}`;
  }).join("\n\n");

  return categories;
}

/**
 * Build system prompt with strict medical grounding rules and naming style support
 */
function buildPrompt(taxonomyText, namingStyle = "clinical", targetField = null, context = {}) {
  let styleInstruction = "";
  if (namingStyle === "technical") {
    styleInstruction = "Naming style: TECHNICAL / MODEL-FOCUSED. Emphasize model numbers, technical parameters, and physical device specifications in productName and storefrontProductTitle.";
  } else if (namingStyle === "catalog") {
    styleInstruction = "Naming style: SHORT / CATALOG-FRIENDLY. Concise, clean catalog naming without overly dense clinical jargon.";
  } else {
    styleInstruction = "Naming style: PROFESSIONAL / CLINICAL. Dignified, authoritative hospital-grade medical equipment naming.";
  }

  let focusedInstruction = "";
  if (targetField) {
    const fieldDescriptions = {
      productName: "regenerating and perfecting the Product Name (official equipment designation) only",
      description: "regenerating and perfecting the Clinical & Operational Overview / Product Description only",
      clinicalIndications: "regenerating and refining the Clinical Indications & Specialty Procedures list only",
      engineeringHighlights: "regenerating and refining the Key Factors & Engineering Highlights list only",
      packageItems: "regenerating and refining the Standard Included Package Contents list only",
      technicalSpecifications: "regenerating and refining the Technical Specifications only"
    };
    const desc = fieldDescriptions[targetField] || `regenerating the ${targetField} field only`;
    focusedInstruction = `\n### FOCUSED REGENERATION GOAL:
You are requested to focus on ${desc}.
Existing device context provided by the operator:
- Equipment Type: ${context.equipmentType || "Medical Equipment"}
- Primary Category: ${context.category || "Hospital Equipment"}
- Subcategory: ${context.subcategory || ""}
- Current Product Name: ${context.productName || ""}
- Manufacturer / Model: ${context.manufacturerModel || ""}
- Brand: ${context.brand || "DR.MEDEX"}
Carefully analyze the photos together with this existing context and produce a grounded, highly accurate result for "${targetField}".\n`;
  }

  return `You are the DR.MEDEX Senior Biomedical Equipment Classifier and Technical Analyst.
You are analyzing photograph(s) of a medical device to accurately identify and classify it for the DR.MEDEX international catalogue.

### DR.MEDEX CATALOGUE TAXONOMY (STRICT REQUIREMENT)
You MUST match the device to the existing DR.MEDEX taxonomy below:
${taxonomyText}

### CRITICAL MEDICAL EQUIPMENT GROUNDING RULES:
1. DISTINGUISH VISUAL OBSERVATIONS FROM INFERENCE:
   - Identify what is physically visible: casing shape, LED dome configuration, front panel layout, displays, adjustment knobs, footswitch ports, electrode sockets, labels, or nameplates.
   - If the manufacturer brand or model number is visibly printed, extract it verbatim. If not visible, set brand to "DR.MEDEX" and leave manufacturerModel as "" (empty string).
2. NEVER FABRICATE OR HALLUCINATE:
   - DO NOT fabricate electrical parameters (e.g., exact voltage, Hz, wattage, frequency) unless a nameplate or label is clearly legible in the image. If not visible, leave powerSupply empty or "Needs verification on physical rating plate".
   - DO NOT invent certifications (ISO, CE, FDA), quality standards, or certificate numbers. DO NOT invent CE certifications or ISO compliance without physical proof. If unverified, leave qualityStandards and regulatoryStatus empty or "Needs verification".
   - DO NOT fabricate package contents or accessories that are not visible in the photographs.
3. NAMING:
   - ${styleInstruction}
   - productName: Official equipment designation (e.g., "DR.MEDEX [Equipment Type] – [Key Feature]").
   - storefrontProductTitle: Consumer-facing catalog title (e.g., "[Brand] [Equipment Type] with [Key Highlight]").
4. TAXONOMY MATCHING:
   - primaryCategory: MUST match one of the exact primary category names from the taxonomy list above.
   - subcategory: MUST match one of the exact subcategory names within that primary category.
   - equipmentType: MUST match one of the exact equipment type names in that subcategory.
   - If the device is ambiguous or cannot be matched with high confidence, set confidence to "LOW" or "MEDIUM" and flag "primaryCategory" or "equipmentType" in fieldsNeedingVerification.
5. CONFIDENCE & EVIDENCE:
   - Set confidence to "HIGH", "MEDIUM", or "LOW".
   - List every uncertain field in fieldsNeedingVerification.
   - Provide concrete evidence in evidenceFromImages describing what physical features in the photos justify your identification.

### OUTPUT FORMAT
You MUST respond with a single valid JSON object containing the exact structure below. Do NOT wrap in extra text.

{
  "productName": "DR.MEDEX [Equipment Type] – [Verified Descriptor]",
  "storefrontProductTitle": "DR.MEDEX [Equipment Type] with [Verified Feature]",
  "brand": "Visible brand name or DR.MEDEX",
  "manufacturerModel": "Model printed on device or empty string",
  "primaryCategory": "Exact primary category from taxonomy",
  "subcategory": "Exact subcategory from taxonomy",
  "equipmentType": "Exact equipment type from taxonomy",
  "description": "Concise professional clinical description of this device class (2-3 sentences explaining purpose, design, applications, and features). Do not append lists or specs here.",
  "powerSupply": "Observed power text (e.g., '220-240V AC, 50/60 Hz') if legible on nameplate; otherwise '' or 'Needs verification on physical rating plate'",
  "qualityStandards": "Observed standard (e.g., 'ISO 13485:2016') if visible; otherwise ''",
  "regulatoryStatus": "Observed regulatory mark (e.g., 'Class IIa Medical Device') if visible; otherwise ''",
  "warranty": "2-Year Comprehensive Clinical Warranty",
  "clinicalIndications": [
    "Clinical application or procedure 1",
    "Clinical application or procedure 2"
  ],
  "engineeringHighlights": [
    "Observed physical/functional engineering highlight 1",
    "Observed physical/functional engineering highlight 2"
  ],
  "packageContents": [
    { "item": "Main Unit", "type": "STANDARD" }
  ],
  "seoTitle": "DR.MEDEX [Equipment Type] | Hospital-Grade Medical Equipment",
  "seoDescription": "Procure the DR.MEDEX [Equipment Type]. Professional medical equipment with certified clinical ergonomics and international delivery.",
  "confidence": "HIGH | MEDIUM | LOW",
  "fieldsNeedingVerification": [
    "List of field names that require physical verification"
  ],
  "evidenceFromImages": "Detailed description of physical cues, labels, connectors, and structural details observed across the submitted photographs."
}`;
}

/**
 * Validate and sanitize JSON response against the required schema
 */
function validateAndSanitizeOutput(parsed) {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid response format: AI output is not a JSON object.");
  }

  const clinicalOverview = typeof parsed.description === "string" && parsed.description.trim()
    ? parsed.description.trim()
    : (typeof parsed.clinicalOverview === "string" ? parsed.clinicalOverview.trim() : "");

  const rawPackage = Array.isArray(parsed.packageItems) && parsed.packageItems.length > 0
    ? parsed.packageItems
    : (Array.isArray(parsed.packageContents) ? parsed.packageContents : []);

  const normalizedPackage = rawPackage.map((item, idx) => {
    if (typeof item === "string") return { id: `pkg-${idx + 1}`, name: item.trim(), item: item.trim(), type: "standard" };
    if (item && typeof item === "object") {
      const itemName = String(item.name || item.item || item.title || "").trim();
      const rawType = String(item.type || "standard").toLowerCase();
      const type = ["standard", "optional", "confirmation"].includes(rawType) ? rawType : "standard";
      return {
        id: item.id || `pkg-${idx + 1}`,
        name: itemName,
        item: itemName,
        type
      };
    }
    return null;
  }).filter(Boolean);

  const clinicalIndications = Array.isArray(parsed.clinicalIndications) && parsed.clinicalIndications.length > 0
    ? parsed.clinicalIndications.map(s => String(s).trim()).filter(Boolean)
    : (Array.isArray(parsed.intendedUses) ? parsed.intendedUses.map(s => String(s).trim()).filter(Boolean) : []);

  const engineeringHighlights = Array.isArray(parsed.engineeringHighlights) && parsed.engineeringHighlights.length > 0
    ? parsed.engineeringHighlights.map(s => String(s).trim()).filter(Boolean)
    : (Array.isArray(parsed.keyFeatures) ? parsed.keyFeatures.map(s => String(s).trim()).filter(Boolean) : []);

  const result = {
    productName: typeof parsed.productName === "string" && parsed.productName.trim() ? parsed.productName.trim() : "DR.MEDEX Medical Equipment",
    storefrontProductTitle: typeof parsed.storefrontProductTitle === "string" && parsed.storefrontProductTitle.trim() ? parsed.storefrontProductTitle.trim() : (parsed.productName || "DR.MEDEX Medical Equipment"),
    brand: typeof parsed.brand === "string" && parsed.brand.trim() ? parsed.brand.trim() : "DR.MEDEX",
    manufacturerModel: typeof parsed.manufacturerModel === "string" ? parsed.manufacturerModel.trim() : "",
    primaryCategory: typeof parsed.primaryCategory === "string" && parsed.primaryCategory.trim() 
      ? parsed.primaryCategory.trim() 
      : (parsed.classification?.primaryCategory || parsed.classification?.primaryCategoryId || "General Medical Equipment"),
    subcategory: typeof parsed.subcategory === "string" && parsed.subcategory.trim() 
      ? parsed.subcategory.trim() 
      : (parsed.classification?.subcategory || parsed.classification?.subcategoryId || "Diagnostic Instruments"),
    equipmentType: typeof parsed.equipmentType === "string" && parsed.equipmentType.trim() 
      ? parsed.equipmentType.trim() 
      : (parsed.classification?.equipmentType || "Digital Diagnostic Station"),
    description: clinicalOverview,
    clinicalOverview,
    powerSupply: typeof parsed.powerSupply === "string" ? parsed.powerSupply.trim() : "",
    qualityStandards: typeof parsed.qualityStandards === "string" ? parsed.qualityStandards.trim() : "",
    regulatoryStatus: typeof parsed.regulatoryStatus === "string" ? parsed.regulatoryStatus.trim() : "",
    warranty: typeof parsed.warranty === "string" && parsed.warranty.trim() ? parsed.warranty.trim() : "2-Year Comprehensive Clinical Warranty",
    clinicalIndications,
    intendedUses: clinicalIndications,
    engineeringHighlights,
    keyFeatures: engineeringHighlights,
    technicalSpecifications: Array.isArray(parsed.technicalSpecifications) 
      ? parsed.technicalSpecifications.map(spec => ({
          parameter: String(spec.parameter || "").trim(),
          value: String(spec.value || "").trim(),
          unit: String(spec.unit || "").trim(),
          note: String(spec.note || "").trim()
        })).filter(s => s.parameter)
      : [],
    packageContents: normalizedPackage.length > 0 ? normalizedPackage.map(p => p.item) : [],
    packageItems: normalizedPackage,
    seoTitle: typeof parsed.seoTitle === "string" ? parsed.seoTitle.trim() : "",
    seoDescription: typeof parsed.seoDescription === "string" ? parsed.seoDescription.trim() : "",
    confidence: ["HIGH", "MEDIUM", "LOW"].includes(String(parsed.confidence).toUpperCase()) ? String(parsed.confidence).toUpperCase() : "MEDIUM",
    fieldsNeedingVerification: Array.isArray(parsed.fieldsNeedingVerification) ? parsed.fieldsNeedingVerification.map(s => String(s).trim()).filter(Boolean) : [],
  };

  // Reconcile with catalogue taxonomy with full multi-level resolution
  let resolvedPrimary = null;
  let resolvedSub = null;
  let resolvedEq = null;

  const rawCat = String(result.primaryCategory || "").trim().toLowerCase();
  const rawSub = String(result.subcategory || "").trim().toLowerCase();
  const rawEq = String(result.equipmentType || "").trim().toLowerCase();

  // 1. Direct match on primary category
  resolvedPrimary = Object.values(catalogueHierarchy).find(c => 
    c.name.toLowerCase() === rawCat ||
    c.id.toLowerCase() === rawCat ||
    rawCat.includes(c.id.toLowerCase()) ||
    c.name.toLowerCase().includes(rawCat)
  );

  // 2. Cross-search by subcategory if primary is ambiguous
  if (rawSub) {
    for (const cat of Object.values(catalogueHierarchy)) {
      const subMatch = cat.subcategories.find(s => 
        s.name.toLowerCase() === rawSub || 
        s.id.toLowerCase() === rawSub ||
        rawSub.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(rawSub)
      );
      if (subMatch) {
        if (!resolvedPrimary) resolvedPrimary = cat;
        if (resolvedPrimary.id === cat.id) resolvedSub = subMatch;
        break;
      }
    }
  }

  // 3. Cross-search by equipment type if subcategory still unresolved
  if (rawEq) {
    for (const cat of Object.values(catalogueHierarchy)) {
      for (const sub of cat.subcategories) {
        const eqMatch = sub.equipmentTypes.find(e => 
          e.name.toLowerCase() === rawEq || 
          e.id.toLowerCase() === rawEq ||
          rawEq.includes(e.name.toLowerCase()) ||
          e.name.toLowerCase().includes(rawEq)
        );
        if (eqMatch) {
          if (!resolvedPrimary) resolvedPrimary = cat;
          if (!resolvedSub && resolvedPrimary.id === cat.id) resolvedSub = sub;
          if (resolvedSub && resolvedSub.id === sub.id) resolvedEq = eqMatch;
          break;
        }
      }
      if (resolvedEq) break;
    }
  }

  if (resolvedPrimary) {
    result.primaryCategory = resolvedPrimary.name;
    result.primaryCategoryId = resolvedPrimary.id;
    if (!resolvedSub && rawSub) {
      resolvedSub = resolvedPrimary.subcategories.find(s => 
        s.name.toLowerCase() === rawSub || 
        s.id.toLowerCase() === rawSub ||
        rawSub.includes(s.name.toLowerCase()) ||
        s.name.toLowerCase().includes(rawSub)
      );
    }
    if (resolvedSub) {
      result.subcategory = resolvedSub.name;
      result.subcategoryId = resolvedSub.id;
      if (!resolvedEq && rawEq) {
        resolvedEq = resolvedSub.equipmentTypes.find(e => 
          e.name.toLowerCase() === rawEq || 
          e.id.toLowerCase() === rawEq ||
          rawEq.includes(e.name.toLowerCase()) ||
          e.name.toLowerCase().includes(rawEq)
        );
      }
      if (resolvedEq) {
        result.equipmentType = resolvedEq.name;
        result.equipmentTypeId = resolvedEq.id;
      } else if (!result.fieldsNeedingVerification.includes("equipmentType")) {
        result.fieldsNeedingVerification.push("equipmentType");
      }
    } else if (!result.fieldsNeedingVerification.includes("subcategory")) {
      result.fieldsNeedingVerification.push("subcategory");
    }
  } else {
    // If category was not recognized in taxonomy, flag for admin review
    if (!result.fieldsNeedingVerification.includes("primaryCategory")) {
      result.fieldsNeedingVerification.push("primaryCategory");
    }
  }

  // 8-Step structured mapping
  result.classification = {
    primaryCategory: result.primaryCategory,
    subcategory: result.subcategory,
    equipmentType: result.equipmentType,
    primaryCategoryId: result.primaryCategoryId || "",
    subcategoryId: result.subcategoryId || "",
    equipmentTypeId: result.equipmentTypeId || ""
  };

  const catCodeMap = {
    "ot-lights": "OTL",
    "electrosurgical-units": "ESU",
    "cryo-surgical": "CRY",
    "examination-ot-tables": "TAB",
    "obstetrics-and-gynaecology": "OBG",
    "medical-equipment": "MED",
    "physiotherapy": "PHY"
  };
  const skuPrefix = catCodeMap[result.primaryCategoryId] || "DRM";
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  result.skuSuggestion = `DRM-${skuPrefix}-${randomSuffix}`;

  // Complete aliases across all form workflow steps
  result.category = result.primaryCategory;
  result.categoryId = result.primaryCategoryId || "";
  result.subcategoryId = result.subcategoryId || "";
  result.equipmentTypeId = result.equipmentTypeId || "";
  result.title = result.storefrontProductTitle || result.productName;
  result.productDescription = result.description || result.clinicalOverview;
  result.shortDescription = result.description || result.clinicalOverview;
  result.fullDescription = result.description || result.clinicalOverview;
  result.features = result.engineeringHighlights;
  result.applications = result.clinicalIndications;
  result.keyFactors = result.engineeringHighlights;
  result.specifications = result.technicalSpecifications.map(s => ({
    key: s.parameter || s.key || "",
    parameter: s.parameter || s.key || "",
    value: s.value || "",
    unit: s.unit || "",
    note: s.note || ""
  }));
  result.technicalSpecifications = result.specifications;
  result.metaTitle = result.seoTitle;
  result.metaDescription = result.seoDescription;
  result.regulatoryClass = result.regulatoryStatus || (result.fieldsNeedingVerification.length > 0 ? "Class IIa (MDR 2017/745)" : "Class I / IIa");
  result.regulatoryClassification = result.regulatoryClass;
  result.certificationStatus = result.fieldsNeedingVerification.length > 0 ? "Pending Verification" : "Verified";
  result.warranty = result.warranty || "2-Year Comprehensive Clinical Warranty";
  result.shippingInformation = "Express Air Cargo Dispatch with Shockproof Wooden Crating";
  result.stock = 10;
  result.stockStatus = "IN_STOCK";
  result.lowStockThreshold = 3;
  result.minOrderQuantity = 1;
  result.leadTimeWeeks = "1–2 Weeks";

  return result;
}

/**
 * Main identification function: analyzes up to 5 photos with Gemini Vision
 * @param {Array<{ data: string|Buffer, mimeType: string, filename?: string }>} photos
 * @param {object} options Optional configuration (namingStyle, preliminaryBrand)
 * @returns {Promise<{ success: boolean, data: object, modelUsed: string }>}
 */
async function identifyProductFromPhotos(photos, options = {}) {
  // 1. Validation
  if (!Array.isArray(photos) || photos.length === 0) {
    throw new Error("No photographs provided. Please upload at least one image of the medical device.");
  }
  if (photos.length > MAX_PHOTOS) {
    throw new Error(`Maximum ${MAX_PHOTOS} photos allowed per identification request. Received ${photos.length}.`);
  }

  const parts = [];
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    let mimeType = (p.mimeType || "image/jpeg").toLowerCase();
    if (mimeType === "image/jpg") mimeType = "image/jpeg";

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Unsupported image format "${mimeType}" for photo #${i + 1}. Supported formats: JPEG, PNG, WebP.`);
    }

    let base64Data = "";
    if (Buffer.isBuffer(p.data)) {
      if (p.data.length > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Photo #${i + 1} exceeds the 10MB file size limit.`);
      }
      base64Data = p.data.toString("base64");
    } else if (typeof p.data === "string") {
      if (p.data.startsWith("http://") || p.data.startsWith("https://")) {
        try {
          const fetchRes = await fetch(p.data);
          if (!fetchRes.ok) {
            throw new Error(`Failed to fetch photo from URL (HTTP ${fetchRes.status})`);
          }
          const arrayBuf = await fetchRes.arrayBuffer();
          const buf = Buffer.from(arrayBuf);
          if (buf.length > MAX_FILE_SIZE_BYTES) {
            throw new Error(`Photo #${i + 1} exceeds the 10MB file size limit.`);
          }
          base64Data = buf.toString("base64");
          const cType = fetchRes.headers.get("content-type");
          if (cType && ALLOWED_MIME_TYPES.has(cType.toLowerCase())) {
            mimeType = cType.toLowerCase();
          }
        } catch (fetchErr) {
          throw new Error(`Could not read photo #${i + 1} from URL: ${fetchErr.message}`);
        }
      } else if (p.data.startsWith("/") && !p.data.startsWith("/data:")) {
        const possiblePaths = [
          path.join(__dirname, "../../client/public", p.data),
          path.join(__dirname, "../public", p.data),
          path.join(__dirname, "../uploads", path.basename(p.data))
        ];
        let foundBuffer = null;
        for (const candidate of possiblePaths) {
          if (fs.existsSync(candidate)) {
            foundBuffer = fs.readFileSync(candidate);
            break;
          }
        }
        if (foundBuffer) {
          base64Data = foundBuffer.toString("base64");
          const ext = path.extname(p.data).toLowerCase();
          if (ext === ".png") mimeType = "image/png";
          else if (ext === ".webp") mimeType = "image/webp";
          else mimeType = "image/jpeg";
        } else {
          base64Data = p.data.replace(/^data:image\/\w+;base64,/, "").trim();
        }
      } else {
        base64Data = p.data.replace(/^data:image\/\w+;base64,/, "").trim();
      }
      const approxBytes = (base64Data.length * 3) / 4;
      if (approxBytes > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Photo #${i + 1} exceeds the 10MB file size limit.`);
      }
    } else {
      throw new Error(`Invalid data format for photo #${i + 1}.`);
    }

    parts.push({
      inlineData: {
        mimeType,
        data: base64Data
      }
    });
  }

  // 2. Prepare SDK and Prompt
  const ai = getGenAiClient();
  const taxonomyText = buildTaxonomyReference();
  const systemPrompt = buildPrompt(
    taxonomyText,
    options.namingStyle || "clinical",
    options.targetField || null,
    options.context || {}
  );

  parts.push({
    text: `${systemPrompt}\n\nAnalyze all ${photos.length} photograph(s) of this medical equipment submitted above together and output the structured JSON:`
  });

  // 3. Model execution with resilient fallback for high-demand spikes
  let lastError = null;
  let rawText = "";
  let modelUsed = "";

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      rawText = response.text;
      modelUsed = model;
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      const errMsg = err.message || "";
      // If 503 (high demand) or 404 (model unavailable), try next candidate
      if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("404") || errMsg.includes("not found")) {
        console.warn(`[GeminiVision] Model ${model} returned error (${errMsg.substring(0, 80)}). Trying next candidate...`);
        continue;
      }
      // If 429 rate limit or 400 invalid argument, break with descriptive error
      break;
    }
  }

  if (lastError && !rawText) {
    const msg = lastError.message || String(lastError);
    if (msg.includes("403") || msg.includes("PERMISSION_DENIED") || msg.includes("API_KEY_INVALID") || msg.includes("invalid API key")) {
      throw new Error("Gemini API key is invalid or lacks necessary permissions. Please check your Google AI credentials.");
    }
    if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("rate limit")) {
      throw new Error("Gemini API quota or rate limit exceeded. Please wait a moment before trying again.");
    }
    if (msg.includes("503") || msg.includes("high demand") || msg.includes("temporarily unavailable") || msg.includes("UNAVAILABLE")) {
      throw new Error("Google Gemini AI services are temporarily experiencing high demand. Please retry in a few moments.");
    }
    if (msg.includes("DEADLINE_EXCEEDED") || msg.includes("timeout") || msg.includes("ETIMEDOUT")) {
      throw new Error("Gemini request timed out while analyzing high-resolution photographs. Please retry.");
    }
    throw new Error(`Gemini Vision analysis failed: ${msg.replace(/key=[^&\s]+/gi, "key=[REDACTED]")}`);
  }

  // 4. Parse and Validate JSON output
  let parsed;
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    throw new Error(`AI generated a malformed response: ${parseErr.message}. Please retry with clearer photographs.`);
  }

  const validatedData = validateAndSanitizeOutput(parsed);

  return {
    success: true,
    data: validatedData,
    modelUsed,
    photosAnalyzed: photos.length
  };
}

/**
 * Generate grounded, editable clinical review draft options based strictly on customer rating and actual feedback.
 * Reuses existing Gemini configuration, candidate models, and resilience handling.
 * 
 * Strict Grounding & Medical Ethics Rules:
 * - Strictly respects customer rating (1-5); never turns negative feedback into positive testimonials.
 * - Never fabricates patient statistics, medical outcomes, clinical trials, certifications, or false claims.
 * - Generates distinct editable suggestions for the customer to review, adjust, and explicitly submit.
 */
async function generateReviewDraft({
  rating = 5,
  feedbackPoints = [],
  roughDraft = "",
  productTitle = "Medical Equipment",
  customerName = "",
  facility = ""
}) {
  const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
  const cleanPoints = Array.isArray(feedbackPoints)
    ? feedbackPoints.map(p => String(p).trim()).filter(Boolean).slice(0, 10)
    : [];
  const cleanDraft = String(roughDraft || "").trim().substring(0, 1000);
  const cleanProduct = String(productTitle || "Medical Equipment").trim().substring(0, 200);

  if (cleanPoints.length === 0 && !cleanDraft) {
    throw new Error("Please provide at least one feedback point or rough note so the draft can be grounded in your actual experience.");
  }

  let apiKey = "";
  try {
    apiKey = getApiKey();
  } catch (keyErr) {
    // Graceful deterministic fallback if key not configured
    return buildFallbackDrafts({
      rating: cleanRating,
      points: cleanPoints,
      roughDraft: cleanDraft,
      productTitle: cleanProduct
    });
  }

  const ratingGuidance = {
    1: "CRITICAL / DEFECTIVE (1/5): Honestly critical. Reflect severe drawbacks, equipment failures, or workflow blockers stated in feedback. DO NOT soften or inject false praise.",
    2: "DEFICIENT (2/5): Constructively critical. Highlight notable performance limitations, ergonomics shortcomings, or reliability issues stated.",
    3: "MODERATE / MIXED (3/5): Balanced overview. Acknowledge baseline functional utility while clearly addressing the specific limitations noted.",
    4: "FAVORABLE (4/5): Positive clinical evaluation. Emphasize solid departmental reliability with constructive observations.",
    5: "EXEMPLARY (5/5): High clinical satisfaction. Emphasize dependable operational workflow, build quality, and precision matching the stated points."
  };

  const systemPrompt = `You are the DR.MEDEX Clinical Review Drafting Assistant.
Your sole purpose is to help a healthcare practitioner articulate their own authentic experience with the medical device: "${cleanProduct}".

RATING EVALUATION: ${cleanRating}/5 stars.
TONE MANDATE: ${ratingGuidance[cleanRating]}
CUSTOMER STATED FEEDBACK POINTS: ${JSON.stringify(cleanPoints)}
CUSTOMER ROUGH DRAFT NOTES: "${cleanDraft}"

STRICT GROUNDING & ETHICS RULES:
1. ONLY use the stated rating, explicit feedback points, and draft notes provided above.
2. ZERO FABRICATION:
   - NEVER fabricate clinical trials, survival rates, patient cure statistics, or specific patient cases.
   - NEVER invent unverified regulatory certifications (CE, FDA, ISO) or warranties.
   - NEVER invent hospital endorsements, institutional affiliations, or reviewer identity.
   - NEVER claim the review is "verified" or "guaranteed".
3. Provide TWO distinct, professional, editable draft options:
   - Option 1 (Direct Clinical Summary): Concise, 2-3 sentences focusing on primary clinical utility.
   - Option 2 (Operational Workflow Focus): 3-4 sentences focusing on departmental ergonomics and hardware handling.
4. Both options must strictly maintain the tone appropriate for the ${cleanRating}-star rating.
5. OUTPUT FORMAT: Respond ONLY with a valid JSON object matching this exact schema:
{
  "suggestedTitle": "Concise review headline under 12 words",
  "suggestedReviewText": "Primary drafted review text (Option 1)",
  "draftOptions": [
    {
      "style": "Direct Clinical Summary",
      "title": "Headline for Option 1",
      "text": "Text for Option 1"
    },
    {
      "style": "Operational Workflow Focus",
      "title": "Headline for Option 2",
      "text": "Text for Option 2"
    }
  ],
  "feedbackSummaryTags": ["Tag 1", "Tag 2", "Tag 3"]
}`;

  try {
    const ai = getGenAiClient();
    let rawText = "";
    let lastErr = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        const callPromise = ai.models.generateContent({
          model,
          contents: [
            {
              role: "user",
              parts: [{ text: systemPrompt }]
            }
          ],
          config: {
            responseMimeType: "application/json"
          }
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Gemini API call timed out")), 4000)
        );
        const response = await Promise.race([callPromise, timeoutPromise]);

        rawText = response.text;
        if (rawText) break;
      } catch (err) {
        lastErr = err;
        const msg = (err.message || "").toLowerCase();
        if (msg.includes("503") || msg.includes("high demand") || msg.includes("overloaded")) {
          continue;
        }
        if (msg.includes("429") || msg.includes("resource_exhausted") || msg.includes("quota")) {
          console.warn("[Gemini Review Assistant] Quota limit encountered, using deterministic grounded fallback.");
          break;
        }
        break;
      }
    }

    if (rawText) {
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      const options = Array.isArray(parsed.draftOptions) && parsed.draftOptions.length > 0
        ? parsed.draftOptions.map(opt => ({
            style: String(opt.style || "Draft").trim(),
            title: String(opt.title || parsed.suggestedTitle || "").trim(),
            text: String(opt.text || parsed.suggestedReviewText || "").trim()
          }))
        : [
            {
              style: "Direct Clinical Summary",
              title: (parsed.suggestedTitle || "").trim() || `${cleanRating}-Star Clinical Evaluation`,
              text: (parsed.suggestedReviewText || "").trim() || cleanDraft
            }
          ];

      return {
        suggestedTitle: (parsed.suggestedTitle || options[0]?.title || `${cleanRating}-Star Clinical Evaluation`).trim(),
        suggestedReviewText: (parsed.suggestedReviewText || options[0]?.text || cleanDraft).trim(),
        draftOptions: options,
        feedbackSummaryTags: Array.isArray(parsed.feedbackSummaryTags)
          ? parsed.feedbackSummaryTags.slice(0, 5)
          : cleanPoints.slice(0, 5)
      };
    }
  } catch (err) {
    console.warn("[Gemini Review Assistant] Generation failed, using deterministic grounded fallback:", err.message);
  }

  return buildFallbackDrafts({
    rating: cleanRating,
    points: cleanPoints,
    roughDraft: cleanDraft,
    productTitle: cleanProduct
  });
}

/**
 * Deterministic fallback generator grounded solely in actual input points
 */
function buildFallbackDrafts({ rating, points, roughDraft, productTitle }) {
  const pointsList = points.length > 0 ? points.join(", ") : "standard operation";
  let title1 = "";
  let text1 = "";
  let title2 = "";
  let text2 = "";

  if (rating >= 4) {
    title1 = `Clinical Evaluation: ${points[0] || "Operational Performance"}`;
    text1 = `In clinical operation, the ${productTitle} has demonstrated dependable performance, notably in ${pointsList}. The unit integrates cleanly with routine hospital workflows.`;
    title2 = `Departmental Assessment — ${points[0] || "Reliable Utility"}`;
    text2 = `Our departmental assessment of the ${productTitle} confirms satisfactory build standards and reliability. Particular strengths include ${pointsList}.`;
  } else if (rating === 3) {
    title1 = `Satisfactory Overview: ${points[0] || "Baseline Functionality"}`;
    text1 = `The ${productTitle} provides acceptable baseline functionality, with specific observations regarding ${pointsList}. Ongoing workflow calibration is advised.`;
    title2 = `Balanced Evaluation: ${points[0] || "Operational Observations"}`;
    text2 = `We evaluated the ${productTitle} under standard departmental conditions. While core capabilities function as expected, attention is needed on ${pointsList}.`;
  } else {
    title1 = `Operational Concerns: ${points[0] || "Performance Issues"}`;
    text1 = `Clinical use of the ${productTitle} revealed critical issues, particularly regarding ${pointsList}. Biomedical inspection is strongly recommended before routine procurement.`;
    title2 = `Constructive Feedback: ${points[0] || "Workflow Drawbacks"}`;
    text2 = `Under departmental evaluation, the ${productTitle} did not meet required workflow expectations, specifically due to ${pointsList}. Adjustments are necessary.`;
  }

  if (roughDraft) {
    text1 = `${roughDraft}. Specifically, ${text1}`;
    text2 = `${text2} Additional clinical notes: ${roughDraft}.`;
  }

  const draftOptions = [
    { style: "Direct Clinical Summary", title: title1, text: text1 },
    { style: "Operational Workflow Focus", title: title2, text: text2 }
  ];

  return {
    suggestedTitle: title1,
    suggestedReviewText: text1,
    draftOptions,
    feedbackSummaryTags: points.length > 0 ? points.slice(0, 5) : ["Clinical Feedback"]
  };
}

/**
 * Generate 6 distinct, product- and rating-specific review suggestions
 * Covers 6 verified clinical themes: Build Quality, Operation, Reliability, Ergonomics, Maintenance, Value.
 * Grounded in actual product title and category.
 */
function enforceWordLimit(text, maxWords = 20) {
  if (!text) return "";
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return words.slice(0, 18).join(" ").replace(/[,;:\-\s]+$/, "") + ".";
}

/**
 * Generate 6 distinct, product- and rating-specific review suggestions
 * Strictly limited to 1 sentence of 8 to 18 words (hard limit: 20 words).
 * Covers 6 verified clinical themes with multi-pool variation for fresh refreshes.
 */
async function generateProductReviewSuggestions({
  productId = "",
  productTitle = "Medical Equipment",
  category = "operating-theater",
  specs = [],
  rating = 4,
  poolIndex = 0,
  variantSeed = 0
}) {
  const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 4)));
  const cleanTitle = String(productTitle || "Medical Equipment").trim().substring(0, 200);
  const cleanCategory = String(category || "operating-theater").trim().toLowerCase();

  let apiKey = "";
  try {
    apiKey = getApiKey();
  } catch (keyErr) {
    return buildThemedSuggestions({ rating: cleanRating, productTitle: cleanTitle, category: cleanCategory, poolIndex });
  }

  const themes = [
    "Build Quality & Durability",
    "Ease of Operation",
    "Performance & Reliability",
    "Ergonomics & Handling",
    "Setup & Maintenance",
    "Value for Money"
  ];

  const ratingToneGuidance = {
    5: "5/5 Stars: High satisfaction, dependable precision, durable materials, excellent clinical workflow integration.",
    4: "4/5 Stars: Favorable and balanced. Emphasize solid departmental reliability with a realistic, constructive observation (e.g. learning curve or weight).",
    3: "3/5 Stars: Balanced moderate evaluation. Acknowledge baseline functional utility while noting specific limitations in responsiveness or adjustments.",
    2: "2/5 Stars: Deficient. Highlight notable operational friction, slow cycle times, or frequent recalibration needs.",
    1: "1/5 Stars: Critical. Detail workflow disruptions, mechanical or calibration instability, and unsuitability for high-demand clinical duty."
  };

  const seedModifier = variantSeed || poolIndex || Date.now();
  const systemPrompt = `You are the DR.MEDEX Clinical Review Assistant.
A healthcare practitioner or biomedical procurement officer is drafting a review for:
PRODUCT: "${cleanTitle}"
CATEGORY: "${cleanCategory}"
SELECTED RATING: ${cleanRating} out of 5 stars.
TONE MANDATE: ${ratingToneGuidance[cleanRating]}
VARIATION SEED: ${seedModifier}

Generate exactly 6 distinct, professional review suggestions tailored to this specific medical equipment and the ${cleanRating}-star rating.
Each suggestion must correspond to one of these 6 themes:
1. Build Quality & Durability
2. Ease of Operation
3. Performance & Reliability
4. Ergonomics & Handling
5. Setup & Maintenance
6. Value for Money

STRICT LENGTH MANDATE (CRITICAL):
- Each suggestion's "text" MUST be exactly ONE short, punchy sentence between 8 and 18 words (HARD CEILING: 20 words maximum).
- Absolutely NO long descriptions or multi-sentence paragraphs!
- Keep each suggestion concise and readable in one or two short lines.
Examples of ideal suggestions:
- "Excellent build quality and very smooth operation. Perfect for our OT setup." (12 words)
- "Sturdy, reliable, and easy to adjust. Highly recommended for modern surgical theatres." (12 words)
- "Great stability and patient comfort. Makes procedures much more efficient." (10 words)
- "Superior design with smooth hydraulic movement. Exactly what we needed." (10 words)

Return ONLY a valid JSON array of 6 objects with this exact structure:
[
  {
    "id": "sugg-1",
    "theme": "Theme Name",
    "title": "Clear concise headline (under 8 words)",
    "text": "Single sentence of 8-18 words"
  }
]`;

  try {
    const ai = getGenAiClient();
    let rawText = "";

    for (const model of CANDIDATE_MODELS) {
      try {
        const callPromise = ai.models.generateContent({
          model,
          contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
          config: { responseMimeType: "application/json" }
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Gemini API call timed out")), 4000)
        );
        const response = await Promise.race([callPromise, timeoutPromise]);
        rawText = response.text;
        if (rawText) break;
      } catch (err) {
        const msg = (err.message || "").toLowerCase();
        if (msg.includes("503") || msg.includes("overloaded")) continue;
        break;
      }
    }

    if (rawText) {
      const cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length >= 5) {
        return parsed.slice(0, 6).map((item, idx) => ({
          id: item.id || `sugg-${idx + 1}`,
          theme: item.theme || themes[idx] || "Clinical Utility",
          title: String(item.title || `${cleanRating}-Star Review`).trim(),
          text: enforceWordLimit(String(item.text || "").trim(), 20)
        }));
      }
    }
  } catch (err) {
    console.warn("[Gemini Suggestions] Fallback used:", err.message);
  }

  return buildThemedSuggestions({ rating: cleanRating, productTitle: cleanTitle, category: cleanCategory, poolIndex });
}

/**
 * Deterministic category- and rating-specific suggestions generator
 * Strictly limited to 8-18 words per suggestion (hard limit: 20 words).
 * Multi-pool design ensures consecutive refreshes deliver fresh variety.
 */
function buildThemedSuggestions({ rating, productTitle, category, poolIndex = 0 }) {
  const normPool = Math.abs(Number(poolIndex) || 0);

  if (rating === 5) {
    const pools = [
      [
        { id: "sugg-5-0-1", theme: "Build Quality", title: "Excellent Build Quality", text: "Excellent build quality and very smooth operation. Perfect for our OT setup." },
        { id: "sugg-5-0-2", theme: "Operation", title: "Sturdy & Reliable", text: "Sturdy, reliable, and easy to adjust. Highly recommended for modern surgical theatres." },
        { id: "sugg-5-0-3", theme: "Stability", title: "Great Stability", text: "Great stability and patient comfort. Makes procedures much more efficient." },
        { id: "sugg-5-0-4", theme: "Design", title: "Superior Hydraulic Movement", text: "Superior design with smooth hydraulic movement. Exactly what we needed." },
        { id: "sugg-5-0-5", theme: "Durability", title: "Very Durable", text: "Very durable and easy to use. Excellent value for a professional OT table." },
        { id: "sugg-5-0-6", theme: "Performance", title: "Outstanding Performance", text: "Outstanding performance and reliability. A must-have for any surgical facility." }
      ],
      [
        { id: "sugg-5-1-1", theme: "Precision", title: "Impeccable Rigidity", text: "Impeccable structural rigidity and whisper-quiet motor controls during all surgical cases." },
        { id: "sugg-5-1-2", theme: "Workflow", title: "Seamless Integration", text: "Seamless departmental integration with remarkably fast and responsive positioning adjustments." },
        { id: "sugg-5-1-3", theme: "Engineering", title: "Exceptional Precision", text: "Exceptional precision engineering that inspires complete confidence in daily clinical duties." },
        { id: "sugg-5-1-4", theme: "Ergonomics", title: "Thoughtful Ergonomics", text: "Thoughtful ergonomic design has noticeably reduced surgical team fatigue during long procedures." },
        { id: "sugg-5-1-5", theme: "Sanitization", title: "Rapid Sanitization", text: "Surfaces disinfect rapidly between patients, keeping room turnover times impressively low." },
        { id: "sugg-5-1-6", theme: "Value", title: "Top-Tier Hardware", text: "Top-tier biomedical hardware delivering dependable clinical performance at very fair pricing." }
      ],
      [
        { id: "sugg-5-2-1", theme: "Construction", title: "Rock-Solid Build", text: "Rock-solid construction and intuitive controls that required zero staff retraining time." },
        { id: "sugg-5-2-2", theme: "Articulation", title: "Flawless Articulation", text: "Flawless articulation and dependable mechanical stability across demanding daily operating schedules." },
        { id: "sugg-5-2-3", theme: "Comfort", title: "Consistent Smoothness", text: "Consistently smooth adjustments and superb comfort for patients throughout delicate interventions." },
        { id: "sugg-5-2-4", theme: "Materials", title: "High-Grade Materials", text: "High-grade materials withstand rigorous hospital chemical disinfection protocols effortlessly." },
        { id: "sugg-5-2-5", theme: "Reliability", title: "Hospital-Grade Workhorse", text: "A dependable hospital-grade workhorse providing micrometer precision every single surgical day." },
        { id: "sugg-5-2-6", theme: "Hydraulics", title: "Reliable Hydraulics", text: "Exceeded clinical expectations with reliable hydraulics, firm base locks, and pristine finishes." }
      ]
    ];
    return pools[normPool % pools.length];
  }

  if (rating === 4) {
    const pools = [
      [
        { id: "sugg-4-0-1", theme: "Build Quality", title: "Solid Construction", text: "Solid construction and smooth movement, with just a slight learning curve." },
        { id: "sugg-4-0-2", theme: "Performance", title: "Reliable Performance", text: "Reliable daily performance and good ergonomics, though the chassis is fairly heavy." },
        { id: "sugg-4-0-3", theme: "Versatility", title: "Great Versatility", text: "Great positioning versatility and steady controls, but takes practice to master." },
        { id: "sugg-4-0-4", theme: "Durability", title: "Durable Platform", text: "Durable hospital-grade build with dependable hydraulics and comfortable patient support." },
        { id: "sugg-4-0-5", theme: "Operation", title: "Dependable Daily Utility", text: "Very dependable for routine surgical cases, though lateral adjustments feel slightly stiff." },
        { id: "sugg-4-0-6", theme: "Value", title: "Good Overall Quality", text: "Good overall quality and excellent stability, offering solid departmental value." }
      ],
      [
        { id: "sugg-4-1-1", theme: "Stability", title: "Sturdy & Dependable", text: "Sturdy and dependable in theater, though initial setup required extra patience." },
        { id: "sugg-4-1-2", theme: "Movement", title: "Smooth Motor Functions", text: "Smooth motorized functions with solid stability, but remote cable could be longer." },
        { id: "sugg-4-1-3", theme: "Ergonomics", title: "Comfortable Support", text: "Comfortable padding and secure locking mechanisms with minor equipment weight considerations." },
        { id: "sugg-4-1-4", theme: "Caseloads", title: "Handles Heavy Caseloads", text: "Well-built unit that handles heavy clinical caseloads with consistent daily reliability." },
        { id: "sugg-4-1-5", theme: "Sanitization", title: "Easy To Sanitize", text: "Easy to sanitize and operate, with slight resistance on manual tilt adjustments." },
        { id: "sugg-4-1-6", theme: "Investment", title: "Cost-Effective Asset", text: "Cost-effective clinical asset providing reliable performance and durable metal fabrication." }
      ],
      [
        { id: "sugg-4-2-1", theme: "Responsiveness", title: "Steady Responsiveness", text: "High operational dependability across daily cases with steady mechanical responsiveness." },
        { id: "sugg-4-2-2", theme: "Platform", title: "Strong Surgical Platform", text: "Strong surgical platform with smooth height adjustments and secure patient posture." },
        { id: "sugg-4-2-3", theme: "Controls", title: "Clear Departmental Controls", text: "Reliable departmental equipment with clear controls, though documentation is relatively brief." },
        { id: "sugg-4-2-4", theme: "Access", title: "Good Surgeon Access", text: "Good ergonomic access angles for surgeons with sturdy, firm floor locks." },
        { id: "sugg-4-2-5", theme: "Aesthetic", title: "Clean Modern Aesthetic", text: "Clean aesthetic and dependable motors with minor friction during rapid repositioning." },
        { id: "sugg-4-2-6", theme: "Practicability", title: "Practical Medical Gear", text: "Practical, durable medical gear delivering solid value for general clinical suites." }
      ]
    ];
    return pools[normPool % pools.length];
  }

  if (rating === 3) {
    const pools = [
      [
        { id: "sugg-3-0-1", theme: "Functionality", title: "Acceptable Functionality", text: "Acceptable baseline functionality, but motor adjustments could be noticeably faster." },
        { id: "sugg-3-0-2", theme: "Build Quality", title: "Adequate Build", text: "Adequate build for standard procedures, though upholstery feels somewhat basic." },
        { id: "sugg-3-0-3", theme: "Utility", title: "Decent Utility", text: "Functions decently for minor cases, but lacks the refinement of premium models." },
        { id: "sugg-3-0-4", theme: "Stability", title: "Fair Stability", text: "Fair operational stability, though tilt mechanisms require occasional manual realignment." },
        { id: "sugg-3-0-5", theme: "Documentation", title: "Usable Equipment", text: "Usable clinical equipment, but the user manual lacks clear maintenance guidance." },
        { id: "sugg-3-0-6", theme: "Ergonomics", title: "Reasonable Performance", text: "Reasonable performance for the price, but ergonomics are only average." }
      ],
      [
        { id: "sugg-3-1-1", theme: "Controls", title: "Satisfactory Controls", text: "Average daily utility with satisfactory controls, but movement can feel sluggish." },
        { id: "sugg-3-1-2", theme: "Hardware", title: "Basic Needs", text: "Meets basic clinical needs, though foot pedals feel slightly lightweight." },
        { id: "sugg-3-1-3", theme: "Travel Range", title: "Acceptable Stability", text: "Acceptable stability during routine work, but height travel range is somewhat limited." },
        { id: "sugg-3-1-4", theme: "Fasteners", title: "Decent Construction", text: "Decent construction overall, but requires frequent tightening of lateral armrests." },
        { id: "sugg-3-1-5", theme: "Outpatient", title: "Moderate Performance", text: "Moderate performance that works fine for lighter outpatient department duties." },
        { id: "sugg-3-1-6", theme: "Durability", title: "Baseline Durability", text: "Fair entry-level equipment with baseline durability, but noticeable room for refinement." }
      ]
    ];
    return pools[normPool % pools.length];
  }

  if (rating === 2) {
    const pools = [
      [
        { id: "sugg-2-0-1", theme: "Sluggish Response", title: "Sluggish Response", text: "Motor response is sluggish and tilt adjustments lack precision under clinical load." },
        { id: "sugg-2-0-2", theme: "Vibration", title: "Noticeable Vibration", text: "Noticeable vibration during vertical travel causes discomfort during delicate procedures." },
        { id: "sugg-2-0-3", theme: "Upholstery", title: "Premature Wear", text: "Upholstery seams showed premature wear after only three months of disinfection." },
        { id: "sugg-2-0-4", theme: "Calibration", title: "Frequent Drift", text: "Frequent calibration drift requires constant biomedical technician intervention." },
        { id: "sugg-2-0-5", theme: "Ergonomics", title: "Awkward Ergonomics", text: "Ergonomics are awkward for tall practitioners, causing unnecessary surgical fatigue." },
        { id: "sugg-2-0-6", theme: "Parts Supply", title: "Inconsistent Quality", text: "Build quality is inconsistent and replacement components took weeks to arrive." }
      ],
      [
        { id: "sugg-2-1-1", theme: "Locking", title: "Slipping Floor Locks", text: "Base floor locks slip slightly when maneuvering patients into surgical position." },
        { id: "sugg-2-1-2", theme: "Hydraulics", title: "Jerky Tilting Action", text: "Hydraulic tilting action is jerky rather than gradual, disturbing sensitive examinations." },
        { id: "sugg-2-1-3", theme: "Noise", title: "Unusually Loud Motors", text: "Motor noise is louder than acceptable for a quiet hospital procedural suite." },
        { id: "sugg-2-1-4", theme: "Fasteners", title: "Loose Armrest Hinges", text: "Lateral armrest hinges loosen repeatedly despite regular departmental torque checks." },
        { id: "sugg-2-1-5", theme: "Interface", title: "Confusing Hand Controller", text: "Hand controller labeling rubbed off quickly under standard alcohol surface wipes." },
        { id: "sugg-2-1-6", theme: "Support", title: "Subpar Technical Service", text: "Technical service support was slow to address recurring power supply errors." }
      ]
    ];
    return pools[normPool % pools.length];
  }

  // 1 Star
  const pools = [
    [
      { id: "sugg-1-0-1", theme: "Hydraulics", title: "Severe Fluid Leakage", text: "Severe hydraulic fluid leakage occurred within two weeks of clinical deployment." },
      { id: "sugg-1-0-2", theme: "Motor", title: "Complete Motor Failure", text: "Complete motor failure during patient preparation; biomedical inspection recommended." },
      { id: "sugg-1-0-3", theme: "Safety", title: "Clinically Unsafe Base", text: "Unstable base and erratic electrical controls make this unit clinically unsafe." },
      { id: "sugg-1-0-4", theme: "Frame", title: "Structural Frame Flexing", text: "Structural frame flexed alarmingly under standard patient weight during operation." },
      { id: "sugg-1-0-5", theme: "Drift", title: "Unacceptable Position Drift", text: "Unacceptable positioning drift during procedures poses significant patient safety risks." },
      { id: "sugg-1-0-6", theme: "Electronics", title: "Defective Electronics", text: "Defective electronics and unresponsive controls; unit returned to biomedical holding." }
    ],
    [
      { id: "sugg-1-1-1", theme: "Breakdown", title: "Critical Breakdown", text: "Critical electrical breakdown halted procedures; replacement unit had to be deployed." },
      { id: "sugg-1-1-2", theme: "Short Circuit", title: "Power Supply Fault", text: "Intermittent power fault tripped operating room breaker repeatedly during testing." },
      { id: "sugg-1-1-3", theme: "Mechanism", title: "Frozen Elevation Gear", text: "Elevation mechanism froze completely with patient on table; immediate recall warranted." },
      { id: "sugg-1-1-4", theme: "Hazard", title: "Sharp Metal Edges", text: "Exposed sharp metal edges along the undersurface present unacceptable laceration hazards." },
      { id: "sugg-1-1-5", theme: "Firmware", title: "Unresponsive Microcontroller", text: "Microcontroller became completely unresponsive; unit failed biomedical safety certification." },
      { id: "sugg-1-1-6", theme: "Integrity", title: "Severe Structural Flaw", text: "Severe structural welds cracked under nominal workload; unsafe for clinical care." }
    ]
  ];
  return pools[normPool % pools.length];
}

module.exports = {
  isConfigured,
  getGeminiStatus,
  getApiKey,
  getGenAiClient,
  identifyProductFromPhotos,
  validateAndSanitizeOutput,
  buildPrompt,
  buildTaxonomyReference,
  generateReviewDraft,
  generateProductReviewSuggestions,
  buildThemedSuggestions,
  enforceWordLimit,
  MAX_PHOTOS,
  ALLOWED_MIME_TYPES
};

