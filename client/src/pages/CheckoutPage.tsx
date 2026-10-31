import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
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
  Tag,
  Loader2,
  ChevronRight,
  Check,
  X,
  Search,
  Globe,
  CreditCard,
  PackageCheck,
  FileText,
  Navigation
} from "lucide-react";
import { useCart } from "../context/CartContext";
import { useCurrency } from "../context/CurrencyContext";
import { useAuth } from "../context/AuthContext";
import { InternationalPhoneInput, PhoneCountryItem } from "../components/InternationalPhoneInput";
import { SmartLocationPrompt, ResolvedLocationData } from "../components/SmartLocationPrompt";
import { AmazonCascadingAddressForm, AddressFormData } from "../components/AmazonCascadingAddressForm";
import { renderBrandTitle } from "../components/BrandTitle";
import { hasDismissedLocationPrompt } from "../services/pushNotificationService";
import {
  WORLDWIDE_195_GEO_COUNTRIES,
  getCountryByCode,
  filterCountries,
  GeoCountry,
  POPULAR_COUNTRY_CODES
} from "../data/geo/geoService";
import { Order, ShippingAddress } from "../types";

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

interface CountryItem {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  currency: string;
  symbol: string;
  postalLabel?: string | null;
  stateLabel?: string;
  hasPostalCode?: boolean;
  hasStates?: boolean;
}

interface StateItem {
  code: string;
  name: string;
  countryCode: string;
}

interface AutocompleteSuggestion {
  formattedAddress: string;
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  countryCode: string;
  provider?: string;
}

