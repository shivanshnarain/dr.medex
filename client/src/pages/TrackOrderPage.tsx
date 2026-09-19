import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  CheckCircle2,
  Clock,
  Truck,
  Plane,
  Package,
  ShieldCheck,
  ExternalLink,
  MapPin,
  Calendar,
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
    <div className="w-full bg-slate-50 min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Header */}
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-3xs font-extrabold uppercase tracking-widest text-sky-700 block">
            International Supply Chain Visibility
          </span>
          <h1 className="text-2xl sm:text-3.5xl font-black text-slate-900 tracking-tight">
            Track Air Freight Shipment
          </h1>
          <p className="text-xs text-slate-500">
            Real-time status tracking for hospital orders, custom crating, and international customs clearance.
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value.toUpperCase())}
                placeholder="Enter Order Number (e.g. MC-84920)"
                className="w-full pl-10 pr-4 py-3 text-sm font-mono uppercase bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-sky-600 focus:bg-white"
              />
              <Search size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 bg-slate-900 hover:bg-sky-800 text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>{isLoading ? "Querying..." : "Track Order"}</span>
            </button>
          </form>

          {errorMessage && (
            <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Tracking Data Results */}
        {trackingData && (
          <div className="space-y-6">
            {/* Top Shipment Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
                <div>
                  <span className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">Shipment ID</span>
                  <div className="text-xl font-mono font-black text-slate-900">{trackingData.orderNumber}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Carrier: <strong>{trackingData.carrier}</strong></div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-3xs font-extrabold uppercase tracking-wider text-slate-400">AWB Tracking #</div>
                  <div className="text-sm font-mono font-bold text-sky-700">{trackingData.trackingNumber}</div>
                  <a
                    href={trackingData.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-2xs font-bold text-sky-600 hover:underline mt-0.5"
                  >
                    <span>Carrier Portal</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* 7-Step Visual Timeline */}
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-6">
                  Medical Supply Chain Stages
                </h3>

                <div className="space-y-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {trackingData.timeline.map((event, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-6 top-0.5 w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center text-3xs ${
                          event.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "bg-white border-slate-300 text-slate-300"
                        }`}
                      >
                        {event.completed && <CheckCircle2 size={12} />}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="text-xs font-bold text-slate-900">{event.title}</div>
                        {event.timestamp && (
                          <div className="text-3xs font-mono text-slate-400">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <p className="text-2xs text-slate-500 mt-1">{event.details}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destination & Equipment Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100 text-xs">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1 text-2xs uppercase tracking-wider">
                    <MapPin size={14} className="text-sky-700" />
                    <span>Destination Hospital Address</span>
                  </div>
                  <div className="text-slate-800 font-semibold">{trackingData.shippingAddress.fullName}</div>
                  <div className="text-slate-600">{trackingData.shippingAddress.addressLine1}</div>
                  <div className="text-slate-600">
                    {trackingData.shippingAddress.city}, {trackingData.shippingAddress.state} {trackingData.shippingAddress.postalCode}
                  </div>
                  <div className="text-slate-900 font-bold">{trackingData.shippingAddress.country}</div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900 text-2xs uppercase tracking-wider">
                    Package Manifest
                  </div>
                  <div className="space-y-1">
                    {trackingData.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-2xs">
                        <span className="font-medium text-slate-700 truncate max-w-xs">{it.title}</span>
                        <span className="font-mono text-slate-500 whitespace-nowrap">x{it.quantity}</span>
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
