import React, { createContext, useContext, useState, useEffect } from "react";
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
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, role?: UserProfile["role"]) => void;
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  addAddress: (address: ShippingAddress) => void;
  deleteAddress: (index: number) => void;
}

const defaultUser: UserProfile = {
  id: "usr-dr-reyes",
  fullName: "Dr. Jonathan Reyes",
  email: "jreyes@mayoortho.com",
  phone: "+1 415-555-0192",
  institutionName: "Mayo Orthopedic & Surgical Institute",
  role: "super_admin",
  country: "United States",
  countryCode: "US",
  addresses: [
    {
      fullName: "Dr. Jonathan Reyes",
      companyName: "Mayo Orthopedic & Surgical Institute",
      email: "jreyes@mayoortho.com",
      phone: "+1 415-555-0192",
      addressLine1: "742 Medical Center Blvd, Suite 400",
      city: "San Francisco",
      state: "California",
      postalCode: "94143",
      country: "United States",
      countryCode: "US"
    }
  ]
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("drmedex_user");
      return saved ? JSON.parse(saved) : defaultUser;
    } catch {
      return defaultUser;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem("drmedex_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("drmedex_user");
    }
  }, [user]);

  const login = (email: string, role: UserProfile["role"] = "buyer") => {
    const newUser: UserProfile = {
      ...defaultUser,
      email,
      role
    };
    setUser(newUser);
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return;
    setUser({ ...user, ...updates });
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === "super_admin" || user?.role === "admin",
        login,
        logout,
        updateProfile,
        addAddress,
        deleteAddress
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
