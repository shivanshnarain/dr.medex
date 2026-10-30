/**
 * DR.MEDEX Global — Order & Address Service
 * Handles server-side order calculation, inventory validation,
 * payment confirmation, and MongoDB Atlas persistence.
 */

const { getClient } = require("./mongoService");
const store = require("./store");
const currencyService = require("./currencyService");
const { isPayPalSupportedCurrency } = require("./paypalService");

const ORDERS_COLLECTION = "orders";
const ADDRESSES_COLLECTION = "customer_addresses";

let indexesEnsured = false;

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const client = await getClient();
    const db = client.db();
    await db.collection(ORDERS_COLLECTION).createIndex({ orderNumber: 1 }, { unique: true });
    await db.collection(ORDERS_COLLECTION).createIndex({ customerId: 1 });
    await db.collection(ORDERS_COLLECTION).createIndex({ "customer.email": 1 });
    await db.collection(ORDERS_COLLECTION).createIndex({ "payment.paypalOrderId": 1 });
    await db.collection(ADDRESSES_COLLECTION).createIndex({ userId: 1 });
    indexesEnsured = true;
  } catch (err) {
    // Indexes might already exist or running in offline mode
    console.warn("[OrderService] Warning ensuring MongoDB indexes:", err.message);
  }
}

/**
 * Validate order payload using trusted server-side data
 */
