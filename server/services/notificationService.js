/**
 * DR.MEDEX Global — Web Push Notification Service
 * Implements standard W3C Web Push, VAPID authentication with web-push,
 * MongoDB Atlas persistence for subscriptions and broadcast history,
 * category-based preference routing, and automatic order updates.
 */

const fs = require("fs");
const path = require("path");
const webPush = require("web-push");
const { getClient } = require("./mongoService");

const PUSH_SUBSCRIPTIONS_COLLECTION = "push_subscriptions";
const NOTIFICATION_HISTORY_COLLECTION = "push_notifications_history";
const VAPID_KEY_FILE = path.join(__dirname, "../data/vapidKeys.json");

let vapidKeys = null;
let indexesEnsured = false;

// Ensure server/data directory exists
const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch (e) {}
}

/**
 * Initialize VAPID Keys
 * Prioritizes environment variables, then local cache file, then auto-generates.
 */
function initVapidKeys() {
  if (vapidKeys) return vapidKeys;

  const envPub = process.env.VAPID_PUBLIC_KEY;
  const envPriv = process.env.VAPID_PRIVATE_KEY;
  const envSub = process.env.VAPID_SUBJECT || "mailto:support@drmedex.com";

  if (envPub && envPriv) {
    vapidKeys = {
      publicKey: envPub.trim(),
      privateKey: envPriv.trim(),
      subject: envSub.trim()
    };
  } else if (fs.existsSync(VAPID_KEY_FILE)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(VAPID_KEY_FILE, "utf8"));
      if (fileData.publicKey && fileData.privateKey) {
        vapidKeys = {
          publicKey: fileData.publicKey,
          privateKey: fileData.privateKey,
          subject: fileData.subject || envSub
        };
      }
    } catch (err) {
      console.warn("[NotificationService] Warning reading vapidKeys.json:", err.message);
    }
  }

  // If still not configured, generate a fresh VAPID keypair
  if (!vapidKeys) {
    const generated = webPush.generateVAPIDKeys();
    vapidKeys = {
      publicKey: generated.publicKey,
      privateKey: generated.privateKey,
      subject: envSub
    };

    try {
      fs.writeFileSync(VAPID_KEY_FILE, JSON.stringify(vapidKeys, null, 2), "utf8");
      console.log("[NotificationService] Generated and persisted new VAPID keys to server/data/vapidKeys.json");
    } catch (writeErr) {
      console.warn("[NotificationService] Could not persist vapidKeys.json to disk:", writeErr.message);
    }
  }

  try {
    webPush.setVapidDetails(
      vapidKeys.subject,
      vapidKeys.publicKey,
      vapidKeys.privateKey
    );
  } catch (err) {
    console.error("[NotificationService] Error setting VAPID details:", err.message);
  }

  return vapidKeys;
}

// In-memory fallback subscriptions storage if MongoDB is temporarily unavailable
const inMemorySubscriptions = new Map();
const inMemoryHistory = [];

async function ensureIndexes() {
  if (indexesEnsured) return;
  try {
    const client = await getClient();
    const db = client.db();
    await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).createIndex({ endpoint: 1 }, { unique: true });
    await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).createIndex({ userId: 1 });
    await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).createIndex({ customerEmail: 1 });
    await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).createIndex({ "preferences.marketing": 1 });
    await db.collection(NOTIFICATION_HISTORY_COLLECTION).createIndex({ createdAt: -1 });
    indexesEnsured = true;
  } catch (err) {
    // Indexes might already exist or offline
    console.warn("[NotificationService] MongoDB indexing warning:", err.message);
  }
}

/**
 * Returns the public VAPID key for client push registration
 */
function getVapidPublicKey() {
  const keys = initVapidKeys();
  return keys.publicKey;
}

/**
 * Save or update a browser push subscription
 */
