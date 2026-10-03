import React, { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  Headphones
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
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#EAEAEA] text-[#111111] text-3xs font-bold uppercase tracking-wider shadow-2xs">
            <Headphones size={14} className="text-[#1F7A4D]" />
            <span>24/7 Bio-Medical Support Desk</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#111111] tracking-tight">
            Contact DR.MEDEX Global Support & Sales
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            Reach our clinical engineering specialists for equipment installation advice, spare parts procurement, and proforma sales quotes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Contact Details (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-8 shadow-2xs space-y-6">
              <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#EAEAEA] pb-3">
                Global Operations Hubs
              </h2>

              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3.5">
                  <MapPin size={18} className="text-[#1F7A4D] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#111111]">Americas Headquarters</div>
                    <div className="text-neutral-500 mt-1 leading-relaxed">
                      DR.MEDEX MedTech Tower, 45 Healthcare Innovation Way, Boston, MA 02115, USA
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <MapPin size={18} className="text-[#1F7A4D] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#111111]">Middle East & Gulf Hub</div>
                    <div className="text-neutral-500 mt-1 leading-relaxed">
                      Building 64, Dubai Healthcare City (DHCC), Dubai, UAE
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <MapPin size={18} className="text-[#1F7A4D] shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-[#111111]">Asia-Pacific Manufacturing Center</div>
                    <div className="text-neutral-500 mt-1 leading-relaxed">
                      Plot 14-B, Electronics & MedTech Park, Bangalore 560100, India
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-[#EAEAEA] space-y-3.5 text-xs">
                <div className="flex items-center gap-3.5">
                  <Phone size={16} className="text-[#111111]" />
                  <div>
                    <div className="font-bold text-[#111111]">International Hotline:</div>
                    <div className="text-neutral-600 font-mono mt-0.5">+1 (800) 849-2041 / +91 98110 49200</div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <Mail size={16} className="text-[#111111]" />
                  <div>
                    <div className="font-bold text-[#111111]">Support & Tender Correspondence:</div>
                    <div className="text-neutral-600 mt-0.5">support@drmedex.com / sales@drmedex.com</div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5">
                  <Clock size={16} className="text-[#111111]" />
                  <div>
                    <div className="font-bold text-[#111111]">Operating Theatre Emergency Hotline:</div>
                    <div className="text-[#145A38] font-semibold mt-0.5">24 Hours / 7 Days a Week Active</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-8 shadow-2xs">
            {isSubmitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-[#EAF5EF] text-[#1F7A4D] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-bold text-[#111111]">Inquiry Transmitted</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Thank you, <strong>{name}</strong>. A biomedical engineering representative will review your request and reply to <strong>{email}</strong> promptly.
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubmitted(false)}
                  className="px-6 py-2.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Send Another Inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-2">
                  Submit Engineering or Sales Inquiry
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. / Engineer Name"
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@hospital.org"
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Phone Number (+ Country Code) *</label>
                    <InternationalPhoneInput
                      value={phone}
                      onChange={setPhone}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Inquiry Purpose</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white focus:outline-none focus:border-[#111111] font-semibold text-[#111111]"
                    >
                      <option value="Technical Support">Technical / Biomedical Support</option>
                      <option value="New Equipment Order">New Equipment Order Inquiry</option>
                      <option value="Spare Parts & Accessories">Spare Parts & Accessories</option>
                      <option value="International Distributorship">International Distributorship Tender</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1.5">Inquiry / Message *</label>
                  <textarea
                    rows={5}
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your equipment requirements, installation questions, or facility needs..."
                    className="w-full p-3 border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                  />
                </div>

                <div className="pt-3 flex items-center justify-between">
                  <span className="text-3xs text-neutral-400">Response time usually &lt; 4 business hours</span>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-[#111111] hover:bg-[#1F7A4D] text-white font-bold rounded-xl text-xs flex items-center gap-2 transition-colors shadow-xs"
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
