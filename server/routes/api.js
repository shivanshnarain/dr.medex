const express = require("express");
const router = express.Router();
const store = require("../services/store");
const currencyService = require("../services/currencyService");

// PRODUCTS
router.get("/products", (req, res) => {
  const list = store.getProducts(req.query);
  res.json({ success: true, count: list.length, products: list });
});

router.get("/products/:slug", (req, res) => {
  const product = store.getProductBySlug(req.params.slug);
  if (!product) {
    return res.status(404).json({ success: false, message: "Product not found" });
  }
  res.json({ success: true, product });
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
router.get("/currency/rates", (req, res) => {
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
  res.json({ success: true, order });
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
    items: order.items.map(it => ({ title: it.title, quantity: it.quantity, sku: it.sku }))
  });
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

// REVIEWS
router.get("/reviews", (req, res) => {
  const list = store.getReviews(req.query.productId);
  res.json({ success: true, reviews: list });
});

router.get("/reviews/:productId", (req, res) => {
  const list = store.getReviews(req.params.productId);
  res.json({ success: true, reviews: list });
});

router.post("/reviews", (req, res) => {
  const review = store.addReview(req.body);
  res.status(201).json({ success: true, review });
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
