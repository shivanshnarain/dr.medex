import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Mail,
  Phone,
  ShieldCheck,
  Calendar,
  Clock,
  Building,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  AlertCircle,
  Activity,
  Laptop,
  Globe,
  Trash2,
  CheckCircle2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  KeyRound,
  Shield
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";

interface CustomerRecord {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  createdAt: string;
  lastSignInAt?: string | null;
  emailConfirmed: boolean;
  institution?: string;
}

interface LoginActivityRecord {
  id: string;
  customerId: string;
  email: string;
  fullName: string;
  phone?: string;
  authMethod?: string;
  outcome?: string;
  timestamp: string;
  ip: string;
  device: string;
  accountStatus: string;
}

export const AdminCustomersPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();

  // Active Tab: "directory" vs "activity"
  const [activeTab, setActiveTab] = useState<"directory" | "activity">("activity");

  // State: Customers
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [custPage, setCustPage] = useState(1);
  const [custTotalPages, setCustTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [custSearch, setCustSearch] = useState("");
  const [activeCustSearch, setActiveCustSearch] = useState("");
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // State: Login Activity
  const [activities, setActivities] = useState<LoginActivityRecord[]>([]);
  const [actPage, setActPage] = useState(1);
  const [actTotalPages, setActTotalPages] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  const [actSearch, setActSearch] = useState("");
  const [activeActSearch, setActiveActSearch] = useState("");
  const [actSortBy, setActSortBy] = useState<"date" | "name" | "customerId">("date");
  const [actSortOrder, setActSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Cleanup feedback state
  const [isCleaning, setIsCleaning] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Customers (Registered Accounts)
  const loadCustomers = useCallback(async (page: number, search: string) => {
    setIsLoadingCustomers(true);
    setErrorMessage(null);
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        ...(search ? { search } : {})
      });
      const res = await adminFetch(`/api/admin/customers?${q.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load customers (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setCustTotalPages(data.totalPages || 1);
        setTotalCustomers(data.total || 0);
      }
    } catch (err: any) {
      console.error("Customers load error:", err);
      setErrorMessage(err.message || "Failed to load customers.");
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [adminFetch]);

  // Fetch Login Activities (Audited Events)
  const loadActivities = useCallback(async (page: number, search: string) => {
    setIsLoadingActivities(true);
    setErrorMessage(null);
    try {
      const q = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        sortBy: actSortBy,
        order: actSortOrder,
        ...(search ? { search } : {})
      });
      const res = await adminFetch(`/api/admin/login-activity?${q.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load activity (HTTP ${res.status})`);
      }
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities || []);
        setActTotalPages(data.totalPages || 1);
        setTotalActivities(data.total || 0);
      }
    } catch (err: any) {
      console.error("Activity load error:", err);
      setErrorMessage(err.message || "Failed to load login activity.");
    } finally {
      setIsLoadingActivities(false);
    }
  }, [adminFetch, actSortBy, actSortOrder]);

  // Initial and reactive load
  useEffect(() => {
    loadCustomers(custPage, activeCustSearch);
  }, [custPage, activeCustSearch, loadCustomers]);

  useEffect(() => {
    loadActivities(actPage, activeActSearch);
  }, [actPage, activeActSearch, actSortBy, actSortOrder, loadActivities]);

  const handleCustSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustPage(1);
    setActiveCustSearch(custSearch.trim());
  };

  const handleActSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActPage(1);
    setActiveActSearch(actSearch.trim());
  };

  // Run 30-day activity cleanup
  const handleRun30DayCleanup = async () => {
    if (!window.confirm("Clean up login activity older than 30 days? Registered customer accounts will NOT be deleted.")) {
      return;
    }
    setIsCleaning(true);
    setStatusNotification(null);
    try {
      const res = await adminFetch("/api/admin/cleanup-expired-activity", {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setStatusNotification({
          type: "success",
          text: `Cleanup finished. Purged ${data.purgedCount || 0} events older than 30 days. Accounts safely retained.`
        });
        loadActivities(1, activeActSearch);
      } else {
        setStatusNotification({ type: "error", text: data.message || "Cleanup failed." });
      }
    } catch (e: any) {
      setStatusNotification({ type: "error", text: e.message || "Network error during cleanup." });
    } finally {
      setIsCleaning(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch {
      return isoString;
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return isoString;
    }
  };

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      const now = new Date();
      const past = new Date(isoString);
      const diffMs = now.getTime() - past.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes < 1) return "Just now";
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 30) return `${diffDays}d ago`;
      return formatDate(isoString);
    } catch {
      return "Recently";
    }
  };

  return (
    <AdminLayout
      title="Customer Management & Login Activity"
      subtitle="Audited login events, device telemetry, and customer accounts with permanent retention."
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadCustomers(custPage, activeCustSearch);
              loadActivities(actPage, activeActSearch);
            }}
            disabled={isLoadingCustomers || isLoadingActivities}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-xs font-bold text-white bg-[#0D4C3C] hover:bg-[#0D4C3C]/80 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoadingCustomers || isLoadingActivities ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleRun30DayCleanup}
            disabled={isCleaning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C62828] hover:bg-[#B71C1C] text-white text-xs font-bold transition-colors shadow-sm cursor-pointer"
            title="Clean up login activity older than 30 days"
          >
            <Trash2 size={13} className={isCleaning ? "animate-spin" : ""} />
            <span>Clean Expired Activity</span>
          </button>
        </div>
      }
      breadcrumbs={[
        { label: "Dashboard", href: "/admin" },
        { label: "Customers" }
      ]}
    >
      <div className="space-y-6">
        {/* Metric Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#0D4C3C] p-5 rounded-2xl border border-white/20 shadow-lg text-white">
            <div className="flex items-center justify-between text-white/70 mb-1">
              <span className="text-xs font-bold font-mono uppercase tracking-wider">Permanent Accounts</span>
              <Users size={16} className="text-[#FFD400]" />
            </div>
            <div className="text-3xl font-black font-mono text-white mt-2">{totalCustomers}</div>
            <div className="text-[11px] text-white/70 mt-1">Stored permanently in database</div>
          </div>

          <div className="bg-[#0D4C3C] p-5 rounded-2xl border border-white/20 shadow-lg text-white">
            <div className="flex items-center justify-between text-white/70 mb-1">
              <span className="text-xs font-bold font-mono uppercase tracking-wider">Recent Login Events</span>
              <Activity size={16} className="text-emerald-300" />
            </div>
            <div className="text-3xl font-black font-mono text-white mt-2">{totalActivities}</div>
            <div className="text-[11px] text-white/70 mt-1">Logged within last 30 days</div>
          </div>

          <div className="bg-[#0D4C3C] p-5 rounded-2xl border border-white/20 shadow-lg text-white">
            <div className="flex items-center justify-between text-white/70 mb-1">
              <span className="text-xs font-bold font-mono uppercase tracking-wider">Retention Policy</span>
              <ShieldCheck size={16} className="text-[#FFD400]" />
            </div>
            <div className="text-sm font-bold text-white mt-2">30-Day Activity Window</div>
            <div className="text-[11px] text-white/70 mt-1">
              Activity auto-purged; Customer profiles never deleted
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-white/15 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "activity"
                ? "bg-[#FFD400] text-black shadow-sm"
                : "bg-[#0D4C3C] text-white/80 hover:text-white hover:bg-white/10 border border-white/20"
            }`}
          >
            <Activity size={14} />
            <span>Customer Login Activity ({totalActivities})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "directory"
                ? "bg-[#FFD400] text-black shadow-sm"
                : "bg-[#0D4C3C] text-white/80 hover:text-white hover:bg-white/10 border border-white/20"
            }`}
          >
            <Users size={14} />
            <span>Registered Accounts Directory ({totalCustomers})</span>
          </button>
        </div>

        {/* Status Notification */}
        {statusNotification && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center justify-between shadow-md ${
              statusNotification.type === "success"
                ? "bg-[#0D4C3C] text-white border border-[#FFD400]"
                : "bg-[#C62828]/25 text-white border border-[#C62828]"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#FFD400] shrink-0" />
              <span>{statusNotification.text}</span>
            </div>
            <button
              onClick={() => setStatusNotification(null)}
              className="text-white/70 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 bg-[#C62828]/25 border border-[#C62828] rounded-xl text-xs text-white flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-300" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: CUSTOMER LOGIN ACTIVITY (30-DAY RETENTION) */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-[#0D4C3C] p-4 rounded-xl border border-white/20 shadow-md">
              <form onSubmit={handleActSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-3 text-neutral-400" />
                  <input
                    type="text"
                    value={actSearch}
                    onChange={(e) => setActSearch(e.target.value)}
                    placeholder="Search activity by customer name, email, IP, or device..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white text-black placeholder:text-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Search Activity
                  </button>
                  {activeActSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setActSearch("");
                        setActiveActSearch("");
                        setActPage(1);
                      }}
                      className="px-3 py-2 border border-white/20 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Login Activity Table */}
            <div className="bg-[#0D4C3C] text-white rounded-2xl border border-white/20 shadow-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-white/15 bg-black/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-[#FFD400]" />
                  <span className="font-bold text-xs text-white">
                    Recently Logged In (Latest Activity First)
                  </span>
                </div>
                <span className="text-[11px] text-white/60 font-medium">
                  Retained for latest 30 days
                </span>
              </div>

              {isLoadingActivities ? (
                <div className="py-20 flex flex-col items-center justify-center text-white/60">
                  <Loader2 size={24} className="animate-spin text-[#FFD400] mb-2" />
                  <p className="text-xs font-semibold">Loading login activity...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="py-16 text-center text-white/70">
                  <Activity size={32} className="mx-auto text-white/30 mb-2" />
                  <p className="text-sm font-bold text-white">No Login Activity Found</p>
                  <p className="text-xs text-white/60 mt-1">
                    {activeActSearch ? `No events matched "${activeActSearch}".` : "No login events recorded within the 30-day window."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-white">
                    <thead>
                      <tr className="bg-black/20 border-b border-white/15 text-white/70 uppercase tracking-wider text-[11px] font-bold font-mono">
                        <th
                          className="py-3 px-4 cursor-pointer hover:text-white select-none transition-colors"
                          onClick={() => {
                            if (actSortBy === "customerId") {
                              setActSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                            } else {
                              setActSortBy("customerId");
                              setActSortOrder("asc");
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span>Customer</span>
                            {actSortBy === "customerId" ? (
                              actSortOrder === "asc" ? <ArrowUp size={12} className="text-[#FFD400]" /> : <ArrowDown size={12} className="text-[#FFD400]" />
                            ) : (
                              <ArrowUpDown size={11} className="text-white/40" />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Phone</th>
                        <th
                          className="py-3 px-4 cursor-pointer hover:text-white select-none transition-colors"
                          onClick={() => {
                            if (actSortBy === "date") {
                              setActSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                            } else {
                              setActSortBy("date");
                              setActSortOrder("desc");
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span>Timestamp</span>
                            {actSortBy === "date" ? (
                              actSortOrder === "asc" ? <ArrowUp size={12} className="text-[#FFD400]" /> : <ArrowDown size={12} className="text-[#FFD400]" />
                            ) : (
                              <ArrowUpDown size={11} className="text-white/40" />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4">Auth Method</th>
                        <th className="py-3 px-4">Device & IP</th>
                        <th className="py-3 px-4">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/90">
                      {activities.map((act) => (
                        <tr key={act.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-xs">
                              {act.fullName}
                            </div>
                            <div className="text-[10px] text-white/50 font-mono mt-0.5">
                              ID: {act.customerId.substring(0, 16)}...
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-white/80 font-mono text-[11px]">
                              <Mail size={12} className="text-white/40 shrink-0" />
                              <span>{act.email}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-white/80 text-xs">
                            {act.phone ? (
                              <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/80">
                                <Phone size={11} className="text-white/40 shrink-0" />
                                <span>{act.phone}</span>
                              </div>
                            ) : (
                              <span className="text-white/30">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-white/90">
                            <div className="font-semibold text-xs text-white">
                              {formatRelativeTime(act.timestamp)}
                            </div>
                            <div className="text-[10px] text-white/60 flex items-center gap-1 mt-0.5">
                              <Calendar size={11} />
                              <span>{formatTimestamp(act.timestamp)}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-white/90 border border-white/15">
                              <KeyRound size={10} className="text-white/60" />
                              <span>{act.authMethod === "recovery_reset" ? "Password Recovery" : act.authMethod === "google" ? "Google OAuth" : "Email / Password"}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4 text-white/90">
                            <div className="flex items-center gap-1.5 font-medium text-xs">
                              <Laptop size={12} className="text-white/50 shrink-0" />
                              <span>{act.device || "Desktop"}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-white/50 font-mono mt-0.5">
                              <Globe size={10} />
                              <span>{act.ip || "127.0.0.1"}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>{act.outcome || "SUCCESS"}</span>
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Activity Pagination Footer */}
              {actTotalPages > 1 && (
                <div className="p-3.5 bg-black/20 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
                  <div>
                    Page <span className="font-bold text-white">{actPage}</span> of <span className="font-bold text-white">{actTotalPages}</span> ({totalActivities} events)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actPage <= 1}
                      onClick={() => setActPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={actPage >= actTotalPages}
                      onClick={() => setActPage((p) => Math.min(actTotalPages, p + 1))}
                      className="px-2.5 py-1 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REGISTERED ACCOUNTS DIRECTORY */}
        {activeTab === "directory" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-[#0D4C3C] p-4 rounded-xl border border-white/20 shadow-md">
              <form onSubmit={handleCustSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-3 text-neutral-400" />
                  <input
                    type="text"
                    value={custSearch}
                    onChange={(e) => setCustSearch(e.target.value)}
                    placeholder="Search by name, email, institution, or phone..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white text-black placeholder:text-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Search Accounts
                  </button>
                  {activeCustSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustSearch("");
                        setActiveCustSearch("");
                        setCustPage(1);
                      }}
                      className="px-3 py-2 border border-white/20 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Customer Directory Table */}
            <div className="bg-[#0D4C3C] text-white rounded-2xl border border-white/20 shadow-xl overflow-hidden">
              {isLoadingCustomers ? (
                <div className="py-20 flex flex-col items-center justify-center text-white/60">
                  <Loader2 size={24} className="animate-spin text-[#FFD400] mb-2" />
                  <p className="text-xs font-semibold">Loading customer accounts...</p>
                </div>
              ) : customers.length === 0 ? (
                <div className="py-16 text-center text-white/70">
                  <Users size={32} className="mx-auto text-white/30 mb-2" />
                  <p className="text-sm font-bold text-white">No Customers Found</p>
                  <p className="text-xs text-white/60 mt-1">
                    {activeCustSearch ? `No results matched "${activeCustSearch}".` : "No registered customer accounts yet."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-white">
                    <thead>
                      <tr className="bg-black/20 border-b border-white/15 text-white/70 uppercase tracking-wider text-[11px] font-bold font-mono">
                        <th className="py-3 px-4">Customer / Organization</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Account Status</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4">Last Sign In</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/90">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-xs">
                              {customer.fullName}
                            </div>
                            <div className="text-[11px] text-white/70 flex items-center gap-1.5 mt-0.5">
                              <Building size={12} className="text-white/40 shrink-0" />
                              <span>{customer.institution || "Healthcare Professional"}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 space-y-1">
                            <div className="flex items-center gap-1.5 text-white/80 font-mono text-[11px]">
                              <Mail size={12} className="text-white/40 shrink-0" />
                              <span>{customer.email}</span>
                            </div>
                            {customer.phone && (
                              <div className="flex items-center gap-1.5 text-white/70 font-mono text-[11px]">
                                <Phone size={12} className="text-white/40 shrink-0" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>Permanent Account</span>
                            </div>
                            {customer.emailConfirmed && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/70 font-medium">
                                <ShieldCheck size={11} className="text-emerald-300" />
                                <span>Email Verified</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-white/70">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Calendar size={12} className="text-white/40 shrink-0" />
                              <span>{formatDate(customer.createdAt)}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-white/70">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Clock size={12} className="text-white/40 shrink-0" />
                              <span>{formatRelativeTime(customer.lastSignInAt)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Directory Pagination Footer */}
              {custTotalPages > 1 && (
                <div className="p-3.5 bg-black/20 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
                  <div>
                    Page <span className="font-bold text-white">{custPage}</span> of <span className="font-bold text-white">{custTotalPages}</span> ({totalCustomers} accounts)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={custPage <= 1}
                      onClick={() => setCustPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={custPage >= custTotalPages}
                      onClick={() => setCustPage((p) => Math.min(custTotalPages, p + 1))}
                      className="px-2.5 py-1 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
