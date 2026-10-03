import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface AdminUser {
  id?: string;
  email: string;
  name?: string;
  fullName?: string;
  role: string;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string; retryAfter?: number }>;
  logout: () => Promise<void>;
  adminFetch: (url: string, init?: RequestInit) => Promise<Response>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const TOKEN_KEY = "drmedex_admin_session_token";

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authenticated fetch wrapper
  const adminFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers || {});
      const activeToken = token || localStorage.getItem(TOKEN_KEY);
      if (activeToken) {
        headers.set("Authorization", `Bearer ${activeToken}`);
      }
      return fetch(url, {
        ...init,
        headers
      });
    },
    [token]
  );

  // Verify session on mount
  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (!savedToken) {
        if (isMounted) {
          setIsLoading(false);
          setAdminUser(null);
        }
        return;
      }

      try {
        const res = await fetch("/api/admin/me", {
          headers: {
            Authorization: `Bearer ${savedToken}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && isMounted) {
            setAdminUser(data.user);
            setToken(savedToken);
          } else {
            throw new Error("Invalid session");
          }
        } else {
          throw new Error("Session expired");
        }
      } catch {
        if (isMounted) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setAdminUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifySession();
    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string; retryAfter?: number }> => {
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.success && data.token) {
        localStorage.setItem(TOKEN_KEY, data.token);
        setToken(data.token);
        setAdminUser(data.user);
        return { success: true };
      } else {
        return {
          success: false,
          message: data.message || "Invalid credentials or authorization failure.",
          retryAfter: data.retryAfter
        };
      }
    } catch {
      return {
        success: false,
        message: "Failed to connect to authentication gateway. Please check your network connection."
      };
    }
  };

  const logout = async () => {
    try {
      const savedToken = token || localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        await fetch("/api/admin/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${savedToken}`
          }
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setAdminUser(null);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        token,
        isAuthenticated: !!adminUser,
        isLoading,
        login,
        logout,
        adminFetch
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
