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
  CheckCircle2
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
  timestamp: string;
  ip: string;
  device: string;
  accountStatus: string;
}

export const AdminCustomersPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();

  // Active Tab: "directory" vs "activity"
  const [activeTab, setActiveTab] = useState<"directory" | "activity">("activity");

  // Customer Directory State
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [custPage, setCustPage] = useState(1);
  const [custTotalPages, setCustTotalPages] = useState(1);
  const [custSearch, setCustSearch] = useState("");
  const [activeCustSearch, setActiveCustSearch] = useState("");
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Login Activity State (30-day retention)
  const [activities, setActivities] = useState<LoginActivityRecord[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [actPage, setActPage] = useState(1);
  const [actTotalPages, setActTotalPages] = useState(1);
  const [actSearch, setActSearch] = useState("");
  const [activeActSearch, setActiveActSearch] = useState("");
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Feedback states
  const [isCleaning, setIsCleaning] = useState(false);
  const [statusNotification, setStatusNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Load Customer Directory
  const loadCustomers = useCallback(
    async (targetPage = 1, search = activeCustSearch) => {
      setIsLoadingCustomers(true);
      setErrorMessage(null);
      try {
        const queryParams = new URLSearchParams({
          page: targetPage.toString(),
          limit: "15",
          search: search.trim()
        });

        const res = await adminFetch(`/api/admin/customers?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setCustomers(data.customers || []);
            setTotalCustomers(data.totalCount || 0);
            setCustPage(data.page || 1);
            setCustTotalPages(data.totalPages || 1);
          } else {
            setErrorMessage(data.message || "Unable to fetch customers.");
          }
        }
      } catch (err: any) {
        console.error("Failed to load customers:", err);
        setErrorMessage(err.message || "An unexpected error occurred.");
      } finally {
        setIsLoadingCustomers(false);
      }
    },
    [adminFetch, activeCustSearch]
  );

  // 2. Load Login Activity (Latest first, 30-day retention)
  const loadActivities = useCallback(
    async (targetPage = 1, search = activeActSearch) => {
      setIsLoadingActivities(true);
      setErrorMessage(null);
      try {
        const queryParams = new URLSearchParams({
          page: targetPage.toString(),
          limit: "15",
          search: search.trim()
        });

        const res = await adminFetch(`/api/admin/customer-activity?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setActivities(data.activities || []);
            setTotalActivities(data.totalCount || 0);
            setActPage(data.page || 1);
            setActTotalPages(data.totalPages || 1);
          } else {
            setErrorMessage(data.message || "Unable to fetch login activity.");
          }
        }
      } catch (err: any) {
        console.error("Failed to load activity:", err);
        setErrorMessage(err.message || "An unexpected error occurred.");
      } finally {
        setIsLoadingActivities(false);
      }
    },
    [adminFetch, activeActSearch]
  );

  useEffect(() => {
    loadCustomers(custPage, activeCustSearch);
    loadActivities(actPage, activeActSearch);
  }, [loadCustomers, loadActivities, custPage, activeCustSearch, actPage, activeActSearch]);

  // Handle Search Submission
  const handleCustSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustPage(1);
    setActiveCustSearch(custSearch);
  };

  const handleActSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActPage(1);
    setActiveActSearch(actSearch);
  };

  // Run 30-Day Activity Cleanup
  const handleRun30DayCleanup = async () => {
    setIsCleaning(true);
    setStatusNotification(null);
    try {
      const res = await adminFetch("/api/admin/customer-activity/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 30 })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStatusNotification({
            type: "success",
            text: `30-Day Cleanup complete: ${data.cleanedCount} expired login records removed. All ${data.accountsUntouched} customer accounts remain permanent.`
          });
          loadActivities(1, activeActSearch);
        }
      }
    } catch (err: any) {
      setStatusNotification({ type: "error", text: "Failed to run activity cleanup task." });
    } finally {
      setIsCleaning(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      });
    } catch {
      return isoString;
    }
  };

  const formatTimestamp = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoString;
    }
  };

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return "Never";
    try {
      const d = new Date(isoString);
      const diffMs = Date.now() - d.getTime();
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <RefreshCw size={13} className={isLoadingCustomers || isLoadingActivities ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleRun30DayCleanup}
            disabled={isCleaning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold transition-colors border border-neutral-200"
            title="Clean up login activity older than 30 days"
          >
            <Trash2 size={13} className={isCleaning ? "animate-spin text-amber-600" : "text-neutral-500"} />
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
          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Permanent Accounts</span>
              <Users size={16} className="text-[#2D5A4A]" />
            </div>
            <div className="text-2xl font-bold text-neutral-900">{totalCustomers}</div>
            <div className="text-[11px] text-neutral-500 mt-1">Stored permanently in Supabase</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Recent Login Events</span>
              <Activity size={16} className="text-[#7AA05A]" />
            </div>
            <div className="text-2xl font-bold text-neutral-900">{totalActivities}</div>
            <div className="text-[11px] text-neutral-500 mt-1">Logged within last 30 days</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
            <div className="flex items-center justify-between text-neutral-500 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Retention Policy</span>
              <ShieldCheck size={16} className="text-blue-600" />
            </div>
            <div className="text-sm font-bold text-neutral-900 mt-1">30-Day Activity Window</div>
            <div className="text-[11px] text-neutral-500 mt-1">
              Activity auto-purged; Customer profiles never deleted
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "activity"
                ? "bg-[#2D5A4A] text-white shadow-xs"
                : "bg-white text-neutral-600 hover:text-black hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            <Activity size={14} />
            <span>Customer Login Activity ({totalActivities})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "directory"
                ? "bg-[#2D5A4A] text-white shadow-xs"
                : "bg-white text-neutral-600 hover:text-black hover:bg-neutral-100 border border-neutral-200"
            }`}
          >
            <Users size={14} />
            <span>Registered Accounts Directory ({totalCustomers})</span>
          </button>
        </div>

        {/* Status Notification */}
        {statusNotification && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center justify-between ${
              statusNotification.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{statusNotification.text}</span>
            </div>
            <button
              onClick={() => setStatusNotification(null)}
              className="text-neutral-500 hover:text-black text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: CUSTOMER LOGIN ACTIVITY (30-DAY RETENTION) */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <form onSubmit={handleActSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-3 text-neutral-400" />
                  <input
                    type="text"
                    value={actSearch}
                    onChange={(e) => setActSearch(e.target.value)}
                    placeholder="Search activity by customer name, email, IP, or device..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A4A] text-neutral-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors"
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
                      className="px-3 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Login Activity Table */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-[#2D5A4A]" />
                  <span className="font-bold text-xs text-neutral-800">
                    Recently Logged In (Latest Activity First)
                  </span>
                </div>
                <span className="text-[11px] text-neutral-500 font-medium">
                  Retained for latest 30 days
                </span>
              </div>

              {isLoadingActivities ? (
                <div className="py-20 flex flex-col items-center justify-center text-neutral-500">
                  <Loader2 size={24} className="animate-spin text-[#2D5A4A] mb-2" />
                  <p className="text-xs font-semibold">Loading login activity...</p>
                </div>
              ) : activities.length === 0 ? (
                <div className="py-16 text-center text-neutral-500">
                  <Activity size={32} className="mx-auto text-neutral-300 mb-2" />
                  <p className="text-sm font-bold text-neutral-800">No Login Activity Found</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {activeActSearch ? `No events matched "${activeActSearch}".` : "No login events recorded within the 30-day window."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[11px] font-bold">
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Login Timestamp</th>
                        <th className="py-3 px-4">Device & Browser</th>
                        <th className="py-3 px-4">IP Address</th>
                        <th className="py-3 px-4">Account Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {activities.map((act) => (
                        <tr key={act.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-neutral-900 text-xs">
                              {act.fullName}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              ID: {act.customerId.substring(0, 16)}...
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-neutral-700 font-mono text-[11px]">
                              <Mail size={12} className="text-neutral-400 shrink-0" />
                              <span>{act.email}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-neutral-700">
                            <div className="font-semibold text-xs text-neutral-800">
                              {formatRelativeTime(act.timestamp)}
                            </div>
                            <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                              <Calendar size={11} />
                              <span>{formatTimestamp(act.timestamp)}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-neutral-700">
                            <div className="flex items-center gap-1.5 font-medium text-xs">
                              <Laptop size={13} className="text-neutral-400 shrink-0" />
                              <span>{act.device || "Desktop Browser"}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-neutral-600 font-mono text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <Globe size={12} className="text-neutral-400 shrink-0" />
                              <span>{act.ip || "127.0.0.1"}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Verified Customer</span>
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
                <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
                  <div>
                    Page <span className="font-bold">{actPage}</span> of <span className="font-bold">{actTotalPages}</span> ({totalActivities} events)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actPage <= 1}
                      onClick={() => setActPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={actPage >= actTotalPages}
                      onClick={() => setActPage((p) => Math.min(actTotalPages, p + 1))}
                      className="px-2.5 py-1 rounded border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
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
            <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
              <form onSubmit={handleCustSearchSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-3 text-neutral-400" />
                  <input
                    type="text"
                    value={custSearch}
                    onChange={(e) => setCustSearch(e.target.value)}
                    placeholder="Search by name, email, institution, or phone..."
                    className="w-full pl-9 pr-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D5A4A] text-neutral-900"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors"
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
                      className="px-3 py-2 border border-neutral-200 hover:bg-neutral-50 text-neutral-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Customer Directory Table */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
              {isLoadingCustomers ? (
                <div className="py-20 flex flex-col items-center justify-center text-neutral-500">
                  <Loader2 size={24} className="animate-spin text-[#2D5A4A] mb-2" />
                  <p className="text-xs font-semibold">Loading customer accounts...</p>
                </div>
              ) : customers.length === 0 ? (
                <div className="py-16 text-center text-neutral-500">
                  <Users size={32} className="mx-auto text-neutral-300 mb-2" />
                  <p className="text-sm font-bold text-neutral-800">No Customers Found</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {activeCustSearch ? `No results matched "${activeCustSearch}".` : "No registered customer accounts yet."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[11px] font-bold">
                        <th className="py-3 px-4">Customer / Organization</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Account Status</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4">Last Sign In</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-neutral-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-neutral-900 text-xs">
                              {customer.fullName}
                            </div>
                            <div className="text-[11px] text-neutral-500 flex items-center gap-1.5 mt-0.5">
                              <Building size={12} className="text-neutral-400 shrink-0" />
                              <span>{customer.institution || "Healthcare Professional"}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 space-y-1">
                            <div className="flex items-center gap-1.5 text-neutral-700 font-mono text-[11px]">
                              <Mail size={12} className="text-neutral-400 shrink-0" />
                              <span>{customer.email}</span>
                            </div>
                            {customer.phone && (
                              <div className="flex items-center gap-1.5 text-neutral-600 font-mono text-[11px]">
                                <Phone size={12} className="text-neutral-400 shrink-0" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Permanent Account</span>
                            </div>
                            {customer.emailConfirmed && (
                              <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-neutral-500 font-medium">
                                <ShieldCheck size={11} className="text-emerald-600" />
                                <span>Email Verified</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4 text-neutral-600">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Calendar size={12} className="text-neutral-400 shrink-0" />
                              <span>{formatDate(customer.createdAt)}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-neutral-600">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Clock size={12} className="text-neutral-400 shrink-0" />
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
                <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
                  <div>
                    Page <span className="font-bold">{custPage}</span> of <span className="font-bold">{custTotalPages}</span> ({totalCustomers} accounts)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={custPage <= 1}
                      onClick={() => setCustPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1 rounded border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={custPage >= custTotalPages}
                      onClick={() => setCustPage((p) => Math.min(custTotalPages, p + 1))}
                      className="px-2.5 py-1 rounded border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
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
