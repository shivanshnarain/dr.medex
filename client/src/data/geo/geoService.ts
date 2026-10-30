/**
 * DR.MEDEX Global — Local Address Intelligence & Static Geo-Data Service
 * 
 * Provides:
 * - 195 Sovereign Countries with ISO 3166-1 alpha-2 & alpha-3 standards
 * - Lazy-loaded ISO 3166-2 administrative subdivisions (states, provinces, regions)
 * - Lazy-loaded city/locality data with GeoNames postal code intelligence
 * - In-memory caching with 0 ms repeated lookup time
 * - Zero external database or backend API dependency for geographic hierarchy
 */

import countriesData from "./countries.json";
import metadataData from "./metadata.json";

export interface GeoCountry {
  code: string;
  iso3: string;
  name: string;
  flag: string;
  dialCode: string;
  currency: string;
  symbol: string;
  adminType: string;
  stateLabel: string;
  hasStates: boolean;
  hasPostalCode: boolean;
  postalLabel: string | null;
  postalRegex: string | null;
  postalPlaceholder: string;
}

export interface GeoSubdivision {
  code: string;
  name: string;
  countryCode: string;
}

export interface GeoCity {
  name: string;
  postalCodes: string[];
}

export interface GeoMetadata {
  title: string;
  version: string;
  lastUpdated: string;
  license: string;
  statistics: {
    totalSupportedCountries: number;
    countriesWithSubdivisions: number;
    countriesWithoutSubdivisions: number;
    countriesWithCities: number;
    countriesWithoutCities: number;
    countriesWithPostalCodes: number;
    countriesWithoutPostalCodes: number;
    totalSubdivisionsCount: number;
    totalCitiesCount: number;
  };
  storage: {
    countriesJsonBytes: number;
    subdivisionsDirBytes: number;
    citiesDirBytes: number;
    totalGeneratedBytes: number;
    totalGeneratedMB: string;
  };
}

// Master countries array
export const WORLDWIDE_195_GEO_COUNTRIES: GeoCountry[] = countriesData as GeoCountry[];

// Popular procurement hubs for quick access
export const POPULAR_COUNTRY_CODES = ["IN", "US", "GB", "DE", "AE", "SA", "SG", "AU", "CA", "FR"];

// Vite dynamic glob loaders for lazy chunk code-splitting
const subdivisionModules = import.meta.glob<{ default: GeoSubdivision[] }>("./subdivisions/*.json");
const cityModules = import.meta.glob<{ default: Record<string, GeoCity[]> }>("./cities/*.json");

// In-memory memory caches for 0ms subsequent access
const subdivisionsCache = new Map<string, GeoSubdivision[]>();
const citiesCache = new Map<string, Record<string, GeoCity[]>>();

/**
 * Get all 195 sovereign countries
 */
export function getAllCountries(): GeoCountry[] {
  return WORLDWIDE_195_GEO_COUNTRIES;
}

/**
 * Find country by ISO alpha-2 code
 */
export function getCountryByCode(code: string): GeoCountry | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return WORLDWIDE_195_GEO_COUNTRIES.find((c) => c.code === upper || c.iso3 === upper);
}

/**
 * Filter countries by name, ISO-2, ISO-3, or calling code (+91, 91, +1, etc.)
 */
export function filterCountries(query: string, list: GeoCountry[] = WORLDWIDE_195_GEO_COUNTRIES): GeoCountry[] {
  const q = (query || "").trim().toLowerCase();
  if (!q) return list;

  const qNormalized = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const isNumericOnly = /^\d+$/.test(q);
  const isDialSearch = q.startsWith("+") || isNumericOnly;
  const searchDigits = q.replace(/[^\d]/g, "");

  return list.filter((c) => {
    const cName = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cCode = c.code.toLowerCase();
    const cIso3 = (c.iso3 || "").toLowerCase();
    const cDialDigits = c.dialCode.replace(/[^\d]/g, "");

    // 1. Dial code search
    if (isDialSearch && searchDigits.length > 0) {
      if (searchDigits === "1") {
        if (cDialDigits === "1" || cDialDigits.startsWith("1")) {
          return true;
        }
      } else {
        if (cDialDigits === searchDigits || cDialDigits.startsWith(searchDigits)) {
          return true;
        }
      }
    }

    // 2. Alphabetic name or ISO code match
    if (cName.includes(qNormalized) || cCode === q || cIso3 === q) {
      return true;
    }

    return false;
  }).sort((a, b) => {
    // Sort exact matches higher
    const aDialDigits = a.dialCode.replace(/[^\d]/g, "");
    const bDialDigits = b.dialCode.replace(/[^\d]/g, "");
    if (isDialSearch && searchDigits) {
      if (aDialDigits === searchDigits && bDialDigits !== searchDigits) return -1;
      if (bDialDigits === searchDigits && aDialDigits !== searchDigits) return 1;
    }
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    if (aName.startsWith(qNormalized) && !bName.startsWith(qNormalized)) return -1;
    if (bName.startsWith(qNormalized) && !aName.startsWith(qNormalized)) return 1;
    return aName.localeCompare(bName);
  });
}

