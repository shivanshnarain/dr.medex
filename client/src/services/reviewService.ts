import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  getDocs,
  DocumentSnapshot,
  QueryDocumentSnapshot,
  DocumentData
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";
import { Review, CreateReviewInput, ReviewSuggestion } from "../types";

export interface FetchReviewsResult {
  reviews: Review[];
  hasMore: boolean;
  lastDoc: DocumentSnapshot | null;
  source: "firestore" | "api";
}

export interface AiReviewSuggestion {
  suggestedTitle: string;
  suggestedReviewText: string;
  draftOptions?: Array<{
    style: string;
    title: string;
    text: string;
  }>;
  feedbackSummaryTags: string[];
}

export function getClientFallbackSuggestions(
  rating: number,
  productTitle: string = "Medical Equipment",
  poolIndex: number = 0
): ReviewSuggestion[] {
  const cleanRating = Math.min(5, Math.max(1, Math.round(Number(rating) || 5)));
  const normPool = Math.abs(Number(poolIndex) || 0);

  if (cleanRating === 5) {
    const pools = [
      [
        { id: "sugg-5-0-1", theme: "Build Quality", title: "Excellent Build Quality", text: "Excellent build quality and very smooth operation. Perfect for our OT setup." },
        { id: "sugg-5-0-2", theme: "Operation", title: "Sturdy & Reliable", text: "Sturdy, reliable, and easy to adjust. Highly recommended for modern surgical theatres." },
        { id: "sugg-5-0-3", theme: "Stability", title: "Great Stability", text: "Great stability and patient comfort. Makes procedures much more efficient." },
        { id: "sugg-5-0-4", theme: "Design", title: "Superior Hydraulic Movement", text: "Superior design with smooth hydraulic movement. Exactly what we needed." },
        { id: "sugg-5-0-5", theme: "Durability", title: "Very Durable", text: "Very durable and easy to use. Excellent value for a professional OT table." },
        { id: "sugg-5-0-6", theme: "Performance", title: "Outstanding Performance", text: "Outstanding performance and reliability. A must-have for any surgical facility." }
      ],
      [
        { id: "sugg-5-1-1", theme: "Precision", title: "Impeccable Rigidity", text: "Impeccable structural rigidity and whisper-quiet motor controls during all surgical cases." },
        { id: "sugg-5-1-2", theme: "Workflow", title: "Seamless Integration", text: "Seamless departmental integration with remarkably fast and responsive positioning adjustments." },
        { id: "sugg-5-1-3", theme: "Engineering", title: "Exceptional Precision", text: "Exceptional precision engineering that inspires complete confidence in daily clinical duties." },
        { id: "sugg-5-1-4", theme: "Ergonomics", title: "Thoughtful Ergonomics", text: "Thoughtful ergonomic design has noticeably reduced surgical team fatigue during long procedures." },
        { id: "sugg-5-1-5", theme: "Sanitization", title: "Rapid Sanitization", text: "Surfaces disinfect rapidly between patients, keeping room turnover times impressively low." },
        { id: "sugg-5-1-6", theme: "Value", title: "Top-Tier Hardware", text: "Top-tier biomedical hardware delivering dependable clinical performance at very fair pricing." }
      ],
      [
        { id: "sugg-5-2-1", theme: "Construction", title: "Rock-Solid Build", text: "Rock-solid construction and intuitive controls that required zero staff retraining time." },
        { id: "sugg-5-2-2", theme: "Articulation", title: "Flawless Articulation", text: "Flawless articulation and dependable mechanical stability across demanding daily operating schedules." },
        { id: "sugg-5-2-3", theme: "Comfort", title: "Consistent Smoothness", text: "Consistently smooth adjustments and superb comfort for patients throughout delicate interventions." },
        { id: "sugg-5-2-4", theme: "Materials", title: "High-Grade Materials", text: "High-grade materials withstand rigorous hospital chemical disinfection protocols effortlessly." },
        { id: "sugg-5-2-5", theme: "Reliability", title: "Hospital-Grade Workhorse", text: "A dependable hospital-grade workhorse providing micrometer precision every single surgical day." },
        { id: "sugg-5-2-6", theme: "Hydraulics", title: "Reliable Hydraulics", text: "Exceeded clinical expectations with reliable hydraulics, firm base locks, and pristine finishes." }
      ]
    ];
    return pools[normPool % pools.length];
  }

  if (cleanRating === 4) {
    const pools = [
      [
        { id: "sugg-4-0-1", theme: "Build Quality", title: "Solid Construction", text: "Solid construction and smooth movement, with just a slight learning curve." },
        { id: "sugg-4-0-2", theme: "Performance", title: "Reliable Performance", text: "Reliable daily performance and good ergonomics, though the chassis is fairly heavy." },
        { id: "sugg-4-0-3", theme: "Versatility", title: "Great Versatility", text: "Great positioning versatility and steady controls, but takes practice to master." },
        { id: "sugg-4-0-4", theme: "Durability", title: "Durable Platform", text: "Durable hospital-grade build with dependable hydraulics and comfortable patient support." },
        { id: "sugg-4-0-5", theme: "Operation", title: "Dependable Daily Utility", text: "Very dependable for routine surgical cases, though lateral adjustments feel slightly stiff." },
        { id: "sugg-4-0-6", theme: "Value", title: "Good Overall Quality", text: "Good overall quality and excellent stability, offering solid departmental value." }
      ],
      [
        { id: "sugg-4-1-1", theme: "Stability", title: "Sturdy & Dependable", text: "Sturdy and dependable in theater, though initial setup required extra patience." },
        { id: "sugg-4-1-2", theme: "Movement", title: "Smooth Motor Functions", text: "Smooth motorized functions with solid stability, but remote cable could be longer." },
        { id: "sugg-4-1-3", theme: "Ergonomics", title: "Comfortable Support", text: "Comfortable padding and secure locking mechanisms with minor equipment weight considerations." },
        { id: "sugg-4-1-4", theme: "Caseloads", title: "Handles Heavy Caseloads", text: "Well-built unit that handles heavy clinical caseloads with consistent daily reliability." },
        { id: "sugg-4-1-5", theme: "Sanitization", title: "Easy To Sanitize", text: "Easy to sanitize and operate, with slight resistance on manual tilt adjustments." },
        { id: "sugg-4-1-6", theme: "Investment", title: "Cost-Effective Asset", text: "Cost-effective clinical asset providing reliable performance and durable metal fabrication." }
      ]
    ];
    return pools[normPool % pools.length];
  }

  if (cleanRating === 3) {
    const pools = [
      [
        { id: "sugg-3-0-1", theme: "Functionality", title: "Acceptable Functionality", text: "Acceptable baseline functionality, but motor adjustments could be noticeably faster." },
        { id: "sugg-3-0-2", theme: "Build Quality", title: "Adequate Build", text: "Adequate build for standard procedures, though upholstery feels somewhat basic." },
        { id: "sugg-3-0-3", theme: "Utility", title: "Decent Utility", text: "Functions decently for minor cases, but lacks the refinement of premium models." },
        { id: "sugg-3-0-4", theme: "Stability", title: "Fair Stability", text: "Fair operational stability, though tilt mechanisms require occasional manual realignment." },
        { id: "sugg-3-0-5", theme: "Documentation", title: "Usable Equipment", text: "Usable clinical equipment, but the user manual lacks clear maintenance guidance." },
        { id: "sugg-3-0-6", theme: "Ergonomics", title: "Reasonable Performance", text: "Reasonable performance for the price, but ergonomics are only average." }
      ],
      [
        { id: "sugg-3-1-1", theme: "Controls", title: "Satisfactory Controls", text: "Average daily utility with satisfactory controls, but movement can feel sluggish." },
        { id: "sugg-3-1-2", theme: "Hardware", title: "Basic Needs", text: "Meets basic clinical needs, though foot pedals feel slightly lightweight." },
        { id: "sugg-3-1-3", theme: "Travel Range", title: "Acceptable Stability", text: "Acceptable stability during routine work, but height travel range is somewhat limited." },
        { id: "sugg-3-1-4", theme: "Fasteners", title: "Decent Construction", text: "Decent construction overall, but requires frequent tightening of lateral armrests." },
        { id: "sugg-3-1-5", theme: "Outpatient", title: "Moderate Performance", text: "Moderate performance that works fine for lighter outpatient department duties." },
        { id: "sugg-3-1-6", theme: "Durability", title: "Baseline Durability", text: "Fair entry-level equipment with baseline durability, but noticeable room for refinement." }
      ]
    ];
    return pools[normPool % pools.length];
  }

  if (cleanRating === 2) {
    const pools = [
      [
        { id: "sugg-2-0-1", theme: "Sluggish Response", title: "Sluggish Response", text: "Motor response is sluggish and tilt adjustments lack precision under clinical load." },
        { id: "sugg-2-0-2", theme: "Vibration", title: "Noticeable Vibration", text: "Noticeable vibration during vertical travel causes discomfort during delicate procedures." },
        { id: "sugg-2-0-3", theme: "Upholstery", title: "Premature Wear", text: "Upholstery seams showed premature wear after only three months of disinfection." },
        { id: "sugg-2-0-4", theme: "Calibration", title: "Frequent Drift", text: "Frequent calibration drift requires constant biomedical technician intervention." },
        { id: "sugg-2-0-5", theme: "Ergonomics", title: "Awkward Ergonomics", text: "Ergonomics are awkward for tall practitioners, causing unnecessary surgical fatigue." },
        { id: "sugg-2-0-6", theme: "Parts Supply", title: "Inconsistent Quality", text: "Build quality is inconsistent and replacement components took weeks to arrive." }
      ],
      [
        { id: "sugg-2-1-1", theme: "Locking", title: "Slipping Floor Locks", text: "Base floor locks slip slightly when maneuvering patients into surgical position." },
        { id: "sugg-2-1-2", theme: "Hydraulics", title: "Jerky Tilting Action", text: "Hydraulic tilting action is jerky rather than gradual, disturbing sensitive examinations." },
        { id: "sugg-2-1-3", theme: "Noise", title: "Unusually Loud Motors", text: "Motor noise is louder than acceptable for a quiet hospital procedural suite." },
        { id: "sugg-2-1-4", theme: "Fasteners", title: "Loose Armrest Hinges", text: "Lateral armrest hinges loosen repeatedly despite regular departmental torque checks." },
        { id: "sugg-2-1-5", theme: "Interface", title: "Confusing Hand Controller", text: "Hand controller labeling rubbed off quickly under standard alcohol surface wipes." },
        { id: "sugg-2-1-6", theme: "Support", title: "Subpar Technical Service", text: "Technical service support was slow to address recurring power supply errors." }
      ]
    ];
    return pools[normPool % pools.length];
  }

  // 1 Star
  const pools = [
    [
      { id: "sugg-1-0-1", theme: "Hydraulics", title: "Severe Fluid Leakage", text: "Severe hydraulic fluid leakage occurred within two weeks of clinical deployment." },
      { id: "sugg-1-0-2", theme: "Motor", title: "Complete Motor Failure", text: "Complete motor failure during patient preparation; biomedical inspection recommended." },
      { id: "sugg-1-0-3", theme: "Safety", title: "Clinically Unsafe Base", text: "Unstable base and erratic electrical controls make this unit clinically unsafe." },
      { id: "sugg-1-0-4", theme: "Frame", title: "Structural Frame Flexing", text: "Structural frame flexed alarmingly under standard patient weight during operation." },
      { id: "sugg-1-0-5", theme: "Drift", title: "Unacceptable Position Drift", text: "Unacceptable positioning drift during procedures poses significant patient safety risks." },
      { id: "sugg-1-0-6", theme: "Electronics", title: "Defective Electronics", text: "Defective electronics and unresponsive controls; unit returned to biomedical holding." }
    ],
    [
      { id: "sugg-1-1-1", theme: "Breakdown", title: "Critical Breakdown", text: "Critical electrical breakdown halted procedures; replacement unit had to be deployed." },
      { id: "sugg-1-1-2", theme: "Short Circuit", title: "Power Supply Fault", text: "Intermittent power fault tripped operating room breaker repeatedly during testing." },
      { id: "sugg-1-1-3", theme: "Mechanism", title: "Frozen Elevation Gear", text: "Elevation mechanism froze completely with patient on table; immediate recall warranted." },
      { id: "sugg-1-1-4", theme: "Hazard", title: "Sharp Metal Edges", text: "Exposed sharp metal edges along the undersurface present unacceptable laceration hazards." },
      { id: "sugg-1-1-5", theme: "Firmware", title: "Unresponsive Microcontroller", text: "Microcontroller became completely unresponsive; unit failed biomedical safety certification." },
      { id: "sugg-1-1-6", theme: "Integrity", title: "Severe Structural Flaw", text: "Severe structural welds cracked under nominal workload; unsafe for clinical care." }
    ]
  ];
  return pools[normPool % pools.length];
}

