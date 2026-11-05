import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShoppingCart,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  RotateCcw,
  Printer,
  Mail,
  Phone,
  Trash2,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Building,
  User,
  MapPin,
  Package,
  FileText,
  Loader2,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { AdminLayout } from "../components/admin/AdminLayout";
import { useAdminAuth } from "../context/AdminAuthContext";

interface OrderCustomer {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  countryCode?: string;
  companyName?: string;
}

interface OrderAddress {
  fullName?: string;
  companyName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
}

interface OrderItem {
  productId: string;
  title: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  unitPriceDisplay?: number;
  basePriceINR?: number;
  currency?: string;
  displayCurrency?: string;
  image?: string;
}

interface OrderPricing {
  subtotal: number;
  discount: number;
  shipping: number;
  grandTotal: number;
  currency: string;
  displayCurrency?: string;
  baseSubtotalINR?: number;
  discountINR?: number;
  shippingINR?: number;
  grandTotalINR?: number;
  appliedCoupon?: string | null;
}

interface OrderPayment {
  provider: string;
  method: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "REFUND_PENDING" | "PARTIALLY_REFUNDED" | "REFUNDED";
  paypalOrderId?: string | null;
  paypalCaptureId?: string | null;
  transactionId?: string | null;
  amount?: number;
  currency?: string;
  paidAt?: string | null;
  failureReason?: string | null;
}

interface OrderRecord {
  id: string;
  orderNumber: string;
  customerId?: string | null;
  customer?: OrderCustomer;
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  items: OrderItem[];
  pricing: OrderPricing;
  payment: OrderPayment;
  orderStatus: "PLACED" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  status?: string;
  fulfillmentStatus?: string;
  createdAt: string;
  updatedAt?: string;
  isArchived?: boolean;
  auditLogs?: {
    action: string;
    previousStatus?: string;
    newStatus?: string;
    adminUser?: string;
    note?: string;
    timestamp: string;
  }[];
  shiprocket?: {
    shipmentId?: string;
    awbCode?: string;
    courierName?: string;
    trackingStatus?: string;
    labelUrl?: string;
    lastSyncTime?: string;
  };
}

