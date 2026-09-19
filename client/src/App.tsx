import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { CurrencyProvider } from "./context/CurrencyContext";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { CartProvider } from "./context/CartContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { CartDrawer } from "./components/CartDrawer";

// Pages
import { HomePage } from "./pages/HomePage";
import { ShopPage } from "./pages/ShopPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { TrackOrderPage } from "./pages/TrackOrderPage";
import { AccountPage } from "./pages/AccountPage";
import { RequestQuotePage } from "./pages/RequestQuotePage";
import { WorldwideNetworkPage } from "./pages/WorldwideNetworkPage";
import { CountryPage } from "./pages/CountryPage";
import { AboutPage } from "./pages/AboutPage";
import { BlogListPage } from "./pages/BlogListPage";
import { BlogDetailPage } from "./pages/BlogDetailPage";
import { ContactPage } from "./pages/ContactPage";
import { PolicyPage } from "./pages/PolicyPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";

/**
 * Ensures smooth scroll restoration on client-side route transitions
 */
function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant" as ScrollBehavior
    });
  }, [pathname, search]);

  return null;
}

/**
 * Main Application Component with Global Context Providers and Routing
 */
export default function App() {
  return (
    <Router>
      <CurrencyProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <ScrollToTop />
              <div className="min-h-screen flex flex-col bg-white text-slate-800 antialiased selection:bg-sky-100 selection:text-sky-900">
                {/* Global Navigation Header */}
                <Header />

                {/* Main Content Area */}
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/shop-all" element={<ShopPage />} />
                    <Route path="/category/:categorySlug" element={<ShopPage />} />
                    <Route path="/product/:slug" element={<ProductDetailPage />} />
                    <Route path="/cart" element={<CartPage />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/track-order" element={<TrackOrderPage />} />
                    <Route path="/track-order/:orderId" element={<TrackOrderPage />} />
                    <Route path="/account" element={<AccountPage />} />
                    <Route path="/request-quote" element={<RequestQuotePage />} />
                    <Route path="/worldwide-network" element={<WorldwideNetworkPage />} />
                    <Route path="/country/:countryCode" element={<CountryPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/blog" element={<BlogListPage />} />
                    <Route path="/blog/:slug" element={<BlogDetailPage />} />
                    <Route path="/contact" element={<ContactPage />} />

                    {/* International Legal & Policy Compliance */}
                    <Route path="/privacy-policy" element={<PolicyPage />} />
                    <Route path="/terms-conditions" element={<PolicyPage />} />
                    <Route path="/shipping-policy" element={<PolicyPage />} />
                    <Route path="/warranty-policy" element={<PolicyPage />} />
                    <Route path="/payment-policy" element={<PolicyPage />} />
                    <Route path="/cookie-policy" element={<PolicyPage />} />

                    {/* Central Operations Administration */}
                    <Route path="/admin" element={<AdminDashboardPage />} />

                    {/* 404 Fallback */}
                    <Route path="*" element={<HomePage />} />
                  </Routes>
                </main>

                {/* Interactive Slide-out Cart Drawer */}
                <CartDrawer />

                {/* Institutional Medical Equipment Footer */}
                <Footer />
              </div>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </CurrencyProvider>
    </Router>
  );
}
