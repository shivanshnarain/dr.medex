import React from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2
} from "lucide-react";

export const AboutPage: React.FC = () => {
  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#EAEAEA] text-[#111111] text-3xs font-bold uppercase tracking-wider shadow-2xs">
            <Activity size={14} className="text-[#1F7A4D]" />
            <span>Healthcare Engineering Excellence Since 1998</span>
          </div>
          <h1 className="text-3xl sm:text-4.5xl font-black text-[#111111] tracking-tight leading-tight">
            About DR.MEDEX Global Systems
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            A specialized global medical technology manufacturer and supplier dedicated to equipping operating rooms, physical therapy centers, and clinical surgical facilities with reliable, precision-engineered instrumentation.
          </p>
        </div>

        {/* Vision & Mission Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-xl border border-[#EAEAEA] shadow-2xs space-y-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#FAFAFA] border border-[#EAEAEA] text-[#111111] flex items-center justify-center font-bold text-xs">
              01
            </div>
            <h2 className="text-xl font-bold text-[#111111]">Our Clinical Mission</h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              To eliminate operational barriers for healthcare institutions by providing hospital-grade, certified medical devices with direct OEM pricing, uncompromising safety architectures, and resilient international air logistics.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl border border-[#EAEAEA] shadow-2xs space-y-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#FAFAFA] border border-[#EAEAEA] text-[#111111] flex items-center justify-center font-bold text-xs">
              02
            </div>
            <h2 className="text-xl font-bold text-[#111111]">Global Engineering Vision</h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              To establish modern operating theatres and rehabilitation wards in every corner of the world, supported by continuous optical innovation, shadowless illumination standards, and micro-precision electrosurgery.
            </p>
          </div>
        </div>

        {/* Manufacturing & 9-Stage QC Section */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-8 sm:p-12 shadow-2xs space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block">
                Manufacturing Standards
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                ISO 13485:2016 Certified Cleanroom Production
              </h3>
              <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                DR.MEDEX manufactures surgical lighting, electro-cautery generators, and therapy systems within ISO Class 7 cleanrooms. Every device undergoes a meticulous 9-stage validation protocol before packaging in shockproof export wooden crates.
              </p>

              <div className="space-y-2.5 text-xs text-neutral-700 pt-2">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1F7A4D] shrink-0" />
                  <span>Automated high-pot electrical isolation and leakage testing</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1F7A4D] shrink-0" />
                  <span>Optical lux calibration with spectrophotometric CRI measurement</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-[#1F7A4D] shrink-0" />
                  <span>48-hour uninterrupted thermal burn-in chamber inspection</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-xl overflow-hidden border border-[#EAEAEA] shadow-md">
                <img
                  src="https://images.unsplash.com/photo-1583912267670-6575ad362e4b?auto=format&fit=crop&w=1000&q=80"
                  alt="Medical Technology Laboratory"
                  className="w-full h-80 object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CTA Banner */}
        <div className="bg-[#111111] text-white rounded-2xl p-8 sm:p-14 text-center space-y-5 border border-[#222222]">
          <h3 className="text-2xl sm:text-3xl font-black">
            Partner With an International Medical Device Manufacturer
          </h3>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Contact our institutional procurement division for customized hospital orders, distributor partnerships, and worldwide tender bids.
          </p>
          <div className="pt-3 flex flex-wrap justify-center gap-4">
            <Link
              to="/request-quote"
              className="px-8 py-3.5 bg-white hover:bg-neutral-200 text-[#111111] font-bold rounded-xl text-xs transition-colors"
            >
              Request Institutional Quote
            </Link>
            <Link
              to="/contact"
              className="px-8 py-3.5 bg-[#1c1c1c] border border-[#333333] hover:bg-[#262626] text-white font-bold rounded-xl text-xs transition-colors"
            >
              Contact Global HQ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
