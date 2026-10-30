import React, { useState } from "react";
import { MapPin, X, Loader2, Navigation, CheckCircle2 } from "lucide-react";
import { dismissLocationPrompt } from "../services/pushNotificationService";

export interface ResolvedLocationData {
  country: string;
  countryCode: string;
  state: string;
  stateCode: string;
  district: string;
  city: string;
  postalCode: string;
  streetAddress: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  countryData?: {
    name: string;
    code: string;
    dialCode: string;
    flag: string;
    currency: string;
    symbol: string;
  } | null;
}

interface SmartLocationPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationDetected: (location: ResolvedLocationData) => void;
  mode?: "modal" | "inline";
}

export const SmartLocationPrompt: React.FC<SmartLocationPromptProps> = ({
  isOpen,
  onClose,
  onLocationDetected,
  mode = "modal"
}) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successLocation, setSuccessLocation] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAllowLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage("Geolocation is not supported by your current browser.");
      return;
    }

    setIsDetecting(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          const res = await fetch(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}`);
          if (!res.ok) {
            let detail = `HTTP ${res.status}`;
            try {
              const errBody = await res.json();
              if (errBody && errBody.message) detail = errBody.message;
            } catch (e) {}
            throw new Error(`Reverse geocoding service error (${detail})`);
          }

          const data = await res.json();
          if (!data.success) {
            throw new Error(data.message || "Failed to resolve your regional address.");
          }

          dismissLocationPrompt();
          const detectedSummary = [data.city || data.district, data.state, data.country].filter(Boolean).join(", ");
          setSuccessLocation(detectedSummary || "Regional Address Located");

          setTimeout(() => {
            onLocationDetected(data);
            setIsDetecting(false);
            onClose();
          }, 600);
        } catch (err: any) {
          console.warn("[SmartLocationPrompt] Geocode error:", err);
          setErrorMessage(err.message || "Could not resolve your regional address. You can proceed with standard manual entry below.");
          setIsDetecting(false);
        }
      },
      (error) => {
        setIsDetecting(false);
        if (error.code === error.PERMISSION_DENIED) {
          dismissLocationPrompt();
          setErrorMessage("Location access was denied. You can proceed with manual address entry.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setErrorMessage("GPS location is currently unavailable. Please enter your address manually.");
        } else if (error.code === error.TIMEOUT) {
          setErrorMessage("Location request timed out. Please enter your address manually.");
        } else {
          setErrorMessage("Location error. Please enter your shipping address manually.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const handleManualEntry = () => {
    dismissLocationPrompt();
    onClose();
  };

  const handleNotNow = () => {
    dismissLocationPrompt();
    onClose();
  };

  if (mode === "inline") {
    return (
      <div className="bg-[#F8FAF7] border border-[#7AA05A]/30 rounded-xl p-4 sm:p-5 relative transition-all">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-[#2D5A4A] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Navigation size={18} className="animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#171717] flex items-center gap-2">
              Enable Location Services
              <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-[#7AA05A]/15 text-[#2D5A4A]">
                Smart Regional Fill
              </span>
            </h4>
            <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
              Allow DR.MEDEX to detect your location and automatically fill your regional shipping destination, making international medical equipment ordering easier.
            </p>

            {errorMessage && (
              <p className="text-xs font-semibold text-rose-600 mt-2 bg-rose-50 p-2 rounded-md border border-rose-200">
                {errorMessage}
              </p>
            )}

            {successLocation && (
              <div className="flex items-center gap-2 text-xs font-bold text-[#2D5A4A] mt-2 bg-[#EBF3E8] p-2 rounded-md border border-[#7AA05A]/30">
                <CheckCircle2 size={15} className="text-[#7AA05A]" />
                <span>Detected: {successLocation}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2.5 mt-3.5 pt-1">
              <button
                type="button"
                onClick={handleAllowLocation}
                disabled={isDetecting}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#2D5A4A] hover:bg-[#1E3F33] text-white text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isDetecting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Detecting Location...</span>
                  </>
                ) : (
                  <>
                    <MapPin size={13} />
                    <span>Allow Location</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleManualEntry}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Enter Address Manually
              </button>

              <button
                type="button"
                onClick={handleNotNow}
                className="px-2.5 py-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full border border-neutral-200 shadow-2xl p-6 relative overflow-hidden">
        {/* Top green accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2D5A4A] via-[#7AA05A] to-[#2D5A4A]" />

        <button
          onClick={handleNotNow}
          className="absolute top-4 right-4 p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-100 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3.5 mb-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#2D5A4A] text-white flex items-center justify-center shadow-sm">
            <Navigation size={22} className="text-[#7AA05A]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#171717]">Enable Location Services</h3>
            <span className="text-3xs font-semibold text-neutral-500 uppercase tracking-wider">
              DR.MEDEX Fast Checkout
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-600 leading-relaxed mt-2">
          Allow DR.MEDEX to detect your location and automatically fill your regional shipping destination, making international medical equipment ordering easier.
        </p>

        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
            {errorMessage}
          </div>
        )}

        {successLocation && (
          <div className="mt-3 p-2.5 rounded-lg bg-[#F0F7ED] border border-[#7AA05A]/40 text-xs font-bold text-[#2D5A4A] flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#7AA05A]" />
            <span>Resolved: {successLocation}</span>
          </div>
        )}

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={handleAllowLocation}
            disabled={isDetecting}
            className="w-full py-2.5 px-4 rounded-xl bg-[#2D5A4A] hover:bg-[#1E3F33] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 cursor-pointer"
          >
            {isDetecting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Detecting Regional Destination...</span>
              </>
            ) : (
              <>
                <MapPin size={16} className="text-[#7AA05A]" />
                <span>Allow Location</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleManualEntry}
            disabled={isDetecting}
            className="w-full py-2.5 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Enter Address Manually
          </button>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleNotNow}
              className="text-2xs text-neutral-400 hover:text-neutral-700 font-semibold transition-colors cursor-pointer"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

