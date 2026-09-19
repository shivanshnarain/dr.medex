import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
  Building,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Eye,
  RefreshCw,
  Search,
  Globe,
  Tag,
  ShieldCheck
} from "lucide-react";
import { Product, Order, QuoteRequest, Category, Country } from "../types";
import { useCurrency } from "../context/CurrencyContext";

export const AdminDashboardPage: React.FC = () => {
  const { formatPrice, countries, exchangeRates } = useCurrency();

  const [activeTab, setActiveTab] = useState<"metrics" | "products" | "orders" | "quotes" | "coupons" | "currency">("metrics");
  const [metrics, setMetrics] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Product Modal Form
  const [showProductModal, setShowProductModal] = useState(false);
  const [newProdTitle, setNewProdTitle] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("ot-lights");
  const [newProdPrice, setNewProdPrice] = useState(2200);
  const [newProdStock, setNewProdStock] = useState(15);
  const [newProdDesc, setNewProdDesc] = useState("");
  const [newProdImage, setNewProdImage] = useState("https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=80");

  // Edit Quote State
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [quoteStatus, setQuoteStatus] = useState("QUOTED");
  const [quotedAmount, setQuotedAmount] = useState<number>(0);
  const [adminNotes, setAdminNotes] = useState("");

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [metRes, prodRes, ordRes, quoRes, catRes, coupRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/products"),
        fetch("/api/orders"),
        fetch("/api/quotes"),
        fetch("/api/categories"),
        fetch("/api/coupons")
      ]);

      if (metRes.ok) {
        const m = await metRes.json();
        if (m.success) setMetrics(m.metrics);
      }
      if (prodRes.ok) {
        const p = await prodRes.json();
        if (p.success) setProducts(p.products);
      }
      if (ordRes.ok) {
        const o = await ordRes.json();
        if (o.success) setOrders(o.orders);
      }
      if (quoRes.ok) {
        const q = await quoRes.json();
        if (q.success) setQuotes(q.quotes);
      }
      if (catRes.ok) {
        const c = await catRes.json();
        if (c.success) setCategories(c.categories);
      }
      if (coupRes.ok) {
        const coup = await coupRes.json();
        if (coup.success) setCoupons(coup.coupons);
      }
    } catch (e) {
      console.error("Admin refresh error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        title: newProdTitle,
        sku: newProdSku,
        category: newProdCategory,
        subcategory: "general",
        brand: "MediCuro Global",
        basePrice: Number(newProdPrice),
        originalPrice: Number(newProdPrice) * 1.2,
        stock: Number(newProdStock),
        shortDescription: newProdDesc,
        overview: newProdDesc,
        features: ["Certified high-precision engineering", "ISO 13485 compliant"],
        specifications: { "Operating Voltage": "110–240V AC", "Chassis": "Medical Grade" },
        applications: ["Hospital Surgical Wards", "Outpatient Clinics"],
        packageContents: ["Main Unit", "Power Cable", "User Manual"],
        images: [newProdImage]
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowProductModal(false);
        refreshData();
      }
    } catch (e) {
      console.error("Error creating product:", e);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this equipment?")) return;
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      refreshData();
    } catch (e) {
      console.error("Delete product error:", e);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string, stage: string) => {
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, stageToComplete: stage })
      });
      refreshData();
    } catch (e) {
      console.error("Update order status error:", e);
    }
  };

  const handleSaveQuoteResponse = async (quoteId: string) => {
    try {
      await fetch(`/api/quotes/${quoteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: quoteStatus,
          quotedAmountUSD: quotedAmount,
          adminNotes
        })
      });
      setEditingQuoteId(null);
      refreshData();
    } catch (e) {
      console.error("Error updating quote:", e);
    }
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Admin Top Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">
                Central Operations Console
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">MediCuro Global Executive Admin</h1>
            <p className="text-xs text-slate-400 mt-1">
              Master catalog management, international order fulfillment, B2B quotes, and exchange rates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span>Refresh Data</span>
            </button>
            <Link
              to="/"
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Customer Storefront →
            </Link>
          </div>
        </div>

        {/* Executive KPI Cards */}
        {metrics && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-2xs font-bold uppercase text-slate-400">Gross Sales</div>
              <div className="text-2xl font-mono font-black text-slate-900 mt-1">
                ${metrics.totalRevenueUSD.toLocaleString()}
              </div>
              <div className="text-3xs text-emerald-600 font-semibold mt-1">Base Currency: USD</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-2xs font-bold uppercase text-slate-400">Total Orders</div>
              <div className="text-2xl font-mono font-black text-slate-900 mt-1">
                {metrics.totalOrders}
              </div>
              <div className="text-3xs text-sky-600 font-semibold mt-1">Air Express Dispatches</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-2xs font-bold uppercase text-slate-400">Pending Quotes</div>
              <div className="text-2xl font-mono font-black text-sky-700 mt-1">
                {metrics.pendingQuotes}
              </div>
              <div className="text-3xs text-amber-600 font-semibold mt-1">Hospital Tender RFQs</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-2xs font-bold uppercase text-slate-400">Active SKUs</div>
              <div className="text-2xl font-mono font-black text-slate-900 mt-1">
                {metrics.activeProducts}
              </div>
              <div className="text-3xs text-slate-500 font-semibold mt-1">6 Core Categories</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-2xs font-bold uppercase text-slate-400">Low Stock Alerts</div>
              <div className="text-2xl font-mono font-black text-rose-600 mt-1">
                {metrics.lowStockItems}
              </div>
              <div className="text-3xs text-rose-600 font-semibold mt-1">&lt; 10 units in storage</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 gap-2 pb-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab("metrics")}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors ${
              activeTab === "metrics" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors ${
              activeTab === "products" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Product Management ({products.length})
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors ${
              activeTab === "orders" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Order Fulfillment ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("quotes")}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors ${
              activeTab === "quotes" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            B2B Quotes & Tenders ({quotes.length})
          </button>
          <button
            onClick={() => setActiveTab("coupons")}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors ${
              activeTab === "coupons" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Coupons & Discounts
          </button>
          <button
            onClick={() => setActiveTab("currency")}
            className={`px-4 py-2.5 rounded-xl whitespace-nowrap transition-colors ${
              activeTab === "currency" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Exchange Rates & Currencies
          </button>
        </div>

        {/* TAB 1: DASHBOARD METRICS & RECENT ACTIVITY */}
        {activeTab === "metrics" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Orders */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Orders</h3>
                <button onClick={() => setActiveTab("orders")} className="text-xs font-bold text-sky-700 hover:underline">
                  View All Orders →
                </button>
              </div>

              <div className="space-y-3">
                {orders.slice(0, 4).map((o) => (
                  <div key={o.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{o.orderNumber}</div>
                      <div className="text-3xs text-slate-500">{o.customer.fullName} • {o.shippingAddress.country}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{o.pricing.currency} {o.pricing.grandTotal.toLocaleString()}</div>
                      <span className="px-2 py-0.5 text-3xs font-extrabold uppercase bg-sky-100 text-sky-800 rounded-md">
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent B2B RFQs */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Hospital RFQs</h3>
                <button onClick={() => setActiveTab("quotes")} className="text-xs font-bold text-sky-700 hover:underline">
                  View All Quotes →
                </button>
              </div>

              <div className="space-y-3">
                {quotes.slice(0, 4).map((q) => (
                  <div key={q.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-mono font-bold text-slate-900">{q.quoteNumber}</div>
                      <div className="text-3xs text-slate-700 font-semibold">{q.companyName}</div>
                      <div className="text-3xs text-slate-500 line-clamp-1">{q.productName} (Qty: {q.quantity})</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 text-3xs font-extrabold uppercase rounded-md ${
                        q.status === "QUOTED" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                      }`}>
                        {q.status}
                      </span>
                      {q.quotedAmountUSD && (
                        <div className="text-3xs font-mono font-bold text-slate-900 mt-1">
                          ${q.quotedAmountUSD.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCT MANAGEMENT */}
        {activeTab === "products" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  Product Catalog & Inventory
                </h2>
                <p className="text-xs text-slate-500">Add, edit, or adjust medical devices and specifications.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowProductModal(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <Plus size={15} />
                <span>Add Medical Equipment</span>
              </button>
            </div>

            {/* Product Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-3xs">
                    <th className="pb-3">Product Title & SKU</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Base Price (USD)</th>
                    <th className="pb-3">Stock Units</th>
                    <th className="pb-3">Clinical Rating</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images[0]}
                            alt={p.title}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                          <div>
                            <div className="font-bold text-slate-900 line-clamp-1 max-w-xs sm:max-w-md">{p.title}</div>
                            <div className="text-3xs font-mono text-slate-400">SKU: {p.sku}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 capitalize text-slate-600 font-medium">
                        {p.category}
                      </td>

                      <td className="py-3 font-mono font-bold text-slate-900">
                        ${p.basePrice.toLocaleString()}
                      </td>

                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-md text-3xs font-bold ${
                          p.stock < 10 ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {p.stock} units
                        </span>
                      </td>

                      <td className="py-3 text-amber-500 font-bold">
                        ★ {p.rating}
                      </td>

                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/product/${p.slug}`}
                            className="p-1.5 text-slate-400 hover:text-sky-700"
                            title="View on site"
                          >
                            <Eye size={15} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600"
                            title="Delete equipment"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Product Modal */}
            {showProductModal && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full space-y-4 shadow-2xl">
                  <h3 className="text-base font-bold text-slate-900">Add New Medical Equipment</h3>
                  <form onSubmit={handleAddProduct} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Equipment Title *</label>
                      <input
                        type="text"
                        required
                        value={newProdTitle}
                        onChange={(e) => setNewProdTitle(e.target.value)}
                        placeholder="e.g. MediCuro MicroSurg 200W Cautery"
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">SKU Number *</label>
                        <input
                          type="text"
                          required
                          value={newProdSku}
                          onChange={(e) => setNewProdSku(e.target.value)}
                          placeholder="MC-ESU-200"
                          className="w-full p-2 border border-slate-300 rounded-lg font-mono uppercase"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Category *</label>
                        <select
                          value={newProdCategory}
                          onChange={(e) => setNewProdCategory(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white capitalize"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.slug}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Base Price (USD) *</label>
                        <input
                          type="number"
                          required
                          value={newProdPrice}
                          onChange={(e) => setNewProdPrice(Number(e.target.value))}
                          className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Available Stock Units *</label>
                        <input
                          type="number"
                          required
                          value={newProdStock}
                          onChange={(e) => setNewProdStock(Number(e.target.value))}
                          className="w-full p-2 border border-slate-300 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Image URL</label>
                      <input
                        type="url"
                        value={newProdImage}
                        onChange={(e) => setNewProdImage(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg text-2xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={newProdDesc}
                        onChange={(e) => setNewProdDesc(e.target.value)}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowProductModal(false)}
                        className="px-4 py-2 border border-slate-300 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold"
                      >
                        Save & Deploy
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ORDER FULFILLMENT */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              International Order Fulfillment & Shipping Control
            </h2>

            <div className="space-y-4">
              {orders.map((ord) => (
                <div key={ord.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                    <div>
                      <div className="font-mono font-bold text-base text-slate-900">{ord.orderNumber}</div>
                      <div className="text-3xs text-slate-500">
                        Customer: <strong>{ord.customer.fullName}</strong> ({ord.customer.email}) • {ord.shippingAddress.country}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={ord.status}
                        onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value, "SHIPPED")}
                        className="p-1.5 border border-slate-300 rounded-lg bg-white font-bold text-slate-800"
                      >
                        <option value="PROCESSING">Processing</option>
                        <option value="QC_PASSED">QC Passed</option>
                        <option value="PACKED">Crate Packed</option>
                        <option value="SHIPPED">Shipped (In Transit)</option>
                        <option value="DELIVERED">Delivered</option>
                      </select>

                      <Link
                        to={`/track-order?orderId=${ord.orderNumber}`}
                        className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-3xs font-bold"
                      >
                        View Tracking AWB
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Shipping Manifest
                      </div>
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between py-0.5 text-2xs">
                          <span>{it.title}</span>
                          <span className="font-bold">x{it.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Logistics Carrier Details
                      </div>
                      <div className="text-2xs text-slate-600">
                        Carrier: <strong>{ord.shippingMethod.carrier}</strong>
                      </div>
                      <div className="text-2xs text-slate-600 font-mono">
                        AWB Tracking: <strong>{ord.shippingMethod.trackingNumber}</strong>
                      </div>
                      <div className="text-2xs text-slate-600">
                        Paid Total: <strong>{ord.pricing.currency} {ord.pricing.grandTotal.toLocaleString()}</strong> (Rate: {ord.pricing.exchangeRateUsed})
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: B2B TENDERS & QUOTES */}
        {activeTab === "quotes" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              B2B Institutional RFQs & Pricing Desk
            </h2>

            <div className="space-y-4">
              {quotes.map((q) => (
                <div key={q.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-mono font-bold text-slate-900 text-sm">{q.quoteNumber}</div>
                      <div className="text-slate-700 font-semibold">{q.fullName} • {q.companyName} ({q.country})</div>
                      <div className="text-3xs text-slate-400">Email: {q.email} • Phone: {q.phone}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 text-3xs font-extrabold uppercase rounded-md ${
                        q.status === "QUOTED" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"
                      }`}>
                        {q.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuoteId(q.id);
                          setQuoteStatus(q.status);
                          setQuotedAmount(q.quotedAmountUSD || 0);
                          setAdminNotes(q.adminNotes || "");
                        }}
                        className="px-3 py-1.5 border border-slate-300 rounded-lg text-2xs font-bold hover:bg-white"
                      >
                        Respond / Set Price
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                    <div className="font-bold text-slate-900">{q.productName}</div>
                    <div className="text-2xs text-slate-500">
                      Units Requested: <strong>{q.quantity}</strong> • Required Timeline: <strong>{q.targetTimeline}</strong>
                    </div>
                    {q.message && <p className="text-2xs text-slate-600 italic">"{q.message}"</p>}
                  </div>

                  {editingQuoteId === q.id && (
                    <div className="p-4 bg-sky-50 border border-sky-200 rounded-xl space-y-3">
                      <h4 className="font-bold text-sky-950">Update Quote Response</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-3xs font-bold text-slate-600 mb-1">Status</label>
                          <select
                            value={quoteStatus}
                            onChange={(e) => setQuoteStatus(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white font-semibold"
                          >
                            <option value="NEW">New</option>
                            <option value="REVIEWING">Reviewing</option>
                            <option value="QUOTED">Quoted (Price Offered)</option>
                            <option value="APPROVED">Approved</option>
                            <option value="CLOSED">Closed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-3xs font-bold text-slate-600 mb-1">Quoted Price (USD)</label>
                          <input
                            type="number"
                            value={quotedAmount}
                            onChange={(e) => setQuotedAmount(Number(e.target.value))}
                            className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-3xs font-bold text-slate-600 mb-1">Admin Notes / Terms</label>
                        <textarea
                          rows={2}
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Include shipping CIF airport terms, discounts, or compliance notes..."
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingQuoteId(null)}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveQuoteResponse(q.id)}
                          className="px-4 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg"
                        >
                          Save & Transmit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: COUPONS */}
        {activeTab === "coupons" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-slate-100">
              Active Institutional Promo Codes & Discounts
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {coupons.map((c) => (
                <div key={c.code} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="font-mono font-bold text-sm text-sky-800 flex items-center gap-1.5">
                    <Tag size={15} />
                    <span>{c.code}</span>
                  </div>
                  <p className="text-slate-600 text-2xs">{c.description}</p>
                  <div className="text-3xs text-slate-400">
                    Min Order: <strong>${c.minOrderUSD} USD</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: CURRENCY & EXCHANGE RATES */}
        {activeTab === "currency" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  Live Multi-Currency Engine
                </h2>
                <p className="text-xs text-slate-500">Base Currency: <strong>USD</strong>. Converted in real-time.</p>
              </div>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-3xs font-bold rounded-full border border-emerald-200">
                ● Live API Synchronized
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-xs">
              {countries.map((c) => (
                <div key={c.code} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{c.flag}</span>
                    <span className="font-bold text-slate-900">{c.name}</span>
                  </div>
                  <div className="text-sm font-mono font-black text-sky-900">
                    {c.currency} ({c.symbol})
                  </div>
                  <div className="text-3xs text-slate-500 font-mono">
                    1 USD = {exchangeRates[c.currency] || c.defaultRate} {c.currency}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
