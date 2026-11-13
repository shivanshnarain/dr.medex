import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Globe,
  Award,
  Wrench,
  ArrowRight
} from "lucide-react";

export const ServiceBenefitsBanner: React.FC = () => (
  <section
    aria-label="DR.MEDEX Global Service Benefits"
    className="bg-[#7AA05A] py-8 sm:py-10 px-4 sm:px-6 lg:px-8"
  >
    {/* Grid with subtle white dividers matching the feature cards */}
    <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-white/30">
      {/* Benefit 1 */}
      <div className="flex items-start gap-4 py-4 md:py-1 px-3 sm:px-4 lg:px-5">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
          <Globe size={24} className="text-[#F4B400]" style={{ color: "#F4B400" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-[15px] font-bold text-white uppercase tracking-wider leading-snug">
            Worldwide Air Delivery
          </h4>
          <p className="text-xs text-white/95 mt-1.5 leading-relaxed">
            Secure, export-ready packaging and international shipping support for medical equipment orders worldwide.
          </p>
        </div>
      </div>

      {/* Benefit 2 */}
      <div className="flex items-start gap-4 py-4 md:py-1 px-3 sm:px-4 lg:px-5">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
          <ShieldCheck size={24} className="text-[#F4B400]" style={{ color: "#F4B400" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-[15px] font-bold text-white uppercase tracking-wider leading-snug">
            Certified Medical Quality
          </h4>
          <p className="text-xs text-white/95 mt-1.5 leading-relaxed">
            Quality-focused medical equipment manufactured and supplied with attention to applicable medical-device standards.
          </p>
        </div>
      </div>

      {/* Benefit 3 */}
      <div className="flex items-start gap-4 py-4 md:py-1 px-3 sm:px-4 lg:px-5">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
          <Award size={24} className="text-[#F4B400]" style={{ color: "#F4B400" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-[15px] font-bold text-white uppercase tracking-wider leading-snug">
            5-Year OEM Warranty
          </h4>
          <p className="text-xs text-white/95 mt-1.5 leading-relaxed">
            Up to 5-year OEM warranty on eligible products, subject to the manufacturer’s warranty terms.
          </p>
        </div>
      </div>

      {/* Benefit 4 */}
      <div className="flex items-start gap-4 py-4 md:py-1 px-3 sm:px-4 lg:px-5">
        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
          <Wrench size={24} className="text-[#F4B400]" style={{ color: "#F4B400" }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-[15px] font-bold text-white uppercase tracking-wider leading-snug">
            Engineering &amp; Technical Support
          </h4>
          <p className="text-xs text-white/95 mt-1.5 leading-relaxed">
            Technical assistance, equipment guidance and after-sales support for hospitals, clinics and healthcare professionals.
          </p>
        </div>
      </div>
    </div>
  </section>
);

export const Footer: React.FC = () => {
  const { pathname } = useLocation();
  const isHomeRoute = pathname === "/";

  return (
    <footer className="bg-white text-neutral-800 border-t border-neutral-200">
      {/* Top Quality & Global Trust Banner — rendered on non-home routes; HomePage places it above blogs & footer */}
      {!isHomeRoute && <ServiceBenefitsBanner />}

      {/* Main Two-Column Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* LEFT COLUMN */}
          <div className="space-y-8">
            {/* 1. DR.MEDEX Brand Name (Text Only, No Medical Cross Icon) */}
            <div>
              <Link to="/" className="inline-flex flex-col leading-none select-none">
                <div className="flex items-baseline tracking-tight font-black text-2xl sm:text-3xl">
                  <span className="text-[#2D5A4A]">DR.</span>
                  <span className="text-[#7AA05A] tracking-wide ml-0.5">MEDEX</span>
                </div>
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase mt-1 text-neutral-500 whitespace-nowrap">
                  ADVANCING HEALTHCARE GLOBALLY
                </span>
              </Link>
            </div>

            {/* 2. Company Description */}
            <p className="text-xs text-neutral-600 leading-relaxed max-w-xl">
              DR.MEDEX supplies medical equipment and healthcare technology designed to support hospitals, clinics and healthcare professionals. Our product range covers electrosurgical systems, surgical equipment, operating theatre solutions, physiotherapy devices and other essential clinical equipment. We focus on dependable products, practical technical guidance and responsive customer support to help healthcare facilities make informed equipment decisions.
            </p>

            {/* 3. Contact Details */}
            <div className="space-y-2.5 text-xs text-neutral-700">
              <div className="flex items-center gap-3">
                <MapPin size={15} className="text-[#2D5A4A] shrink-0" />
                <span>Global HQ: 45 Healthcare Innovation Way, Boston, MA 02115, USA</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={15} className="text-[#2D5A4A] shrink-0" />
                <span>
                  Hotline:{" "}
                  <a href="tel:+18008492041" className="hover:text-[#2D5A4A] transition-colors">+1 (800) 849-2041</a>
                  {" / "}
                  <a href="tel:+919811049200" className="hover:text-[#2D5A4A] transition-colors">+91 98110 49200</a>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={15} className="text-[#2D5A4A] shrink-0" />
                <span>
                  Sales:{" "}
                  <a href="mailto:sales@drmedex.com" className="hover:text-[#2D5A4A] transition-colors">sales@drmedex.com</a>
                </span>
              </div>
            </div>

            {/* 4. EQUIPMENT Section (renamed from Equipment Categories) */}
            <div>
              <h4 className="text-xs font-bold text-[#2D5A4A] uppercase tracking-wider mb-4 border-l-2 border-[#2D5A4A] pl-2.5">
                EQUIPMENT
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-700">
                <Link to="/category/electrosurgical-units" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Electrosurgical Units
                </Link>
                <Link to="/category/cryo-surgical" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Cryosurgical Equipment
                </Link>
                <Link to="/category/electrosurgical-units" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Surgical Instruments &amp; Equipment
                </Link>
                <Link to="/category/physiotherapy" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Physiotherapy Equipment
                </Link>
                <Link to="/category/ot-lights" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  OT / Surgical Lights
                </Link>
                <Link to="/category/examination-ot-tables" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Operating Theatre Tables
                </Link>
                <Link to="/category/examination-ot-tables" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Examination Tables
                </Link>
                <Link to="/category/obstetrics-and-gynaecology" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Obstetrics &amp; Gynaecology Equipment
                </Link>
                <Link to="/category/medical-equipment" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  General Medical Equipment
                </Link>
                <Link to="/shop-all" className="text-[#2D5A4A] hover:text-[#7AA05A] font-bold transition-colors flex items-center gap-1 py-0.5">
                  <span>View Full Catalog</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* 5. WORLDWIDE NETWORK Section */}
            <div>
              <h4 className="text-xs font-bold text-[#2D5A4A] uppercase tracking-wider mb-4 border-l-2 border-[#2D5A4A] pl-2.5">
                WORLDWIDE NETWORK
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-700">
                <Link to="/country/usa" className="hover:text-[#2D5A4A] transition-colors flex items-center gap-2 py-0.5">
                  <span>🇺🇸</span> United States Logistics
                </Link>
                <Link to="/country/uk" className="hover:text-[#2D5A4A] transition-colors flex items-center gap-2 py-0.5">
                  <span>🇬🇧</span> United Kingdom &amp; Europe
                </Link>
                <Link to="/country/canada" className="hover:text-[#2D5A4A] transition-colors flex items-center gap-2 py-0.5">
                  <span>🇨🇦</span> Canada Distribution
                </Link>
                <Link to="/country/india" className="hover:text-[#2D5A4A] transition-colors flex items-center gap-2 py-0.5">
                  <span>🇮🇳</span> India &amp; South Asia Hub
                </Link>
                <Link to="/country/uae" className="hover:text-[#2D5A4A] transition-colors flex items-center gap-2 py-0.5">
                  <span>🇦🇪</span> Middle East Logistics
                </Link>
                <Link to="/country/south-africa" className="hover:text-[#2D5A4A] transition-colors flex items-center gap-2 py-0.5">
                  <span>🇿🇦</span> South Africa Network
                </Link>
                <Link to="/worldwide-network" className="text-[#2D5A4A] hover:text-[#7AA05A] font-bold transition-colors flex items-center gap-1 py-0.5 sm:col-span-2">
                  <span>Global Hub Map</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8 lg:pl-6">
            {/* 1. HOSPITAL PROCUREMENT */}
            <div>
              <h4 className="text-xs font-bold text-[#2D5A4A] uppercase tracking-wider mb-4 border-l-2 border-[#2D5A4A] pl-2.5">
                HOSPITAL PROCUREMENT
              </h4>
              <ul className="space-y-2.5 text-xs text-neutral-700">
                <li>
                  <Link to="/request-quote" className="text-[#2D5A4A] font-bold hover:text-[#7AA05A] transition-colors">
                    Request Institutional RFQ
                  </Link>
                </li>
                <li>
                  <Link to="/track-order" className="hover:text-[#2D5A4A] transition-colors">
                    Track Air Freight Shipment
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-[#2D5A4A] transition-colors">
                    OEM Capabilities &amp; Quality Control
                  </Link>
                </li>
                <li>
                  <Link to="/blog" className="hover:text-[#2D5A4A] transition-colors">
                    Clinical &amp; Equipment Guides
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#2D5A4A] transition-colors">
                    Bio-Medical Technical Support
                  </Link>
                </li>
              </ul>
            </div>

            {/* 2. Legal, Policy & Compliance Links */}
            <div className="pt-4 border-t border-neutral-200">
              <h4 className="text-xs font-bold text-[#2D5A4A] uppercase tracking-wider mb-4 border-l-2 border-[#2D5A4A] pl-2.5">
                POLICIES &amp; COMPLIANCE
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-600">
                <Link to="/privacy-policy" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Privacy Policy
                </Link>
                <Link to="/terms-conditions" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Terms &amp; Conditions
                </Link>
                <Link to="/shipping-policy" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Shipping &amp; Export Policy
                </Link>
                <Link to="/warranty-policy" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Warranty &amp; Return Policy
                </Link>
                <Link to="/payment-policy" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Payment &amp; Wire Terms
                </Link>
                <Link to="/cookie-policy" className="hover:text-[#2D5A4A] transition-colors py-0.5">
                  Cookie Policy
                </Link>
                <Link to="/account/signin?redirect=/admin" className="text-neutral-500 hover:text-[#2D5A4A] transition-colors py-0.5">
                  Staff Portal
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Disclaimer & Copyright */}
        <div className="mt-12 pt-6 border-t border-neutral-200 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-3 text-3xs text-neutral-500">
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
