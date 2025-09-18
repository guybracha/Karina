// src/pages/HomePage.jsx
import React, { useMemo } from "react";
import { NavLink } from "react-router-dom";
import banner from "../img/background.png";
import { PRODUCTS } from "../lib/products";

const CATEGORY_LABELS = {
  workwear: "ביגוד עבודה",
  safety: "בטיחות / זוהר",
  // אפשר להוסיף כאן מיפויים עתידיים:
  // hoodies: "קפוצ'ונים",
  // tshirts: "טי-שירטים",
  // polos: "פולו",
};

export default function HomePage() {
  // נמכרים ביותר (דוגמה פשוטה)
  const bestSellers = useMemo(() => PRODUCTS.slice(0, 4), []);

  // קטגוריות מובילות מתוך הקטלוג
  const topCategories = useMemo(() => {
    const map = new Map();
    for (const p of PRODUCTS) {
      const key = p.category || "other";
      if (!map.has(key)) {
        map.set(key, {
          key,
          title: CATEGORY_LABELS[key] || "קטגוריה",
          img: p.img,           // תמונה מהמוצר הראשון בקטגוריה
          to: `/catalog?cat=${encodeURIComponent(key)}`,
        });
      }
    }
    // אפשר לסדר לפי סדר ידני/עדיפות. כרגע לפי הופעה בקטלוג ולוקחים עד 6
    return Array.from(map.values()).slice(0, 6);
  }, []);

  return (
    <main className="homepage" dir="rtl">
      {/* HERO */}
      <section className="hero-wrap position-relative overflow-hidden">
        <picture>
          <img
            src={banner}
            alt="צוות עובדים לובשים חולצות ממותגות"
            className="hero-bg"
            loading="eager"
            fetchpriority="high"
          />
        </picture>
        <div className="hero-overlay" />

        <div className="container position-relative">
          <div className="row justify-content-center">
            <div className="col-xl-9 text-center">
              <h1 className="display-5 fw-bolder text-white mb-3 lh-sm">
                 מדי עבודה ממותגים לעסקים וצוותים
              </h1>
              <p className="lead text-white-50 mb-4">
                מיתוג שמחזק את הנראות והמקצועיות: הדפסה איכותית, ליווי אישי,
                וזמני אספקה מהירים בכל הארץ.
              </p>

              <div className="d-flex gap-2 gap-md-3 justify-content-center flex-wrap">
                <NavLink to="/catalog" className="btn btn-light btn-lg px-4 shadow-soft">
                  עיינו בקטלוג
                </NavLink>
                <NavLink to="/contact" className="btn btn-outline-light btn-lg px-4">
                  קבלו הצעת מחיר
                </NavLink>
              </div>

              {/* Trust badges */}
              <ul className="list-inline mt-4 mb-0 text-white-75 small">
                <li className="list-inline-item me-3">
                  <i className="bi bi-shield-check me-1"></i> איכות הדפסה גבוהה
                </li>
                <li className="list-inline-item me-3">
                  <i className="bi bi-truck me-1"></i> משלוח לכל הארץ
                </li>
                <li className="list-inline-item">
                  <i className="bi bi-clock-history me-1"></i> ייצור מהיר
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* USP STRIP */}
      <section className="bg-body py-4 border-bottom">
        <div className="container">
          <div className="row g-4 text-center text-md-start">
            {[
              { icon: "bi-ink", title: "הדפסה מקצועית", text: "DTF / סובלימציה / משי / רקמה" },
              { icon: "bi-patch-check", title: "בקרת איכות", text: "בדיקה ויזואלית לכל הזמנה" },
              { icon: "bi-geo", title: "שירות ארצי", text: "איסוף/משלוח לכל נקודה" },
              { icon: "bi-chat-dots", title: "ליווי אישי", text: "מסקיצה ועד קבלה" },
            ].map((f, i) => (
              <div key={i} className="col-6 col-lg-3">
                <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-3">
                  <i className={`bi ${f.icon} fs-2 text-primary`} />
                  <div>
                    <div className="fw-bold">{f.title}</div>
                    <div className="text-muted small">{f.text}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES – מתוך הקטלוג */}
      <section className="container py-6">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="fw-bold m-0">קטגוריות מובילות</h2>
          <NavLink to="/catalog" className="btn btn-outline-primary btn-sm">לכל הקטלוג</NavLink>
        </div>

        <div className="row g-3 g-md-4">
          {topCategories.map((c) => (
            <div key={c.key} className="col-6 col-md-4 col-lg-2">
              <NavLink to={c.to} className="card cat-card h-100 text-decoration-none hover-lift">
                <img
                  src={c.img}
                  alt={c.title}
                  className="card-img-top object-cover"
                  loading="lazy"
                  style={{ height: 120, objectFit: "cover" }}
                />
                <div className="card-body py-3">
                  <h3 className="h6 m-0 text-dark">{c.title}</h3>
                </div>
              </NavLink>
            </div>
          ))}
        </div>
      </section>

      {/* BEST SELLERS – מהקטלוג */}
      <section className="bg-body-tertiary py-6">
        <div className="container">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="fw-bold m-0">נמכרים ביותר</h2>
            <NavLink to="/catalog" className="btn btn-outline-primary btn-sm">לכל המוצרים</NavLink>
          </div>

          <div className="row g-3 g-md-4">
            {bestSellers.map((p) => (
              <div key={p.slug} className="col-6 col-md-3">
                <div className="card h-100 shadow-hover hover-lift">
                  <img
                    src={p.img}
                    className="card-img-top object-contain p-3"
                    alt={p.name}
                    loading="lazy"
                    style={{ height: 180 }}
                  />
                  <div className="card-body d-flex flex-column">
                    <h3 className="h6">{p.name}</h3>
                    <div className="text-primary fw-bold mb-3">{p.price} ₪</div>
                    <NavLink to={`/product/${p.slug}`} className="btn btn-primary mt-auto">
                      לפרטים והזמנה
                    </NavLink>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* שאר הסקשנים נשארו ללא שינוי */}
      {/* HOW IT WORKS, CLIENT LOGOS, TESTIMONIALS, FAQ, FINAL CTA */}
    </main>
  );
}
