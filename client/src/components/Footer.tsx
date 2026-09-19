import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
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
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      {/* Top Quality & Global Trust Banner */}
      <div className="border-b border-slate-800 bg-slate-950/60 py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0">
              <Globe size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Worldwide Air Delivery</h4>
              <p className="text-xs text-slate-400 mt-1">Export-compliant reinforced crating shipped to 50+ countries.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Certified Medical Quality</h4>
              <p className="text-xs text-slate-400 mt-1">ISO 13485:2016 verified manufacturing with 9-stage testing.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0">
              <Award size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">5-Year OEM Warranty</h4>
              <p className="text-xs text-slate-400 mt-1">Direct manufacturer warranty and genuine biomedical parts availability.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">24/7 Bio-Medical Hotline</h4>
              <p className="text-xs text-slate-400 mt-1">Direct technical engineering support for hospital operations.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Column 1: Company Profile */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-700 flex items-center justify-center text-white shadow-md">
                <Activity size={20} className="text-sky-100" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-white">
                  MEDICURO <span className="text-sky-400 font-semibold">GLOBAL</span>
                </span>
                <span className="text-3xs font-medium uppercase tracking-widest text-slate-400 -mt-1">
                  International Medical Equipment Manufacturer
                </span>
              </div>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              MediCuro Global is a certified international healthcare technology manufacturer and distributor. We engineer precision physiotherapy systems, high-frequency electrosurgical generators, cryogenic instruments, shadowless operating theatre lights, and surgical tables for hospitals and clinical distributors worldwide.
            </p>

            <div className="space-y-2 text-xs text-slate-300 pt-2">
              <div className="flex items-center gap-2.5">
                <MapPin size={15} className="text-sky-400 shrink-0" />
                <span>Global HQ: 45 Healthcare Innovation Way, Boston, MA 02115, USA</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="text-sky-400 shrink-0" />
                <span>Hotline: +1 (800) 849-2041 / +91 98110 49200</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-sky-400 shrink-0" />
                <span>Sales: sales@medicuroglobal.com</span>
              </div>
            </div>
          </div>

          {/* Column 2: Equipment Categories */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-sky-500 pl-2">
              Equipment Categories
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/shop-all?category=physiotherapy" className="hover:text-white transition-colors">
                  Physiotherapy Machines
                </Link>
              </li>
              <li>
                <Link to="/shop-all?category=electrosurgical" className="hover:text-white transition-colors">
                  Electrosurgical Units
                </Link>
              </li>
              <li>
                <Link to="/shop-all?category=cryosurgery" className="hover:text-white transition-colors">
                  Cryosurgical Equipment
                </Link>
              </li>
              <li>
                <Link to="/shop-all?category=ot-lights" className="hover:text-white transition-colors">
                  OT / Surgical Lights
                </Link>
              </li>
              <li>
                <Link to="/shop-all?category=tables" className="hover:text-white transition-colors">
                  Examination & OT Tables
                </Link>
              </li>
              <li>
                <Link to="/shop-all?category=ob-gyn" className="hover:text-white transition-colors">
                  Obstetrics & Gynaecology
                </Link>
              </li>
              <li>
                <Link to="/shop-all" className="hover:text-sky-400 font-semibold transition-colors">
                  View Full Catalog →
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Worldwide Network */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-sky-500 pl-2">
              Worldwide Network
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link to="/country/usa" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>🇺🇸</span> United States Logistics
                </Link>
              </li>
              <li>
                <Link to="/country/uk" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>🇬🇧</span> United Kingdom & Europe
                </Link>
              </li>
              <li>
                <Link to="/country/canada" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>🇨🇦</span> Canada Distribution
                </Link>
              </li>
              <li>
                <Link to="/country/india" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>🇮🇳</span> India & South Asia Hub
                </Link>
              </li>
              <li>
                <Link to="/country/uae" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>🇦🇪</span> Middle East Logistics
                </Link>
              </li>
              <li>
                <Link to="/country/south-africa" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <span>🇿🇦</span> South Africa Network
                </Link>
              </li>
              <li>
                <Link to="/worldwide-network" className="hover:text-sky-400 font-semibold transition-colors">
                  Global Hub Map →
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Institutional / B2B & Newsletter */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-l-2 border-sky-500 pl-2">
              Hospital Procurement
            </h4>
            <ul className="space-y-2 text-xs text-slate-400 mb-5">
              <li>
                <Link to="/request-quote" className="text-sky-400 font-bold hover:underline">
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
              <span className="text-3xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                International MedTech Bulletin
              </span>
              {isSubscribed ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 size={15} /> Thank you for subscribing.
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="flex">
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="Practitioner / Hospital Email"
                    required
                    className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-l-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-r-lg text-xs font-semibold flex items-center justify-center transition-colors"
                  >
                    <ArrowRight size={14} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Legal & Policy Navigation */}
        <div className="mt-10 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link>
            <span>•</span>
            <Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping & Export Policy</Link>
            <span>•</span>
            <Link to="/warranty-policy" className="hover:text-white transition-colors">Warranty & Return Policy</Link>
            <span>•</span>
            <Link to="/payment-policy" className="hover:text-white transition-colors">Payment & Wire Terms</Link>
            <span>•</span>
            <Link to="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</Link>
          </div>

          <div className="flex items-center gap-2 text-2xs text-slate-400">
            <Lock size={13} className="text-emerald-400" />
            <span>256-Bit SSL Encrypted Healthcare Purchasing</span>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="mt-6 pt-4 border-t border-slate-800/60 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-2 text-3xs text-slate-500">
          <p>
            © 1998–2026 MediCuro Global Systems Ltd. All Rights Reserved. Manufactured in compliance with ISO 13485:2016 quality management standards.
          </p>
          <p className="italic">
            Medical equipment is strictly intended for licensed healthcare professionals, clinics, and tertiary hospitals.
          </p>
        </div>
      </div>
    </footer>
  );
};
