import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Lock,
  ArrowRight,
  Truck,
  Printer,
  Building2,
  ShieldCheck,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
  MapPin,
  User,
  Mail,
  Phone,
  Tag,
  Loader2,
  ChevronRight,
  Check,
  X
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { InternationalPhoneInput } from "../components/InternationalPhoneInput";
import { Order, ShippingAddress, CartItem } from "../types";

declare global {
  interface Window {
    paypal?: any;
  }
}

interface SavedAddressItem extends ShippingAddress {
  id: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

const GUEST_CHECKOUT_STORAGE_KEY = "drmedex_guest_checkout_v2";

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, baseSubtotalUSD, appliedCoupon, discountUSD, applyCoupon, removeCoupon, clearCart } = useCart();
  const { currentCountry, currentCurrency, formatPrice, convertPrice, countries, setCountry, exchangeRates } = useCurrency();
  const { user, isAuthenticated } = useAuth();

  // Multi-step or single-page view state
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Customer Information
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");

  // Shipping Address
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [countryCode, setCountryCode] = useState(currentCountry.code);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);

  // Billing Address
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingFullName, setBillingFullName] = useState("");
  const [billingCompanyName, setBillingCompanyName] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingAddressLine1, setBillingAddressLine1] = useState("");
  const [billingAddressLine2, setBillingAddressLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCountryCode, setBillingCountryCode] = useState(currentCountry.code);

  // Saved Addresses (MongoDB & localStorage)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddressItem | null>(null);

  // Shipping Method
  const [selectedShippingMethod, setSelectedShippingMethod] = useState({
    id: "dhl-air-express",
    name: "DHL Express Medical Air Cargo",
    carrier: "DHL Express",
    costUSD: 0, // Free international air cargo on clinical equipment orders
    estimatedDays: "3–6 Business Days"
  });

  // PayPal Configuration & SDK state
  const [paypalClientId, setPaypalClientId] = useState<string>("");
  const [isPaypalSdkLoaded, setIsPaypalSdkLoaded] = useState(false);
  const [paypalSdkLoadError, setPaypalSdkLoadError] = useState("");
  const paypalButtonContainerRef = useRef<HTMLDivElement>(null);
  const paypalButtonsInstanceRef = useRef<any>(null);

  // Determine PayPal payment currency
  const paypalCurrency = useMemo(() => {
    const PAYPAL_SUPPORTED = new Set([
      "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "NZD", "SGD", "HKD",
      "SEK", "DKK", "PLN", "NOK", "HUF", "CZK", "ILS", "MXN", "BRL", "MYR",
      "PHP", "TWD", "THB"
    ]);
    const curr = (currentCurrency || "USD").toUpperCase();
    return PAYPAL_SUPPORTED.has(curr) ? curr : "USD";
  }, [currentCurrency]);

  // Load Saved Form / Guest Data on Mount
  useEffect(() => {
    try {
      const savedDraftRaw = localStorage.getItem(GUEST_CHECKOUT_STORAGE_KEY);
      if (savedDraftRaw) {
        const draft = JSON.parse(savedDraftRaw);
        if (draft.firstName) setFirstName(draft.firstName);
        if (draft.lastName) setLastName(draft.lastName);
        if (draft.email) setEmail(draft.email);
        if (draft.phone) setPhone(draft.phone);
        if (draft.companyName) setCompanyName(draft.companyName);
        if (draft.addressLine1) setAddressLine1(draft.addressLine1);
        if (draft.addressLine2) setAddressLine2(draft.addressLine2);
        if (draft.city) setCity(draft.city);
        if (draft.state) setState(draft.state);
        if (draft.postalCode) setPostalCode(draft.postalCode);
        if (draft.countryCode) {
          setCountryCode(draft.countryCode);
          setCountry(draft.countryCode);
        }
      }
    } catch (e) {}

    // Pre-populate from authenticated user if available
    if (user) {
      if (user.fullName) {
        const parts = user.fullName.split(" ");
        setFirstName((prev) => prev || parts[0] || "");
        setLastName((prev) => prev || parts.slice(1).join(" ") || "");
      }
      if (user.email) setEmail((prev) => prev || user.email);
      if (user.phone) setPhone((prev) => prev || user.phone);
      if (user.institutionName) setCompanyName((prev) => prev || user.institutionName);
    }
  }, [user]);

  // Load Saved Addresses from MongoDB (for authenticated user or local guest storage)
  useEffect(() => {
    async function loadAddresses() {
      if (user?.id) {
        try {
          const res = await fetch(`/api/customer/addresses?userId=${encodeURIComponent(user.id)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.addresses) && data.addresses.length > 0) {
              setSavedAddresses(data.addresses);
              // Select default shipping or first address
              const defaultAddr = data.addresses.find((a: SavedAddressItem) => a.isDefaultShipping) || data.addresses[0];
              if (defaultAddr) {
                applySavedAddress(defaultAddr);
                setSelectedAddressId(defaultAddr.id);
              }
              return;
            }
          }
        } catch (e) {}
      }

      // Check localStorage for offline / guest saved addresses
      try {
        const localSaved = localStorage.getItem("drmedex_saved_addresses");
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedAddresses(parsed);
            applySavedAddress(parsed[0]);
            setSelectedAddressId(parsed[0].id);
          }
        }
      } catch (e) {}
    }

    loadAddresses();
  }, [user?.id]);

  // Synchronize form draft to localStorage
  useEffect(() => {
    try {
      const draft = {
        firstName,
        lastName,
        email,
        phone,
        companyName,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        countryCode
      };
      localStorage.setItem(GUEST_CHECKOUT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {}
  }, [firstName, lastName, email, phone, companyName, addressLine1, addressLine2, city, state, postalCode, countryCode]);

  // Apply a selected saved address into the form fields
  const applySavedAddress = (addr: SavedAddressItem) => {
    const parts = (addr.fullName || "").split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
    if (addr.companyName) setCompanyName(addr.companyName);
    if (addr.phone) setPhone(addr.phone);
    if (addr.addressLine1) setAddressLine1(addr.addressLine1);
    if (addr.addressLine2) setAddressLine2(addr.addressLine2);
    if (addr.city) setCity(addr.city);
    if (addr.state) setState(addr.state);
    if (addr.postalCode) setPostalCode(addr.postalCode);
    if (addr.countryCode) {
      setCountryCode(addr.countryCode);
      setCountry(addr.countryCode);
    }
  };

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    setCountry(code);
    if (billingSameAsShipping) {
      setBillingCountryCode(code);
    }
  };

  // Save address action
  const handleSaveAddress = async (addrData: Partial<SavedAddressItem>) => {
    const newAddressItem: SavedAddressItem = {
      id: addrData.id || `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fullName: addrData.fullName || `${firstName} ${lastName}`.trim(),
      companyName: addrData.companyName || companyName,
      email: email,
      phone: addrData.phone || phone,
      addressLine1: addrData.addressLine1 || addressLine1,
      addressLine2: addrData.addressLine2 || addressLine2,
      city: addrData.city || city,
      state: addrData.state || state,
      postalCode: addrData.postalCode || postalCode,
      country: countries.find(c => c.code === (addrData.countryCode || countryCode))?.name || "United States",
      countryCode: addrData.countryCode || countryCode,
      isDefaultShipping: Boolean(addrData.isDefaultShipping),
      isDefaultBilling: Boolean(addrData.isDefaultBilling)
    };

    let updatedList: SavedAddressItem[] = [];
    const existingIndex = savedAddresses.findIndex(a => a.id === newAddressItem.id);
    if (existingIndex !== -1) {
      updatedList = [...savedAddresses];
      updatedList[existingIndex] = newAddressItem;
    } else {
      updatedList = [newAddressItem, ...savedAddresses];
    }

    setSavedAddresses(updatedList);
    localStorage.setItem("drmedex_saved_addresses", JSON.stringify(updatedList));

    if (user?.id) {
      try {
        await fetch("/api/customer/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, address: newAddressItem })
        });
      } catch (e) {}
    }

    setSelectedAddressId(newAddressItem.id);
    applySavedAddress(newAddressItem);
    setIsAddressModalOpen(false);
    setEditingAddress(null);
  };

  const handleDeleteAddress = async (addressId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAddresses.filter(a => a.id !== addressId);
    setSavedAddresses(updated);
    localStorage.setItem("drmedex_saved_addresses", JSON.stringify(updated));

    if (user?.id) {
      try {
        await fetch(`/api/customer/addresses/${addressId}?userId=${encodeURIComponent(user.id)}`, {
          method: "DELETE"
        });
      } catch (e) {}
    }

    if (selectedAddressId === addressId) {
      setSelectedAddressId("new");
    }
  };

  // Pricing calculations
  const subtotalINR = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.product.basePrice || 0) * it.quantity, 0);
  }, [items]);

  const discountINR = useMemo(() => {
    if (!appliedCoupon) return 0;
    const raw = (subtotalINR * (appliedCoupon.discountPercent || 0)) / 100;
    const maxDiscountINR = (appliedCoupon.maxDiscountUSD || 999999) / (exchangeRates["USD"] || 0.010379);
    return Math.min(raw, maxDiscountINR);
  }, [subtotalINR, appliedCoupon, exchangeRates]);

  const shippingCostINR = selectedShippingMethod.costUSD / (exchangeRates["USD"] || 0.010379);
  const grandTotalINR = Math.max(0, subtotalINR - discountINR + shippingCostINR);

  // Converted values for display
  const displaySubtotal = convertPrice(subtotalINR);
  const displayDiscount = convertPrice(discountINR);
  const displayShipping = convertPrice(shippingCostINR);
  const displayGrandTotal = convertPrice(grandTotalINR);

  // Converted value in PayPal currency
  const paypalRate = exchangeRates[paypalCurrency] || 0.010379;
  const paypalAmount = grandTotalINR * paypalRate;

  // Coupon handling
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    setCouponSuccess("");
    const res = await applyCoupon(couponInput.trim());
    setIsApplyingCoupon(false);
    if (res.success) {
      setCouponSuccess(res.message);
      setCouponInput("");
    } else {
      setCouponError(res.message);
    }
  };

  // Fetch PayPal Client ID
  useEffect(() => {
    async function fetchPaypalConfig() {
      try {
        const res = await fetch("/api/payment/paypal/config");
        if (res.ok) {
          const data = await res.json();
          if (data.clientId) {
            setPaypalClientId(data.clientId);
            return;
          }
        }
      } catch (e) {}

      // Fallback to client environment variable if set
      const envClientId = (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID;
      if (envClientId) {
        setPaypalClientId(envClientId);
      }
    }

    fetchPaypalConfig();
  }, []);

  // Dynamically load the official PayPal JavaScript SDK
  useEffect(() => {
    if (!paypalClientId) return;

    const scriptId = "paypal-sdk-script";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement;

    // If script with same currency already loaded, ready immediately
    if (existingScript && window.paypal) {
      const currentSrc = existingScript.getAttribute("src") || "";
      if (currentSrc.includes(`currency=${paypalCurrency}`) && currentSrc.includes(paypalClientId)) {
        setIsPaypalSdkLoaded(true);
        return;
      }
      // If currency changed, remove old script and re-inject
      existingScript.remove();
    }

    setIsPaypalSdkLoaded(false);
    setPaypalSdkLoadError("");

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(
      paypalClientId
    )}&currency=${encodeURIComponent(paypalCurrency)}&intent=capture&components=buttons`;
    script.async = true;

    script.onload = () => {
      setIsPaypalSdkLoaded(true);
    };

    script.onerror = () => {
      setPaypalSdkLoadError("Unable to initialize PayPal SDK. Please verify your connection.");
    };

    document.body.appendChild(script);

    return () => {
      // Clean up script on unmount if needed
    };
  }, [paypalClientId, paypalCurrency]);

  // Form Validation Helper
  const validateForm = (): boolean => {
    if (!firstName.trim()) {
      setErrorMessage("Please enter your First Name.");
      return false;
    }
    if (!lastName.trim()) {
      setErrorMessage("Please enter your Last Name.");
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("Please enter a valid official Email Address.");
      return false;
    }
    if (!phone.trim()) {
      setErrorMessage("Please enter an international Phone Number.");
      return false;
    }
    if (!addressLine1.trim()) {
      setErrorMessage("Please provide your Street Shipping Address (Line 1).");
      return false;
    }
    if (!city.trim()) {
      setErrorMessage("Please specify your Delivery City.");
      return false;
    }
    if (!postalCode.trim()) {
      setErrorMessage("Please enter your Postal / ZIP Code.");
      return false;
    }

    if (!billingSameAsShipping) {
      if (!billingFullName.trim()) {
        setErrorMessage("Please enter the Full Name for Billing.");
        return false;
      }
      if (!billingAddressLine1.trim()) {
        setErrorMessage("Please enter the Billing Address Line 1.");
        return false;
      }
      if (!billingCity.trim()) {
        setErrorMessage("Please enter the Billing City.");
        return false;
      }
      if (!billingPostalCode.trim()) {
        setErrorMessage("Please enter the Billing Postal Code.");
        return false;
      }
    }

    setErrorMessage("");
    return true;
  };

  // Render Official PayPal Buttons
  useEffect(() => {
    if (!isPaypalSdkLoaded || !window.paypal || !paypalButtonContainerRef.current) {
      return;
    }

    // Clean up previous button instance if any
    if (paypalButtonContainerRef.current) {
      paypalButtonContainerRef.current.innerHTML = "";
    }

    try {
      const activeCountryObj = countries.find(c => c.code === countryCode) || currentCountry;

      const buttons = window.paypal.Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "paypal",
          height: 44
        },

        // Triggered when buyer clicks PayPal button
        createOrder: async () => {
          if (!validateForm()) {
            throw new Error(errorMessage || "Please complete all required checkout fields.");
          }

          setIsProcessing(true);
          setErrorMessage("");

          const payload = {
            customerId: user?.id || null,
            customer: {
              firstName,
              lastName,
              fullName: `${firstName} ${lastName}`.trim(),
              email,
              phone,
              countryCode,
              companyName
            },
            shippingAddress: {
              fullName: `${firstName} ${lastName}`.trim(),
              companyName,
              phone,
              addressLine1,
              addressLine2,
              city,
              state,
              postalCode,
              country: activeCountryObj.name,
              countryCode
            },
            billingSameAsShipping,
            billingAddress: billingSameAsShipping
              ? null
              : {
                  fullName: billingFullName,
                  companyName: billingCompanyName,
                  phone: billingPhone || phone,
                  addressLine1: billingAddressLine1,
                  addressLine2: billingAddressLine2,
                  city: billingCity,
                  state: billingState,
                  postalCode: billingPostalCode,
                  country: countries.find(c => c.code === billingCountryCode)?.name || activeCountryObj.name,
                  countryCode: billingCountryCode
                },
            currency: currentCurrency,
            couponCode: appliedCoupon?.code || null,
            shippingMethod: selectedShippingMethod,
            items: items.map(it => ({
              productId: it.product.id,
              quantity: it.quantity,
              image: it.product.images[0]
            }))
          };

          const res = await fetch("/api/payment/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });

          const data = await res.json();
          setIsProcessing(false);

          if (!res.ok || !data.success || !data.orderID) {
            throw new Error(data.message || "Could not initialize PayPal order.");
          }

          // Save pending order number in session
          sessionStorage.setItem("drmedex_pending_order_number", data.orderNumber);

          // If customer checked "Save this address", persist to MongoDB in background
          if (saveAddressToAccount && user?.id) {
            handleSaveAddress({
              fullName: `${firstName} ${lastName}`.trim(),
              companyName,
              phone,
              addressLine1,
              addressLine2,
              city,
              state,
              postalCode,
              country: activeCountryObj.name,
              countryCode
            }).catch(() => {});
          }

          return data.orderID;
        },

        // Triggered after buyer authorizes payment in PayPal modal
        onApprove: async (data: any) => {
          setIsProcessing(true);
          setErrorMessage("");

          const orderNumber = sessionStorage.getItem("drmedex_pending_order_number");

          try {
            const captureRes = await fetch("/api/payment/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderID: data.orderID,
                orderNumber
              })
            });

            const captureData = await captureRes.json();
            setIsProcessing(false);

            if (captureRes.ok && captureData.success && captureData.order) {
              setCompletedOrder(captureData.order);
              clearCart();
              localStorage.removeItem(GUEST_CHECKOUT_STORAGE_KEY);
              sessionStorage.removeItem("drmedex_pending_order_number");
              window.scrollTo({ top: 0, behavior: "smooth" });
            } else {
              setErrorMessage(
                captureData.message ||
                "Payment capture failed. Please check your PayPal account or contact our support team."
              );
            }
          } catch (err: any) {
            setIsProcessing(false);
            setErrorMessage(`Error finalizing transaction: ${err.message || "Network timeout"}`);
          }
        },

        onCancel: () => {
          setIsProcessing(false);
          setErrorMessage("PayPal checkout was cancelled. Your cart and details remain safely saved.");
        },

        onError: (err: any) => {
          setIsProcessing(false);
          console.error("PayPal Buttons Runtime Error:", err);
          setErrorMessage(
            typeof err === "string"
              ? err
              : err?.message || "A payment error occurred with PayPal. Please try again or contact support."
          );
        }
      });

      paypalButtonsInstanceRef.current = buttons;
      buttons.render(paypalButtonContainerRef.current);
    } catch (err: any) {
      console.error("PayPal render error:", err);
    }
  }, [
    isPaypalSdkLoaded,
    firstName,
    lastName,
    email,
    phone,
    companyName,
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    countryCode,
    billingSameAsShipping,
    billingFullName,
    billingAddressLine1,
    billingCity,
    billingPostalCode,
    billingCountryCode,
    currentCurrency,
    appliedCoupon,
    items,
    saveAddressToAccount,
    user?.id
  ]);

  // EMPTY CART SCREEN
  if (items.length === 0 && !completedOrder) {
    return (
      <div className="w-full bg-[#FFFFFF] min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#E5E7EB] p-8 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 bg-[#F4F1EB] text-[#2D5A4A] rounded-full flex items-center justify-center mx-auto">
            <Lock size={28} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-[#111111]">Your Cart is Empty</h2>
            <p className="text-xs text-[#737373] leading-relaxed">
              Explore our catalogue of certified medical, surgical, and operating theatre equipment to begin procurement.
            </p>
          </div>
          <Link
            to="/shop-all"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-5 bg-[#7AA05A] hover:bg-[#688a4c] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <span>Browse Medical Equipment</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  // ORDER SUCCESS CONFIRMATION VIEW
  if (completedOrder) {
    return (
      <div className="w-full bg-[#FFFFFF] min-h-screen py-12 sm:py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 sm:p-10 shadow-xs space-y-6">
            
            {/* Header / Verified Badge */}
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-[#F4F1EB] text-[#2D5A4A] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold tracking-wider uppercase bg-[#F4F1EB] text-[#2D5A4A]">
                  <ShieldCheck size={13} /> Verified PayPal Transaction
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                  Order Confirmed & Payment Verified
                </h1>
                <p className="text-xs text-[#4A4A4A] max-w-lg mx-auto">
                  A formal commercial confirmation and calibration proforma invoice have been transmitted to{" "}
                  <strong>{completedOrder.customer?.email}</strong>.
                </p>
              </div>
            </div>

            {/* Order Reference Box */}
            <div className="p-5 bg-[#F8F9FA] border border-[#E5E7EB] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-2xs font-bold text-[#737373] uppercase tracking-wider">Order Reference</div>
                <div className="text-2xl font-mono font-black text-[#2D5A4A] mt-0.5">{completedOrder.orderNumber}</div>
                <div className="text-2xs text-[#737373] mt-1">
                  PayPal Capture ID: <span className="font-mono text-neutral-800">{completedOrder.payment?.paypalCaptureId || completedOrder.payment?.transactionId || "Confirmed"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <Link
                  to={`/track-order?orderId=${completedOrder.orderNumber}`}
                  className="flex-1 sm:flex-none text-center px-5 py-2.5 bg-[#7AA05A] hover:bg-[#688a4c] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  Track Shipment
                </Link>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 border border-[#E5E7EB] text-[#111111] rounded-xl text-xs font-bold hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#111111] uppercase tracking-wider">
                Equipment Ordered ({completedOrder.items?.length || 0})
              </h3>
              <div className="border border-[#E5E7EB] rounded-2xl divide-y divide-[#E5E7EB] overflow-hidden text-xs">
                {completedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4 bg-white">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={item.image || "/placeholder.jpg"}
                        alt={item.title}
                        className="w-12 h-12 object-contain p-1 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-[#111111] truncate">{item.title}</div>
                        <div className="text-3xs text-[#737373] font-mono mt-0.5">
                          SKU: {item.sku} • Qty: {item.quantity}
                        </div>
                      </div>
                    </div>
                    <div className="font-black text-[#111111] whitespace-nowrap">
                      {item.currency} {(((item.unitPrice ?? item.convertedUnitPrice) || 0) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery & Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] space-y-1.5">
                <div className="font-bold text-[#2D5A4A] uppercase text-2xs tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} /> Shipping Destination
                </div>
                <div className="font-semibold text-[#111111]">{completedOrder.shippingAddress?.fullName}</div>
                {completedOrder.shippingAddress?.companyName && (
                  <div className="text-[#4A4A4A]">{completedOrder.shippingAddress.companyName}</div>
                )}
                <div className="text-[#4A4A4A]">
                  {completedOrder.shippingAddress?.addressLine1}
                  {completedOrder.shippingAddress?.addressLine2 ? `, ${completedOrder.shippingAddress.addressLine2}` : ""}
                </div>
                <div className="text-[#4A4A4A]">
                  {completedOrder.shippingAddress?.city}, {completedOrder.shippingAddress?.state} {completedOrder.shippingAddress?.postalCode}
                </div>
                <div className="text-[#111111] font-medium">{completedOrder.shippingAddress?.country}</div>
              </div>

              <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F8F9FA] space-y-1.5">
                <div className="font-bold text-[#2D5A4A] uppercase text-2xs tracking-wider flex items-center gap-1.5">
                  <Truck size={13} /> Logistics & Air Cargo
                </div>
                <div className="font-semibold text-[#111111]">{completedOrder.shippingMethod?.name}</div>
                <div className="text-[#4A4A4A]">Estimated Transit: {completedOrder.shippingMethod?.estimatedDays}</div>
                <div className="text-[#4A4A4A]">Carrier: {completedOrder.shippingMethod?.carrier}</div>
                <div className="text-3xs text-[#737373] pt-1">Tracking number will be activated upon clinical crate dispatch.</div>
              </div>
            </div>

            {/* Final Total Summary */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-[#F4F1EB]/50 space-y-2 text-xs">
              <div className="flex justify-between text-[#4A4A4A]">
                <span>Equipment Subtotal:</span>
                <span className="font-medium text-[#111111]">
                  {completedOrder.pricing?.currency} {completedOrder.pricing?.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {completedOrder.pricing?.discount > 0 && (
                <div className="flex justify-between text-[#2D5A4A]">
                  <span>Clinical Discount:</span>
                  <span className="font-bold">
                    -{completedOrder.pricing?.currency} {completedOrder.pricing?.discount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#4A4A4A]">
                <span>Air Freight & Documentation:</span>
                <span className="font-medium text-[#111111]">
                  {completedOrder.pricing?.shipping > 0
                    ? `${completedOrder.pricing?.currency} ${completedOrder.pricing?.shipping?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "Complimentary Medical Air Cargo"}
                </span>
              </div>
              <div className="pt-2 border-t border-[#E5E7EB] flex justify-between font-black text-sm text-[#111111]">
                <span>Total Amount Paid (PayPal):</span>
                <span className="text-base text-[#2D5A4A]">
                  {completedOrder.pricing?.currency} {completedOrder.pricing?.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link
                to="/shop-all"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2D5A4A] hover:text-[#0D4C3C] hover:underline"
              >
                <span>Continue Shopping the DR.MEDEX Catalogue</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // MAIN CHECKOUT FORM
  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Checkout Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 mb-8 border-b border-[#E5E7EB]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xs font-extrabold uppercase tracking-widest text-[#2D5A4A] bg-[#F4F1EB] px-2.5 py-0.5 rounded-full">
                Direct Clinical Procurement
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight mt-1.5">
              Secure Medical Checkout
            </h1>
            <p className="text-xs text-[#737373] mt-0.5">
              Certified hospital equipment checkout with multi-currency PayPal processing and export documentation.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-[#2D5A4A] bg-[#F4F1EB] px-3 py-2 rounded-xl border border-[#2D5A4A]/20">
            <Lock size={15} />
            <span>256-Bit SSL Encrypted & Verified</span>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage("")}
              className="text-red-500 hover:text-red-800 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* LEFT COLUMN: Customer Information, Saved Addresses, Shipping Address, Billing (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. CUSTOMER INFORMATION */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
                <User size={18} className="text-[#2D5A4A]" />
                <h2 className="text-sm font-extrabold text-[#111111] uppercase tracking-wider">
                  1. Customer & Organization Details
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-[#111111] mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Jonathan"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Reyes"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#111111] mb-1.5">
                    Official Email Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="procurement@hospital.org"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
                    />
                    <Mail size={16} className="absolute left-3 top-3 text-[#737373] pointer-events-none" />
                  </div>
                  <span className="text-3xs text-[#737373] mt-1 block">
                    Order confirmation, commercial invoice, and calibration certificate will be delivered to this email.
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1.5">
                    International Telephone <span className="text-red-500">*</span>
                  </label>
                  <InternationalPhoneInput
                    value={phone}
                    onChange={setPhone}
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1.5">
                    Hospital / Entity Name <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. St. Jude Surgical Wing"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
                    />
                    <Building2 size={16} className="absolute left-3 top-3 text-[#737373] pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SAVED ADDRESS SELECTION (If Available) */}
            {savedAddresses.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-7 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className="text-[#2D5A4A]" />
                    <h2 className="text-sm font-extrabold text-[#111111] uppercase tracking-wider">
                      Saved Delivery Addresses
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAddress(null);
                      setIsAddressModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7AA05A] hover:text-[#2D5A4A] cursor-pointer"
                  >
                    <Plus size={14} /> Add New Address
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {savedAddresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => {
                          setSelectedAddressId(addr.id);
                          applySavedAddress(addr);
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? "border-[#7AA05A] bg-[#F4F1EB]/40 ring-2 ring-[#7AA05A]/20"
                            : "border-[#E5E7EB] bg-white hover:border-neutral-300"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-[#111111]">{addr.fullName}</span>
                            {addr.isDefaultShipping && (
                              <span className="text-3xs font-extrabold text-[#2D5A4A] bg-[#F4F1EB] px-2 py-0.5 rounded-md">
                                Default
                              </span>
                            )}
                          </div>
                          {addr.companyName && (
                            <div className="text-[#4A4A4A] font-medium text-3xs">{addr.companyName}</div>
                          )}
                          <div className="text-[#737373] text-2xs mt-1 leading-relaxed">
                            {addr.addressLine1}
                            {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}, {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                          </div>
                          {addr.phone && (
                            <div className="text-3xs text-[#737373] mt-1 font-mono">{addr.phone}</div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-[#E5E7EB]">
                          <span className={`text-2xs font-bold ${isSelected ? "text-[#2D5A4A]" : "text-[#737373]"}`}>
                            {isSelected ? "✓ Selected for Delivery" : "Select this address"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingAddress(addr);
                                setIsAddressModalOpen(true);
                              }}
                              className="p-1 text-[#737373] hover:text-[#111111] rounded cursor-pointer"
                              title="Edit Address"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAddress(addr.id, e)}
                              className="p-1 text-red-400 hover:text-red-700 rounded cursor-pointer"
                              title="Delete Address"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. SHIPPING DESTINATION FORM */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
                <Truck size={18} className="text-[#2D5A4A]" />
                <h2 className="text-sm font-extrabold text-[#111111] uppercase tracking-wider">
                  2. Regional Shipping Destination
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#111111] mb-1.5">
                    Destination Country / Jurisdiction <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={countryCode}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-semibold focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all cursor-pointer"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.currency} - {c.symbol})
                      </option>
                    ))}
                  </select>
                  <span className="text-3xs text-[#737373] mt-1 block">
                    Lead time: {currentCountry.leadTimeAirDays || "3-6 business days"} via DHL Express Cargo. Standards: {currentCountry.regulatoryStandards || "ISO 13485:2016"}.
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#111111] mb-1.5">
                    Street Address (Line 1) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Building, street, hospital ward, suite number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#111111] mb-1.5">
                    Address Line 2 <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Department, floor, surgical suite, loading dock"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1.5">
                    City / Municipality <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. San Francisco"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1.5">
                    State / Province / Region
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. California"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-[#111111] mb-1.5">
                    Postal / ZIP Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 94143"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400"
                  />
                </div>
              </div>

              {/* Save Address Checkbox */}
              {user && (
                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#111111]">
                    <input
                      type="checkbox"
                      checked={saveAddressToAccount}
                      onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                      className="w-4 h-4 rounded text-[#7AA05A] focus:ring-[#7AA05A] accent-[#7AA05A]"
                    />
                    <span>Save this delivery address to my DR.MEDEX account for future orders</span>
                  </label>
                </div>
              )}
            </div>

            {/* 4. BILLING ADDRESS SAME AS SHIPPING CHECKBOX */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-[#111111]">
                  <input
                    type="checkbox"
                    checked={billingSameAsShipping}
                    onChange={(e) => setBillingSameAsShipping(e.target.checked)}
                    className="w-4 h-4 rounded text-[#7AA05A] focus:ring-[#7AA05A] accent-[#7AA05A]"
                  />
                  <span>Billing address same as shipping address</span>
                </label>
              </div>

              {/* SEPARATE BILLING ADDRESS FORM */}
              {!billingSameAsShipping && (
                <div className="pt-4 border-t border-[#E5E7EB] space-y-4 animate-in fade-in duration-150">
                  <h3 className="text-xs font-extrabold text-[#2D5A4A] uppercase tracking-wider">
                    Separate Billing Address
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-[#111111] mb-1.5">
                        Billing Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={billingFullName}
                        onChange={(e) => setBillingFullName(e.target.value)}
                        placeholder="Accounts Department / Representative"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-[#111111] mb-1.5">
                        Billing Country <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={billingCountryCode}
                        onChange={(e) => setBillingCountryCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-semibold focus:outline-none focus:border-[#7AA05A]"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-[#111111] mb-1.5">
                        Billing Street Address (Line 1) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={billingAddressLine1}
                        onChange={(e) => setBillingAddressLine1(e.target.value)}
                        placeholder="Street, suite, financial office"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#111111] mb-1.5">
                        Billing City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={billingCity}
                        onChange={(e) => setBillingCity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[#111111] mb-1.5">
                        Billing State / Region
                      </label>
                      <input
                        type="text"
                        value={billingState}
                        onChange={(e) => setBillingState(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold text-[#111111] mb-1.5">
                        Billing Postal Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={billingPostalCode}
                        onChange={(e) => setBillingPostalCode(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E7EB] bg-white text-[#111111] font-medium focus:outline-none focus:border-[#7AA05A]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. LOGISTICS / AIR CARGO METHOD */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-7 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-3 border-b border-[#E5E7EB]">
                <Truck size={18} className="text-[#2D5A4A]" />
                <h2 className="text-sm font-extrabold text-[#111111] uppercase tracking-wider">
                  3. Logistics & Protective Air Crate
                </h2>
              </div>

              <div className="p-4 rounded-xl border border-[#7AA05A] bg-[#F4F1EB]/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-center text-[#2D5A4A] shrink-0 font-black">
                    DHL
                  </div>
                  <div>
                    <div className="font-bold text-[#111111]">{selectedShippingMethod.name}</div>
                    <div className="text-2xs text-[#737373]">
                      Lead Time: {selectedShippingMethod.estimatedDays} • Heavy-duty vibration-damped medical export packing
                    </div>
                  </div>
                </div>
                <div className="font-bold text-[#2D5A4A] text-right whitespace-nowrap">
                  Included
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary, Coupon Engine & PayPal Payment Gateway (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* ORDER SUMMARY CARD */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <h2 className="text-sm font-extrabold text-[#111111] uppercase tracking-wider">
                  Order Summary ({items.length})
                </h2>
                <Link to="/cart" className="text-2xs font-bold text-[#7AA05A] hover:underline">
                  Edit Cart
                </Link>
              </div>

              {/* Items List */}
              <div className="divide-y divide-[#E5E7EB] max-h-80 overflow-y-auto pr-1 space-y-3">
                {items.map((it) => {
                  const lineTotalDisplay = convertPrice((it.product.basePrice || 0) * it.quantity);
                  const unitPriceDisplay = convertPrice(it.product.basePrice || 0);

                  return (
                    <div key={it.product.id} className="pt-3 first:pt-0 flex items-start gap-3">
                      <img
                        src={it.product.images[0] || "/placeholder.jpg"}
                        alt={it.product.title}
                        className="w-14 h-14 object-contain rounded-xl p-1 border border-[#E5E7EB] bg-[#F8F9FA] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-[#111111] truncate">{it.product.title}</h4>
                        <div className="text-3xs text-[#737373] font-mono mt-0.5">
                          SKU: {it.product.sku}
                        </div>
                        <div className="text-2xs text-[#4A4A4A] mt-1 flex items-center justify-between">
                          <span>Qty: {it.quantity} × {formatPrice(it.product.basePrice || 0)}</span>
                          <span className="font-bold text-[#111111]">
                            {currentCurrency} {lineTotalDisplay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* COUPON INPUT */}
              <div className="pt-3 border-t border-[#E5E7EB]">
                {appliedCoupon ? (
                  <div className="p-3 rounded-xl bg-[#F4F1EB] border border-[#7AA05A]/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Tag size={15} className="text-[#2D5A4A]" />
                      <div>
                        <span className="font-extrabold text-[#2D5A4A]">{appliedCoupon.code}</span>
                        <span className="text-3xs text-[#737373] block">
                          {appliedCoupon.description || `${appliedCoupon.discountPercent}% Off Applied`}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-xs font-bold text-red-600 hover:text-red-800 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Discount or Coupon Code"
                        className="flex-1 px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs uppercase font-semibold focus:outline-none focus:border-[#7AA05A]"
                      />
                      <button
                        type="submit"
                        disabled={isApplyingCoupon || !couponInput.trim()}
                        className="px-4 py-2 bg-[#2D5A4A] hover:bg-[#0D4C3C] disabled:bg-neutral-200 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        {isApplyingCoupon ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
                      </button>
                    </div>
                    {couponError && <span className="text-3xs text-red-600 font-medium block">{couponError}</span>}
                    {couponSuccess && <span className="text-3xs text-[#2D5A4A] font-medium block">{couponSuccess}</span>}
                  </form>
                )}
              </div>

              {/* Pricing Breakdown */}
              <div className="pt-3 border-t border-[#E5E7EB] space-y-2 text-xs">
                <div className="flex justify-between text-[#737373]">
                  <span>Catalogue Subtotal:</span>
                  <span className="font-semibold text-[#111111]">
                    {currentCurrency} {displaySubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {displayDiscount > 0 && (
                  <div className="flex justify-between text-[#2D5A4A]">
                    <span className="font-bold">Clinical Discount:</span>
                    <span className="font-bold">
                      -{currentCurrency} {displayDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-[#737373]">
                  <span>International Air Cargo:</span>
                  <span className="font-semibold text-[#2D5A4A]">
                    Complimentary Express Cargo
                  </span>
                </div>

                <div className="flex justify-between text-[#737373]">
                  <span>Customs Export Duties:</span>
                  <span className="font-semibold text-[#111111]">Export Certified / Included</span>
                </div>

                <div className="pt-3 border-t border-[#E5E7EB] flex items-baseline justify-between">
                  <div>
                    <div className="text-sm font-black text-[#111111]">Total Amount</div>
                    <div className="text-3xs text-[#737373]">
                      Payable in {currentCurrency} via PayPal
                    </div>
                  </div>
                  <div className="text-xl font-black text-[#2D5A4A]">
                    {currentCurrency} {displayGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Currency conversion notification if target currency is adjusted for PayPal */}
                {paypalCurrency !== currentCurrency && (
                  <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#E5E7EB] text-3xs text-[#4A4A4A] flex items-start gap-1.5">
                    <ShieldCheck size={14} className="shrink-0 text-[#2D5A4A] mt-0.5" />
                    <span>
                      PayPal charge will be settled in <strong>{paypalCurrency} (${paypalAmount.toFixed(2)})</strong> using real-time interbank conversion rates.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* PAYPAL PAYMENT GATEWAY CONTAINER */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#003087] text-white flex items-center justify-center font-black text-2xs italic">
                    P
                  </div>
                  <h2 className="text-sm font-extrabold text-[#111111] uppercase tracking-wider">
                    PayPal Payment Gateway
                  </h2>
                </div>
                <span className="text-3xs font-bold text-[#737373] uppercase tracking-wider">
                  Instant Authorization
                </span>
              </div>

              {/* PayPal Buttons Render Container */}
              <div className="space-y-3">
                {isProcessing && (
                  <div className="p-4 rounded-xl bg-[#F4F1EB] border border-[#7AA05A]/30 text-center space-y-2">
                    <Loader2 size={24} className="animate-spin text-[#2D5A4A] mx-auto" />
                    <p className="text-xs font-bold text-[#111111]">Connecting to PayPal Secure Checkout...</p>
                    <p className="text-3xs text-[#737373]">Please do not close or refresh this window.</p>
                  </div>
                )}

                {paypalSdkLoadError && (
                  <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    {paypalSdkLoadError}
                  </div>
                )}

                {!isPaypalSdkLoaded && !paypalSdkLoadError && (
                  <div className="py-6 text-center text-xs text-[#737373] flex flex-col items-center gap-2">
                    <Loader2 size={20} className="animate-spin text-[#7AA05A]" />
                    <span>Loading secure PayPal Gateway...</span>
                  </div>
                )}

                {/* The PayPal JS SDK will render into this container */}
                <div
                  ref={paypalButtonContainerRef}
                  className={`w-full transition-opacity duration-200 ${
                    isProcessing ? "opacity-40 pointer-events-none" : "opacity-100"
                  }`}
                />
              </div>

              {/* Security guarantees */}
              <div className="pt-3 border-t border-[#E5E7EB] space-y-2 text-3xs text-[#737373]">
                <div className="flex items-center gap-1.5 text-[#2D5A4A] font-semibold">
                  <ShieldCheck size={13} />
                  <span>Buyer Protection & Official Proforma Documentation Included</span>
                </div>
                <p className="leading-relaxed">
                  Your payment is processed through PayPal's PCI-DSS Level 1 compliant infrastructure. DR.MEDEX does not view or store payment card credentials.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL: ADD / EDIT ADDRESS */}
        {isAddressModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E5E7EB] space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <h3 className="text-sm font-extrabold text-[#111111] uppercase tracking-wider">
                  {editingAddress ? "Edit Saved Address" : "Add Delivery Address"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddressModalOpen(false);
                    setEditingAddress(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const data = new FormData(form);
                  handleSaveAddress({
                    id: editingAddress?.id,
                    fullName: String(data.get("fullName") || ""),
                    companyName: String(data.get("companyName") || ""),
                    phone: String(data.get("phone") || ""),
                    addressLine1: String(data.get("addressLine1") || ""),
                    addressLine2: String(data.get("addressLine2") || ""),
                    city: String(data.get("city") || ""),
                    state: String(data.get("state") || ""),
                    postalCode: String(data.get("postalCode") || ""),
                    countryCode: String(data.get("countryCode") || countryCode),
                    isDefaultShipping: Boolean(data.get("isDefaultShipping"))
                  });
                }}
                className="space-y-3.5 text-xs"
              >
                <div>
                  <label className="block font-bold text-[#111111] mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    defaultValue={editingAddress?.fullName || `${firstName} ${lastName}`.trim()}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#7AA05A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1">Company / Hospital</label>
                  <input
                    type="text"
                    name="companyName"
                    defaultValue={editingAddress?.companyName || companyName}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#7AA05A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    defaultValue={editingAddress?.phone || phone}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#7AA05A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1">Country *</label>
                  <select
                    name="countryCode"
                    defaultValue={editingAddress?.countryCode || countryCode}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] bg-white font-medium focus:outline-none focus:border-[#7AA05A]"
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1">Address Line 1 *</label>
                  <input
                    type="text"
                    name="addressLine1"
                    required
                    defaultValue={editingAddress?.addressLine1 || addressLine1}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#7AA05A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1">Address Line 2</label>
                  <input
                    type="text"
                    name="addressLine2"
                    defaultValue={editingAddress?.addressLine2 || addressLine2}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#7AA05A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#111111] mb-1">City *</label>
                    <input
                      type="text"
                      name="city"
                      required
                      defaultValue={editingAddress?.city || city}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#7AA05A]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#111111] mb-1">Postal Code *</label>
                    <input
                      type="text"
                      name="postalCode"
                      required
                      defaultValue={editingAddress?.postalCode || postalCode}
                      className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] focus:outline-none focus:border-[#7AA05A]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#111111]">
                    <input
                      type="checkbox"
                      name="isDefaultShipping"
                      defaultChecked={editingAddress?.isDefaultShipping || false}
                      className="w-4 h-4 rounded text-[#7AA05A] focus:ring-[#7AA05A] accent-[#7AA05A]"
                    />
                    <span>Set as default shipping address</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddressModalOpen(false);
                      setEditingAddress(null);
                    }}
                    className="px-4 py-2 border border-[#E5E7EB] text-[#4A4A4A] rounded-xl hover:bg-neutral-100 cursor-pointer font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#7AA05A] hover:bg-[#688a4c] text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