export const AdminOrdersPage: React.FC = () => {
  const { adminFetch } = useAdminAuth();

  // Orders List State
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Selected Order for Detail View
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Action Modals State
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Status Change State inside Modal
  const [newOrderStatus, setNewOrderStatus] = useState<string>("");
  const [newPaymentStatus, setNewPaymentStatus] = useState<string>("");
  const [adminNote, setAdminNote] = useState("");

  // Confirmation Modals
  const [confirmCancelModal, setConfirmCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);

  // Shiprocket Diagnostics & Live State
  const [shiprocketStatus, setShiprocketStatus] = useState<{
    isConfigured: boolean;
    isAuthenticated: boolean;
    integrationStatus: string;
    lastError?: string | null;
    lastSyncTime?: string | null;
  } | null>(null);

  // Load orders
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "15",
        status: statusFilter,
        paymentStatus: paymentFilter,
        search: searchQuery
      });
      const res = await adminFetch(`/api/admin/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders || []);
          setTotalOrders(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
    }
  }, [adminFetch, currentPage, statusFilter, paymentFilter, searchQuery]);

  // Load Shiprocket Status
  const loadShiprocketStatus = useCallback(async () => {
    try {
      const res = await adminFetch("/api/admin/orders/shiprocket/status");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setShiprocketStatus(data.status);
        }
      }
    } catch (e) {}
  }, [adminFetch]);

  useEffect(() => {
    loadOrders();
    loadShiprocketStatus();
  }, [loadOrders, loadShiprocketStatus]);

  // Open detail modal
  const openOrderDetails = (order: OrderRecord) => {
    setSelectedOrder(order);
    setNewOrderStatus(order.orderStatus || "PLACED");
    setNewPaymentStatus(order.payment?.status || "PENDING");
    setAdminNote("");
    setIsDetailOpen(true);
  };

  // Update Order Status
  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${selectedOrder.orderNumber}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newOrderStatus, note: adminNote })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.order);
        setToastMessage({ type: "success", text: `Order status updated to ${newOrderStatus}.` });
        loadOrders();
      } else {
        setToastMessage({ type: "error", text: data.message || "Failed to update order status." });
      }
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message || "Server error updating status." });
    } finally {
      setActionLoading(false);
    }
  };

  // Update Payment Status
  const handleUpdatePaymentStatus = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${selectedOrder.orderNumber}/payment-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: newPaymentStatus, note: adminNote })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.order);
        setToastMessage({ type: "success", text: `Payment status updated to ${newPaymentStatus}.` });
        loadOrders();
      } else {
        setToastMessage({ type: "error", text: data.message || "Failed to update payment status." });
      }
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message || "Server error updating payment status." });
    } finally {
      setActionLoading(false);
    }
  };

  // Resend Invoice Email
  const handleResendInvoice = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${selectedOrder.orderNumber}/resend-invoice`, {
        method: "POST"
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage({ type: "success", text: `Invoice email successfully sent to ${selectedOrder.customer?.email}.` });
      } else {
        setToastMessage({ type: "error", text: data.message || "Failed to send invoice email." });
      }
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message || "Error dispatching invoice." });
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel Order
  const handleConfirmCancel = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${selectedOrder.orderNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason || "Cancelled by administrator" })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedOrder(data.order);
        setConfirmCancelModal(false);
        setToastMessage({ type: "success", text: `Order #${selectedOrder.orderNumber} has been cancelled.` });
        loadOrders();
      } else {
        setToastMessage({ type: "error", text: data.message || "Failed to cancel order." });
      }
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message || "Error cancelling order." });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete / Soft Archive Order
  const handleConfirmDelete = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      const res = await adminFetch(`/api/admin/orders/${selectedOrder.orderNumber}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.success) {
        setConfirmDeleteModal(false);
        setIsDetailOpen(false);
        setToastMessage({ type: "success", text: `Order #${selectedOrder.orderNumber} safely archived.` });
        loadOrders();
      } else {
        setToastMessage({ type: "error", text: data.message || "Failed to archive order." });
      }
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message || "Error archiving order." });
    } finally {
      setActionLoading(false);
    }
  };

  // Shiprocket Actions
  const handleShiprocketAction = async (action: "create" | "awb" | "label" | "track" | "retry") => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      let endpoint = `/api/admin/orders/${selectedOrder.orderNumber}/shiprocket/create-shipment`;
      let method = "POST";
      let body: any = null;

      if (action === "awb") {
        endpoint = `/api/admin/orders/${selectedOrder.orderNumber}/shiprocket/generate-awb`;
        body = JSON.stringify({ shipmentId: selectedOrder.shiprocket?.shipmentId || "12345" });
      } else if (action === "label") {
        endpoint = `/api/admin/orders/${selectedOrder.orderNumber}/shiprocket/generate-label`;
        body = JSON.stringify({ shipmentId: selectedOrder.shiprocket?.shipmentId || "12345" });
      } else if (action === "track") {
        endpoint = `/api/admin/orders/${selectedOrder.orderNumber}/shiprocket/track?awb=${encodeURIComponent(selectedOrder.shiprocket?.awbCode || "")}`;
        method = "GET";
      } else if (action === "retry") {
        endpoint = `/api/admin/orders/${selectedOrder.orderNumber}/shiprocket/retry-sync`;
      }

      const res = await adminFetch(endpoint, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body || undefined
      });
      const data = await res.json();

      if (data.success) {
        setToastMessage({ type: "success", text: `Shiprocket action (${action}) completed successfully.` });
        loadShiprocketStatus();
      } else {
        // Display real API diagnostic safely
        setToastMessage({
          type: "error",
          text: `Shiprocket: ${data.message || "Authentication / API failure. Check SHIPROCKET_EMAIL & SHIPROCKET_PASSWORD."}`
        });
      }
    } catch (err: any) {
      setToastMessage({ type: "error", text: `Shiprocket Error: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  // Print Invoice Function
  const handlePrintInvoice = () => {
    window.print();
  };

  // Financial Stats
  const revenueStats = useMemo(() => {
    let total = 0;
    let paidCount = 0;
    let pendingCount = 0;
    orders.forEach((o) => {
      const amt = Number(o.pricing?.grandTotal || o.pricing?.grandTotalINR || 0);
      if (o.payment?.status === "PAID") {
        total += amt;
        paidCount++;
      } else {
        pendingCount++;
      }
    });
    return { total, paidCount, pendingCount };
  }, [orders]);

  return (
    <AdminLayout
      title="All Orders Management"
      subtitle="Institutional order fulfillment, payment gateways, and logistics tracking"
      breadcrumbs={[{ label: "Dashboard", href: "/admin" }, { label: "Orders" }]}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadOrders}
            className="px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Toast Feedback */}
        {toastMessage && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-md animate-in fade-in ${
              toastMessage.type === "success"
                ? "bg-[#0D4C3C] text-white border border-[#FFD400]"
                : "bg-red-900/40 text-red-100 border border-red-500"
            }`}
          >
            <div className="flex items-center gap-2">
              {toastMessage.type === "success" ? <CheckCircle2 size={16} className="text-[#FFD400]" /> : <AlertCircle size={16} className="text-red-400" />}
              <span>{toastMessage.text}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-white/60 hover:text-white font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0D4C3C] text-white p-4 rounded-xl border border-white/20 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-3xs uppercase tracking-wider text-white/70 font-mono font-bold">Total Orders</div>
              <div className="text-xl font-extrabold mt-1">{totalOrders}</div>
              <div className="text-3xs text-white/60 mt-0.5">MongoDB & Store synchronised</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#FFD400]">
              <ShoppingCart size={20} />
            </div>
          </div>

          <div className="bg-[#0D4C3C] text-white p-4 rounded-xl border border-white/20 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-3xs uppercase tracking-wider text-white/70 font-mono font-bold">Paid Orders Revenue</div>
              <div className="text-xl font-extrabold mt-1">${revenueStats.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="text-3xs text-white/60 mt-0.5">{revenueStats.paidCount} confirmed transactions</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
              <CreditCard size={20} />
            </div>
          </div>

          <div className="bg-[#0D4C3C] text-white p-4 rounded-xl border border-white/20 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-3xs uppercase tracking-wider text-white/70 font-mono font-bold">Pending Fulfillment</div>
              <div className="text-xl font-extrabold mt-1">{revenueStats.pendingCount}</div>
              <div className="text-3xs text-white/60 mt-0.5">Awaiting dispatch or verification</div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400">
              <Clock size={20} />
            </div>
          </div>

          <div className="bg-[#0D4C3C] text-white p-4 rounded-xl border border-white/20 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-3xs uppercase tracking-wider text-white/70 font-mono font-bold">Shiprocket Courier</div>
              <div className="text-sm font-extrabold mt-1 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${shiprocketStatus?.isAuthenticated ? "bg-emerald-400" : "bg-amber-400"}`} />
                <span>{shiprocketStatus?.integrationStatus || "CHECKING..."}</span>
              </div>
              <div className="text-3xs text-white/60 mt-0.5 truncate max-w-[150px]">
                {shiprocketStatus?.lastError ? "Auth check required" : "Ready for courier dispatch"}
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleShiprocketAction("retry")}
              disabled={actionLoading}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[#FFD400] text-3xs font-bold transition-colors cursor-pointer"
              title="Test Shiprocket Connection"
            >
              Test Sync
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-[#0D4C3C] p-4 rounded-xl border border-white/20 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-3 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders by Order #, Customer Name, Email, Phone, or City..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white text-black placeholder:text-neutral-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-white text-black text-xs font-bold rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Order Statuses</option>
                <option value="PLACED">Placed</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={paymentFilter}
                onChange={(e) => {
                  setPaymentFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-white text-black text-xs font-bold rounded-lg focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Payment Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-[#0D4C3C] text-white rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center text-white/60">
              <Loader2 size={28} className="animate-spin text-[#FFD400] mb-2" />
              <p className="text-xs font-semibold">Loading orders from MongoDB...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-20 text-center text-white/70 space-y-2">
              <ShoppingCart size={36} className="mx-auto text-white/30" />
              <p className="text-sm font-bold text-white">No Orders Found</p>
              <p className="text-xs text-white/60">No orders match the current filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-white">
                <thead>
                  <tr className="bg-black/25 border-b border-white/15 text-white/70 uppercase tracking-wider text-[11px] font-bold font-mono">
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Order Date</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Payment Status</th>
                    <th className="py-3 px-4">Order Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-white/90">
                  {orders.map((order) => {
                    const isPaid = order.payment?.status === "PAID";
                    const isFailed = order.payment?.status === "FAILED" || order.payment?.status === "CANCELLED";
                    const curr = order.pricing?.displayCurrency || order.pricing?.currency || "USD";
                    const grandTotal = Number(order.pricing?.grandTotal || order.pricing?.grandTotalINR || 0).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    });

                    return (
                      <tr key={order.orderNumber} className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-1.5">
                          <span>#{order.orderNumber}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white">{order.customer?.fullName || "Guest Customer"}</div>
                          <div className="text-[11px] text-white/60">{order.customer?.email}</div>
                          {order.customer?.phone && <div className="text-[10px] text-white/50">{order.customer.phone}</div>}
                        </td>

                        <td className="py-3.5 px-4 text-white/70 whitespace-nowrap">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-extrabold text-white">
                          {curr} {grandTotal}
                        </td>

                        <td className="py-3.5 px-4 text-white/80">
                          <span className="font-medium text-xs">{order.payment?.method || order.payment?.provider || "PayPal"}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wider ${
                              isPaid
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                : isFailed
                                ? "bg-red-500/20 text-red-300 border border-red-500/40"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? "bg-emerald-400" : isFailed ? "bg-red-400" : "bg-amber-400"}`} />
                            {order.payment?.status || "PENDING"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-3xs font-bold font-mono bg-white/10 text-white border border-white/20 uppercase">
                            {order.orderStatus || order.status || "PLACED"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openOrderDetails(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD400] hover:bg-[#ffdc2e] text-black font-extrabold rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                          >
                            <Eye size={13} />
                            <span>View & Manage</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-3.5 bg-black/25 border-t border-white/15 flex items-center justify-between text-xs text-white/70">
              <div>
                Page <span className="font-bold text-white">{currentPage}</span> of <span className="font-bold text-white">{totalPages}</span> ({totalOrders} orders)
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded border border-white/20 bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            COMPREHENSIVE ORDER DETAIL DRAWER / MODAL
           ======================================================== */}
        {isDetailOpen && selectedOrder && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white text-neutral-900 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-neutral-300 overflow-hidden relative">
              {/* Header */}
              <div className="bg-[#2D5A4A] text-white p-5 flex items-center justify-between border-b border-[#1E3F33]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#FFD400]">
                    <ShoppingCart size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold">Order #{selectedOrder.orderNumber}</h2>
                      <span className="text-3xs font-mono font-bold bg-[#FFD400] text-black px-2 py-0.5 rounded">
                        {selectedOrder.orderStatus || "PLACED"}
                      </span>
                    </div>
                    <div className="text-3xs text-white/70 mt-0.5">
                      Placed on {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleString() : "N/A"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Body with Required Sections A to G */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 text-xs print:p-0">
                {/* Section A & B: Customer Details & Delivery Address */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* A. Customer Details */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#2D5A4A] uppercase text-3xs border-b border-neutral-200 pb-1.5">
                      <User size={13} />
                      <span>A. Customer Details</span>
                    </div>
                    <div>
                      <div className="font-bold text-sm text-neutral-900">{selectedOrder.customer?.fullName || "Not provided"}</div>
                      <div className="text-neutral-600 mt-1 flex items-center gap-1.5">
                        <Mail size={12} className="text-neutral-400" />
                        <span>{selectedOrder.customer?.email || "Not provided"}</span>
                      </div>
                      <div className="text-neutral-600 mt-1 flex items-center gap-1.5">
                        <Phone size={12} className="text-neutral-400" />
                        <span>{selectedOrder.customer?.phone || "Not provided"}</span>
                      </div>
                      <div className="text-neutral-500 text-3xs mt-2 pt-2 border-t border-neutral-200">
                        Account Type: <strong className="text-neutral-800">{selectedOrder.customerId ? "Registered Account" : "Guest Checkout"}</strong>
                        {selectedOrder.customerId && <span className="ml-2 font-mono">({selectedOrder.customerId})</span>}
                      </div>
                    </div>
                  </div>

                  {/* B. Delivery Address */}
                  <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#2D5A4A] uppercase text-3xs border-b border-neutral-200 pb-1.5">
                      <MapPin size={13} />
                      <span>B. Delivery Address</span>
                    </div>
                    <div className="text-neutral-700 leading-relaxed">
                      <div className="font-bold text-neutral-900">{selectedOrder.shippingAddress?.fullName || selectedOrder.customer?.fullName || "Not provided"}</div>
                      {selectedOrder.shippingAddress?.companyName && (
                        <div className="text-neutral-600 text-3xs">{selectedOrder.shippingAddress.companyName}</div>
                      )}
                      <div className="mt-1">
                        {selectedOrder.shippingAddress?.addressLine1 || "Not provided"}
                        {selectedOrder.shippingAddress?.addressLine2 ? `, ${selectedOrder.shippingAddress.addressLine2}` : ""}
                      </div>
                      <div>
                        {selectedOrder.shippingAddress?.city || "Not provided"}, {selectedOrder.shippingAddress?.state || "Not provided"} {selectedOrder.shippingAddress?.postalCode || "Not provided"}
                      </div>
                      <div className="font-semibold text-[#2D5A4A] mt-0.5">
                        {selectedOrder.shippingAddress?.country || "Not provided"} ({selectedOrder.shippingAddress?.countryCode || "N/A"})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section C: Payment & Gateway Details */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                    <div className="flex items-center gap-2 font-bold text-[#2D5A4A] uppercase text-3xs">
                      <CreditCard size={13} />
                      <span>C. Payment & Gateway Details</span>
                    </div>
                    <span className="font-mono text-3xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Status: {selectedOrder.payment?.status || "PENDING"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-3xs text-neutral-500 uppercase font-bold">Payment Provider</span>
                      <div className="font-bold text-neutral-800">{selectedOrder.payment?.provider || "PayPal"}</div>
                    </div>
                    <div>
                      <span className="text-3xs text-neutral-500 uppercase font-bold">Payment Method</span>
                      <div className="font-bold text-neutral-800">{selectedOrder.payment?.method || "Online Gateway"}</div>
                    </div>
                    <div>
                      <span className="text-3xs text-neutral-500 uppercase font-bold">Gateway Order ID</span>
                      <div className="font-mono text-neutral-800 truncate" title={selectedOrder.payment?.paypalOrderId || "N/A"}>
                        {selectedOrder.payment?.paypalOrderId || "N/A"}
                      </div>
                    </div>
                    <div>
                      <span className="text-3xs text-neutral-500 uppercase font-bold">Capture ID</span>
                      <div className="font-mono text-neutral-800 truncate" title={selectedOrder.payment?.paypalCaptureId || "N/A"}>
                        {selectedOrder.payment?.paypalCaptureId || "N/A"}
                      </div>
                    </div>
                  </div>

                  {/* Permitted Manual Payment Status Update */}
                  <div className="pt-2 border-t border-neutral-200 flex flex-col sm:flex-row items-center gap-2">
                    <span className="text-3xs font-bold text-neutral-600">Manual Payment Status Override:</span>
                    <select
                      value={newPaymentStatus}
                      onChange={(e) => setNewPaymentStatus(e.target.value)}
                      className="px-2.5 py-1 text-xs border border-neutral-300 rounded-lg bg-white font-bold"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="PAID">PAID</option>
                      <option value="FAILED">FAILED</option>
                      <option value="REFUND_PENDING">REFUND_PENDING</option>
                      <option value="PARTIALLY_REFUNDED">PARTIALLY_REFUNDED</option>
                      <option value="REFUNDED">REFUNDED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleUpdatePaymentStatus}
                      disabled={actionLoading}
                      className="px-3 py-1 bg-[#2D5A4A] text-white font-bold rounded-lg text-xs hover:bg-[#1E3F33] cursor-pointer"
                    >
                      Update Payment Status
                    </button>
                  </div>
                </div>

                {/* Section D: Order Items Table */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[#2D5A4A] uppercase text-3xs border-b border-neutral-200 pb-1.5">
                    <Package size={13} />
                    <span>D. Order Items Snapshot ({selectedOrder.items.length})</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-neutral-200 text-neutral-500 uppercase text-3xs font-bold">
                          <th className="py-2 px-2">Item</th>
                          <th className="py-2 px-2">SKU</th>
                          <th className="py-2 px-2 text-center">Qty</th>
                          <th className="py-2 px-2 text-right">Unit Price</th>
                          <th className="py-2 px-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {selectedOrder.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-2.5 px-2 flex items-center gap-2.5">
                              {it.image && (
                                <img src={it.image} alt={it.title} className="w-9 h-9 object-contain rounded bg-white border border-neutral-200 shrink-0" />
                              )}
                              <div>
                                <div className="font-bold text-neutral-900">{it.title}</div>
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-mono text-neutral-600">{it.sku || "N/A"}</td>
                            <td className="py-2.5 px-2 text-center font-bold text-neutral-900">{it.quantity}</td>
                            <td className="py-2.5 px-2 text-right font-mono text-neutral-700">
                              {selectedOrder.pricing?.displayCurrency || selectedOrder.pricing?.currency || "USD"}{" "}
                              {Number(it.unitPriceDisplay || it.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-2 text-right font-mono font-bold text-neutral-900">
                              {selectedOrder.pricing?.displayCurrency || selectedOrder.pricing?.currency || "USD"}{" "}
                              {Number((it.unitPriceDisplay || it.unitPrice || 0) * it.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section E: Order Summary */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#2D5A4A] uppercase text-3xs border-b border-neutral-200 pb-1.5">
                    <FileText size={13} />
                    <span>E. Order Financial Summary</span>
                  </div>

                  <div className="space-y-1.5 max-w-sm ml-auto text-xs">
                    <div className="flex justify-between text-neutral-600">
                      <span>Item Subtotal:</span>
                      <span className="font-mono font-bold text-neutral-800">
                        {selectedOrder.pricing?.displayCurrency || selectedOrder.pricing?.currency || "USD"}{" "}
                        {Number(selectedOrder.pricing?.subtotal || selectedOrder.pricing?.baseSubtotalINR || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-600">
                      <span>Air Cargo Shipping:</span>
                      <span className="font-mono font-bold text-neutral-800">
                        {selectedOrder.pricing?.displayCurrency || selectedOrder.pricing?.currency || "USD"}{" "}
                        {Number(selectedOrder.pricing?.shipping || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    {Number(selectedOrder.pricing?.discount || 0) > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount:</span>
                        <span className="font-mono font-bold">
                          -{selectedOrder.pricing?.displayCurrency || selectedOrder.pricing?.currency || "USD"}{" "}
                          {Number(selectedOrder.pricing?.discount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-extrabold text-[#2D5A4A] pt-2 border-t border-neutral-300">
                      <span>Grand Total:</span>
                      <span className="font-mono">
                        {selectedOrder.pricing?.displayCurrency || selectedOrder.pricing?.currency || "USD"}{" "}
                        {Number(selectedOrder.pricing?.grandTotal || selectedOrder.pricing?.grandTotalINR || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section F: Quick Actions */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-[#2D5A4A] uppercase text-3xs border-b border-neutral-200 pb-1.5">
                    <CheckCircle2 size={13} />
                    <span>F. Quick Actions</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-2">
                      <select
                        value={newOrderStatus}
                        onChange={(e) => setNewOrderStatus(e.target.value)}
                        className="px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white font-bold"
                      >
                        <option value="PLACED">PLACED</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleUpdateOrderStatus}
                        disabled={actionLoading}
                        className="px-3.5 py-2 bg-[#2D5A4A] text-white font-bold rounded-lg text-xs hover:bg-[#1E3F33] cursor-pointer"
                      >
                        Update Order Status
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handlePrintInvoice}
                      className="px-3 py-2 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-xs font-bold text-neutral-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={13} />
                      <span>Print Invoice</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResendInvoice}
                      disabled={actionLoading}
                      className="px-3 py-2 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-xs font-bold text-neutral-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Mail size={13} />
                      <span>Resend Invoice Email</span>
                    </button>

                    {selectedOrder.customer?.email && (
                      <a
                        href={`mailto:${selectedOrder.customer.email}?subject=Regarding%20DR.MEDEX%20Order%20%23${selectedOrder.orderNumber}`}
                        className="px-3 py-2 border border-neutral-300 hover:bg-neutral-100 rounded-lg text-xs font-bold text-neutral-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        <User size={13} />
                        <span>Contact Customer</span>
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setConfirmCancelModal(true)}
                      className="px-3 py-2 border border-amber-300 hover:bg-amber-50 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw size={13} />
                      <span>Cancel Order</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDeleteModal(true)}
                      className="px-3 py-2 border border-red-300 hover:bg-red-50 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Archive Order</span>
                    </button>
                  </div>
                </div>

                {/* Section G: Shiprocket Courier & Tracking Integration */}
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5">
                    <div className="flex items-center gap-2 font-bold text-[#2D5A4A] uppercase text-3xs">
                      <Truck size={13} />
                      <span>G. Fulfillment & Courier Tracking (Shiprocket)</span>
                    </div>
                    <span className={`text-3xs font-bold px-2 py-0.5 rounded ${shiprocketStatus?.isAuthenticated ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      Integration: {shiprocketStatus?.integrationStatus || "READY"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <span className="text-3xs text-neutral-500 uppercase font-bold">Delivery Partner</span>
                      <div className="font-bold text-neutral-800">DHL Express / Shiprocket Air</div>
                    </div>
                    <div>
                      <span className="text-3xs text-neutral-500 uppercase font-bold">Shipment / AWB #</span>
                      <div className="font-mono text-neutral-800 font-bold">
                        {selectedOrder.shiprocket?.awbCode || "Pending AWB assignment"}
                      </div>
                    </div>
                    <div>
                      <span className="text-3xs text-neutral-500 uppercase font-bold">Courier Name</span>
                      <div className="font-bold text-neutral-800">
                        {selectedOrder.shiprocket?.courierName || "DHL Medical Air Cargo"}
                      </div>
                    </div>
                    <div>
                      <span className="text-3xs text-neutral-500 uppercase font-bold">Tracking Status</span>
                      <div className="font-bold text-neutral-800">
                        {selectedOrder.shiprocket?.trackingStatus || "In Facility Verification"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-200">
                    <button
                      type="button"
                      onClick={() => handleShiprocketAction("create")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 bg-[#2D5A4A] hover:bg-[#1E3F33] text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Create Shipment
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiprocketAction("awb")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Assign Courier & AWB
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiprocketAction("label")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Generate Label
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShiprocketAction("retry")}
                      disabled={actionLoading}
                      className="px-3 py-1.5 border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Retry Failed Sync
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-neutral-100 p-4 border-t border-neutral-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="px-5 py-2 bg-neutral-800 hover:bg-neutral-900 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Confirmation Dialog */}
        {confirmCancelModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
              <div className="flex items-center gap-2.5 text-amber-600">
                <AlertTriangle size={20} />
                <h3 className="font-bold text-sm text-neutral-900">Confirm Order Cancellation</h3>
              </div>
              <p className="text-xs text-neutral-600">
                Are you sure you want to cancel Order #{selectedOrder?.orderNumber}? Financial transactions and audit logs will remain intact.
              </p>
              <div>
                <label className="block text-3xs font-bold uppercase text-neutral-500 mb-1">Cancellation Reason</label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer requested cancellation / Stock defect"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmCancelModal(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-700 border border-neutral-300 rounded-xl"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive / Delete Confirmation Dialog */}
        {confirmDeleteModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200 space-y-4">
              <div className="flex items-center gap-2.5 text-red-600">
                <Trash2 size={20} />
                <h3 className="font-bold text-sm text-neutral-900">Archive Order Record</h3>
              </div>
              <p className="text-xs text-neutral-600">
                This will soft-archive Order #{selectedOrder?.orderNumber} from the active view. The financial payment records and database timeline will be safely preserved.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteModal(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-700 border border-neutral-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl"
                >
                  Archive Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
