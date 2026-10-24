import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, ArrowRight, ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../../components/Logo";

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updatePassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Validate recovery token from query parameter or URL hash on load
  useEffect(() => {
    let isMounted = true;

    async function verifyToken() {
      setIsVerifyingToken(true);
      setErrorMessage(null);

      // 1. Check for errors in URL hash from Supabase redirect
      if (typeof window !== "undefined" && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const errorDesc = params.get("error_description") || params.get("error");
        if (errorDesc) {
          if (isMounted) {
            setErrorMessage(errorDesc.replace(/\+/g, " "));
            setIsTokenInvalid(true);
            setIsVerifyingToken(false);
          }
          return;
        }

        const accessToken = params.get("access_token");
        if (accessToken) {
          // Supabase Auth implicit recovery session established
          if (isMounted) {
            setIsTokenInvalid(false);
            setIsVerifyingToken(false);
          }
          return;
        }
      }

      // 2. Check for query parameter ?token=... (DR.MEDEX Cryptographic Recovery Flow)
      const queryParams = new URLSearchParams(location.search);
      const queryToken = queryParams.get("token") || queryParams.get("access_token");

      if (queryToken) {
        try {
          const res = await fetch(`/api/auth/verify-reset-token?token=${encodeURIComponent(queryToken)}`);
          const data = await res.json().catch(() => ({}));

          if (isMounted) {
            if (res.ok && data.valid) {
              setRecoveryToken(queryToken);
              setTargetEmail(data.email || null);
              setIsTokenInvalid(false);
            } else {
              setIsTokenInvalid(true);
              setErrorMessage(data.message || "This password recovery link is invalid or has expired.");
            }
          }
        } catch {
          if (isMounted) {
            // In case of local network issue, allow attempt with token
            setRecoveryToken(queryToken);
            setIsTokenInvalid(false);
          }
        } finally {
          if (isMounted) setIsVerifyingToken(false);
        }
        return;
      }

      // 3. No token present
      if (isMounted) {
        setIsTokenInvalid(true);
        setErrorMessage("No password recovery token detected. Please request a new recovery link from the Forgot Password page.");
        setIsVerifyingToken(false);
      }
    }

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password) {
      setErrorMessage("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please ensure both fields are identical.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await updatePassword(password, recoveryToken || undefined);
      if (res.success) {
        setSuccessMessage("Your password has been successfully updated! You can now sign in with your new password.");
        setTimeout(() => {
          navigate("/account/signin", { replace: true });
        }, 2200);
      } else {
        setErrorMessage(res.error || "Failed to update password. Your recovery link may have expired or was already used.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while updating your password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FAF9F7]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <h2 className="text-center text-2xl font-extrabold text-[#111111] tracking-tight">
          Set New Password
        </h2>
        <p className="mt-2 text-center text-xs text-neutral-500">
          Create a secure new password for your DR.MEDEX customer account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-[#E5E1DD] sm:px-10">
          {/* Loading verification state */}
          {isVerifyingToken ? (
            <div className="py-8 text-center space-y-3">
              <Loader2 size={24} className="animate-spin text-[#627188] mx-auto" />
              <p className="text-xs text-neutral-600 font-medium">Verifying recovery token...</p>
            </div>
          ) : isTokenInvalid ? (
            /* Invalid or expired token error state */
            <div className="space-y-4">
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
                <ShieldAlert size={20} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="space-y-1">
                  <p className="font-bold text-rose-950">Recovery Link Invalid or Expired</p>
                  <p className="leading-relaxed text-rose-800">
                    {errorMessage || "This recovery link is invalid or has expired for security reasons."}
                  </p>
                </div>
              </div>

              <div className="pt-2 text-center space-y-3">
                <Link
                  to="/account/forgot-password"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#627188] hover:bg-[#4D596B] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <span>Request a New Recovery Link</span>
                  <ArrowRight size={14} />
                </Link>

                <div>
                  <Link
                    to="/account/signin"
                    className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-[#627188] font-semibold"
                  >
                    <ArrowLeft size={13} />
                    <span>Return to Sign In</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : successMessage ? (
            /* Success confirmation state */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-3">
                <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">Password Successfully Updated</p>
                  <p className="leading-relaxed text-emerald-800">{successMessage}</p>
                </div>
              </div>

              <div className="pt-2 text-center">
                <Link
                  to="/account/signin"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#627188] hover:underline"
                >
                  <span>Proceed to Sign In</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            /* Password entry form */
            <form className="space-y-4" onSubmit={handleSubmit}>
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">{errorMessage}</span>
                </div>
              )}

              {targetEmail && (
                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-[11px] text-neutral-600">
                  Setting new password for: <strong className="text-neutral-900">{targetEmail}</strong>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-neutral-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-10 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#627188]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-3 text-neutral-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#627188]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-[#627188] hover:bg-[#4D596B] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>

              <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
                <Link
                  to="/account/signin"
                  className="text-xs text-neutral-600 hover:text-[#627188] font-semibold inline-flex items-center gap-1"
                >
                  <ArrowLeft size={12} />
                  <span>Cancel & Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
