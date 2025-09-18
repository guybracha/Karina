// src/AppAlt.jsx
import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";

// קומפוננטות משותפות
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

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

import ChatWidget from "./components/ChatWidget";
import { OrdersProvider } from "./contexts/OrdersContext";

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
  // ---- צ'ט: מימוש בסיסי ל-onSend ----
  // אפשר להחליף בהמשך לחיבור ל-FAQBot / API שרת
  async function handleChatSend(text /*, history */) {
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

    // ברירת מחדל
    return { role: "assistant", text: "קיבלתי: " + text };
  }
  // ------------------------------------

  return (
    <HelmetProvider>
      <OrdersProvider>
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
          </Helmet>

          <Navbar />

          <main className="min-vh-100">
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/product/:slug" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/about" element={<About />} />
              <Route path="/account" element={<Account />} />
              <Route path="/orders/:orderId" element={<OrderDetail />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>

          <Footer />

          {/* הצ'טבוט – גלובלי לכל האתר */}
          <ChatWidget onSend={handleChatSend} />
        </BrowserRouter>
      </OrdersProvider>
    </HelmetProvider>
  );
}
