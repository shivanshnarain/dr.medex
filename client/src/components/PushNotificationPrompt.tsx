import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPush,
  hasDismissedPushPrompt,
  dismissPushPrompt
} from "../services/pushNotificationService";

interface PushNotificationPromptProps {
  userId?: string | null;
  userEmail?: string | null;
}

export const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({
  userId,
  userEmail
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Only check if supported and in 'default' permission state (not already granted or denied)
    if (!isPushNotificationSupported()) return;
    if (getNotificationPermission() !== "default") return;
    if (hasDismissedPushPrompt()) return;

    // Small delay so it does not interrupt immediate initial page load
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  const handleEnableAlerts = async () => {
    setIsSubscribing(true);
    setErrorMessage(null);

    const result = await subscribeToPush({
      customerId: userId || null,
      customerEmail: userEmail || null,
      preferences: {
        orderUpdates: true,
        websiteAnnouncements: true,
        customerSupport: true,
        marketing: false
      }
    });

    setIsSubscribing(false);

    if (result.success) {
      setIsSuccess(true);
      dismissPushPrompt();
      setTimeout(() => {
        setIsVisible(false);
      }, 1800);
    } else {
      if (result.message?.includes("not granted")) {
        dismissPushPrompt();
        setIsVisible(false);
      } else {
        setErrorMessage(result.message || "Failed to enable notifications.");
      }
    }
  };

  const handleDismiss = () => {
    dismissPushPrompt();
    setIsVisible(false);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 max-w-sm w-[calc(100vw-2.5rem)] animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white rounded-2xl border border-[#7AA05A]/40 shadow-xl p-5 relative overflow-hidden backdrop-blur-md">
        {/* Top green accent strip */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-[#2D5A4A]" />

        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1 text-neutral-400 hover:text-neutral-700 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer"
          aria-label="Dismiss notification alert"
        >
          <X size={16} />
        </button>

        {isSuccess ? (
          <div className="flex items-center gap-3 py-2 text-[#2D5A4A]">
            <CheckCircle2 size={24} className="text-[#7AA05A] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#171717]">Shipment Alerts Active</p>
              <p className="text-3xs text-neutral-500 mt-0.5">
                You will receive real-time updates directly on this device.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#2D5A4A] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bell size={16} className="text-[#7AA05A]" />
              </div>
              <div className="pr-6">
                <h4 className="text-xs font-bold text-[#171717]">Enable Equipment & Shipment Alerts</h4>
                <span className="text-3xs font-semibold text-[#7AA05A]">DR.MEDEX Instant Tracking</span>
              </div>
            </div>

            <p className="text-2xs text-neutral-600 leading-relaxed">
              Receive instant updates regarding order dispatch, customs clearance, and critical equipment availability.
            </p>

            {errorMessage && (
              <p className="text-3xs text-rose-600 font-semibold mt-2 bg-rose-50 p-1.5 rounded-md border border-rose-200">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3 pt-1">
              <button
                type="button"
                onClick={handleEnableAlerts}
                disabled={isSubscribing}
                className="flex-1 py-1.5 px-3 rounded-lg bg-[#2D5A4A] hover:bg-[#1E3F33] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
              >
                {isSubscribing ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Enabling...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={13} className="text-[#7AA05A]" />
                    <span>Enable Alerts</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-50 text-neutral-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