/**
 * Asynchronously lazy-load administrative subdivisions (states, provinces, regions) for a country
 */
export async function loadSubdivisions(countryCode: string): Promise<GeoSubdivision[]> {
  if (!countryCode) return [];
  const code = countryCode.trim().toUpperCase();

  // Return cached dataset if already in memory
  if (subdivisionsCache.has(code)) {
    return subdivisionsCache.get(code)!;
  }

  const key = `./subdivisions/${code}.json`;
  const loader = subdivisionModules[key];
  if (!loader) {
    // Country without subdivisions (e.g. Vatican City)
    subdivisionsCache.set(code, []);
    return [];
  }

  try {
    const mod = await loader();
    const data = (mod && mod.default) ? mod.default : (mod as unknown as GeoSubdivision[]);
    const list = Array.isArray(data) ? data : [];
    subdivisionsCache.set(code, list);
    return list;
  } catch (err) {
    console.warn(`[GeoService] Failed loading subdivisions for ${code}:`, err);
    return [];
  }
}

/**
 * Asynchronously lazy-load cities for a country, optionally filtered by subdivision
 */
export async function loadCities(countryCode: string, stateCode?: string): Promise<GeoCity[]> {
  if (!countryCode) return [];
  const code = countryCode.trim().toUpperCase();

  let stateMap: Record<string, GeoCity[]> | null = null;

  if (citiesCache.has(code)) {
    stateMap = citiesCache.get(code)!;
  } else {
    const key = `./cities/${code}.json`;
    const loader = cityModules[key];
    if (loader) {
      try {
        const mod = await loader();
        const data = (mod && mod.default) ? mod.default : (mod as unknown as Record<string, GeoCity[]>);
        stateMap = data || {};
        citiesCache.set(code, stateMap);
      } catch (err) {
        console.warn(`[GeoService] Failed loading cities for ${code}:`, err);
        stateMap = {};
      }
    } else {
      stateMap = {};
      citiesCache.set(code, stateMap);
    }
  }

  if (!stateMap) return [];

  // If specific state requested
  if (stateCode) {
    const sCode = stateCode.trim().toUpperCase();
    if (stateMap[sCode] && Array.isArray(stateMap[sCode]) && stateMap[sCode].length > 0) {
      return stateMap[sCode];
    }
    // Check if stateCode matches a subdivision name instead of code
    const foundKey = Object.keys(stateMap).find((k) => k.toUpperCase() === sCode);
    if (foundKey && Array.isArray(stateMap[foundKey])) {
      return stateMap[foundKey];
    }
    // Fallback to general list if available
    return stateMap["_OTHER"] || [];
  }

  // If no stateCode, combine all cities
  const allCities: GeoCity[] = [];
  const seen = new Set<string>();
  for (const list of Object.values(stateMap)) {
    if (Array.isArray(list)) {
      for (const item of list) {
        if (!seen.has(item.name)) {
          seen.add(item.name);
          allCities.push(item);
        }
      }
    }
  }
  return allCities.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Retrieve postal code suggestions for a city
 */
export async function getPostalSuggestions(countryCode: string, stateCode: string, cityName: string): Promise<string[]> {
  if (!cityName || !countryCode) return [];
  const cities = await loadCities(countryCode, stateCode);
  const target = cityName.trim().toLowerCase();
  
  // Exact or close match
  const match = cities.find((c) => c.name.toLowerCase() === target)
    || cities.find((c) => c.name.toLowerCase().includes(target));

  if (match && Array.isArray(match.postalCodes)) {
    return match.postalCodes;
  }
  return [];
}

/**
 * Validate postal code against country-specific regex
 */
export function validatePostalCode(countryCode: string, postalCode: string): { valid: boolean; message?: string } {
  const country = getCountryByCode(countryCode);
  if (!country) return { valid: true };

  // Countries without postal codes
  if (!country.hasPostalCode) {
    return { valid: true };
  }

  const val = (postalCode || "").trim();
  if (!val) {
    return { valid: false, message: `${country.postalLabel || "Postal code"} is required.` };
  }

  if (country.postalRegex) {
    try {
      const reg = new RegExp(country.postalRegex, "i");
      if (!reg.test(val)) {
        return {
          valid: false,
          message: `Please enter a valid format for ${country.name} (${country.postalPlaceholder}).`
        };
      }
    } catch {
      // Regex parse fallback
      return { valid: true };
    }
  }

  return { valid: true };
}

/**
 * Get coverage metadata
 */
export function getGeoMetadata(): GeoMetadata {
  return metadataData as unknown as GeoMetadata;
}
