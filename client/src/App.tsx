import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { CurrencyProvider } from "./context/CurrencyContext";
import { AuthProvider } from "./context/AuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { CartProvider } from "./context/CartContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { CartDrawer } from "./components/CartDrawer";
import { ErrorBoundary } from "./components/ErrorBoundary";

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
import { WishlistPage } from "./pages/WishlistPage";
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

import { AdminAuthProvider } from "./context/AdminAuthContext";

import { AdminProductsPage } from "./pages/AdminProductsPage";
import { AdminProductEditorPage } from "./pages/AdminProductEditorPage";
import { AdminCategoriesPage } from "./pages/AdminCategoriesPage";
import { AdminReviewsPage } from "./pages/AdminReviewsPage";
import { AdminCustomersPage } from "./pages/AdminCustomersPage";
import { AdminNotificationsPage } from "./pages/AdminNotificationsPage";
import { PushNotificationPrompt } from "./components/PushNotificationPrompt";

// Customer Authentication Pages (Supabase Auth)
import { SignUpPage } from "./pages/account/SignUpPage";
import { SignInPage } from "./pages/account/SignInPage";
import { ForgotPasswordPage } from "./pages/account/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/account/ResetPasswordPage";

/**
 * Main Content Component with location-based layout control
 */
function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col bg-white text-neutral-900 antialiased selection:bg-neutral-200 selection:text-neutral-900 overflow-x-clip">
      {/* Global Customer Navigation Header (hidden on admin console) */}
      {!isAdminRoute && <Header />}

      {/* Main Content Area */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop-all" element={<ShopPage />} />
          <Route path="/category/:categorySlug" element={<ShopPage />} />
          <Route
            path="/product/:slug"
            element={
              <ErrorBoundary>
                <ProductDetailPage />
              </ErrorBoundary>
            }
          />
          <Route
            path="/products/:slug"
            element={
              <ErrorBoundary>
                <ProductDetailPage />
              </ErrorBoundary>
            }
          />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/track-order/:orderId" element={<TrackOrderPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/profile" element={<AccountPage />} />
          <Route path="/account/signup" element={<AccountPage initialAuthTab="signup" />} />
          <Route path="/account/signin" element={<AccountPage initialAuthTab="signin" />} />
          <Route path="/account/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/account/reset-password" element={<ResetPasswordPage />} />
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

          {/* DR.MEDEX Central Operations Administration */}
          <Route path="/admin/login" element={<Navigate to="/account/signin?redirect=/admin" replace />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/products" element={<AdminProductsPage />} />
          <Route path="/admin/products/new" element={<AdminProductEditorPage />} />
          <Route path="/admin/products/:productId/edit" element={<AdminProductEditorPage />} />
          <Route path="/admin/categories" element={<AdminCategoriesPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          <Route path="/admin/customers" element={<AdminCustomersPage />} />
          <Route path="/admin/notifications" element={<AdminNotificationsPage />} />

          {/* 404 Fallback */}
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>

      {/* Real-time Push Notification Opt-in Prompt */}
      {!isAdminRoute && <PushNotificationPrompt />}

      {/* Interactive Slide-out Cart Drawer (customer only) */}
      {!isAdminRoute && <CartDrawer />}

      {/* Institutional Medical Equipment Footer (customer only) */}
      {!isAdminRoute && <Footer />}
    </div>
  );
}

/**
 * Main Application Component with Global Context Providers and Routing
 */
export default function App() {
  return (
    <Router>
      <CurrencyProvider>
        <AuthProvider>
          <AdminAuthProvider>
            <WishlistProvider>
              <CartProvider>
                <ScrollToTop />
                <AppContent />
              </CartProvider>
            </WishlistProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </CurrencyProvider>
    </Router>
  );
}
