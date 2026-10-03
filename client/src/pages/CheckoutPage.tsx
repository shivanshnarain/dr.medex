import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Building,
  CheckCircle2,
  Lock,
  ArrowRight,
  Plane,
  Truck,
  Printer
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { InternationalPhoneInput } from "../components/InternationalPhoneInput";
import { Order } from "../types";

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, baseSubtotalUSD, appliedCoupon, discountUSD, clearCart } = useCart();
  const { currentCountry, currentCurrency, formatPrice, convertPrice, countries, setCountry, exchangeRates } = useCurrency();
  const { user } = useAuth();

  // Multi-step state: 1: Info & Address, 2: Shipping Method, 3: Payment & Place Order, 4: Confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form Fields
  const [email, setEmail] = useState(user?.email || "hospital.procurement@stjude.org");
  const [fullName, setFullName] = useState(user?.fullName || "Dr. Jonathan Reyes");
  const [companyName, setCompanyName] = useState(user?.institutionName || "Mayo Orthopedic Surgery Center");
  const [phone, setPhone] = useState(user?.phone || "+1 415-555-0192");

  // Shipping Address
  const [addressLine1, setAddressLine1] = useState("742 Medical Center Blvd, Suite 400");
  const [addressLine2, setAddressLine2] = useState("Floor 4, Surgical Wing");
  const [city, setCity] = useState("San Francisco");
  const [state, setState] = useState("California");
  const [postalCode, setPostalCode] = useState("94143");
  const [countryCode, setCountryCode] = useState(currentCountry.code);

  // Shipping Method
  const [selectedShippingMethod, setSelectedShippingMethod] = useState({
    id: "dhl-air-express",
    name: "DHL Express Medical Air Cargo",
    carrier: "DHL Express",
    costUSD: 120,
    estimatedDays: "3–5 Business Days"
  });

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<"card" | "wire" | "paypal">("card");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCVC, setCardCVC] = useState("394");

  if (items.length === 0 && !completedOrder) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <h2 className="text-xl font-bold text-[#111111]">Your cart is empty</h2>
        <p className="text-xs text-neutral-500">Please add medical equipment before proceeding to checkout.</p>
        <Link to="/shop-all" className="inline-block px-6 py-2.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold transition-colors">
          Go to Shop
        </Link>
      </div>
    );
  }

  const shippingUSD = selectedShippingMethod.costUSD;
  const finalSubtotalUSD = Math.max(0, baseSubtotalUSD - discountUSD);
  const grandTotalUSD = finalSubtotalUSD + shippingUSD;

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    setCountry(code);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage("");

    try {
      const orderPayload = {
        customer: {
          fullName,
          email,
          phone,
          country: currentCountry.name,
          countryCode: currentCountry.code
        },
        shippingAddress: {
          fullName,
          companyName,
          email,
          phone,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country: currentCountry.name,
          countryCode: currentCountry.code
        },
        items: items.map((it) => ({
          productId: it.product.id,
          title: it.product.title,
          sku: it.product.sku,
          quantity: it.quantity,
          basePriceUSD: it.product.basePrice,
          image: it.product.images[0]
        })),
        baseSubtotalUSD,
        subtotal: convertPrice(baseSubtotalUSD),
        discount: convertPrice(discountUSD),
        shipping: convertPrice(shippingUSD),
        grandTotal: convertPrice(grandTotalUSD),
        currency: currentCurrency,
        couponApplied: appliedCoupon ? appliedCoupon.code : null,
        shippingMethod: {
          id: selectedShippingMethod.id,
          name: selectedShippingMethod.name,
          carrier: selectedShippingMethod.carrier,
          estimatedDays: selectedShippingMethod.estimatedDays,
          trackingNumber: "DHL-MED-" + Math.floor(100000000 + Math.random() * 900000000),
          trackingUrl: "https://www.dhl.com"
        },
        paymentMethod:
          paymentMethod === "card"
            ? "Stripe International Credit Card"
            : paymentMethod === "wire"
            ? "Institutional Bank Wire / SWIFT"
            : "PayPal International"
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      });

      const data = await res.json();
      if (data.success && data.order) {
        setCompletedOrder(data.order);
        clearCart();
        window.scrollTo(0, 0);
      } else {
        setErrorMessage(data.message || "Unable to complete order.");
      }
    } catch (err) {
      setErrorMessage("Network error placing order. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // SUCCESS CONFIRMATION VIEW
  if (completedOrder) {
    return (
      <div className="w-full bg-[#FAFAFA] min-h-screen py-14">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-[#EAEAEA] p-8 sm:p-10 shadow-2xs space-y-6">
            <div className="text-center space-y-2.5">
              <div className="w-16 h-16 bg-[#EAF5EF] text-[#1F7A4D] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <h1 className="text-2xl font-black text-[#111111] tracking-tight">
                Order Confirmed & Registration Complete
              </h1>
              <p className="text-xs text-neutral-500">
                A formal order confirmation and commercial proforma invoice has been transmitted to <strong>{completedOrder.customer.email}</strong>.
              </p>
            </div>

            {/* Order Reference Box */}
            <div className="p-5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-3xs font-bold text-neutral-400 uppercase tracking-wider">Order Number</div>
                <div className="text-xl font-mono font-black text-[#111111] mt-0.5">{completedOrder.orderNumber}</div>
                <div className="text-3xs text-neutral-500 mt-1">
                  Exchange Rate Snapshotted: 1 USD = {completedOrder.pricing.exchangeRateUsed} {completedOrder.pricing.currency}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Link
                  to={`/track-order?orderId=${completedOrder.orderNumber}`}
                  className="px-5 py-2.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold transition-colors"
                >
                  Track Shipment
                </Link>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 border border-[#EAEAEA] text-neutral-700 rounded-xl text-xs font-bold hover:bg-[#F7F7F7] transition-colors flex items-center gap-1.5"
                >
                  <Printer size={14} />
                  <span>Print Invoice</span>
                </button>
              </div>
            </div>

            {/* Order Items Review */}
            <div>
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-3">
                Equipment Line Items
              </h3>
              <div className="border border-[#EAEAEA] rounded-xl divide-y divide-[#EAEAEA] overflow-hidden text-xs">
                {completedOrder.items.map((item, i) => (
                  <div key={i} className="p-4 flex items-center justify-between gap-4 bg-white">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-12 h-12 object-contain p-1 rounded-lg border border-[#EAEAEA] bg-[#FAFAFA]"
                      />
                      <div>
                        <div className="font-bold text-[#111111] text-xs">{item.title}</div>
                        <div className="text-3xs text-neutral-400 font-mono">
                          SKU: {item.sku} • Qty: {item.quantity}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-[#111111] whitespace-nowrap">
                      {completedOrder.pricing.currency} {item.convertedUnitPrice * item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Summary */}
            <div className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Shipping Destination:</span>
                <span className="font-medium text-[#111111]">
                  {completedOrder.shippingAddress.addressLine1}, {completedOrder.shippingAddress.city}, {completedOrder.shippingAddress.country}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Air Freight Carrier:</span>
                <span className="font-medium text-[#111111]">{completedOrder.shippingMethod.name}</span>
              </div>
              <div className="pt-2.5 border-t border-[#EAEAEA] flex justify-between font-bold text-sm text-[#111111]">
                <span>Final Paid Amount:</span>
                <span className="text-[#111111] text-base font-extrabold">
                  {completedOrder.pricing.currency} {completedOrder.pricing.grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-4 text-center">
              <Link to="/shop-all" className="text-xs font-bold text-[#111111] hover:text-[#1F7A4D] hover:underline transition-colors">
                Return to Medical Equipment Catalog →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#FAFAFA] min-h-screen py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Checkout Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              International Medical Checkout
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Secure multi-currency clinical procurement with export documentation.
            </p>
          </div>

          <div className="flex items-center gap-2 text-2xs text-neutral-500">
            <Lock size={14} className="text-[#1F7A4D]" />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>

        {/* Step Progression Bar */}
        <div className="grid grid-cols-3 gap-3 mb-8 text-center text-xs font-bold">
          <div
            className={`p-3 rounded-xl border transition-colors ${
              step >= 1 ? "bg-[#111111] text-white border-[#111111]" : "bg-white text-neutral-400 border-[#EAEAEA]"
            }`}
          >
            1. Destination & Customer
          </div>
          <div
            className={`p-3 rounded-xl border transition-colors ${
              step >= 2 ? "bg-[#111111] text-white border-[#111111]" : "bg-white text-neutral-400 border-[#EAEAEA]"
            }`}
          >
            2. Air Freight Logistics
          </div>
          <div
            className={`p-3 rounded-xl border transition-colors ${
              step >= 3 ? "bg-[#111111] text-white border-[#111111]" : "bg-white text-neutral-400 border-[#EAEAEA]"
            }`}
          >
            3. Payment & Confirmation
          </div>
        </div>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Form Column (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-8 shadow-2xs space-y-6">
              {/* STEP 1: Customer Info & Country-Adaptive Address */}
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-4 border-b border-[#EAEAEA] pb-2.5">
                      Customer & Healthcare Entity Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1.5">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1.5">Hospital / Clinic / Organization *</label>
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1.5">Official Email Address *</label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1.5">
                          International Telephone (+ Dial Code) *
                        </label>
                        <InternationalPhoneInput
                          value={phone}
                          onChange={setPhone}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Country Adaptive Shipping Address */}
                  <div>
                    <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-4 border-b border-[#EAEAEA] pb-2.5">
                      Regional Shipping Destination
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block font-bold text-neutral-700 mb-1.5">Destination Country *</label>
                        <select
                          value={countryCode}
                          onChange={(e) => handleCountryChange(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg bg-white font-semibold text-[#111111] focus:outline-none focus:border-[#111111]"
                        >
                          {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.name} ({c.currency} - {c.symbol})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-bold text-neutral-700 mb-1.5">Street Address Line 1 *</label>
                        <input
                          type="text"
                          required
                          value={addressLine1}
                          onChange={(e) => setAddressLine1(e.target.value)}
                          placeholder="Building, street, medical facility suite"
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block font-bold text-neutral-700 mb-1.5">Address Line 2 (Optional)</label>
                        <input
                          type="text"
                          value={addressLine2}
                          onChange={(e) => setAddressLine2(e.target.value)}
                          placeholder="Department, floor, dock number"
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-neutral-700 mb-1.5">City *</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                        />
                      </div>

                      {/* Dynamic Country-Adaptive State / Province */}
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1.5">
                          {currentCountry.stateLabel} *
                        </label>
                        <input
                          type="text"
                          required
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg focus:outline-none focus:border-[#111111] text-[#111111]"
                        />
                      </div>

                      {/* Dynamic Country-Adaptive Postal Code */}
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1.5">
                          {currentCountry.postalLabel} *
                        </label>
                        <input
                          type="text"
                          required
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder={`e.g. ${currentCountry.code === 'US' ? '90210' : currentCountry.code === 'IN' ? '110001' : 'SW1A 1AA'}`}
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg font-mono focus:outline-none focus:border-[#111111] text-[#111111]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-8 py-3 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                      <span>Continue to Air Freight Options</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Shipping Method */}
              {step === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-4 border-b border-[#EAEAEA] pb-2.5">
                    International Air Freight Carrier & Crating
                  </h3>

                  <div className="space-y-3.5">
                    <label
                      className={`flex items-start justify-between p-5 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedShippingMethod.id === "dhl-air-express"
                          ? "border-[#111111] bg-[#FAFAFA]"
                          : "border-[#EAEAEA] hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <input
                          type="radio"
                          name="shippingMethod"
                          checked={selectedShippingMethod.id === "dhl-air-express"}
                          onChange={() =>
                            setSelectedShippingMethod({
                              id: "dhl-air-express",
                              name: "DHL Express Medical Air Cargo",
                              carrier: "DHL Express",
                              costUSD: 120,
                              estimatedDays: "3–5 Business Days"
                            })
                          }
                          className="mt-1 text-[#111111] focus:ring-[#111111]"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                            <Plane size={15} className="text-[#111111]" />
                            <span>DHL Express International Air Cargo</span>
                          </div>
                          <p className="text-2xs text-neutral-500 mt-1 leading-relaxed">
                            Direct airport priority handling, climate-protected crating, automated customs electronic pre-clearance.
                          </p>
                          <div className="text-3xs text-[#1F7A4D] font-semibold mt-1.5">
                            Estimated Delivery: 3–5 Business Days to {currentCountry.name}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#111111] font-mono">
                        {formatPrice(120)}
                      </span>
                    </label>

                    <label
                      className={`flex items-start justify-between p-5 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedShippingMethod.id === "fedex-medical"
                          ? "border-[#111111] bg-[#FAFAFA]"
                          : "border-[#EAEAEA] hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <input
                          type="radio"
                          name="shippingMethod"
                          checked={selectedShippingMethod.id === "fedex-medical"}
                          onChange={() =>
                            setSelectedShippingMethod({
                              id: "fedex-medical",
                              name: "FedEx Priority Healthcare Logistics",
                              carrier: "FedEx",
                              costUSD: 160,
                              estimatedDays: "2–4 Business Days"
                            })
                          }
                          className="mt-1 text-[#111111] focus:ring-[#111111]"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#111111] flex items-center gap-1.5">
                            <Truck size={15} className="text-[#111111]" />
                            <span>FedEx Priority Healthcare Logistics (Expedited)</span>
                          </div>
                          <p className="text-2xs text-neutral-500 mt-1 leading-relaxed">
                            White-glove hospital delivery with inside delivery and inspection verification.
                          </p>
                          <div className="text-3xs text-[#1F7A4D] font-semibold mt-1.5">
                            Estimated Delivery: 2–4 Business Days to {currentCountry.name}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#111111] font-mono">
                        {formatPrice(160)}
                      </span>
                    </label>
                  </div>

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-2.5 border border-[#EAEAEA] rounded-xl text-xs font-bold text-neutral-700 hover:bg-[#F7F7F7]"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-8 py-3 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                      <span>Continue to Payment</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Payment & Place Order */}
              {step === 3 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider mb-4 border-b border-[#EAEAEA] pb-2.5">
                    Secure International Payment Settlement
                  </h3>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`p-3.5 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                        paymentMethod === "card"
                          ? "border-[#111111] bg-[#FAFAFA] text-[#111111] shadow-2xs"
                          : "border-[#EAEAEA] hover:border-neutral-300 text-neutral-600"
                      }`}
                    >
                      <CreditCard size={18} className="mx-auto mb-1 text-[#111111]" />
                      <span>Credit / Debit Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("wire")}
                      className={`p-3.5 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                        paymentMethod === "wire"
                          ? "border-[#111111] bg-[#FAFAFA] text-[#111111] shadow-2xs"
                          : "border-[#EAEAEA] hover:border-neutral-300 text-neutral-600"
                      }`}
                    >
                      <Building size={18} className="mx-auto mb-1 text-[#111111]" />
                      <span>SWIFT / Bank Wire</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("paypal")}
                      className={`p-3.5 rounded-xl border-2 text-center text-xs font-bold transition-all ${
                        paymentMethod === "paypal"
                          ? "border-[#111111] bg-[#FAFAFA] text-[#111111] shadow-2xs"
                          : "border-[#EAEAEA] hover:border-neutral-300 text-neutral-600"
                      }`}
                    >
                      <span className="text-base font-black text-[#111111] block mb-0.5">P</span>
                      <span>PayPal International</span>
                    </button>
                  </div>

                  {/* Card Fields (if card chosen) */}
                  {paymentMethod === "card" && (
                    <div className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] space-y-3.5 text-xs">
                      <div>
                        <label className="block font-bold text-neutral-700 mb-1.5">Card Number *</label>
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4242 •••• •••• 4242"
                          className="w-full p-2.5 border border-[#EAEAEA] rounded-lg font-mono bg-white focus:outline-none focus:border-[#111111] text-[#111111]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div>
                          <label className="block font-bold text-neutral-700 mb-1.5">Expiry (MM/YY) *</label>
                          <input
                            type="text"
                            required
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="MM/YY"
                            className="w-full p-2.5 border border-[#EAEAEA] rounded-lg font-mono bg-white focus:outline-none focus:border-[#111111] text-[#111111]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-neutral-700 mb-1.5">Security Code (CVC) *</label>
                          <input
                            type="text"
                            required
                            value={cardCVC}
                            onChange={(e) => setCardCVC(e.target.value)}
                            placeholder="CVC"
                            className="w-full p-2.5 border border-[#EAEAEA] rounded-lg font-mono bg-white focus:outline-none focus:border-[#111111] text-[#111111]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "wire" && (
                    <div className="p-5 bg-[#FAFAFA] rounded-xl border border-[#EAEAEA] text-xs text-neutral-800 space-y-2">
                      <div className="font-bold text-[#111111]">B2B Institutional SWIFT Wire Instructions</div>
                      <p className="text-2xs text-neutral-600 leading-relaxed">
                        An official proforma invoice with DR.MEDEX's international IBAN and SWIFT routing credentials will be issued upon order confirmation. Your equipment reservation will be held for 5 business days pending remittance.
                      </p>
                    </div>
                  )}

                  {errorMessage && (
                    <p className="text-xs text-rose-600 font-semibold">{errorMessage}</p>
                  )}

                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-2.5 border border-[#EAEAEA] rounded-xl text-xs font-bold text-neutral-700 hover:bg-[#F7F7F7]"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="px-10 py-3.5 bg-[#111111] hover:bg-[#1F7A4D] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-xs transition-all disabled:opacity-50"
                    >
                      <Lock size={16} />
                      <span>{isProcessing ? "Validating Payment..." : `Authorize & Place Order (${formatPrice(grandTotalUSD)})`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Order Review Sidebar (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-xl border border-[#EAEAEA] p-6 sm:p-7 shadow-2xs space-y-5">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider border-b border-[#EAEAEA] pb-2.5">
                Order Summary ({items.length} items)
              </h3>

              <div className="space-y-3 max-h-64 overflow-y-auto divide-y divide-[#EAEAEA] pr-1">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="pt-3 first:pt-0 flex items-center gap-3">
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-12 h-12 object-contain p-1 rounded-lg border border-[#EAEAEA] bg-[#FAFAFA] shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="font-bold text-[#111111] truncate">{product.title}</div>
                      <div className="text-3xs text-neutral-400 font-mono">Qty: {quantity} • SKU: {product.sku}</div>
                    </div>
                    <span className="font-bold text-[#111111] text-xs whitespace-nowrap">
                      {formatPrice(product.basePrice * quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 pt-3 border-t border-[#EAEAEA] text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#111111]">{formatPrice(baseSubtotalUSD)}</span>
                </div>
                {discountUSD > 0 && (
                  <div className="flex justify-between text-[#1F7A4D] font-medium">
                    <span>Discount</span>
                    <span>-{formatPrice(discountUSD)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600">
                  <span>Air Freight ({currentCountry.name})</span>
                  <span className="font-semibold text-[#111111]">{formatPrice(shippingUSD)}</span>
                </div>
                <div className="pt-2.5 border-t border-[#EAEAEA] flex justify-between text-base font-black text-[#111111]">
                  <span>Total Payable</span>
                  <span className="text-[#111111] text-lg font-extrabold">{formatPrice(grandTotalUSD)}</span>
                </div>
              </div>

              {/* Locked Exchange Rate Indicator */}
              <div className="p-3.5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl text-3xs text-neutral-600 space-y-1">
                <div className="font-bold text-[#111111] flex items-center gap-1">
                  <span>🔒 Locked Exchange Rate Snapshot</span>
                </div>
                <p className="leading-relaxed">
                  Base Price in USD: ${grandTotalUSD.toFixed(2)} USD. Converted at 1 USD = {exchangeRates[currentCurrency] || 1} {currentCurrency}. Historical records are locked to this snapshot.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
