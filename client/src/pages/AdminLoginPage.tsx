import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { ShieldCheck, Lock, Mail, AlertCircle, Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Logo } from "../components/Logo";

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || "/admin";
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // Handle countdown timer if locked out
  useEffect(() => {
    if (lockoutTimer === null || lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please provide both administrator email and access password.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate("/admin");
    } else {
      setError(result.message || "Authentication rejected. Invalid credentials.");
      if (result.retryAfter) {
        setLockoutTimer(result.retryAfter);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col justify-center py-16 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center mb-6">
          <Logo variant="dark-bg" showTagline={false} />
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          Central Operations Admin Portal
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-[#888888]">
          Medical Equipment E-Commerce Catalogue & Inventory Control
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4">
        <div className="bg-[#141414] py-8 px-6 shadow-2xl rounded-2xl border border-[#262626] sm:px-10">
          {error && (
            <div className="mb-6 rounded-xl bg-[#2A1515] border border-[#5C2323] p-4 flex items-start gap-3 text-red-200 text-xs">
              <AlertCircle size={18} className="text-[#EF4444] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-300">Access Denied</p>
                <p className="mt-0.5 text-red-200/90 leading-relaxed">{error}</p>
                {lockoutTimer && (
                  <p className="mt-2 font-mono text-amber-300 font-bold">
                    Security Lockout: Try again in {lockoutTimer}s
                  </p>
                )}
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#CCCCCC] mb-1.5">
                Administrator Email
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777777]">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@drmedex.com"
                  className="block w-full pl-10 pr-3 py-3 border border-[#333333] rounded-lg bg-[#0A0A0A] text-white placeholder-[#555555] focus:outline-none focus:border-[#1F7A4D] text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#CCCCCC] mb-1.5">
                Super Admin Password
              </label>
              <div className="relative rounded-lg shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#777777]">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="block w-full pl-10 pr-10 py-3 border border-[#333333] rounded-lg bg-[#0A0A0A] text-white placeholder-[#555555] focus:outline-none focus:border-[#1F7A4D] text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#777777] hover:text-[#CCCCCC]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || lockoutTimer !== null}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-[#1F7A4D] hover:bg-[#145A38] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate & Access Portal</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security details footer */}
          <div className="mt-8 pt-6 border-t border-[#262626] text-center">
            <div className="flex items-center justify-center gap-2 text-2xs font-semibold text-[#888888] uppercase tracking-widest">
              <ShieldCheck size={14} className="text-[#1F7A4D]" />
              <span>PBKDF2 SHA-512 Encrypted Session</span>
            </div>
            <p className="mt-2 text-3xs text-[#666666] leading-normal">
              Authorized access only. All actions, product mutations, and authentication attempts are logged with IP audit tracing.
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-xs font-semibold text-[#888888] hover:text-white transition-colors"
          >
            ← Return to DR.MEDEX Customer Storefront
          </Link>
        </div>
      </div>
    </div>
  );
};
