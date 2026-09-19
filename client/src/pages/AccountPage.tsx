import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  User,
  Package,
  Heart,
  MapPin,
  Settings,
  FileText,
  Clock,
  CheckCircle2,
  Printer,
  Trash2,
  Plus,
  ExternalLink,
  ShieldCheck,
  Building
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { Order, QuoteRequest } from "../types";
import { InternationalPhoneInput } from "../components/InternationalPhoneInput";

export const AccountPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "orders";

  const { user, updateProfile, addAddress, deleteAddress, isAdmin } = useAuth();
  const { wishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const { formatPrice, currentCountry, countries, setCountry } = useCurrency();

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New Address modal state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddrLine1, setNewAddrLine1] = useState("");
  const [newAddrCity, setNewAddrCity] = useState("");
  const [newAddrState, setNewAddrState] = useState("");
  const [newAddrPostal, setNewAddrPostal] = useState("");

  useEffect(() => {
    async function loadAccountData() {
      setIsLoading(true);
      try {
        const [ordRes, quoRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/quotes")
        ]);

        if (ordRes.ok) {
          const ordData = await ordRes.json();
          if (ordData.success) setOrders(ordData.orders);
        }
        if (quoRes.ok) {
          const quoData = await quoRes.json();
          if (quoData.success) setQuotes(quoData.quotes);
        }
      } catch (err) {
        console.error("Account data load error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadAccountData();
  }, []);

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrLine1 || !newAddrCity) return;
    addAddress({
      fullName: user?.fullName || "Practitioner",
      email: user?.email || "",
      phone: user?.phone || "",
      addressLine1: newAddrLine1,
      city: newAddrCity,
      state: newAddrState,
      postalCode: newAddrPostal,
      country: currentCountry.name,
      countryCode: currentCountry.code
    });
    setShowAddressModal(false);
    setNewAddrLine1("");
    setNewAddrCity("");
    setNewAddrState("");
    setNewAddrPostal("");
  };

  return (
    <div className="w-full bg-slate-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Account Top Summary */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-700 to-blue-900 text-white flex items-center justify-center font-bold text-xl shadow-md">
                {user ? user.fullName.charAt(0) : "D"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">{user?.fullName}</h1>
                  <span className="px-2 py-0.5 text-3xs font-extrabold uppercase bg-sky-100 text-sky-800 rounded-md">
                    {user?.role === "super_admin" ? "ADMINISTRATOR" : "HOSPITAL BUYER"}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {user?.institutionName} • {user?.email}
                </div>
              </div>
            </div>

            {isAdmin && (
              <Link
                to="/admin"
                className="px-5 py-2.5 bg-slate-900 hover:bg-sky-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 self-start sm:self-auto"
              >
                <span>⚡ Open Admin Panel</span>
              </Link>
            )}
          </div>

          {/* Quick KPI stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 text-center">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-xl font-black text-slate-900 font-mono">{orders.length}</div>
              <div className="text-3xs font-semibold uppercase text-slate-400">Total Orders</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-xl font-black text-sky-700 font-mono">{quotes.length}</div>
              <div className="text-3xs font-semibold uppercase text-slate-400">B2B RFQ Quotes</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-xl font-black text-rose-600 font-mono">{wishlist.length}</div>
              <div className="text-3xs font-semibold uppercase text-slate-400">Saved Equipment</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
              <div className="text-xl font-black text-emerald-600 font-mono">{currentCountry.name}</div>
              <div className="text-3xs font-semibold uppercase text-slate-400">Delivery Country</div>
            </div>
          </div>
        </div>

        {/* Account Tabbed Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Navigation Sidebar (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-1">
            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-colors ${
                activeTab === "orders" ? "bg-slate-900 text-white shadow-xs" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Package size={16} />
              <span>My Orders ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("quotes")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-colors ${
                activeTab === "quotes" ? "bg-slate-900 text-white shadow-xs" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Building size={16} />
              <span>B2B Tender Quotes ({quotes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("wishlist")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-colors ${
                activeTab === "wishlist" ? "bg-slate-900 text-white shadow-xs" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Heart size={16} />
              <span>Saved Equipment ({wishlist.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("addresses")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-colors ${
                activeTab === "addresses" ? "bg-slate-900 text-white shadow-xs" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <MapPin size={16} />
              <span>Hospital Addresses</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-colors ${
                activeTab === "profile" ? "bg-slate-900 text-white shadow-xs" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Settings size={16} />
              <span>Account Preferences</span>
            </button>
          </div>

          {/* Tab Content (9 cols) */}
          <div className="lg:col-span-9 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
            {/* ORDERS TAB */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Hospital Equipment Orders</h3>
                  <Link to="/track-order" className="text-xs font-bold text-sky-700 hover:underline">
                    Track by Order # →
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6">No previous orders found in database.</p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((ord) => (
                      <div key={ord.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                          <div>
                            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Order ID</div>
                            <div className="text-sm font-mono font-bold text-slate-900">{ord.orderNumber}</div>
                            <div className="text-3xs text-slate-400">
                              Placed on {new Date(ord.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 text-3xs font-extrabold uppercase bg-sky-100 text-sky-800 rounded-md">
                              {ord.status}
                            </span>
                            <Link
                              to={`/track-order?orderId=${ord.orderNumber}`}
                              className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-2xs font-bold hover:bg-sky-800"
                            >
                              Track AWB
                            </Link>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <img
                                  src={it.image}
                                  alt={it.title}
                                  className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                                />
                                <div>
                                  <div className="font-bold text-slate-900 line-clamp-1">{it.title}</div>
                                  <div className="text-3xs text-slate-400 font-mono">
                                    SKU: {it.sku} • Quantity: {it.quantity}
                                  </div>
                                </div>
                              </div>
                              <span className="font-bold text-slate-800 whitespace-nowrap">
                                {ord.pricing.currency} {it.convertedUnitPrice * it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                          <div className="text-3xs text-slate-500">
                            Carrier: <strong>{ord.shippingMethod.carrier}</strong> • Payment: <strong>{ord.payment.status}</strong>
                          </div>
                          <div className="font-black text-slate-900 text-sm">
                            Total: {ord.pricing.currency} {ord.pricing.grandTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* B2B QUOTES TAB */}
            {activeTab === "quotes" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Institutional B2B RFQs</h3>
                  <Link to="/request-quote" className="text-xs font-bold text-sky-700 hover:underline">
                    + Submit New RFQ
                  </Link>
                </div>

                {quotes.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6">No quote requests recorded.</p>
                ) : (
                  <div className="space-y-4">
                    {quotes.map((q) => (
                      <div key={q.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono font-bold text-slate-900">{q.quoteNumber}</div>
                            <div className="text-3xs text-slate-400">Created: {new Date(q.createdAt).toLocaleDateString()}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-md text-3xs font-extrabold uppercase ${
                            q.status === "QUOTED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-sky-100 text-sky-800"
                          }`}>
                            {q.status}
                          </span>
                        </div>

                        <div className="font-semibold text-slate-800">{q.productName}</div>
                        <div className="text-3xs text-slate-500">
                          Quantity: <strong>{q.quantity} units</strong> • Timeline: <strong>{q.targetTimeline}</strong>
                        </div>

                        {q.quotedAmountUSD && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                            <div className="font-bold text-xs">Official Quoted Tender Price: ${q.quotedAmountUSD.toLocaleString()} USD</div>
                            {q.adminNotes && <p className="text-2xs text-emerald-700 mt-1">{q.adminNotes}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WISHLIST TAB */}
            {activeTab === "wishlist" && (
              <div className="space-y-6">
                <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                  Saved Medical Devices ({wishlist.length})
                </h3>

                {wishlist.length === 0 ? (
                  <p className="text-xs text-slate-500 py-6">No products saved to wishlist yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wishlist.map((prod) => (
                      <div key={prod.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
                        <div className="flex gap-3">
                          <img
                            src={prod.images[0]}
                            alt={prod.title}
                            className="w-16 h-16 object-cover rounded-xl border border-slate-200 shrink-0"
                          />
                          <div>
                            <Link to={`/product/${prod.slug}`} className="font-bold text-slate-900 hover:text-sky-700 line-clamp-2 text-xs">
                              {prod.title}
                            </Link>
                            <div className="font-bold text-slate-900 text-xs mt-1">
                              {formatPrice(prod.basePrice)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => addToCart(prod, 1)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-sky-800 text-white rounded-lg text-2xs font-bold"
                          >
                            Move to Cart
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleWishlist(prod)}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ADDRESSES TAB */}
            {activeTab === "addresses" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-base font-bold text-slate-900">Hospital Delivery Locations</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(true)}
                    className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-sky-800 flex items-center gap-1.5"
                  >
                    <Plus size={14} />
                    <span>Add Address</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {user?.addresses.map((addr, idx) => (
                    <div key={idx} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-900">
                        <span>{addr.companyName || addr.fullName}</span>
                        {idx === 0 && (
                          <span className="text-3xs font-bold px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600">{addr.addressLine1}</p>
                      <p className="text-slate-600">{addr.city}, {addr.state} {addr.postalCode}</p>
                      <p className="text-slate-800 font-bold">{addr.country}</p>
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => deleteAddress(idx)}
                          className="text-xs text-rose-600 hover:underline pt-2"
                        >
                          Delete Address
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Address Modal */}
                {showAddressModal && (
                  <form onSubmit={handleSaveNewAddress} className="p-5 bg-sky-50/50 border border-sky-200 rounded-2xl space-y-3 text-xs">
                    <h4 className="font-bold text-slate-900">Add Clinical Facility Address</h4>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={newAddrLine1}
                        onChange={(e) => setNewAddrLine1(e.target.value)}
                        placeholder="Facility suite / street"
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={newAddrCity}
                          onChange={(e) => setNewAddrCity(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">State/Province *</label>
                        <input
                          type="text"
                          required
                          value={newAddrState}
                          onChange={(e) => setNewAddrState(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Postal/ZIP *</label>
                        <input
                          type="text"
                          required
                          value={newAddrPostal}
                          onChange={(e) => setNewAddrPostal(e.target.value)}
                          className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(false)}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold rounded-lg"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                  Practitioner & Facility Preferences
                </h3>

                <div className="space-y-4 text-xs max-w-lg">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Legal / Clinical Name</label>
                    <input
                      type="text"
                      value={user?.fullName || ""}
                      onChange={(e) => updateProfile({ fullName: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Institution Name</label>
                    <input
                      type="text"
                      value={user?.institutionName || ""}
                      onChange={(e) => updateProfile({ institutionName: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Preferred Currency & Jurisdiction</label>
                    <select
                      value={currentCountry.code}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg bg-white font-bold"
                    >
                      {countries.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name} ({c.currency})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
