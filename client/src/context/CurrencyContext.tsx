import React, { createContext, useContext, useState, useEffect } from "react";
import { Country } from "../types";

interface CurrencyContextType {
  currentCountry: Country;
  currentCurrency: string;
  exchangeRates: Record<string, number>;
  countries: Country[];
  setCountry: (countryCode: string) => void;
  setCurrencyManually: (currencyCode: string) => void;
  convertPrice: (usdAmount: number) => number;
  formatPrice: (usdAmount: number) => string;
  getSymbol: () => string;
  isLoading: boolean;
}

const defaultCountry: Country = {
  code: "US",
  name: "United States",
  flag: "🇺🇸",
  currency: "USD",
  symbol: "$",
  dialCode: "+1",
  postalLabel: "ZIP Code",
  stateLabel: "State",
  postalRegex: "^[0-9]{5}(?:-[0-9]{4})?$",
  defaultRate: 1.0,
  voltage: "120V / 60Hz",
  plugType: "Type A / B",
  leadTimeAirDays: "3–5 Days",
  regulatoryStandards: "FDA 510(k) Ready / ISO 13485"
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [countries, setCountries] = useState<Country[]>([defaultCountry]);
  const [currentCountry, setCurrentCountryState] = useState<Country>(defaultCountry);
  const [currentCurrency, setCurrentCurrencyState] = useState<string>("USD");
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USD: 1.0 });
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
          if (countryData.success && countryData.countries) {
            setCountries(countryData.countries);

            // Check saved preference in localStorage
            const savedCode = localStorage.getItem("drmedex_country");
            if (savedCode) {
              const matched = countryData.countries.find((c: Country) => c.code === savedCode);
              if (matched) {
                setCurrentCountryState(matched);
                setCurrentCurrencyState(localStorage.getItem("drmedex_currency") || matched.currency);
              }
            } else {
              // Default to US or detect if needed
              const us = countryData.countries.find((c: Country) => c.code === "US") || countryData.countries[0];
              setCurrentCountryState(us);
              setCurrentCurrencyState(us.currency);
            }
          }
        }

        if (rateRes.ok) {
          const rateData = await rateRes.json();
          if (rateData.success && rateData.rates) {
            setExchangeRates(rateData.rates);
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

  const convertPrice = (usdAmount: number): number => {
    const rate = exchangeRates[currentCurrency] || 1.0;
    const converted = usdAmount * rate;
    if (currentCurrency === "INR" || currentCurrency === "JPY") {
      return Math.round(converted);
    }
    return Number(converted.toFixed(2));
  };

  const getSymbol = (): string => {
    const matched = countries.find((c) => c.currency === currentCurrency);
    if (matched) return matched.symbol;
    if (currentCurrency === "USD") return "$";
    if (currentCurrency === "EUR") return "€";
    if (currentCurrency === "GBP") return "£";
    if (currentCurrency === "INR") return "₹";
    return currentCurrency;
  };

  const formatPrice = (usdAmount: number): string => {
    const converted = convertPrice(usdAmount);
    const symbol = getSymbol();
    
    // Formatting with commas
    const decimals = (currentCurrency === "INR" || currentCurrency === "JPY") ? 0 : 2;
    const formattedNum = converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });

    return `${symbol}${formattedNum}`;
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
        getSymbol,
        isLoading
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