async function saveSubscription({
  subscription,
  userId = null,
  customerEmail = null,
  userAgent = "",
  preferences = {}
}) {
  if (!subscription || !subscription.endpoint || !subscription.keys) {
    throw new Error("Invalid push subscription format: endpoint and keys are required.");
  }

  const keys = initVapidKeys();
  const endpoint = subscription.endpoint;
  const now = new Date();

  const defaultPreferences = {
    orderUpdates: true,
    websiteAnnouncements: true,
    customerSupport: true,
    marketing: false // Strict opt-in requirement
  };

  const mergedPreferences = {
    ...defaultPreferences,
    ...(preferences || {})
  };

  const record = {
    endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth
    },
    userId: userId ? String(userId) : null,
    customerEmail: customerEmail ? String(customerEmail).trim().toLowerCase() : null,
    userAgent: String(userAgent || "").substring(0, 300),
    preferences: mergedPreferences,
    updatedAt: now
  };

  // 1. In-memory record
  inMemorySubscriptions.set(endpoint, {
    ...record,
    createdAt: inMemorySubscriptions.get(endpoint)?.createdAt || now
  });

  // 2. MongoDB persistence
  try {
    await ensureIndexes();
    const client = await getClient();
    const db = client.db();
    await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).updateOne(
      { endpoint },
      {
        $set: record,
        $setOnInsert: { createdAt: now }
      },
      { upsert: true }
    );
  } catch (mongoErr) {
    console.warn("[NotificationService] MongoDB save subscription warning (stored in-memory):", mongoErr.message);
  }

  return { success: true, endpoint, preferences: mergedPreferences };
}

/**
 * Unsubscribe / delete a push subscription
 */
async function deleteSubscription(endpoint) {
  if (!endpoint) return { success: false, message: "Endpoint required." };

  inMemorySubscriptions.delete(endpoint);

  try {
    const client = await getClient();
    const db = client.db();
    await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).deleteOne({ endpoint });
  } catch (err) {
    console.warn("[NotificationService] MongoDB delete subscription warning:", err.message);
  }

  return { success: true, message: "Subscription removed." };
}

/**
 * Get notification preferences for an endpoint or user
 */
async function getPreferences(endpoint, userId = null) {
  if (!endpoint && !userId) {
    return {
      orderUpdates: true,
      websiteAnnouncements: true,
      customerSupport: true,
      marketing: false
    };
  }

  try {
    const client = await getClient();
    const db = client.db();
    const filter = endpoint ? { endpoint } : { userId: String(userId) };
    const doc = await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).findOne(filter);

    if (doc && doc.preferences) {
      return doc.preferences;
    }
  } catch (err) {
    if (endpoint && inMemorySubscriptions.has(endpoint)) {
      return inMemorySubscriptions.get(endpoint).preferences;
    }
  }

  return {
    orderUpdates: true,
    websiteAnnouncements: true,
    customerSupport: true,
    marketing: false
  };
}

/**
 * Update preferences for an endpoint or user
 */
async function updatePreferences(endpoint, preferences) {
  if (!endpoint) throw new Error("Endpoint required.");

  const current = await getPreferences(endpoint);
  const updated = {
    ...current,
    ...(preferences || {})
  };

  if (inMemorySubscriptions.has(endpoint)) {
    inMemorySubscriptions.get(endpoint).preferences = updated;
  }

  try {
    const client = await getClient();
    const db = client.db();
    await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).updateOne(
      { endpoint },
      { $set: { preferences: updated, updatedAt: new Date() } }
    );
  } catch (err) {
    console.warn("[NotificationService] MongoDB update preferences warning:", err.message);
  }

  return { success: true, preferences: updated };
}

/**
 * Retrieve targeted subscriptions from MongoDB and memory
 */
