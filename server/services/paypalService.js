/**
 * DR.MEDEX Global — PayPal Payment Gateway Service
 * Server-Side Only: Never exposes PayPal Client Secret to the frontend
 */

/**
 * Dynamic credential getters to guarantee real-time resolution in serverless / Vercel environments
 */
function getClientId() {
  return (process.env.PAYPAL_CLIENT_ID || process.env.VITE_PAYPAL_CLIENT_ID || "").trim();
}

function getClientSecret() {
  return (process.env.PAYPAL_CLIENT_SECRET || "").trim();
}

function getMode() {
  return (process.env.PAYPAL_MODE || "sandbox").trim().toLowerCase();
}

function getBaseUrl() {
  return getMode() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

// In-memory token cache to minimize OAuth round-trips
let cachedToken = null;
let tokenExpiresAt = 0;
let cachedCredentialsHash = "";

/**
 * Obtain or refresh OAuth 2.0 access token from PayPal
 */
async function getAccessToken() {
  const currentClientId = getClientId();
  const currentClientSecret = getClientSecret();
  const currentMode = getMode();
  const baseUrl = getBaseUrl();

  if (!currentClientId || !currentClientSecret) {
    throw new Error("PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing from server environment.");
  }

  const credsHash = `${currentClientId}:${currentClientSecret}:${currentMode}`;
  if (cachedToken && credsHash === cachedCredentialsHash && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const auth = Buffer.from(`${currentClientId}:${currentClientSecret}`).toString("base64");
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: "grant_type=client_credentials"
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`PayPal OAuth authentication failed (HTTP ${res.status}): ${errorText}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  cachedCredentialsHash = credsHash;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

/**
 * Supported PayPal currencies. If a customer browses in an unsupported currency,
 * the backend converts the charge to USD and passes USD to PayPal.
 */
const PAYPAL_SUPPORTED_CURRENCIES = new Set([
  "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "NZD", "SGD", "HKD",
  "SEK", "DKK", "PLN", "NOK", "HUF", "CZK", "ILS", "MXN", "BRL", "MYR",
  "PHP", "TWD", "THB"
]);

function isPayPalSupportedCurrency(currency) {
  return PAYPAL_SUPPORTED_CURRENCIES.has((currency || "").toUpperCase());
}

/**
 * Create a PayPal v2 Checkout Order
 */
async function createOrder({
  orderNumber,
  amount,
  currency = "USD",
  description = "DR.MEDEX Medical Equipment",
  items = [],
  customer = {}
}) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const numAmount = Number(amount) || 0;
  const formattedAmount = currency === "JPY"
    ? Math.round(numAmount).toString()
    : numAmount.toFixed(2);

  // We use reference_id and custom_id for order correlation.
  // Note: invoice_id is omitted to avoid DUPLICATE_INVOICE_ID on customer re-attempts or retries.
  const purchaseUnit = {
    reference_id: String(orderNumber || Date.now()),
    description: `DR.MEDEX Order #${orderNumber}`.substring(0, 127),
    custom_id: String(orderNumber || ""),
    amount: {
      currency_code: currency,
      value: formattedAmount
    }
  };

  // If items are provided, build item line details safely
  if (Array.isArray(items) && items.length > 0) {
    const paypalItems = items.slice(0, 10).map((it) => {
      const itemPrice = currency === "JPY"
        ? Math.round(Number(it.unitPrice) || 0).toString()
        : Number(it.unitPrice || 0).toFixed(2);
      return {
        name: (it.title || "Medical Device").substring(0, 127),
        sku: (it.sku || it.productId || "MED-SKU").substring(0, 127),
        unit_amount: {
          currency_code: currency,
          value: itemPrice
        },
        quantity: String(it.quantity || 1),
        category: "PHYSICAL_GOODS"
      };
    });

    const itemTotal = paypalItems.reduce((acc, it) => {
      return acc + (Number(it.unit_amount.value) * Number(it.quantity));
    }, 0);

    const formattedItemTotal = currency === "JPY"
      ? Math.round(itemTotal).toString()
      : itemTotal.toFixed(2);

    // Only attach breakdown if item total matches overall amount (no discounts/shipping rounding divergence)
    if (Math.abs(Number(formattedItemTotal) - Number(formattedAmount)) < 0.05) {
      purchaseUnit.items = paypalItems;
      purchaseUnit.amount.breakdown = {
        item_total: {
          currency_code: currency,
          value: formattedAmount
        }
      };
    }
  }

  const payload = {
    intent: "CAPTURE",
    purchase_units: [purchaseUnit],
    application_context: {
      brand_name: "DR.MEDEX Medical Equipment",
      landing_page: "NO_PREFERENCE",
      user_action: "PAY_NOW",
      shipping_preference: "NO_SHIPPING"
    }
  };

  const res = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal Order Creation Failed (HTTP ${res.status}): ${data.message || JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Capture an approved PayPal order with idempotency
 */
async function captureOrder(paypalOrderId) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    }
  });

  const data = await res.json();
  if (!res.ok) {
    // If order was already captured (HTTP 422 with ORDER_ALREADY_CAPTURED), retrieve details
    if (
      res.status === 422 ||
      (Array.isArray(data.details) && data.details.some((d) => d.issue === "ORDER_ALREADY_CAPTURED"))
    ) {
      try {
        const existingDetails = await getOrderDetails(paypalOrderId);
        if (existingDetails && (existingDetails.status === "COMPLETED" || existingDetails.status === "APPROVED")) {
          return existingDetails;
        }
      } catch (checkErr) {
        // Fall through to throw original error
      }
    }
    throw new Error(`PayPal Order Capture Failed (HTTP ${res.status}): ${data.message || JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Retrieve details for an existing PayPal order
 */
async function getOrderDetails(paypalOrderId) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal Get Order Failed (HTTP ${res.status}): ${data.message || JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Verify Webhook Event Signature
 */
async function verifyWebhookSignature({
  webhookId,
  transmissionId,
  transmissionTime,
  certUrl,
  authAlgo,
  transmissionSig,
  webhookEvent
}) {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: webhookEvent
    })
  });

  const data = await res.json();
  return data && data.verification_status === "SUCCESS";
}

module.exports = {
  isPayPalSupportedCurrency,
  createOrder,
  captureOrder,
  getOrderDetails,
  verifyWebhookSignature,
  getClientId,
  getClientSecret,
  getMode,
  getBaseUrl
};
