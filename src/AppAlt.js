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

/** ====================== קבועים ====================== */
const GA_ID = "G-SHQSKGKY2C";
const IS_PROD = process.env.NODE_ENV === "production";

/** מגלגל לראש בכל ניווט */
function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  React.useEffect(() => {
    if (hash) return; // תן לעוגן לעבוד
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, search, hash]);
  return null;
}

/** שולח page_view ל-GA4 בכל שינוי נתיב (SPA) */
function GAListener() {
  const { pathname, search } = useLocation();
  React.useEffect(() => {
    if (!window.gtag) return;
    window.gtag("config", GA_ID, { page_path: pathname + (search || "") });
  }, [pathname, search]);
  return null;
}

/** Helmet-Root דינמי: canonical, OG/Twitter, GA scripts, preconnect ועוד */
function RootSEO() {
  const { pathname, search } = useLocation();
  const base =
    (typeof window !== "undefined" && window.location?.origin) ||
    "https://karina.co.il";
  const url = base + pathname + (search || "");

  const ogImage = `${base}/img/logo.png`; // עדיף מוחלט ל-social
  const title = "קארינה חולצות מודפסות";
  const description =
    "תצוגת פיתוח לדפים החדשים של קארינה: קטלוג, מוצר, עגלה, תשלום ועוד.";

  return (
    <Helmet htmlAttributes={{ lang: "he", dir: "rtl" }}>
      {/* --- Title & Description כלליים (דפים ספציפיים יכולים להחליף) --- */}
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* --- Canonical דינמי ומוחלט --- */}
      <link rel="canonical" href={url} />

      {/* --- Open Graph --- */}
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="he_IL" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* --- Twitter --- */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* --- A11y/UX --- */}
      <meta name="theme-color" content="#ffffff" />
      <link rel="icon" href="/favicon.ico" />

      {/* --- Preconnects לפונטים (שיפור CWV) --- */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      {/* --- GA4 base scripts --- */}
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}></script>
      <script>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </script>

      {/* --- חסימת אינדוקס ב-staging/preview --- */}
      {!IS_PROD && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
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
              {/* ✅ SEO/OG/GA שורשי ודינמי */}
              <RootSEO />

              <Navbar />

              <main className="min-vh-100">
                <ScrollToTop />
                {/* ✅ דיווח page_view בכל ניווט */}
                <GAListener />

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
              {/* <ChatWidget onSend={handleChatSend} /> */}

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
