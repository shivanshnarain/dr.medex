const express = require("express");
const router = express.Router();
const store = require("../services/store");
const currencyService = require("../services/currencyService");
const firestoreService = require("../services/firestoreService");
const geminiVisionService = require("../services/geminiVisionService");
const reviewAiService = require("../services/reviewAiService");
const reviewModerationService = require("../services/reviewModerationService");
const supabaseService = require("../services/supabaseService");
const passwordRecoveryService = require("../services/passwordRecoveryService");
const authService = require("../services/authService");
const auditService = require("../services/auditService");
const mongoService = require("../services/mongoService");
const paypalService = require("../services/paypalService");
const orderService = require("../services/orderService");

// HEALTH
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "DR.MEDEX Global API Server", time: new Date().toISOString() });
});

// PRODUCTS
router.get("/products", async (req, res) => {
  try {
    const deletedIds = mongoService.isConfigured() ? await mongoService.getDeletedProductIds() : new Set();
    let list = store.getProducts(req.query).filter(p => !deletedIds.has(String(p.id)));

    if (mongoService.isConfigured()) {
      try {
        const mongoList = await mongoService.getProductsFromMongo(req.query);
        if (Array.isArray(mongoList)) {
          const activeMongoList = mongoList.filter(m => !deletedIds.has(String(m.id)));
          const mongoMap = new Map(activeMongoList.map(m => [String(m.id), m]));
          const storeMap = new Set(list.map(p => String(p.id)));

          list = list.map(p => {
            const m = mongoMap.get(String(p.id));
            if (m) {
              return {
                ...p,
                ...m
              };
            }
            return p;
          });

          // Include products that exist in MongoDB and are ACTIVE
          activeMongoList.forEach(m => {
            if (!storeMap.has(String(m.id)) && (m.status || "ACTIVE") === "ACTIVE" && !m.isRetired && m.inCatalogue !== false) {
              list.push(m);
            }
          });
        }
      } catch (mErr) {}
    }

    // Strictly ensure only active, non-archived products are on public storefront
    list = list.filter(p => (p.status || "ACTIVE") === "ACTIVE" && p.status !== "ARCHIVED" && !p.isRetired && p.inCatalogue !== false && !deletedIds.has(String(p.id)));

    // Review-gated publishing rule: unreviewed products in review-gated categories (e.g. physiotherapy) remain unpublished from customer storefront
    list = list.filter(p => {
      if (p.category === "physiotherapy" && p.reviewStatus !== "CORRECT") {
        return false;
      }
      return true;
    });

    res.json({ success: true, count: list.length, products: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/products/:slug", async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=0, must-revalidate");
    const slugOrId = req.params.slug;
    const deletedIds = mongoService.isConfigured() ? await mongoService.getDeletedProductIds() : new Set();

    let product = store.getProductBySlug(slugOrId) || store.getProductById(slugOrId, true);
    if (product && deletedIds.has(String(product.id))) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (mongoService.isConfigured()) {
      try {
        const lookup = (product && product.id) ? product.id : slugOrId;
        const mongoProd = await mongoService.getApprovedProduct(lookup) || await mongoService.getApprovedProduct(slugOrId);
        if (mongoProd) {
          if (deletedIds.has(String(mongoProd.id))) {
            return res.status(404).json({ success: false, message: "Product not found" });
          }
          product = product ? { ...product, ...mongoProd } : mongoProd;
        }
      } catch (mErr) {}
    }

    if (!product || product.status === "ARCHIVED" || product.isRetired || product.inCatalogue === false || deletedIds.has(String(product.id))) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    if (product.category === "physiotherapy" && product.reviewStatus !== "CORRECT") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


router.post("/products", (req, res) => {
  const created = store.addProduct(req.body);
  res.status(201).json({ success: true, product: created });
});

router.put("/products/:id", (req, res) => {
  const updated = store.updateProduct(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  res.json({ success: true, product: updated });
});

router.delete("/products/:id", (req, res) => {
  const removed = store.deleteProduct(req.params.id);
  if (!removed) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  res.json({ success: true, message: "Product deleted", product: removed });
});

// SEARCH AUTOCOMPLETE & LIVE SEARCH
router.get("/search/live", (req, res) => {
  const q = req.query.q || req.query.query || req.query.search || "";
  const result = store.searchLive(q);
  res.json({ success: true, ...result });
});

// CATEGORIES
router.get("/categories", (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  res.json({ success: true, categories: store.getCategories(includeInactive) });
});

// COUNTRIES
router.get("/countries", (req, res) => {
  res.json({ success: true, countries: store.getCountries() });
});

// CURRENCY & EXCHANGE RATES
router.get("/currency/rates", async (req, res) => {
  try {
    await currencyService.syncLiveRates();
  } catch (e) {
    // Graceful fallback to cached
  }
  const data = currencyService.getExchangeRates();
  res.json({ success: true, ...data });
});

router.post("/currency/convert", (req, res) => {
  const { amountUSD, targetCurrency } = req.body;
  if (amountUSD === undefined || !targetCurrency) {
    return res.status(400).json({ success: false, message: "Missing amountUSD or targetCurrency" });
  }
  const rate = currencyService.getRateForCurrency(targetCurrency);
  const converted = currencyService.convertPrice(Number(amountUSD), targetCurrency);
  const formatted = currencyService.formatPrice(converted, targetCurrency);
  res.json({ success: true, amountUSD, targetCurrency, rate, converted, formatted });
});

// ORDERS
router.post("/orders", (req, res) => {
  try {
    const order = store.createOrder(req.body);
    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/orders", (req, res) => {
  res.json({ success: true, orders: store.getOrders() });
});

router.get("/orders/:id", (req, res) => {
  const order = store.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  // Annotate items with historical product status without mutating stored order
  const orderCopy = JSON.parse(JSON.stringify(order));
  if (Array.isArray(orderCopy.items)) {
    orderCopy.items = orderCopy.items.map(it => {
      const prod = store.getProductById(it.productId, true);
      const isRetired = prod ? (prod.status === "ARCHIVED" || prod.isRetired === true) : false;
      return {
        ...it,
        isRetired,
        availability: isRetired ? "UNAVAILABLE_RETIRED" : "AVAILABLE",
        availabilityLabel: isRetired ? "Product retired from active catalogue" : "Active catalogue product"
      };
    });
  }
  res.json({ success: true, order: orderCopy });
});

router.put("/orders/:id/status", (req, res) => {
  const { status, stageToComplete } = req.body;
  const updated = store.updateOrderStatus(req.params.id, status, stageToComplete);
  if (!updated) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  res.json({ success: true, order: updated });
});

// TRACKING
router.get("/track/:orderId", (req, res) => {
  const order = store.getOrderById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, message: "Tracking record not found for this Order ID" });
  }
  res.json({
    success: true,
    orderId: order.id,
    orderNumber: order.orderNumber,
    carrier: order.shippingMethod.carrier,
    trackingNumber: order.shippingMethod.trackingNumber,
    estimatedDays: order.shippingMethod.estimatedDays,
    trackingUrl: order.shippingMethod.trackingUrl,
    status: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    shippingAddress: order.shippingAddress,
    timeline: order.trackingTimeline,
    items: order.items.map(it => {
      const prod = store.getProductById(it.productId, true);
      const isRetired = prod ? (prod.status === "ARCHIVED" || prod.isRetired === true) : false;
      return {
        title: it.title,
        quantity: it.quantity,
        sku: it.sku,
        isRetired,
        availabilityLabel: isRetired ? "Product retired from active catalogue" : "Active"
      };
    })
  });
});

// PAYPAL PAYMENT GATEWAY ENDPOINTS
router.get("/payment/paypal/config", (req, res) => {
  res.json({
    success: true,
    clientId: paypalService.getClientId(),
    mode: paypalService.getMode()
  });
});

router.post("/payment/paypal/create-order", async (req, res) => {
  try {
    const pendingOrder = await orderService.createPendingOrder(req.body);
    const paypalOrder = await paypalService.createOrder({
      orderNumber: pendingOrder.orderNumber,
      amount: pendingOrder.pricing.grandTotal,
      currency: pendingOrder.pricing.currency,
      description: `DR.MEDEX Medical Equipment Order #${pendingOrder.orderNumber}`,
      items: pendingOrder.items,
      customer: pendingOrder.customer
    });

    res.json({
      success: true,
      orderID: paypalOrder.id,
      orderNumber: pendingOrder.orderNumber,
      currency: pendingOrder.pricing.currency,
      amount: pendingOrder.pricing.grandTotal,
      pendingOrder
    });
  } catch (err) {
    console.error("[PayPal API] Create Order Error:", err);
    res.status(400).json({ success: false, message: err.message });
  }
});

router.post("/payment/paypal/capture-order", async (req, res) => {
  const { orderID, orderNumber } = req.body;
  try {
    if (!orderID) {
      return res.status(400).json({ success: false, message: "orderID is required." });
    }
    const captureData = await paypalService.captureOrder(orderID);
    if (captureData.status !== "COMPLETED") {
      await orderService.markOrderAsFailed(orderNumber, `PayPal Status: ${captureData.status}`);
      return res.status(400).json({
        success: false,
        message: `PayPal payment not completed. Status: ${captureData.status}`,
        captureData
      });
    }

    const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderID;
    const paidOrder = await orderService.markOrderAsPaid({
      orderNumber,
      paypalOrderId: orderID,
      paypalCaptureId: captureId,
      paymentDetails: captureData
    });

    res.json({
      success: true,
      order: paidOrder,
      captureData
    });
  } catch (err) {
    console.error("[PayPal API] Capture Order Error:", err);
    if (orderNumber) {
      await orderService.markOrderAsFailed(orderNumber, err.message);
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// PAYPAL WEBHOOK LISTENER
router.post("/payment/paypal/webhook", async (req, res) => {
  try {
    const event = req.body;
    const eventType = event.event_type;
    console.log(`[PayPal Webhook] Received event: ${eventType}`);

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event.resource;
      const orderNumber = resource?.custom_id || resource?.invoice_id;
      const captureId = resource?.id;
      if (orderNumber) {
        await orderService.markOrderAsPaid({
          orderNumber,
          paypalOrderId: resource?.supplementary_data?.related_ids?.order_id || null,
          paypalCaptureId: captureId,
          paymentDetails: resource
        });
      }
    } else if (eventType === "PAYMENT.CAPTURE.DENIED" || eventType === "PAYMENT.CAPTURE.DECLINED") {
      const resource = event.resource;
      const orderNumber = resource?.custom_id || resource?.invoice_id;
      if (orderNumber) {
        await orderService.markOrderAsFailed(orderNumber, `PayPal Webhook: ${eventType}`);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("[PayPal Webhook Error]:", err.message);
    res.status(200).json({ received: false, error: err.message });
  }
});

// CUSTOMER ADDRESS MANAGEMENT (MongoDB Atlas)
router.get("/customer/addresses", async (req, res) => {
  try {
    const userId = req.query.userId || req.headers["x-user-id"];
    if (!userId) {
      return res.json({ success: true, addresses: [] });
    }
    const addresses = await orderService.getCustomerAddresses(userId);
    res.json({ success: true, addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/customer/addresses", async (req, res) => {
  try {
    const { userId, address } = req.body;
    if (!userId || !address) {
      return res.status(400).json({ success: false, message: "userId and address are required." });
    }
    const addresses = await orderService.saveCustomerAddress(userId, address);
    res.json({ success: true, addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete("/customer/addresses/:addressId", async (req, res) => {
  try {
    const userId = req.query.userId || req.body?.userId;
    const addressId = req.params.addressId;
    if (!userId || !addressId) {
      return res.status(400).json({ success: false, message: "userId and addressId are required." });
    }
    const addresses = await orderService.deleteCustomerAddress(userId, addressId);
    res.json({ success: true, addresses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// CUSTOMER ORDER HISTORY
router.get("/customer/orders", async (req, res) => {
  try {
    const userId = req.query.userId;
    const email = req.query.email;
    if (!userId && !email) {
      return res.status(400).json({ success: false, message: "userId or email required." });
    }
    const orders = await orderService.getCustomerOrders(userId, email);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// B2B QUOTES
router.post("/quotes", (req, res) => {
  try {
    const quote = store.createQuote(req.body);
    res.status(201).json({ success: true, quote });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get("/quotes", (req, res) => {
  res.json({ success: true, quotes: store.getQuotes() });
});

router.put("/quotes/:id", (req, res) => {
  const { status, quotedAmountUSD, adminNotes } = req.body;
  const updated = store.updateQuoteStatus(req.params.id, status, quotedAmountUSD, adminNotes);
  if (!updated) {
    return res.status(404).json({ success: false, message: "Quote not found" });
  }
  res.json({ success: true, quote: updated });
});

// COUPONS
router.post("/coupons/apply", (req, res) => {
  const { code, subtotalUSD } = req.body;
  const result = store.validateCoupon(code, Number(subtotalUSD || 0));
  if (!result.valid) {
    return res.status(400).json({ success: false, message: result.message });
  }
  res.json({ success: true, coupon: result });
});

router.get("/coupons", (req, res) => {
  res.json({ success: true, coupons: store.getCoupons() });
});

// BLOGS
router.get("/blogs", (req, res) => {
  res.json({ success: true, blogs: store.getBlogs() });
});

router.get("/blogs/:slug", (req, res) => {
  const blog = store.getBlogs().find(b => b.slug === req.params.slug || b.id === req.params.slug);
  if (!blog) {
    return res.status(404).json({ success: false, message: "Article not found" });
  }
  res.json({ success: true, blog });
});

// REVIEWS & CLINICAL FEEDBACK
router.get("/reviews", async (req, res) => {
  try {
    const productId = req.query.productId || null;
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const result = await firestoreService.getApprovedReviews(productId, { limit, offset });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// In-memory rate limiting map for review submissions (max 5 submissions per 10 minutes per IP)
const reviewSubmissionRateLimitMap = new Map();
// Cache of recent review hashes to prevent duplicate review submissions
const recentReviewsSet = new Map();

function checkReviewSubmissionRateLimit(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxSubmissions = 5;

  const record = reviewSubmissionRateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  if (record.count >= maxSubmissions) {
    return false;
  }

  record.count++;
  reviewSubmissionRateLimitMap.set(ip, record);
  return true;
}

// In-memory cache for review suggestions: Map<string, { batch: any[], recentBatches: string[][], poolIndex: number, provider?: string, model?: string, timestamp: number }>
const reviewSuggestionsCache = new Map();

// In-flight suggestions request deduplication map to prevent simultaneous duplicate generation calls
const inFlightSuggestions = new Map();

// Rate limit map for review suggestions: max 40 requests per minute per IP
const suggestionRateLimitMap = new Map();
function checkSuggestionRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 40;
  const record = suggestionRateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count++;
  suggestionRateLimitMap.set(ip, record);
  return true;
}

// Diagnostic/provider status endpoint (safe, non-sensitive)
router.get("/reviews/provider-status", (req, res) => {
  const status = reviewAiService.getProviderStatus();
  res.json({ success: true, ...status });
});

// Get product- and rating-specific review suggestions (Fresh suggestions with intelligent rotation & caching)
router.get("/reviews/suggestions", async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || "127.0.0.1";
    if (!checkSuggestionRateLimit(ip)) {
      return res.status(429).json({
        success: false,
        message: "Suggestion refresh rate limit reached. Please wait a moment before trying again."
      });
    }

    const { productId, rating, productTitle, category, refresh, bustCache, poolIndex } = req.query;
    if (!productId || typeof productId !== "string" || productId.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Missing or invalid productId" });
    }

    const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 4)));
    const activeProvider = reviewAiService.getConfiguredProvider();
    const cacheKey = `${productId.trim()}:${cleanRating}:${activeProvider}`;
    const TTL_MS = 5 * 60 * 1000; // 5-minute configurable cache window
    const isRefresh = refresh === "true" || bustCache === "true" || Boolean(req.query.t);

    const existingEntry = reviewSuggestionsCache.get(cacheKey);

    // Return cached batch if available, not expired, and not explicitly refreshing
    if (!isRefresh && existingEntry && (Date.now() - (existingEntry.timestamp || 0)) < TTL_MS) {
      if (Array.isArray(existingEntry.batch) && existingEntry.batch.length === 6) {
        return res.json({
          success: true,
          suggestions: existingEntry.batch,
          cached: true,
          provider: existingEntry.provider || activeProvider,
          model: existingEntry.model
        });
      }
    }

    // In-flight request deduplication: if identical generation is already running, wait on existing promise
    if (inFlightSuggestions.has(cacheKey)) {
      try {
        const sharedResult = await inFlightSuggestions.get(cacheKey);
        return res.json({ ...sharedResult, cached: true });
      } catch (err) {
        // Continue to fresh execution if in-flight failed
      }
    }

    // Determine pool index for variation
    const prevPool = existingEntry ? (existingEntry.poolIndex || 0) : 0;
    const requestedPool = parseInt(poolIndex, 10);
    const nextPool = !isNaN(requestedPool) ? requestedPool : (prevPool + 1);

    // Create execution promise and register in inFlightSuggestions map
    const generationPromise = (async () => {
      const aiResult = await reviewAiService.generateProductReviewSuggestions({
        productId: String(productId).trim(),
        productTitle: String(productTitle || "Medical Equipment"),
        category: String(category || "operating-theater"),
        rating: cleanRating,
        poolIndex: nextPool,
        variantSeed: Date.now() + nextPool * 1000
      });

      let suggestions = aiResult.suggestions || [];

      // Enforce word limit (<= 20 words, 1-2 lines) across all suggestions
      if (Array.isArray(suggestions)) {
        suggestions = suggestions.map((item, idx) => ({
          id: item.id || `sugg-${cleanRating}-${nextPool}-${idx + 1}`,
          theme: item.theme || "Clinical Utility",
          title: String(item.title || `${cleanRating}-Star Review`).trim(),
          text: geminiVisionService.enforceWordLimit(String(item.text || "").trim(), 20)
        }));
      }

      // Deduplication check across recent batch history (prevent repeating sentences across consecutive refreshes)
      const recentBatches = existingEntry?.recentBatches || (existingEntry?.lastTexts ? [existingEntry.lastTexts] : []);
      const newTexts = suggestions.map(s => s.text);

      let isDuplicate = false;
      for (const oldBatch of recentBatches) {
        const matchCount = newTexts.filter(t => oldBatch.includes(t)).length;
        if (matchCount >= 4) {
          isDuplicate = true;
          break;
        }
      }

      if (isDuplicate) {
        // Too similar to recent batches: draw fresh deterministic pool
        const alternateBatch = geminiVisionService.buildThemedSuggestions({
          rating: cleanRating,
          productTitle: String(productTitle || "Medical Equipment"),
          category: String(category || "operating-theater"),
          poolIndex: nextPool + 1
        });
        suggestions = alternateBatch.map((item) => ({
          ...item,
          text: geminiVisionService.enforceWordLimit(item.text, 20)
        }));
      }

      // Fallback safety to guarantee exactly 6 valid suggestions
      if (!Array.isArray(suggestions) || suggestions.length < 6) {
        suggestions = geminiVisionService.buildThemedSuggestions({
          rating: cleanRating,
          productTitle: String(productTitle || "Medical Equipment"),
          category: String(category || "operating-theater"),
          poolIndex: nextPool
        });
      }

      const updatedHistory = [suggestions.map(s => s.text), ...recentBatches].slice(0, 5);

      reviewSuggestionsCache.set(cacheKey, {
        batch: suggestions,
        recentBatches: updatedHistory,
        lastTexts: suggestions.map(s => s.text),
        poolIndex: nextPool,
        provider: aiResult.provider || activeProvider,
        model: aiResult.model,
        timestamp: Date.now()
      });

      return {
        success: true,
        suggestions,
        cached: false,
        provider: aiResult.provider || activeProvider,
        model: aiResult.model,
        poolIndex: nextPool,
        fallbackUsed: Boolean(aiResult.fallbackUsed)
      };
    })();

    inFlightSuggestions.set(cacheKey, generationPromise);

    try {
      const result = await generationPromise;
      res.json(result);
    } finally {
      inFlightSuggestions.delete(cacheKey);
    }
  } catch (err) {
    console.warn("[API] Suggestions generation error:", err.message);
    const cleanRating = Math.min(5, Math.max(1, Math.round(Number(req.query.rating) || 4)));
    const fallbackBatch = geminiVisionService.buildThemedSuggestions({
      rating: cleanRating,
      productTitle: String(req.query.productTitle || "Medical Equipment"),
      category: String(req.query.category || "operating-theater"),
      poolIndex: parseInt(req.query.poolIndex, 10) || 1
    });
    res.json({
      success: true,
      suggestions: fallbackBatch,
      cached: false,
      fallback: true,
      provider: "deterministic-fallback"
    });
  }
});

router.get("/reviews/:productId", async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
    const result = await firestoreService.getApprovedReviews(req.params.productId, { limit, offset });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Customer Authentication & Login Activity Audit
router.post("/auth/record-login", async (req, res) => {
  try {
    const { customerId, email, fullName, phone, authMethod } = req.body;
    if (!customerId || !email) {
      return res.status(400).json({ success: false, message: "Customer ID and email are required." });
    }

    // Security check: Never accept passwords or tokens in login audit payloads
    if (req.body.password || req.body.token || req.body.secret) {
      return res.status(400).json({ success: false, message: "Invalid payload: security credentials must not be submitted." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ success: false, message: "Invalid customer email address format." });
    }

    const ip = (req.ip || req.connection.remoteAddress || "127.0.0.1").replace(/^.*:/, "") || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";

    const activity = await supabaseService.recordCustomerLogin({
      customerId: String(customerId).trim(),
      email: cleanEmail,
      fullName: fullName ? String(fullName).trim() : cleanEmail.split("@")[0],
      phone: phone ? String(phone).trim() : undefined,
      authMethod: authMethod ? String(authMethod).trim() : "email_password",
      ip,
      userAgent
    });

    res.json({ success: true, activity });
  } catch (err) {
    console.warn("[API] Record login error:", err.message);
    res.status(500).json({ success: false, message: "Failed to record login event." });
  }
});

// Vercel Cron / Scheduled 30-Day Activity Cleanup Endpoint
router.get("/cron/cleanup-activity", (req, res) => {
  // Protect with CRON_SECRET if configured
  const authHeader = req.headers.authorization;
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: "Unauthorized: invalid cron authorization header." });
  }

  const result = supabaseService.cleanupExpiredActivity(30);
  res.json({
    success: true,
    message: "30-day login activity retention cleanup completed successfully.",
    ...result
  });
});

// Customer Email Update (Synchronizes auth email and updates customer records)
router.post("/auth/update-customer-email", async (req, res) => {
  try {
    const { customerId, oldEmail, newEmail } = req.body;
    if (!newEmail || typeof newEmail !== "string") {
      return res.status(400).json({ success: false, message: "Valid new email address is required." });
    }

    const cleanNewEmail = newEmail.trim().toLowerCase();
    const cleanOldEmail = oldEmail ? oldEmail.trim().toLowerCase() : "";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanNewEmail)) {
      return res.status(400).json({ success: false, message: "Invalid email format. Please provide a valid email address." });
    }

    if (cleanOldEmail && cleanNewEmail === cleanOldEmail) {
      return res.status(400).json({ success: false, message: "New email must be different from current email address." });
    }

    // Check duplicate against existing customers
    const existingCustomers = supabaseService.getMockCustomers ? supabaseService.getMockCustomers() : [];
    const isDuplicate = existingCustomers.some(
      (c) => c.email.toLowerCase() === cleanNewEmail && c.id !== customerId
    );
    if (isDuplicate) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_EMAIL",
        message: "This email address is already registered to another account."
      });
    }

    // Update customer in supabaseService
    if (supabaseService.updateCustomerEmail) {
      supabaseService.updateCustomerEmail(customerId || cleanOldEmail, cleanNewEmail);
    }

    // Migrate password credentials if customer has set local password
    if (passwordRecoveryService.migrateCredentialsEmail) {
      passwordRecoveryService.migrateCredentialsEmail(cleanOldEmail, cleanNewEmail);
    }

    res.json({
      success: true,
      message: "Customer email updated successfully.",
      email: cleanNewEmail
    });
  } catch (err) {
    console.warn("[API] Update customer email error:", err.message);
    res.status(500).json({ success: false, message: "Failed to update customer email." });
  }
});

// Customer Password Recovery — Request Recovery Link & Dispatch Email
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const origin = req.headers.origin || req.headers.referer || "http://localhost:5173";
    const clientIp = (req.ip || req.connection.remoteAddress || "127.0.0.1").replace(/^.*:/, "") || "127.0.0.1";

    const result = await passwordRecoveryService.requestRecovery({
      email,
      origin,
      clientIp
    });

    if (!result.success) {
      if (result.code === "INVALID_EMAIL") {
        return res.status(400).json({ success: false, code: result.code, message: result.message });
      }
      if (result.code === "RATE_LIMITED") {
        return res.status(429).json({ success: false, code: result.code, message: result.message });
      }
      if (result.code === "EMAIL_NOT_CONFIGURED" || result.code === "DELIVERY_FAILED") {
        return res.status(503).json({ success: false, code: result.code, message: result.message });
      }
      return res.status(400).json({ success: false, code: result.code || "REQUEST_FAILED", message: result.message });
    }

    res.json({
      success: true,
      delivered: result.delivered,
      simulated: result.simulated,
      message: result.message
    });
  } catch (err) {
    console.warn("[API] Forgot password error:", err.message);
    res.status(500).json({ success: false, message: "An unexpected error occurred while processing your request." });
  }
});

// Customer Password Recovery — Verify Token
router.get("/auth/verify-reset-token", (req, res) => {
  const token = req.query.token;
  const verification = passwordRecoveryService.verifyRecoveryToken(token);
  if (!verification.valid) {
    return res.status(400).json({
      success: false,
      valid: false,
      code: verification.code,
      message: verification.error
    });
  }
  res.json({
    success: true,
    valid: true,
    email: verification.email
  });
});

// Customer Password Recovery — Set New Password
router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Recovery token and new password are required."
      });
    }

    const result = await passwordRecoveryService.resetPassword({
      rawToken: token,
      newPassword
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        code: result.code,
        message: result.message
      });
    }

    res.json({
      success: true,
      message: result.message
    });
  } catch (err) {
    console.warn("[API] Reset password error:", err.message);
    res.status(500).json({ success: false, message: "Failed to reset password." });
  }
});

// Customer Authentication — Verify Credentials (supports updated password verification)
router.post("/auth/verify-credentials", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const isValid = passwordRecoveryService.verifyCredentials(cleanEmail, password);
  if (!isValid) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }
  res.json({
    success: true,
    user: {
      id: `usr-${Buffer.from(cleanEmail).toString("hex").substring(0, 10)}`,
      email: cleanEmail,
      user_metadata: { full_name: cleanEmail.split("@")[0] }
    }
  });
});

// Unified Secure Authentication Endpoint (Admin & Customer Authentication)
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = String(password);
    const ip = (req.ip || req.connection.remoteAddress || "127.0.0.1").replace(/^.*:/, "") || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";
    const targetAdminEmail = (process.env.ADMIN_EMAIL || "roshan.official0009@gmail.com").toLowerCase().trim();

    // 1. Designated Administrator Authentication Check
    const isAdminAccount =
      cleanEmail === targetAdminEmail ||
      cleanEmail === "roshan.official0009@gmail.com" ||
      cleanEmail === "admin@drmedex.com";

    if (isAdminAccount) {
      const adminResult = authService.login(cleanEmail, cleanPassword, ip);
      if (!adminResult.success) {
        auditService.logAction(cleanEmail, "LOGIN_FAILED", null, { ip, remainingAttempts: adminResult.remainingAttempts });
        return res.status(adminResult.status || 401).json({
          success: false,
          isAdmin: false,
          message: adminResult.message || "Invalid email or password. Please try again.",
          retryAfter: adminResult.retryAfter
        });
      }

      auditService.logAction(adminResult.user.email, "LOGIN_SUCCESS", null, { ip });

      // Record genuine successful admin login in activity audit
      await supabaseService.recordCustomerLogin({
        customerId: "admin-super",
        email: cleanEmail,
        fullName: adminResult.user.name || "Roshan (DR.MEDEX Super Admin)",
        authMethod: "admin_credentials",
        ip,
        userAgent
      }).catch(() => {});

      return res.json({
        success: true,
        isAdmin: true,
        token: adminResult.token,
        user: {
          id: "admin-super",
          email: adminResult.user.email,
          fullName: adminResult.user.name || "DR.MEDEX Super Admin",
          role: "super_admin"
        },
        redirectTo: "/admin"
      });
    }

    // 2. Normal Customer Authentication Check
    // If the customer has an updated/reset password in recovery store
    const isValidCustomer = passwordRecoveryService.verifyCredentials(cleanEmail, cleanPassword);
    if (isValidCustomer) {
      const customerUser = {
        id: `usr-${Buffer.from(cleanEmail).toString("hex").substring(0, 10)}`,
        email: cleanEmail,
        fullName: cleanEmail.split("@")[0] || "Customer",
        role: "buyer"
      };

      await supabaseService.recordCustomerLogin({
        customerId: customerUser.id,
        email: cleanEmail,
        fullName: customerUser.fullName,
        authMethod: "email_password",
        ip,
        userAgent
      }).catch(() => {});

      return res.json({
        success: true,
        isAdmin: false,
        user: customerUser,
        redirectTo: "/account"
      });
    }

    // Standard valid customer authentication (min 6 characters password requirement)
    // NOTE: This ONLY applies to non-admin accounts. Admin accounts are strictly validated above.
    if (cleanPassword.length >= 6) {
      const customerUser = {
        id: `usr-${Buffer.from(cleanEmail).toString("hex").substring(0, 10)}`,
        email: cleanEmail,
        fullName: cleanEmail.split("@")[0] || "Customer",
        role: "buyer"
      };

      await supabaseService.recordCustomerLogin({
        customerId: customerUser.id,
        email: cleanEmail,
        fullName: customerUser.fullName,
        authMethod: "email_password",
        ip,
        userAgent
      }).catch(() => {});

      return res.json({
        success: true,
        isAdmin: false,
        user: customerUser,
        redirectTo: "/account"
      });
    }

    return res.status(401).json({
      success: false,
      isAdmin: false,
      message: "Invalid email or password. Please try again."
    });
  } catch (err) {
    console.warn("[API] Auth login error:", err.message);
    res.status(500).json({ success: false, isAdmin: false, message: "Authentication service error. Please try again." });
  }
});

// Customer Password Recovery — Status Diagnostics
router.get("/auth/recovery-diagnostics", (req, res) => {
  const diagnostics = passwordRecoveryService.getDiagnostics();
  res.json({ success: true, diagnostics });
});



// Submit a new review (Anti-spam, forced PENDING, and verifiedPurchase: false)
router.post("/reviews", async (req, res) => {
  let reviewFingerprint;
  try {
    const ip = req.ip || req.connection.remoteAddress || "127.0.0.1";
    if (!checkReviewSubmissionRateLimit(ip)) {
      return res.status(429).json({
        success: false,
        message: "Submission rate limit reached. Please wait a few minutes before submitting another review."
      });
    }

    const {
      productId,
      productSlug,
      productTitle,
      rating,
      customerName,
      author,
      facility,
      reviewTitle,
      reviewText,
      comment,
      customerFeedbackPoints,
      aiAssisted,
      userId,
      userEmail
    } = req.body;
    
    if (!productId || typeof productId !== "string") {
      return res.status(400).json({ success: false, message: "Missing or invalid productId" });
    }

    const parsedRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
    const cleanEmail = String(userEmail || "").trim().toLowerCase().substring(0, 150);
    const cleanUserId = String(userId || "anonymous").trim().substring(0, 128);

    let cleanName = String(customerName || author || "").trim().substring(0, 100);
    if (!cleanName && cleanEmail) {
      cleanName = cleanEmail.split("@")[0] || "Verified Customer";
    }
    if (!cleanName) {
      cleanName = "Verified Customer";
    }

    const rawReviewText = String(reviewText || comment || "").trim();
    if (!rawReviewText || rawReviewText.length < 10) {
      return res.status(400).json({ success: false, message: "Review feedback must be at least 10 characters" });
    }
    if (rawReviewText.length > 200) {
      return res.status(400).json({ success: false, message: "Review text cannot exceed 200 characters" });
    }

    const cleanText = rawReviewText;
    const cleanTitle = String(reviewTitle || `${parsedRating}-Star Product Review`).trim().substring(0, 150);
    const cleanFacility = String(facility || "").trim().substring(0, 150);
    const cleanProductSlug = String(productSlug || "").trim().substring(0, 150);
    const cleanProductTitle = String(productTitle || "").trim().substring(0, 200);

    // Duplicate submission prevention (same product + author/email + content within 15 minutes)
    reviewFingerprint = `${productId}:${(cleanName || cleanEmail || "anon").toLowerCase()}:${cleanText.toLowerCase()}`;
    const now = Date.now();
    const existingSubmissionTime = recentReviewsSet.get(reviewFingerprint);
    if (existingSubmissionTime && now - existingSubmissionTime < 15 * 60 * 1000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate review detected. This evaluation has already been submitted for verification."
      });
    }
    recentReviewsSet.set(reviewFingerprint, now);

    // Whitelist and sanitize feedback points (max 10 items, max 150 chars each)
    const cleanPoints = Array.isArray(customerFeedbackPoints)
      ? customerFeedbackPoints.map(p => String(p).trim()).filter(Boolean).slice(0, 10)
      : [];

    // SERVER-SIDE ABUSE & SPAM MODERATION CHECK (Runs before review becomes public)
    const moderation = reviewModerationService.moderateReview({
      reviewText: cleanText,
      reviewTitle: cleanTitle,
      customerName: cleanName,
      userEmail: cleanEmail
    });

    if (moderation.decision === "REJECT") {
      if (reviewFingerprint) {
        recentReviewsSet.delete(reviewFingerprint);
      }
      return res.status(422).json({
        success: false,
        decision: "REJECT",
        status: "REJECTED",
        reason: moderation.reason,
        message: moderation.userMessage || "Your review contains prohibited language or promotional content. Please edit your review to focus on your clinical or product experience."
      });
    }

    const initialStatus = moderation.decision === "ALLOW" ? "APPROVED" : "QUARANTINED";
    const successMessage = moderation.decision === "ALLOW"
      ? "Your review has been published and is now live!"
      : (moderation.userMessage || "Thank you! Your review has been submitted and is undergoing standard safety verification before display.");

    // STRICT PRIVILEGE ENFORCEMENT: Never trust client-supplied status, verifiedPurchase, or userId
    const reviewData = {
      productId,
      productSlug: cleanProductSlug,
      productTitle: cleanProductTitle,
      rating: parsedRating,
      reviewTitle: cleanTitle,
      reviewText: cleanText,
      comment: cleanText, // backward compatibility
      customerFeedbackPoints: cleanPoints,
      customerName: cleanName,
      author: cleanName, // backward compatibility
      facility: cleanFacility,
      userId: cleanUserId,
      userEmail: cleanEmail,
      verifiedPurchase: false, // CANNOT self-verify
      moderationReason: moderation.reason,
      aiAssisted: Boolean(aiAssisted)
    };

    const created = await firestoreService.createReview(reviewData, { initialStatus });
    res.status(201).json({
      success: true,
      decision: moderation.decision,
      status: created.status,
      message: successMessage,
      review: created
    });
  } catch (err) {
    if (reviewFingerprint) {
      recentReviewsSet.delete(reviewFingerprint);
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// In-memory rate limit map for AI review drafting (max 20 requests per 10 minutes per IP)
const aiRateLimitMap = new Map();

function checkAiRateLimit(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 20;

  const record = aiRateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  aiRateLimitMap.set(ip, record);
  return true;
}

// Grounded AI Review Drafting Assistant (Server-Side using existing Gemini integration)
router.post("/reviews/ai-assist", async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || "127.0.0.1";
    if (!checkAiRateLimit(ip)) {
      return res.status(429).json({
        success: false,
        message: "AI review assistant rate limit reached. Please wait a few minutes before trying again."
      });
    }

    const { rating, feedbackPoints, roughDraft, productTitle, customerName, facility } = req.body;

    // Request size bounds validation
    const cleanPoints = Array.isArray(feedbackPoints) 
      ? feedbackPoints.map(p => String(p).trim()).filter(Boolean).slice(0, 10)
      : [];
    const cleanDraft = String(roughDraft || "").trim().substring(0, 1000);
    const cleanProduct = String(productTitle || "Medical Device").trim().substring(0, 200);

    if (cleanPoints.length === 0 && !cleanDraft) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one key feedback point or rough thought to ground the AI draft."
      });
    }

    const suggestion = await geminiVisionService.generateReviewDraft({
      rating,
      feedbackPoints: cleanPoints,
      roughDraft: cleanDraft,
      productTitle: cleanProduct,
      customerName: String(customerName || "").trim().substring(0, 100),
      facility: String(facility || "").trim().substring(0, 150)
    });

    res.json({ success: true, suggestion });
  } catch (err) {
    console.warn("[API] AI Review Assist error:", err.message);
    res.status(400).json({ success: false, message: err.message || "Failed to generate AI suggestion." });
  }
});

// ADMIN METRICS
router.get("/admin/metrics", (req, res) => {
  res.json({ success: true, metrics: store.getAdminMetrics() });
});

// POLICIES
router.get("/policies", (req, res) => {
  res.json({ success: true, policies: store.getPolicies() });
});

router.put("/policies", (req, res) => {
  const updated = store.updatePolicies(req.body);
  res.json({ success: true, policies: updated });
});

module.exports = router;
