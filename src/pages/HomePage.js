// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { NavLink } from "react-router-dom";
import banner from "../img/background.png";
import { PRODUCTS } from "../lib/products";
import "../style/home.css";

/* ==================== קבועים/נתונים סטטיים ==================== */

/** תרגומי קטגוריות */
const CATEGORY_LABELS = {
  workwear: "ביגוד עבודה",
  safety: "בטיחות",
};

/** יתרונות (USPs) – קבוע מחוץ לקומפוננטה למניעת יצירה מחדש */
const FEATURES = [
  { icon: "bi-rocket-takeoff", title: "הפקה מהירה", text: "ייצור זריז עם לוחות זמנים ברורים" },
  { icon: "bi-award",         title: "איכות הדפסה", text: "DTF/רקמה/סובלימציה ברמת גימור גבוהה" },
  { icon: "bi-cash-coin",     title: "מחיר הוגן",   text: "תמחור שקוף בלי אותיות קטנות" },
  { icon: "bi-headset",       title: "ליווי אישי",  text: "מסקיצה ועד קבלה – בן אדם אמיתי" },
  { icon: "bi-recycle",       title: "חשיבה ירוקה", text: "חומרים וצבעים איכותיים ועמידים" },
  { icon: "bi-box-seam",      title: "בקרת איכות",  text: "בדיקה ידנית לכל הזמנה לפני משלוח" },
];

/** שלבי התהליך */
const STEPS = [
  { icon: "bi-cloud-upload", title: "שולחים לוגו",   text: "מעלים קובץ או שולחים במייל/ווצאפ" },
  { icon: "bi-brush",        title: "מאשרים סקיצה",  text: "מקבלים הדמיה ברורה לפני הדפסה" },
  { icon: "bi-truck",        title: "ייצור ומשלוח",  text: "מדפיסים, בודקים ושולחים לכל הארץ" },
];

/* ==================== עזרות ==================== */

/** החזרת פריט ראשון לכל קטגוריה + מונה פריטים */
function computeTopCategories(products) {
  const firstByCat = new Map();
  const counts = new Map();

  for (const p of products) {
    const key = p.category || "other";
    counts.set(key, (counts.get(key) || 0) + 1);
    if (!firstByCat.has(key)) firstByCat.set(key, p);
  }

  return Array.from(firstByCat.entries())
    .map(([key, p]) => ({
      key,
      title: CATEGORY_LABELS[key] || "קטגוריה",
      img: p.img,
      to: `/catalog?cat=${encodeURIComponent(key)}`,
      count: counts.get(key) || 0,
    }))
    .slice(0, 6);
}

/* ==================== קומפוננטה ==================== */

