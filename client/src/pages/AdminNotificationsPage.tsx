import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Send,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Eye,
  Layers,
  ShoppingBag,
  Sparkles,
  Inbox
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";

interface NotificationHistoryItem {
  notificationId: string;
  title: string;
  message: string;
  category: string;
  targetAudience: string;
  url: string;
  image?: string;
  sentBy: string;
  stats: {
    targeted: number;
    sent: number;
    failed: number;
    unsubscribed: number;
  };
  createdAt: string;
}

interface SubscribersStats {
  total: number;
  orderSubscribers: number;
  websiteSubscribers: number;
  supportSubscribers: number;
  marketingSubscribers: number;
  customersLinked: number;
}

export const AdminNotificationsPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();

  // Data state
  const [stats, setStats] = useState<SubscribersStats>({
    total: 0,
    orderSubscribers: 0,
    websiteSubscribers: 0,
    supportSubscribers: 0,
    marketingSubscribers: 0,
    customersLinked: 0
  });
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<"website" | "order" | "support" | "marketing">("website");
  const [targetAudience, setTargetAudience] = useState<"all" | "customers_with_orders" | "marketing_optin">("all");
  const [destinationUrl, setDestinationUrl] = useState("/");
  const [imageUrl, setImageUrl] = useState("");

  // Feedback outcome
  const [outcomeMessage, setOutcomeMessage] = useState<{
    type: "success" | "error";
    text: string;
    details?: string;
  } | null>(null);

  const fetchStatsAndHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsRes, histRes] = await Promise.all([
        adminFetch("/api/admin/notifications/stats"),
        adminFetch("/api/admin/notifications/history")
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success && statsData.stats) {
          setStats(statsData.stats);
        }
      }

      if (histRes.ok) {
        const histData = await histRes.json();
        if (histData.success && Array.isArray(histData.history)) {
          setHistory(histData.history);
        }
      }
    } catch (err) {
      console.error("[AdminNotifications] Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchStatsAndHistory();
  }, [fetchStatsAndHistory]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setOutcomeMessage({
        type: "error",
        text: "Please provide both a Title and Message for the notification."
      });
      return;
    }

    setIsSending(true);
    setOutcomeMessage(null);

    try {
      const res = await adminFetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          category,
          targetAudience,
          url: destinationUrl.trim() || "/",
          image: imageUrl.trim() || null,
          sentBy: "Central Administration"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Server returned HTTP ${res.status}`);
      }

      setOutcomeMessage({
        type: "success",
        text: "Push notification dispatched successfully!",
        details: `Targeted: ${data.stats?.targeted || 0} devices | Sent: ${data.stats?.sent || 0} | Expired/Cleaned: ${data.stats?.unsubscribed || 0}`
      });

      // Clear form
      setTitle("");
      setMessage("");
      setImageUrl("");

      // Refresh list
      fetchStatsAndHistory();
    } catch (err: any) {
      setOutcomeMessage({
        type: "error",
        text: "Failed to dispatch push notification.",
        details: err.message
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AdminLayout
      title="Push Notifications"
      subtitle="Broadcast urgent equipment notices, shipment alerts, and product arrivals directly to customer devices."
      breadcrumbs={[{ label: "Notifications" }]}
      actions={
        <button
          onClick={fetchStatsAndHistory}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh Stats</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* STATS OVERVIEW CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-3xs font-extrabold uppercase tracking-wider">Total Subscribers</span>
              <Bell size={18} className="text-[#2D5A4A]" />
            </div>
            <div className="text-2xl font-black text-[#171717]">{stats.total}</div>
            <p className="text-3xs text-neutral-500 mt-1">Active browser devices</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-3xs font-extrabold uppercase tracking-wider">Order Alerts</span>
              <ShoppingBag size={18} className="text-[#7AA05A]" />
            </div>
            <div className="text-2xl font-black text-[#171717]">{stats.orderSubscribers}</div>
            <p className="text-3xs text-neutral-500 mt-1">Shipment & dispatch tracking</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-3xs font-extrabold uppercase tracking-wider">Marketing Opt-In</span>
              <Sparkles size={18} className="text-amber-600" />
            </div>
            <div className="text-2xl font-black text-[#171717]">{stats.marketingSubscribers}</div>
            <p className="text-3xs text-neutral-500 mt-1">Explicit promotional consent</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
            <div className="flex items-center justify-between text-neutral-400 mb-2">
              <span className="text-3xs font-extrabold uppercase tracking-wider">Linked Customers</span>
              <Users size={18} className="text-blue-600" />
            </div>
            <div className="text-2xl font-black text-[#171717]">{stats.customersLinked}</div>
            <p className="text-3xs text-neutral-500 mt-1">Authenticated accounts</p>
          </div>
        </div>

        {/* BROADCAST FORM & LIVE PREVIEW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form: 7 cols */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Send size={18} className="text-[#2D5A4A]" />
                <h3 className="text-sm font-bold text-[#171717]">Compose & Broadcast Notification</h3>
              </div>
              <span className="text-3xs font-bold text-[#2D5A4A] bg-[#F4F7F2] px-2.5 py-1 rounded-full uppercase">
                Web Push API
              </span>
            </div>

            {outcomeMessage && (
              <div
                className={`mb-5 p-4 rounded-xl text-xs font-semibold flex items-start gap-3 ${
                  outcomeMessage.type === "success"
                    ? "bg-[#F0F7ED] border border-[#7AA05A]/40 text-[#2D5A4A]"
                    : "bg-rose-50 border border-rose-200 text-rose-700"
                }`}
              >
                {outcomeMessage.type === "success" ? (
                  <CheckCircle2 size={18} className="text-[#7AA05A] shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{outcomeMessage.text}</p>
                  {outcomeMessage.details && (
                    <p className="text-3xs opacity-80 mt-1 font-normal font-mono">{outcomeMessage.details}</p>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">
                  Notification Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. New Electrosurgical Unit Released: Dr. Medex ESU-400"
                  maxLength={100}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all font-medium text-[#171717]"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-800 mb-1.5">
                  Message Body <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. CE certified, 400W pure cut with bipolar micro coagulation. In stock for immediate worldwide air dispatch."
                  rows={3}
                  maxLength={250}
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all font-medium text-[#171717] resize-none"
                />
                <span className="text-3xs text-neutral-400 text-right block mt-1">
                  {message.length}/250 characters
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-[#7AA05A] bg-white font-medium text-[#171717]"
                  >
                    <option value="website">Website Announcements</option>
                    <option value="order">Order & Shipment Updates</option>
                    <option value="support">Customer Support</option>
                    <option value="marketing">Marketing & Equipment Offers</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1.5">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={(e: any) => setTargetAudience(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-[#7AA05A] bg-white font-medium text-[#171717]"
                  >
                    <option value="all">All Active Subscribers</option>
                    <option value="customers_with_orders">Customers with Orders Only</option>
                    <option value="marketing_optin">Marketing Opt-In Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-neutral-800 mb-1.5">Destination URL</label>
                  <input
                    type="text"
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder="/products or /track-order"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-[#7AA05A] font-medium text-[#171717]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-800 mb-1.5">Banner Image URL (Optional)</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://.../banner.jpg"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-neutral-300 focus:outline-none focus:border-[#7AA05A] font-medium text-[#171717]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSending || stats.total === 0}
                  className="w-full py-3 px-5 rounded-xl bg-[#2D5A4A] hover:bg-[#1E3F33] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Broadcasting Push Notification...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} className="text-[#7AA05A]" />
                      <span>Broadcast to {targetAudience === "all" ? stats.total : (targetAudience === "marketing_optin" ? stats.marketingSubscribers : stats.orderSubscribers)} Device(s)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview: 5 cols */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 pb-4 mb-4 border-b border-neutral-100">
                <Eye size={18} className="text-[#2D5A4A]" />
                <h3 className="text-sm font-bold text-[#171717]">Live Device Preview</h3>
              </div>

              <p className="text-3xs text-neutral-500 mb-4 leading-relaxed">
                Simulation of standard system push alert as rendered on macOS, Windows, and Android mobile devices.
              </p>

              {/* Native Push Notification Mock Card */}
              <div className="bg-[#1E1E1E] text-white rounded-2xl p-4 shadow-xl border border-neutral-700 space-y-3">
                <div className="flex items-center justify-between text-3xs text-neutral-400">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#2D5A4A] flex items-center justify-center">
                      <ShieldCheck size={11} className="text-[#7AA05A]" />
                    </div>
                    <span className="font-bold tracking-wider text-neutral-300">DR.MEDEX GLOBAL</span>
                  </div>
                  <span>now</span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white line-clamp-1">
                    {title.trim() || "DR.MEDEX Medical Equipment Notification"}
                  </h4>
                  <p className="text-2xs text-neutral-300 leading-snug line-clamp-2">
                    {message.trim() || "Consignment order update and worldwide procurement notification."}
                  </p>
                </div>

                {imageUrl.trim() && (
                  <div className="rounded-lg overflow-hidden border border-neutral-700 bg-neutral-900 max-h-32">
                    <img
                      src={imageUrl.trim()}
                      alt="Push Attachment"
                      className="w-full h-28 object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                <div className="pt-1 flex items-center gap-2 border-t border-neutral-700/60">
                  <button
                    type="button"
                    className="flex-1 py-1 px-2.5 rounded bg-neutral-800 hover:bg-neutral-700 text-3xs font-semibold text-neutral-200 text-center transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    type="button"
                    className="py-1 px-2.5 rounded bg-neutral-800 hover:bg-neutral-700 text-3xs font-semibold text-neutral-400 text-center transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-neutral-100 mt-6">
              <div className="text-3xs text-neutral-500 space-y-1">
                <p className="font-bold text-neutral-700">W3C Compliance:</p>
                <p>• Push API & Service Worker background event delivery</p>
                <p>• Cryptographically signed with RFC 8292 VAPID standard</p>
                <p>• Automatic cleanup of expired tokens (HTTP 404 / 410)</p>
              </div>
            </div>
          </div>
        </div>

        {/* BROADCAST HISTORY TABLE */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[#2D5A4A]" />
              <h3 className="text-sm font-bold text-[#171717]">Broadcast History</h3>
            </div>
            <span className="text-3xs text-neutral-400">Showing last {history.length} dispatches</span>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-10 text-neutral-400">
              <Inbox size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No push notifications broadcast yet.</p>
              <p className="text-3xs text-neutral-400 mt-1">Use the composer above to send your first alert.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-200 text-3xs font-extrabold text-neutral-400 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Title & Message</th>
                    <th className="pb-3 px-3">Category</th>
                    <th className="pb-3 px-3">Audience</th>
                    <th className="pb-3 px-3">Delivery Stats</th>
                    <th className="pb-3 px-3">Sent At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {history.map((item) => (
                    <tr key={item.notificationId} className="hover:bg-neutral-50/50">
                      <td className="py-3.5 pr-4 max-w-xs">
                        <div className="font-bold text-[#171717]">{item.title}</div>
                        <div className="text-2xs text-neutral-500 line-clamp-1 mt-0.5">{item.message}</div>
                        {item.url && (
                          <span className="text-3xs text-[#2D5A4A] font-mono mt-0.5 inline-block">
                            Target: {item.url}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase bg-neutral-100 text-neutral-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="text-2xs font-semibold text-neutral-700">
                          {item.targetAudience === "all"
                            ? "All Subscribers"
                            : item.targetAudience === "marketing_optin"
                            ? "Marketing Opt-in"
                            : "Customers with Orders"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="text-2xs font-bold text-[#171717]">
                          {item.stats.sent} / {item.stats.targeted} sent
                        </div>
                        {item.stats.unsubscribed > 0 && (
                          <div className="text-3xs text-amber-600 font-medium">
                            {item.stats.unsubscribed} expired cleaned
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap text-3xs text-neutral-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
