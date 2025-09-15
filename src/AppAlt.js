// src/AppAlt.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Helmet, HelmetProvider } from "react-helmet-async";

// עיצוב כללי (התאם למסלול אצלך)

// קומפוננטות משותפות
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import "./style/Site.css";

// דפים חדשים
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

// אם אתה משתמש ב-Bootstrap JS (לא חובה אם כבר נטען במקום אחר)
// import "bootstrap/dist/js/bootstrap.bundle.min.js";

/** מגלגל לראש בכל ניווט */
function ScrollToTop() {
  React.useEffect(() => {
    const handler = () => window.scrollTo({ top: 0, behavior: "smooth" });
    window.addEventListener("hashchange", handler, false);
    return () => window.removeEventListener("hashchange", handler, false);
  }, []);
  return null;
}

export default function AppAlt() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Helmet htmlAttributes={{ lang: "he", dir: "rtl" }}>
          <title>Karina — Preview Mode</title>
          <meta
            name="description"
            content="תצוגת פיתוח לדפים החדשים של קארינה: קטלוג, מוצר, עגלה, תשלום ועוד."
          />
          <link rel="canonical" href="https://karina.co.il/preview" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="Karina — Preview" />
          <meta
            property="og:description"
            content="תצוגת פיתוח לדפים החדשים של האתר."
          />
          <meta property="og:image" content="/img/logo.png" />
          <meta property="og:locale" content="he_IL" />
        </Helmet>

        {/* רצועת Preview עדינה — לא חובה */}
        <div
          style={{
            textAlign: "center",
            background: "linear-gradient(90deg, rgba(255,168,196,.3) 0%, #fff 100%)",
            borderBottom: "1px solid #eee",
            fontWeight: 700,
            padding: "8px 12px",
          }}
        >
          מצב תצוגה (AppAlt) — הדפים החדשים נטענים כאן ללא השפעה על האתר החי
        </div>

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
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        <Footer />
      </BrowserRouter>
    </HelmetProvider>
  );
}
