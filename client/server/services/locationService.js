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
 * Indian State Aliases & ISO Code Normalization Mapping
 */
const INDIA_STATE_ALIASES = {
  "odisha": { code: "OR", name: "Odisha" },
  "orissa": { code: "OR", name: "Odisha" },
  "or": { code: "OR", name: "Odisha" },
  "od": { code: "OR", name: "Odisha" },
  "in-od": { code: "OR", name: "Odisha" },
  "in-or": { code: "OR", name: "Odisha" },
  "uttarakhand": { code: "UT", name: "Uttarakhand" },
  "uttaranchal": { code: "UT", name: "Uttarakhand" },
  "ut": { code: "UT", name: "Uttarakhand" },
  "uk": { code: "UT", name: "Uttarakhand" },
  "in-ut": { code: "UT", name: "Uttarakhand" },
  "in-uk": { code: "UT", name: "Uttarakhand" },
  "puducherry": { code: "PY", name: "Puducherry" },
  "pondicherry": { code: "PY", name: "Puducherry" },
  "py": { code: "PY", name: "Puducherry" },
  "in-py": { code: "PY", name: "Puducherry" },
  "delhi": { code: "DL", name: "Delhi" },
  "nct of delhi": { code: "DL", name: "Delhi" },
  "national capital territory of delhi": { code: "DL", name: "Delhi" },
  "dl": { code: "DL", name: "Delhi" },
  "in-dl": { code: "DL", name: "Delhi" },
  "assam": { code: "AS", name: "Assam" },
  "as": { code: "AS", name: "Assam" },
  "in-as": { code: "AS", name: "Assam" },
  "uttar pradesh": { code: "UP", name: "Uttar Pradesh" },
  "up": { code: "UP", name: "Uttar Pradesh" },
  "in-up": { code: "UP", name: "Uttar Pradesh" },
  "maharashtra": { code: "MH", name: "Maharashtra" },
  "mh": { code: "MH", name: "Maharashtra" },
  "in-mh": { code: "MH", name: "Maharashtra" },
  "andhra pradesh": { code: "AP", name: "Andhra Pradesh" },
  "ap": { code: "AP", name: "Andhra Pradesh" },
  "karnataka": { code: "KA", name: "Karnataka" },
  "ka": { code: "KA", name: "Karnataka" },
  "tamil nadu": { code: "TN", name: "Tamil Nadu" },
  "tn": { code: "TN", name: "Tamil Nadu" },
  "telangana": { code: "TG", name: "Telangana" },
  "tg": { code: "TG", name: "Telangana" },
  "ts": { code: "TG", name: "Telangana" },
  "west bengal": { code: "WB", name: "West Bengal" },
  "wb": { code: "WB", name: "West Bengal" },
  "gujarat": { code: "GJ", name: "Gujarat" },
  "gj": { code: "GJ", name: "Gujarat" },
  "rajasthan": { code: "RJ", name: "Rajasthan" },
  "rj": { code: "RJ", name: "Rajasthan" },
  "kerala": { code: "KL", name: "Kerala" },
  "kl": { code: "KL", name: "Kerala" },
  "punjab": { code: "PB", name: "Punjab" },
  "pb": { code: "PB", name: "Punjab" },
  "haryana": { code: "HR", name: "Haryana" },
  "hr": { code: "HR", name: "Haryana" },
  "madhya pradesh": { code: "MP", name: "Madhya Pradesh" },
  "mp": { code: "MP", name: "Madhya Pradesh" },
  "bihar": { code: "BR", name: "Bihar" },
  "br": { code: "BR", name: "Bihar" }
};

/**
 * Reverse Geocode coordinates (lat, lng) to structured address components.
 * Multi-tier resilient architecture:
 * Tier 1: Google Maps Geocoding API (if GOOGLE_MAPS_API_KEY configured)
 * Tier 2: OpenStreetMap Nominatim (with 10s timeout, custom User-Agent, ISO3166-2 extraction)
 * Tier 3: BigDataCloud High-Speed Client Reverse Geocoding (sub-second fallback)
 * Followed by authoritative local dataset normalization for countries, states, and cities.
 */
