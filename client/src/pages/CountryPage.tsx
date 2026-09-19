import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Globe,
  Plane,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Mail,
  ArrowRight,
  Award,
  Zap,
  Clock,
  FileText
} from "lucide-react";
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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Regional Page Loading</h2>
        <Link to="/worldwide-network" className="text-xs font-bold text-sky-700 hover:underline">
          Browse Worldwide Network →
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-10">
        {/* Country Hero Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-900 text-3xs font-extrabold uppercase tracking-wider">
                <span>{matchedCountry.flag}</span>
                <span>Certified Medical Supply to {matchedCountry.name}</span>
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Medical Equipment Manufacturer & Supplier in {matchedCountry.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                MediCuro Global supplies hospitals, surgical centers, and physical rehabilitation clinics across {matchedCountry.name}. All equipment is factory configured for {matchedCountry.voltage} with {matchedCountry.plugType} power connections and validated compliance with {matchedCountry.regulatoryStandards}.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/shop-all"
                  className="px-6 py-3 bg-slate-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Shop Catalog in {matchedCountry.currency} ({matchedCountry.symbol})
                </Link>

                <Link
                  to="/request-quote"
                  className="px-6 py-3 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Request Tender RFQ
                </Link>
              </div>
            </div>

            {/* Regional Specs Card */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3 min-w-[280px]">
              <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">
                {matchedCountry.name} Logistics Profile
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mains Voltage:</span>
                  <span className="font-bold text-slate-900">{matchedCountry.voltage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Regional Plug:</span>
                  <span className="font-bold text-slate-900">{matchedCountry.plugType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Settlement Currency:</span>
                  <span className="font-bold text-sky-800 font-mono">{matchedCountry.currency} ({matchedCountry.symbol})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Air Express Transit:</span>
                  <span className="font-bold text-emerald-700">{matchedCountry.leadTimeAirDays}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 text-3xs text-slate-500">
                  Standards: <strong>{matchedCountry.regulatoryStandards}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Equipment in this Region */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Recommended Medical Equipment for {matchedCountry.name}
              </h2>
              <p className="text-xs text-slate-500">Pre-calibrated and certified for immediate regional hospital deployment.</p>
            </div>
            <Link to="/shop-all" className="text-xs font-bold text-sky-700 hover:underline">
              View All Equipment →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div className="bg-sky-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl text-center md:text-left">
            <h3 className="text-xl sm:text-2xl font-black">
              Hospital Procurement Inquiries in {matchedCountry.name}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Our regional medical desk provides complete commercial proforma invoicing, import duty classification assistance, and biomedical engineer support for installations in {matchedCountry.name}.
            </p>
          </div>

          <Link
            to="/request-quote"
            className="px-8 py-3.5 bg-white text-slate-950 hover:bg-sky-50 rounded-xl text-xs font-extrabold shadow-md transition-colors whitespace-nowrap"
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
