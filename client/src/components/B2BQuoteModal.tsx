import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Send, Building, ShieldCheck } from "lucide-react";
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
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-6">
        <div onClick={onClose} className="fixed inset-0 bg-[#000000]/60 backdrop-blur-xs transition-opacity" />

        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-xl animate-in zoom-in-95 duration-200 border border-[#EAEAEA]">
          <div className="px-6 py-5 bg-[#111111] text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building size={20} className="text-white" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Request B2B / Institutional Quotation
                </h3>
                <p className="text-3xs text-neutral-400 mt-0.5">Hospital Procurement, Tenders & Distribution RFQs</p>
              </div>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {submittedQuote ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-[#EAF5EF] text-[#1F7A4D] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h4 className="text-lg font-bold text-[#111111]">RFQ Received Successfully</h4>
                <div className="p-4 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl max-w-sm mx-auto">
                  <div className="text-3xs text-neutral-500 uppercase font-bold tracking-wider">
                    Official Reference Identifier
                  </div>
                  <div className="text-xl font-mono font-black text-[#111111] mt-1">
                    {submittedQuote.quoteNumber}
                  </div>
                </div>
                <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
                  Our international institutional sales division has received your requirements. A formal proforma quote with export freight terms (FOB/CIF/DDP) and regulatory compliance certificates will be transmitted to <strong>{email}</strong> within 12 business hours.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-6 py-3 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Done & Return to Catalog
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {product && (
                  <div className="p-3 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl flex items-center gap-3">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-12 h-12 object-contain rounded-lg border border-[#EAEAEA] bg-white shrink-0 p-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#111111] truncate">{product.title}</div>
                      <div className="text-2xs text-neutral-500 font-mono">SKU: {product.sku}</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-2xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. / Administrator Name"
                      className="w-full px-3.5 py-2 text-xs border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Hospital / Institution / Entity *
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Apollo Hospitals / MedSupply Ltd"
                      className="w-full px-3.5 py-2 text-xs border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Work Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="procurement@hospital.org"
                      className="w-full px-3.5 py-2 text-xs border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
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
                    <label className="block text-2xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Destination Country *
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] bg-white text-[#111111]"
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
                      <label className="block text-2xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full px-3.5 py-2 text-xs border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] font-bold text-[#111111]"
                      />
                    </div>

                    <div>
                      <label className="block text-2xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                        Timeline
                      </label>
                      <select
                        value={targetTimeline}
                        onChange={(e) => setTargetTimeline(e.target.value)}
                        className="w-full px-2 py-2 text-2xs border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] bg-white text-[#111111]"
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
                  <label className="block text-2xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Specific Clinical or Customization Requirements
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Specify ceiling height, voltage preferences, optional accessories, CIF port name or distributor partnership inquiries..."
                    className="w-full px-3.5 py-2 text-xs border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                  />
                </div>

                {errorMessage && (
                  <p className="text-xs text-rose-600 font-semibold">{errorMessage}</p>
                )}

                <div className="pt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-3xs text-neutral-500">
                    <ShieldCheck size={14} className="text-[#1F7A4D]" />
                    <span>Protected by Non-Disclosure Protocol</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="py-2.5 px-6 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
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