async function getTargetedSubscriptions({ category = "website", targetAudience = "all", userId = null }) {
  let subscriptions = [];

  try {
    const client = await getClient();
    const db = client.db();

    const query = {};

    // Specific user target
    if (userId) {
      query.userId = String(userId);
    } else {
      // Category routing
      if (category === "marketing") {
        query["preferences.marketing"] = true;
      } else if (category === "order") {
        query["preferences.orderUpdates"] = { $ne: false };
      } else if (category === "support") {
        query["preferences.customerSupport"] = { $ne: false };
      } else {
        query["preferences.websiteAnnouncements"] = { $ne: false };
      }

      // Target audience filtering
      if (targetAudience === "marketing_optin") {
        query["preferences.marketing"] = true;
      } else if (targetAudience === "customers_with_orders") {
        // Find users with orders
        const orders = await db.collection("orders").distinct("customerId", { customerId: { $ne: null } });
        const emails = await db.collection("orders").distinct("customer.email", { "customer.email": { $ne: null } });
        query.$or = [
          { userId: { $in: orders.map(String) } },
          { customerEmail: { $in: emails.map((e) => String(e).toLowerCase()) } }
        ];
      }
    }

    subscriptions = await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).find(query).toArray();
  } catch (err) {
    console.warn("[NotificationService] Fallback to in-memory subscriptions query:", err.message);
    subscriptions = Array.from(inMemorySubscriptions.values()).filter((sub) => {
      if (userId && sub.userId !== String(userId)) return false;
      if (category === "marketing" && !sub.preferences.marketing) return false;
      if (targetAudience === "marketing_optin" && !sub.preferences.marketing) return false;
      return true;
    });
  }

  return subscriptions;
}

/**
 * Send a Web Push notification to targeted recipients
 */
async function sendPushNotification({
  title,
  message,
  url = "/",
  icon = "/icons/drmedex-push-icon.png",
  image = null,
  category = "website",
  targetAudience = "all",
  userId = null,
  sentBy = "System"
}) {
  if (!title || !message) {
    throw new Error("Title and message are required for push notification.");
  }

  initVapidKeys();

  const payload = JSON.stringify({
    title,
    message,
    body: message,
    url: url || "/",
    icon: icon || "/icons/drmedex-push-icon.png",
    image: image || null,
    category,
    tag: `drmedex-${category}-${Date.now()}`,
    timestamp: Date.now()
  });

  const targets = await getTargetedSubscriptions({ category, targetAudience, userId });

  let sent = 0;
  let failed = 0;
  let unsubscribed = 0;
  const expiredEndpoints = [];

  for (const target of targets) {
    const pushSub = {
      endpoint: target.endpoint,
      keys: target.keys
    };

    try {
      await webPush.sendNotification(pushSub, payload);
      sent++;
    } catch (err) {
      failed++;
      // Check for 404 or 410 (Subscription expired / unregistered by browser)
      if (err.statusCode === 404 || err.statusCode === 410) {
        unsubscribed++;
        expiredEndpoints.push(target.endpoint);
      } else {
        console.warn(`[NotificationService] Error sending to ${target.endpoint.slice(0, 30)}...:`, err.message);
      }
    }
  }

  // Cleanup expired subscriptions
  if (expiredEndpoints.length > 0) {
    try {
      const client = await getClient();
      const db = client.db();
      await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).deleteMany({
        endpoint: { $in: expiredEndpoints }
      });
      expiredEndpoints.forEach((ep) => inMemorySubscriptions.delete(ep));
    } catch (cleanupErr) {
      console.warn("[NotificationService] Cleanup expired warning:", cleanupErr.message);
    }
  }

  const notificationRecord = {
    notificationId: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    message,
    category,
    targetAudience,
    url: url || "/",
    image: image || null,
    sentBy,
    stats: {
      targeted: targets.length,
      sent,
      failed,
      unsubscribed
    },
    createdAt: new Date()
  };

  inMemoryHistory.unshift(notificationRecord);
  if (inMemoryHistory.length > 100) inMemoryHistory.pop();

  try {
    const client = await getClient();
    const db = client.db();
    await db.collection(NOTIFICATION_HISTORY_COLLECTION).insertOne(notificationRecord);
  } catch (histErr) {
    console.warn("[NotificationService] Save history warning:", histErr.message);
  }

  return {
    success: true,
    notification: notificationRecord,
    stats: notificationRecord.stats
  };
}

