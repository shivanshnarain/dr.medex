import React from "react";
import { useLocation, Link } from "react-router-dom";
import { ShieldCheck, FileText, ArrowLeft } from "lucide-react";

interface PolicyContent {
  title: string;
  subtitle: string;
  lastUpdated: string;
  sections: { heading: string; body: string }[];
}

export const PolicyPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  let policy: PolicyContent = {
    title: "Privacy & Data Protection Policy",
    subtitle: "Compliance with GDPR, HIPAA, and International Patient Confidentiality Protocols",
    lastUpdated: "January 2026",
    sections: [
      {
        heading: "1. Scope of Privacy Protocol",
        body: "MediCuro Global Systems Ltd respects practitioner and healthcare institutional privacy. This policy outlines how commercial transaction data, facility delivery credentials, and communication logs are handled under international security standards."
      },
      {
        heading: "2. Information Collection & Usage",
        body: "We collect institution names, hospital delivery addresses, verified business email addresses, and phone contacts strictly for order fulfillment, proforma invoice generation, and air freight logistics clearance. We do not sell or monetize client medical datasets."
      },
      {
        heading: "3. 256-Bit SSL Encryption",
        body: "All financial transactions and tender submissions are safeguarded using 256-bit SSL encryption. Payment gateway integrations with Stripe and SWIFT international banking partners adhere to PCI-DSS Level 1 compliance."
      }
    ]
  };

  if (path.includes("terms")) {
    policy = {
      title: "Terms & Conditions of Commercial Sale",
      subtitle: "Standard International Terms for Medical Technology Procurement",
      lastUpdated: "January 2026",
      sections: [
        {
          heading: "1. Acceptance of Medical Purchase",
          body: "By ordering equipment or issuing purchase orders to MediCuro Global, the buyer acknowledges they are a licensed healthcare facility, medical distributor, or registered medical practitioner authorized to operate clinical electrical equipment."
        },
        {
          heading: "2. Export Compliance & Incoterms",
          body: "Shipments are provided under standard Incoterms (typically CIF / CIP or FOB as detailed in the commercial proforma invoice). The buyer is responsible for national import registrations, local tariffs, and medical device regulatory permits in the destination country unless DDP terms are explicitly contracted."
        },
        {
          heading: "3. Governing Law",
          body: "Commercial contracts and transactions are governed under international commercial arbitration protocols."
        }
      ]
    };
  } else if (path.includes("shipping")) {
    policy = {
      title: "International Air Freight & Shipping Policy",
      subtitle: "Export Packaging Standards, Air Freight Lead Times & Customs Documentation",
      lastUpdated: "January 2026",
      sections: [
        {
          heading: "1. Reinforced Export Crating",
          body: "All operating theatre lights, electrosurgical generators, and surgical tables are packaged inside heat-treated ISPM-15 compliant export wooden crates with high-density foam shock mitigation to prevent optical and mechanical misalignment during air transport."
        },
        {
          heading: "2. Carrier Networks & Tracking",
          body: "International consignments are routed via DHL Express, FedEx Medical Logistics, or bonded airline cargo. Air Waybill (AWB) tracking credentials are transmitted electronically within 24 hours of flight dispatch."
        },
        {
          heading: "3. Transit Lead Times",
          body: "Average air express transit is 2–5 business days to North America, Europe, the Middle East, and South Asia. Shipments to Africa and remote island territories range between 5–8 business days."
        }
      ]
    };
  } else if (path.includes("warranty")) {
    policy = {
      title: "5-Year OEM Warranty & Replacement Policy",
      subtitle: "Comprehensive Manufacturer Coverage for Clinical Instruments",
      lastUpdated: "January 2026",
      sections: [
        {
          heading: "1. Scope of 5-Year Coverage",
          body: "MediCuro Global provides a comprehensive 5-year OEM warranty on LED modules, structural articulation arms, generator circuit boards, and table hydraulic pumps against manufacturing defects."
        },
        {
          heading: "2. Rapid Spare Parts Dispatch",
          body: "In the event of a component failure, replacement modules and sterile accessories are prioritized for air express dispatch within 48 hours to minimize operating theatre downtime."
        },
        {
          heading: "3. Returns & Inspection Protocol",
          body: "Clinical units eligible for return must be reported within 14 calendar days of delivery in original export crating. Returned units undergo cleanroom decontamination and engineering verification before credit release."
        }
      ]
    };
  } else if (path.includes("payment")) {
    policy = {
      title: "International Payment & Wire Policy",
      subtitle: "Payment Gateways, Currency Conversion & SWIFT Remittance Guidelines",
      lastUpdated: "January 2026",
      sections: [
        {
          heading: "1. Multi-Currency Settlement",
          body: "Catalog prices are anchored to USD base rates and converted dynamically to your local currency. At the moment of order placement, the active exchange rate is snapshotted into your invoice record to guarantee payment finality."
        },
        {
          heading: "2. Accepted Payment Instruments",
          body: "We accept Visa, Mastercard, American Express via international secure checkout, PayPal, and institutional SWIFT / IBAN wire transfers for hospital purchase orders."
        },
        {
          heading: "3. Institutional Purchase Orders (PO)",
          body: "Accredited hospitals and governmental health ministries may request net-30 terms upon submission of formal credit references and tender contracts."
        }
      ]
    };
  }

  return (
    <div className="w-full bg-slate-50 min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={14} />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-xs space-y-8">
          <div className="space-y-2 border-b border-slate-100 pb-6">
            <span className="text-3xs font-extrabold uppercase tracking-wider text-sky-700">
              Legal & Compliance Framework
            </span>
            <h1 className="text-2xl sm:text-3.5xl font-black text-slate-900 tracking-tight">
              {policy.title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">{policy.subtitle}</p>
            <div className="text-3xs text-slate-400 pt-1">Effective Date: {policy.lastUpdated}</div>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
            {policy.sections.map((sec, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">{sec.heading}</h3>
                <p className="text-slate-600 leading-relaxed">{sec.body}</p>
              </div>
            ))}
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Questions regarding compliance? Email: compliance@medicuroglobal.com</span>
            <Link to="/contact" className="font-bold text-sky-700 hover:underline">
              Contact Legal Desk →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
