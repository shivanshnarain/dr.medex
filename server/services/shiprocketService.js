/**
 * DR.MEDEX Global — Shiprocket Fulfillment & Logistics Service
 * 
 * Manages courier integration, AWB generation, label printing,
 * and shipment tracking using official Shiprocket API v2.
 * 
 * STRICT SECURITY CONSTRAINTS:
 * - Runs exclusively on the backend (Node.js).
 * - Never expose SHIPROCKET_EMAIL or SHIPROCKET_PASSWORD to frontend or logs.
 * - Handles authentication failures gracefully with clear diagnostics.
 */

const SHIPROCKET_API_BASE = "https://apiv2.shiprocket.in/v1/external";

// In-memory token cache (Shiprocket tokens are valid for 10 days)
let cachedToken = null;
let tokenExpiresAt = 0;
let lastAuthError = null;
let lastSyncTimestamp = null;
let lastSuccessfulSyncTimestamp = null;

class ShiprocketService {
  /**
   * Check if credentials are configured
   */
  isConfigured() {
    const email = process.env.SHIPROCKET_EMAIL || "";
    const pass = process.env.SHIPROCKET_PASSWORD || "";
    const directToken = process.env.SHIPROCKET_API_TOKEN || "";
    return Boolean(directToken || (email && pass));
  }

  /**
   * Safe status summary for Admin panel (Zero credential leakage)
   */
  getStatus() {
    const isConfig = this.isConfigured();
    const isAuthenticated = Boolean(cachedToken && Date.now() < tokenExpiresAt);

    let integrationStatus = "NOT_CONFIGURED";
    if (isConfig) {
      if (isAuthenticated) {
        integrationStatus = "AUTHENTICATED";
      } else if (lastAuthError) {
        integrationStatus = "AUTH_FAILED";
      } else {
        integrationStatus = "READY_TO_AUTHENTICATE";
      }
    }

    return {
      isConfigured: isConfig,
      isAuthenticated,
      integrationStatus,
      lastSyncTime: lastSyncTimestamp,
      lastSuccessfulSync: lastSuccessfulSyncTimestamp,
      lastError: lastAuthError ? lastAuthError.message || String(lastAuthError) : null,
      canRetry: true
    };
  }

  /**
   * Authenticate with Shiprocket API v2 to obtain Bearer Token
   */
  async getAuthToken(forceRefresh = false) {
    if (!this.isConfigured()) {
      const err = new Error("Shiprocket credentials are not configured in server environment. Set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.");
      lastAuthError = err;
      throw err;
    }

    // Direct token override
    if (process.env.SHIPROCKET_API_TOKEN) {
      cachedToken = process.env.SHIPROCKET_API_TOKEN.trim();
      tokenExpiresAt = Date.now() + 86400000 * 30; // 30 days
      lastSuccessfulSyncTimestamp = new Date().toISOString();
      lastAuthError = null;
      return cachedToken;
    }

    // Return cached token if still valid
    if (!forceRefresh && cachedToken && Date.now() < tokenExpiresAt - 300000) {
      return cachedToken;
    }

    const email = (process.env.SHIPROCKET_EMAIL || "").trim();
    const password = (process.env.SHIPROCKET_PASSWORD || "").trim();

    lastSyncTimestamp = new Date().toISOString();

    try {
      const res = await fetch(`${SHIPROCKET_API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        const errorMsg = data.message || `Authentication failed with status HTTP ${res.status}`;
        lastAuthError = new Error(errorMsg);
        throw lastAuthError;
      }

      cachedToken = data.token;
      tokenExpiresAt = Date.now() + 86400000 * 9; // 9 days (Shiprocket is 10 days)
      lastSuccessfulSyncTimestamp = new Date().toISOString();
      lastAuthError = null;
      return cachedToken;
    } catch (err) {
      lastAuthError = err;
      throw err;
    }
  }

  /**
   * Helper for authorized Shiprocket requests
   */
  async _request(endpoint, options = {}) {
    const token = await this.getAuthToken();
    const url = `${SHIPROCKET_API_BASE}${endpoint}`;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `Shiprocket API error HTTP ${res.status}`);
    }

    lastSyncTimestamp = new Date().toISOString();
    lastSuccessfulSyncTimestamp = new Date().toISOString();
    return data;
  }

  /**
   * Create an ad-hoc shipment for a DR.MEDEX Order
   */
  async createShipment(order) {
    if (!order) throw new Error("Order payload required for Shiprocket shipment creation.");

    // Map order items to Shiprocket format
    const orderItems = (order.items || []).map((it) => ({
      name: it.title || "Medical Equipment",
      sku: it.sku || `MED-${(it.productId || "").slice(-6).toUpperCase()}`,
      units: it.quantity || 1,
      selling_price: it.unitPriceDisplay || it.unitPrice || 1000,
      discount: 0,
      tax: 0
    }));

    const payload = {
      order_id: order.orderNumber,
      order_date: order.createdAt ? new Date(order.createdAt).toISOString().replace("T", " ").substring(0, 19) : new Date().toISOString().replace("T", " ").substring(0, 19),
      pickup_location: "DR.MEDEX Primary Warehouse",
      billing_customer_name: order.customer?.firstName || order.customer?.fullName?.split(" ")[0] || "Customer",
      billing_last_name: order.customer?.lastName || order.customer?.fullName?.split(" ").slice(1).join(" ") || "",
      billing_address: order.shippingAddress?.addressLine1 || "Facility Address",
      billing_address_2: order.shippingAddress?.addressLine2 || "",
      billing_city: order.shippingAddress?.city || "New Delhi",
      billing_pincode: order.shippingAddress?.postalCode || "110001",
      billing_state: order.shippingAddress?.state || "Delhi",
      billing_country: order.shippingAddress?.country || "India",
      billing_email: order.customer?.email || "customer@drmedex.com",
      billing_phone: order.customer?.phone?.replace(/\D/g, "").slice(-10) || "9876543210",
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.payment?.method === "Cash on Delivery" ? "COD" : "Prepaid",
      sub_total: order.pricing?.subtotal || order.pricing?.grandTotal || 1000,
      length: 50,
      breadth: 40,
      height: 30,
      weight: 12.5 // Average medical device crating weight in kg
    };

    return await this._request("/orders/create/adhoc", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  /**
   * Assign courier and generate AWB
   */
  async generateAWB(shipmentId, courierId = null) {
    if (!shipmentId) throw new Error("shipmentId required to generate AWB.");
    const body = { shipment_id: shipmentId };
    if (courierId) body.courier_id = courierId;

    return await this._request("/courier/assign/awb", {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  /**
   * Generate Shipping Label PDF URL
   */
  async generateLabel(shipmentId) {
    if (!shipmentId) throw new Error("shipmentId required to generate label.");
    return await this._request("/courier/generate/label", {
      method: "POST",
      body: JSON.stringify({ shipment_id: [shipmentId] })
    });
  }

  /**
   * Track Shipment by AWB Code
   */
  async trackAWB(awbCode) {
    if (!awbCode) throw new Error("awbCode required to track shipment.");
    return await this._request(`/courier/track/awb/${encodeURIComponent(awbCode)}`);
  }
}

const shiprocketService = new ShiprocketService();
module.exports = shiprocketService;

