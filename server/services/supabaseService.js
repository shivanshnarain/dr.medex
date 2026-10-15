/**
 * DR.MEDEX Global — Supabase Server Admin Service
 * Handles server-side customer management & login activity auditing.
 * 
 * STRICT SECURITY CONSTRAINTS:
 * - This service runs exclusively on the Node.js Express backend.
 * - Never expose SUPABASE_SECRET_KEY to client code, browser bundles, or API responses.
 * - All admin endpoints invoking this service MUST be protected by requireAdmin middleware.
 * - Passwords, session tokens, and secrets are NEVER recorded.
 * - 30-Day Activity Retention: Applies ONLY to temporary login activity events. Customer accounts & profiles are permanent.
 */

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://drmedex.supabase.co").replace(/\/+$/, "");
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "";

// In-memory fallback customers for offline/sandbox development environments
const MOCK_CUSTOMERS = [
  {
    id: "usr-001-vance",
    email: "dr.elena.vance@saintmarys-cardio.org",
    fullName: "Dr. Elena Vance",
    phone: "+1 (415) 890-2341",
    createdAt: "2026-03-12T10:14:00.000Z",
    lastSignInAt: "2026-10-14T18:30:00.000Z",
    emailConfirmed: true,
    institution: "St. Mary's Cardiovascular Institute"
  },
  {
    id: "usr-002-thorne",
    email: "m.thorne@berlin-charite-neuro.de",
    fullName: "Prof. Dr. Marcus Thorne",
    phone: "+49 30 45050",
    createdAt: "2026-04-05T14:22:00.000Z",
    lastSignInAt: "2026-10-12T09:15:00.000Z",
    emailConfirmed: true,
    institution: "Charité Comprehensive Neuroscience Center"
  },
  {
    id: "usr-003-jenkins",
    email: "s.jenkins@melbourne-health.gov.au",
    fullName: "Dr. Sarah Jenkins",
    phone: "+61 3 9342 7000",
    createdAt: "2026-05-18T08:45:00.000Z",
    lastSignInAt: "2026-10-10T11:20:00.000Z",
    emailConfirmed: true,
    institution: "The Royal Melbourne Surgical Directorate"
  },
  {
    id: "usr-004-chen",
    email: "alistair.chen@singapore-general.sg",
    fullName: "Dr. Alistair Chen",
    phone: "+65 6222 3322",
    createdAt: "2026-06-20T16:10:00.000Z",
    lastSignInAt: "2026-10-13T14:05:00.000Z",
    emailConfirmed: true,
    institution: "Singapore General Hospital"
  },
  {
    id: "usr-005-dubois",
    email: "c.dubois@ap-hp-paris.fr",
    fullName: "Dr. Claire Dubois",
    phone: "+33 1 40 27 30 00",
    createdAt: "2026-07-08T11:00:00.000Z",
    lastSignInAt: "2026-10-11T16:45:00.000Z",
    emailConfirmed: true,
    institution: "Hôpital Universitaire Necker-Enfants Malades"
  },
  {
    id: "usr-006-almansoor",
    email: "t.almansoor@clevelandclinicabudhabi.ae",
    fullName: "Dr. Tariq Al-Mansoor",
    phone: "+971 2 659 0000",
    createdAt: "2026-08-14T13:30:00.000Z",
    lastSignInAt: "2026-10-09T08:10:00.000Z",
    emailConfirmed: true,
    institution: "Cleveland Clinic Abu Dhabi"
  }
];

// In-memory Customer Login Activity Store (30-day retention window)
let CUSTOMER_LOGIN_ACTIVITIES = [
  {
    id: "act-init-001",
    customerId: "usr-001-vance",
    email: "dr.elena.vance@saintmarys-cardio.org",
    fullName: "Dr. Elena Vance",
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    ip: "198.51.100.24",
    device: "macOS / Chrome 134",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/134.0.0.0 Safari/537.36",
    accountStatus: "PERMANENT_VERIFIED"
  },
  {
    id: "act-init-002",
    customerId: "usr-004-chen",
    email: "alistair.chen@singapore-general.sg",
    fullName: "Dr. Alistair Chen",
    timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    ip: "203.0.113.88",
    device: "Windows 11 / Edge",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133.0.0.0 Safari/537.36 Edg/133.0",
    accountStatus: "PERMANENT_VERIFIED"
  },
  {
    id: "act-init-003",
    customerId: "usr-002-thorne",
    email: "m.thorne@berlin-charite-neuro.de",
    fullName: "Prof. Dr. Marcus Thorne",
    timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
    ip: "192.0.2.140",
    device: "Linux / Firefox",
    userAgent: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0",
    accountStatus: "PERMANENT_VERIFIED"
  },
  {
    id: "act-init-004",
    customerId: "usr-003-jenkins",
    email: "s.jenkins@melbourne-health.gov.au",
    fullName: "Dr. Sarah Jenkins",
    timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
    ip: "198.51.100.92",
    device: "iOS / Safari",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
    accountStatus: "PERMANENT_VERIFIED"
  }
];

