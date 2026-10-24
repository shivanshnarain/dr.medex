import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, AlertCircle, CheckCircle, Loader2, ArrowLeft, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Logo } from "../../components/Logo";

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage("Please enter your account email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address (e.g. name@hospital.org).");
      return;
    }

    setIsLoading(true);

    try {
      const res = await requestPasswordReset(cleanEmail);
      if (res.success) {
        setSuccessMessage(
          "If an account is associated with this email address, password recovery instructions have been dispatched. Please check your inbox and spam folder."
        );
      } else {
        setErrorMessage(res.error || "Unable to process password recovery request. Please try again later.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred while communicating with the authentication service.");
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
          Reset Your Password
        </h2>
        <p className="mt-2 text-center text-xs text-neutral-500">
          Enter your registered email address to receive secure recovery instructions
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-[#E5E1DD] sm:px-10">
          {successMessage ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-3">
                <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-600" />
                <div className="space-y-2">
                  <p className="font-bold text-emerald-950">Recovery Request Accepted</p>
                  <p className="leading-relaxed text-emerald-800">{successMessage}</p>
                  <div className="pt-2 border-t border-emerald-200/60 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                    <ShieldCheck size={14} className="shrink-0 text-emerald-600" />
                    <span>Links expire in 60 minutes and can only be used once.</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMessage(null);
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 font-semibold cursor-pointer"
                >
                  <RefreshCw size={12} />
                  <span>Send to another address</span>
                </button>

                <Link
                  to="/account/signin"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D5A4A] hover:underline"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {errorMessage && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <div className="space-y-1">
                    <span className="leading-relaxed font-semibold block">Password Recovery Notice</span>
                    <span className="leading-relaxed text-rose-700 block">{errorMessage}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-700 mb-1">
                  Registered Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@hospital.org"
                    className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing Recovery Request...</span>
                  </>
                ) : (
                  <span>Send Recovery Instructions</span>
                )}
              </button>

              <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
                <Link
                  to="/account/signin"
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-[#2D5A4A] font-semibold"
                >
                  <ArrowLeft size={13} />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
