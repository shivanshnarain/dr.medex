import React, { createContext, useContext, useState, useEffect } from "react";
import { Country } from "../types";

interface CurrencyContextType {
  currentCountry: Country;
  currentCurrency: string;
  exchangeRates: Record<string, number>;
  countries: Country[];
  setCountry: (countryCode: string) => void;
  setCurrencyManually: (currencyCode: string) => void;
  convertPrice: (inrAmount: number) => number;
  formatPrice: (inrAmount: number, options?: { forceDecimals?: boolean }) => string;
  formatProductPrice: (product: any, type?: "sale" | "regular" | "base") => string;
  getSymbol: () => string;
  isLoading: boolean;
  lastUpdated: string | null;
}

const defaultFallbackRatesAgainstINR: Record<string, number> = {
  INR: 1.0,
  USD: 0.010379,
  EUR: 0.009228,
  GBP: 0.007854,
  AED: 0.038116,
  SAR: 0.038921,
  CAD: 0.014791,
  AUD: 0.014939,
  ZAR: 0.173245,
  NGN: 14.195452,
  SGD: 0.01352,
  JPY: 1.5732,
  CHF: 0.00951
};

const defaultCountry: Country = {
  code: "IN",
  name: "India",
  flag: "🇮🇳",
  currency: "INR",
  symbol: "₹",
  dialCode: "+91",
  postalLabel: "PIN Code",
  stateLabel: "State",
  postalRegex: "^[1-9][0-9]{5}$",
  defaultRate: 1.0,
  voltage: "230V / 50Hz",
  plugType: "Type C / D / M",
  leadTimeAirDays: "2–4 Days",
  regulatoryStandards: "CDSCO / ISO 13485:2016"
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [countries, setCountries] = useState<Country[]>([defaultCountry]);
  const [currentCountry, setCurrentCountryState] = useState<Country>(defaultCountry);
  const [currentCurrency, setCurrentCurrencyState] = useState<string>("INR");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(defaultFallbackRatesAgainstINR);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load countries and exchange rates
  useEffect(() => {
    async function initData() {
      try {
        const [countryRes, rateRes] = await Promise.all([
          fetch("/api/countries"),
          fetch("/api/currency/rates")
        ]);

        if (countryRes.ok) {
          const countryData = await countryRes.json();
          if (countryData.success && countryData.countries && countryData.countries.length > 0) {
            setCountries(countryData.countries);

            // Check saved preference in localStorage
            const savedCode = localStorage.getItem("drmedex_country");
            if (savedCode) {
              const matched = countryData.countries.find((c: Country) => c.code === savedCode);
              if (matched) {
                setCurrentCountryState(matched);
                const savedCurr = localStorage.getItem("drmedex_currency");
                setCurrentCurrencyState(savedCurr || matched.currency);
              }
            } else {
              // Default to India (INR)
              const india = countryData.countries.find((c: Country) => c.code === "IN") || countryData.countries[0];
              setCurrentCountryState(india);
              setCurrentCurrencyState(india.currency || "INR");
            }
          }
        }

        if (rateRes.ok) {
          const rateData = await rateRes.json();
          if (rateData.success && rateData.rates) {
            setExchangeRates({
              ...defaultFallbackRatesAgainstINR,
              ...rateData.rates
            });
            if (rateData.lastFetchedAt) {
              setLastUpdated(rateData.lastFetchedAt);
            }
          }
        }
      } catch (err) {
        console.error("Failed to initialize currency/country data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initData();
  }, []);

  const setCountry = (countryCode: string) => {
    const selected = countries.find((c) => c.code === countryCode);
    if (selected) {
      setCurrentCountryState(selected);
      setCurrentCurrencyState(selected.currency);
      localStorage.setItem("drmedex_country", selected.code);
      localStorage.setItem("drmedex_currency", selected.currency);
    }
  };

  const setCurrencyManually = (currencyCode: string) => {
    setCurrentCurrencyState(currencyCode);
    localStorage.setItem("drmedex_currency", currencyCode);
  };

  const convertPrice = (inrAmount: number): number => {
    if (typeof inrAmount !== "number" || isNaN(inrAmount)) return 0;
    const code = (currentCurrency || "INR").toUpperCase();
    if (code === "INR") {
      return Number(inrAmount.toFixed(2));
    }
    const rate = exchangeRates[code] || defaultFallbackRatesAgainstINR[code] || 1.0;
    const converted = inrAmount * rate;
    if (code === "JPY") {
      return Math.round(converted);
    }
    return Number(converted.toFixed(2));
  };

  const getSymbol = (): string => {
    const code = (currentCurrency || "INR").toUpperCase();
    const matched = countries.find((c) => c.currency === code);
    if (matched && matched.symbol) return matched.symbol;
    if (code === "INR") return "₹";
    if (code === "USD") return "$";
    if (code === "EUR") return "€";
    if (code === "GBP") return "£";
    if (code === "AED") return "AED ";
    if (code === "SAR") return "SAR ";
    if (code === "CAD") return "CA$";
    if (code === "AUD") return "A$";
    if (code === "ZAR") return "R";
    if (code === "NGN") return "₦";
    if (code === "SGD") return "S$";
    if (code === "JPY") return "¥";
    return `${code} `;
  };

  const formatPrice = (inrAmount: number, options?: { forceDecimals?: boolean }): string => {
    if (typeof inrAmount !== "number" || isNaN(inrAmount) || inrAmount <= 0) return "Quote";
    const code = (currentCurrency || "INR").toUpperCase();
    const converted = convertPrice(inrAmount);
    const symbol = getSymbol();
    
    // Formatting decimals: preserve exact 2 decimals if present or if forceDecimals
    const hasDecimals = (converted % 1 !== 0) || options?.forceDecimals || code === "INR";
    const decimals = code === "JPY" ? 0 : (hasDecimals ? 2 : 0);
    const formattedNum = converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    return `${symbol}${formattedNum}`;
  };

  const formatProductPrice = (product: any, type: "sale" | "regular" | "base" = "sale"): string => {
    if (!product) return "Quote";
    if (product.priceStatus === "PRICE_NOT_AVAILABLE") return "Contact for Price";

    const code = (currentCurrency || "INR").toUpperCase();

    // If USD and explicit reference USD price exists, preserve it exactly
    if (code === "USD" && product.referencePricing) {
      if (type === "regular" && typeof product.referencePricing.referenceRegularUSD === "number") {
        return `$${product.referencePricing.referenceRegularUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if ((type === "sale" || type === "base") && typeof product.referencePricing.referenceSaleUSD === "number") {
        return `$${product.referencePricing.referenceSaleUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    let inrVal = product.basePrice;
    if (type === "regular") {
      inrVal = product.regularPrice || (product.referencePricing?.referenceRegularINR ?? product.basePrice);
    } else if (type === "sale") {
      inrVal = product.salePrice || product.basePrice;
    }

    return formatPrice(inrVal, { forceDecimals: true });
  };

  return (
    <CurrencyContext.Provider
      value={{
        currentCountry,
        currentCurrency,
        exchangeRates,
        countries,
        setCountry,
        setCurrencyManually,
        convertPrice,
        formatPrice,
        formatProductPrice,
        getSymbol,
        isLoading,
        lastUpdated
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
};
