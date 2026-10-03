import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  FileText,
  Heart,
  MapPin,
  User,
  Plus
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useCurrency } from "../context/CurrencyContext";

export const AccountPage: React.FC = () => {
  const { user, isAdmin, updateProfile } = useAuth();
  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const { formatPrice, currentCountry, countries, setCountry } = useCurrency();

  const [activeTab, setActiveTab] = useState<"orders" | "quotes" | "wishlist" | "addresses" | "profile">("orders");

  // Mock addresses state
  const [addresses, setAddresses] = useState([
    {
      id: "addr-1",
      fullName: user?.fullName || "Dr. Jonathan Reyes",
      companyName: user?.institutionName || "Mayo Orthopedic Surgery Center",
      addressLine1: "742 Medical Center Blvd, Suite 400",
      city: "San Francisco",
      state: "California",
      postalCode: "94143",
      country: currentCountry.name
    }
  ]);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddrLine1, setNewAddrLine1] = useState("");
  const [newAddrCity, setNewAddrCity] = useState("");
  const [newAddrState, setNewAddrState] = useState("");
  const [newAddrPostal, setNewAddrPostal] = useState("");

  const orders = [
    {
      id: "ord-1",
      orderNumber: "MED-94021",
      createdAt: new Date().toISOString(),
      status: "IN TRANSIT (AIR)",
      shippingMethod: { carrier: "DHL Express" },
      payment: { status: "PAID" },
      pricing: { currency: "USD", grandTotal: 3450 },
      items: [
        {
          title: "High-Frequency Electrosurgical Unit (400W)",
          sku: "ESU-400W-PRO",
          quantity: 1,
          convertedUnitPrice: 3450,
          image: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=300&q=80"
        }
      ]
    }
  ];

  const quotes = [
    {
      id: "q-1",
      quoteNumber: "RFQ-2026-8819",
      createdAt: new Date().toISOString(),
      status: "UNDER REVIEW",
      productName: "Shadowless Operating Theatre Light Dual Dome Hex",
      quantity: 4,
      targetTimeline: "Within 30 Days",
      quotedAmountUSD: 14200,
      adminNotes: "Official proforma CIF export terms attached."
    }
  ];

  const handleSaveNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddrLine1) return;
    const newEntry = {
      id: `addr-${Date.now()}`,
      fullName: user?.fullName || "Facility Officer",
      companyName: user?.institutionName || "Clinical Center",
      addressLine1: newAddrLine1,
      city: newAddrCity,
      state: newAddrState,
      postalCode: newAddrPostal,
      country: currentCountry.name
    };
    setAddresses([...addresses, newEntry]);
    setShowAddressModal(false);
    setNewAddrLine1("");
    setNewAddrCity("");
    setNewAddrState("");
    setNewAddrPostal("");
  };

  const deleteAddress = (index: number) => {
    setAddresses(addresses.filter((_, idx) => idx !== index));
  };

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Account Top Summary */}
        <div className="bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-8 shadow-2xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#111111] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {user ? user.fullName.charAt(0) : "D"}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-black text-[#111111]">{user?.fullName}</h1>
                  <span className="px-2.5 py-0.5 text-3xs font-extrabold uppercase bg-[#FAFAFA] border border-[#EAEAEA] text-[#111111] rounded-md">
                    {user?.role === "super_admin" ? "ADMINISTRATOR" : "HOSPITAL BUYER"}
                  </span>
                </div>
                <div className="text-xs text-neutral-500 mt-1">
                  {user?.institutionName} • {user?.email}
                </div>
              </div>
            </div>

            {isAdmin && (
              <Link
                to="/admin"
                className="px-5 py-2.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 self-start sm:self-auto"
              >
                <span>⚡ Open Admin Panel</span>
              </Link>
            )}
          </div>

          {/* Quick KPI stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#EAEAEA] text-center">
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
              <div className="text-xl font-black text-[#111111] font-mono">{orders.length}</div>
              <div className="text-3xs font-semibold uppercase text-neutral-400 mt-0.5">Total Orders</div>
            </div>
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
              <div className="text-xl font-black text-[#111111] font-mono">{quotes.length}</div>
              <div className="text-3xs font-semibold uppercase text-neutral-400 mt-0.5">B2B RFQ Quotes</div>
            </div>
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
              <div className="text-xl font-black text-[#111111] font-mono">{wishlist.length}</div>
              <div className="text-3xs font-semibold uppercase text-neutral-400 mt-0.5">Saved Equipment</div>
            </div>
            <div className="p-4 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA]">
              <div className="text-xl font-black text-[#1F7A4D] font-mono">{currentCountry.name}</div>
              <div className="text-3xs font-semibold uppercase text-neutral-400 mt-0.5">Delivery Country</div>
            </div>
          </div>
        </div>

        {/* Account Tabbed Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Navigation Sidebar (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-[#EAEAEA] p-3 shadow-2xs space-y-1">
            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "orders" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <Package size={16} />
              <span>My Orders ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("quotes")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "quotes" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <FileText size={16} />
              <span>B2B RFQs ({quotes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("wishlist")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "wishlist" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <Heart size={16} />
              <span>Saved Equipment ({wishlist.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("addresses")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "addresses" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <MapPin size={16} />
              <span>Shipping Facilities ({addresses.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === "profile" ? "bg-[#111111] text-white" : "text-neutral-700 hover:bg-[#F7F7F7]"
              }`}
            >
              <User size={16} />
              <span>Facility Settings</span>
            </button>
          </div>

          {/* Tab Content (9 cols) */}
          <div className="lg:col-span-9 bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-8 shadow-2xs">
            {/* ORDERS TAB */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEAEA]">
                  <h3 className="text-base font-bold text-[#111111]">Hospital Equipment Orders</h3>
                  <Link to="/track-order" className="text-xs font-bold text-[#111111] hover:text-[#1F7A4D] hover:underline transition-colors">
                    Track by Order # →
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6">No previous orders found in database.</p>
                ) : (
                  <div className="space-y-4">
                    {orders.map((ord) => (
                      <div key={ord.id} className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-[#EAEAEA]">
                          <div>
                            <div className="text-3xs font-bold text-neutral-400 uppercase tracking-wider">Order ID</div>
                            <div className="text-sm font-mono font-bold text-[#111111]">{ord.orderNumber}</div>
                            <div className="text-3xs text-neutral-400 mt-0.5">
                              Placed on {new Date(ord.createdAt).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 text-3xs font-extrabold uppercase bg-[#EAF5EF] border border-[#1F7A4D]/20 text-[#145A38] rounded-md">
                              {ord.status}
                            </span>
                            <Link
                              to={`/track-order?orderId=${ord.orderNumber}`}
                              className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-lg text-2xs font-bold transition-colors"
                            >
                              Track AWB
                            </Link>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-2.5">
                          {ord.items.map((it, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <img
                                  src={it.image}
                                  alt={it.title}
                                  className="w-10 h-10 object-contain p-0.5 rounded-lg border border-[#EAEAEA] bg-white"
                                />
                                <div>
                                  <div className="font-bold text-[#111111] line-clamp-1">{it.title}</div>
                                  <div className="text-3xs text-neutral-400 font-mono">
                                    SKU: {it.sku} • Quantity: {it.quantity}
                                  </div>
                                </div>
                              </div>
                              <span className="font-bold text-neutral-800 whitespace-nowrap">
                                {ord.pricing.currency} {it.convertedUnitPrice * it.quantity}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="pt-3.5 border-t border-[#EAEAEA] flex items-center justify-between text-xs">
                          <div className="text-3xs text-neutral-500">
                            Carrier: <strong>{ord.shippingMethod.carrier}</strong> • Payment: <strong>{ord.payment.status}</strong>
                          </div>
                          <div className="font-black text-[#111111] text-sm">
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
                <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEAEA]">
                  <h3 className="text-base font-bold text-[#111111]">Institutional B2B RFQs</h3>
                  <Link to="/request-quote" className="text-xs font-bold text-[#111111] hover:text-[#1F7A4D] hover:underline transition-colors">
                    + Submit New RFQ
                  </Link>
                </div>

                {quotes.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6">No quote requests recorded.</p>
                ) : (
                  <div className="space-y-4">
                    {quotes.map((q) => (
                      <div key={q.id} className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono font-bold text-[#111111]">{q.quoteNumber}</div>
                            <div className="text-3xs text-neutral-400">Created: {new Date(q.createdAt).toLocaleDateString()}</div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-3xs font-extrabold uppercase ${
                            q.status === "QUOTED"
                              ? "bg-[#EAF5EF] border border-[#1F7A4D]/20 text-[#145A38]"
                              : "bg-white border border-[#EAEAEA] text-[#111111]"
                          }`}>
                            {q.status}
                          </span>
                        </div>

                        <div className="font-semibold text-neutral-800">{q.productName}</div>
                        <div className="text-3xs text-neutral-500">
                          Quantity: <strong>{q.quantity} units</strong> • Timeline: <strong>{q.targetTimeline}</strong>
                        </div>

                        {q.quotedAmountUSD && (
                          <div className="p-3.5 bg-[#EAF5EF] border border-[#1F7A4D]/20 rounded-xl text-[#145A38]">
                            <div className="font-bold text-xs">Official Quoted Tender Price: ${q.quotedAmountUSD.toLocaleString()} USD</div>
                            {q.adminNotes && <p className="text-2xs text-[#145A38]/90 mt-1">{q.adminNotes}</p>}
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
                <h3 className="text-base font-bold text-[#111111] pb-3.5 border-b border-[#EAEAEA]">
                  Saved Medical Devices ({wishlist.length})
                </h3>

                {wishlist.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-6">No products saved to wishlist yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {wishlist.map((prod) => (
                      <div key={prod.id} className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] flex flex-col justify-between">
                        <div className="flex gap-3.5">
                          <img
                            src={prod.images[0]}
                            alt={prod.title}
                            className="w-16 h-16 object-contain p-1 rounded-lg border border-[#EAEAEA] bg-white shrink-0"
                          />
                          <div>
                            <Link to={`/product/${prod.slug}`} className="font-bold text-[#111111] hover:text-[#1F7A4D] line-clamp-2 text-xs transition-colors">
                              {prod.title}
                            </Link>
                            <div className="font-bold text-[#111111] text-xs mt-1.5">
                              {formatPrice(prod.basePrice)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3.5 border-t border-[#EAEAEA] flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => addToCart(prod, 1)}
                            className="px-3.5 py-1.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-lg text-2xs font-bold transition-colors"
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
                <div className="flex items-center justify-between pb-3.5 border-b border-[#EAEAEA]">
                  <h3 className="text-base font-bold text-[#111111]">Clinical Facility Delivery Addresses</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(true)}
                    className="px-4 py-2 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={14} />
                    <span>Add Destination Address</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr, idx) => (
                    <div key={addr.id} className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold text-[#111111]">
                        <span>{addr.companyName || addr.fullName}</span>
                        {idx === 0 && (
                          <span className="text-3xs font-bold px-2.5 py-0.5 bg-[#111111] text-white rounded-md">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      <p className="text-neutral-600">{addr.addressLine1}</p>
                      <p className="text-neutral-600">{addr.city}, {addr.state} {addr.postalCode}</p>
                      <p className="text-[#111111] font-bold">{addr.country}</p>
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

                {/* Add Address Form */}
                {showAddressModal && (
                  <form onSubmit={handleSaveNewAddress} className="p-6 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl space-y-3.5 text-xs">
                    <h4 className="font-bold text-[#111111]">Add Clinical Facility Address</h4>
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">Street Address *</label>
                      <input
                        type="text"
                        required
                        value={newAddrLine1}
                        onChange={(e) => setNewAddrLine1(e.target.value)}
                        placeholder="Facility suite / street"
                        className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={newAddrCity}
                          onChange={(e) => setNewAddrCity(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">State/Province *</label>
                        <input
                          type="text"
                          required
                          value={newAddrState}
                          onChange={(e) => setNewAddrState(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1">Postal/ZIP *</label>
                        <input
                          type="text"
                          required
                          value={newAddrPostal}
                          onChange={(e) => setNewAddrPostal(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(false)}
                        className="px-4 py-2 border border-[#EAEAEA] rounded-lg text-neutral-600 hover:bg-[#F7F7F7]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-[#111111] hover:bg-[#1F7A4D] text-white font-bold rounded-lg transition-colors"
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
                <h3 className="text-base font-bold text-[#111111] pb-3.5 border-b border-[#EAEAEA]">
                  Practitioner & Facility Preferences
                </h3>

                <div className="space-y-4 text-xs max-w-lg">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Full Legal / Clinical Name</label>
                    <input
                      type="text"
                      value={user?.fullName || ""}
                      onChange={(e) => updateProfile({ fullName: e.target.value })}
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Institution Name</label>
                    <input
                      type="text"
                      value={user?.institutionName || ""}
                      onChange={(e) => updateProfile({ institutionName: e.target.value })}
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white text-[#111111] focus:outline-none focus:border-[#111111]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1.5">Preferred Currency & Jurisdiction</label>
                    <select
                      value={currentCountry.code}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white font-bold text-[#111111] focus:outline-none focus:border-[#111111]"
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
