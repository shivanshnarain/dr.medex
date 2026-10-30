import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Package,
  FileText,
  Heart,
  MapPin,
  User,
  Plus,
  LogOut,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Mail,
  AlertCircle,
  Check,
  Loader2,
  Edit2,
  Lock,
  Eye,
  EyeOff,
  Bell
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useAdminAuth } from "../context/AdminAuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useCurrency } from "../context/CurrencyContext";
import { Logo } from "../components/Logo";
import {
  getPushStatus,
  subscribeToPush,
  unsubscribeFromPush,
  savePreferences,
  PushStatus,
  PushNotificationPreferences
} from "../services/pushNotificationService";

interface AccountPageProps {
  initialAuthTab?: "signin" | "signup";
}

export const AccountPage: React.FC<AccountPageProps> = ({ initialAuthTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, isAuthLoading, signIn, signUp, updateProfile, updateEmail, logout } = useAuth();
  const { isAuthenticated: isAdminAuthenticated, setAdminSession } = useAdminAuth();
  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const { formatPrice, currentCountry, countries, setCountry } = useCurrency();

  // Authentication mode for unauthenticated visitors
  const [authTab, setAuthTab] = useState<"signin" | "signup">(() => {
    if (initialAuthTab) return initialAuthTab;
    if (location.pathname.includes("signup") || searchParams.get("tab") === "signup") return "signup";
    return "signin";
  });

  // Customer Sign In State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  // Customer Sign Up State
  const [signupFullName, setSignupFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupAcceptedTerms, setSignupAcceptedTerms] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"orders" | "quotes" | "wishlist" | "addresses" | "profile" | "notifications">("orders");
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Push Notification state
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);

  // Form edit state
  const [editFullName, setEditFullName] = useState(user?.fullName || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editInstitution, setEditInstitution] = useState(user?.institutionName || "");

  // Email update state
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailUpdateSuccess, setEmailUpdateSuccess] = useState<string | null>(null);
  const [emailUpdateError, setEmailUpdateError] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);

  useEffect(() => {
    if (initialAuthTab) {
      setAuthTab(initialAuthTab);
    } else if (location.pathname.includes("signup") || searchParams.get("tab") === "signup") {
      setAuthTab("signup");
    } else if (location.pathname.includes("signin") || searchParams.get("tab") === "signin") {
      setAuthTab("signin");
    }
  }, [initialAuthTab, location.pathname, searchParams]);

  React.useEffect(() => {
    if (user) {
      setEditFullName(user.fullName || "");
      setEditPhone(user.phone || "");
      setEditInstitution(user.institutionName || "");
      setEditEmail(user.email || "");
    }
  }, [user]);

  // Mock addresses state
  const [addresses, setAddresses] = useState([
    {
      id: "addr-1",
      fullName: user?.fullName || "Facility Officer",
      companyName: user?.institutionName || "Clinical Center",
      addressLine1: "742 Medical Center Blvd, Suite 400",
      city: "San Francisco",
      state: "California",
      postalCode: "94143",
      country: currentCountry.name
    }
  ]);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddrLine1, setNewAddrLine1] = useState("");
  const [newAddrCity, setNewAddrCity] = useState("");
  const [newAddrState, setNewAddrState] = useState("");
  const [newAddrPostal, setNewAddrPostal] = useState("");

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({
      fullName: editFullName.trim(),
      phone: editPhone.trim(),
      institutionName: editInstitution.trim()
    });
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailUpdateError(null);
    setEmailUpdateSuccess(null);

    const clean = editEmail.trim().toLowerCase();
    if (!clean) {
      setEmailUpdateError("Please enter an email address.");
      return;
    }

    setIsUpdatingEmail(true);
    try {
      const res = await updateEmail(clean);
      if (res.success) {
        if (res.pendingVerification) {
          setEmailUpdateSuccess(
            `A verification link has been sent to ${res.newEmail || clean}. Please check your email inbox to confirm this update.`
          );
        } else {
          setEmailUpdateSuccess("Your customer account email has been updated successfully.");
          setIsEditingEmail(false);
        }
      } else {
        setEmailUpdateError(res.error || "Failed to update email address.");
      }
    } catch (err: any) {
      setEmailUpdateError(err?.message || "An unexpected error occurred while updating email.");
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  // Load and manage Push notification settings
  const refreshPushStatus = async () => {
    try {
      const status = await getPushStatus(user?.id);
      setPushStatus(status);
    } catch (e) {
      console.warn("[Account] Failed to load push status:", e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshPushStatus();
    }
  }, [isAuthenticated, user?.id]);

  const handleTogglePushSubscription = async () => {
    setIsUpdatingPush(true);
    setPushFeedback(null);
    try {
      if (pushStatus?.isSubscribed) {
        await unsubscribeFromPush();
        await refreshPushStatus();
        setPushFeedback("Device notifications have been disabled.");
      } else {
        const res = await subscribeToPush({
          customerId: user?.id,
          customerEmail: user?.email,
          preferences: pushStatus?.preferences
        });
        if (res.success) {
          await refreshPushStatus();
          setPushFeedback("Push notifications activated successfully for this device!");
        } else {
          setPushFeedback(res.message || "Could not activate browser notifications.");
        }
      }
    } catch (err: any) {
      setPushFeedback(err.message || "Failed to update notification status.");
    } finally {
      setIsUpdatingPush(false);
      setTimeout(() => setPushFeedback(null), 4000);
    }
  };

  const handleToggleCategory = async (key: keyof PushNotificationPreferences) => {
    if (!pushStatus) return;
    const current = pushStatus.preferences[key];
    const updated = {
      ...pushStatus.preferences,
      [key]: !current
    };
    setPushStatus({
      ...pushStatus,
      preferences: updated
    });
    if (pushStatus.endpoint) {
      await savePreferences(updated, pushStatus.endpoint);
      setPushFeedback("Notification preferences updated.");
      setTimeout(() => setPushFeedback(null), 3000);
    }
  };

  // If administrator session is active, redirect to intended admin destination or /admin dashboard
  useEffect(() => {
    if (isAdminAuthenticated) {
      const redirect = searchParams.get("redirect");
      const target = (redirect && redirect.startsWith("/admin")) ? redirect : "/admin";
      navigate(target, { replace: true });
    }
  }, [isAdminAuthenticated, navigate, searchParams]);

  const handleLogout = async () => {
    await logout();
    setAuthTab("signin");
    setLoginError(null);
    setLoginSuccess(null);
  };

  const handleCustomerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !loginPassword) {
      setLoginError("Please enter your email and password.");
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await signIn(cleanEmail, loginPassword);
      if (res.success) {
        if (res.isAdmin) {
          if (res.token && res.user) {
            setAdminSession(res.token, res.user);
          }
          const redirect = searchParams.get("redirect");
          const target = (redirect && redirect.startsWith("/admin")) ? redirect : "/admin";
          navigate(target, { replace: true });
          return;
        }

        setLoginSuccess("Signed in successfully!");
        const redirect = searchParams.get("redirect");
        // Normal customers must never be redirected to admin destinations
        if (redirect && !redirect.startsWith("/admin")) {
          navigate(redirect, { replace: true });
        } else {
          navigate("/account", { replace: true });
        }
      } else {
        setLoginError(res.error || "Invalid email or password. Please try again.");
      }
    } catch (err: any) {
      setLoginError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCustomerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupSuccess(null);

    const cleanName = signupFullName.trim();
    const cleanEmail = signupEmail.trim().toLowerCase();
    const cleanPhone = signupPhone.trim();

    if (!cleanName) {
      setSignupError("Please enter your full name.");
      return;
    }
    if (!cleanEmail) {
      setSignupError("Please enter a valid email address.");
      return;
    }
    if (!signupPassword) {
      setSignupError("Please enter a password.");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters long.");
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }
    if (!signupAcceptedTerms) {
      setSignupError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setIsSigningUp(true);
    try {
      const res = await signUp({
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        password: signupPassword
      });

      if (res.success) {
        setSignupSuccess("Account created successfully!");
        const redirect = searchParams.get("redirect");
        if (redirect) {
          navigate(redirect, { replace: true });
        }
      } else {
        setSignupError(res.error || "Failed to create account. Please try again.");
      }
    } catch (err: any) {
      setSignupError(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSigningUp(false);
    }
  };

  // Loading state during auth initialization
  if (isAuthLoading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center py-16 px-4 bg-[#FAF9F7]">
        <Loader2 size={36} className="animate-spin text-[#2D5A4A] mb-3" />
        <p className="text-xs font-semibold text-neutral-500">Checking customer account session...</p>
      </div>
    );
  }

  // Customer Authentication Interface (when unauthenticated)
  if (!isAuthenticated) {
    return (
      <div className="min-h-[80vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#FAF9F7]">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-2xl font-black text-[#111111] tracking-tight">
            Customer Account Portal
          </h1>
          <p className="mt-1 text-xs text-neutral-500">
            Sign in to access order tracking, quotes, and saved equipment.
          </p>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 sm:px-8 shadow-sm rounded-2xl border border-[#E5E1DD]">
            {/* Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-neutral-100 rounded-xl mb-6 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthTab("signin");
                  setLoginError(null);
                  setLoginSuccess(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  authTab === "signin"
                    ? "bg-white text-[#111111] shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab("signup");
                  setSignupError(null);
                  setSignupSuccess(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer ${
                  authTab === "signup"
                    ? "bg-white text-[#111111] shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                Create Account
              </button>
            </div>

            {/* SIGN IN TAB */}
            {authTab === "signin" && (
              <form onSubmit={handleCustomerSignIn} className="space-y-4">
                {loginError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                    <span className="leading-relaxed font-medium">{loginError}</span>
                  </div>
                )}
                {loginSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                    <span className="leading-relaxed font-medium">{loginSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="name@hospital.org"
                      autoComplete="email"
                      className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-neutral-700">
                      Password <span className="text-rose-500">*</span>
                    </label>
                    <Link
                      to="/account/forgot-password"
                      className="text-2xs text-[#2D5A4A] hover:underline font-semibold"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-neutral-400" />
                    <input
                      type={showLoginPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-9 pr-10 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      aria-label={showLoginPassword ? "Hide password" : "Show password"}
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full mt-2 py-2.5 px-4 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* CREATE ACCOUNT / SIGN UP TAB */}
            {authTab === "signup" && (
              <form onSubmit={handleCustomerSignUp} className="space-y-4">
                {signupError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                    <span className="leading-relaxed font-medium">{signupError}</span>
                  </div>
                )}
                {signupSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
                    <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                    <span className="leading-relaxed font-medium">{signupSuccess}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Full Legal / Clinical Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-3 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      placeholder="e.g. Dr. Shivansh Narain"
                      className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Institutional Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-neutral-400" />
                    <input
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="name@hospital.org"
                      className="w-full pl-9 pr-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-neutral-400" />
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-9 pr-10 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    required
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3 py-2.5 text-xs border border-neutral-300 rounded-xl bg-white text-neutral-900 focus:outline-hidden focus:border-[#2D5A4A]"
                  />
                </div>

                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="account-terms"
                    required
                    checked={signupAcceptedTerms}
                    onChange={(e) => setSignupAcceptedTerms(e.target.checked)}
                    className="mt-0.5 rounded-sm border-neutral-300 text-[#2D5A4A] focus:ring-[#2D5A4A]"
                  />
                  <label htmlFor="account-terms" className="text-3xs text-neutral-600 leading-normal">
                    I agree to the{" "}
                    <Link to="/terms-conditions" className="text-[#2D5A4A] underline font-semibold" target="_blank">
                      Terms & Conditions
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy-policy" className="text-[#2D5A4A] underline font-semibold" target="_blank">
                      Privacy Policy
                    </Link>
                    .
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSigningUp}
                  className="w-full mt-2 py-2.5 px-4 bg-[#2D5A4A] hover:bg-[#23473a] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSigningUp ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Customer Account</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Greeting logic: e.g. "Hi, Shivansh!"
  const firstName = user?.fullName
    ? user.fullName.split(" ")[0].replace(/^Dr\.?\s*/i, "")
    : user?.email?.split("@")[0] || "Customer";

  const orders = [
    {
      id: "ord-1",
      orderNumber: "MED-94021",
      createdAt: new Date().toISOString(),
      status: "IN TRANSIT (AIR)",
      shippingMethod: { carrier: "DHL Express" },
      payment: { status: "PAID" },
      pricing: { currency: "USD", grandTotal: 3450 },
      items: [
        {
          title: "High-Frequency Electrosurgical Unit (400W)",
          sku: "ESU-400W-PRO",
          quantity: 1,
          convertedUnitPrice: 3450,
          image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=300&q=80"
        }
      ]
    }
  ];

  const quotes = [
    {
      id: "q-1",
      quoteNumber: "RFQ-2026-8819",
      createdAt: new Date().toISOString(),
      status: "UNDER REVIEW",
      productName: "Shadowless Operating Theatre Light Dual Dome Hex",
      quantity: 4,
      targetTimeline: "Within 30 Days",
      quotedAmountUSD: 14200,
      adminNotes: "Official proforma CIF export terms attached."
    }
  ];

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrLine1) return;
    const newEntry = {
      id: `addr-${Date.now()}`,
      fullName: user?.fullName || "Facility Officer",
      companyName: user?.institutionName || "Clinical Center",
      addressLine1: newAddrLine1,
      city: newAddrCity,
      state: newAddrState,
      postalCode: newAddrPostal,
      country: currentCountry.name
    };
    setAddresses([...addresses, newEntry]);
    setShowAddressModal(false);
    setNewAddrLine1("");
    setNewAddrCity("");
    setNewAddrState("");
    setNewAddrPostal("");
  };

  const deleteAddress = (index: number) => {
    setAddresses(addresses.filter((_, idx) => idx !== index));
  };

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Account Top Summary */}
        <div className="bg-white rounded-2xl border border-[#EAEAEA] p-6 sm:p-8 shadow-2xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[#2D5A4A] text-white flex items-center justify-center font-bold text-2xl shadow-xs">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : "C"}
              </div>
              <div>
                <div className="text-2xs font-extrabold uppercase tracking-wider text-[#7AA05A]">
                  Welcome Back
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                  Hi, {firstName}!
                </h1>
                <div className="text-xs text-neutral-500 mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-800">{user?.fullName}</span>
                  <span>•</span>
                  <span>{user?.email}</span>
                  {user?.phone && (
                    <>
                      <span>•</span>
                      <span>{user?.phone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Explore Products Button */}
              <Link
                to="/shop-all"
                className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
              >
                <ShoppingBag size={14} />
                <span>Explore Products</span>
              </Link>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="px-4 py-2.5 border border-neutral-300 hover:border-neutral-400 text-neutral-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>

              {isAdminAuthenticated && (
                <Link
                  to="/admin"
                  className="px-4 py-2.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2"
                >
                  <span>⚡ Admin Console</span>
                </Link>
              )}
            </div>
          </div>

          {/* Quick KPI stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#EAEAEA] text-center">
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
              <div className="text-xl font-black text-[#111111] font-mono">{orders.length}</div>
              <div className="text-3xs font-semibold uppercase text-neutral-400 mt-0.5">Total Orders</div>
            </div>
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
              <div className="text-xl font-black text-[#111111] font-mono">{quotes.length}</div>
              <div className="text-3xs font-semibold uppercase text-neutral-400 mt-0.5">B2B RFQ Quotes</div>
            </div>
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
              <div className="text-xl font-black text-[#111111] font-mono">{wishlist.length}</div>
              <div className="text-3xs font-semibold uppercase text-neutral-400 mt-0.5">Saved Equipment</div>
            </div>
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
              <div className="text-xl font-black text-[#1F7A4D] font-mono">{currentCountry.name}</div>
              <div className="text-3xs font-semibold uppercase text-neutral-400 mt-0.5">Delivery Country</div>
            </div>
          </div>
        </div>

        {/* Account Tabbed Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Navigation Sidebar (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-[#EAEAEA] p-3 shadow-2xs space-y-1">
            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "orders" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <Package size={16} />
              <span>My Orders ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("quotes")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "quotes" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <FileText size={16} />
              <span>B2B RFQs ({quotes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("wishlist")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "wishlist" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <Heart size={16} />
              <span>Saved Equipment ({wishlist.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("addresses")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "addresses" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <MapPin size={16} />
              <span>Shipping Facilities ({addresses.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "profile" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <User size={16} />
              <span>Facility Settings</span>
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "notifications" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <Bell size={16} />
              <span>Notification Alerts</span>
            </button>
          </div>

          {/* Tab Content (9 cols) */}
          <div className="lg:col-span-9 bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-8 shadow-2xs">
            {/* ORDERS TAB */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEAEA]">
                  <h3 className="text-base font-bold text-[#111111]">Hospital Equipment Orders</h3>
                  <Link to="/track-order" className="text-xs font-bold text-[#111111] hover:text-[#1F7A4D] hover:underline transition-colors">
                    Track by Order # →
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6">No previous orders found in database.</p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((ord) => (
                      <div key={ord.id} className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#EAEAEA]">
                          <div>
                            <div className="text-3xs font-bold text-neutral-400 uppercase tracking-wider">Order ID</div>
                            <div className="text-sm font-mono font-bold text-[#111111]">{ord.orderNumber}</div>
                            <div className="text-3xs text-neutral-400 mt-0.5">
                              Placed on {new Date(ord.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 text-3xs font-extrabold uppercase bg-[#EAF5EF] border border-[#1F7A4D]/20 text-[#145A38] rounded-md">
                              {ord.status}
                            </span>
                            <Link
                              to={`/track-order?orderId=${ord.orderNumber}`}
                              className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-lg text-2xs font-bold transition-colors"
                            >
                              Track AWB
                            </Link>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2.5">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <img
                                  src={it.image}
                                  alt={it.title}
                                  className="w-10 h-10 object-contain p-0.5 rounded-lg border border-[#EAEAEA] bg-white"
                                />
                                <div>
                                  <div className="font-bold text-[#111111] line-clamp-1">{it.title}</div>
                                  <div className="text-3xs text-neutral-400 font-mono">
                                    SKU: {it.sku} • Quantity: {it.quantity}
                                  </div>
                                </div>
                              </div>
                              <span className="font-bold text-neutral-800 whitespace-nowrap">
                                {ord.pricing.currency} {it.convertedUnitPrice * it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3.5 border-t border-[#EAEAEA] flex items-center justify-between text-xs">
                          <div className="text-3xs text-neutral-500">
                            Carrier: <strong>{ord.shippingMethod.carrier}</strong> • Payment: <strong>{ord.payment.status}</strong>
                          </div>
                          <div className="font-black text-[#111111] text-sm">
                            Total: {ord.pricing.currency} {ord.pricing.grandTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* B2B QUOTES TAB */}
            {activeTab === "quotes" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEAEA]">
                  <h3 className="text-base font-bold text-[#111111]">Institutional B2B RFQs</h3>
                  <Link to="/request-quote" className="text-xs font-bold text-[#111111] hover:text-[#1F7A4D] hover:underline transition-colors">
                    + Submit New RFQ
                  </Link>
                </div>

                {quotes.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6">No quote requests recorded.</p>
                ) : (
                  <div className="space-y-4">
                    {quotes.map((q) => (
                      <div key={q.id} className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono font-bold text-[#111111]">{q.quoteNumber}</div>
                            <div className="text-3xs text-neutral-400">Created: {new Date(q.createdAt).toLocaleDateString()}</div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-3xs font-extrabold uppercase ${
                            q.status === "QUOTED"
                              ? "bg-[#EAF5EF] border border-[#1F7A4D]/20 text-[#145A38]"
                              : "bg-white border border-[#EAEAEA] text-[#111111]"
                          }`}>
                            {q.status}
                          </span>
                        </div>

                        <div className="font-semibold text-neutral-800">{q.productName}</div>
                        <div className="text-3xs text-neutral-500">
                          Quantity: <strong>{q.quantity} units</strong> • Timeline: <strong>{q.targetTimeline}</strong>
                        </div>

                        {q.quotedAmountUSD && (
                          <div className="p-3.5 bg-[#EAF5EF] border border-[#1F7A4D]/20 rounded-xl text-[#145A38]">
                            <div className="font-bold text-xs">Official Quoted Tender Price: ${q.quotedAmountUSD.toLocaleString()} USD</div>
                            {q.adminNotes && <p className="text-2xs text-[#145A38]/90 mt-1">{q.adminNotes}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST TAB */}
            {activeTab === "wishlist" && (
              <div className="space-y-6">
                <h3 className="text-base font-bold text-[#111111] pb-3.5 border-b border-[#EAEAEA]">
                  Saved Medical Devices ({wishlist.length})
                </h3>

                {wishlist.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6">No products saved to wishlist yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wishlist.map((prod) => (
                      <div key={prod.id} className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] flex flex-col justify-between">
                        <div className="flex gap-3.5">
                          <img
                            src={prod.images[0]}
                            alt={prod.title}
                            className="w-16 h-16 object-contain p-1 rounded-lg border border-[#EAEAEA] bg-white shrink-0"
                          />
                          <div>
                            <Link to={`/product/${prod.slug}`} className="font-bold text-[#111111] hover:text-[#1F7A4D] line-clamp-2 text-xs transition-colors">
                              {prod.title}
                            </Link>
                            <div className="font-bold text-[#111111] text-xs mt-1.5">
                              {formatPrice(prod.basePrice)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-[#EAEAEA] flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => addToCart(prod, 1)}
                            className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-lg text-2xs font-bold transition-colors"
                          >
                            Move to Cart
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleWishlist(prod)}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADDRESSES TAB */}
            {activeTab === "addresses" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEAEA]">
                  <h3 className="text-base font-bold text-[#111111]">Clinical Facility Delivery Addresses</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(true)}
                    className="px-4 py-2 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} />
                    <span>Add Destination Address</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr, idx) => (
                    <div key={addr.id} className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold text-[#111111]">
                        <span>{addr.companyName || addr.fullName}</span>
                        {idx === 0 && (
                          <span className="text-3xs font-bold px-2.5 py-0.5 bg-[#111111] text-white rounded-md">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-600">{addr.addressLine1}</p>
                      <p className="text-neutral-600">{addr.city}, {addr.state} {addr.postalCode}</p>
                      <p className="text-[#111111] font-bold">{addr.country}</p>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => deleteAddress(idx)}
                          className="text-xs text-rose-600 hover:underline pt-2"
                        >
                          Delete Address
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Address Form */}
                {showAddressModal && (
                  <form onSubmit={handleSaveNewAddress} className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-3.5 text-xs">
                    <h4 className="font-bold text-[#111111]">Add Clinical Facility Address</h4>
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={newAddrLine1}
                        onChange={(e) => setNewAddrLine1(e.target.value)}
                        placeholder="Facility suite / street"
                        className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={newAddrCity}
                          onChange={(e) => setNewAddrCity(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">State/Province *</label>
                        <input
                          type="text"
                          required
                          value={newAddrState}
                          onChange={(e) => setNewAddrState(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">Postal/ZIP *</label>
                        <input
                          type="text"
                          required
                          value={newAddrPostal}
                          onChange={(e) => setNewAddrPostal(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(false)}
                        className="px-4 py-2 border border-[#EAEAEA] rounded-lg text-neutral-600 hover:bg-[#F7F7F7]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#111111] hover:bg-[#1F7A4D] text-white font-bold rounded-lg transition-colors"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-8">
                {/* 1. Customer Email Address (Login ID) Section */}
                <div className="p-6 bg-[#FAFAFA] rounded-2xl border border-[#EAEAEA] space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-3.5 border-b border-[#EAEAEA]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#2D5A4A]/10 text-[#2D5A4A] flex items-center justify-center">
                        <Mail size={16} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[#111111]">Account Email Address</h3>
                        <p className="text-2xs text-neutral-500">Your primary login identifier and verification email</p>
                      </div>
                    </div>

                    {!isEditingEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditEmail(user?.email || "");
                          setEmailUpdateError(null);
                          setEmailUpdateSuccess(null);
                          setIsEditingEmail(true);
                        }}
                        className="px-3.5 py-1.5 bg-white border border-[#EAEAEA] hover:border-neutral-300 rounded-lg text-xs font-bold text-[#111111] transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Edit2 size={12} />
                        <span>Update Email</span>
                      </button>
                    )}
                  </div>

                  {/* Feedback Alerts */}
                  {emailUpdateError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2">
                      <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                      <span className="leading-relaxed font-medium">{emailUpdateError}</span>
                    </div>
                  )}

                  {emailUpdateSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-start gap-2">
                      <Check size={15} className="shrink-0 mt-0.5 text-emerald-600" />
                      <span className="leading-relaxed font-semibold">{emailUpdateSuccess}</span>
                    </div>
                  )}

                  {!isEditingEmail ? (
                    <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-[#EAEAEA]">
                      <div>
                        <div className="text-3xs font-semibold uppercase text-neutral-400">Current Login Email</div>
                        <div className="text-sm font-bold text-[#111111] font-mono mt-0.5">{user?.email}</div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2D5A4A]/10 text-[#2D5A4A] rounded-md text-3xs font-bold">
                        <ShieldCheck size={12} />
                        <span>Verified Account</span>
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdateEmail} className="space-y-3.5 text-xs">
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">
                          New Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="doctor@institution.org"
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#2D5A4A]"
                        />
                        <p className="text-2xs text-neutral-500 mt-1">
                          A confirmation link will be dispatched if email verification is active. Your displayed login email synchronizes upon verification.
                        </p>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingEmail(false);
                            setEditEmail(user?.email || "");
                            setEmailUpdateError(null);
                          }}
                          className="px-4 py-2 border border-[#EAEAEA] rounded-lg text-neutral-600 hover:bg-neutral-100 font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isUpdatingEmail}
                          className="px-5 py-2 bg-[#2D5A4A] hover:bg-[#23473a] text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          {isUpdatingEmail ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Updating...</span>
                            </>
                          ) : (
                            <span>Save Email Address</span>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* 2. Practitioner & Facility Preferences Section */}
                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs max-w-lg">
                  <h3 className="text-base font-bold text-[#111111] pb-3.5 border-b border-[#EAEAEA]">
                    Practitioner & Facility Preferences
                  </h3>

                  {profileSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                      <Check size={15} className="text-emerald-600" />
                      <span>Profile preferences saved successfully.</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Full Legal / Clinical Name</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Phone Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Institution Name</label>
                    <input
                      type="text"
                      value={editInstitution}
                      onChange={(e) => setEditInstitution(e.target.value)}
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Preferred Currency & Jurisdiction</label>
                    <select
                      value={currentCountry.code}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name} ({c.currency})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#111111] hover:bg-[#1F7A4D] text-white font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Save Preferences
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#EAEAEA]">
                  <div>
                    <h3 className="text-base font-bold text-[#111111]">Device & Push Notifications</h3>
                    <p className="text-2xs text-neutral-500 mt-0.5">
                      Manage browser push notifications and real-time medical logistics alerts.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {pushStatus?.isSubscribed ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-3xs font-extrabold uppercase tracking-wider bg-[#EAF5EF] text-[#145A38] border border-[#1F7A4D]/20">
                        <CheckCircle2 size={12} className="text-[#1F7A4D]" />
                        Active on this browser
                      </span>
                    ) : pushStatus?.permission === "denied" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-3xs font-extrabold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertCircle size={12} className="text-rose-600" />
                        Blocked in browser settings
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-3xs font-extrabold uppercase tracking-wider bg-neutral-100 text-neutral-600">
                        Not enabled
                      </span>
                    )}
                  </div>
                </div>

                {pushFeedback && (
                  <div className="p-3 bg-[#F0F7ED] border border-[#7AA05A]/40 rounded-xl text-xs font-semibold text-[#2D5A4A] flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-[#7AA05A]" />
                    <span>{pushFeedback}</span>
                  </div>
                )}

                {/* Primary Enable / Disable Toggle Action */}
                <div className="p-5 rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-[#111111]">Browser Push Alerts</h4>
                    <p className="text-2xs text-neutral-500 mt-1 max-w-md">
                      Receive instant notifications on this device even when the DR.MEDEX tab is in the background or closed.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleTogglePushSubscription}
                    disabled={isUpdatingPush || !pushStatus?.supported}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                      pushStatus?.isSubscribed
                        ? "border border-neutral-300 text-neutral-700 hover:bg-neutral-200/60"
                        : "bg-[#2D5A4A] hover:bg-[#1E3F33] text-white shadow-xs"
                    }`}
                  >
                    {isUpdatingPush ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : pushStatus?.isSubscribed ? (
                      <span>Disable Notifications</span>
                    ) : (
                      <>
                        <Bell size={13} className="text-[#7AA05A]" />
                        <span>Enable on this Browser</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Categories & Preferences */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                    Notification Categories & Privacy
                  </h4>

                  <div className="space-y-3">
                    {/* Order Updates */}
                    <label className="flex items-start justify-between p-4 rounded-xl border border-[#EAEAEA] bg-white hover:border-neutral-300 transition-colors cursor-pointer">
                      <div className="pr-4">
                        <div className="text-xs font-bold text-[#111111]">Order & Shipment Logistics</div>
                        <div className="text-2xs text-neutral-500 mt-0.5">
                          Order confirmation, factory calibration, customs clearance, and DHL/FedEx dispatch tracking.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={pushStatus?.preferences.orderUpdates ?? true}
                        onChange={() => handleToggleCategory("orderUpdates")}
                        className="w-4 h-4 mt-0.5 rounded text-[#2D5A4A] accent-[#2D5A4A] focus:ring-[#2D5A4A] cursor-pointer"
                      />
                    </label>

                    {/* Announcements */}
                    <label className="flex items-start justify-between p-4 rounded-xl border border-[#EAEAEA] bg-white hover:border-neutral-300 transition-colors cursor-pointer">
                      <div className="pr-4">
                        <div className="text-xs font-bold text-[#111111]">Storefront & Catalogue Updates</div>
                        <div className="text-2xs text-neutral-500 mt-0.5">
                          New medical equipment releases, CE/FDA regulatory status notices, and product specification revisions.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={pushStatus?.preferences.websiteAnnouncements ?? true}
                        onChange={() => handleToggleCategory("websiteAnnouncements")}
                        className="w-4 h-4 mt-0.5 rounded text-[#2D5A4A] accent-[#2D5A4A] focus:ring-[#2D5A4A] cursor-pointer"
                      />
                    </label>

                    {/* Support & RFQ */}
                    <label className="flex items-start justify-between p-4 rounded-xl border border-[#EAEAEA] bg-white hover:border-neutral-300 transition-colors cursor-pointer">
                      <div className="pr-4">
                        <div className="text-xs font-bold text-[#111111]">B2B Quotes & Clinical Support</div>
                        <div className="text-2xs text-neutral-500 mt-0.5">
                          Direct engineering alerts when our biomedical team responds to your quotation or clinical inquiry.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={pushStatus?.preferences.customerSupport ?? true}
                        onChange={() => handleToggleCategory("customerSupport")}
                        className="w-4 h-4 mt-0.5 rounded text-[#2D5A4A] accent-[#2D5A4A] focus:ring-[#2D5A4A] cursor-pointer"
                      />
                    </label>

                    {/* Marketing & Promotions */}
                    <label className="flex items-start justify-between p-4 rounded-xl border border-[#EAEAEA] bg-white hover:border-neutral-300 transition-colors cursor-pointer">
                      <div className="pr-4">
                        <div className="text-xs font-bold text-[#111111] flex items-center gap-2">
                          <span>Exclusive Institutional Offers & Procurement</span>
                          <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Opt-in
                          </span>
                        </div>
                        <div className="text-2xs text-neutral-500 mt-0.5">
                          Bulk hospital purchasing discounts, tender announcements, and end-of-year medical pricing.
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={pushStatus?.preferences.marketing ?? false}
                        onChange={() => handleToggleCategory("marketing")}
                        className="w-4 h-4 mt-0.5 rounded text-[#2D5A4A] accent-[#2D5A4A] focus:ring-[#2D5A4A] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