const GUEST_CHECKOUT_STORAGE_KEY = "drmedex_guest_checkout_v4";

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { items, appliedCoupon, applyCoupon, removeCoupon, clearCart } = useCart();
  const { currentCountry, currentCurrency, formatPrice, convertPrice, exchangeRates, setCurrencyManually } = useCurrency();
  const { user } = useAuth();

  // Multi-step Checkout State (1: Destination & Customer, 2: Air Freight Logistics, 3: Payment & Confirmation)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Coupon handling
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Complete 195 Worldwide Countries & States State
  const [countriesList, setCountriesList] = useState<CountryItem[]>(WORLDWIDE_195_GEO_COUNTRIES as unknown as CountryItem[]);
  const [statesList, setStatesList] = useState<StateItem[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  // Customer & Medical Procurement Information (Initialized 100% empty - NO mock data)
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [taxId, setTaxId] = useState("");

  // Shipping Destination (Initialized 100% empty - NO mock data)
  const [countryCode, setCountryCode] = useState<string>("IN");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [buildingSuite, setBuildingSuite] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(true);

  // Real-Time Address Autocomplete State
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  // Smart Location Detection State
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Billing Address
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingFullName, setBillingFullName] = useState("");
  const [billingCompanyName, setBillingCompanyName] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [billingCountryCode, setBillingCountryCode] = useState<string>("IN");
  const [billingAddressLine1, setBillingAddressLine1] = useState("");
  const [billingAddressLine2, setBillingAddressLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingState, setBillingState] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");

  // Saved Addresses (MongoDB & localStorage)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddressItem[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddressItem | null>(null);

  // Shipping Method
  const [selectedShippingMethod] = useState({
    id: "dhl-air-express",
    name: "DHL Express Medical Air Cargo",
    carrier: "DHL Express",
    costUSD: 0, // Complimentary international air freight
    estimatedDays: "3–6 Business Days"
  });

  // PayPal Configuration & SDK state
  const [paypalClientId, setPaypalClientId] = useState<string>("");
  const [isPaypalSdkLoaded, setIsPaypalSdkLoaded] = useState(false);
  const [paypalSdkLoadError, setPaypalSdkLoadError] = useState("");
  const paypalButtonContainerRef = useRef<HTMLDivElement>(null);
  const paypalButtonsInstanceRef = useRef<any>(null);

  // 1. Fetch Complete 195 Worldwide Countries List on Mount
  useEffect(() => {
    let isMounted = true;
    async function loadCountries() {
      try {
        const res = await fetch("/api/location/countries");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.success && Array.isArray(data.countries) && data.countries.length > 0) {
            setCountriesList(data.countries);
            const initialCode = currentCountry?.code || "IN";
            setCountryCode(initialCode);
            setBillingCountryCode(initialCode);
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch location countries:", err);
      }
    }
    loadCountries();
    return () => {
      isMounted = false;
    };
  }, [currentCountry]);

  // Active country object
  const activeCountry = useMemo<CountryItem>(() => {
    const geoFound = getCountryByCode(countryCode);
    if (geoFound) return geoFound as unknown as CountryItem;
    const found = countriesList.find((c) => c.code.toUpperCase() === countryCode.toUpperCase());
    if (found) return found;
    return {
      code: countryCode || "IN",
      name: countryCode === "IN" ? "India" : (countryCode === "US" ? "United States" : countryCode),
      flag: countryCode === "IN" ? "🇮🇳" : (countryCode === "US" ? "🇺🇸" : "🌐"),
      dialCode: countryCode === "IN" ? "+91" : (countryCode === "US" ? "+1" : "+1"),
      currency: countryCode === "IN" ? "INR" : "USD",
      symbol: countryCode === "IN" ? "₹" : "$",
      postalLabel: countryCode === "IN" ? "PIN Code" : (countryCode === "US" ? "ZIP Code" : "Postal Code"),
      stateLabel: countryCode === "CA" ? "Province" : (countryCode === "GB" ? "County / Region" : "State / Province"),
      hasPostalCode: true,
      hasStates: true
    };
  }, [countriesList, countryCode]);

  // 2. Fetch States/Provinces dynamically when Country Code changes
  useEffect(() => {
    if (!countryCode) return;
    let isMounted = true;
    setIsLoadingStates(true);

    fetch(`/api/location/states?countryCode=${encodeURIComponent(countryCode)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          if (data.success && Array.isArray(data.states)) {
            setStatesList(data.states);
          } else {
            setStatesList([]);
          }
          setIsLoadingStates(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStatesList([]);
          setIsLoadingStates(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [countryCode]);

  // Handle Country Selection with automatic calling code & currency synchronization
  const handleSelectCountry = (selected: CountryItem) => {
    setCountryCode(selected.code);
    setIsCountryDropdownOpen(false);
    setCountrySearchQuery("");

    if (billingSameAsShipping) {
      setBillingCountryCode(selected.code);
    }

    // Reset dependent geographic fields
    setState("");
    setDistrict("");
    setCity("");
    setPostalCode("");
    setAutocompleteQuery("");
    setAutocompleteSuggestions([]);

    // Auto-suggest country native currency if available
    if (selected.currency && selected.currency !== currentCurrency) {
      setCurrencyManually(selected.currency);
    }
  };

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      if (autocompleteContainerRef.current && !autocompleteContainerRef.current.contains(e.target as Node)) {
        setShowAddressSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Real-Time Address Autocomplete with Debounce & Cache
  const handleAddressSearchChange = (query: string) => {
    setAutocompleteQuery(query);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (query.trim().length < 2) {
      setAutocompleteSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }

    setIsSearchingAddress(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/location/autocomplete?query=${encodeURIComponent(query)}&countryCode=${encodeURIComponent(countryCode)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.suggestions)) {
            setAutocompleteSuggestions(data.suggestions);
            setShowAddressSuggestions(data.suggestions.length > 0);
          }
        }
      } catch (err) {
        console.warn("Autocomplete request failed:", err);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);
  };

  const handleSelectAddressSuggestion = (sug: AutocompleteSuggestion) => {
    if (sug.addressLine1) setAddressLine1(sug.addressLine1);
    else if (sug.formattedAddress) setAddressLine1(sug.formattedAddress.split(",")[0]);

    if (sug.city) setCity(sug.city);
    if (sug.state) setState(sug.state);
    if (sug.postalCode) setPostalCode(sug.postalCode);
    setAutocompleteQuery(sug.formattedAddress || sug.addressLine1);
    setShowAddressSuggestions(false);
  };

  // 3b. Smart Location Handler: Auto-fill regional destination without overwriting manual intent
  const handleLocationDetected = (loc: ResolvedLocationData) => {
    if (loc.countryCode) {
      setCountryCode(loc.countryCode.toUpperCase());
    }
    if (loc.state) {
      setState(loc.state);
    }
    if (loc.stateCode) {
      setStateCode(loc.stateCode.toUpperCase());
    }
    if (loc.city) {
      setCity(loc.city);
    } else if (loc.district) {
      setCity(loc.district);
    }
    if (loc.district) {
      setDistrict(loc.district);
    }
    if (loc.postalCode) {
      setPostalCode(loc.postalCode);
    }
    if (loc.streetAddress) {
      setAddressLine1(loc.streetAddress);
      setAutocompleteQuery(loc.formattedAddress || loc.streetAddress);
    } else if (loc.formattedAddress) {
      setAddressLine1(loc.formattedAddress.split(",")[0].trim());
      setAutocompleteQuery(loc.formattedAddress);
    }

    try {
      sessionStorage.setItem("drmedex_location_session_dismissed", "true");
    } catch (e) {}

    const locSummary = [loc.city || loc.district, loc.state, loc.country].filter(Boolean).join(", ");
    if (loc.accuracy && loc.accuracy > 2000) {
      setLocationNotice(`Approximate location detected: ${locSummary} (~${Math.round(loc.accuracy / 1000)} km precision) — Please verify your delivery address.`);
    } else {
      setLocationNotice(`Location detected: ${locSummary} — Please verify your delivery address.`);
    }
  };

  const handleDirectDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice("Geolocation is not supported by your current browser. Please enter your address manually.");
      return;
    }

    setIsGeolocating(true);
    setLocationNotice(null);

    const onGeoSuccess = async (pos: GeolocationPosition) => {
      try {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 0);

        const res = await fetch(`/api/location/reverse-geocode?lat=${lat}&lng=${lng}&acc=${accuracy}`);
        if (!res.ok) {
          let errorDetail = `HTTP ${res.status}`;
          try {
            const errJson = await res.json();
            if (errJson && errJson.message) errorDetail = errJson.message;
          } catch (e) {}
          throw new Error(errorDetail);
        }

        const data = await res.json();
        if (data.success) {
          handleLocationDetected(data);
          return;
        }
        throw new Error(data.message || "Could not resolve address");
      } catch (err: any) {
        console.warn("[Checkout] Geolocation reverse lookup error:", err);
        setLocationNotice(`Unable to auto-detect location: ${err.message || "Service unavailable"}. Please enter your regional address manually below.`);
      } finally {
        setIsGeolocating(false);
      }
    };

    const onGeoError = (err: GeolocationPositionError) => {
      setIsGeolocating(false);
      if (err.code === err.PERMISSION_DENIED) {
        setLocationNotice("Location permission was denied in your browser settings. You can enter your regional shipping destination manually below, or enable location in site permissions.");
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        setLocationNotice("GPS location is unavailable on this device. Please enter your address manually.");
      } else if (err.code === err.TIMEOUT) {
        setLocationNotice("Location request timed out. Please enter your address manually.");
      } else {
        setLocationNotice("Location error. Please enter your address manually.");
      }
    };

    navigator.geolocation.getCurrentPosition(
      onGeoSuccess,
      (firstErr) => {
        if (firstErr.code === firstErr.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            onGeoSuccess,
            onGeoError,
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 }
          );
        } else {
          onGeoError(firstErr);
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  };

  // Checkout Initiation Intent & Smart Location Flow
  useEffect(() => {
    const searchParams = new URLSearchParams(routeLocation.search);
    const hasCheckoutIntent = searchParams.get("initiateLocation") === "1" ||
                              searchParams.get("promptLocation") === "1" ||
                              (routeLocation.state as any)?.fromCheckoutIntent;

    // Clean the URL query params so refresh doesn't re-trigger intent
    if (searchParams.has("initiateLocation") || searchParams.has("promptLocation")) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }

    if (!hasCheckoutIntent) {
      return;
    }

    // Check if location prompt was already dismissed in this session
    let isSessionDismissed = false;
    try {
      isSessionDismissed = sessionStorage.getItem("drmedex_location_session_dismissed") === "true";
    } catch (e) {}

    if (isSessionDismissed) {
      return;
    }

    // Check Permissions API if available
    if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((permissionStatus) => {
          if (permissionStatus.state === "granted") {
            // Permission ALREADY granted: retrieve position directly without displaying modal
            handleDirectDetectLocation();
          } else if (permissionStatus.state === "denied") {
            // Previously denied in browser: do not repeatedly trigger prompt, show helpful non-intrusive tip
            setLocationNotice(
              "Location access is currently disabled in your browser. You can enter your delivery address manually below, or enable location in your browser site settings."
            );
          } else {
            // Default / prompt state: display DR.MEDEX location permission modal
            setShowLocationPrompt(true);
          }
        })
        .catch(() => {
          // Permissions API query not supported or failed: open DR.MEDEX custom prompt
          setShowLocationPrompt(true);
        });
    } else {
      setShowLocationPrompt(true);
    }
  }, [routeLocation.search, routeLocation.state]);

  // 4. Pre-populate from authenticated user or saved guest draft (STRICTLY NO FAKE MOCK DATA)
  useEffect(() => {
    try {
      const savedDraftRaw = localStorage.getItem(GUEST_CHECKOUT_STORAGE_KEY);
      if (savedDraftRaw) {
        const draft = JSON.parse(savedDraftRaw);
        if (draft.firstName) setFirstName(draft.firstName);
        if (draft.lastName) setLastName(draft.lastName);
        if (draft.fullName) {
          setFullName(draft.fullName);
          if (!draft.firstName) {
            const parts = draft.fullName.trim().split(" ");
            setFirstName(parts[0] || "");
            setLastName(parts.slice(1).join(" ") || "");
          }
        }
        if (draft.professionalTitle) setProfessionalTitle(draft.professionalTitle);
        if (draft.email) setEmail(draft.email);
        if (draft.phone) setPhone(draft.phone);
        if (draft.companyName) setCompanyName(draft.companyName);
        if (draft.department) setDepartment(draft.department);
        if (draft.addressLine1) setAddressLine1(draft.addressLine1);
        if (draft.addressLine2) setAddressLine2(draft.addressLine2);
        if (draft.buildingSuite) setBuildingSuite(draft.buildingSuite);
        if (draft.district) setDistrict(draft.district);
        if (draft.city) setCity(draft.city);
        if (draft.state) setState(draft.state);
        if (draft.stateCode) setStateCode(draft.stateCode);
        if (draft.postalCode) setPostalCode(draft.postalCode);
        if (draft.countryCode) setCountryCode(draft.countryCode);
      }
    } catch (e) {}

    if (user) {
      if (user.fullName) {
        setFullName((prev) => prev || user.fullName);
        const parts = user.fullName.trim().split(" ");
        setFirstName((prev) => prev || parts[0] || "");
        setLastName((prev) => prev || parts.slice(1).join(" ") || "");
      }
      if (user.email) setEmail((prev) => prev || user.email);
      if (user.phone) setPhone((prev) => prev || user.phone);
      if (user.institutionName) setCompanyName((prev) => prev || user.institutionName);
    }
  }, [user]);

  // Load Saved Addresses from MongoDB (for authenticated user) or localStorage (for guest)
  useEffect(() => {
    async function loadAddresses() {
      if (user?.id) {
        try {
          const res = await fetch(`/api/customer/addresses?userId=${encodeURIComponent(user.id)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.addresses) && data.addresses.length > 0) {
              setSavedAddresses(data.addresses);
              const defaultAddr = data.addresses.find((a: SavedAddressItem) => a.isDefaultShipping) || data.addresses[0];
              if (defaultAddr && !fullName && !addressLine1) {
                applySavedAddress(defaultAddr);
                setSelectedAddressId(defaultAddr.id);
              }
              return;
            }
          }
        } catch (e) {}
      }

      try {
        const localSaved = localStorage.getItem("drmedex_saved_addresses");
        if (localSaved) {
          const parsed = JSON.parse(localSaved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedAddresses(parsed);
          }
        }
      } catch (e) {}
    }

    loadAddresses();
  }, [user?.id]);

  // Save draft state in localStorage
  useEffect(() => {
    try {
      const draft = {
        firstName,
        lastName,
        fullName: fullName || `${firstName} ${lastName}`.trim(),
        professionalTitle,
        email,
        phone,
        companyName,
        department,
        addressLine1,
        addressLine2,
        buildingSuite,
        district,
        city,
        state,
        stateCode,
        postalCode,
        countryCode
      };
      localStorage.setItem(GUEST_CHECKOUT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {}
  }, [firstName, lastName, fullName, professionalTitle, email, phone, companyName, department, addressLine1, addressLine2, buildingSuite, district, city, state, stateCode, postalCode, countryCode]);

  // Apply a saved address
  const applySavedAddress = (addr: SavedAddressItem) => {
    setFullName(addr.fullName || "");
    const parts = (addr.fullName || "").trim().split(" ");
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
      if (billingSameAsShipping) setBillingCountryCode(addr.countryCode);
    }
  };

  // Save address action
  const handleSaveAddress = async (addrData: Partial<SavedAddressItem>) => {
    const newAddressItem: SavedAddressItem = {
      id: addrData.id || `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fullName: addrData.fullName || fullName,
      companyName: addrData.companyName || companyName,
      email: email,
      phone: addrData.phone || phone,
      addressLine1: addrData.addressLine1 || addressLine1,
      addressLine2: addrData.addressLine2 || addressLine2,
      city: addrData.city || city,
      state: addrData.state || state,
      postalCode: addrData.postalCode || postalCode,
      country: activeCountry.name,
      countryCode: addrData.countryCode || countryCode,
      isDefaultShipping: Boolean(addrData.isDefaultShipping),
      isDefaultBilling: Boolean(addrData.isDefaultBilling)
    };

    let updatedList: SavedAddressItem[] = [];
    const existingIndex = savedAddresses.findIndex((a) => a.id === newAddressItem.id);
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
    const updated = savedAddresses.filter((a) => a.id !== addressId);
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
  const displayGrandTotal = convertPrice(grandTotalINR);

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

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const fName = firstName.trim() || fullName.trim().split(" ")[0];
    const lName = lastName.trim() || fullName.trim().split(" ").slice(1).join(" ");
    if (!fName || !lName) {
      setErrorMessage("Please enter both First Name and Last Name.");
      window.scrollTo({ top: 120, behavior: "smooth" });
      return false;
    }
    if (!phone.trim() || phone.replace(/[^\d]/g, "").length < 6) {
      setErrorMessage("Please enter a valid Phone Number.");
      window.scrollTo({ top: 120, behavior: "smooth" });
      return false;
    }
    if (!countryCode) {
      setErrorMessage("Please select a Destination Country.");
      return false;
    }
    if (activeCountry.hasStates !== false && !state.trim()) {
      setErrorMessage(`Please select your ${activeCountry.stateLabel || "State / Province"}.`);
      return false;
    }
    if (!city.trim()) {
      setErrorMessage("Please specify your Delivery City / Locality.");
      return false;
    }
    if (activeCountry.hasPostalCode !== false && !postalCode.trim()) {
      setErrorMessage(`Please enter your ${activeCountry.postalLabel || "Postal / ZIP Code"}.`);
      return false;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("Please enter a valid Email Address.");
      window.scrollTo({ top: 120, behavior: "smooth" });
      return false;
    }
    if (!addressLine1.trim()) {
      setErrorMessage("Please enter your Street Address.");
      return false;
    }

    if (!billingSameAsShipping) {
      if (!billingFullName.trim()) {
        setErrorMessage("Please enter the Full Name for Billing.");
        return false;
      }
      if (!billingAddressLine1.trim()) {
        setErrorMessage("Please enter the Billing Street Address.");
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

  const handleContinueToStep2 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleContinueToStep3 = () => {
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

      const envClientId = (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID;
      if (envClientId) {
        setPaypalClientId(envClientId);
        return;
      }

      setPaypalSdkLoadError(
        "PayPal Gateway credentials (PAYPAL_CLIENT_ID) are not configured on the server. Please verify your environment variables."
      );
    }

    fetchPaypalConfig();
  }, []);

  // Dynamically load the official PayPal JavaScript SDK
  useEffect(() => {
    if (!paypalClientId) return;

    const scriptId = "paypal-sdk-script";
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement;

    if (existingScript && window.paypal) {
      const currentSrc = existingScript.getAttribute("src") || "";
      if (currentSrc.includes(`currency=${paypalCurrency}`) && currentSrc.includes(paypalClientId)) {
        setIsPaypalSdkLoaded(true);
        return;
      }
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
      setPaypalSdkLoadError("Unable to initialize PayPal SDK. Please verify your internet connection.");
    };

    document.body.appendChild(script);
  }, [paypalClientId, paypalCurrency]);

  // Render Official PayPal Buttons in Step 3
  useEffect(() => {
    if (currentStep !== 3 || !isPaypalSdkLoaded || !window.paypal || !paypalButtonContainerRef.current) {
      return;
    }

    paypalButtonContainerRef.current.innerHTML = "";

    try {
      const buttons = window.paypal.Buttons({
        style: {
          layout: "vertical",
          color: "gold",
          shape: "rect",
          label: "paypal",
          height: 44
        },

        createOrder: async () => {
          if (!validateStep1()) {
            throw new Error(errorMessage || "Please complete all required checkout fields.");
          }

          setIsProcessing(true);
          setErrorMessage("");

          const parsedFirstName = firstName.trim() || fullName.trim().split(" ")[0] || "Customer";
          const parsedLastName = lastName.trim() || fullName.trim().split(" ").slice(1).join(" ") || "Procurement";
          const computedFullName = fullName.trim() || `${parsedFirstName} ${parsedLastName}`.trim();

          const payload = {
            customerId: user?.id || null,
            customer: {
              firstName: parsedFirstName,
              lastName: parsedLastName,
              fullName: computedFullName,
              professionalTitle,
              email,
              phone,
              countryCode,
              companyName,
              department,
              taxId
            },
            shippingAddress: {
              firstName: parsedFirstName,
              lastName: parsedLastName,
              fullName: computedFullName,
              companyName,
              phone,
              addressLine1,
              addressLine2: [buildingSuite, addressLine2].filter(Boolean).join(", "),
              district,
              city,
              state,
              stateCode,
              postalCode,
              country: activeCountry.name,
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
                  country: countriesList.find((c) => c.code === billingCountryCode)?.name || activeCountry.name,
                  countryCode: billingCountryCode
                },
            currency: currentCurrency,
            couponCode: appliedCoupon?.code || null,
            shippingMethod: selectedShippingMethod,
            deliveryInstructions,
            items: items.map((it) => ({
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

          sessionStorage.setItem("drmedex_pending_order_number", data.orderNumber);

          if (saveAddressToAccount && user?.id) {
            handleSaveAddress({
              fullName: fullName.trim(),
              companyName,
              phone,
              addressLine1,
              addressLine2,
              city,
              state,
              postalCode,
              country: activeCountry.name,
              countryCode
            }).catch(() => {});
          }

          return data.orderID;
        },

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
                  "Payment capture failed. Please check your PayPal balance or contact our surgical support team."
              );
            }
          } catch (err: any) {
            setIsProcessing(false);
            setErrorMessage(`Error finalizing transaction: ${err.message || "Network timeout"}`);
          }
        },

        onCancel: () => {
          setIsProcessing(false);
          setErrorMessage("PayPal checkout was cancelled. Your details and cart remain safely saved.");
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
    currentStep,
    isPaypalSdkLoaded,
    fullName,
    professionalTitle,
    email,
    phone,
    companyName,
    department,
    taxId,
    addressLine1,
    addressLine2,
    buildingSuite,
    district,
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
    user?.id,
    activeCountry.name
  ]);

  // Filtered countries for searchable dropdown
  const { popularCountries, alphabeticalCountries } = useMemo(() => {
    const q = countrySearchQuery.trim();
    if (!q) {
      const pop = countriesList.filter((c) => POPULAR_COUNTRY_CODES.includes(c.code));
      const sorted = [...countriesList].sort((a, b) => a.name.localeCompare(b.name));
      return { popularCountries: pop, alphabeticalCountries: sorted };
    }
    const matched = filterCountries(q, countriesList as any) as CountryItem[];
    return { popularCountries: [], alphabeticalCountries: matched };
  }, [countriesList, countrySearchQuery]);

  // EMPTY CART SCREEN
  if (items.length === 0 && !completedOrder) {
    return (
      <div className="w-full bg-[#FFFFFF] min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-neutral-200 p-8 text-center space-y-5 shadow-xs">
          <div className="w-16 h-16 bg-[#F4F7F2] text-[#2D5A4A] rounded-full flex items-center justify-center mx-auto">
            <Lock size={28} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-extrabold text-[#171717]">Your Cart is Empty</h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
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
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-10 shadow-xs space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-[#F4F7F2] text-[#2D5A4A] rounded-full flex items-center justify-center mx-auto ring-8 ring-[#F4F7F2]/50">
                <CheckCircle2 size={36} />
              </div>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-bold tracking-wider uppercase bg-[#F4F7F2] text-[#2D5A4A]">
                  <ShieldCheck size={13} /> Verified PayPal Transaction
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight">
                  Order Confirmed & Payment Verified
                </h1>
                <p className="text-xs text-neutral-600 max-w-lg mx-auto">
                  A formal commercial confirmation and calibration proforma invoice have been transmitted to{" "}
                  <strong className="text-neutral-900">{completedOrder.customer?.email}</strong>.
                </p>
              </div>
            </div>

            {/* Order Reference Box */}
            <div className="p-5 bg-neutral-50 border border-neutral-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-2xs font-bold text-neutral-500 uppercase tracking-wider">Order Reference</div>
                <div className="text-2xl font-mono font-black text-[#2D5A4A] mt-0.5">{completedOrder.orderNumber}</div>
                <div className="text-2xs text-neutral-500 mt-1">
                  PayPal Capture ID:{" "}
                  <span className="font-mono text-neutral-800">
                    {completedOrder.payment?.paypalCaptureId || completedOrder.payment?.transactionId || "Confirmed"}
                  </span>
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
                  className="px-4 py-2.5 border border-neutral-300 text-neutral-800 rounded-xl text-xs font-bold hover:bg-neutral-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider">
                Equipment Ordered ({completedOrder.items?.length || 0})
              </h3>
              <div className="border border-neutral-200 rounded-2xl divide-y divide-neutral-200 overflow-hidden text-xs">
                {completedOrder.items?.map((item, idx) => (
                  <div key={idx} className="p-4 flex items-center justify-between gap-4 bg-white">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={item.image || "/placeholder.jpg"}
                        alt={item.title}
                        className="w-12 h-12 object-contain p-1 rounded-xl border border-neutral-200 bg-neutral-50 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-[#171717] truncate">{item.title}</div>
                        <div className="text-3xs text-neutral-500 font-mono mt-0.5">
                          SKU: {item.sku} • Qty: {item.quantity}
                        </div>
                      </div>
                    </div>
                    <div className="font-black text-[#171717] whitespace-nowrap">
                      {item.currency}{" "}
                      {(
                        ((item.unitPrice ?? item.convertedUnitPrice) || 0) * item.quantity
                      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery & Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-1.5">
                <div className="font-bold text-[#2D5A4A] uppercase text-2xs tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} /> Shipping Destination
                </div>
                <div className="font-semibold text-[#171717]">{completedOrder.shippingAddress?.fullName}</div>
                {completedOrder.shippingAddress?.companyName && (
                  <div className="text-neutral-600">{completedOrder.shippingAddress.companyName}</div>
                )}
                <div className="text-neutral-600">
                  {completedOrder.shippingAddress?.addressLine1}
                  {completedOrder.shippingAddress?.addressLine2 ? `, ${completedOrder.shippingAddress.addressLine2}` : ""}
                </div>
                <div className="text-neutral-600">
                  {completedOrder.shippingAddress?.city}, {completedOrder.shippingAddress?.state}{" "}
                  {completedOrder.shippingAddress?.postalCode}
                </div>
                <div className="text-[#171717] font-medium">{completedOrder.shippingAddress?.country}</div>
              </div>

              <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 space-y-1.5">
                <div className="font-bold text-[#2D5A4A] uppercase text-2xs tracking-wider flex items-center gap-1.5">
                  <Truck size={13} /> Logistics & Air Cargo
                </div>
                <div className="font-semibold text-[#171717]">{completedOrder.shippingMethod?.name}</div>
                <div className="text-neutral-600">Estimated Transit: {completedOrder.shippingMethod?.estimatedDays}</div>
                <div className="text-neutral-600">Carrier: {completedOrder.shippingMethod?.carrier}</div>
                <div className="text-3xs text-neutral-500 pt-1">
                  Airway bill tracking will activate upon crate dispatch from airport warehouse.
                </div>
              </div>
            </div>

            {/* Final Total Summary */}
            <div className="p-4 rounded-xl border border-neutral-200 bg-[#F4F7F2]/60 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Equipment Subtotal:</span>
                <span className="font-medium text-[#171717]">
                  {completedOrder.pricing?.currency}{" "}
                  {completedOrder.pricing?.subtotal?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
              {completedOrder.pricing?.discount > 0 && (
                <div className="flex justify-between text-[#2D5A4A]">
                  <span>Clinical Discount:</span>
                  <span className="font-bold">
                    -{completedOrder.pricing?.currency}{" "}
                    {completedOrder.pricing?.discount?.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-neutral-600">
                <span>Air Freight & Documentation:</span>
                <span className="font-medium text-[#2D5A4A]">Complimentary Medical Air Cargo</span>
              </div>
              <div className="pt-2 border-t border-neutral-200 flex justify-between font-black text-sm text-[#171717]">
                <span>Total Amount Paid (PayPal):</span>
                <span className="text-base text-[#2D5A4A]">
                  {completedOrder.pricing?.currency}{" "}
                  {completedOrder.pricing?.grandTotal?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
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

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* CHECKOUT HEADER & PROGRESS BAR */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-neutral-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-extrabold uppercase tracking-widest text-[#2D5A4A] bg-[#F4F7F2] px-2.5 py-0.5 rounded-full">
                  International Clinical Procurement
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#171717] tracking-tight mt-1.5">
                Worldwide Medical Checkout
              </h1>
              <p className="text-xs text-neutral-500 mt-0.5">
                Serving hospitals, surgery centres & distributors across 195 countries with compliant export documentation.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-semibold text-[#2D5A4A] bg-[#F4F7F2] px-3 py-2 rounded-xl border border-[#2D5A4A]/20">
              <Lock size={15} />
              <span>256-Bit SSL Encrypted & PCI Certified</span>
            </div>
          </div>

          {/* DR.MEDEX GREEN 3-STEP PROGRESS INDICATOR */}
          <div className="mt-6 bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`flex items-center gap-2 sm:gap-3 text-left transition-all ${
                  currentStep === 1
                    ? "opacity-100"
                    : currentStep > 1
                    ? "opacity-90 hover:opacity-100 cursor-pointer"
                    : "opacity-60 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-all ${
                    currentStep === 1
                      ? "bg-[#7AA05A] text-white ring-4 ring-[#7AA05A]/20 shadow-xs"
                      : currentStep > 1
                      ? "bg-[#2D5A4A] text-white"
                      : "bg-neutral-100 text-neutral-500 border border-neutral-300"
                  }`}
                >
                  {currentStep > 1 ? <Check size={16} /> : "1"}
                </div>
                <div className="min-w-0 hidden xs:block sm:block">
                  <div
                    className={`text-2xs sm:text-xs font-bold truncate ${
                      currentStep === 1 ? "text-[#2D5A4A]" : currentStep > 1 ? "text-neutral-800" : "text-neutral-400"
                    }`}
                  >
                    1. Destination & Customer
                  </div>
                  <div className="text-3xs text-neutral-500 truncate hidden md:block">
                    Customer & 195 Countries
                  </div>
                </div>
              </button>

              {/* Step 2 */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setCurrentStep(2);
                }}
                className={`flex items-center gap-2 sm:gap-3 text-left transition-all ${
                  currentStep === 2
                    ? "opacity-100"
                    : currentStep > 2
                    ? "opacity-90 hover:opacity-100 cursor-pointer"
                    : "opacity-60"
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-all ${
                    currentStep === 2
                      ? "bg-[#7AA05A] text-white ring-4 ring-[#7AA05A]/20 shadow-xs"
                      : currentStep > 2
                      ? "bg-[#2D5A4A] text-white"
                      : "bg-neutral-100 text-neutral-500 border border-neutral-300"
                  }`}
                >
                  {currentStep > 2 ? <Check size={16} /> : "2"}
                </div>
                <div className="min-w-0 hidden xs:block sm:block">
                  <div
                    className={`text-2xs sm:text-xs font-bold truncate ${
                      currentStep === 2 ? "text-[#2D5A4A]" : currentStep > 2 ? "text-neutral-800" : "text-neutral-400"
                    }`}
                  >
                    2. Air Freight Logistics
                  </div>
                  <div className="text-3xs text-neutral-500 truncate hidden md:block">
                    DHL Express Medical Cargo
                  </div>
                </div>
              </button>

              {/* Step 3 */}
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setCurrentStep(3);
                }}
                className={`flex items-center gap-2 sm:gap-3 text-left transition-all ${
                  currentStep === 3 ? "opacity-100" : "opacity-60"
                }`}
              >
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 transition-all ${
                    currentStep === 3
                      ? "bg-[#7AA05A] text-white ring-4 ring-[#7AA05A]/20 shadow-xs"
                      : "bg-neutral-100 text-neutral-500 border border-neutral-300"
                  }`}
                >
                  3
                </div>
                <div className="min-w-0 hidden xs:block sm:block">
                  <div
                    className={`text-2xs sm:text-xs font-bold truncate ${
                      currentStep === 3 ? "text-[#2D5A4A]" : "text-neutral-400"
                    }`}
                  >
                    3. Payment & Confirmation
                  </div>
                  <div className="text-3xs text-neutral-500 truncate hidden md:block">
                    PayPal Gateway & Settlement
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            <button onClick={() => setErrorMessage("")} className="text-red-500 hover:text-red-800 cursor-pointer">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* LEFT COLUMN: ACTIVE STEP CONTENT (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* ========================================================
                STEP 1: DESTINATION & CUSTOMER INFORMATION
               ======================================================== */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* 1. SAVED ADDRESS SELECTION (If available) */}
                {savedAddresses.length > 0 && (
                  <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-7 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                      <div className="flex items-center gap-2">
                        <MapPin size={18} className="text-[#2D5A4A]" />
                        <h2 className="text-sm font-extrabold text-[#171717] uppercase tracking-wider">
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
                                ? "border-[#7AA05A] bg-[#F4F7F2]/60 ring-2 ring-[#7AA05A]/20"
                                : "border-neutral-200 bg-white hover:border-neutral-300"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="font-bold text-[#171717]">{addr.fullName}</span>
                                {addr.isDefaultShipping && (
                                  <span className="text-3xs font-extrabold text-[#2D5A4A] bg-[#F4F7F2] px-2 py-0.5 rounded-md">
                                    Default
                                  </span>
                                )}
                              </div>
                              {addr.companyName && (
                                <div className="text-neutral-600 font-medium text-3xs">{addr.companyName}</div>
                              )}
                              <div className="text-neutral-500 text-2xs mt-1 leading-relaxed">
                                {addr.addressLine1}
                                {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}, {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-neutral-100">
                              <span className={`text-2xs font-bold ${isSelected ? "text-[#2D5A4A]" : "text-neutral-400"}`}>
                                {isSelected ? "✓ Selected" : "Select this address"}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingAddress(addr);
                                    setIsAddressModalOpen(true);
                                  }}
                                  className="p-1 text-neutral-400 hover:text-neutral-800 rounded cursor-pointer"
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

                {/* 2. AMAZON-STYLE CASCADING ADDRESS FORM (EXACT LOGICAL ORDER 1 TO 8) */}
                <AmazonCascadingAddressForm
                  data={{
                    firstName,
                    lastName,
                    fullName: fullName || `${firstName} ${lastName}`.trim(),
                    phone,
                    phoneCountryCode: activeCountry.dialCode,
                    phoneIso: countryCode,
                    country: activeCountry.name,
                    countryCode,
                    state,
                    stateCode,
                    city,
                    postalCode,
                    email,
                    streetAddress: addressLine1,
                    additionalAddress: addressLine2 || buildingSuite,
                    companyName,
                    department,
                    professionalTitle,
                    taxId
                  }}
                  onChange={(updated) => {
                    if (updated.firstName !== undefined) setFirstName(updated.firstName);
                    if (updated.lastName !== undefined) setLastName(updated.lastName);
                    if (updated.fullName !== undefined) setFullName(updated.fullName);
                    if (updated.phone !== undefined) setPhone(updated.phone);
                    if (updated.countryCode !== undefined) {
                      setCountryCode(updated.countryCode);
                      if (billingSameAsShipping) setBillingCountryCode(updated.countryCode);
                    }
                    if (updated.state !== undefined) setState(updated.state);
                    if (updated.stateCode !== undefined) setStateCode(updated.stateCode);
                    if (updated.city !== undefined) setCity(updated.city);
                    if (updated.postalCode !== undefined) setPostalCode(updated.postalCode);
                    if (updated.email !== undefined) setEmail(updated.email);
                    if (updated.streetAddress !== undefined) setAddressLine1(updated.streetAddress);
                    if (updated.additionalAddress !== undefined) setAddressLine2(updated.additionalAddress);
                    if (updated.companyName !== undefined) setCompanyName(updated.companyName);
                    if (updated.department !== undefined) setDepartment(updated.department);
                    if (updated.professionalTitle !== undefined) setProfessionalTitle(updated.professionalTitle);
                    if (updated.taxId !== undefined) setTaxId(updated.taxId);
                  }}
                  onCountryChange={(selected) => {
                    setCountryCode(selected.code);
                    if (billingSameAsShipping) setBillingCountryCode(selected.code);
                    if (selected.currency && selected.currency !== currentCurrency) {
                      setCurrencyManually(selected.currency);
                    }
                  }}
                  isGeolocating={isGeolocating}
                  onDetectLocation={handleDirectDetectLocation}
                  locationNotice={locationNotice}
                  onDismissLocationNotice={() => setLocationNotice(null)}
                />

                {/* 3. OPTIONAL CARGO INSTRUCTIONS & ACCOUNT SAVE */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-7 shadow-xs space-y-4">
                  <h3 className="font-extrabold text-[#2D5A4A] uppercase tracking-wider text-2xs">
                    Cargo Delivery Options
                  </h3>
                  <div>
                    <label className="block font-bold text-[#171717] mb-1.5 text-xs">
                      Cargo Delivery & Receiving Bay Instructions <span className="text-neutral-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={deliveryInstructions}
                      onChange={(e) => setDeliveryInstructions(e.target.value)}
                      placeholder="Special hospital delivery instructions, receiving dock hours, contact person"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white text-[#171717] font-medium focus:outline-none focus:border-[#7AA05A] focus:ring-2 focus:ring-[#7AA05A]/20 transition-all placeholder:text-neutral-400 text-xs"
                    />
                  </div>
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#171717]">
                      <input
                        type="checkbox"
                        checked={saveAddressToAccount}
                        onChange={(e) => setSaveAddressToAccount(e.target.checked)}
                        className="w-4 h-4 rounded text-[#7AA05A] focus:ring-[#7AA05A] accent-[#7AA05A]"
                      />
                      <span>Save this delivery address to my DR.MEDEX account for future orders</span>
                    </label>
                  </div>
                </div>

                {/* 4. BILLING ADDRESS TOGGLE */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs font-bold text-[#171717]">
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
                    <div className="pt-4 border-t border-neutral-200 space-y-4 animate-in fade-in duration-150 text-xs">
                      <h3 className="font-extrabold text-[#2D5A4A] uppercase tracking-wider text-2xs">
                        Separate Billing Information
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block font-bold text-[#171717] mb-1">Billing Full Name *</label>
                          <input
                            type="text"
                            required
                            value={billingFullName}
                            onChange={(e) => setBillingFullName(e.target.value)}
                            placeholder="Accounts department or representative"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#171717] mb-1">Billing Organization</label>
                          <input
                            type="text"
                            value={billingCompanyName}
                            onChange={(e) => setBillingCompanyName(e.target.value)}
                            placeholder="Billing entity or hospital name"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#171717] mb-1">Billing Country *</label>
                          <select
                            value={billingCountryCode}
                            onChange={(e) => setBillingCountryCode(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 bg-white font-medium focus:outline-none focus:border-[#7AA05A]"
                          >
                            {countriesList.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.flag} {c.name} ({c.dialCode})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-bold text-[#171717] mb-1">Billing Street Address *</label>
                          <input
                            type="text"
                            required
                            value={billingAddressLine1}
                            onChange={(e) => setBillingAddressLine1(e.target.value)}
                            placeholder="Street, suite, financial office"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#171717] mb-1">Billing City *</label>
                          <input
                            type="text"
                            required
                            value={billingCity}
                            onChange={(e) => setBillingCity(e.target.value)}
                            placeholder="City"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-[#171717] mb-1">Billing Postal Code *</label>
                          <input
                            type="text"
                            required
                            value={billingPostalCode}
                            onChange={(e) => setBillingPostalCode(e.target.value)}
                            placeholder="Postal / ZIP code"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 1 Action Button: Continue to Logistics */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleContinueToStep2}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#7AA05A] hover:bg-[#688a4c] text-white font-bold rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Air Freight Logistics</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================
                STEP 2: AIR FREIGHT LOGISTICS
               ======================================================== */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Destination Review Box */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-[#2D5A4A]" />
                      <h2 className="text-sm font-extrabold text-[#171717] uppercase tracking-wider">
                        Delivery Destination Review
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-bold text-[#7AA05A] hover:underline cursor-pointer"
                    >
                      Edit Address
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 text-xs space-y-1">
                    <div className="font-bold text-[#171717] text-sm">
                      {professionalTitle ? `${professionalTitle} ` : ""}{fullName}
                    </div>
                    {companyName && (
                      <div className="text-neutral-600 font-medium">
                        {companyName} {department ? `(${department})` : ""}
                      </div>
                    )}
                    <div className="text-neutral-600">
                      {addressLine1}
                      {addressLine2 ? `, ${addressLine2}` : ""}
                    </div>
                    <div className="text-neutral-600">
                      {city}, {state} {postalCode}
                    </div>
                    <div className="font-semibold text-[#2D5A4A] flex items-center gap-1.5 pt-1">
                      <span>{activeCountry.flag}</span>
                      <span>{activeCountry.name}</span>
                      <span className="font-mono text-neutral-400">({phone})</span>
                    </div>
                  </div>
                </div>

                {/* Logistics Method */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-neutral-200">
                    <Truck size={18} className="text-[#2D5A4A]" />
                    <h2 className="text-sm font-extrabold text-[#171717] uppercase tracking-wider">
                      Logistics & Heavy-Duty Medical Air Crate
                    </h2>
                  </div>

                  <div className="p-5 rounded-2xl border-2 border-[#7AA05A] bg-[#F4F7F2]/40 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white border border-neutral-200 flex items-center justify-center font-black text-xs text-[#2D5A4A] shrink-0 shadow-2xs">
                          DHL
                        </div>
                        <div>
                          <div className="font-black text-sm text-[#171717]">{selectedShippingMethod.name}</div>
                          <div className="text-xs text-neutral-500">
                            Estimated Transit: <strong>{selectedShippingMethod.estimatedDays}</strong> to {activeCountry.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 rounded-full text-2xs font-extrabold uppercase tracking-wider bg-[#7AA05A] text-white">
                          Complimentary
                        </span>
                        <div className="text-3xs text-[#2D5A4A] font-semibold mt-0.5">Air Cargo Included</div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs text-neutral-600">
                      <div className="flex items-center gap-1.5">
                        <PackageCheck size={14} className="text-[#2D5A4A] shrink-0" />
                        <span>Vibration-damped foam export crates</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[#2D5A4A] shrink-0" />
                        <span>Full transit replacement insurance</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-[#2D5A4A] shrink-0" />
                        <span>Calibration proforma certificate attached</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Globe size={14} className="text-[#2D5A4A] shrink-0" />
                        <span>Pre-cleared customs documentation</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="w-full sm:w-auto px-6 py-3 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Customer Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleContinueToStep3}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#7AA05A] hover:bg-[#688a4c] text-white font-bold rounded-xl text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Payment & Confirmation</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================
                STEP 3: PAYMENT & CONFIRMATION (PAYPAL GATEWAY)
               ======================================================== */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-200">
                
                {/* Summary Review Card */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                    <h2 className="text-sm font-extrabold text-[#171717] uppercase tracking-wider">
                      Review Order & Recipient
                    </h2>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-bold text-[#7AA05A] hover:underline cursor-pointer"
                    >
                      Change Details
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 space-y-1">
                      <div className="font-bold text-neutral-500 uppercase text-3xs">Recipient & Organization</div>
                      <div className="font-bold text-[#171717]">
                        {professionalTitle ? `${professionalTitle} ` : ""}{fullName}
                      </div>
                      {companyName && (
                        <div className="text-neutral-600 text-2xs">
                          {companyName} {department ? `(${department})` : ""}
                        </div>
                      )}
                      <div className="text-neutral-500 text-3xs font-mono">{email}</div>
                      <div className="text-neutral-500 text-3xs font-mono">{phone}</div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 space-y-1">
                      <div className="font-bold text-neutral-500 uppercase text-3xs">Shipping Destination & Logistics</div>
                      <div className="text-neutral-700 text-2xs truncate">{addressLine1}</div>
                      <div className="text-neutral-700 text-2xs">{city}, {state} {postalCode}</div>
                      <div className="font-semibold text-[#2D5A4A] text-2xs">{activeCountry.flag} {activeCountry.name}</div>
                      <div className="text-3xs text-neutral-500">DHL Express Air Cargo (Included)</div>
                    </div>
                  </div>
                </div>

                {/* PAYPAL PAYMENT GATEWAY CONTAINER */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-7 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-[#2D5A4A]" />
                      <h2 className="text-sm font-extrabold text-[#171717] uppercase tracking-wider">
                        PayPal Payment Gateway
                      </h2>
                    </div>
                    <span className="text-3xs font-bold text-[#2D5A4A] bg-[#F4F7F2] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Instant Authorization
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Independent Currency Selector and Disclosure */}
                    <div className="p-3.5 rounded-xl border border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-[#171717]">Select Settlement Currency</div>
                        <div className="text-3xs text-neutral-500 mt-0.5">
                          Total amount payable: <strong>{currentCurrency} {displayGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                        </div>
                      </div>

                      <select
                        value={currentCurrency}
                        onChange={(e) => setCurrencyManually(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 bg-white text-xs font-bold text-neutral-800 focus:outline-none focus:border-[#7AA05A] cursor-pointer"
                      >
                        <option value="INR">INR (₹ - Indian Rupee)</option>
                        <option value="USD">USD ($ - US Dollar)</option>
                        <option value="EUR">EUR (€ - Euro)</option>
                        <option value="GBP">GBP (£ - British Pound)</option>
                        <option value="AED">AED (United Arab Emirates Dirham)</option>
                        <option value="CAD">CAD (CA$ - Canadian Dollar)</option>
                        <option value="AUD">AUD (A$ - Australian Dollar)</option>
                        <option value="SAR">SAR (Saudi Riyal)</option>
                        <option value="SGD">SGD (S$ - Singapore Dollar)</option>
                        <option value="JPY">JPY (¥ - Japanese Yen)</option>
                        <option value="CHF">CHF (Swiss Franc)</option>
                        <option value="PKR">PKR (₨ - Pakistani Rupee)</option>
                        <option value="ZAR">ZAR (South African Rand)</option>
                      </select>
                    </div>

                    {/* Currency conversion notice if PayPal uses USD for unlisted settlement currencies */}
                    {paypalCurrency !== currentCurrency && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-3xs text-amber-900 flex items-start gap-1.5">
                        <ShieldCheck size={14} className="shrink-0 text-amber-700 mt-0.5" />
                        <span>
                          PayPal authorization will settle in <strong>{paypalCurrency} (${paypalAmount.toFixed(2)})</strong> via standard interbank conversion.
                        </span>
                      </div>
                    )}

                    {/* PayPal Buttons Render Container */}
                    <div className="pt-2">
                      {isProcessing && (
                        <div className="p-4 rounded-xl bg-[#F4F7F2] border border-[#7AA05A]/30 text-center space-y-2 mb-3">
                          <Loader2 size={24} className="animate-spin text-[#2D5A4A] mx-auto" />
                          <p className="text-xs font-bold text-[#171717]">Connecting to PayPal Secure Checkout...</p>
                          <p className="text-3xs text-neutral-500">Please do not close or reload this window.</p>
                        </div>
                      )}

                      {paypalSdkLoadError && (
                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs mb-3">
                          {paypalSdkLoadError}
                        </div>
                      )}

                      {!isPaypalSdkLoaded && !paypalSdkLoadError && (
                        <div className="py-8 text-center text-xs text-neutral-500 flex flex-col items-center gap-2">
                          <Loader2 size={20} className="animate-spin text-[#7AA05A]" />
                          <span>Loading secure PayPal Gateway...</span>
                        </div>
                      )}

                      {/* Official PayPal Buttons Container */}
                      <div
                        ref={paypalButtonContainerRef}
                        id="paypal-button-container"
                        className={`w-full transition-opacity duration-200 ${
                          isProcessing ? "opacity-40 pointer-events-none" : "opacity-100"
                        }`}
                      />
                    </div>

                    {/* Security credentials */}
                    <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-3xs text-neutral-500">
                      <div className="flex items-center gap-1.5 text-[#2D5A4A] font-semibold">
                        <ShieldCheck size={13} />
                        <span>Buyer Protection & Official Proforma Documentation Included</span>
                      </div>
                      <p className="leading-relaxed">
                        Payment processed securely via PayPal's Level 1 PCI-DSS compliant infrastructure. DR.MEDEX does not store payment credentials.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Step 3 Action: Back button */}
                <div className="flex justify-start pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="px-6 py-3 border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Air Freight Logistics</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              RIGHT COLUMN: ORDER SUMMARY & COUPON ENGINE (5 Cols)
             ======================================================== */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-neutral-200 p-5 sm:p-7 shadow-xs space-y-5 sticky top-24">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <h2 className="text-sm font-extrabold text-[#171717] uppercase tracking-wider">
                  Order Summary ({items.length})
                </h2>
                <Link to="/cart" className="text-2xs font-bold text-[#7AA05A] hover:underline">
                  Edit Cart
                </Link>
              </div>

              {/* Items List */}
              <div className="divide-y divide-neutral-100 max-h-80 overflow-y-auto pr-1 space-y-3">
                {items.map((it) => {
                  const lineTotalDisplay = convertPrice((it.product.basePrice || 0) * it.quantity);

                  return (
                    <div key={it.product.id} className="pt-3 first:pt-0 flex items-start gap-3">
                      <img
                        src={it.product.images[0] || "/placeholder.jpg"}
                        alt={it.product.title}
                        className="w-14 h-14 object-contain rounded-xl p-1 border border-neutral-200 bg-neutral-50 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-[#171717] truncate">{renderBrandTitle(it.product.title)}</h4>
                        <div className="text-3xs text-neutral-400 font-mono mt-0.5">
                          SKU: {it.product.sku}
                        </div>
                        <div className="text-2xs text-neutral-600 mt-1 flex items-center justify-between">
                          <span>
                            Qty: {it.quantity} × {formatPrice(it.product.basePrice || 0)}
                          </span>
                          <span className="font-bold text-[#171717]">
                            {currentCurrency}{" "}
                            {lineTotalDisplay.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* COUPON INPUT */}
              <div className="pt-3 border-t border-neutral-200">
                {appliedCoupon ? (
                  <div className="p-3 rounded-xl bg-[#F4F7F2] border border-[#7AA05A]/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Tag size={15} className="text-[#2D5A4A]" />
                      <div>
                        <span className="font-extrabold text-[#2D5A4A]">{appliedCoupon.code}</span>
                        <span className="text-3xs text-neutral-500 block">
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
                        className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 text-xs uppercase font-semibold focus:outline-none focus:border-[#7AA05A]"
                      />
                      <button
                        type="submit"
                        disabled={isApplyingCoupon || !couponInput.trim()}
                        className="px-4 py-2 bg-[#7AA05A] hover:bg-[#688a4c] disabled:bg-neutral-200 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
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
              <div className="pt-3 border-t border-neutral-200 space-y-2 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Catalogue Subtotal:</span>
                  <span className="font-semibold text-[#171717]">
                    {currentCurrency}{" "}
                    {displaySubtotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>

                {displayDiscount > 0 && (
                  <div className="flex justify-between text-[#2D5A4A]">
                    <span className="font-bold">Clinical Discount:</span>
                    <span className="font-bold">
                      -{currentCurrency}{" "}
                      {displayDiscount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-600">
                  <span>International Air Cargo:</span>
                  <span className="font-semibold text-[#2D5A4A]">Complimentary Express Cargo</span>
                </div>

                <div className="flex justify-between text-neutral-600">
                  <span>Customs Export Duties:</span>
                  <span className="font-semibold text-[#171717]">Export Certified / Included</span>
                </div>

                <div className="pt-3 border-t border-neutral-200 flex items-baseline justify-between">
                  <div>
                    <div className="text-sm font-black text-[#171717]">Total Amount</div>
                    <div className="text-3xs text-neutral-400">Payable in {currentCurrency} via PayPal</div>
                  </div>
                  <div className="text-xl font-black text-[#2D5A4A]">
                    {currentCurrency}{" "}
                    {displayGrandTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL: ADD / EDIT ADDRESS */}
        {isAddressModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <h3 className="text-sm font-extrabold text-[#171717] uppercase tracking-wider">
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
                  <label className="block font-bold text-[#171717] mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    required
                    defaultValue={editingAddress?.fullName || fullName}
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#171717] mb-1">Hospital / Clinic / Organization</label>
                  <input
                    type="text"
                    name="companyName"
                    defaultValue={editingAddress?.companyName || companyName}
                    placeholder="Enter hospital or organization name"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#171717] mb-1">Phone Number *</label>
                  <input
                    type="text"
                    name="phone"
                    required
                    defaultValue={editingAddress?.phone || phone}
                    placeholder="Enter your phone number"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#171717] mb-1">Country *</label>
                  <select
                    name="countryCode"
                    defaultValue={editingAddress?.countryCode || countryCode}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 bg-white font-medium focus:outline-none focus:border-[#7AA05A]"
                  >
                    {countriesList.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.dialCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#171717] mb-1">Street Address Line 1 *</label>
                  <input
                    type="text"
                    name="addressLine1"
                    required
                    defaultValue={editingAddress?.addressLine1 || addressLine1}
                    placeholder="Building, street, suite number"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#171717] mb-1">Address Line 2 (Optional)</label>
                  <input
                    type="text"
                    name="addressLine2"
                    defaultValue={editingAddress?.addressLine2 || addressLine2}
                    placeholder="Department, floor, loading dock"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#171717] mb-1">City *</label>
                    <input
                      type="text"
                      name="city"
                      required
                      defaultValue={editingAddress?.city || city}
                      placeholder="Enter city"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#171717] mb-1">Postal Code</label>
                    <input
                      type="text"
                      name="postalCode"
                      defaultValue={editingAddress?.postalCode || postalCode}
                      placeholder="Enter postal code"
                      className="w-full px-3 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:border-[#7AA05A]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-[#171717]">
                    <input
                      type="checkbox"
                      name="isDefaultShipping"
                      defaultChecked={editingAddress?.isDefaultShipping || false}
                      className="w-4 h-4 rounded text-[#7AA05A] focus:ring-[#7AA05A] accent-[#7AA05A]"
                    />
                    <span>Set as default shipping address</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddressModalOpen(false);
                      setEditingAddress(null);
                    }}
                    className="px-4 py-2 border border-neutral-300 text-neutral-600 rounded-xl hover:bg-neutral-100 cursor-pointer font-bold"
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

        {/* Smart Location Permission & Auto-Fill Prompt */}
        <SmartLocationPrompt
          isOpen={showLocationPrompt}
          onClose={() => setShowLocationPrompt(false)}
          onLocationDetected={handleLocationDetected}
        />
      </div>
    </div>
  );
};
