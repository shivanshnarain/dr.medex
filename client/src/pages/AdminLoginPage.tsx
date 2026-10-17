import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * AdminLoginPage - Deprecated separate black admin login UI.
 * Automatically and safely redirects all admin login attempts to the standard customer login page
 * with safe return URL parameter.
 */
export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const from = (location.state as any)?.from?.pathname || "/admin";
    navigate(`/account/signin?redirect=${encodeURIComponent(from)}`, { replace: true });
  }, [navigate, location]);

  return null;
};
