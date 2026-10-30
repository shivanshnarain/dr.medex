/**
 * DR.MEDEX Global — Client Web Push Notification Service
 * Manages W3C Push API subscription, Service Worker lifecycle,
 * VAPID key conversion, and customer preference synchronization.
 */

export interface PushNotificationPreferences {
  orderUpdates: boolean;
  websiteAnnouncements: boolean;
  customerSupport: boolean;
  marketing: boolean;
}

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  endpoint?: string;
  preferences: PushNotificationPreferences;
}

const DEFAULT_PREFERENCES: PushNotificationPreferences = {
  orderUpdates: true,
  websiteAnnouncements: true,
  customerSupport: true,
  marketing: false
};

const STORAGE_KEYS = {
  ENDPOINT: "drmedex_push_endpoint",
  STATUS: "drmedex_push_subscribed",
  DISMISSED_AT: "drmedex_push_dismissed_at"
};

/**
 * Convert URL-safe base64 string to Uint8Array for VAPID applicationServerKey
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the current browser supports Web Push & Service Workers
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get current browser notification permission
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isPushNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Register Service Worker for push notifications
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.warn("[PushService] Service worker registration error:", err);
    return null;
  }
}

/**
 * Fetch VAPID public key from backend
 */
export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/notifications/vapid-public-key");
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && data.publicKey ? data.publicKey : null;
  } catch (err) {
    console.warn("[PushService] Failed to fetch VAPID public key:", err);
    return null;
  }
}

/**
 * Request notification permission and subscribe device to PushManager
 */
export async function subscribeToPush(options: {
  customerId?: string | null;
  customerEmail?: string | null;
  preferences?: Partial<PushNotificationPreferences>;
} = {}): Promise<{ success: boolean; message?: string; subscription?: PushSubscription }> {
  if (!isPushNotificationSupported()) {
    return { success: false, message: "Push notifications are not supported in this browser." };
  }

  try {
    // 1. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, message: "Notification permission was not granted by user." };
    }

    // 2. Register Service Worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return { success: false, message: "Unable to register service worker." };
    }

    // 3. Get VAPID public key
    const publicKey = await getVapidPublicKey();
    if (!publicKey) {
      return { success: false, message: "Failed to retrieve VAPID public key from server." };
    }

    // 4. Subscribe via PushManager
    const applicationServerKey = urlBase64ToUint8Array(publicKey);
    const existingSub = await registration.pushManager.getSubscription();

    let subscription = existingSub;
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any
      });
    }

    if (!subscription) {
      return { success: false, message: "Failed to create push subscription on device." };
    }

    const subJson = subscription.toJSON();
    const endpoint = subJson.endpoint || subscription.endpoint;
    const p256dh = subJson.keys?.p256dh || "";
    const auth = subJson.keys?.auth || "";

    const mergedPreferences: PushNotificationPreferences = {
      ...DEFAULT_PREFERENCES,
      ...(options.preferences || {})
    };

    // 5. Send subscription to DR.MEDEX backend
    const res = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint,
          keys: { p256dh, auth }
        },
        userId: options.customerId || null,
        customerEmail: options.customerEmail || null,
        preferences: mergedPreferences
      })
    });

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const resData = await res.json();
    if (!resData.success) {
      throw new Error(resData.message || "Server rejected push registration.");
    }

    localStorage.setItem(STORAGE_KEYS.ENDPOINT, endpoint);
    localStorage.setItem(STORAGE_KEYS.STATUS, "true");

    return { success: true, subscription };
  } catch (err: any) {
    console.error("[PushService] Subscription error:", err);
    return { success: false, message: err.message || "Failed to enable notifications." };
  }
}

/**
 * Unsubscribe current device from push notifications
 */
export async function unsubscribeFromPush(): Promise<{ success: boolean; message?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, message: "Push notifications not supported." };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    const endpoint = subscription?.endpoint || localStorage.getItem(STORAGE_KEYS.ENDPOINT);

    if (subscription) {
      await subscription.unsubscribe();
    }

    if (endpoint) {
      await fetch("/api/notifications/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint })
      });
    }

    localStorage.removeItem(STORAGE_KEYS.ENDPOINT);
    localStorage.removeItem(STORAGE_KEYS.STATUS);

    return { success: true, message: "Successfully unsubscribed." };
  } catch (err: any) {
    console.error("[PushService] Unsubscribe error:", err);
    return { success: false, message: err.message || "Failed to unsubscribe." };
  }
}

/**
 * Query current subscription status and preferences
 */
export async function getPushStatus(userId?: string): Promise<PushStatus> {
  const supported = isPushNotificationSupported();
  if (!supported) {
    return {
      supported: false,
      permission: "unsupported",
      isSubscribed: false,
      preferences: DEFAULT_PREFERENCES
    };
  }

  const permission = Notification.permission;
  let isSubscribed = false;
  let endpoint = localStorage.getItem(STORAGE_KEYS.ENDPOINT) || undefined;
  let preferences = DEFAULT_PREFERENCES;

  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      isSubscribed = true;
      endpoint = sub.endpoint;
      localStorage.setItem(STORAGE_KEYS.ENDPOINT, sub.endpoint);
      localStorage.setItem(STORAGE_KEYS.STATUS, "true");
    } else {
      localStorage.removeItem(STORAGE_KEYS.STATUS);
    }

    if (endpoint || userId) {
      const q = new URLSearchParams();
      if (endpoint) q.set("endpoint", endpoint);
      if (userId) q.set("userId", userId);

      const res = await fetch(`/api/notifications/preferences?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.preferences) {
          preferences = { ...DEFAULT_PREFERENCES, ...data.preferences };
        }
      }
    }
  } catch (e) {
    // Graceful fallback
  }

  return {
    supported: true,
    permission,
    isSubscribed,
    endpoint,
    preferences
  };
}

/**
 * Save updated preferences to backend
 */
export async function savePreferences(
  preferences: PushNotificationPreferences,
  endpoint?: string
): Promise<{ success: boolean; preferences?: PushNotificationPreferences }> {
  const ep = endpoint || localStorage.getItem(STORAGE_KEYS.ENDPOINT);
  if (!ep) {
    return { success: false };
  }

  try {
    const res = await fetch("/api/notifications/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: ep,
        preferences
      })
    });
    const data = await res.json();
    return { success: Boolean(data.success), preferences: data.preferences || preferences };
  } catch (err) {
    console.error("[PushService] Failed to save preferences:", err);
    return { success: false };
  }
}

/**
 * Helper to check if location permission has been explicitly dismissed
 */
export function hasDismissedLocationPrompt(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("drmedex_location_prompt_dismissed") === "true";
}

export function dismissLocationPrompt(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("drmedex_location_prompt_dismissed", "true");
  }
}

/**
 * Helper to check if push notification prompt has been dismissed
 */
export function hasDismissedPushPrompt(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("drmedex_push_prompt_dismissed") === "true";
}

export function dismissPushPrompt(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("drmedex_push_prompt_dismissed", "true");
  }
}
