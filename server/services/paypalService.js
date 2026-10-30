/**
 * DR.MEDEX Global — PayPal Payment Gateway Service
 * Server-Side Only: Never exposes PayPal Client Secret to the frontend
 */

const clientId = process.env.PAYPAL_CLIENT_ID || "";
const clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";
const mode = process.env.PAYPAL_MODE || "sandbox";

const BASE_URL = mode === "live"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

// In-memory token cache to minimize OAuth round-trips
let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Obtain or refresh OAuth 2.0 access token from PayPal
 */
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET is missing from server environment.");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
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

  const formattedAmount = currency === "JPY"
    ? Math.round(amount).toString()
    : amount.toFixed(2);

  const purchaseUnit = {
    reference_id: orderNumber,
    description: `DR.MEDEX Order #${orderNumber}`,
    custom_id: orderNumber,
    invoice_id: orderNumber,
    amount: {
      currency_code: currency,
      value: formattedAmount
    }
  };

  // If item details are provided, format them properly for PayPal
  if (Array.isArray(items) && items.length > 0) {
    const paypalItems = items.slice(0, 10).map((it) => {
      const itemPrice = currency === "JPY"
        ? Math.round(it.unitPrice || 0).toString()
        : Number(it.unitPrice || 0).toFixed(2);
      return {
        name: (it.title || "Medical Device").substring(0, 127),
        sku: (it.sku || it.productId || "SKU").substring(0, 127),
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

    // If itemTotal matches the overall amount, breakdown can be safely included
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

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
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
    throw new Error(`PayPal Order Creation Failed (HTTP ${res.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Capture an approved PayPal order
 */
async function captureOrder(paypalOrderId) {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal Order Capture Failed (HTTP ${res.status}): ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Retrieve details for an existing PayPal order
 */
async function getOrderDetails(paypalOrderId) {
  const token = await getAccessToken();

  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${paypalOrderId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal Get Order Failed (HTTP ${res.status}): ${JSON.stringify(data)}`);
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

  const res = await fetch(`${BASE_URL}/v1/notifications/verify-webhook-signature`, {
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
  getClientId: () => clientId,
  getMode: () => mode
};