/**
 * Dispatch automatic Order Event Push Notification
 */
async function sendOrderNotification(order, eventType = "placed") {
  if (!order || !order.orderNumber) return null;

  let title = `DR.MEDEX Order Update: ${order.orderNumber}`;
  let message = "Your medical equipment order has been updated.";
  let url = `/track-order?orderId=${encodeURIComponent(order.orderNumber)}`;

  switch (eventType) {
    case "placed":
      title = `Order Received: #${order.orderNumber}`;
      message = `Your order for ${order.items?.length || 1} equipment item(s) has been successfully placed.`;
      break;
    case "confirmed":
      title = `Payment Verified: #${order.orderNumber}`;
      message = `Your payment of ${order.pricing?.currency || "INR"} ${(order.pricing?.grandTotal || 0).toLocaleString()} was confirmed. Preparing shipment.`;
      break;
    case "dispatched":
      title = `Equipment Dispatched: #${order.orderNumber}`;
      message = `Your order has been shipped via ${order.shippingMethod?.carrier || "Global Express"}. Track delivery live.`;
      break;
    case "delivered":
      title = `Order Delivered: #${order.orderNumber}`;
      message = `Your medical equipment consignment has been successfully delivered.`;
      break;
  }

  try {
    return await sendPushNotification({
      title,
      message,
      url,
      category: "order",
      targetAudience: "specific_user",
      userId: order.customerId || null,
      sentBy: "Order Lifecycle Automation"
    });
  } catch (err) {
    console.warn("[NotificationService] Order push alert warning:", err.message);
    return null;
  }
}

/**
 * Get subscriber statistics for Admin dashboard
 */
async function getSubscribersStats() {
  let total = 0;
  let orderSubscribers = 0;
  let websiteSubscribers = 0;
  let supportSubscribers = 0;
  let marketingSubscribers = 0;
  let customersLinked = 0;

  try {
    const client = await getClient();
    const db = client.db();

    total = await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).countDocuments();
    orderSubscribers = await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).countDocuments({ "preferences.orderUpdates": { $ne: false } });
    websiteSubscribers = await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).countDocuments({ "preferences.websiteAnnouncements": { $ne: false } });
    supportSubscribers = await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).countDocuments({ "preferences.customerSupport": { $ne: false } });
    marketingSubscribers = await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).countDocuments({ "preferences.marketing": true });
    customersLinked = await db.collection(PUSH_SUBSCRIPTIONS_COLLECTION).countDocuments({ userId: { $ne: null } });
  } catch (err) {
    total = inMemorySubscriptions.size;
    for (const sub of inMemorySubscriptions.values()) {
      if (sub.preferences.orderUpdates !== false) orderSubscribers++;
      if (sub.preferences.websiteAnnouncements !== false) websiteSubscribers++;
      if (sub.preferences.customerSupport !== false) supportSubscribers++;
      if (sub.preferences.marketing === true) marketingSubscribers++;
      if (sub.userId) customersLinked++;
    }
  }

  return {
    total,
    orderSubscribers,
    websiteSubscribers,
    supportSubscribers,
    marketingSubscribers,
    customersLinked
  };
}

/**
 * Get notification send history
 */
async function getNotificationHistory(limit = 50) {
  try {
    const client = await getClient();
    const db = client.db();
    const docs = await db.collection(NOTIFICATION_HISTORY_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return docs;
  } catch (err) {
    return inMemoryHistory.slice(0, limit);
  }
}

module.exports = {
  initVapidKeys,
  getVapidPublicKey,
  saveSubscription,
  deleteSubscription,
  getPreferences,
  updatePreferences,
  sendPushNotification,
  sendOrderNotification,
  getSubscribersStats,
  getNotificationHistory
};