const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "../data/db.json");

let auditLogs = [];

// Initialize from existing DB
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.auditLogs)) {
      auditLogs = parsed.auditLogs;
    }
  }
} catch (e) {
  auditLogs = [];
}

let auditPersistTimer = null;
let auditWriteInFlight = false;
let auditDirtyAgain = false;

async function flushAuditToDisk() {
  if (process.env.VERCEL) return;
  if (auditWriteInFlight) {
    auditDirtyAgain = true;
    return;
  }
  auditWriteInFlight = true;
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = await fs.promises.readFile(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      parsed.auditLogs = auditLogs;
      await fs.promises.writeFile(DB_FILE, JSON.stringify(parsed), "utf-8");
    }
  } catch (e) {
    // Non-fatal
  } finally {
    auditWriteInFlight = false;
    if (auditDirtyAgain) {
      auditDirtyAgain = false;
      setImmediate(flushAuditToDisk);
    }
  }
}

function persistAudit() {
  if (process.env.VERCEL) return;
  if (auditPersistTimer) return;
  auditPersistTimer = setTimeout(() => {
    auditPersistTimer = null;
    flushAuditToDisk();
  }, 150);
  if (typeof auditPersistTimer.unref === "function") {
    auditPersistTimer.unref();
  }
}

module.exports = {
  logAction: (adminEmail, action, productId, details = {}) => {
    const entry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      adminId: adminEmail || "SYSTEM_ADMIN",
      action, // e.g. PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_DELETED, PRICE_CHANGED, etc.
      productId: productId || null,
      details,
      timestamp: new Date().toISOString()
    };

    auditLogs.unshift(entry);
    // Keep last 1,000 logs
    if (auditLogs.length > 1000) {
      auditLogs = auditLogs.slice(0, 1000);
    }

    persistAudit();
    return entry;
  },

  getLogs: (filters = {}) => {
    let result = [...auditLogs];
    if (filters.action) {
      result = result.filter(l => l.action === filters.action);
    }
    if (filters.productId) {
      result = result.filter(l => l.productId === filters.productId);
    }
    const limit = parseInt(filters.limit) || 100;
    return result.slice(0, limit);
  }
};
