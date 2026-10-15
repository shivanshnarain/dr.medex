import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Star, ShieldCheck, Check, AlertCircle, Loader2, X, Plus, Edit3, LogOut, RefreshCw, Send } from "lucide-react";
import { Review, CreateReviewInput, ReviewSuggestion } from "../../types";
import {
  fetchProductReviews,
  submitProductReview,
  fetchReviewSuggestions,
  getClientFallbackSuggestions
} from "../../services/reviewService";
import { useAuth } from "../../context/AuthContext";
import { CustomerAuthModal } from "../auth/CustomerAuthModal";

interface ProductReviewsSectionProps {
  productId: string;
  productSlug: string;
  productTitle: string;
  productImage?: string;
  category?: string;
}

export const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({
  productId,
  productSlug,
  productTitle,
  productImage,
  category
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  // Reviews data state (only APPROVED reviews returned)
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);

  // Review submission state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewText, setReviewText] = useState("");

  // Review Suggestions (5-6 rating- & product-specific draft options)
  const [suggestions, setSuggestions] = useState<ReviewSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [isAiSelected, setIsAiSelected] = useState(false);

  // Feedback & Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("Your review has been published and is now live!");
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-open review drawer/form when customer arrives with ?action=write-review
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("action") === "write-review") {
      setShowReviewForm(true);
      setSubmitSuccess(false);
      setSubmitError(null);
    }
  }, [location.search]);

  // Load reviews on mount / productId change
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchProductReviews(productId, 10, null)
      .then((res) => {
        if (isMounted) {
          setReviews(res.reviews);
          setHasMore(res.hasMore);
          setLastDoc(res.lastDoc);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch product reviews:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const poolIndexRef = useRef(0);

  // Load review suggestions when form opens or rating changes
  const loadSuggestions = useCallback(
    async (targetRating: number, bustCache: boolean = false) => {
      setIsLoadingSuggestions(true);
      try {
        if (bustCache) {
          poolIndexRef.current += 1;
        }
        const res = await fetchReviewSuggestions(
          productId,
          targetRating,
          productTitle,
          category,
          bustCache,
          poolIndexRef.current
        );
        if (res.success && res.suggestions.length > 0) {
          setSuggestions(res.suggestions);
        } else {
          setSuggestions(getClientFallbackSuggestions(targetRating, productTitle, poolIndexRef.current));
        }
      } catch (err) {
        console.warn("Failed to load review suggestions:", err);
        setSuggestions(getClientFallbackSuggestions(targetRating, productTitle, poolIndexRef.current));
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [productId, productTitle, category]
  );

  useEffect(() => {
    if (showReviewForm) {
      loadSuggestions(rating);
    }
  }, [showReviewForm, rating, loadSuggestions]);

  // Working Refresh Suggestions button handler (safely increments pool and bypasses cache)
  const handleRefreshSuggestions = () => {
    if (isLoadingSuggestions) return; // prevent duplicate concurrent requests
    loadSuggestions(rating, true);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("action") === "write-review") {
      setShowReviewForm(true);
    }
  }, [location.search]);

  // Handler for Write a Review button (opens popup directly)
  const handleWriteReviewClick = () => {
    setShowReviewForm(true);
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const pendingReviewSubmitRef = useRef(false);

  // Callback when user signs in through modal
  const handleAuthSuccess = (authUser?: any) => {
    setIsAuthModalOpen(false);
    setShowReviewForm(true);
    setSubmitSuccess(false);
    setSubmitError(null);

    if (pendingReviewSubmitRef.current) {
      pendingReviewSubmitRef.current = false;
      setTimeout(() => {
        handleSubmitReview(undefined, authUser);
      }, 50);
    }
  };

  // Load more reviews (pagination)
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);

    try {
      const res = await fetchProductReviews(productId, 10, lastDoc);
      setReviews((prev) => [...prev, ...res.reviews]);
      setHasMore(res.hasMore);
      setLastDoc(res.lastDoc);
    } catch (err) {
      console.error("Failed to load more reviews:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Single-card selection: replaces textarea content entirely with selected card text (up to 200 chars)
  const handleAddSuggestion = (suggestion: ReviewSuggestion) => {
    setSelectedSuggestionId(suggestion.id);
    setIsAiSelected(true);
    if (!reviewTitle || reviewTitle === `${rating}-Star Review` || reviewTitle.endsWith("-Star Product Review")) {
      setReviewTitle(suggestion.title || `${rating}-Star Product Review`);
    }
    // Directly replace textarea content with the selected card's suggestion text (never append)
    const cleanText = suggestion.text.trim();
    setReviewText(cleanText.slice(0, 200));
  };

  // Submit review form with strict 200 character limit enforcement
  const handleSubmitReview = async (e?: React.FormEvent, overrideUser?: any) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;

    const cleanText = reviewText.trim();
    if (!cleanText || cleanText.length < 10) {
      setSubmitError("Review must be at least 10 characters before submitting.");
      return;
    }

    if (cleanText.length > 200) {
      setSubmitError("Review cannot exceed 200 characters.");
      return;
    }

    const currentUser = overrideUser || user;
    const isAuthed = Boolean(currentUser?.id || currentUser?.email || isAuthenticated);

    if (!isAuthed) {
      pendingReviewSubmitRef.current = true;
      setIsAuthModalOpen(true);
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    const input: CreateReviewInput = {
      productId,
      productSlug,
      productTitle,
      rating,
      reviewTitle: (reviewTitle || `${rating}-Star Product Review`).trim(),
      reviewText: cleanText,
      customerName: currentUser?.fullName || (currentUser?.email ? currentUser.email.split("@")[0] : "Verified Customer"),
      userEmail: currentUser?.email || "",
      userId: currentUser?.id || "anonymous",
      aiAssisted: isAiSelected
    };

    try {
      const res = await submitProductReview(input);
      if (res.success) {
        setSubmitSuccess(true);
        setSuccessMessage(
          res.message ||
          (res.status === "APPROVED" || res.decision === "ALLOW"
            ? "Your review has been published and is now live!"
            : "Thank you! Your review has been submitted and is undergoing standard safety verification before display.")
        );
        setShowReviewForm(false);
        pendingReviewSubmitRef.current = false;

        // Instant live update: if review is published (APPROVED), prepend it to reviews state!
        if (res.review && (res.status === "APPROVED" || res.decision === "ALLOW")) {
          setReviews((prev) => [res.review!, ...prev.filter((r) => r.id !== res.review!.id)]);
        }

        // Reset form
        setReviewTitle("");
        setReviewText("");
        setSelectedSuggestionId(null);
        setIsAiSelected(false);
        setRating(5);
        poolIndexRef.current = 0;
      } else {
        setSubmitError(res.message || "Failed to submit review. Please try again.");
      }
    } catch (err: any) {
      setSubmitError(err?.message || "An unexpected error occurred while posting your review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rating metrics computed strictly from approved reviews
  const { averageRating, ratingCounts } = useMemo(() => {
    if (reviews.length === 0) {
      return { averageRating: 0, ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = Math.round((sum / reviews.length) * 10) / 10;
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = (r.rating >= 1 && r.rating <= 5 ? Math.round(r.rating) : 5) as 1 | 2 | 3 | 4 | 5;
      counts[star] = (counts[star] || 0) + 1;
    });
    return { averageRating: avg, ratingCounts: counts };
  }, [reviews]);

  return (
    <section className="mt-14 sm:mt-20 border-t border-[#E5E1DD] pt-10" id="product-reviews-section">
      {/* Section Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#111111] tracking-tight">
            Customer Reviews
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Real feedback from verified healthcare practitioners and procurement teams.
          </p>
        </div>

        {!showReviewForm && (
          <button
            type="button"
            id="write-review-button"
            onClick={handleWriteReviewClick}
            className="px-5 py-2.5 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-2"
          >
            <Plus size={15} />
            <span>Write a Review</span>
          </button>
        )}
      </div>

      {/* Customer Email Authentication Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        title="Sign In to Write a Review"
        subtitle="Sign in with your email to submit an authentic product evaluation."
      />

      {/* Success Notification Banner */}
      {submitSuccess && (
        <div className="p-4 mb-6 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <Check size={18} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitSuccess(false)}
            className="text-emerald-700 hover:text-emerald-900 text-2xs uppercase font-extrabold tracking-wider ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Review Summary & Rating Distribution (Inspired by Reference Image 2) */}
      {reviews.length > 0 ? (
        <div className="mb-10 p-6 sm:p-8 bg-[#FAF9F7] border border-[#E5E1DD] rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Average Rating Block */}
          <div className="md:col-span-5 flex flex-col items-center sm:items-start text-center sm:text-left border-b md:border-b-0 md:border-r border-neutral-200 pb-6 md:pb-0 md:pr-8">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-[#111111]">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-neutral-400 font-bold text-sm">out of 5</span>
            </div>

            {/* Five Gold/Yellow Stars */}
            <div className="flex items-center gap-1 my-2.5">
              {[1, 2, 3, 4, 5].map((starIndex) => (
                <Star
                  key={starIndex}
                  size={20}
                  className={
                    starIndex <= Math.round(averageRating)
                      ? "text-[#F59E0B] fill-[#F59E0B]"
                      : "text-neutral-200 fill-neutral-200"
                  }
                />
              ))}
            </div>

            <p className="text-xs text-neutral-500 font-medium">
              Based on {reviews.length} {reviews.length === 1 ? "approved review" : "approved reviews"}
            </p>
          </div>

          {/* Rating Breakdown Bars */}
          <div className="md:col-span-7 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingCounts[star as keyof typeof ratingCounts] || 0;
              const percent = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-3 text-xs">
                  <div className="w-14 flex items-center justify-end gap-1 font-semibold text-neutral-700">
                    <span>{star}</span>
                    <Star size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
                  </div>
                  <div className="flex-1 h-2.5 bg-neutral-200/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#F59E0B] rounded-full transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-neutral-400 font-medium text-2xs">
                    {count} ({percent}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Clean Empty State when no approved reviews exist */
        <div className="mb-10 p-8 sm:p-10 bg-[#FAF9F7] border border-[#E5E1DD] rounded-2xl text-center">
          <div className="inline-flex p-3 rounded-full bg-amber-50 text-[#F59E0B] mb-3">
            <Star size={24} className="fill-[#F59E0B]" />
          </div>
          <h4 className="font-extrabold text-[#111111] text-base mb-1">
            No Customer Reviews Yet
          </h4>
          <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed mb-4">
            Be the first healthcare practitioner or hospital buyer to evaluate this medical equipment.
          </p>
          {!showReviewForm && (
            <button
              type="button"
              onClick={handleWriteReviewClick}
              className="px-5 py-2.5 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2"
            >
              <Plus size={14} />
              <span>Write the First Review</span>
            </button>
          )}
        </div>
      )}

      {/* Product Review Modal Popup (Direct match to reference image) */}
      {/* Product Review Modal Popup (Compact, rich moss-green design matching DR.MEDEX identity) */}
      {showReviewForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
          id="product-review-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowReviewForm(false);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-3xl w-full p-4 sm:p-5 relative border border-neutral-100/80 my-auto text-left max-h-[90dvh] overflow-y-auto"
            id="product-review-modal-container"
          >
            {/* Top Close 'X' Button */}
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-neutral-100"
              aria-label="Close review dialog"
            >
              <X size={18} />
            </button>

            {/* Header: Product Thumbnail + Title + Subtitle + Rating Stars */}
            <div className="flex items-center gap-3 sm:gap-3.5 pr-7">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#F2F4F3] rounded-xl flex items-center justify-center p-1.5 shrink-0 border border-neutral-100 overflow-hidden">
                {productImage ? (
                  <img
                    src={productImage}
                    alt={productTitle}
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                ) : (
                  <ShieldCheck size={28} className="text-[#184e38]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-neutral-900 leading-tight truncate">
                  {productTitle}
                </h3>
                <p className="text-2xs sm:text-xs text-neutral-500 font-normal mt-0.5 line-clamp-1">
                  Share your experience and help other healthcare professionals make informed decisions.
                </p>

                {/* Rating selection stars + 'X out of 5' */}
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isActive = hoverRating !== null ? starVal <= hoverRating : starVal <= rating;
                      return (
                        <button
                          key={starVal}
                          type="button"
                          onMouseEnter={() => setHoverRating(starVal)}
                          onMouseLeave={() => setHoverRating(null)}
                          onClick={() => {
                            setRating(starVal);
                            poolIndexRef.current = 0;
                            loadSuggestions(starVal, false);
                          }}
                          className="text-neutral-300 hover:scale-115 transition-transform cursor-pointer focus:outline-hidden p-0.5"
                          aria-label={`Select ${starVal} out of 5 stars`}
                        >
                          <Star
                            size={18}
                            className={
                              isActive
                                ? "text-[#F59E0B] fill-[#F59E0B]"
                                : "text-neutral-200 fill-neutral-200"
                            }
                          />
                        </button>
                      );
                    })}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-neutral-900 ml-1">
                    {rating} out of 5
                  </span>
                </div>
              </div>
            </div>

            {/* Suggestions Header Row */}
            <div className="flex items-center justify-between gap-2 mt-3 mb-2 flex-wrap">
              <h4 className="font-bold text-xs sm:text-[13px] text-[#184e38]">
                Based on your rating, here are some suggested reviews for you:
              </h4>

              <button
                type="button"
                onClick={handleRefreshSuggestions}
                disabled={isLoadingSuggestions}
                className="bg-[#E2EDE3] hover:bg-[#D5E5D7] text-[#184e38] text-2xs sm:text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <RefreshCw size={12} className={isLoadingSuggestions ? "animate-spin" : ""} />
                <span>{isLoadingSuggestions ? "Refreshing..." : "Refresh Suggestions"}</span>
              </button>
            </div>

            {/* Suggestions Cards Grid (3 columns on desktop, 2 on tablet, 1 on mobile) */}
            {isLoadingSuggestions ? (
              <div className="p-6 text-center text-neutral-500 bg-neutral-50 rounded-xl flex items-center justify-center gap-2 border border-neutral-200/60 my-1">
                <Loader2 size={16} className="animate-spin text-[#184e38]" />
                <span className="text-xs font-semibold">Generating fresh {rating}-star suggestions...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
                {suggestions.slice(0, 6).map((suggestion) => {
                  const isSelected = selectedSuggestionId === suggestion.id;
                  return (
                    <div
                      key={suggestion.id}
                      onClick={() => handleAddSuggestion(suggestion)}
                      className={`relative overflow-hidden rounded-xl p-2.5 sm:p-3 text-left transition-all duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[66px] sm:min-h-[70px] select-none border border-[#0D4C3C] ${
                        isSelected
                          ? "ring-2 ring-[#0D4C3C] shadow-md"
                          : "hover:border-[#0D4C3C]"
                      }`}
                      style={{
                        backgroundColor: "#7AA05A"
                      }}
                      role="button"
                      aria-pressed={isSelected}
                      aria-label={`Select review suggestion: ${suggestion.text}`}
                    >
                      {/* Top row: 5 small yellow/gold stars + (+) Add button */}
                      <div className="flex items-center justify-between gap-1 relative z-10">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={11} className="text-[#F59E0B] fill-[#F59E0B]" />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddSuggestion(suggestion);
                          }}
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                            isSelected
                              ? "bg-[#0D4C3C] text-white shadow-xs"
                              : "bg-white/25 hover:bg-white/35 text-white"
                          }`}
                          aria-label={isSelected ? "Selected suggestion" : "Select suggestion"}
                        >
                          {isSelected ? (
                            <Check size={12} strokeWidth={2.8} />
                          ) : (
                            <Plus size={12} strokeWidth={2.5} />
                          )}
                        </button>
                      </div>

                      {/* Suggestion text: strictly 1-2 lines, white text, fully visible without scrollbar */}
                      <p className="text-[#FFFFFF] text-2xs sm:text-[12px] font-medium leading-snug mt-1 relative z-10">
                        {suggestion.text}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* OR Divider */}
            <div className="relative my-2 sm:my-2.5">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-neutral-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2.5 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                  OR
                </span>
              </div>
            </div>

            {/* Write your own review (optional) */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-neutral-900">
                    Write your own review
                  </span>
                  <span className="text-neutral-500 font-normal text-xs ml-1">
                    (optional)
                  </span>
                </div>
                <span className={`text-[11px] font-medium ${reviewText.length >= 200 ? "text-amber-600 font-bold" : "text-neutral-400"}`}>
                  {reviewText.length} / 200
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={200}
                value={reviewText}
                onChange={(e) => {
                  const val = e.target.value.slice(0, 200);
                  setReviewText(val);
                  if (selectedSuggestionId) {
                    const match = suggestions.find((s) => s.id === selectedSuggestionId);
                    if (match && val !== match.text) {
                      setSelectedSuggestionId(null);
                    }
                  }
                }}
                placeholder="Share your experience with this product (up to 200 characters)..."
                className="w-full p-2 text-xs sm:text-[13px] border border-neutral-200 rounded-xl bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden focus:ring-1 focus:ring-[#184e38] focus:border-[#184e38] leading-relaxed resize-none"
              />
              <div className="flex items-center justify-between mt-0.5 text-neutral-400 text-[10px]">
                <span>Minimum 10 characters</span>
                {reviewText.length >= 200 && (
                  <span className="text-amber-600 font-semibold">Maximum 200 characters reached</span>
                )}
              </div>
            </div>

            {/* Form Error Alert (if any) */}
            {submitError && (
              <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-start gap-1.5">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Centered Submit Review Button */}
            <div className="flex justify-center mt-2.5">
              <button
                type="button"
                onClick={() => handleSubmitReview()}
                disabled={isSubmitting}
                className="bg-[#184e38] hover:bg-[#133f2d] text-white font-semibold text-xs sm:text-sm px-7 py-2 rounded-full flex items-center gap-1.5 shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send size={13} />
                    <span>Submit Review</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Reviews Public Cards List (Approved Reviews Only) */}
      <div className="space-y-4" id="reviews-list">
        {isLoading ? (
          <div className="p-10 text-center text-neutral-400 flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-[#2D5A4A]" />
            <span className="text-xs">Loading approved customer reviews...</span>
          </div>
        ) : reviews.length === 0 ? null : (
          reviews.map((rev) => {
            const authorDisplay =
              rev.customerName ||
              rev.author ||
              (rev.userEmail ? rev.userEmail.split("@")[0] : "Verified Customer");
            const commentDisplay = rev.reviewText || rev.comment || "";
            const dateDisplay = rev.date || (rev.createdAt ? rev.createdAt.split("T")[0] : "");

            return (
              <div
                key={rev.id}
                className="p-5 sm:p-6 bg-[#FAF9F7] border border-[#E5E1DD] rounded-2xl space-y-3 transition-colors hover:border-[#2D5A4A]/30"
              >
                {/* Header: Stars + Date */}
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    {/* Five Gold/Yellow Stars */}
                    <div className="flex items-center gap-1 mb-1.5">
                      {[1, 2, 3, 4, 5].map((starIdx) => (
                        <Star
                          key={starIdx}
                          size={15}
                          className={
                            starIdx <= (Number(rev.rating) || 5)
                              ? "text-[#F59E0B] fill-[#F59E0B]"
                              : "text-neutral-200 fill-neutral-200"
                          }
                        />
                      ))}
                    </div>

                    {/* Review Title */}
                    {rev.reviewTitle && (
                      <h4 className="text-sm sm:text-base font-extrabold text-[#111111]">
                        {rev.reviewTitle}
                      </h4>
                    )}
                  </div>

                  <span className="text-2xs text-neutral-400 font-medium">{dateDisplay}</span>
                </div>

                {/* Author Info & Badges */}
                <div className="flex items-center gap-2 flex-wrap text-2xs">
                  <span className="font-bold text-[#2D5A4A]">{authorDisplay}</span>
                  {rev.facility && (
                    <span className="text-neutral-500 font-medium">• {rev.facility}</span>
                  )}
                  {rev.verifiedPurchase && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-3xs font-bold">
                      <ShieldCheck size={11} />
                      <span>Verified Purchase</span>
                    </span>
                  )}
                </div>

                {/* Review Text */}
                <p className="text-xs text-neutral-700 leading-relaxed">
                  {commentDisplay}
                </p>
              </div>
            );
          })
        )}

        {/* Load More Pagination */}
        {hasMore && (
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-6 py-2.5 bg-white border border-[#E5E7EB] text-[#2D5A4A] hover:bg-neutral-50 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isLoadingMore && <Loader2 size={13} className="animate-spin text-[#2D5A4A]" />}
              <span>Load More Reviews</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