/**
 * Human-readable client user agent descriptor
 */
function parseUserAgent(ua = "") {
  const clean = String(ua || "").toLowerCase();
  let os = "Desktop";
  let browser = "Browser";

  if (clean.includes("iphone") || clean.includes("ipad")) os = "iOS";
  else if (clean.includes("macintosh") || clean.includes("mac os")) os = "macOS";
  else if (clean.includes("windows")) os = "Windows";
  else if (clean.includes("android")) os = "Android";
  else if (clean.includes("linux")) os = "Linux";

  if (clean.includes("edg/")) browser = "Edge";
  else if (clean.includes("chrome") && !clean.includes("edg/")) browser = "Chrome";
  else if (clean.includes("firefox")) browser = "Firefox";
  else if (clean.includes("safari") && !clean.includes("chrome")) browser = "Safari";

  return `${os} / ${browser}`;
}

class SupabaseService {
  /**
   * Retrieves paginated, searchable list of customers using Supabase Admin API
   * Falls back smoothly in offline sandbox test environments
   */
  async getCustomers({ search = "", page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const searchTerm = (search || "").trim().toLowerCase();

    // 1. Attempt live Supabase Auth Admin REST API fetch
    if (SUPABASE_SECRET_KEY) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${pageNum}&per_page=${limitNum}`, {
          method: "GET",
          headers: {
            apikey: SUPABASE_SECRET_KEY,
            Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
            "Content-Type": "application/json"
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const body = await res.json();
          const rawUsers = Array.isArray(body?.users) ? body.users : Array.isArray(body) ? body : [];

          let formatted = rawUsers.map((u) => {
            const meta = u.user_metadata || {};
            return {
              id: u.id,
              email: u.email || "",
              fullName: meta.full_name || meta.name || (u.email ? u.email.split("@")[0] : "Customer"),
              phone: u.phone || meta.phone || "",
              createdAt: u.created_at || new Date().toISOString(),
              lastSignInAt: u.last_sign_in_at || null,
              emailConfirmed: Boolean(u.email_confirmed_at || u.confirmed_at),
              institution: meta.institution || meta.company || "Independent Healthcare Provider"
            };
          });

          if (searchTerm) {
            formatted = formatted.filter(
              (c) =>
                c.fullName.toLowerCase().includes(searchTerm) ||
                c.email.toLowerCase().includes(searchTerm) ||
                c.phone.toLowerCase().includes(searchTerm) ||
                c.id.toLowerCase().includes(searchTerm)
            );
          }

          const total = body.total || formatted.length;
          return {
            customers: formatted,
            totalCount: total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum) || 1,
            isLive: true
          };
        }
      } catch (err) {
        // Fallback for sandboxed or offline network environments
      }
    }

    // 2. Offline / Simulated Customer Management Fallback
    let filtered = [...MOCK_CUSTOMERS];
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.fullName.toLowerCase().includes(searchTerm) ||
          c.email.toLowerCase().includes(searchTerm) ||
          c.phone.toLowerCase().includes(searchTerm) ||
          c.id.toLowerCase().includes(searchTerm) ||
          (c.institution && c.institution.toLowerCase().includes(searchTerm))
      );
    }

    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);

    return {
      customers: paginated,
      totalCount: filtered.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(filtered.length / limitNum) || 1,
      isLive: false
    };
  }

  /**
   * Retrieves single customer by ID
   */
  async getCustomerById(customerId) {
    if (!customerId) return null;

    if (SUPABASE_SECRET_KEY) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${customerId}`, {
          method: "GET",
          headers: {
            apikey: SUPABASE_SECRET_KEY,
            Authorization: `Bearer ${SUPABASE_SECRET_KEY}`
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const u = await res.json();
          const meta = u.user_metadata || {};
          return {
            id: u.id,
            email: u.email || "",
            fullName: meta.full_name || meta.name || (u.email ? u.email.split("@")[0] : "Customer"),
            phone: u.phone || meta.phone || "",
            createdAt: u.created_at,
            lastSignInAt: u.last_sign_in_at || null,
            emailConfirmed: Boolean(u.email_confirmed_at),
            institution: meta.institution || "Independent Healthcare Provider"
          };
        }
      } catch {
        // Fallback
      }
    }

    return MOCK_CUSTOMERS.find((c) => c.id === customerId) || null;
  }

  /**
   * Returns in-memory mock customers list for duplicate detection
   */
  getMockCustomers() {
    return MOCK_CUSTOMERS;
  }

