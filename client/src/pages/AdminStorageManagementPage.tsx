import React, { useState, useEffect, useCallback } from "react";
import {
  Database,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  ShieldAlert,
  Server,
  Cloud,
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Activity,
  RotateCcw
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";

interface StorageProviderItem {
  dataType: string;
  provider: string;
  storageType: string;
  connectionStatus: "Connected" | "Error" | "Not Configured" | "Simulated / Sandbox";
  documentCount: number | string;
  storageUsed: string;
  health: string;
  collections?: string[];
  bandwidth?: string;
  isAuthoritative?: boolean;
}

interface OrphanedAsset {
  publicId: string;
  format: string;
  bytes: number;
  secureUrl: string;
  createdAt: string;
}

interface PendingOperation {
  opId: string;
  type: string;
  targetId: string;
  adminEmail: string;
  stage: string;
  startedAt: string;
  error?: string;
}

export const AdminStorageManagementPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inventory, setInventory] = useState<StorageProviderItem[]>([]);
  const [lastCheckTime, setLastCheckTime] = useState<string>("");
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Orphaned assets scanner state
  const [isScanningOrphans, setIsScanningOrphans] = useState(false);
  const [orphanedAssets, setOrphanedAssets] = useState<OrphanedAsset[]>([]);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [selectedOrphans, setSelectedOrphans] = useState<Set<string>>(new Set());
  const [isDeletingOrphans, setIsDeletingOrphans] = useState(false);
  const [orphanDeleteSuccess, setOrphanDeleteSuccess] = useState<string | null>(null);

  // Retry operation state
  const [retryingOpId, setRetryingOpId] = useState<string | null>(null);
  const [retryResult, setRetryResult] = useState<string | null>(null);

  // Fetch Storage Inventory
  const fetchInventory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await adminFetch("/api/admin/storage/inventory");
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setInventory(data.inventory || []);
        setLastCheckTime(new Date(data.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        setPendingOps(data.pendingOperations || []);
      } else {
        setErrorMessage(data.message || "Failed to load storage inventory.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error fetching storage inventory.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Scan Orphaned Assets
  const handleScanOrphanedAssets = async () => {
    setIsScanningOrphans(true);
    setScanMessage(null);
    setOrphanDeleteSuccess(null);
    setSelectedOrphans(new Set());

    try {
      const res = await adminFetch("/api/admin/storage/orphaned-assets");
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setOrphanedAssets(data.orphanedAssets || []);
        setScanMessage(
          `Scan completed: ${data.totalScanned} Cloudinary assets inspected against ${data.referencedCount} active database references. Found ${data.orphanedCount} unreferenced asset(s).`
        );
      } else {
        setScanMessage(data.message || "Scan failed. Please verify Cloudinary credentials.");
      }
    } catch (err: any) {
      setScanMessage(err.message || "Failed to connect to Cloudinary scanner.");
    } finally {
      setIsScanningOrphans(false);
    }
  };

  // Toggle selection for orphan deletion
  const toggleSelectOrphan = (publicId: string) => {
    setSelectedOrphans(prev => {
      const next = new Set(prev);
      if (next.has(publicId)) next.delete(publicId);
      else next.add(publicId);
      return next;
    });
  };

  const selectAllOrphans = () => {
    if (selectedOrphans.size === orphanedAssets.length) {
      setSelectedOrphans(new Set());
    } else {
      setSelectedOrphans(new Set(orphanedAssets.map(a => a.publicId)));
    }
  };

  // Permanently destroy selected orphaned assets
  const handleDeleteSelectedOrphans = async () => {
    if (selectedOrphans.size === 0) return;
    const confirmPrompt = window.confirm(
      `Are you sure you want to permanently destroy ${selectedOrphans.size} orphaned asset(s) from Cloudinary storage? This action is irreversible.`
    );
    if (!confirmPrompt) return;

    setIsDeletingOrphans(true);
    setOrphanDeleteSuccess(null);

    try {
      const res = await adminFetch("/api/admin/storage/delete-orphans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicIds: Array.from(selectedOrphans),
          confirmed: true
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setOrphanDeleteSuccess(`Successfully destroyed ${data.deletedCount} orphaned asset(s) from Cloudinary.`);
        // Remove deleted items from view
        setOrphanedAssets(prev => prev.filter(a => !selectedOrphans.has(a.publicId)));
        setSelectedOrphans(new Set());
        fetchInventory(true);
      } else {
        setScanMessage(data.message || "Failed to delete orphaned assets.");
      }
    } catch (err: any) {
      setScanMessage(err.message || "Network error deleting assets.");
    } finally {
      setIsDeletingOrphans(false);
    }
  };

  // Retry an interrupted deletion operation
  const handleRetryOperation = async (opId: string) => {
    setRetryingOpId(opId);
    setRetryResult(null);

    try {
      const res = await adminFetch(`/api/admin/storage/retry-operation/${encodeURIComponent(opId)}`, {
        method: "POST"
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setRetryResult(`Operation "${opId}" successfully retried and completed.`);
        fetchInventory(true);
      } else {
        setRetryResult(`Retry failed: ${data.message || "Unknown error"}`);
      }
    } catch (err: any) {
      setRetryResult(`Retry error: ${err.message}`);
    } finally {
      setRetryingOpId(null);
    }
  };

  return (
    <AdminLayout
      title="Storage Management"
      subtitle="Authoritative Inventory, Live Database Connections, Cloudinary Quota & Permanent Deletion Engine"
      breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Storage Management" }]}
      actions={
        <button
          type="button"
          onClick={() => fetchInventory(true)}
          disabled={isRefreshing || isLoading}
          className="flex items-center gap-2 px-3.5 py-2 bg-white border border-neutral-300 rounded-lg text-xs font-bold text-[#2D5A4A] hover:bg-neutral-50 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? "animate-spin text-[#7AA05A]" : "text-[#7AA05A]"} />
          <span>{isRefreshing ? "Checking Health..." : "Refresh Inventory"}</span>
        </button>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl p-6 border border-neutral-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#2D5A4A]/10 text-[#2D5A4A] flex items-center justify-center shrink-0">
              <Database size={24} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900 font-sans">
                DR.MEDEX Global Storage Architecture
              </h2>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed max-w-2xl">
                Real-time operational inventory connecting MongoDB Atlas, Cloudinary Media Cloud, Firebase Cloud Firestore, and Supabase GoTrue. Destructive permanent deletions are orchestrated safely with shared-asset protection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 bg-neutral-50 px-4 py-2.5 rounded-xl border border-neutral-200 text-xs">
            <Activity size={16} className="text-[#7AA05A]" />
            <div>
              <div className="text-[10px] uppercase font-mono font-bold text-neutral-500">Last Live Check</div>
              <div className="font-mono font-bold text-neutral-900">{lastCheckTime || "Connecting..."}</div>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-xs text-red-800">
            <AlertCircle size={18} className="text-[#C62828] shrink-0" />
            <div className="flex-1">{errorMessage}</div>
            <button
              onClick={() => fetchInventory(true)}
              className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 font-bold rounded-lg text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {/* ============================================================ */}
        {/* SECTION 1: LIVE STORAGE INVENTORY TABLE                      */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Server size={18} className="text-[#2D5A4A]" />
              <h3 className="font-bold text-sm text-neutral-900 uppercase tracking-wider font-mono">
                Storage Provider Inventory
              </h3>
            </div>
            <span className="text-[11px] font-mono text-neutral-500">
              {inventory.length} Configured Services
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-600 font-mono">
                  <th className="py-3 px-6">Data Category</th>
                  <th className="py-3 px-6">Actual Provider</th>
                  <th className="py-3 px-6">Storage Engine</th>
                  <th className="py-3 px-6">Connection Status</th>
                  <th className="py-3 px-6">Records / Assets</th>
                  <th className="py-3 px-6">Storage Usage</th>
                  <th className="py-3 px-6">Health & Diagnostics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-500">
                      <div className="inline-flex items-center gap-2 font-mono text-xs">
                        <RefreshCw size={16} className="animate-spin text-[#7AA05A]" />
                        <span>Querying storage providers in real-time...</span>
                      </div>
                    </td>
                  </tr>
                ) : inventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500 font-mono text-xs">
                      No storage providers currently reported.
                    </td>
                  </tr>
                ) : (
                  inventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="py-3.5 px-6 font-bold text-neutral-900">
                        <div className="flex items-center gap-2">
                          <Layers size={14} className="text-neutral-500" />
                          <span>{item.dataType}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 font-medium text-neutral-800">
                        <div className="flex items-center gap-1.5">
                          {item.provider.includes("MongoDB") ? (
                            <Database size={14} className="text-[#2D5A4A]" />
                          ) : item.provider.includes("Cloudinary") ? (
                            <Cloud size={14} className="text-[#7AA05A]" />
                          ) : (
                            <Server size={14} className="text-neutral-600" />
                          )}
                          <span>{item.provider}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6 font-mono text-[11px] text-neutral-600">
                        {item.storageType}
                      </td>

                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono ${
                            item.connectionStatus === "Connected"
                              ? "bg-emerald-50 text-[#2D5A4A] border border-emerald-200"
                              : item.connectionStatus === "Simulated / Sandbox"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-red-50 text-[#C62828] border border-red-200"
                          }`}
                        >
                          {item.connectionStatus === "Connected" ? (
                            <CheckCircle2 size={12} className="text-[#2D5A4A]" />
                          ) : item.connectionStatus === "Simulated / Sandbox" ? (
                            <AlertTriangle size={12} className="text-amber-600" />
                          ) : (
                            <XCircle size={12} className="text-[#C62828]" />
                          )}
                          <span>{item.connectionStatus}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-6 font-mono font-bold text-neutral-900">
                        {typeof item.documentCount === "number"
                          ? item.documentCount.toLocaleString()
                          : item.documentCount}
                      </td>

                      <td className="py-3.5 px-6 font-mono text-neutral-700">
                        {item.storageUsed}
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="text-[11px] font-mono text-neutral-600 flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.connectionStatus === "Connected"
                                ? "bg-[#7AA05A]"
                                : item.connectionStatus === "Simulated / Sandbox"
                                ? "bg-amber-500"
                                : "bg-[#C62828]"
                            }`}
                          />
                          <span className="truncate max-w-xs">{item.health}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============================================================ */}
        {/* SECTION 2: ORPHANED CLOUDINARY ASSETS SCANNER                */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Cloud size={18} className="text-[#7AA05A]" />
                <h3 className="font-bold text-sm text-neutral-900 uppercase tracking-wider font-mono">
                  Cloudinary Orphaned Media Scanner
                </h3>
              </div>
              <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                Scans Cloudinary for stored images having zero active references in MongoDB products or historical orders. Allows safe, confirmed permanent cleanup.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleScanOrphanedAssets}
                disabled={isScanningOrphans}
                className="flex items-center gap-2 px-4 py-2 bg-[#2D5A4A] hover:bg-[#1F4034] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={isScanningOrphans ? "animate-spin" : ""} />
                <span>{isScanningOrphans ? "Scanning Cloudinary..." : "Scan Orphaned Media"}</span>
              </button>

              {orphanedAssets.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedOrphans}
                  disabled={isDeletingOrphans || selectedOrphans.size === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-[#C62828] hover:bg-[#B71C1C] text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  <span>
                    {isDeletingOrphans
                      ? "Destroying Assets..."
                      : `Destroy Selected (${selectedOrphans.size})`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {scanMessage && (
            <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-700 font-mono">
              {scanMessage}
            </div>
          )}

          {orphanDeleteSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-mono">
              <CheckCircle2 size={16} className="text-[#2D5A4A]" />
              <span>{orphanDeleteSuccess}</span>
            </div>
          )}

          {/* Orphaned Assets List */}
          {orphanedAssets.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-neutral-600 px-1 font-mono">
                <label className="flex items-center gap-2 cursor-pointer font-bold">
                  <input
                    type="checkbox"
                    checked={selectedOrphans.size === orphanedAssets.length && orphanedAssets.length > 0}
                    onChange={selectAllOrphans}
                    className="rounded text-[#2D5A4A] focus:ring-[#7AA05A]"
                  />
                  <span>Select All ({orphanedAssets.length} unreferenced assets)</span>
                </label>
                <span>{selectedOrphans.size} selected for permanent destruction</span>
              </div>

              <div className="max-h-72 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-200">
                {orphanedAssets.map((asset) => (
                  <div
                    key={asset.publicId}
                    className="p-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedOrphans.has(asset.publicId)}
                        onChange={() => toggleSelectOrphan(asset.publicId)}
                        className="rounded text-[#2D5A4A] focus:ring-[#7AA05A] cursor-pointer"
                      />
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center shrink-0">
                        {asset.secureUrl ? (
                          <img
                            src={asset.secureUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as any).style.display = "none";
                            }}
                          />
                        ) : (
                          <ImageIcon size={18} className="text-neutral-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-neutral-900">
                          {asset.publicId}
                        </div>
                        <div className="text-[10px] font-mono text-neutral-500">
                          Format: {asset.format.toUpperCase()} | Size: {(asset.bytes / 1024).toFixed(1)} KB | Uploaded: {new Date(asset.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <a
                      href={asset.secureUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-neutral-700 p-1.5"
                      title="Inspect asset"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* SECTION 3: CRASH RECOVERY & PENDING OPERATIONS MONITOR       */}
        {/* ============================================================ */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
            <div className="flex items-center gap-2">
              <ShieldAlert size={18} className="text-amber-600" />
              <h3 className="font-bold text-sm text-neutral-900 uppercase tracking-wider font-mono">
                Crash Recovery & Deletion Operations
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-500">
              {pendingOps.length} Active / Interrupted
            </span>
          </div>

          {retryResult && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs font-mono text-neutral-800">
              {retryResult}
            </div>
          )}

          {pendingOps.length === 0 ? (
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-[#2D5A4A]">
              <ShieldCheck size={18} className="text-[#2D5A4A] shrink-0" />
              <div>
                <strong>Zero pending or interrupted deletions.</strong> All recent permanent deletion operations have completed and verified against MongoDB Atlas and Cloudinary.
              </div>
            </div>
          ) : (
            <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-200 overflow-hidden">
              {pendingOps.map((op) => (
                <div key={op.opId} className="p-4 flex items-center justify-between hover:bg-neutral-50 text-xs">
                  <div>
                    <div className="font-mono font-bold text-neutral-900">
                      [{op.type}] Target ID: {op.targetId}
                    </div>
                    <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                      Stage: <span className="text-amber-800 font-bold">{op.stage}</span> | Started: {new Date(op.startedAt).toLocaleTimeString()} by {op.adminEmail}
                    </div>
                    {op.error && (
                      <div className="text-[11px] text-red-600 font-mono mt-1">
                        Error: {op.error}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRetryOperation(op.opId)}
                    disabled={retryingOpId === op.opId}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2D5A4A] hover:bg-[#1F4034] text-white rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw size={12} className={retryingOpId === op.opId ? "animate-spin" : ""} />
                    <span>{retryingOpId === op.opId ? "Retrying..." : "Safe Retry"}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};
export default AdminStorageManagementPage;