export default function HomePage() {
  // נמכרים ביותר – 8 פריטים
  const bestSellers = useMemo(() => PRODUCTS.slice(0, 8), []);

  // קטגוריות מובילות + מונה פריטים
  const topCategories = useMemo(() => computeTopCategories(PRODUCTS), []);
  const catsRef = useRef(null);

  // בקרה על חצים ב-strip הדסקטופ
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const catsListId = useId(); // לשיוך aria-controls

  const updateArrows = () => {
    const el = catsRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    // מרווח קטן כדי לא "לרצד" בשוליים
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < maxScroll - 4);
  };

  const scrollByStep = (dir = 1) => {
    const el = catsRef.current;
    if (!el) return;
    // צעד יחסי לרוחב, עם מינימום/מקסימום
    const step = Math.max(280, Math.min(520, el.clientWidth * 0.5));
    // מכבד העדפת reduced-motion (הדפדפן יתעלם מההתנהגות אם לא נתמך)
    const behavior =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth";
    el.scrollBy({ left: dir * step, behavior });
  };

  useEffect(() => {
    const el = catsRef.current;
    if (!el) return;
    updateArrows();

    const onScroll = () => updateArrows();
    const onResize = () => updateArrows();

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="homepage" dir="rtl">
      {/* ===== HERO ===== */}
      <section className="hero-wrap position-relative overflow-hidden">
        <picture>
          {/* אם יש לך גרסאות webp/avif – אפשר להוסיף כאן <source> */}
          <img
            src={banner}
            alt="צוות עובדים עם מדי עבודה ממותגים"
            className="hero-bg"
            loading="eager"
            fetchpriority="high"
            decoding="async"
            sizes="100vw"
            draggable="false"
          />
        </picture>
        <div className="hero-gradient" />

        <div className="container position-relative">
          <div className="row justify-content-center">
            <div className="col-12 col-xl-10 text-center">
              <div className="badge bg-white text-dark fw-semibold shadow-soft mb-3 hero-badge">
                <i className="bi bi-stars me-1" aria-hidden="true" /> קרינה – חולצות מודפסות לעסקים וצוותים
              </div>

              {/* הסרתי display-5 כדי לאפשר גודל זורם מה-CSS (clamp) */}
              <h1 className="fw-bolder text-white mb-3 lh-sm hero-title">
                מיתוג שמבליט את הצוות. איכות שמחזיקה בכביסה.
              </h1>

              <p className="text-white-75 mb-4 hero-subtitle">
                חולצות ומדי עבודה מודפסים באיכות מעולה (DTF/רקמה/סובלימציה), שירות מהיר לכל הארץ
                ותמיכה אישית משלב הסקיצה עד למסירה.
              </p>

              <div className="d-flex gap-2 gap-md-3 justify-content-center flex-wrap hero-cta">
                <NavLink to="/catalog" className="btn btn-primary btn-lg px-4 shadow-soft">
                  עיינו בקטלוג
                </NavLink>
                <NavLink to="/contact" className="btn btn-outline-light btn-lg px-4">
                  בקשת הצעת מחיר
                </NavLink>
              </div>

              <ul className="list-inline mt-4 mb-0 text-white-75 small hero-kpis" aria-label="יתרונות משלימים">
                <li className="list-inline-item me-3">
                  <i className="bi bi-patch-check-fill me-1" aria-hidden="true"></i> אחריות על ההדפסה
                </li>
                <li className="list-inline-item me-3">
                  <i className="bi bi-truck me-1" aria-hidden="true"></i> משלוחים לכל הארץ
                </li>
                <li className="list-inline-item">
                  <i className="bi bi-clock-history me-1" aria-hidden="true"></i> זמני אספקה מהירים
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ===== למה קרינה ===== */}
      <section className="bg-body py-5 border-bottom">
        <div className="container">
          <header className="text-center mb-4">
            <h2 className="h3 fw-bold">למה לבחור בקרינה?</h2>
            <p className="text-muted m-0">איכות, מהירות ושירות – בלי הפתעות.</p>
          </header>

          <div className="row g-4 text-center text-md-start" role="list">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="col-6 col-lg-4" role="listitem">
                <div className="usp d-flex align-items-center justify-content-center justify-content-md-start gap-3">
                  <span className="usp-icon" aria-hidden="true">
                    <i className={`bi ${f.icon}`} />
                  </span>
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

      {/* ===== איך זה עובד ===== */}
      <section className="container py-6">
        <header className="text-center mb-4">
          <h2 className="h3 fw-bold">איך זה עובד</h2>
          <p className="text-muted">פשוטים, מהירים, שקופים.</p>
        </header>

        <div className="row g-4 text-center" role="list">
          {STEPS.map((s) => (
            <div key={s.title} className="col-12 col-md-4" role="listitem">
              <div className="step-card">
                <div className="step-icon" aria-hidden="true">
                  <i className={`bi ${s.icon}`} />
                </div>
                <h3 className="h6 fw-bold mb-1">{s.title}</h3>
                <p className="text-muted small m-0">{s.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== קטגוריות ===== */}
      <section className="container py-6 position-relative">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="fw-bold m-0">קטגוריות</h2>
          <NavLink to="/catalog" className="btn btn-outline-primary btn-sm" aria-label="לכל הקטלוג">
            לכל הקטלוג
          </NavLink>
        </div>

        <div className="position-relative">
          {/* חצי-גלילה – בדסקטופ בלבד */}
          <button
            type="button"
            className="btn btn-light shadow-soft position-absolute top-50 translate-middle-y d-none d-lg-flex cats-arrow"
            style={{ right: -6 }}
            onClick={() => scrollByStep(-1)}
            disabled={!canPrev}
            aria-label="גלול ימינה"
            aria-controls={catsListId}
            title="הקודם"
          >
            <i className="bi bi-chevron-right" />
          </button>

          <button
            type="button"
            className="btn btn-light shadow-soft position-absolute top-50 translate-middle-y d-none d-lg-flex cats-arrow"
            style={{ left: -6 }}
            onClick={() => scrollByStep(1)}
            disabled={!canNext}
            aria-label="גלול שמאלה"
            aria-controls={catsListId}
            title="הבא"
          >
            <i className="bi bi-chevron-left" />
          </button>

          <div
            id={catsListId}
            ref={catsRef}
            className="cats-row strip-desktop"
            role="list"
            aria-label="קטגוריות מובילות"
          >
            {topCategories.map((c) => (
              <NavLink key={c.key} to={c.to} className="cat-tile" role="listitem" aria-label={`${c.title}, ${c.count} מוצרים`}>
                <div className="cat-media-simple">
                  <img src={c.img} alt={c.title} loading="lazy" decoding="async" draggable="false" />
                  <span className="cat-badge">{c.title} · {c.count}</span>
                  <div className="cat-hover-cta">
                    <span><i className="bi bi-grid me-1" aria-hidden="true" /> צפו במוצרים</span>
                  </div>
                </div>
              </NavLink>
            ))}
          </div>
        </div>
      </section>

      {/* ===== נמכרים ביותר ===== */}
      <section className="bestsellers py-6">
        <div className="container">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="fw-bold m-0">נמכרים ביותר</h2>
            <NavLink to="/catalog" className="btn btn-outline-primary btn-sm" aria-label="לכל המוצרים">
              לכל המוצרים
            </NavLink>
          </div>

          {/* מובייל/טאבלט: קרוסלה */}
          <div className="d-lg-none">
            <div className="best-mobile-row" role="list" aria-label="מוצרים נמכרים – גללו אופקית">
              {bestSellers.map((p) => (
                <article key={p.slug} className="best-mobile-card" role="listitem">
                  {/* כל הכרטיס הוא קישור, לשיפור נגישות/טאצ' */}
                  <NavLink to={`/product/${p.slug}`} className="text-decoration-none">
                    <div className="best-media">
                      <img src={p.img} alt={p.name} loading="lazy" decoding="async" draggable="false" />
                      <span className="best-price">{p.price} ₪</span>
                    </div>
                    <div className="best-body">
                      <h3 className="best-title text-dark">{p.name}</h3>
                      <span className="btn btn-primary w-100">לפרטים והזמנה</span>
                    </div>
                  </NavLink>
                </article>
              ))}
            </div>

            <div className="mt-3 text-center">
              <small className="text-muted">
                גררו הצידה כדי לראות עוד מוצרים <i className="bi bi-arrow-left-right ms-1" aria-hidden="true"></i>
              </small>
            </div>
          </div>

          {/* דסקטופ: גריד */}
          <div className="d-none d-lg-block">
            <div className="best-desktop-grid" role="list" aria-label="מוצרים נמכרים">
              {bestSellers.map((p) => (
                <article key={p.slug} className="best-card" role="listitem">
                  <NavLink to={`/product/${p.slug}`} className="text-decoration-none">
                    <div className="best-media">
                      <img src={p.img} alt={p.name} loading="lazy" decoding="async" draggable="false" />
                      <span className="best-price">{p.price} ₪</span>
                    </div>

                    <div className="best-body">
                      <h3 className="best-title text-dark">{p.name}</h3>
                      <div className="best-row-meta d-flex align-items-center justify-content-between">
                        <small className="text-muted">במלאי</small>
                        <i className="bi bi-chevron-left small text-muted" aria-hidden="true"></i>
                      </div>

                      {/* הכפתור בתחתית – נשאר לינק, לא overlay */}
                      <div className="best-actions">
                        <span className="btn btn-primary btn-sm w-100">לפרטים והזמנה</span>
                      </div>
                    </div>
                  </NavLink>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== CTA סופי ===== */}
      <section className="py-6">
        <div className="container">
          <div className="final-cta card border-0 shadow-soft p-4 p-md-5 text-center">
            <h3 className="h4 fw-bold mb-2">מוכנים להתחיל? נוביל את המיתוג של הצוות שלך.</h3>
            <p className="text-muted mb-3">
              נלווה אתכם מבחירת הפריט, דרך עיבוד הלוגו ועד להדפסה ומשלוח.
            </p>
            <div className="d-flex gap-2 justify-content-center">
              <NavLink to="/contact" className="btn btn-primary">דברו איתנו</NavLink>
              <NavLink to="/catalog" className="btn btn-outline-primary">עיינו בקטלוג</NavLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
