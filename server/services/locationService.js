/**
 * DR.MEDEX Global — Location & Address Intelligence Service
 * Provides complete worldwide countries, states/provinces, cities,
 * calling codes, currencies, and real-time address autocomplete.
 */

const { Country, State, City } = require("country-state-city");

// In-memory cache for external autocomplete results (5 minutes)
const autocompleteCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

// Currencies mapping overrides/refinements
const currencyOverrides = {
  IN: "INR",
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AU: "AUD",
  NZ: "NZD",
  AE: "AED",
  SA: "SAR",
  PK: "PKR",
  BD: "BDT",
  SG: "SGD",
  MY: "MYR",
  JP: "JPY",
  ZA: "ZAR",
  NG: "NGN",
  BR: "BRL",
  MX: "MXN",
  CH: "CHF"
};

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "AED ",
  SAR: "SAR ",
  CAD: "CA$",
  AUD: "A$",
  PKR: "₨",
  BDT: "৳",
  SGD: "S$",
  MYR: "RM",
  JPY: "¥",
  ZAR: "R",
  NGN: "₦",
  BRL: "R$",
  MXN: "MX$",
  CHF: "CHF"
};

/**
 * Get all 250 countries with standardized metadata
 */
function getAllCountries() {
  const allRaw = Country.getAllCountries();
  return allRaw.map((c) => {
    const rawDial = c.phonecode ? c.phonecode.replace(/[^0-9]/g, "") : "";
    const dialCode = rawDial ? `+${rawDial}` : "+1";
    const currency = currencyOverrides[c.isoCode] || c.currency || "USD";
    const symbol = currencySymbols[currency] || (currency + " ");

    const postalLabel = c.isoCode === "IN" ? "PIN Code" : (c.isoCode === "US" ? "ZIP Code" : "Postal Code");
    const stateLabel = c.isoCode === "CA" ? "Province" : (c.isoCode === "GB" ? "County / Region" : "State / Province");

    return {
      code: c.isoCode,
      name: c.name,
      flag: c.flag || "🌐",
      dialCode,
      currency,
      symbol,
      postalLabel,
      stateLabel,
      latitude: c.latitude,
      longitude: c.longitude
    };
  });
}

/**
 * Get states / provinces / regions for a specific country
 */
function getStatesByCountry(countryCode) {
  if (!countryCode) return [];
  const cleanCode = String(countryCode).trim().toUpperCase();
  const states = State.getStatesOfCountry(cleanCode);
  return states.map((s) => ({
    code: s.isoCode,
    name: s.name,
    countryCode: s.countryCode
  }));
}

/**
 * Search or get cities for a country / state
 */
function getCitiesByCountryAndState(countryCode, stateCode, search = "") {
  if (!countryCode) return [];
  const cleanCountry = String(countryCode).trim().toUpperCase();
  let cities = [];

  if (stateCode) {
    const cleanState = String(stateCode).trim().toUpperCase();
    cities = City.getCitiesOfState(cleanCountry, cleanState);
  } else {
    cities = City.getCitiesOfCountry(cleanCountry) || [];
  }

  if (search && search.trim().length > 0) {
    const q = search.trim().toLowerCase();
    cities = cities.filter((c) => c.name.toLowerCase().includes(q));
  }

  // Return max 50 to keep response lightweight
  return cities.slice(0, 50).map((c) => ({
    name: c.name,
    stateCode: c.stateCode,
    countryCode: c.countryCode
  }));
}

/**
 * Worldwide Address Autocomplete using OpenStreetMap / Photon with caching
 */
async function autocompleteAddress(query, countryCode = "") {
  const cleanQuery = String(query || "").trim();
  if (cleanQuery.length < 2) return [];

  const cleanCountry = String(countryCode || "").trim().toLowerCase();
  const cacheKey = `${cleanCountry}:${cleanQuery.toLowerCase()}`;

  // Check cache
  const cached = autocompleteCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=6`;
    if (cleanCountry && cleanCountry.length === 2) {
      // Prioritize country location
      const countryObj = Country.getCountryByCode(cleanCountry.toUpperCase());
      if (countryObj && countryObj.latitude && countryObj.longitude) {
        url += `&lat=${countryObj.latitude}&lon=${countryObj.longitude}`;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "DR.MEDEX-Global-Procurement/1.0"
      }
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const features = Array.isArray(data.features) ? data.features : [];

    const results = features
      .filter((f) => {
        // If country specified, filter to match if possible
        if (cleanCountry && f.properties?.countrycode) {
          return f.properties.countrycode.toLowerCase() === cleanCountry;
        }
        return true;
      })
      .map((f) => {
        const p = f.properties || {};
        const house = p.housenumber ? `${p.housenumber} ` : "";
        const street = p.street || p.name || "";
        const addressLine1 = (house + street).trim() || p.name || "";
        const city = p.city || p.town || p.village || p.county || "";
        const state = p.state || "";
        const postalCode = p.postcode || "";
        const country = p.country || "";
        const countryCodeUpper = (p.countrycode || cleanCountry || "").toUpperCase();

        const formattedParts = [
          addressLine1,
          city,
          state,
          postalCode,
          country
        ].filter(Boolean);

        return {
          formattedAddress: formattedParts.join(", "),
          addressLine1,
          city,
          state,
          postalCode,
          country,
          countryCode: countryCodeUpper
        };
      });

    autocompleteCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
    // If external service fails or times out, safely return empty suggestions
    return [];
  }
}

module.exports = {
  getAllCountries,
  getStatesByCountry,
  getCitiesByCountryAndState,
  autocompleteAddress
};
