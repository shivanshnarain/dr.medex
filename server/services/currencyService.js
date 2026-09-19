const countries = require("../data/countries");

// Base fallback exchange rates relative to 1 USD
const fallbackRates = {
  USD: 1.0,
  INR: 86.85,
  GBP: 0.78,
  EUR: 0.92,
  CAD: 1.39,
  AUD: 1.54,
  AED: 3.67,
  SGD: 1.34,
  ZAR: 18.25,
  JPY: 153.20,
  CHF: 0.88
};

let cachedRates = { ...fallbackRates };
let lastFetchedAt = Date.now();
const CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour cache

// Currency symbol and locale map
const currencyMeta = {
  USD: { symbol: "$", decimals: 2, locale: "en-US" },
  INR: { symbol: "₹", decimals: 0, locale: "en-IN" },
  GBP: { symbol: "£", decimals: 2, locale: "en-GB" },
  EUR: { symbol: "€", decimals: 2, locale: "de-DE" },
  CAD: { symbol: "CA$", decimals: 2, locale: "en-CA" },
  AUD: { symbol: "A$", decimals: 2, locale: "en-AU" },
  AED: { symbol: "د.إ", decimals: 2, locale: "ar-AE" },
  SGD: { symbol: "S$", decimals: 2, locale: "en-SG" },
  ZAR: { symbol: "R", decimals: 2, locale: "en-ZA" },
  JPY: { symbol: "¥", decimals: 0, locale: "ja-JP" },
  CHF: { symbol: "CHF", decimals: 2, locale: "de-CH" }
};

async function syncLiveRates() {
  // If cache is still warm, use it
  if (Date.now() - lastFetchedAt < CACHE_DURATION_MS && Object.keys(cachedRates).length > 5) {
    return cachedRates;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && data.rates) {
        cachedRates = {
          ...fallbackRates,
          USD: 1.0,
          INR: data.rates.INR || fallbackRates.INR,
          GBP: data.rates.GBP || fallbackRates.GBP,
          EUR: data.rates.EUR || fallbackRates.EUR,
          CAD: data.rates.CAD || fallbackRates.CAD,
          AUD: data.rates.AUD || fallbackRates.AUD,
          AED: data.rates.AED || fallbackRates.AED,
          SGD: data.rates.SGD || fallbackRates.SGD,
          ZAR: data.rates.ZAR || fallbackRates.ZAR,
          JPY: data.rates.JPY || fallbackRates.JPY,
          CHF: data.rates.CHF || fallbackRates.CHF
        };
        lastFetchedAt = Date.now();
      }
    }
  } catch (err) {
    // Graceful fallback to resilient baseline rates
    // console.log("Using cached/fallback currency rates:", err.message);
  }

  return cachedRates;
}

function getRateForCurrency(currency) {
  const code = (currency || "USD").toUpperCase();
  return cachedRates[code] || fallbackRates[code] || 1.0;
}

function convertPrice(basePriceUSD, targetCurrency) {
  const rate = getRateForCurrency(targetCurrency);
  const rawConverted = basePriceUSD * rate;
  const meta = currencyMeta[targetCurrency] || { decimals: 2 };
  
  if (meta.decimals === 0) {
    return Math.round(rawConverted);
  }
  return Number(rawConverted.toFixed(2));
}

function getCurrencyMeta(currency) {
  return currencyMeta[currency] || { symbol: currency, decimals: 2, locale: "en-US" };
}

function formatPrice(amount, currency) {
  const meta = getCurrencyMeta(currency);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: meta.decimals,
      minimumFractionDigits: meta.decimals
    }).format(amount);
  } catch (e) {
    return `${meta.symbol} ${amount.toFixed(meta.decimals)}`;
  }
}

// Perform initial sync in background
syncLiveRates().catch(() => {});

module.exports = {
  syncLiveRates,
  getExchangeRates: () => ({
    baseCurrency: "USD",
    rates: cachedRates,
    lastFetchedAt: new Date(lastFetchedAt).toISOString(),
    supportedCurrencies: Object.keys(cachedRates).map(code => ({
      code,
      symbol: currencyMeta[code]?.symbol || code,
      rateAgainstUSD: cachedRates[code]
    }))
  }),
  getRateForCurrency,
  convertPrice,
  formatPrice,
  getCurrencyMeta
};
