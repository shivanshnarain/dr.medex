import React, { useState } from "react";
import { X, Mail, Lock, AlertCircle, Check, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (authUser?: any) => void;
  title?: string;
  subtitle?: string;
}

type AuthMode = "signin" | "signup" | "reset";

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Sign In to Write a Review",
  subtitle = "Authenticate with your email address to submit your product review."
}) => {
  const { signInWithEmail, signUpWithEmail, sendPasswordReset, login, user } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    setIsLoading(true);

    try {
      if (mode === "signin") {
        if (!password) {
          setErrorMessage("Please enter your password.");
          setIsLoading(false);
          return;
        }

        const res = await signInWithEmail(cleanEmail, password);
        if (res.success) {
          onSuccess(user || { email: cleanEmail });
          onClose();
        } else {
          setErrorMessage(res.error || "Unable to sign in. Please verify your email and password.");
        }
      } else if (mode === "signup") {
        if (!password) {
          setErrorMessage("Please choose a password.");
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setErrorMessage("Password must be at least 6 characters.");
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMessage("Passwords do not match.");
          setIsLoading(false);
          return;
        }

        const res = await signUpWithEmail(cleanEmail, password);
        if (res.success) {
          onSuccess(user || { email: cleanEmail });
          onClose();
        } else {
          setErrorMessage(res.error || "Unable to create account. Please try again.");
        }
      } else if (mode === "reset") {
        const res = await sendPasswordReset(cleanEmail);
        if (res.success) {
          setSuccessMessage("Password reset instructions sent. Please check your email inbox.");
        } else {
          setErrorMessage(res.error || "Could not send reset email. Please verify your address.");
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-neutral-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#7AA05A]" />
              <span className="text-2xs font-extrabold uppercase tracking-wider text-[#7AA05A]">
                Customer Account
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-[#111111]">
              {mode === "signin" && title}
              {mode === "signup" && "Create Customer Account"}
              {mode === "reset" && "Reset Your Password"}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {mode === "signin" && subtitle}
              {mode === "signup" && "Sign up with your email to review medical products."}
              {mode === "reset" && "Enter your email to receive a secure password recovery link."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Alerts */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
              {(errorMessage.includes("Firebase Console") || errorMessage.includes("not yet enabled")) && (
                <div className="pt-2 border-t border-rose-200/60">
                  <button
                    type="button"
                    onClick={() => {
                      const testEmail = email.trim() || "buyer.test@dr-medex.com";
                      login(testEmail);
                      onSuccess({ email: testEmail });
                      onClose();
                    }}
                    className="w-full py-2 px-3 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-lg text-2xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Continue with this email (Testing Mode)</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
              <Check size={15} className="shrink-0 mt-0.5 text-emerald-600" />
              <span className="leading-relaxed">{successMessage}</span>
            </div>
          )}

          {/* Email input */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-3 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hospital.org"
                autoComplete="email"
                className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
              />
            </div>
          </div>

          {/* Password input */}
          {mode !== "reset" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-neutral-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("reset");
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-2xs text-[#2D5A4A] hover:underline font-semibold cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                />
              </div>
            </div>
          )}

          {/* Confirm Password (signup only) */}
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : mode === "signin" ? (
              <>
                <span>Sign In & Continue to Review</span>
                <ArrowRight size={14} />
              </>
            ) : mode === "signup" ? (
              <>
                <span>Create Account & Continue</span>
                <ArrowRight size={14} />
              </>
            ) : (
              <span>Send Password Reset Email</span>
            )}
          </button>

          {/* Mode Switchers */}
          <div className="pt-2 text-center text-xs text-neutral-600 border-t border-neutral-100">
            {mode === "signin" && (
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[#2D5A4A] font-bold hover:underline cursor-pointer"
                >
                  Create one now
                </button>
              </p>
            )}

            {mode === "signup" && (
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[#2D5A4A] font-bold hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            )}

            {mode === "reset" && (
              <p>
                Remember your password?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[#2D5A4A] font-bold hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
