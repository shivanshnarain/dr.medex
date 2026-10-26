import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Trash2,
  Filter,
  Sparkles,
  Loader2,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Review } from "../types";

export const AdminReviewsPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, quarantined: 0, approved: 0, rejected: 0 });
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = `/api/admin/reviews?status=${filterStatus}`;
      const res = await adminFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setReviews(data.reviews || []);
          if (data.counts) setCounts(data.counts);
        }
      }
    } catch (err) {
      console.error("Failed to load reviews for admin:", err);
      setStatusMessage({ type: "error", text: "Failed to load reviews from server." });
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch, filterStatus]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Update status (Approve / Reject)
  const handleUpdateStatus = async (reviewId: string, newStatus: "APPROVED" | "REJECTED") => {
    setActionLoadingId(reviewId);
    setStatusMessage(null);
    try {
      const res = await adminFetch(`/api/admin/reviews/${reviewId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: "success",
          text: `Review status updated to ${newStatus}.`
        });
        loadReviews();
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to update review status." });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Network error updating review status." });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle verified purchase
  const handleToggleVerified = async (reviewId: string, currentVal: boolean) => {
    setActionLoadingId(reviewId);
    setStatusMessage(null);
    try {
      const res = await adminFetch(`/api/admin/reviews/${reviewId}/verified`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verifiedPurchase: !currentVal })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: "success",
          text: `Verified purchase set to ${!currentVal ? "True" : "False"}.`
        });
        loadReviews();
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to toggle verified purchase." });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Network error toggling verified purchase." });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete review
  const handleDelete = async (reviewId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;
    setActionLoadingId(reviewId);
    setStatusMessage(null);
    try {
      const res = await adminFetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: "success", text: "Review permanently deleted." });
        loadReviews();
      } else {
        setStatusMessage({ type: "error", text: data.message || "Failed to delete review." });
      }
    } catch (err) {
      setStatusMessage({ type: "error", text: "Network error deleting review." });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <AdminLayout
      title="Clinical Reviews & Feedback"
      subtitle="Moderation portal for healthcare practitioner evaluations."
      actions={
        <button
          type="button"
          onClick={loadReviews}
          disabled={isLoading}
          className="px-3.5 py-2 bg-neutral-100 border border-neutral-300 hover:border-black text-neutral-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                : "bg-red-50 text-red-900 border border-red-300"
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-2xs uppercase font-bold text-neutral-600 hover:text-black cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats & Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "All Reviews", statusKey: "ALL", count: counts.total, color: "text-neutral-900" },
            { label: "Pending", statusKey: "PENDING", count: counts.pending, color: "text-[#D97706]" },
            { label: "Quarantined", statusKey: "QUARANTINED", count: counts.quarantined || 0, color: "text-orange-600" },
            { label: "Approved Public", statusKey: "APPROVED", count: counts.approved, color: "text-emerald-700" },
            { label: "Rejected", statusKey: "REJECTED", count: counts.rejected, color: "text-red-700" }
          ].map((item) => (
            <button
              key={item.statusKey}
              type="button"
              onClick={() => setFilterStatus(item.statusKey)}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                filterStatus === item.statusKey
                  ? "bg-white border-black shadow-xs ring-1 ring-black text-neutral-900"
                  : "bg-white border-neutral-300 hover:border-black text-neutral-900"
              }`}
            >
              <div className="text-2xs text-neutral-500 font-bold uppercase tracking-wider">{item.label}</div>
              <div className={`text-2xl font-black mt-1 font-mono ${item.color}`}>{item.count}</div>
            </button>
          ))}
        </div>

        {/* Reviews Table / Card List */}
        <div className="bg-white text-neutral-900 rounded-2xl border border-neutral-300 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-neutral-200 flex items-center justify-between flex-wrap gap-3 bg-neutral-50">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-neutral-700" />
              <h3 className="text-xs font-bold uppercase text-neutral-900 tracking-tight">
                Showing: {filterStatus} Reviews ({reviews.length})
              </h3>
            </div>
            <span className="text-2xs text-neutral-500 font-mono">
              Database: Cloud Firestore (default) • Collection: reviews
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="animate-spin text-[#FFD400]" />
              <span className="text-xs">Loading reviews...</span>
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center text-neutral-600 space-y-1">
              <div className="font-bold text-sm text-neutral-900">No reviews found for status: {filterStatus}</div>
              <p className="text-xs text-neutral-500">
                Customer evaluations submitted through the product detail page will appear here for verification.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-200">
              {reviews.map((rev) => {
                const isActionBusy = actionLoadingId === rev.id;
                const authorDisplay = rev.customerName || rev.author || "Practitioner";
                const commentDisplay = rev.reviewText || rev.comment || "";

                return (
                  <div key={rev.id} className="p-6 space-y-3 hover:bg-neutral-50 transition-colors">
                    {/* Top Row: Author, Status Badge, Star Rating, Actions */}
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-neutral-900">{authorDisplay}</span>
                          {rev.facility && (
                            <span className="text-xs text-neutral-500">({rev.facility})</span>
                          )}

                          {/* Status Pill */}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wider ${
                              rev.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                : rev.status === "REJECTED"
                                ? "bg-red-50 text-red-800 border border-red-300"
                                : rev.status === "QUARANTINED"
                                ? "bg-orange-50 text-orange-800 border border-orange-300"
                                : "bg-amber-50 text-amber-800 border border-amber-300"
                            }`}
                          >
                            {rev.status}
                          </span>

                          {/* Verified Purchase Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleVerified(rev.id, Boolean(rev.verifiedPurchase))}
                            disabled={isActionBusy}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-3xs font-bold cursor-pointer transition-colors ${
                              rev.verifiedPurchase
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-300"
                                : "bg-neutral-100 text-neutral-600 border border-neutral-300 hover:border-black"
                            }`}
                            title="Click to toggle Verified Purchase status"
                          >
                            <ShieldCheck size={11} />
                            <span>{rev.verifiedPurchase ? "Verified Purchase: YES" : "Verified: NO"}</span>
                          </button>

                          {/* AI Assisted Tag */}
                          {rev.aiAssisted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md text-3xs font-medium border border-neutral-200">
                              <Sparkles size={10} className="text-[#D97706]" />
                              <span>AI Assisted Draft</span>
                            </span>
                          )}
                        </div>

                        {/* Product Title Link */}
                        <div className="text-2xs text-neutral-500 font-mono mt-1 flex items-center gap-1.5">
                          <span>Product ID: {rev.productId}</span>
                          {rev.productSlug && (
                            <Link
                              to={`/product/${rev.productSlug}`}
                              target="_blank"
                              className="text-neutral-900 hover:underline inline-flex items-center gap-0.5 font-medium"
                            >
                              <span>View Product</span>
                              <ExternalLink size={10} />
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Right Side: Rating & Moderate Actions */}
                      <div className="flex items-center gap-3">
                        <div className="flex text-[#FFD400]">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill={i < rev.rating ? "currentColor" : "none"}
                              className={i < rev.rating ? "text-[#FFD400]" : "text-neutral-300"}
                            />
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          {rev.status !== "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(rev.id, "APPROVED")}
                              disabled={isActionBusy}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-2xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                            >
                              <CheckCircle size={12} />
                              <span>Approve</span>
                            </button>
                          )}

                          {rev.status !== "REJECTED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(rev.id, "REJECTED")}
                              disabled={isActionBusy}
                              className="px-3 py-1.5 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-2xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
                            >
                              <XCircle size={12} />
                              <span>Reject</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(rev.id)}
                            disabled={isActionBusy}
                            className="p-1.5 text-neutral-400 hover:text-[#DC2626] rounded-lg transition-colors cursor-pointer"
                            title="Delete review"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Headline */}
                    {rev.reviewTitle && (
                      <h4 className="text-xs font-bold text-neutral-900">{rev.reviewTitle}</h4>
                    )}

                    {/* Feedback Tags */}
                    {Array.isArray(rev.customerFeedbackPoints) && rev.customerFeedbackPoints.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {rev.customerFeedbackPoints.map((pt, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-neutral-100 text-neutral-700 rounded-md text-3xs font-medium border border-neutral-200"
                          >
                            {pt}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Review Feedback Text */}
                    <p className="text-xs text-neutral-800 leading-relaxed italic bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                      &ldquo;{commentDisplay}&rdquo;
                    </p>

                    <div className="text-3xs text-neutral-500 font-mono">
                      Created: {rev.createdAt || rev.date} • Document ID: {rev.id}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
