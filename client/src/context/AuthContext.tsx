import React, { createContext, useContext, useState, useEffect, useTransition } from "react";
import { supabase, SupabaseSession, SupabaseUser } from "../lib/supabase";
import { ShippingAddress } from "../types";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  institutionName: string;
  role: "super_admin" | "admin" | "manager" | "buyer";
  country: string;
  countryCode: string;
  addresses: ShippingAddress[];
  createdAt?: string;
  updatedAt?: string;
}

interface SignUpInput {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: SupabaseUser | null;
  session: SupabaseSession | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAuthLoading: boolean;
  signUp: (input: SignUpInput) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; isAdmin?: boolean; redirectTo?: string; token?: string; user?: any; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string, recoveryToken?: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<{ success: boolean; error?: string; pendingVerification?: boolean; newEmail?: string }>;
  addAddress: (address: ShippingAddress) => void;
  deleteAddress: (index: number) => void;

  // Backward-compatibility aliases
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; isAdmin?: boolean; redirectTo?: string; token?: string; user?: any; error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, role?: UserProfile["role"]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUserToProfile(sbUser: SupabaseUser, prevProfile?: UserProfile | null): UserProfile {
  const meta = sbUser.user_metadata || {};
  const email = sbUser.email || "";
  const fullName = meta.full_name || prevProfile?.fullName || email.split("@")[0] || "Customer";
  const phone = meta.phone || prevProfile?.phone || "";

  return {
    id: sbUser.id,
    fullName,
    email,
    phone,
    institutionName: prevProfile?.institutionName || "",
    role: "buyer",
    country: prevProfile?.country || "United States",
    countryCode: prevProfile?.countryCode || "US",
    addresses: prevProfile?.addresses || [],
    createdAt: sbUser.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("drmedex_customer_profile");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Initialize and synchronize with Supabase Auth
  useEffect(() => {
    let isMounted = true;

    // Check active session immediately to prevent screen flicker
    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      if (data.session) {
        setSession(data.session);
        setUser((prev) => {
          const profile = mapSupabaseUserToProfile(data.session!.user, prev);
          try {
            localStorage.setItem("drmedex_customer_profile", JSON.stringify(profile));
          } catch {}
          return profile;
        });
      }
      setIsAuthLoading(false);
    });

    // Listen to Supabase auth events
    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      if (currentSession?.user) {
        setUser((prev) => {
          const profile = mapSupabaseUserToProfile(currentSession.user, prev);
          try {
            localStorage.setItem("drmedex_customer_profile", JSON.stringify(profile));
          } catch {}
          return profile;
        });
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        try {
          localStorage.removeItem("drmedex_customer_profile");
        } catch {}
      }
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      authSubscription?.subscription?.unsubscribe();
    };
  }, []);

  // Update localStorage when user profile changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem("drmedex_customer_profile", JSON.stringify(user));
      } catch {}
    } else {
      try {
        localStorage.removeItem("drmedex_customer_profile");
      } catch {}
    }
  }, [user]);

  // Customer Sign Up
  const signUp = async (input: SignUpInput): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.fullName.trim();
    const cleanPhone = input.phone.trim();

    if (!cleanEmail || !input.password) {
      return { success: false, error: "Email and password are required." };
    }
    if (input.password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters." };
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: input.password,
      options: {
        data: {
          full_name: cleanName,
          phone: cleanPhone
        }
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user) {
      const newProfile: UserProfile = {
        id: data.user.id,
        fullName: cleanName || cleanEmail.split("@")[0],
        email: cleanEmail,
        phone: cleanPhone,
        institutionName: "",
        role: "buyer",
        country: "United States",
        countryCode: "US",
        addresses: [],
        createdAt: new Date().toISOString()
      };
      setUser(newProfile);

      // Record successful registration/login audit event
      try {
        await fetch("/api/auth/record-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: data.user.id,
            email: cleanEmail,
            fullName: newProfile.fullName,
            phone: cleanPhone || undefined,
            authMethod: "email_password"
          })
        });
      } catch (e) {
        console.warn("[Auth] Failed to audit signup login:", e);
      }
    }

    return { success: true };
  };

  // Customer & Administrator Sign In
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; isAdmin?: boolean; redirectTo?: string; token?: string; user?: any; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: "Please enter your email and password." };
    }

    const isAdminAccount = cleanEmail === "roshan.official0009@gmail.com" || cleanEmail === "admin@drmedex.com";

    try {
      // 1. Authenticate against unified backend authentication gateway
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      const loginData = await loginRes.json().catch(() => ({}));

      // A. Genuine Administrator Authentication
      if (loginRes.ok && loginData.success && loginData.isAdmin) {
        if (loginData.token) {
          localStorage.setItem("drmedex_admin_session_token", loginData.token);
          // Broadcast to AdminAuthContext to synchronize state immediately
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("drmedex_admin_session_sync", {
                detail: { token: loginData.token, user: loginData.user }
              })
            );
          }
        }

        // Clean customer profile state so customer dashboard is never displayed
        setUser(null);
        try {
          localStorage.removeItem("drmedex_customer_profile");
          localStorage.removeItem("drmedex_supabase_session");
          localStorage.removeItem("drmedex_customer_user");
        } catch {}

        return {
          success: true,
          isAdmin: true,
          redirectTo: "/admin",
          token: loginData.token,
          user: loginData.user
        };
      }

      // B. If /api/auth/login failed due to gateway/proxy (non-401) and it's an admin account, try /api/admin/login directly
      if (!loginRes.ok && loginRes.status !== 401 && isAdminAccount) {
        try {
          const adminDirectRes = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: cleanEmail, password })
          });
          const adminDirectData = await adminDirectRes.json().catch(() => ({}));
          if (adminDirectRes.ok && adminDirectData.success && adminDirectData.token) {
            localStorage.setItem("drmedex_admin_session_token", adminDirectData.token);
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("drmedex_admin_session_sync", {
                  detail: { token: adminDirectData.token, user: adminDirectData.user }
                })
              );
            }
            setUser(null);
            try {
              localStorage.removeItem("drmedex_customer_profile");
              localStorage.removeItem("drmedex_supabase_session");
              localStorage.removeItem("drmedex_customer_user");
            } catch {}

            return {
              success: true,
              isAdmin: true,
              redirectTo: "/admin",
              token: adminDirectData.token,
              user: adminDirectData.user
            };
          } else if (adminDirectRes.status === 401) {
            return {
              success: false,
              isAdmin: false,
              error: adminDirectData.message || "Invalid administrator email or password."
            };
          }
        } catch (directErr) {
          console.warn("[Auth] Direct admin endpoint failed:", directErr);
        }
      }

      // C. Explicit credentials rejection by server (HTTP 401)
      if (loginRes.status === 401 || loginData.success === false) {
        return {
          success: false,
          isAdmin: false,
          error: loginData.message || "Invalid email or password. Please try again."
        };
      }

      // C. Customer Authentication via Unified Backend
      if (loginRes.ok && loginData.success && !loginData.isAdmin) {
        const customerProfile: UserProfile = {
          id: loginData.user?.id || `usr-${Math.random().toString(36).substring(2, 9)}`,
          fullName: loginData.user?.fullName || cleanEmail.split("@")[0] || "Customer",
          email: cleanEmail,
          phone: "",
          institutionName: "",
          role: "buyer",
          country: "United States",
          countryCode: "US",
          addresses: [],
          createdAt: new Date().toISOString()
        };
        setUser(customerProfile);

        return {
          success: true,
          isAdmin: false,
          redirectTo: "/account",
          user: customerProfile
        };
      }
    } catch (e) {
      console.warn("[Auth] Backend login request failed, attempting provider fallback:", e);
    }

    // 2. Fallback to Supabase Auth strictly for standard customer credentials (never admin accounts)
    if (isAdminAccount) {
      return { success: false, isAdmin: false, error: "Invalid email or password. Please try again." };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user) {
      const profile = mapSupabaseUserToProfile(data.user);
      setUser(profile);

      // Record successful login audit event on backend
      try {
        await fetch("/api/auth/record-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId: data.user.id,
            email: data.user.email,
            fullName: profile.fullName,
            phone: profile.phone || undefined,
            authMethod: "email_password"
          })
        });
      } catch (e) {
        console.warn("[Auth] Failed to audit signin login:", e);
      }

      return {
        success: true,
        isAdmin: false,
        redirectTo: "/account",
        user: profile
      };
    }

    return { success: true, isAdmin: false, redirectTo: "/account" };
  };

  // Customer & Administrator Logout
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    try {
      localStorage.removeItem("drmedex_customer_profile");
      localStorage.removeItem("drmedex_supabase_session");
      localStorage.removeItem("drmedex_customer_user");
      localStorage.removeItem("drmedex_admin_session_token");
    } catch {}
  };

  // Request Password Reset Link
  const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: "Please enter your email address." };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${window.location.origin}/account/reset-password`
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  // Update Password (from reset-password screen)
  const updatePassword = async (newPassword: string, recoveryToken?: string): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: "Password must be at least 6 characters long." };
    }

    // 1. If recovery token is provided from URL query param, use secure token reset endpoint
    if (recoveryToken) {
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: recoveryToken, newPassword })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          return { success: false, error: data.message || "Failed to update password." };
        }
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to update password." };
      }
    }

    // 2. Otherwise update password through Supabase session
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  };

  // Update Customer Email Address using Supabase Auth
  const updateEmail = async (newEmail: string): Promise<{ success: boolean; error?: string; pendingVerification?: boolean; newEmail?: string }> => {
    if (!user || !session) {
      return { success: false, error: "Please sign in to update your account email." };
    }

    const clean = (newEmail || "").trim().toLowerCase();
    if (!clean) {
      return { success: false, error: "Email address is required." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      return { success: false, error: "Please enter a valid email address (e.g. name@domain.com)." };
    }
    if (clean === user.email.toLowerCase()) {
      return { success: false, error: "The new email address cannot be the same as your current email." };
    }

    const { data, error } = await supabase.auth.updateUser({ email: clean });
    if (error) {
      return { success: false, error: error.message };
    }

    // Check if provider requires email confirmation (pending verification)
    const returnedUser: any = data?.user;
    if (returnedUser?.new_email && returnedUser.new_email !== returnedUser.email) {
      return {
        success: true,
        pendingVerification: true,
        newEmail: returnedUser.new_email
      };
    }

    // Provider confirmed email update immediately: synchronize profile state
    const updatedProfile: UserProfile = {
      ...user,
      email: clean,
      updatedAt: new Date().toISOString()
    };
    setUser(updatedProfile);

    // Sync PostgreSQL customer_profiles table via RLS
    if (session?.user?.id) {
      try {
        await supabase.from("customer_profiles").update({
          email: clean,
          updated_at: new Date().toISOString()
        }).eq("id", session.user.id);
      } catch (e) {}
    }

    return { success: true, pendingVerification: false };
  };

  // Update Customer Profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);

    if (updates.email && updates.email !== user.email) {
      await updateEmail(updates.email);
    }

    // Synchronize to Supabase Auth user metadata
    if (updates.fullName || updates.phone) {
      await supabase.auth.updateUser({
        data: {
          full_name: updated.fullName,
          phone: updated.phone
        }
      });
    }

    // Synchronize to PostgreSQL customer_profiles table via RLS
    if (session?.user?.id) {
      await supabase.from("customer_profiles").update({
        full_name: updated.fullName,
        phone: updated.phone,
        updated_at: new Date().toISOString()
      }).eq("id", session.user.id);
    }
  };

  const addAddress = (address: ShippingAddress) => {
    if (!user) return;
    setUser({
      ...user,
      addresses: [...user.addresses, address]
    });
  };

  const deleteAddress = (index: number) => {
    if (!user) return;
    setUser({
      ...user,
      addresses: user.addresses.filter((_, idx) => idx !== index)
    });
  };

  // Compatibility helpers
  const signInWithEmail = (email: string, password: string) => signIn(email, password);
  const signUpWithEmail = (email: string, password: string) =>
    signUp({ fullName: email.split("@")[0], email, phone: "", password });
  const sendPasswordReset = (email: string) => requestPasswordReset(email);

  const login = (email: string, role: UserProfile["role"] = "buyer") => {
    const cleanEmail = email.trim().toLowerCase();
    const newUser: UserProfile = {
      id: "usr-" + Math.random().toString(36).substring(2, 9),
      fullName: cleanEmail.split("@")[0] || "Customer",
      email: cleanEmail,
      phone: "",
      institutionName: "",
      role,
      country: "United States",
      countryCode: "US",
      addresses: []
    };
    setUser(newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser: session?.user || null,
        session,
        isAuthenticated: Boolean(user),
        isAdmin: Boolean(user && (user.role === "super_admin" || user.role === "admin")),
        isAuthLoading,
        signUp,
        signIn,
        logout,
        requestPasswordReset,
        updatePassword,
        updateProfile,
        updateEmail,
        addAddress,
        deleteAddress,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        login
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
