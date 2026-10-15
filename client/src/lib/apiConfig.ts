/**
 * DR.MEDEX Global — API Configuration Helper
 * Ensures relative URLs on localhost/proxy and configurable base URL in production.
 * Never hardcodes localhost into production builds.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");

/**
 * Returns a fully qualified API endpoint URL.
 * In localhost development, returns relative /api/... path proxied by Vite.
 * In production, if VITE_API_BASE_URL is provided, prefixes the configured origin.
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
}
