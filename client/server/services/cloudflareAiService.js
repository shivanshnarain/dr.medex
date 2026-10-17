/**
 * Cloudflare Workers AI Service for DR.MEDEX Medical Review Suggestions
 * Uses official Cloudflare Workers AI REST API:
 * https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL_ID}
 * 
 * Security:
 * - Credentials never hardcoded, never logged, never exposed to clients
 * - Safe environment variable validation
 * - Handles rate limits, timeouts, and quota exhaustion gracefully
 */

const { enforceWordLimit } = require("./geminiVisionService");

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const REQUEST_TIMEOUT_MS = 12000;

function getCredentials() {
  const accountId = String(process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const apiToken = String(process.env.CLOUDFLARE_API_TOKEN || "").trim();
  const model = String(process.env.CLOUDFLARE_AI_MODEL || DEFAULT_MODEL).trim();

  return { accountId, apiToken, model };
}

/**
 * Check if Cloudflare Workers AI has minimum credentials configured
 */
function isConfigured() {
  const { accountId, apiToken } = getCredentials();
  return Boolean(accountId && apiToken);
}

/**
 * Return safe non-sensitive configuration status (names/presence only, no values)
 */
function getStatus() {
  const { accountId, apiToken, model } = getCredentials();
  return {
    configured: Boolean(accountId && apiToken),
    hasAccountId: Boolean(accountId),
    hasApiToken: Boolean(apiToken),
    model: model || DEFAULT_MODEL
  };
}

/**
 * Execute inference request against Cloudflare Workers AI REST API
 */
async function runInference({ messages, prompt, timeoutMs = REQUEST_TIMEOUT_MS }) {
  const { accountId, apiToken, model } = getCredentials();

  if (!accountId || !apiToken) {
    return {
      success: false,
      reason: !accountId ? "MISSING_ACCOUNT_ID" : "MISSING_API_TOKEN",
      message: !accountId
        ? "CLOUDFLARE_ACCOUNT_ID is not set in environment."
        : "CLOUDFLARE_API_TOKEN is not set in environment."
    };
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const payload = messages && Array.isArray(messages)
    ? { messages, max_tokens: 512, temperature: 0.6 }
    : { prompt: String(prompt || ""), max_tokens: 512, temperature: 0.6 };

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timer);

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.success) {
      const errorMsg = data?.errors?.[0]?.message || `HTTP ${res.status} ${res.statusText}`;
      const errorCode = data?.errors?.[0]?.code || res.status;
      return {
        success: false,
        status: res.status,
        code: errorCode,
        error: errorMsg,
        model
      };
    }

    let rawResponse = "";
    if (typeof data.result?.response === "string") {
      rawResponse = data.result.response;
    } else if (data.result?.response && typeof data.result.response === "object") {
      rawResponse = JSON.stringify(data.result.response);
    } else if (data.result?.choices?.[0]?.message?.content) {
      rawResponse = data.result.choices[0].message.content;
    } else if (typeof data.result?.text === "string") {
      rawResponse = data.result.text;
    } else {
      rawResponse = String(data.result?.response || data.result?.text || "");
    }

    return {
      success: true,
      response: String(rawResponse).trim(),
      rawResult: data.result,
      model
    };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === "AbortError";
    return {
      success: false,
      reason: isTimeout ? "TIMEOUT" : "NETWORK_ERROR",
      error: isTimeout ? "Cloudflare Workers AI request timed out" : err.message,
      model
    };
  }
}

/**
 * Generate 6 distinct, product-specific review suggestions using Cloudflare Workers AI
 * Strictly enforced to 8–18 words per suggestion (hard maximum: 20 words).
 */