async function reverseGeocode(lat, lng, reportedAccuracy = null) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error("Invalid latitude or longitude coordinates provided.");
  }

  const accuracyMeters = reportedAccuracy !== null && reportedAccuracy !== undefined && !isNaN(parseFloat(reportedAccuracy))
    ? Math.round(parseFloat(reportedAccuracy))
    : null;

  const googleApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_GEOCODING_API_KEY;
  let rawResult = null;
  let provider = "nominatim_osm";

  // Tier 1: Try Google Maps Geocoding if API key available
  if (googleApiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
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
            stateCode: (getCompShort("administrative_area_level_1") || "").toUpperCase(),
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

  // Tier 2: OpenStreetMap Nominatim Geocoding
  if (!rawResult) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=en`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "DR.MEDEX-Medical-Global/1.0 (procurement@drmedex.com)",
          "Accept-Language": "en"
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
        const isoState = (addr["ISO3166-2-lvl4"] || "").split("-").pop() || "";
        const postalCode = addr.postcode || "";
        const country = addr.country || "";
        const countryCode = (addr.country_code || "").toUpperCase();

        rawResult = {
          streetAddress,
          district,
          city,
          state,
          stateCode: isoState.toUpperCase(),
          postalCode,
          country,
          countryCode,
          formattedAddress: data.display_name || ""
        };
        provider = "nominatim_osm";
      }
    } catch (osmErr) {
      // Fallback to Tier 3 BigDataCloud
    }
  }

  // Tier 3: BigDataCloud High-Speed Client Reverse Geocoder
  if (!rawResult) {
    try {
      const bdcUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(bdcUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (res.ok) {
        const bdc = await res.json();
        const isoSub = (bdc.principalSubdivisionCode || "").split("-").pop() || "";
        const street = [bdc.locality, bdc.city].filter(Boolean)[0] || "";

        rawResult = {
          streetAddress: "",
          district: bdc.locality || "",
          city: bdc.city || bdc.locality || "",
          state: bdc.principalSubdivision || "",
          stateCode: isoSub.toUpperCase(),
          postalCode: bdc.postcode || "",
          country: bdc.countryName || "",
          countryCode: (bdc.countryCode || "").toUpperCase(),
          formattedAddress: [bdc.locality, bdc.city, bdc.principalSubdivision, bdc.countryName].filter(Boolean).join(", ")
        };
        provider = "bigdatacloud";
      }
    } catch (bdcErr) {
      // All remote providers failed
    }
  }

  if (!rawResult) {
    throw new Error("Unable to resolve coordinates to an address location. Please enter your address manually.");
  }

  // 1. Authoritative Sovereign Country Matching (195 Sovereign Countries)
  const matchedCountry = worldwide195.find(
    (c) => c.code.toUpperCase() === rawResult.countryCode ||
           c.name.toLowerCase() === rawResult.country.toLowerCase()
  ) || null;

  const targetCountryCode = matchedCountry ? matchedCountry.code : rawResult.countryCode;

  // 2. Authoritative State & Subdivision Normalization
  let normalizedState = rawResult.state || "";
  let normalizedStateCode = rawResult.stateCode || "";

  if (targetCountryCode === "IN") {
    const rawClean = (rawResult.state || "").toLowerCase().trim();
    const rawCodeClean = (rawResult.stateCode || "").toLowerCase().trim();

    if (INDIA_STATE_ALIASES[rawCodeClean]) {
      normalizedState = INDIA_STATE_ALIASES[rawCodeClean].name;
      normalizedStateCode = INDIA_STATE_ALIASES[rawCodeClean].code;
    } else if (INDIA_STATE_ALIASES[rawClean]) {
      normalizedState = INDIA_STATE_ALIASES[rawClean].name;
      normalizedStateCode = INDIA_STATE_ALIASES[rawClean].code;
    } else {
      for (const [alias, mapped] of Object.entries(INDIA_STATE_ALIASES)) {
        if (rawClean.includes(alias) || alias.includes(rawClean)) {
          normalizedState = mapped.name;
          normalizedStateCode = mapped.code;
          break;
        }
      }
    }
  }

  // Match against country-state-city State database as standard international resolver
  if (!normalizedStateCode && targetCountryCode) {
    const cscStates = State.getStatesOfCountry(targetCountryCode);
    const cleanState = (rawResult.state || "").toLowerCase().trim();
    const cleanCode = (rawResult.stateCode || "").toLowerCase().trim();

    const found = cscStates.find(
      (s) => s.isoCode.toLowerCase() === cleanCode ||
             s.name.toLowerCase() === cleanState ||
             cleanState.includes(s.name.toLowerCase()) ||
             s.name.toLowerCase().includes(cleanState)
    );
    if (found) {
      normalizedState = found.name;
      normalizedStateCode = found.isoCode;
    }
  }

  // 3. Authoritative City Normalization
  let normalizedCity = (rawResult.city || "").trim();
  if (normalizedCity) {
    // Strip redundant municipal corporate noise returned by some OSM nodes
    const cleanedCity = normalizedCity
      .replace(/\b(Municipal Corporation|M\.Corp\.|District|City|Town|Subdivision)\b/gi, "")
      .replace(/\(.*?\)/g, "")
      .trim();

    if (cleanedCity) {
      normalizedCity = cleanedCity;
    }

    // Try finding exact or closest city in database
    if (targetCountryCode && normalizedStateCode) {
      const cscCities = City.getCitiesOfState(targetCountryCode, normalizedStateCode);
      if (Array.isArray(cscCities) && cscCities.length > 0) {
        const exact = cscCities.find((c) => c.name.toLowerCase() === normalizedCity.toLowerCase());
        if (exact) {
          normalizedCity = exact.name;
        } else {
          const candidates = cscCities.filter((c) => {
            const a = c.name.toLowerCase();
            const b = normalizedCity.toLowerCase();
            return a.startsWith(b.slice(0, 5)) || b.startsWith(a.slice(0, 5));
          });
          if (candidates.length > 0) {
            candidates.sort((a, b) => Math.abs(a.name.length - normalizedCity.length) - Math.abs(b.name.length - normalizedCity.length));
            normalizedCity = candidates[0].name;
          }
        }
      }
    }
  }

  // Determine accuracy tier
  let accuracyTier = "high";
  if (accuracyMeters !== null) {
    if (accuracyMeters > 5000) accuracyTier = "approximate";
    else if (accuracyMeters > 500) accuracyTier = "medium";
    else accuracyTier = "high";
  }

  return {
    success: true,
    provider,
    latitude,
    longitude,
    accuracy: accuracyMeters,
    accuracyTier,
    country: matchedCountry ? matchedCountry.name : rawResult.country,
    countryCode: targetCountryCode,
    countryData: matchedCountry,
    state: normalizedState || rawResult.state,
    stateCode: normalizedStateCode || rawResult.stateCode,
    district: rawResult.district,
    city: normalizedCity || rawResult.city,
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
