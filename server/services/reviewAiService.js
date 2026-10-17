/**
 * DR.MEDEX AI Review Assistant Bridge & Multi-Provider Orchestrator
 * Supports Cloudflare Workers AI with seamless Gemini and deterministic fallbacks.
 * 
 * Configured via:
 * - REVIEW_AI_PROVIDER: "cloudflare" | "gemini" (default: "cloudflare" if configured, else "gemini")
 * - CLOUDFLARE_ACCOUNT_ID: Server-side account ID
 * - CLOUDFLARE_API_TOKEN: Server-side API token
 * - CLOUDFLARE_AI_MODEL: e.g. "@cf/meta/llama-3.1-8b-instruct"
 * - GEMINI_API_KEY: Server-side Google Gemini key
 */

const cloudflareAiService = require("./cloudflareAiService");
const geminiVisionService = require("./geminiVisionService");

/**
 * Determine the intended active provider from environment
 */
function getConfiguredProvider() {
  const envProvider = String(process.env.REVIEW_AI_PROVIDER || "").trim().toLowerCase();
  if (envProvider === "gemini") return "gemini";
  if (envProvider === "cloudflare") return "cloudflare";

  // Auto-detect: prefer cloudflare if credentials exist, else gemini
  return cloudflareAiService.isConfigured() ? "cloudflare" : "gemini";
}

/**
 * Safe status inspect function (never reveals secret values)
 */
function getProviderStatus() {
  const configuredProvider = getConfiguredProvider();
  const cfStatus = cloudflareAiService.getStatus();
  const geminiConfigured = geminiVisionService.isConfigured();

  let activeProvider = configuredProvider;
  let fallbackReason = null;

  if (configuredProvider === "cloudflare" && !cfStatus.configured) {
    activeProvider = geminiConfigured ? "gemini" : "deterministic-fallback";
    fallbackReason = !cfStatus.hasAccountId
      ? "CLOUDFLARE_ACCOUNT_ID not configured; using Gemini fallback"
      : "CLOUDFLARE_API_TOKEN not configured; using Gemini fallback";
  }

  return {
    configuredProvider,
    activeProvider,
    fallbackReason,
    cloudflare: cfStatus,
    gemini: { configured: geminiConfigured }
  };
}

/**
 * Generate 6 review suggestions with multi-provider resilience:
 * 1. Primary: Configured provider (Cloudflare Workers AI or Gemini)
 * 2. Secondary: Configurable fallback provider (Gemini or Cloudflare)
 * 3. Final: Grounded non-AI deterministic clinical templates
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

  const provider = getConfiguredProvider();

  // Route 1: Cloudflare Workers AI Primary
  if (provider === "cloudflare") {
    if (cloudflareAiService.isConfigured()) {
      try {
        const cfResult = await cloudflareAiService.generateProductReviewSuggestions({
          productId,
          productTitle: cleanTitle,
          category: cleanCategory,
          rating: cleanRating,
          poolIndex,
          variantSeed
        });

        if (cfResult.success && Array.isArray(cfResult.suggestions) && cfResult.suggestions.length === 6) {
          return {
            success: true,
            suggestions: cfResult.suggestions,
            provider: "cloudflare",
            model: cfResult.model,
            fallbackUsed: false
          };
        }

        console.warn(`[Review AI] Cloudflare generation failed (${cfResult.reason || cfResult.error}); initiating Gemini fallback.`);
      } catch (cfErr) {
        console.warn(`[Review AI] Cloudflare request exception (${cfErr.message}); initiating Gemini fallback.`);
      }
    } else {
      console.info("[Review AI] Cloudflare credentials incomplete; using Gemini provider directly.");
    }

    // Fallback to Gemini
    try {
      const geminiResult = await geminiVisionService.generateProductReviewSuggestions({
        productId,
        productTitle: cleanTitle,
        category: cleanCategory,
        specs,
        rating: cleanRating,
        poolIndex,
        variantSeed
      });

      if (Array.isArray(geminiResult) && geminiResult.length === 6) {
        return {
          success: true,
          suggestions: geminiResult,
          provider: "gemini",
          fallbackUsed: true,
          fallbackReason: "Cloudflare unavailable or rate-limited"
        };
      }
    } catch (geminiErr) {
      console.warn(`[Review AI] Gemini fallback failed (${geminiErr.message}); using non-AI templates.`);
    }

    // Final deterministic non-AI fallback
    const fallbackSuggestions = geminiVisionService.buildThemedSuggestions({
      rating: cleanRating,
      productTitle: cleanTitle,
      category: cleanCategory,
      poolIndex
    });

    return {
      success: true,
      suggestions: fallbackSuggestions,
      provider: "deterministic-fallback",
      fallbackUsed: true,
      fallbackReason: "Both AI providers unavailable"
    };
  }

  // Route 2: Gemini Primary
  try {
    const geminiResult = await geminiVisionService.generateProductReviewSuggestions({
      productId,
      productTitle: cleanTitle,
      category: cleanCategory,
      specs,
      rating: cleanRating,
      poolIndex,
      variantSeed
    });

    if (Array.isArray(geminiResult) && geminiResult.length === 6) {
      return {
        success: true,
        suggestions: geminiResult,
        provider: "gemini",
        fallbackUsed: false
      };
    }
  } catch (err) {
    console.warn(`[Review AI] Gemini generation error (${err.message}); trying Cloudflare or templates.`);
    if (cloudflareAiService.isConfigured()) {
      const cfResult = await cloudflareAiService.generateProductReviewSuggestions({
        productId,
        productTitle: cleanTitle,
        category: cleanCategory,
        rating: cleanRating,
        poolIndex,
        variantSeed
      });
      if (cfResult.success && Array.isArray(cfResult.suggestions) && cfResult.suggestions.length === 6) {
        return {
          success: true,
          suggestions: cfResult.suggestions,
          provider: "cloudflare",
          model: cfResult.model,
          fallbackUsed: true
        };
      }
    }
  }

  // Final deterministic fallback
  const fallbackSuggestions = geminiVisionService.buildThemedSuggestions({
    rating: cleanRating,
    productTitle: cleanTitle,
    category: cleanCategory,
    poolIndex
  });

  return {
    success: true,
    suggestions: fallbackSuggestions,
    provider: "deterministic-fallback",
    fallbackUsed: true,
    fallbackReason: "Gemini primary unavailable"
  };
}

module.exports = {
  getConfiguredProvider,
  getProviderStatus,
  generateProductReviewSuggestions,
  generateReviewDraft: geminiVisionService.generateReviewDraft
};