async function generateProductReviewSuggestions({
  productId = "",
  productTitle = "Medical Equipment",
  category = "operating-theater",
  rating = 4,
  poolIndex = 0,
  variantSeed = 0
}) {
  const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 4)));
  const cleanTitle = String(productTitle || "Medical Equipment").trim().substring(0, 200);
  const cleanCategory = String(category || "operating-theater").trim().toLowerCase();

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
    4: "4/5 Stars: Favorable and balanced. Emphasize solid departmental reliability with a realistic, constructive observation (e.g. learning curve or equipment weight).",
    3: "3/5 Stars: Balanced moderate evaluation. Acknowledge baseline functional utility while noting specific limitations in responsiveness or adjustments.",
    2: "2/5 Stars: Deficient. Highlight notable operational friction, slow cycle times, or frequent recalibration needs.",
    1: "1/5 Stars: Critical. Detail workflow disruptions, mechanical or calibration instability, and unsuitability for high-demand clinical duty."
  };

  const seed = variantSeed || poolIndex || Date.now();
  const systemPrompt = `You are the DR.MEDEX Clinical Review Assistant.
A healthcare practitioner or biomedical procurement officer is drafting a review for:
PRODUCT: "${cleanTitle}"
CATEGORY: "${cleanCategory}"
SELECTED RATING: ${cleanRating} out of 5 stars.
TONE MANDATE: ${ratingToneGuidance[cleanRating]}
VARIATION SEED: ${seed}

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
Examples:
- "Excellent build quality and very smooth operation. Perfect for our OT setup." (12 words)
- "Sturdy, reliable, and easy to adjust. Highly recommended for modern surgical theatres." (12 words)
- "Great stability and patient comfort. Makes procedures much more efficient." (10 words)

Return ONLY a valid JSON array of 6 objects with this exact structure:
[
  {
    "id": "sugg-1",
    "theme": "Theme Name",
    "title": "Clear concise headline (under 8 words)",
    "text": "Single sentence of 8-18 words"
  }
]`;

  const inferenceResult = await runInference({
    messages: [
      { role: "system", content: "You are a professional biomedical assistant that outputs only valid JSON." },
      { role: "user", content: systemPrompt }
    ]
  });

  if (!inferenceResult.success || !inferenceResult.response) {
    return {
      success: false,
      reason: inferenceResult.reason || "INFERENCE_FAILED",
      error: inferenceResult.error || "No response from Cloudflare Workers AI",
      provider: "cloudflare",
      model: inferenceResult.model
    };
  }

  // Parse JSON response safely
  try {
    let parsed = null;
    if (Array.isArray(inferenceResult.rawResult?.response)) {
      parsed = inferenceResult.rawResult.response;
    } else {
      const raw = String(inferenceResult.response || "").trim();
      const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(jsonString);
    }

    if (Array.isArray(parsed) && parsed.length >= 5) {
      const suggestions = parsed.slice(0, 6).map((item, idx) => ({
        id: item.id || `sugg-cf-${cleanRating}-${poolIndex}-${idx + 1}`,
        theme: item.theme || themes[idx] || "Clinical Utility",
        title: String(item.title || `${cleanRating}-Star Review`).trim().substring(0, 60),
        text: enforceWordLimit(String(item.text || "").trim(), 20)
      }));

      return {
        success: true,
        suggestions,
        provider: "cloudflare",
        model: inferenceResult.model
      };
    }
  } catch (parseErr) {
    // If strict JSON parsing failed, try extracting bullet/quoted sentences
    const lines = String(inferenceResult.response || "")
      .split("\n")
      .map(l => l.replace(/^[\d\-*."\s]+/, "").replace(/["\s]+$/, "").trim())
      .filter(l => l.length >= 15 && l.length <= 150);

    if (lines.length >= 6) {
      const suggestions = lines.slice(0, 6).map((line, idx) => ({
        id: `sugg-cf-${cleanRating}-${poolIndex}-${idx + 1}`,
        theme: themes[idx] || "Clinical Utility",
        title: `${cleanRating}-Star Clinical Assessment`,
        text: enforceWordLimit(line, 20)
      }));

      return {
        success: true,
        suggestions,
        provider: "cloudflare",
        model: inferenceResult.model
      };
    }
  }

  return {
    success: false,
    reason: "MALFORMED_OUTPUT",
    error: "Cloudflare Workers AI did not return a valid 6-item array",
    provider: "cloudflare",
    model: inferenceResult.model
  };
}

module.exports = {
  isConfigured,
  getStatus,
  runInference,
  generateProductReviewSuggestions,
  DEFAULT_MODEL
};
