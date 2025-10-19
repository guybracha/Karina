// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { NavLink } from "react-router-dom";
import banner from "../img/background.png";
import { PRODUCTS } from "../lib/products";
import "../style/home.css";
import { Helmet } from "react-helmet-async";

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
                <i className="bi bi-stars me-1" aria-hidden="true" /> קארינה – חולצות מודפסות לעסקים וצוותים
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
            <h2 className="h3 fw-bold">למה לבחור בקארינה?</h2>
            <p className="text-muted m-0">איכות, מהירות ושירות – בלי הפתעות.</p>
          </header>

          <div className="row g-4 text-center text-md-start" role="list">
            {FEATURES.map((f) => (
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

      {/* ===== מי אנחנו ===== */}
      <section className="py-6 bg-body-tertiary position-relative overflow-hidden">
        <div className="shape-blur-1" aria-hidden="true" />
        <div className="container">
          <div className="row g-4 align-items-center">
            <div className="col-12 col-lg-6">
              <div className="glass-card p-4 p-md-5 h-100">
                <span className="badge bg-primary-subtle text-primary-emphasis mb-2">
                  <i className="bi bi-people-fill me-1" /> מי אנחנו
                </span>
                <h2 className="h3 fw-bold mb-2">קארינה – הדפסות לעסקים וצוותים</h2>
                <p className="text-muted mb-3">
                  אנחנו מפעל עם סטנדרט של גדול: טכנולוגיית הדפסה מתקדמת (DTF, רקמה, סובלימציה),
                  בקרת איכות ידנית לכל הזמנה, ושירות אנושי אמיתי מרגע הסקיצה ועד שהחבילה אצלכם.
                </p>
                <ul className="list-unstyled m-0">
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <i className="bi bi-check2-circle text-success mt-1" aria-hidden="true" />
                    <span>אלפי פריטים שסופקו לצוותים, עמותות ועסקים בארץ</span>
                  </li>
                  <li className="d-flex align-items-start gap-2 mb-2">
                    <i className="bi bi-check2-circle text-success mt-1" aria-hidden="true" />
                    <span>מפעל עיצוב פנימי להדמיות מהירות וחדות</span>
                  </li>
                  <li className="d-flex align-items-start gap-2">
                    <i className="bi bi-check2-circle text-success mt-1" aria-hidden="true" />
                    <span>מענה מהיר בוואטסאפ/מייל והובלה בלוחות זמנים</span>
                  </li>
                </ul>
                <div className="mt-3 d-flex gap-2">
                  <NavLink to="/contact" className="btn btn-primary">בואו נכיר</NavLink>
                  <NavLink to="/catalog" className="btn btn-outline-primary">עיינו בקטלוג</NavLink>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="about-photo-grid">
                <figure className="about-photo main">
                  <img src={banner} alt="סטודיו עבודה והדפסות בפעולה" loading="lazy" decoding="async" />
                </figure>
                <figure className="about-photo sub a">
                  <img src={banner} alt="דוגמת הדפס קרוב" loading="lazy" decoding="async" />
                </figure>
                <figure className="about-photo sub b">
                  <img src={banner} alt="אריזות ומשלוחים מוכנים" loading="lazy" decoding="async" />
                </figure>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== למה דווקא אנחנו (מוקטן + KPIs) ===== */}
      <section className="py-6">
        <div className="container">
          <header className="text-center mb-4">
            <h2 className="h3 fw-bold">למה לבחור דווקא בקארינה?</h2>
            <p className="text-muted m-0">תכל’ס: שילוב של איכות, דיוק ושירות.</p>
          </header>

          <div className="row g-4">
            {[
              { icon:"bi-shield-check", title:"אחריות על ההדפסה", text:"התחייבות לאיכות גימור ושמירת צבעים" },
              { icon:"bi-aspect-ratio", title:"הדמיה לפני ייצור", text:"מאשרים הדמיה – ואז מדפיסים" },
              { icon:"bi-lightning-charge", title:"מהירות תגובה", text:"זמינות לשיחה/וואטסאפ והנעת תהליך" },
              { icon:"bi-recycle", title:"חומרים חזקים", text:"בדים וצבעים שמחזיקים כביסות ושחיקה" },
            ].map(item => (
              <div key={item.title} className="col-6 col-lg-3">
                <div className="why-card text-center p-4 h-100">
                  <i className={`bi ${item.icon} why-icon`} aria-hidden="true" />
                  <h3 className="h6 fw-bold mt-2 mb-1">{item.title}</h3>
                  <p className="text-muted small m-0">{item.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="stats-wrap mt-4">
            <div className="stat">
              <div className="stat-num">10k+</div>
              <div className="stat-label">פריטים שסופקו</div>
            </div>
            <div className="stat">
              <div className="stat-num">4.9★</div>
              <div className="stat-label">דירוג ממוצע לקוחות</div>
            </div>
            <div className="stat">
              <div className="stat-num">48–72ש׳</div>
              <div className="stat-label">הדמיה ראשונה</div>
            </div>
            <div className="stat">
              <div className="stat-num">100%</div>
              <div className="stat-label">בקרת איכות לפני משלוח</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== ההשקעה שלנו – טיימליין ===== */}
      <section className="py-6 bg-body">
        <div className="container">
          <header className="text-center mb-4">
            <h2 className="h4 fw-bold">ההשקעה שלנו בכל הזמנה</h2>
            <p className="text-muted m-0">שקיפות בתהליך – צעד-צעד.</p>
          </header>

          <ol className="timeline">
            <li>
              <div className="dot" aria-hidden="true" />
              <h3 className="h6 m-0">קבלת לוגו וקבצים</h3>
              <p className="text-muted small m-0">בדיקת איכות/פורמט והמלצה על טכניקת הדפסה.</p>
            </li>
            <li>
              <div className="dot" aria-hidden="true" />
              <h3 className="h6 m-0">הדמיה מדויקת</h3>
              <p className="text-muted small m-0">מידות, מיקומים, צבעים—מאשרים לפני ייצור.</p>
            </li>
            <li>
              <div className="dot" aria-hidden="true" />
              <h3 className="h6 m-0">בדיקות לפני הדפסה</h3>
              <p className="text-muted small m-0">התאמת צבעים ובדיקה ידנית של חומרים.</p>
            </li>
            <li>
              <div className="dot" aria-hidden="true" />
              <h3 className="h6 m-0">הדפסה ובקרת איכות</h3>
              <p className="text-muted small m-0">סקירת גימור לכל יחידה ומדבקות זיהוי.</p>
            </li>
            <li>
              <div className="dot" aria-hidden="true" />
              <h3 className="h6 m-0">אריזה ומשלוח</h3>
              <p className="text-muted small m-0">אריזה נקייה, תווית בקרה, שליחה לכל הארץ.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* ===== לקוחות מספרים + לוגואים ===== */}
      <section className="py-6">
        <div className="container">
          <header className="text-center mb-4">
            <h2 className="h4 fw-bold">מה הלקוחות שלנו אומרים</h2>
            <p className="text-muted m-0">קצת פידבק מהשטח.</p>
          </header>

          <div className="row g-4">
            {[
              {name:"נועה, מנהלת משאבי אנוש", text:"הדמיה מהירה ומדויקת, אספקה זריזה – כל הצוות התאהב בחולצות."},
              {name:"אמיר, בעל סטארטאפ", text:"שירות אלוף. עזרו לנו לבחור טכניקה שהחמיאה ללוגו."},
              {name:"טל, עמותה", text:"מחיר הוגן, איכות מעולה והכי חשוב – יחס אנושי וסבלני."},
            ].map(t => (
              <div key={t.name} className="col-12 col-md-4">
                <blockquote className="quote-card h-100">
                  <i className="bi bi-quote quote-icon" aria-hidden="true" />
                  <p className="m-0">{t.text}</p>
                  <footer className="mt-2 text-muted small">— {t.name}</footer>
                </blockquote>
              </div>
            ))}
          </div>

          <div className="logos-marquee mt-4" aria-label="מותגים שעבדנו איתם">
            <div className="track">
              {Array.from({length:10}).map((_,i)=>(
                <span key={i} className="logo-pill"><i className="bi bi-building me-1" />Brand {i+1}</span>
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
