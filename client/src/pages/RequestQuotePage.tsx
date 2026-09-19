import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Building, ShieldCheck, CheckCircle2, FileText, Send, Phone, Mail, Award, Clock } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { InternationalPhoneInput } from "../components/InternationalPhoneInput";
import { Product } from "../types";

export const RequestQuotePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const preselectedSku = searchParams.get("sku") || "";

  const { currentCountry, countries } = useCurrency();
  const [products, setProducts] = useState<Product[]>([]);

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(currentCountry.name);
  const [selectedProduct, setSelectedProduct] = useState(preselectedSku);
  const [quantity, setQuantity] = useState(2);
  const [targetTimeline, setTargetTimeline] = useState("Within 30 Days");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState<{ quoteNumber: string } | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success) {
          setProducts(data.products);
          if (!preselectedSku && data.products.length > 0) {
            setSelectedProduct(data.products[0].title);
          }
        }
      } catch (e) {
        console.error("Failed to load products for RFQ:", e);
      }
    }
    loadProducts();
  }, [preselectedSku]);

  useEffect(() => {
    if (currentCountry) setCountry(currentCountry.name);
  }, [currentCountry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        fullName,
        companyName,
        email,
        phone,
        country,
        productName: selectedProduct,
        quantity: Number(quantity),
        targetTimeline,
        message
      };

      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.quote) {
        setSubmittedQuote(data.quote);
        window.scrollTo(0, 0);
      }
    } catch (e) {
      console.error("Error submitting quote:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100/80 border border-sky-200 text-sky-900 text-3xs font-bold uppercase tracking-wider">
            <Building size={14} className="text-sky-700" />
            <span>Institutional B2B Procurement Portal</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Request Formal Institutional Quotation
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Direct OEM factory pricing, comprehensive tender compliance documentation, CIF/FOB export air-freight schedules, and multi-unit discounts for hospitals and global distributors.
          </p>
        </div>

        {/* Form or Success Box */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-xs">
          {submittedQuote ? (
            <div className="text-center py-10 space-y-5">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={44} />
              </div>
              <h2 className="text-2xl font-black text-slate-900">RFQ Received & Logged</h2>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-sm mx-auto">
                <div className="text-3xs text-slate-400 font-bold uppercase tracking-wider">Official RFQ Number</div>
                <div className="text-2xl font-mono font-black text-sky-900 mt-1">{submittedQuote.quoteNumber}</div>
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your clinical equipment request has been routed to our Senior Biomedical Procurement Manager. A formal proforma quotation with CE/ISO certificates and delivery schedule will be dispatched to <strong>{email}</strong> within 12 business hours.
              </p>
              <div className="pt-4 flex justify-center gap-3">
                <Link
                  to="/account?tab=quotes"
                  className="px-6 py-3 bg-slate-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-colors"
                >
                  View Quote in Account
                </Link>
                <Link
                  to="/shop-all"
                  className="px-6 py-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                >
                  Back to Catalog
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-2xs mb-1">
                    Practitioner / Contact Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Sarah Jenkins, Chief of Surgery"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-2xs mb-1">
                    Hospital / Institution / Entity *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. St. Jude Surgical Hospital"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-2xs mb-1">
                    Official Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="procurement@hospital.org"
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-2xs mb-1">
                    International Phone (+ Country Code) *
                  </label>
                  <InternationalPhoneInput
                    value={phone}
                    onChange={setPhone}
                    required
                    placeholder="Contact number"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-2xs mb-1">
                    Destination Country *
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold text-slate-800"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.name}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-2xs mb-1">
                    Target Medical Equipment Model *
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold text-slate-800"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.title}>
                        {p.title} (SKU: {p.sku})
                      </option>
                    ))}
                    <option value="Custom Complete Operating Room Package">
                      Custom Multi-Equipment Operating Suite Package
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-2xs mb-1">
                    Desired Units Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-2xs mb-1">
                    Procurement Project Timeline
                  </label>
                  <select
                    value={targetTimeline}
                    onChange={(e) => setTargetTimeline(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-semibold text-slate-800"
                  >
                    <option value="Immediate Installation (< 14 Days)">Immediate Installation (&lt; 14 Days)</option>
                    <option value="Within 30 Days">Within 30 Days</option>
                    <option value="Q3/Q4 Project Phase">Q3/Q4 Project Phase</option>
                    <option value="Formal Government Tender">Formal Government / Institutional Tender</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-2xs mb-1">
                  Customization Specifications & Technical Details
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detail ceiling height for OT lights, voltage/frequency requirements (e.g. 110V 60Hz or 230V 50Hz), included accessories, or CIF destination airport..."
                  className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-2xs text-slate-400">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Confidential hospital RFP processing under NDA protocols</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50"
                >
                  <Send size={15} />
                  <span>{isSubmitting ? "Transmitting RFQ..." : "Submit Formal RFQ"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
