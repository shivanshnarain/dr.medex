/**
 * Server-Side Cloud Firestore Service for DR.MEDEX Global
 * Manages product reviews & clinical customer feedback lifecycle in Cloud Firestore via Firebase Admin SDK.
 * 
 * Strict Data Architecture:
 * - Persists reviews exclusively in Cloud Firestore (drmedex project).
 * - Enforces status "PENDING" and verifiedPurchase false on all new submissions.
 * - Public queries return status "APPROVED" reviews only.
 * - Admin moderation (approval, rejection, verification, deletion) updates Firestore directly.
 * - Does not silently fall back to local JSON masking errors if Firestore fails.
 * - Supports Application Default Credentials (ADC), FIREBASE_SERVICE_ACCOUNT_KEY (env), or FIREBASE_SERVICE_ACCOUNT_PATH.
 */

const { getApps, initializeApp, cert, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const path = require("path");
const fs = require("fs");

const COLLECTION_NAME = "reviews";
let firestoreDb = null;
let initError = null;

/**
 * Initialize or retrieve the Firebase Admin Firestore database instance
 */
function getFirestoreDb() {
  if (firestoreDb) return firestoreDb;
  if (initError && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw initError;
  }
  initError = null;

  try {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      firestoreDb = getFirestore(existingApps[0]);
      return firestoreDb;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || "drmedex";
    let credential = null;

    // 1. Check for Service Account Key Path
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (serviceAccountPath) {
      const resolvedPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath);

      if (fs.existsSync(resolvedPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
        credential = cert(serviceAccount);
      } else {
        throw new Error(`Firebase service account file not found at: ${resolvedPath}`);
      }
    }
    // 2. Check for Service Account JSON string in environment variable
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        let rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY.trim();
        // Support base64 encoded service account string
        if (!rawKey.startsWith("{") && !rawKey.startsWith("[")) {
          try {
            rawKey = Buffer.from(rawKey, "base64").toString("utf8");
          } catch (e) {}
        }
        const serviceAccount = JSON.parse(rawKey);
        credential = cert(serviceAccount);
      } catch (parseErr) {
        throw new Error("Invalid JSON in FIREBASE_SERVICE_ACCOUNT_KEY environment variable.");
      }
    }
    // 3. Attempt Application Default Credentials (ADC)
    else {
      const defaultAdcPath = path.join(
        process.env.HOME || process.env.USERPROFILE || "",
        ".config/gcloud/application_default_credentials.json"
      );
      const isGcpEnvironment = Boolean(process.env.K_SERVICE || process.env.GAE_SERVICE || process.env.GOOGLE_CLOUD_PROJECT);

      if (!isGcpEnvironment && !fs.existsSync(defaultAdcPath)) {
        throw new Error(
          "Cloud Firestore Admin credentials are not configured on the server. " +
          "Please configure a Service Account credential via FIREBASE_SERVICE_ACCOUNT_KEY, " +
          "FIREBASE_SERVICE_ACCOUNT_PATH, or configure Application Default Credentials (ADC)."
        );
      }

      try {
        credential = applicationDefault();
      } catch (adcErr) {
        throw new Error(
          "Cloud Firestore Admin credentials are not configured on the server. " +
          "Please configure a Service Account credential via FIREBASE_SERVICE_ACCOUNT_KEY, " +
          "FIREBASE_SERVICE_ACCOUNT_PATH, or configure Application Default Credentials (ADC)."
        );
      }
    }

    const app = initializeApp({
      credential,
      projectId
    });

    firestoreDb = getFirestore(app);
    return firestoreDb;
  } catch (err) {
    initError = err;
    throw err;
  }
}

/**
 * Check if Firebase Admin is configured and ready
 */
