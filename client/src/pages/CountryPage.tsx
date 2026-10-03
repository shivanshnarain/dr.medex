import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext";
import { Product, Country } from "../types";
import { ProductCard } from "../components/ProductCard";
import { B2BQuoteModal } from "../components/B2BQuoteModal";

export const CountryPage: React.FC = () => {
  const { countryCode } = useParams<{ countryCode: string }>();
  const { countries, setCountry, currentCountry, formatPrice } = useCurrency();

  const [matchedCountry, setMatchedCountry] = useState<Country | null>(null);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [quoteProduct, setQuoteProduct] = useState<Product | null>(null);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);

  useEffect(() => {
    if (!countryCode) return;
    const clean = countryCode.toUpperCase();
    const found = countries.find(
      (c) =>
        c.code === clean ||
        c.name.toLowerCase().replace(/\s+/g, "-") === countryCode.toLowerCase() ||
        (clean === "USA" && c.code === "US") ||
        (clean === "UK" && c.code === "GB") ||
        (clean === "UAE" && c.code === "AE")
    );

    if (found) {
      setMatchedCountry(found);
      setCountry(found.code);
    }
  }, [countryCode, countries]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success) {
          setRecommendedProducts(data.products.slice(0, 4));
        }
      } catch (e) {
        console.error("Failed to load country products:", e);
      }
    }
    loadProducts();
  }, []);

  if (!matchedCountry) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-28 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#111111]">Regional Profile Loading</h2>
        <Link to="/worldwide-network" className="text-xs font-semibold text-[#1F7A4D] hover:underline">
          Browse Worldwide Network →
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-16 sm:py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-16">
        {/* Country Hero Header */}
        <div className="bg-white rounded-2xl border border-[#EAEAEA] p-8 sm:p-12 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="space-y-5 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF5EF] text-[#1F7A4D] text-xs font-semibold">
                <span>{matchedCountry.flag}</span>
                <span>Certified Medical Supply to {matchedCountry.name}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#111111] tracking-tight leading-tight">
                Medical Equipment Manufacturer & Supplier in {matchedCountry.name}
              </h1>

              <p className="text-sm text-[#555555] leading-relaxed">
                DR.MEDEX supplies hospitals, surgical centers, and physical rehabilitation clinics across {matchedCountry.name}. All equipment is factory configured for {matchedCountry.voltage} with {matchedCountry.plugType} power connections and validated compliance with {matchedCountry.regulatoryStandards}.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/shop-all"
                  className="px-6 py-3 bg-[#111111] hover:bg-black text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Shop Catalog in {matchedCountry.currency} ({matchedCountry.symbol})
                </Link>

                <Link
                  to="/request-quote"
                  className="px-6 py-3 bg-white hover:bg-[#F7F7F7] text-[#111111] border border-[#111111] rounded-lg text-xs font-semibold transition-colors"
                >
                  Request Tender RFQ
                </Link>
              </div>
            </div>

            {/* Regional Specs Card */}
            <div className="bg-[#F7F7F7] rounded-xl border border-[#EAEAEA] p-6 space-y-4 min-w-[300px]">
              <div className="text-xs font-bold text-[#777777] uppercase tracking-wider">
                {matchedCountry.name} Logistics Profile
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#EAEAEA]">
                  <span className="text-[#555555]">Mains Voltage:</span>
                  <span className="font-semibold text-[#111111]">{matchedCountry.voltage}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#EAEAEA]">
                  <span className="text-[#555555]">Regional Plug:</span>
                  <span className="font-semibold text-[#111111]">{matchedCountry.plugType}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#EAEAEA]">
                  <span className="text-[#555555]">Settlement Currency:</span>
                  <span className="font-semibold text-[#111111] font-mono">{matchedCountry.currency} ({matchedCountry.symbol})</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#EAEAEA]">
                  <span className="text-[#555555]">Air Express Transit:</span>
                  <span className="font-semibold text-[#1F7A4D]">{matchedCountry.leadTimeAirDays}</span>
                </div>
                <div className="pt-2 text-xs text-[#777777]">
                  Standards: <strong className="text-[#111111]">{matchedCountry.regulatoryStandards}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Equipment in this Region */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
                Recommended Medical Equipment for {matchedCountry.name}
              </h2>
              <p className="text-xs sm:text-sm text-[#555555] mt-1">Pre-calibrated and certified for immediate regional hospital deployment.</p>
            </div>
            <Link to="/shop-all" className="text-xs font-semibold text-[#111111] hover:text-[#1F7A4D] transition-colors">
              View All Equipment →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {recommendedProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onOpenQuote={(prod) => {
                  setQuoteProduct(prod);
                  setIsQuoteModalOpen(true);
                }}
              />
            ))}
          </div>
        </div>

        {/* Regional Support & Customs Assistance */}
        <div className="bg-[#111111] text-white rounded-2xl p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#2E8B57] uppercase tracking-wider">
              <span>●</span> Direct Global Procurement Desk
            </div>
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
              Hospital Procurement Inquiries in {matchedCountry.name}
            </h3>
            <p className="text-xs sm:text-sm text-[#999999] leading-relaxed">
              Our regional medical desk provides complete commercial proforma invoicing, import duty classification assistance, and biomedical engineer support for installations in {matchedCountry.name}.
            </p>
          </div>

          <Link
            to="/request-quote"
            className="px-8 py-3.5 bg-white text-[#111111] hover:bg-[#F7F7F7] rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
          >
            Contact {matchedCountry.name} Desk
          </Link>
        </div>
      </div>

      <B2BQuoteModal
        product={quoteProduct}
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
      />
    </div>
  );
};
