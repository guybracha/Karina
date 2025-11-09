// src/AppAlt.jsx
import React, { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";

// Auth wiring
import { watchAuth, collectRedirectResultIfAny } from "./services/auth";
import { ensureUserDoc } from "./services/users";

// Providers
import { AuthProvider } from "./contexts/AuthContext";
import { OrdersProvider } from "./contexts/OrdersContext";
import { LogosQueueProvider } from "./contexts/LogosQueueContext.tsx";

// Shared UI
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

import "./style/Site.css";

// Pages
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
import AuthPage from "./pages/AuthPage";
import Legal from "./pages/Legal";

import "./a11y/a11y.css";
import A11yToolkit from "./a11y/A11yToolkit";
import ReadAloud from "./a11y/ReadAloud";
import A11yFab from "./a11y/A11yFab";

/** ====================== קבועים ====================== */
const GA_ID = "G-SHQSKGKY2C";
const IS_PROD = process.env.NODE_ENV === "production";

/** מגלגל לראש בכל ניווט */
function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, search, hash]);
  return null;
}

/** שולח page_view ל-GA4 בכל שינוי נתיב (SPA) */
function GAListener() {
  const { pathname, search } = useLocation();
  useEffect(() => {
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

  const ogImage = `${base}/img/logo.png`;
  const title = "קארינה חולצות מודפסות";
  const description =
    "תצוגת פיתוח לדפים החדשים של קארינה: קטלוג, מוצר, עגלה, תשלום ועוד.";

  return (
    <Helmet htmlAttributes={{ lang: "he", dir: "rtl" }}>
      <title>{title}</title>
      <meta name="description" content={description} />

      <link rel="canonical" href={url} />

      <meta property="og:type" content="website" />
      <meta property="og:locale" content="he_IL" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      <meta name="theme-color" content="#ffffff" />
      <link rel="icon" href="/favicon.ico" />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}></script>
      <script>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </script>

      {!IS_PROD && <meta name="robots" content="noindex,nofollow" />}
    </Helmet>
  );
}

export default function AppAlt() {
  // ---- חיווט יצירת/סנכרון users_prod/{uid} ----
  const bootstrapped = useRef(false);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    // 1) איסוף תוצאת Redirect (iOS / in-app browsers)
    (async () => {
      try {
        const rr = await collectRedirectResultIfAny();
        const user = rr?.user;
        if (!user) return;

        // דילוג על אנונימי/ללא UID
        if (user.isAnonymous || !user.uid) {
          console.debug("[redirect] skip ensureUserDoc (anonymous/no uid)");
          return;
        }

        await ensureUserDoc(user);
      } catch (e) {
        console.error("[redirect->ensureUserDoc]", e?.code, e?.message);
      }
    })();

    // 2) מאזין גלובלי ל-auth (כולל ריענון דף)
    const unsub = watchAuth(async (user) => {
      if (!user) return;

      // אם המשתמש אנונימי – דלג
      if (user.isAnonymous) {
        console.debug("[Auth] anonymous session -> skip ensureUserDoc");
        return;
      }

      // ודא שיש UID תקין
      if (!user.uid) {
        console.warn("[Auth] user without UID -> skip ensureUserDoc");
        return;
      }

      try {
        await ensureUserDoc(user);
      } catch (e) {
        console.error("[onAuthStateChanged->ensureUserDoc]", e?.code, e?.message);
      }
    });

    return () => unsub?.();
  }, []);

  // דמויות לתשובות מהירות בצ'אט (לבקשתך)
  async function handleChatSend(text) {
    const t = (text || "").toLowerCase();
    if (t.includes("מחיר") || t.includes("הצעת")) {
      return { role: "assistant", text: "בשמחה! השאירו פרטים וקובץ לוגו כאן: /contact ונחזיר הצעת מחיר מדויקת." };
    }
    if (t.includes("מידה") || t.includes("מידות")) {
      return { role: "assistant", text: "טבלת מידות נמצאת בכל דף מוצר. מומלץ למדוד חולצה קיימת ולהשוות לטבלה." };
    }
    if (t.includes("הדמיה") || t.includes("לוגו")) {
      return { role: "assistant", text: "אפשר להעלות לוגו בדף המוצר ולקבל הדמיה מיידית. קבצים מומלצים: PDF/SVG/AI או PNG שקוף 300dpi." };
    }
    return { role: "assistant", text: "קיבלתי: " + text };
  }

  return (
    <HelmetProvider>
      <AuthProvider>
        <OrdersProvider>
          <LogosQueueProvider>
            <BrowserRouter>
              <RootSEO />

              <Navbar />

              <main className="min-vh-100">
                <ScrollToTop />
                <GAListener />

                <Routes>
                  {/* ציבורי */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/catalog" element={<Catalog />} />
                  <Route path="/catalog/:view" element={<Catalog />} />
                  <Route path="/product/:slug" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/auth" element={<AuthPage />} />

                  {/* מוגן */}
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

                  {/* 404 + legal */}
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
