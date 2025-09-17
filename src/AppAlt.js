// src/AppAlt.jsx
import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
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
import OrderDetail from "./pages/OrderDetail";
import Orders from "./pages/Orders";

import { OrdersProvider } from "./contexts/OrdersContext";
// אם אתה משתמש ב-Bootstrap JS (לא חובה אם כבר נטען במקום אחר)

/** מגלגל לראש בכל ניווט */

function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  React.useEffect(() => {
    // אם יש עוגן (#section) תן לדפדפן לגלול לעוגן בעצמו
    if (hash) return;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname, search, hash]);

  return null;
}

export default function AppAlt() {
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
      </BrowserRouter>
      </OrdersProvider>
    </HelmetProvider>
  );
}
