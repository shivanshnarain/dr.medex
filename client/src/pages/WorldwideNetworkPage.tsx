import React from "react";
import { Link } from "react-router-dom";
import { Globe, Plane, ShieldCheck, MapPin, Clock, ArrowRight, Award } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

export const WorldwideNetworkPage: React.FC = () => {
  const { countries, setCountry } = useCurrency();

  const hubs = [
    {
      region: "North America Distribution Hub",
      location: "Boston, MA, United States",
      countries: "United States, Canada, Mexico",
      transitDays: "3–5 Business Days",
      compliance: "FDA 510(k) Ready / Health Canada MDEL / ISO 13485",
      image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80"
    },
    {
      region: "European Logistics & Service Center",
      location: "Frankfurt, Germany & London, United Kingdom",
      countries: "UK, Germany, France, Italy, Spain, Netherlands, Switzerland",
      transitDays: "3–6 Business Days",
      compliance: "CE MDR 2017/745 / UKCA / ISO 13485:2016",
      image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80"
    },
    {
      region: "Middle East & Gulf Hub",
      location: "Dubai Healthcare City (DHCC), UAE",
      countries: "UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain",
      transitDays: "2–4 Business Days",
      compliance: "MOHAP Registered / CE Certified / Air Cargo Priority",
      image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80"
    },
    {
      region: "South Asia & Asia-Pacific Manufacturing Hub",
      location: "New Delhi & Bangalore, India",
      countries: "India, Singapore, Australia, Malaysia, Japan, South Korea",
      transitDays: "2–5 Business Days",
      compliance: "CDSCO Approved / HSA / TGA Compliant / ISO 13485",
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80"
    },
    {
      region: "Africa Regional Distribution Hub",
      location: "Johannesburg, South Africa",
      countries: "South Africa, Kenya, Nigeria, Ghana, Egypt, Sudan",
      transitDays: "5–8 Business Days",
      compliance: "SAHPRA / CE Export Standard / Heavy Duty Crating",
      image: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=800&q=80"
    }
  ];

  return (
    <div className="w-full bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100/80 border border-sky-200 text-sky-900 text-3xs font-bold uppercase tracking-wider">
            <Globe size={14} className="text-sky-700" />
            <span>International Logistics & Regional Coverage</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Our Worldwide Network & Global Logistics
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            MediCuro Global supplies operating theatres, rehabilitation departments, and hospitals across 50+ countries. Engineered with universal electrical configurations, multi-language manuals, and reinforced shockproof export crating.
          </p>
        </div>

        {/* Global Distribution Hubs */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Strategic Regional Logistics Centers
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hubs.map((hub, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-video bg-slate-100 overflow-hidden relative">
                    <img
                      src={hub.image}
                      alt={hub.region}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
                    <div className="absolute bottom-3 left-4 text-white">
                      <div className="text-xs font-bold">{hub.location}</div>
                      <div className="text-3xs text-sky-300 font-mono">Air Cargo Hub</div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">{hub.region}</h3>
                    <div className="space-y-1.5 text-xs text-slate-600">
                      <div>
                        <span className="font-bold text-slate-700">Countries Served:</span> {hub.countries}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Average Transit Time:</span> {hub.transitDays}
                      </div>
                      <div className="text-3xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-2">
                        {hub.compliance}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <Link
                    to="/request-quote"
                    className="w-full py-2.5 bg-slate-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Request Regional Proforma Quote</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Country-Specific Landing Pages Directory */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Country-Specific Procurement Pages</h2>
              <p className="text-xs text-slate-500">Access localized voltage, regulatory standards, and customs details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {countries.map((c) => (
              <Link
                key={c.code}
                to={`/country/${c.code.toLowerCase()}`}
                onClick={() => setCountry(c.code)}
                className="p-4 bg-slate-50 hover:bg-sky-50 rounded-2xl border border-slate-200 hover:border-sky-300 transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{c.flag}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900 group-hover:text-sky-800">{c.name}</div>
                    <div className="text-3xs text-slate-400 font-mono">Currency: {c.currency} ({c.symbol})</div>
                  </div>
                </div>
                <div className="text-3xs text-slate-500 space-y-0.5">
                  <div>Voltage: {c.voltage}</div>
                  <div>Air Lead Time: {c.leadTimeAirDays}</div>
                  <div className="text-sky-700 font-semibold group-hover:underline pt-1">
                    View {c.name} Logistics Details →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