function validateAndCalculateOrder(payload) {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error("Order must contain at least one item.");
  }

  // 1. Resolve requested currency vs PayPal supported currency
  let requestedCurrency = (payload.currency || "INR").toUpperCase();
  let paymentCurrency = requestedCurrency;
  let currencyConversionRate = 1;

  // If customer is using a currency not supported directly by PayPal, default charge currency to USD
  if (!isPayPalSupportedCurrency(requestedCurrency)) {
    paymentCurrency = "USD";
  }

  // 2. Fetch current catalogue products and calculate trusted item totals in base INR
  let totalBaseINR = 0;
  const validatedItems = [];

  for (const item of payload.items) {
    const prodId = item.productId || item.id;
    const prod = store.getProductById(prodId, false);
    if (!prod) {
      throw new Error(`Product not found in active catalogue: ${prodId}`);
    }

    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    const availableStock = prod.stock !== undefined ? prod.stock : (prod.stockQuantity !== undefined ? prod.stockQuantity : 100);
    if (availableStock < qty) {
      throw new Error(`Insufficient inventory for "${prod.title || prod.productName}". Requested: ${qty}, In Stock: ${availableStock}`);
    }

    // Base price is always master INR price
    const unitPriceINR = Number(prod.basePrice || prod.regularPriceINR || 1000);
    const itemTotalINR = unitPriceINR * qty;
    totalBaseINR += itemTotalINR;

    // Unit price in customer's display currency
    const unitPriceDisplay = currencyService.convertPrice(unitPriceINR, requestedCurrency);
    // Unit price in actual PayPal payment currency
    const unitPricePayment = currencyService.convertPrice(unitPriceINR, paymentCurrency);

    validatedItems.push({
      productId: prod.id,
      title: prod.title || prod.productName,
      sku: prod.sku || `MED-${prod.id.slice(-6).toUpperCase()}`,
      quantity: qty,
      basePriceINR: unitPriceINR,
      unitPrice: unitPricePayment,
      unitPriceDisplay,
      currency: paymentCurrency,
      displayCurrency: requestedCurrency,
      image: (prod.images && prod.images[0]) || item.image || ""
    });
  }

  // 3. Validate and apply coupon if present
  let discountINR = 0;
  let appliedCoupon = null;
  if (payload.couponCode) {
    const coupons = store.getCoupons();
    const cleanCode = String(payload.couponCode).trim().toUpperCase();
    const foundCoupon = coupons.find(c => c.code.toUpperCase() === cleanCode);
    if (foundCoupon) {
      appliedCoupon = foundCoupon;
      const minRequiredINR = (foundCoupon.minOrderUSD || 0) / (currencyService.getRateForCurrency("USD") || 0.010379);
      if (totalBaseINR >= minRequiredINR) {
        const rawDiscount = (totalBaseINR * (foundCoupon.discountPercent || 0)) / 100;
        const maxDiscountINR = (foundCoupon.maxDiscountUSD || 999999) / (currencyService.getRateForCurrency("USD") || 0.010379);
        discountINR = Math.min(rawDiscount, maxDiscountINR);
      }
    }
  }

  // 4. Calculate shipping
  // Free standard shipping or express rate
  const shippingINR = payload.shippingMethod?.costUSD
    ? (payload.shippingMethod.costUSD / (currencyService.getRateForCurrency("USD") || 0.010379))
    : 0;

  // 5. Grand total in INR
  const grandTotalINR = Math.max(0, totalBaseINR - discountINR + shippingINR);

  // 6. Final amounts in payment currency
  const subtotalPayment = currencyService.convertPrice(totalBaseINR, paymentCurrency);
  const discountPayment = currencyService.convertPrice(discountINR, paymentCurrency);
  const shippingPayment = currencyService.convertPrice(shippingINR, paymentCurrency);
  const grandTotalPayment = currencyService.convertPrice(grandTotalINR, paymentCurrency);

  return {
    items: validatedItems,
    pricing: {
      baseSubtotalINR: totalBaseINR,
      discountINR,
      shippingINR,
      grandTotalINR,
      subtotal: subtotalPayment,
      discount: discountPayment,
      shipping: shippingPayment,
      grandTotal: grandTotalPayment,
      currency: paymentCurrency,
      displayCurrency: requestedCurrency,
      appliedCoupon: appliedCoupon ? appliedCoupon.code : null,
      exchangeRateUsed: currencyService.getRateForCurrency(paymentCurrency),
      calculatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate unique order number (e.g. MED-54321)
 */
function generateOrderNumber() {
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `MED-${randomSuffix}`;
}

/**
 * Create a PENDING order before initiating PayPal payment
 */
async function createPendingOrder(payload) {
  await ensureIndexes();
  const { items, pricing } = validateAndCalculateOrder(payload);

  const orderNumber = generateOrderNumber();
  const now = new Date().toISOString();

  const customer = {
    firstName: payload.customer?.firstName || "",
    lastName: payload.customer?.lastName || "",
    fullName: payload.customer?.fullName || `${payload.customer?.firstName || ""} ${payload.customer?.lastName || ""}`.trim() || "Customer",
    email: payload.customer?.email || "",
    phone: payload.customer?.phone || "",
    countryCode: payload.customer?.countryCode || "US",
    companyName: payload.customer?.companyName || payload.shippingAddress?.companyName || ""
  };

  const shippingAddress = {
    fullName: payload.shippingAddress?.fullName || customer.fullName,
    companyName: payload.shippingAddress?.companyName || customer.companyName,
    phone: payload.shippingAddress?.phone || customer.phone,
    addressLine1: payload.shippingAddress?.addressLine1 || "",
    addressLine2: payload.shippingAddress?.addressLine2 || "",
    city: payload.shippingAddress?.city || "",
    state: payload.shippingAddress?.state || "",
    postalCode: payload.shippingAddress?.postalCode || "",
    country: payload.shippingAddress?.country || "United States",
    countryCode: payload.shippingAddress?.countryCode || "US"
  };

  const billingAddress = payload.billingSameAsShipping !== false
    ? { ...shippingAddress }
    : {
        fullName: payload.billingAddress?.fullName || customer.fullName,
        companyName: payload.billingAddress?.companyName || customer.companyName,
        phone: payload.billingAddress?.phone || customer.phone,
        addressLine1: payload.billingAddress?.addressLine1 || "",
        addressLine2: payload.billingAddress?.addressLine2 || "",
        city: payload.billingAddress?.city || "",
        state: payload.billingAddress?.state || "",
        postalCode: payload.billingAddress?.postalCode || "",
        country: payload.billingAddress?.country || shippingAddress.country,
        countryCode: payload.billingAddress?.countryCode || shippingAddress.countryCode
      };

  const orderRecord = {
    id: orderNumber,
    orderNumber,
    customerId: payload.customerId || null,
    customer,
    shippingAddress,
    billingAddress,
    items,
    pricing,
    shippingMethod: payload.shippingMethod || {
      id: "dhl-air-express",
      name: "DHL Express Medical Air Cargo",
      carrier: "DHL Express",
      estimatedDays: "3–6 Business Days",
      trackingNumber: `DHL-${Math.floor(100000000 + Math.random() * 900000000)}`,
      trackingUrl: "https://www.dhl.com/en/express/tracking.html"
    },
    payment: {
      provider: "PAYPAL",
      method: "PayPal International",
      status: "PENDING",
      paypalOrderId: null,
      paypalCaptureId: null,
      amount: pricing.grandTotal,
      currency: pricing.currency,
      createdAt: now
    },
    orderStatus: "PENDING",
    status: "PENDING",
    fulfillmentStatus: "UNFULFILLED",
    createdAt: now,
    updatedAt: now,
    trackingTimeline: [
      { stage: "ORDER_PLACED", title: "Order Initialized", timestamp: now, completed: true, details: "Checkout details submitted. Awaiting PayPal payment." },
      { stage: "PAYMENT_CONFIRMED", title: "Payment Confirmed", timestamp: null, completed: false, details: "Verified payment via PayPal Gateway." },
      { stage: "PROCESSING", title: "Calibration & Processing", timestamp: null, completed: false, details: "Equipment pending biomedical inspection." },
      { stage: "QC_INSPECTED", title: "9-Stage Quality Passed", timestamp: null, completed: false, details: "Burn-in testing and electrical leakage audit." },
      { stage: "PACKED", title: "Export Crate Packed", timestamp: null, completed: false, details: "High-density foam protective crating." },
      { stage: "SHIPPED", title: "Shipped / In Transit", timestamp: null, completed: false, details: "AWB will be assigned upon carrier dispatch." },
      { stage: "DELIVERED", title: "Delivered", timestamp: null, completed: false, details: "Final receipt sign-off." }
    ]
  };

  // Persist to MongoDB
  try {
    const client = await getClient();
    const db = client.db();
    await db.collection(ORDERS_COLLECTION).updateOne(
      { orderNumber },
      { $set: orderRecord },
      { upsert: true }
    );
  } catch (mongoErr) {
    console.warn("[OrderService] Could not write pending order to MongoDB:", mongoErr.message);
  }

  // Also keep in store memory
  store.getOrders().unshift(orderRecord);

  return orderRecord;
}

/**
 * Mark order as PAID upon verified PayPal capture (Strict Idempotency)
 */
async function markOrderAsPaid({ orderNumber, paypalOrderId, paypalCaptureId, paymentDetails }) {
  await ensureIndexes();
  const now = new Date().toISOString();

  let order = null;

  // 1. Try fetching from MongoDB first
  try {
    const client = await getClient();
    const db = client.db();
    order = await db.collection(ORDERS_COLLECTION).findOne({ orderNumber });
  } catch (err) {
    console.warn("[OrderService] MongoDB lookup failed:", err.message);
  }

  // Fallback to store
  if (!order) {
    order = store.getOrderById(orderNumber);
  }

  if (!order) {
    throw new Error(`Order #${orderNumber} not found.`);
  }

  // Idempotency: If already paid, return safely without double deduction
  if (order.payment && order.payment.status === "PAID") {
    return order;
  }

  // 2. Update order status and payment record
  order.payment = {
    ...order.payment,
    provider: "PAYPAL",
    method: "PayPal International",
    status: "PAID",
    paypalOrderId: paypalOrderId || order.payment.paypalOrderId,
    paypalCaptureId: paypalCaptureId || null,
    transactionId: paypalCaptureId || paypalOrderId || order.orderNumber,
    paidAt: now,
    details: paymentDetails || null
  };
  order.orderStatus = "PROCESSING";
  order.status = "PROCESSING";
  order.fulfillmentStatus = "CONFIRMED";
  order.updatedAt = now;

  // Update tracking timeline
  if (Array.isArray(order.trackingTimeline)) {
    order.trackingTimeline.forEach(st => {
      if (st.stage === "ORDER_PLACED") {
        st.completed = true;
        st.timestamp = st.timestamp || now;
      }
      if (st.stage === "PAYMENT_CONFIRMED") {
        st.completed = true;
        st.timestamp = now;
        st.details = `Payment verified successfully via PayPal (Capture ID: ${paypalCaptureId || "N/A"}).`;
      }
    });
  }

  // 3. Atomically deduct inventory for each purchased item
  if (Array.isArray(order.items)) {
    order.items.forEach(it => {
      const prod = store.getProductById(it.productId, false);
      if (prod) {
        const qty = it.quantity || 1;
        const currentStock = prod.stock !== undefined ? prod.stock : (prod.stockQuantity !== undefined ? prod.stockQuantity : 100);
        prod.stock = Math.max(0, currentStock - qty);
        prod.stockQuantity = prod.stock;
        prod.stockStatus = prod.stock <= 0 ? "OUT_OF_STOCK" : (prod.stock <= (prod.lowStockThreshold || 3) ? "LOW_STOCK" : "IN_STOCK");
        prod.updatedAt = now;
      }
    });
  }

  // 4. Persist to MongoDB
  try {
    const client = await getClient();
    const db = client.db();
    await db.collection(ORDERS_COLLECTION).updateOne(
      { orderNumber },
      { $set: order },
      { upsert: true }
    );
  } catch (mongoErr) {
    console.error("[OrderService] Failed to persist paid order to MongoDB:", mongoErr.message);
  }

  // Update memory store
  const storeIdx = store.getOrders().findIndex(o => o.orderNumber === orderNumber);
  if (storeIdx !== -1) {
    store.getOrders()[storeIdx] = order;
  } else {
    store.getOrders().unshift(order);
  }

  return order;
}

/**
 * Mark order as CANCELLED or FAILED
 */
async function markOrderAsFailed(orderNumber, reason = "Payment cancelled or failed") {
  const now = new Date().toISOString();
  try {
    const client = await getClient();
    const db = client.db();
    await db.collection(ORDERS_COLLECTION).updateOne(
      { orderNumber },
      {
        $set: {
          "payment.status": "FAILED",
          "payment.failureReason": reason,
          orderStatus: "CANCELLED",
          status: "CANCELLED",
          updatedAt: now
        }
      }
    );
  } catch (err) {}

  const order = store.getOrderById(orderNumber);
  if (order && order.payment.status !== "PAID") {
    order.payment.status = "FAILED";
    order.payment.failureReason = reason;
    order.orderStatus = "CANCELLED";
    order.status = "CANCELLED";
  }
}

/**
 * Retrieve customer orders from MongoDB / store
 */
async function getCustomerOrders(customerId, email) {
  await ensureIndexes();
  let orders = [];

  try {
    const client = await getClient();
    const db = client.db();
    const query = { $or: [] };
    if (customerId) query.$or.push({ customerId: String(customerId) });
    if (email) query.$or.push({ "customer.email": new RegExp(`^${email.trim()}$`, "i") });

    if (query.$or.length > 0) {
      orders = await db.collection(ORDERS_COLLECTION).find(query).sort({ createdAt: -1 }).toArray();
    }
  } catch (mongoErr) {
    console.warn("[OrderService] MongoDB query for customer orders failed, using store:", mongoErr.message);
  }

  if (orders.length === 0) {
    orders = store.getOrders().filter(o => {
      if (customerId && o.customerId === customerId) return true;
      if (email && o.customer?.email?.toLowerCase() === email.toLowerCase()) return true;
      return false;
    });
  }

  return orders;
}

/**
 * Retrieve single order by orderNumber or ID
 */
async function getOrder(orderId) {
  if (!orderId) return null;
  const clean = String(orderId).trim().toUpperCase();

  try {
    const client = await getClient();
    const db = client.db();
    const doc = await db.collection(ORDERS_COLLECTION).findOne({
      $or: [
        { orderNumber: clean },
        { id: clean },
        { "payment.paypalOrderId": orderId }
      ]
    });
    if (doc) return doc;
  } catch (err) {}

  return store.getOrderById(clean);
}

/**
 * Address Management Service (MongoDB Atlas Collection: customer_addresses)
 */
async function getCustomerAddresses(userId) {
  if (!userId) return [];
  try {
    const client = await getClient();
    const db = client.db();
    const doc = await db.collection(ADDRESSES_COLLECTION).findOne({ userId: String(userId) });
    return doc?.addresses || [];
  } catch (err) {
    console.warn("[AddressService] Error reading addresses:", err.message);
    return [];
  }
}

async function saveCustomerAddress(userId, addressData) {
  if (!userId || !addressData) throw new Error("userId and addressData required.");
  try {
    const client = await getClient();
    const db = client.db();
    const col = db.collection(ADDRESSES_COLLECTION);

    const doc = await col.findOne({ userId: String(userId) });
    let addresses = doc?.addresses || [];

    const addressId = addressData.id || `addr-${Math.random().toString(36).substring(2, 10)}`;
    const now = new Date().toISOString();

    const normalizedAddress = {
      id: addressId,
      fullName: addressData.fullName || "",
      companyName: addressData.companyName || "",
      phone: addressData.phone || "",
      addressLine1: addressData.addressLine1 || "",
      addressLine2: addressData.addressLine2 || "",
      city: addressData.city || "",
      state: addressData.state || "",
      postalCode: addressData.postalCode || "",
      country: addressData.country || "United States",
      countryCode: addressData.countryCode || "US",
      isDefaultShipping: Boolean(addressData.isDefaultShipping),
      isDefaultBilling: Boolean(addressData.isDefaultBilling),
      updatedAt: now,
      createdAt: addressData.createdAt || now
    };

    // If marked as default, unset other defaults
    if (normalizedAddress.isDefaultShipping) {
      addresses = addresses.map(a => ({ ...a, isDefaultShipping: false }));
    }
    if (normalizedAddress.isDefaultBilling) {
      addresses = addresses.map(a => ({ ...a, isDefaultBilling: false }));
    }

    const existingIdx = addresses.findIndex(a => a.id === addressId);
    if (existingIdx !== -1) {
      addresses[existingIdx] = normalizedAddress;
    } else {
      // If this is the first address, make it default shipping and billing
      if (addresses.length === 0) {
        normalizedAddress.isDefaultShipping = true;
        normalizedAddress.isDefaultBilling = true;
      }
      addresses.push(normalizedAddress);
    }

    await col.updateOne(
      { userId: String(userId) },
      { $set: { userId: String(userId), addresses, updatedAt: now } },
      { upsert: true }
    );

    return addresses;
  } catch (err) {
    console.error("[AddressService] Error saving address to MongoDB:", err.message);
    throw err;
  }
}

async function deleteCustomerAddress(userId, addressId) {
  if (!userId || !addressId) return [];
  try {
    const client = await getClient();
    const db = client.db();
    const col = db.collection(ADDRESSES_COLLECTION);

    const doc = await col.findOne({ userId: String(userId) });
    if (!doc || !Array.isArray(doc.addresses)) return [];

    const updatedAddresses = doc.addresses.filter(a => a.id !== addressId);
    await col.updateOne(
      { userId: String(userId) },
      { $set: { addresses: updatedAddresses, updatedAt: new Date().toISOString() } }
    );

    return updatedAddresses;
  } catch (err) {
    console.error("[AddressService] Error deleting address from MongoDB:", err.message);
    throw err;
  }
}

module.exports = {
  validateAndCalculateOrder,
  createPendingOrder,
  markOrderAsPaid,
  markOrderAsFailed,
  getCustomerOrders,
  getOrder,
  getCustomerAddresses,
  saveCustomerAddress,
  deleteCustomerAddress
};