/**
 * Fetch product- and rating-specific review suggestions
 * Generated server-side using product details & cached to minimize Gemini calls.
 */
export async function fetchReviewSuggestions(
  productId: string,
  rating: number,
  productTitle: string,
  category?: string,
  bustCache?: boolean,
  poolIndex?: number
): Promise<{ success: boolean; suggestions: ReviewSuggestion[]; provider?: string; model?: string }> {
  const cleanId = String(productId || "generic-product").trim();
  const cleanTitle = String(productTitle || "Medical Equipment").trim();
  const cleanCategory = String(category || "").trim();

  try {
    const params = new URLSearchParams({
      productId: cleanId,
      rating: String(rating),
      productTitle: cleanTitle,
      category: cleanCategory
    });
    if (bustCache) {
      params.set("refresh", "true");
      params.set("bustCache", "true");
      params.set("t", String(Date.now()));
    }
    if (typeof poolIndex === "number") {
      params.set("poolIndex", String(poolIndex));
    }
    const res = await fetch(`/api/reviews/suggestions?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        return {
          success: true,
          suggestions: data.suggestions,
          provider: data.provider,
          model: data.model
        };
      }
    }
  } catch (err) {
    console.warn("[Reviews] Failed to fetch review suggestions:", err);
  }

  // Resilient fallback writing templates if server generation fails
  return { success: true, suggestions: getClientFallbackSuggestions(rating, cleanTitle, poolIndex || 0), provider: "client-fallback" };
}

export interface SubmitReviewResult {
  success: boolean;
  id?: string;
  message: string;
  decision?: "ALLOW" | "REJECT" | "QUARANTINE";
  status?: string;
  review?: Review;
}

/**
 * Submit a customer review
 * Evaluated server-side: clean reviews publish immediately (APPROVED),
 * while policy-violating/abusive reviews are rejected or quarantined.
 */
export async function submitProductReview(
  input: CreateReviewInput
): Promise<SubmitReviewResult> {
  // Input sanitation & validation
  const rating = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));
  const cleanTitle = (input.reviewTitle || `${rating}-Star Product Review`).trim();
  const cleanText = (input.reviewText || "").trim();
  const cleanName = (input.customerName || (input.userEmail ? input.userEmail.split("@")[0] : "Verified Customer")).trim();

  if (!cleanText || cleanText.length < 10) {
    return { success: false, message: "Review feedback must be at least 10 characters." };
  }

  if (cleanText.length > 200) {
    return { success: false, message: "Review text cannot exceed 200 characters." };
  }

  const payload = {
    productId: input.productId,
    productSlug: input.productSlug,
    productTitle: input.productTitle || "",
    rating,
    reviewTitle: cleanTitle,
    reviewText: cleanText,
    comment: cleanText, // backward compatibility
    customerFeedbackPoints: Array.isArray(input.customerFeedbackPoints)
      ? input.customerFeedbackPoints.filter(p => typeof p === "string" && p.trim().length > 0).slice(0, 10)
      : [],
    userId: input.userId || "anonymous",
    userEmail: input.userEmail || "",
    customerName: cleanName,
    author: cleanName, // backward compatibility
    facility: (input.facility || "").trim(),
    aiAssisted: Boolean(input.aiAssisted)
  };

  // Submit exclusively through backend API with server-side moderation, rate limiting, and duplicate detection
  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        decision: data.decision || "REJECT",
        message: data.message || "Failed to submit review. Please check your review and try again."
      };
    }
    return {
      success: true,
      id: data.review?.id,
      decision: data.decision || "ALLOW",
      status: data.status || data.review?.status || "APPROVED",
      message: data.message || "Your review has been published and is now live!",
      review: data.review
    };
  } catch (err) {
    return {
      success: false,
      message: "Network error occurred while submitting review. Please try again shortly."
    };
  }
}

/**
 * Fetch approved reviews for a specific product ID
 * Prioritizes Firestore direct client read when configured,
 * with seamless fallback to /api/reviews
 */
export async function fetchProductReviews(
  productId: string,
  pageSize = 5,
  lastDocSnapshot: DocumentSnapshot | null = null
): Promise<FetchReviewsResult> {
  if (!productId) {
    return { reviews: [], hasMore: false, lastDoc: null, source: "api" };
  }

  // 1. Attempt Cloud Firestore client SDK if configured
  if (isFirebaseConfigured && db) {
    try {
      const reviewsRef = collection(db, "reviews");
      let q = query(
        reviewsRef,
        where("productId", "==", productId),
        where("status", "==", "APPROVED"),
        orderBy("createdAt", "desc"),
        firestoreLimit(pageSize + 1)
      );

      if (lastDocSnapshot) {
        q = query(
          reviewsRef,
          where("productId", "==", productId),
          where("status", "==", "APPROVED"),
          orderBy("createdAt", "desc"),
          startAfter(lastDocSnapshot),
          firestoreLimit(pageSize + 1)
        );
      }

      const snap = await getDocs(q);
      const docs = snap.docs;
      const hasMore = docs.length > pageSize;
      const pageDocs = hasMore ? docs.slice(0, pageSize) : docs;
      const lastDoc = pageDocs.length > 0 ? pageDocs[pageDocs.length - 1] : null;

      const items: Review[] = pageDocs.map((d: QueryDocumentSnapshot<DocumentData>) => {
        const data = d.data();
        return {
          id: d.id,
          productId: data.productId || productId,
          productSlug: data.productSlug || "",
          productTitle: data.productTitle || "",
          rating: Number(data.rating) || 5,
          reviewTitle: data.reviewTitle || "",
          reviewText: data.reviewText || data.comment || "",
          customerFeedbackPoints: Array.isArray(data.customerFeedbackPoints) ? data.customerFeedbackPoints : [],
          userId: data.userId || "",
          customerName: data.customerName || data.author || "Healthcare Practitioner",
          author: data.author || data.customerName || "Healthcare Practitioner",
          facility: data.facility || "",
          verifiedPurchase: Boolean(data.verifiedPurchase),
          status: (data.status as Review["status"]) || "APPROVED",
          aiAssisted: Boolean(data.aiAssisted),
          comment: data.reviewText || data.comment || "",
          date: data.createdAt ? data.createdAt.split("T")[0] : data.date || new Date().toISOString().split("T")[0],
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt || new Date().toISOString()
        };
      });

      return {
        reviews: items,
        hasMore,
        lastDoc,
        source: "firestore"
      };
    } catch (err) {
      console.warn("[Reviews] Firestore direct query deferred to API fallback:", err);
    }
  }

  // 2. Resilient API fallback via server
  try {
    const res = await fetch(`/api/reviews/${encodeURIComponent(productId)}?limit=${pageSize}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.reviews)) {
        const mapped: Review[] = data.reviews.map((r: any) => ({
          id: r.id || `rev-${Math.random().toString(36).substring(2, 9)}`,
          productId: r.productId || productId,
          productSlug: r.productSlug || "",
          productTitle: r.productTitle || "",
          rating: Number(r.rating) || 5,
          reviewTitle: r.reviewTitle || "Verified Clinical Evaluation",
          reviewText: r.reviewText || r.comment || "",
          customerFeedbackPoints: Array.isArray(r.customerFeedbackPoints) ? r.customerFeedbackPoints : [],
          userId: r.userId || "",
          customerName: r.customerName || r.author || "Practitioner",
          author: r.author || r.customerName || "Practitioner",
          facility: r.facility || "",
          verifiedPurchase: Boolean(r.verifiedPurchase),
          status: r.status || "APPROVED",
          aiAssisted: Boolean(r.aiAssisted),
          comment: r.reviewText || r.comment || "",
          date: r.date || (r.createdAt ? r.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]),
          createdAt: r.createdAt || new Date().toISOString(),
          updatedAt: r.updatedAt || new Date().toISOString()
        }));

        return {
          reviews: mapped,
          hasMore: Boolean(data.hasMore),
          lastDoc: null,
          source: "api"
        };
      }
    }
  } catch (apiErr) {
    console.error("[Reviews] Failed to fetch product reviews from API:", apiErr);
  }

  return { reviews: [], hasMore: false, lastDoc: null, source: "api" };
}

/**
 * Request server-side AI assistance to formulate a professional clinical review draft
 * strictly grounded in the user's provided rating and explicit feedback points.
 */
export async function requestAiReviewDraft(payload: {
  rating: number;
  feedbackPoints: string[];
  roughDraft?: string;
  productTitle: string;
  customerName?: string;
  facility?: string;
}): Promise<{ success: boolean; suggestion?: AiReviewSuggestion; message?: string }> {
  try {
    const res = await fetch("/api/reviews/ai-assist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok && data.success && data.suggestion) {
      return {
        success: true,
        suggestion: data.suggestion
      };
    }
    return {
      success: false,
      message: data.message || "Could not generate draft suggestion at this time."
    };
  } catch (err) {
    return {
      success: false,
      message: "Unable to reach the clinical AI assistant service."
    };
  }
}
