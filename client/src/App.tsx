import React, { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { CurrencyProvider } from "./context/CurrencyContext";
import { AuthProvider } from "./context/AuthContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { WishlistProvider } from "./context/WishlistContext";
import { CartProvider } from "./context/CartContext";
import { BuyNowLocationProvider } from "./context/BuyNowLocationContext";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { CartDrawer } from "./components/CartDrawer";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PushNotificationPrompt } from "./components/PushNotificationPrompt";

// Route-level code splitting for fast initial bundle loading
const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const ShopPage = lazy(() => import("./pages/ShopPage").then((m) => ({ default: m.ShopPage })));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage").then((m) => ({ default: m.ProductDetailPage })));
const CartPage = lazy(() => import("./pages/CartPage").then((m) => ({ default: m.CartPage })));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage").then((m) => ({ default: m.CheckoutPage })));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage").then((m) => ({ default: m.TrackOrderPage })));
const AccountPage = lazy(() => import("./pages/AccountPage").then((m) => ({ default: m.AccountPage })));
const RequestQuotePage = lazy(() => import("./pages/RequestQuotePage").then((m) => ({ default: m.RequestQuotePage })));
const WorldwideNetworkPage = lazy(() => import("./pages/WorldwideNetworkPage").then((m) => ({ default: m.WorldwideNetworkPage })));
const CountryPage = lazy(() => import("./pages/CountryPage").then((m) => ({ default: m.CountryPage })));
const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const WishlistPage = lazy(() => import("./pages/WishlistPage").then((m) => ({ default: m.WishlistPage })));
const BlogListPage = lazy(() => import("./pages/BlogListPage").then((m) => ({ default: m.BlogListPage })));
const BlogDetailPage = lazy(() => import("./pages/BlogDetailPage").then((m) => ({ default: m.BlogDetailPage })));
const ContactPage = lazy(() => import("./pages/ContactPage").then((m) => ({ default: m.ContactPage })));
const PolicyPage = lazy(() => import("./pages/PolicyPage").then((m) => ({ default: m.PolicyPage })));

// Customer Authentication Pages (Supabase Auth)
const ForgotPasswordPage = lazy(() => import("./pages/account/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import("./pages/account/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })));

// Admin Pages (loaded strictly on-demand when visiting /admin)
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const AdminProductsPage = lazy(() => import("./pages/AdminProductsPage").then((m) => ({ default: m.AdminProductsPage })));
const AdminProductEditorPage = lazy(() => import("./pages/AdminProductEditorPage").then((m) => ({ default: m.AdminProductEditorPage })));
const AdminCategoriesPage = lazy(() => import("./pages/AdminCategoriesPage").then((m) => ({ default: m.AdminCategoriesPage })));
const AdminOrdersPage = lazy(() => import("./pages/AdminOrdersPage").then((m) => ({ default: m.AdminOrdersPage })));
const AdminReviewsPage = lazy(() => import("./pages/AdminReviewsPage").then((m) => ({ default: m.AdminReviewsPage })));
const AdminCustomersPage = lazy(() => import("./pages/AdminCustomersPage").then((m) => ({ default: m.AdminCustomersPage })));
const AdminNotificationsPage = lazy(() => import("./pages/AdminNotificationsPage").then((m) => ({ default: m.AdminNotificationsPage })));
const AdminStorageManagementPage = lazy(() => import("./pages/AdminStorageManagementPage").then((m) => ({ default: m.AdminStorageManagementPage })));
const AdminProductConfigPage = lazy(() => import("./pages/AdminSystemPages").then((m) => ({ default: m.AdminProductConfigPage })));
const AdminMediaLibraryPage = lazy(() => import("./pages/AdminSystemPages").then((m) => ({ default: m.AdminMediaLibraryPage })));
const AdminWebsiteContentPage = lazy(() => import("./pages/AdminSystemPages").then((m) => ({ default: m.AdminWebsiteContentPage })));
const AdminSettingsPage = lazy(() => import("./pages/AdminSystemPages").then((m) => ({ default: m.AdminSettingsPage })));
const AdminAuditTrailPage = lazy(() => import("./pages/AdminSystemPages").then((m) => ({ default: m.AdminAuditTrailPage })));

function PageLoader() {
  return (
    <div className="min-h-[60vh] w-full flex items-center justify-center bg-white">
      <div className="w-8 h-8 rounded-full border-2 border-[#7AA05A] border-t-transparent animate-spin" aria-label="Loading page" />
    </div>
  );
}

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
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
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
            <Route path="/update-password" element={<ResetPasswordPage />} />
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
            <Route path="/admin/product-configuration" element={<AdminProductConfigPage />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/orders/:orderId" element={<AdminOrdersPage />} />
            <Route path="/admin/reviews" element={<AdminReviewsPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/media" element={<AdminMediaLibraryPage />} />
            <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
            <Route path="/admin/storage" element={<AdminStorageManagementPage />} />
            <Route path="/admin/website-content" element={<AdminWebsiteContentPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
            <Route path="/admin/audit-logs" element={<AdminAuditTrailPage />} />

            {/* 404 Fallback */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
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
                <BuyNowLocationProvider>
                  <ScrollToTop />
                  <AppContent />
                </BuyNowLocationProvider>
              </CartProvider>
            </WishlistProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </CurrencyProvider>
    </Router>
  );
}