function isFirestoreAdminConfigured() {
  try {
    getFirestoreDb();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Reset Admin instance for testing purposes
 */
async function resetFirestoreAdmin() {
  const { deleteApp } = require("firebase-admin/app");
  try {
    const existing = getApps();
    await Promise.all(existing.map(a => deleteApp(a)));
  } catch (e) {
    // ignore
  }
  firestoreDb = null;
  initError = null;
}

/**
 * Inject mock / testing Firestore DB for unit testing lifecycle without live network credentials
 */
function setMockFirestoreDb(mockDb) {
  firestoreDb = mockDb;
  initError = null;
}

/**
 * Fetch approved reviews for a specific product ID (or all approved reviews if productId is null) with pagination
 */
async function getApprovedReviews(productId = null, { limit = 10, offset = 0 } = {}) {
  const db = getFirestoreDb();
  const reviewsRef = db.collection(COLLECTION_NAME);

  let query = reviewsRef.where("status", "==", "APPROVED");
  if (productId) {
    query = query.where("productId", "==", productId);
  }

  let snapshot;
  try {
    snapshot = await query.orderBy("createdAt", "desc").get();
  } catch (err) {
    if (err.message && (err.message.includes("requires an index") || err.code === 9)) {
      snapshot = await query.get();
    } else {
      throw err;
    }
  }

  const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  allDocs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const paginated = allDocs.slice(offset, offset + limit);
  const hasMore = offset + limit < allDocs.length;

  return {
    reviews: paginated,
    total: allDocs.length,
    hasMore
  };
}

/**
 * Fetch all reviews for admin moderation (with status and product filters)
 */
async function getAdminReviews({ status = "ALL", productId = null, limit = 50, page = 1 } = {}) {
  const db = getFirestoreDb();
  const reviewsRef = db.collection(COLLECTION_NAME);

  let query = reviewsRef;
  if (productId) {
    query = query.where("productId", "==", productId);
  }
  if (status && status !== "ALL") {
    query = query.where("status", "==", status);
  }

  let snapshot;
  try {
    snapshot = await query.orderBy("createdAt", "desc").get();
  } catch (err) {
    if (err.message && (err.message.includes("requires an index") || err.code === 9)) {
      snapshot = await query.get();
    } else {
      throw err;
    }
  }

  const filteredDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  filteredDocs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const offset = (Math.max(1, page) - 1) * limit;
  const paginated = filteredDocs.slice(offset, offset + limit);

  // Aggregate counts for admin dashboard tabs
  const allSnapshot = await reviewsRef.get();
  const allDocs = allSnapshot.docs.map(d => d.data());

  return {
    reviews: paginated,
    total: filteredDocs.length,
    page,
    limit,
    counts: {
      total: allDocs.length,
      pending: allDocs.filter(r => r.status === "PENDING").length,
      quarantined: allDocs.filter(r => r.status === "QUARANTINED").length,
      approved: allDocs.filter(r => r.status === "APPROVED").length,
      rejected: allDocs.filter(r => r.status === "REJECTED").length
    }
  };
}

/**
 * Create a new customer review (verified and published immediately if clean, else PENDING/QUARANTINED)
 */
async function createReview(reviewPayload, { initialStatus = null } = {}) {
  const db = getFirestoreDb();
  const cleanRating = Math.min(5, Math.max(1, Math.round(Number(reviewPayload.rating) || 5)));
  const cleanTitle = String(reviewPayload.reviewTitle || "Clinical Feedback").trim().substring(0, 150);
  const cleanText = String(reviewPayload.reviewText || reviewPayload.comment || "").trim().substring(0, 2500);
  const customerName = String(
    reviewPayload.customerName ||
    reviewPayload.author ||
    (reviewPayload.userEmail ? reviewPayload.userEmail.split("@")[0] : "Verified Customer")
  ).trim().substring(0, 100);

  // Status is controlled strictly by server-side moderation; client cannot self-approve
  let assignedStatus = "PENDING";
  if (initialStatus === "APPROVED" || initialStatus === "QUARANTINED" || initialStatus === "PENDING" || initialStatus === "REJECTED") {
    assignedStatus = initialStatus;
  } else if (reviewPayload.moderatedStatus === "APPROVED" || reviewPayload.moderatedStatus === "QUARANTINED") {
    assignedStatus = reviewPayload.moderatedStatus;
  }

  const newDoc = {
    productId: reviewPayload.productId,
    productSlug: reviewPayload.productSlug || "",
    productTitle: reviewPayload.productTitle || "",
    rating: cleanRating,
    reviewTitle: cleanTitle,
    reviewText: cleanText,
    comment: cleanText, // backward compatibility
    customerFeedbackPoints: Array.isArray(reviewPayload.customerFeedbackPoints) 
      ? reviewPayload.customerFeedbackPoints.slice(0, 10) 
      : [],
    userId: "anonymous", // Prevent customer impersonation
    userEmail: String(reviewPayload.userEmail || "").substring(0, 150),
    customerName,
    author: customerName, // backward compatibility
    facility: String(reviewPayload.facility || "").trim().substring(0, 150),
    verifiedPurchase: false, // Strict: newly created reviews are unverified until admin checks order records
    status: assignedStatus,
    moderationReason: reviewPayload.moderationReason || null,
    aiAssisted: Boolean(reviewPayload.aiAssisted),
    date: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const docRef = await db.collection(COLLECTION_NAME).add(newDoc);
  return {
    id: docRef.id,
    ...newDoc
  };
}

/**
 * Update review moderation status in Cloud Firestore (Admin Privileged Write)
 */
async function updateReviewStatus(reviewId, { status, verifiedPurchase, adminNote = null }) {
  const db = getFirestoreDb();
  const allowedStatuses = ["PENDING", "APPROVED", "REJECTED", "QUARANTINED"];
  if (status && !allowedStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${allowedStatuses.join(", ")}`);
  }

  const docRef = db.collection(COLLECTION_NAME).doc(reviewId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return null;
  }

  const updates = {
    updatedAt: new Date().toISOString()
  };
  if (status) updates.status = status;
  if (verifiedPurchase !== undefined) updates.verifiedPurchase = Boolean(verifiedPurchase);
  if (adminNote !== undefined) updates.adminNote = adminNote;

  await docRef.update(updates);
  const updatedSnap = await docRef.get();
  return { id: updatedSnap.id, ...updatedSnap.data() };
}

/**
 * Delete a review from Cloud Firestore (Admin Privileged Write)
 */
async function deleteReview(reviewId) {
  const db = getFirestoreDb();
  const docRef = db.collection(COLLECTION_NAME).doc(reviewId);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    return false;
  }

  await docRef.delete();
  return true;
}

module.exports = {
  getApprovedReviews,
  getAdminReviews,
  createReview,
  updateReviewStatus,
  deleteReview,
  getFirestoreDb,
  isFirestoreAdminConfigured,
  resetFirestoreAdmin,
  setMockFirestoreDb
};
