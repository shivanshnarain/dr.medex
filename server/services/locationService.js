/**
 * DR.MEDEX Global — Location & Address Intelligence Service
 * Source of truth for exactly 195 sovereign countries, calling codes,
 * dynamic states/provinces, cities, Google Maps & fallback address autocomplete,
 * and libphonenumber phone validation.
 */

const { State, City, Country } = require("country-state-city");
const { parsePhoneNumberFromString } = require("libphonenumber-js");
const worldwide195 = require("../data/worldwide195Countries");

// In-memory cache for autocomplete results (5 minutes TTL)
const autocompleteCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Get all 195 exact countries with calling codes, currencies, symbols & flags
 */
function getAllCountries() {
  return worldwide195;
}

/**
 * Get specific country by ISO code or exact name
 */
function getCountry(identifier) {
  if (!identifier) return null;
  const clean = String(identifier).trim().toUpperCase();
  return worldwide195.find(
    (c) => c.code.toUpperCase() === clean || c.name.toUpperCase() === clean
  ) || null;
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
 * Validate and format phone number using libphonenumber-js
 */
function validatePhoneNumber(phoneNumber, countryCode = "IN") {
  if (!phoneNumber) return { isValid: false, formatted: "", localNumber: "" };
  try {
    const cleanCountry = String(countryCode).trim().toUpperCase();
    const parsed = parsePhoneNumberFromString(String(phoneNumber), cleanCountry);
    if (!parsed) {
      return {
        isValid: false,
        formatted: String(phoneNumber).trim(),
        localNumber: String(phoneNumber).replace(/[^\d]/g, "")
      };
    }

    return {
      isValid: parsed.isValid(),
      e164: parsed.format("E.164"),
      international: parsed.formatInternational(),
      national: parsed.formatNational(),
      country: parsed.country,
      callingCode: `+${parsed.countryCallingCode}`,
      localNumber: parsed.nationalNumber
    };
  } catch (err) {
    return {
      isValid: false,
      formatted: String(phoneNumber).trim(),
      localNumber: String(phoneNumber).replace(/[^\d]/g, "")
    };
  }
}

/**
 * Query Google Places API (New) / Place Autocomplete when GOOGLE_MAPS_API_KEY is configured
 */
async function autocompleteWithGooglePlaces(query, countryCode, apiKey) {
  try {
    const cleanCountry = String(countryCode || "").trim().toLowerCase();
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query
    )}&types=address&key=${apiKey}`;

    if (cleanCountry && cleanCountry.length === 2) {
      url += `&components=country:${cleanCountry}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    if (data.status === "OK" && Array.isArray(data.predictions) && data.predictions.length > 0) {
      return data.predictions.map((p) => {
        const terms = Array.isArray(p.terms) ? p.terms.map((t) => t.value) : [];
        const mainText = p.structured_formatting?.main_text || p.description.split(",")[0];
        const secondaryText = p.structured_formatting?.secondary_text || "";

        return {
          formattedAddress: p.description,
          addressLine1: mainText,
          city: terms.length > 2 ? terms[terms.length - 3] : (secondaryText.split(",")[0] || ""),
          state: terms.length > 1 ? terms[terms.length - 2] : "",
          postalCode: "",
          country: terms.length > 0 ? terms[terms.length - 1] : "",
          countryCode: countryCode.toUpperCase(),
          provider: "google_places",
          placeId: p.place_id
        };
      });
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * OpenStreetMap / Photon geocoder (Primary fallback if Google Maps API key is not yet set)
 */
async function autocompleteWithPhoton(cleanQuery, cleanCountry) {
  let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=8`;
  if (cleanCountry && cleanCountry.length === 2) {
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

  if (!res.ok) return [];

  const data = await res.json();
  const features = Array.isArray(data.features) ? data.features : [];

  return features
    .filter((f) => {
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

      const formattedParts = [addressLine1, city, state, postalCode, country].filter(Boolean);

      return {
        formattedAddress: formattedParts.join(", "),
        addressLine1,
        city,
        state,
        postalCode,
        country,
        countryCode: countryCodeUpper,
        provider: "photon_osm"
      };
    });
}

/**
 * Worldwide Address Autocomplete
 * Uses official Google Places API when GOOGLE_MAPS_API_KEY is configured,
 * otherwise seamlessly falls back to OpenStreetMap / Photon geocoding.
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
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
    let results = null;

    if (googleApiKey) {
      results = await autocompleteWithGooglePlaces(cleanQuery, cleanCountry, googleApiKey);
    }

    if (!results || results.length === 0) {
      results = await autocompleteWithPhoton(cleanQuery, cleanCountry);
    }

    autocompleteCache.set(cacheKey, { timestamp: Date.now(), data: results });
    return results;
  } catch (err) {
    return [];
  }
}

/**
 * Reverse Geocode coordinates (lat, lng) to structured address components.
 * Supports Google Maps Geocoding API if GOOGLE_MAPS_API_KEY is configured,
 * with high-fidelity OpenStreetMap Nominatim reverse geocoding as default/fallback.
 */
async function reverseGeocode(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("Invalid latitude or longitude coordinates provided.");
  }

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY;
  let rawResult = null;
  let provider = "nominatim_osm";

  // 1. Try Google Maps Geocoding if API key available
  if (googleApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.status === "OK" && Array.isArray(data.results) && data.results.length > 0) {
          const first = data.results[0];
          const getComp = (type) => {
            const c = first.address_components.find((comp) => comp.types.includes(type));
            return c ? c.long_name : "";
          };
          const getCompShort = (type) => {
            const c = first.address_components.find((comp) => comp.types.includes(type));
            return c ? c.short_name : "";
          };

          const streetNumber = getComp("street_number");
          const route = getComp("route");
          const street = [streetNumber, route].filter(Boolean).join(" ");
          const sublocality = getComp("sublocality_level_1") || getComp("sublocality");

          rawResult = {
            streetAddress: street || sublocality || "",
            district: getComp("administrative_area_level_2") || sublocality || "",
            city: getComp("locality") || getComp("postal_town") || getComp("administrative_area_level_3") || "",
            state: getComp("administrative_area_level_1") || "",
            postalCode: getComp("postal_code") || "",
            country: getComp("country") || "",
            countryCode: (getCompShort("country") || "").toUpperCase(),
            formattedAddress: first.formatted_address || ""
          };
          provider = "google_maps";
        }
      }
    } catch (gErr) {
      // Fallback silently to Nominatim
    }
  }

  // 2. OpenStreetMap Nominatim Geocoding fallback
  if (!rawResult) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "DR.MEDEX-Medical-Global/1.0 (procurement@drmedex.com)"
        }
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};

        const house = addr.house_number ? `${addr.house_number} ` : "";
        const road = addr.road || addr.street || addr.pedestrian || addr.suburb || "";
        const streetAddress = (house + road).trim();

        const city = addr.city || addr.town || addr.village || addr.municipality || addr.hamlet || addr.county || "";
        const district = addr.state_district || addr.county || addr.district || "";
        const state = addr.state || addr.province || addr.region || "";
        const postalCode = addr.postcode || "";
        const country = addr.country || "";
        const countryCode = (addr.country_code || "").toUpperCase();

        rawResult = {
          streetAddress,
          district,
          city,
          state,
          postalCode,
          country,
          countryCode,
          formattedAddress: data.display_name || ""
        };
        provider = "nominatim_osm";
      }
    } catch (osmErr) {
      throw new Error(`Reverse geocoding failed: ${osmErr.message}`);
    }
  }

  if (!rawResult) {
    throw new Error("Unable to resolve coordinates to an address location.");
  }

  // 3. Match with DR.MEDEX 195 sovereign countries list
  const matchedCountry = worldwide195.find(
    (c) => c.code.toUpperCase() === rawResult.countryCode ||
           c.name.toLowerCase() === rawResult.country.toLowerCase()
  ) || null;

  // 4. Match with country-state-city State database to find stateCode
  let matchedStateCode = "";
  if (matchedCountry && rawResult.state) {
    const states = State.getStatesOfCountry(matchedCountry.code);
    const stateClean = rawResult.state.toLowerCase();
    const foundState = states.find(
      (s) => s.name.toLowerCase() === stateClean ||
             s.isoCode.toLowerCase() === stateClean ||
             stateClean.includes(s.name.toLowerCase()) ||
             s.name.toLowerCase().includes(stateClean)
    );
    if (foundState) {
      matchedStateCode = foundState.isoCode;
    }
  }

  return {
    success: true,
    provider,
    latitude,
    longitude,
    country: matchedCountry ? matchedCountry.name : rawResult.country,
    countryCode: matchedCountry ? matchedCountry.code : rawResult.countryCode,
    countryData: matchedCountry,
    state: rawResult.state,
    stateCode: matchedStateCode,
    district: rawResult.district,
    city: rawResult.city,
    postalCode: rawResult.postalCode,
    streetAddress: rawResult.streetAddress,
    formattedAddress: rawResult.formattedAddress
  };
}

/**
 * Location Provider Status
 */
function getProviderStatus() {
  const hasGoogleKey = Boolean(process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY);
  return {
    success: true,
    countriesCount: worldwide195.length,
    googleMapsConfigured: hasGoogleKey,
    activeProvider: hasGoogleKey ? "Google Maps Platform Places API" : "OpenStreetMap / Photon Geocoding",
    requiredConfig: hasGoogleKey ? null : "Set GOOGLE_MAPS_API_KEY in .env for Google Places Autocomplete"
  };
}

module.exports = {
  getAllCountries,
  getCountry,
  getStatesByCountry,
  getCitiesByCountryAndState,
  validatePhoneNumber,
  autocompleteAddress,
  reverseGeocode,
  getProviderStatus
};