  /**
   * Updates customer email address in local storage and active activities
   */
  updateCustomerEmail(customerId, newEmail) {
    if (!newEmail) return false;
    const clean = newEmail.toLowerCase().trim();
    let customer = MOCK_CUSTOMERS.find((c) => c.id === customerId || c.email.toLowerCase() === String(customerId).toLowerCase());
    if (customer) {
      customer.email = clean;
    } else {
      // If customer not present in initial mock array, add customer entry
      customer = {
        id: customerId,
        email: clean,
        fullName: clean.split("@")[0] || "Customer",
        phone: "",
        createdAt: new Date().toISOString(),
        lastSignInAt: new Date().toISOString(),
        emailConfirmed: true,
        institution: "Healthcare Facility"
      };
      MOCK_CUSTOMERS.push(customer);
    }

    // Also update customer login activities
    CUSTOMER_LOGIN_ACTIVITIES.forEach((act) => {
      if (act.customerId === customerId) {
        act.email = clean;
      }
    });

    return true;
  }

  /**
   * Records a Customer Login Activity Event
   * Only called on successful customer authentication. Never logs passwords or secrets.
   * Updates lastSignInAt timestamp on customer account.
   */
  async recordCustomerLogin({ customerId, email, fullName, ip, userAgent }) {
    if (!customerId || !email) {
      throw new Error("Customer ID and email are required to record login activity.");
    }

    // Auto-clean any records older than 30 days
    this.cleanupExpiredActivity(30);

    const nowIso = new Date().toISOString();
    const cleanIp = (ip || "127.0.0.1").replace(/^.*:/, "") || "127.0.0.1";
    const device = parseUserAgent(userAgent);

    const activityEvent = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      customerId: String(customerId),
      email: String(email).toLowerCase().trim(),
      fullName: String(fullName || email.split("@")[0]).trim(),
      timestamp: nowIso,
      ip: cleanIp,
      device,
      userAgent: String(userAgent || "").substring(0, 255),
      accountStatus: "PERMANENT_ACTIVE"
    };

    // Prepend to list (latest activity first)
    CUSTOMER_LOGIN_ACTIVITIES.unshift(activityEvent);

    // Update customer lastSignInAt in local memory
    const existingMock = MOCK_CUSTOMERS.find((c) => c.id === customerId || c.email === activityEvent.email);
    if (existingMock) {
      existingMock.lastSignInAt = nowIso;
    } else {
      // If customer was newly signed up in session, ensure they exist in persistent directory
      MOCK_CUSTOMERS.push({
        id: customerId,
        email: activityEvent.email,
        fullName: activityEvent.fullName,
        phone: "",
        createdAt: nowIso,
        lastSignInAt: nowIso,
        emailConfirmed: true,
        institution: "Independent Healthcare Provider"
      });
    }

    return activityEvent;
  }

  /**
   * Retrieves paginated, searchable login activity (30-day retention window)
   * Latest activity first
   */
  async getCustomerLoginActivity({ search = "", page = 1, limit = 20 } = {}) {
    // Purge expired records before retrieval
    this.cleanupExpiredActivity(30);

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const searchTerm = (search || "").trim().toLowerCase();

    let filtered = [...CUSTOMER_LOGIN_ACTIVITIES];

    if (searchTerm) {
      filtered = filtered.filter(
        (a) =>
          a.fullName.toLowerCase().includes(searchTerm) ||
          a.email.toLowerCase().includes(searchTerm) ||
          a.ip.toLowerCase().includes(searchTerm) ||
          a.device.toLowerCase().includes(searchTerm) ||
          a.customerId.toLowerCase().includes(searchTerm)
      );
    }

    // Sort latest first
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const startIndex = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(startIndex, startIndex + limitNum);

    return {
      activities: paginated,
      totalCount: filtered.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(filtered.length / limitNum) || 1
    };
  }

  /**
   * 30-Day Activity Retention Cleanup
   * Strictly cleans up temporary login activity events older than retentionDays.
   * GUARANTEE: Never touches customer accounts, profiles, or orders!
   */
  cleanupExpiredActivity(retentionDays = 30) {
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const initialCount = CUSTOMER_LOGIN_ACTIVITIES.length;

    CUSTOMER_LOGIN_ACTIVITIES = CUSTOMER_LOGIN_ACTIVITIES.filter((a) => {
      const recTime = new Date(a.timestamp).getTime();
      return recTime >= cutoffTime;
    });

    const cleanedCount = initialCount - CUSTOMER_LOGIN_ACTIVITIES.length;
    return {
      cleanedCount,
      remainingCount: CUSTOMER_LOGIN_ACTIVITIES.length,
      retentionDays,
      accountsUntouched: MOCK_CUSTOMERS.length
    };
  }
}

module.exports = new SupabaseService();
