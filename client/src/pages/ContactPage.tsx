import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  ShieldCheck,
  CheckCircle2,
  Headphones,
  Wrench
} from "lucide-react";
import { InternationalPhoneInput } from "../components/InternationalPhoneInput";

export const ContactPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("Technical Support");
  const [message, setMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-900 text-3xs font-bold uppercase tracking-wider">
            <Headphones size={14} className="text-sky-700" />
            <span>24/7 Bio-Medical Support Desk</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Contact MediCuro Global Support & Sales
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Reach our clinical engineering specialists for equipment installation advice, spare parts procurement, and proforma sales quotes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Contact Details (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Global Operations Hubs
              </h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-sky-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Americas Headquarters</div>
                    <div className="text-slate-500 mt-0.5">
                      MediCuro MedTech Tower, 45 Healthcare Innovation Way, Boston, MA 02115, USA
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-sky-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Middle East & Gulf Hub</div>
                    <div className="text-slate-500 mt-0.5">
                      Building 64, Dubai Healthcare City (DHCC), Dubai, UAE
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-sky-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Asia-Pacific Manufacturing Center</div>
                    <div className="text-slate-500 mt-0.5">
                      Plot 14-B, Electronics & MedTech Park, Bangalore 560100, India
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-sky-700" />
                  <div>
                    <div className="font-bold text-slate-900">International Hotline:</div>
                    <div className="text-slate-600 font-mono">+1 (800) 849-2041 / +91 98110 49200</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-sky-700" />
                  <div>
                    <div className="font-bold text-slate-900">Support & Tender Correspondence:</div>
                    <div className="text-slate-600">support@medicuroglobal.com / sales@medicuroglobal.com</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-sky-700" />
                  <div>
                    <div className="font-bold text-slate-900">Operating Theatre Emergency Hotline:</div>
                    <div className="text-emerald-700 font-semibold">24 Hours / 7 Days a Week Active</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            {isSubmitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Inquiry Transmitted</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Thank you, <strong>{name}</strong>. A biomedical engineering representative will review your request and reply to <strong>{email}</strong> promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Submit Engineering or Sales Inquiry
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. / Engineer Name"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@hospital.org"
                      className="w-full p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone Number (+ Country Code) *</label>
                    <InternationalPhoneInput
                      value={phone}
                      onChange={setPhone}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Inquiry Purpose</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-sky-600 font-semibold text-slate-800"
                    >
                      <option value="Technical Support">Technical / Biomedical Support</option>
                      <option value="New Equipment Order">New Equipment Order Inquiry</option>
                      <option value="Spare Parts & Accessories">Spare Parts & Accessories</option>
                      <option value="International Distributorship">International Distributorship Tender</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Inquiry / Message *</label>
                  <textarea
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your equipment requirements, installation questions, or facility needs..."
                    className="w-full p-3 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-3xs text-slate-400">Response time usually &lt; 4 business hours</span>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-xs"
                  >
                    <Send size={14} />
                    <span>Send Message</span>
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
