import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Globe,
  Award,
  Clock,
  ArrowRight,
  CheckCircle2,
  Lock
} from "lucide-react";
import { Logo } from "./Logo";

export const Footer: React.FC = () => {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail) {
      setIsSubscribed(true);
      setNewsletterEmail("");
    }
  };

  return (
    <footer className="bg-[#111111] text-neutral-300 border-t border-[#222222]">
      {/* Top Quality & Global Trust Banner */}
      <div className="border-b border-[#222222] bg-[#0a0a0a] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-white shrink-0">
              <Globe size={20} className="text-[#1F7A4D]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Worldwide Air Delivery</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">Export-compliant reinforced crating shipped to 50+ countries.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-white shrink-0">
              <ShieldCheck size={20} className="text-[#1F7A4D]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Certified Medical Quality</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">ISO 13485:2016 verified manufacturing with 9-stage testing.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-white shrink-0">
              <Award size={20} className="text-[#1F7A4D]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">5-Year OEM Warranty</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">Direct manufacturer warranty and genuine biomedical parts availability.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-[#1c1c1c] border border-[#2a2a2a] flex items-center justify-center text-white shrink-0">
              <Clock size={20} className="text-[#1F7A4D]" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">24/7 Bio-Medical Hotline</h4>
              <p className="text-xs text-neutral-400 mt-1 leading-relaxed">Direct technical engineering support for hospital operations.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Column 1: Company Profile */}
          <div className="lg:col-span-2 space-y-5">
            <Logo variant="dark-bg" />

            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm">
              DR.MEDEX is a certified international healthcare technology manufacturer and distributor. We engineer precision physiotherapy systems, high-frequency electrosurgical generators, cryogenic instruments, shadowless operating theatre lights, and surgical tables for hospitals and clinical distributors worldwide.
            </p>

            <div className="space-y-2.5 text-xs text-neutral-300 pt-2">
              <div className="flex items-center gap-3">
                <MapPin size={15} className="text-[#1F7A4D] shrink-0" />
                <span>Global HQ: 45 Healthcare Innovation Way, Boston, MA 02115, USA</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={15} className="text-[#1F7A4D] shrink-0" />
                <span>Hotline: +1 (800) 849-2041 / +91 98110 49200</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={15} className="text-[#1F7A4D] shrink-0" />
                <span>Sales: sales@drmedex.com</span>
              </div>
            </div>
          </div>

          {/* Column 2: Equipment Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-5 border-l-2 border-[#1F7A4D] pl-2.5">
              Equipment Categories
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              <li>
                <Link to="/category/electrosurgical-units" className="hover:text-white transition-colors">
                  Electrosurgical Units
                </Link>
              </li>
              <li>
                <Link to="/category/cryo-surgical" className="hover:text-white transition-colors">
                  Cryosurgical Equipment
                </Link>
              </li>
              <li>
                <Link to="/category/ot-lights" className="hover:text-white transition-colors">
                  OT / Surgical Lights
                </Link>
              </li>
              <li>
                <Link to="/category/examination-ot-tables" className="hover:text-white transition-colors">
                  Examination & OT Tables
                </Link>
              </li>
              <li>
                <Link to="/category/obstetrics-and-gynaecology" className="hover:text-white transition-colors">
                  Obstetrics & Gynaecology
                </Link>
              </li>
              <li>
                <Link to="/category/medical-equipment" className="hover:text-white transition-colors">
                  General Medical Equipment
                </Link>
              </li>
              <li className="pt-1">
                <Link to="/shop-all" className="text-neutral-200 hover:text-[#1F7A4D] font-semibold transition-colors flex items-center gap-1">
                  <span>View Full Catalog</span>
                  <ArrowRight size={13} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Worldwide Network */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-5 border-l-2 border-[#1F7A4D] pl-2.5">
              Worldwide Network
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400">
              <li>
                <Link to="/country/usa" className="hover:text-white transition-colors flex items-center gap-2">
                  <span>🇺🇸</span> United States Logistics
                </Link>
              </li>
              <li>
                <Link to="/country/uk" className="hover:text-white transition-colors flex items-center gap-2">
                  <span>🇬🇧</span> United Kingdom & Europe
                </Link>
              </li>
              <li>
                <Link to="/country/canada" className="hover:text-white transition-colors flex items-center gap-2">
                  <span>🇨🇦</span> Canada Distribution
                </Link>
              </li>
              <li>
                <Link to="/country/india" className="hover:text-white transition-colors flex items-center gap-2">
                  <span>🇮🇳</span> India & South Asia Hub
                </Link>
              </li>
              <li>
                <Link to="/country/uae" className="hover:text-white transition-colors flex items-center gap-2">
                  <span>🇦🇪</span> Middle East Logistics
                </Link>
              </li>
              <li>
                <Link to="/country/south-africa" className="hover:text-white transition-colors flex items-center gap-2">
                  <span>🇿🇦</span> South Africa Network
                </Link>
              </li>
              <li className="pt-1">
                <Link to="/worldwide-network" className="text-neutral-200 hover:text-[#1F7A4D] font-semibold transition-colors flex items-center gap-1">
                  <span>Global Hub Map</span>
                  <ArrowRight size={13} />
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Institutional / B2B & Newsletter */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-5 border-l-2 border-[#1F7A4D] pl-2.5">
              Hospital Procurement
            </h4>
            <ul className="space-y-2.5 text-xs text-neutral-400 mb-6">
              <li>
                <Link to="/request-quote" className="text-white font-semibold hover:text-[#1F7A4D] transition-colors">
                  Request Institutional RFQ
                </Link>
              </li>
              <li>
                <Link to="/track-order" className="hover:text-white transition-colors">
                  Track Air Freight Shipment
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  OEM Capabilities & 9-Stage QC
                </Link>
              </li>
              <li>
                <Link to="/blog" className="hover:text-white transition-colors">
                  Clinical & Equipment Guides
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Bio-Medical Technical Support
                </Link>
              </li>
            </ul>

            {/* Newsletter */}
            <div>
              <span className="text-3xs font-bold text-neutral-300 uppercase tracking-wider block mb-2">
                International MedTech Bulletin
              </span>
              {isSubscribed ? (
                <div className="flex items-center gap-2 text-xs text-[#1F7A4D] font-medium bg-[#1F7A4D]/10 p-2.5 rounded-lg border border-[#1F7A4D]/30">
                  <CheckCircle2 size={16} /> Thank you for subscribing.
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Practitioner / Hospital Email"
                    required
                    className="w-full px-3.5 py-2 text-xs bg-[#1c1c1c] border border-[#2e2e2e] rounded-l-lg text-white placeholder-neutral-500 focus:outline-none focus:border-[#1F7A4D]"
                  />
                  <button
                    type="submit"
                    className="px-4 bg-[#1F7A4D] hover:bg-[#145A38] text-white rounded-r-lg text-xs font-semibold flex items-center justify-center transition-colors"
                  >
                    <ArrowRight size={14} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Legal & Policy Navigation */}
        <div className="mt-14 pt-8 border-t border-[#222222] flex flex-wrap items-center justify-between gap-5 text-xs text-neutral-400">
          <div className="flex flex-wrap items-center gap-5">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span className="text-neutral-700">•</span>
            <Link to="/terms-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link>
            <span className="text-neutral-700">•</span>
            <Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping & Export Policy</Link>
            <span className="text-neutral-700">•</span>
            <Link to="/warranty-policy" className="hover:text-white transition-colors">Warranty & Return Policy</Link>
            <span className="text-neutral-700">•</span>
            <Link to="/payment-policy" className="hover:text-white transition-colors">Payment & Wire Terms</Link>
            <span className="text-neutral-700">•</span>
            <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link>
            <span className="text-neutral-700">•</span>
            <Link to="/account/signin?redirect=/admin" className="hover:text-neutral-300 transition-colors text-neutral-500">Staff Portal</Link>
          </div>

          <div className="flex items-center gap-2 text-2xs text-neutral-400">
            <Lock size={13} className="text-[#1F7A4D]" />
            <span>256-Bit SSL Encrypted Healthcare Purchasing</span>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="mt-6 pt-5 border-t border-[#1a1a1a] text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3 text-3xs text-neutral-500">
          <p>
            © 1998–2026 DR.MEDEX Global Systems Ltd. All Rights Reserved. Manufactured in compliance with ISO 13485:2016 quality management standards.
          </p>
          <p className="italic">
            Medical equipment is strictly intended for licensed healthcare professionals, clinics, and tertiary hospitals.
          </p>
        </div>
      </div>
    </footer>
  );
};
