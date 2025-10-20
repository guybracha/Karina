// src/AppAlt.jsx
import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";

// Providers
import { AuthProvider } from "./contexts/AuthContext";
import { OrdersProvider } from "./contexts/OrdersContext";
import { LogosQueueProvider } from "./contexts/LogosQueueContext.tsx"; // ⬅️ חדש

// קומפוננטות משותפות
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

import "./style/Site.css";

// דפים
import HomePage from "./pages/HomePage";
import Catalog from "./pages/Catalog";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import About from "./pages/About";
import Account from "./pages/Account";
import NotFound from "./pages/NotFound";
import OrderDetail from "./pages/OrderDetail";
import Orders from "./pages/Orders";
import AuthPage from "./pages/AuthPage";   // ✅ דף כניסה חדש
import Legal from "./pages/Legal";

import "./a11y/a11y.css";
import A11yToolkit from "./a11y/A11yToolkit";
import ReadAloud from "./a11y/ReadAloud";
import A11yFab from "./a11y/A11yFab"; // ⬅️ FAB נגישות
/** מגלגל לראש בכל ניווט */
function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  React.useEffect(() => {
    if (hash) return; // תן לעוגן לעבוד
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, search, hash]);
  return null;
}

export default function AppAlt() {
  async function handleChatSend(text) {
    const t = (text || "").toLowerCase();

    if (t.includes("מחיר") || t.includes("הצעת")) {
      return {
        role: "assistant",
        text: "בשמחה! השאירו פרטים וקובץ לוגו כאן: /contact ונחזיר הצעת מחיר מדויקת."
      };
    }
    if (t.includes("מידה") || t.includes("מידות")) {
      return {
        role: "assistant",
        text: "טבלת מידות נמצאת בכל דף מוצר. מומלץ למדוד חולצה קיימת ולהשוות לטבלה."
      };
    }
    if (t.includes("הדמיה") || t.includes("לוגו")) {
      return {
        role: "assistant",
        text: "אפשר להעלות לוגו בדף המוצר ולקבל הדמיה מיידית. קבצים מומלצים: PDF/SVG/AI או PNG שקוף 300dpi."
      };
    }
    return { role: "assistant", text: "קיבלתי: " + text };
  }

  return (
    <HelmetProvider>
      <AuthProvider>
        <OrdersProvider>
          {/* ⬇️ עטיפה גלובלית לכל העץ כדי ש־useLogosQueue יעבוד בכל הדפים */}
          <LogosQueueProvider>
            <BrowserRouter>
              <Helmet htmlAttributes={{ lang: "he", dir: "rtl" }}>
                <title>קארינה חולצות מודפסות</title>
                <meta
                  name="description"
                  content="תצוגת פיתוח לדפים החדשים של קארינה: קטלוג, מוצר, עגלה, תשלום ועוד."
                />
                <link rel="canonical" href="https://karina.co.il/preview" />
                <meta property="og:type" content="website" />
                <meta property="og:title" content="קארינה חולצות מודפסות" />
                <meta
                  property="og:description"
                  content="תצוגת פיתוח לדפים החדשים של האתר."
                />
                <meta property="og:image" content="/img/logo.png" />
                <meta property="og:locale" content="he_IL" />
                {/* Preconnect לשיפור ביצועים (Core Web Vitals) */}
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
                  <script async src="https://www.googletagmanager.com/gtag/js?id=G-SHQSKGKY2C"></script>
                  <script>
                    {`
                      window.dataLayer = window.dataLayer || [];
                      function gtag(){dataLayer.push(arguments);}
                      gtag('js', new Date());
                      gtag('config', 'G-SHQSKGKY2C');
                    `}
                  </script>
              </Helmet>

              <Navbar />

              <main className="min-vh-100">
                <ScrollToTop />
                <Routes>
                  {/* ציבורי */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/product/:slug" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/auth" element={<AuthPage />} /> {/* ✅ דף כניסה */}

                  {/* מוגן למשתמש מחובר */}
                  <Route
                    path="/checkout"
                    element={
                      <ProtectedRoute>
                        <Checkout />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/account"
                    element={
                      <ProtectedRoute>
                        <Account />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders"
                    element={
                      <ProtectedRoute>
                        <Orders />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/orders/:orderId"
                    element={
                      <ProtectedRoute>
                        <OrderDetail />
                      </ProtectedRoute>
                    }
                  />

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                  <Route path="/legal" element={<Legal />} />
                </Routes>
              </main>

              <Footer />
              {/*
                <ChatWidget onSend={handleChatSend} />
               */}
                <div dir="ltr" id="a11y-fixed-layer">
                    <A11yToolkit />
                    <ReadAloud />
                    <A11yFab />
                 </div>
            </BrowserRouter>
          </LogosQueueProvider>
        </OrdersProvider>
      </AuthProvider>
    </HelmetProvider>
  );
}
