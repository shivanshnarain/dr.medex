import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { InternationalPhoneInput } from "../../components/InternationalPhoneInput";
import { Logo } from "../../components/Logo";

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signUp, isAuthenticated } = useAuth();

  // Redirect target if arrived via redirect query parameter
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get("redirect") || "/account";
  const actionTarget = searchParams.get("action");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      const dest = actionTarget ? `${redirectTarget}?action=${actionTarget}` : redirectTarget;
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTarget, actionTarget]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!cleanEmail) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setErrorMessage("Please enter a password.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    if (!acceptedTerms) {
      setErrorMessage("Please accept the Terms of Service and Privacy Policy to proceed.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await signUp({
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password
      });

      if (res.success) {
        setSuccessMessage("Account created successfully! Redirecting...");
        setTimeout(() => {
          const dest = actionTarget ? `${redirectTarget}?action=${actionTarget}` : redirectTarget;
          navigate(dest, { replace: true });
        }, 800);
      } else {
        setErrorMessage(res.error || "Failed to create account. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const signInUrl = `/account/signin${location.search}`;

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FAF9F7]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        <h2 className="text-center text-2xl font-extrabold text-[#111111] tracking-tight">
          Create Your Customer Account
        </h2>
        <p className="mt-2 text-center text-xs text-neutral-500">
          Join international healthcare facilities procuring hospital-grade medical technology
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-[#E5E1DD] sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-relaxed font-medium">{successMessage}</span>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Shivansh Narain"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                />
              </div>
            </div>

            {/* Email Address */}
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
                  placeholder="hospital.procurement@example.org"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                />
              </div>
            </div>

            {/* Phone Number with Country Code */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Phone Number (with Country Code)
              </label>
              <InternationalPhoneInput
                value={phone}
                onChange={setPhone}
                placeholder="Direct clinical line or mobile"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-10 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
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
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-3 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                />
              </div>
            </div>

            {/* Terms and Privacy Acceptance */}
            <div className="flex items-start gap-2 pt-1">
              <input
                id="terms-checkbox"
                type="checkbox"
                required
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-[#2D5A4A] focus:ring-[#2D5A4A] cursor-pointer"
              />
              <label htmlFor="terms-checkbox" className="text-2xs text-neutral-600 leading-normal">
                I agree to the{" "}
                <Link to="/terms-conditions" className="text-[#2D5A4A] underline font-semibold" target="_blank">
                  Terms & Conditions
                </Link>{" "}
                and acknowledge the{" "}
                <Link to="/privacy-policy" className="text-[#2D5A4A] underline font-semibold" target="_blank">
                  Privacy Policy
                </Link>
                .
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 pt-4 border-t border-neutral-100 text-center">
            <p className="text-xs text-neutral-600">
              Already have an account?{" "}
              <Link to={signInUrl} className="text-[#2D5A4A] font-bold hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
