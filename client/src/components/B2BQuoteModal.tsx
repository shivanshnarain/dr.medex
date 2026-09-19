import React, { useState, useEffect } from "react";
import { X, CheckCircle2, FileText, Send, Building, ShieldCheck } from "lucide-react";
import { Product } from "../types";
import { useCurrency } from "../context/CurrencyContext";
import { InternationalPhoneInput } from "./InternationalPhoneInput";

interface B2BQuoteModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const B2BQuoteModal: React.FC<B2BQuoteModalProps> = ({ product, isOpen, onClose }) => {
  const { currentCountry, countries } = useCurrency();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(currentCountry.name);
  const [quantity, setQuantity] = useState(1);
  const [targetTimeline, setTargetTimeline] = useState("Within 30 Days");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState<{ quoteNumber: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (currentCountry) {
      setCountry(currentCountry.name);
    }
  }, [currentCountry]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        fullName,
        companyName,
        email,
        phone,
        country,
        productName: product ? product.title : "Multi-product Medical Procurement",
        sku: product ? product.sku : "GENERAL-RFQ",
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
      } else {
        setErrorMessage(data.message || "Failed to submit quote request.");
      }
    } catch (err) {
      setErrorMessage("Network error submitting quote. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedQuote(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div onClick={onClose} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl animate-in zoom-in-95 duration-200">
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building size={20} className="text-sky-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Request B2B / Institutional Quotation
                </h3>
                <p className="text-3xs text-slate-400">Hospital Procurement, Tenders & Distribution RFQs</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {submittedQuote ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-lg font-bold text-slate-900">RFQ Received Successfully</h4>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl max-w-sm mx-auto">
                  <div className="text-3xs text-slate-400 uppercase font-bold tracking-wider">
                    Official Reference Identifier
                  </div>
                  <div className="text-lg font-mono font-black text-sky-800 mt-0.5">
                    {submittedQuote.quoteNumber}
                  </div>
                </div>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Our international institutional sales division has received your requirements. A formal proforma quote with export freight terms (FOB/CIF/DDP) and regulatory compliance certificates will be transmitted to <strong>{email}</strong> within 12 business hours.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-2.5 bg-slate-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Done & Return to Catalog
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {product && (
                  <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl flex items-center gap-3">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-12 h-12 object-cover rounded-lg border border-sky-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 truncate">{product.title}</div>
                      <div className="text-2xs text-slate-500 font-mono">SKU: {product.sku}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. / Administrator Name"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Hospital / Institution / Entity *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apollo Hospitals / MedSupply Ltd"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Work Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="procurement@hospital.org"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Phone Number (+ Country Code) *
                    </label>
                    <InternationalPhoneInput
                      value={phone}
                      onChange={setPhone}
                      required
                      placeholder="Contact number"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Destination Country *
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 bg-white"
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 font-bold text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Timeline
                      </label>
                      <select
                        value={targetTimeline}
                        onChange={(e) => setTargetTimeline(e.target.value)}
                        className="w-full px-2 py-2 text-2xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600 bg-white"
                      >
                        <option value="Immediate">Immediate</option>
                        <option value="Within 30 Days">30 Days</option>
                        <option value="Q3/Q4 Project">Q3/Q4</option>
                        <option value="Government Tender">Tender</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Specific Clinical or Customization Requirements
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Specify ceiling height, voltage preferences, optional accessories, CIF port name or distributor partnership inquiries..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-sky-600"
                  />
                </div>

                {errorMessage && (
                  <p className="text-xs text-rose-600 font-semibold">{errorMessage}</p>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-3xs text-slate-400">
                    <ShieldCheck size={14} className="text-sky-600" />
                    <span>Protected by Non-Disclosure Protocol</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-5 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Send size={14} />
                    <span>{isSubmitting ? "Submitting RFQ..." : "Submit Quote Request"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
