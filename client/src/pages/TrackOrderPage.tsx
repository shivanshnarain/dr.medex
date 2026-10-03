import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  CheckCircle2,
  ExternalLink,
  MapPin,
  AlertCircle
} from "lucide-react";

interface TrackingData {
  orderId: string;
  orderNumber: string;
  carrier: string;
  trackingNumber: string;
  estimatedDays: string;
  trackingUrl: string;
  status: string;
  fulfillmentStatus: string;
  shippingAddress: {
    fullName: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  timeline: {
    stage: string;
    title: string;
    timestamp: string | null;
    completed: boolean;
    details: string;
  }[];
  items: {
    title: string;
    quantity: number;
    sku: string;
  }[];
}

export const TrackOrderPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get("orderId") || "MC-84920";

  const [orderInput, setOrderInput] = useState(initialOrderId);
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchTracking = async (orderId: string) => {
    if (!orderId.trim()) return;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const res = await fetch(`/api/track/${encodeURIComponent(orderId.trim())}`);
      const data = await res.json();
      if (data.success) {
        setTrackingData(data);
      } else {
        setTrackingData(null);
        setErrorMessage(data.message || "No tracking record located for this Order Number.");
      }
    } catch (err) {
      setErrorMessage("Network error fetching tracking information.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId) {
      fetchTracking(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTracking(orderInput);
  };

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2.5">
          <span className="text-3xs font-extrabold uppercase tracking-widest text-[#1F7A4D] block">
            International Supply Chain Visibility
          </span>
          <h1 className="text-2xl sm:text-3.5xl font-black text-[#111111] tracking-tight">
            Track Air Freight Shipment
          </h1>
          <p className="text-xs text-neutral-500">
            Real-time status tracking for hospital orders, custom crating, and international customs clearance.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-xl border border-[#EAEAEA] shadow-2xs">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value.toUpperCase())}
                placeholder="Enter Order Number (e.g. MC-84920)"
                className="w-full pl-10 pr-4 py-3 text-sm font-mono uppercase bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl focus:outline-none focus:border-[#111111] focus:bg-white text-[#111111]"
              />
              <Search size={18} className="absolute left-3.5 top-3.5 text-neutral-400" />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>{isLoading ? "Querying..." : "Track Order"}</span>
            </button>
          </form>

          {errorMessage && (
            <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Tracking Data Results */}
        {trackingData && (
          <div className="space-y-6">
            {/* Top Shipment Card */}
            <div className="bg-white p-6 sm:p-8 rounded-xl border border-[#EAEAEA] shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#EAEAEA] gap-4">
                <div>
                  <span className="text-3xs font-extrabold uppercase tracking-wider text-neutral-400">Shipment ID</span>
                  <div className="text-xl font-mono font-black text-[#111111]">{trackingData.orderNumber}</div>
                  <div className="text-xs text-neutral-500 mt-1">Carrier: <strong>{trackingData.carrier}</strong></div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-3xs font-extrabold uppercase tracking-wider text-neutral-400">AWB Tracking #</div>
                  <div className="text-sm font-mono font-bold text-[#111111]">{trackingData.trackingNumber}</div>
                  <a
                    href={trackingData.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-2xs font-bold text-[#111111] hover:text-[#1F7A4D] hover:underline mt-1 transition-colors"
                  >
                    <span>Carrier Portal</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* 7-Step Visual Timeline */}
              <div>
                <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-6">
                  Medical Supply Chain Stages
                </h3>

                <div className="space-y-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#EAEAEA]">
                  {trackingData.timeline.map((event, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-6 top-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center text-3xs ${
                          event.completed
                            ? "bg-[#1F7A4D] border-[#1F7A4D] text-white"
                            : "bg-white border-[#EAEAEA] text-neutral-300"
                        }`}
                      >
                        {event.completed && <CheckCircle2 size={12} />}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="text-xs font-bold text-[#111111]">{event.title}</div>
                        {event.timestamp && (
                          <div className="text-3xs font-mono text-neutral-400">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <p className="text-2xs text-neutral-500 mt-1 leading-relaxed">{event.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destination & Equipment Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-[#EAEAEA] text-xs">
                <div className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-1.5">
                  <div className="font-bold text-[#111111] flex items-center gap-1.5 mb-1 text-2xs uppercase tracking-wider">
                    <MapPin size={14} className="text-[#1F7A4D]" />
                    <span>Destination Hospital Address</span>
                  </div>
                  <div className="text-[#111111] font-semibold">{trackingData.shippingAddress.fullName}</div>
                  <div className="text-neutral-600">{trackingData.shippingAddress.addressLine1}</div>
                  <div className="text-neutral-600">
                    {trackingData.shippingAddress.city}, {trackingData.shippingAddress.state} {trackingData.shippingAddress.postalCode}
                  </div>
                  <div className="text-[#111111] font-bold">{trackingData.shippingAddress.country}</div>
                </div>

                <div className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-2.5">
                  <div className="font-bold text-[#111111] text-2xs uppercase tracking-wider">
                    Package Manifest
                  </div>
                  <div className="space-y-1.5">
                    {trackingData.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-2xs">
                        <span className="font-medium text-neutral-700 truncate max-w-xs">{it.title}</span>
                        <span className="font-mono text-neutral-400 whitespace-nowrap">x{it.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
