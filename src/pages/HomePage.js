// src/pages/HomePage.jsx
import React, { useEffect, useMemo, useRef, useState, useId } from "react";
import { NavLink } from "react-router-dom";
import banner from "../webp/background.webp";
import { PRODUCTS } from "../lib/products";
import "../style/home.css";
import { Helmet } from "react-helmet-async";
import logo from "../webp/logo1.webp";
import render1 from "../webp/render1.webp";
import render2 from "../webp/render2.webp";
import render3 from "../webp/render3.webp";

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

/** המרת שמות צבעים מעברית לקודי hex */
function getColorHex(colorName) {
  const colorMap = {
    'שחור': '#000000',
    'לבן': '#FFFFFF',
    'אפור': '#808080',
    'נייבי': '#001f3f',
    'כחול': '#0074D9',
    'צהוב': '#FFDC00',
    'ירוק': '#2ECC40',
    'כתום': '#FF851B',
    'אדום': '#FF4136',
    'ורוד': '#FF69B4',
    'חום': '#8B4513',
    'בז\'': '#F5F5DC',
    'תכלת': '#87CEEB',
    'סגול': '#800080',
    'ליים': '#CDDC39',
  };
  return colorMap[colorName] || '#E2E8F0';
}

/** קומפוננטת קרוסלת מוצרים */
function ProductCarousel({ products }) {
  const carouselRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = () => {
    const el = carouselRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  };

  const scrollTo = (direction) => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = 280;
    const gap = 16;
    const scrollAmount = (cardWidth + gap) * direction;
    const behavior = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth";
    el.scrollBy({ left: scrollAmount, behavior });
  };

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    updateScrollButtons();

    const onScroll = () => updateScrollButtons();
    const onResize = () => updateScrollButtons();
    
    // גלילה אופקית עם גלגלת העכבר (במחשב נייח)
    const onWheel = (e) => {
      // בודק אם זו גלילה אנכית (לא shift+wheel)
      if (e.deltaY !== 0 && !e.shiftKey) {
        e.preventDefault();
        const behavior = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth";
        el.scrollBy({ left: e.deltaY, behavior });
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="product-carousel-wrapper position-relative">
      <button
        className="carousel-btn carousel-btn-prev"
        onClick={() => scrollTo(-1)}
        disabled={!canScrollLeft}
        aria-label="מוצר קודם"
      >
        <i className="bi bi-chevron-right" />
      </button>

      <div className="product-carousel" ref={carouselRef}>
        {products.map((product) => (
          <NavLink
            key={product.slug}
            to={`/product/${product.slug}`}
            className="product-carousel-card"
          >
            <div className="product-carousel-img">
              <img
                src={product.img}
                alt={product.name}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="product-carousel-body">
              <h3 className="product-carousel-title">{product.name}</h3>
              <div className="product-carousel-price">
                ₪{product.price}
                <span className="text-muted small"> / יחידה</span>
              </div>
              {product.colors && product.colors.length > 0 && (
                <div className="product-carousel-colors-wrapper">
                  <div className="product-carousel-colors">
                    {product.colors.map((color, idx) => (
                      <span
                        key={idx}
                        className="color-dot"
                        style={{ backgroundColor: getColorHex(color) }}
                        title={color}
                        aria-label={color}
                      />
                    ))}
                  </div>
                  <div className="color-count text-muted small">
                    {product.colors.length} {product.colors.length === 1 ? 'צבע' : 'צבעים'}
                  </div>
                </div>
              )}
            </div>
          </NavLink>
        ))}
      </div>

      <button
        className="carousel-btn carousel-btn-next"
        onClick={() => scrollTo(1)}
        disabled={!canScrollRight}
        aria-label="מוצר הבא"
      >
        <i className="bi bi-chevron-left" />
      </button>
    </div>
  );
}

export default function HomePage() {
  // ===== SEO =====
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://example.com";
  const canonical = `${origin}/`;
  const siteName = "Karina";
  const pageTitle = "קארינה – הדפסה על חולצות וביגוד עבודה ממותג";
  const pageDesc =
    "הדפסה על חולצות וביגוד עבודה לעסקים וצוותים: DTF/רקמה/סובלימציה, ליווי אישי, אספקה מהירה ומשלוחים לכל הארץ. קבלו הדמיה לפני ייצור.";
  const ogImage = banner; // אפשר להחליף לתמונה ייעודית של OG אם קיימת

  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: canonical,
    inLanguage: "he-IL",
    potentialAction: {
      "@type": "SearchAction",
      target: `${origin}/catalog?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "קארינה הדפסות",
    url: canonical,
    logo: `${origin}/img/logo1.png`,
    sameAs: [
      "https://wa.me/972557212443",
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: "+972-55-721-2443",
        contactType: "customer service",
        areaServed: "IL",
        availableLanguage: ["he", "en"],
        email: "karina.offical.israel@gmail.com",
      },
    ],
  };

  const siteNavigationJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: [
      { "@type": "SiteNavigationElement", name: "קטלוג", url: `${origin}/catalog` },
      { "@type": "SiteNavigationElement", name: "שאלות ותשובות", url: `${origin}/faq` },
      { "@type": "SiteNavigationElement", name: "אודות", url: `${origin}/about` },
      { "@type": "SiteNavigationElement", name: "צור קשר", url: `${origin}/contact` },
    ],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: canonical },
    ],
  };

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
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < maxScroll - 4);
  };

  const scrollByStep = (dir = 1) => {
    const el = catsRef.current;
    if (!el) return;
    const step = Math.max(280, Math.min(520, el.clientWidth * 0.5));
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
      <Helmet prioritizeSeoTags>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index,follow,max-image-preview:large" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={siteName} />
        <meta property="og:locale" content="he_IL" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDesc} />
        <meta name="twitter:image" content={ogImage} />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(webSiteJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(organizationJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(siteNavigationJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      {/* ===== HERO ===== */}
      <section className="hero-wrap position-relative overflow-hidden">
        <picture>
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
              <div className="hero-logo mb-3">
                <img
                  src={logo}
                  alt="Karina Workwear Logo"
                  className="img-fluid"
                  style={{ maxHeight: "128px" }}
                  loading="eager"
                  decoding="async"
                />
              </div>

              <h1 className="fw-bolder text-white mb-3 lh-sm hero-title">
                מיתוג שמבליט את הצוות <br /> איכות שמחזיקה בכביסה
              </h1>

              <p className="text-white-75 mb-4 hero-subtitle">
                חולצות ומדי עבודה מודפסים באיכות מעולה (DTF/רקמה/סובלימציה), שירות מהיר לכל הארץ
                ותמיכה אישית משלב הסקיצה עד למסירה.
              </p>

              <div className="d-flex gap-2 justify-content-center">
                <NavLink to="/contact" className="btn btn-primary">דברו איתנו</NavLink>
                <NavLink to="/catalog" className="btn btn-primary">עיינו בקטלוג</NavLink>
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
<section className="container py-4">
  <div
    className="row row-cols-2 row-cols-md-3 g-3 g-md-4 text-center text-md-start"
    role="list"
  >
    {FEATURES.map((f) => (
      <div key={f.title} className="col d-flex" role="listitem">
        <div className="usp feature-card d-flex align-items-center justify-content-center justify-content-md-start gap-3 w-100">
          <span className="usp-icon d-inline-flex align-items-center justify-content-center" aria-hidden="true">
            <i className={`bi ${f.icon}`} />
          </span>
          <div className="text-wrap">
            <div className="fw-bold">{f.title}</div>
            <div className="text-muted small">{f.text}</div>
          </div>
        </div>
      </div>
    ))}
  </div>
</section>


      {/* ===== קרוסלת מוצרים פופולריים ===== */}
      <section className="py-6 bg-light">
        <div className="container">
          <header className="text-center mb-4">
            <h2 className="h3 fw-bold">המוצרים הפופולריים שלנו</h2>
            <p className="text-muted m-0">עיינו במבחר המוצרים המבוקשים ביותר</p>
          </header>

          <ProductCarousel products={bestSellers} />

          <div className="text-center mt-4">
            <NavLink to="/catalog" className="btn btn-primary">
              <i className="bi bi-grid-3x3-gap me-2"></i>
              צפו בכל הקטלוג
            </NavLink>
          </div>
        </div>
      </section>

      {/* ===== איך זה עובד ===== */}
      <section className="container py-6">
        <header className="text-center mb-4">
          <h2 className="h3 fw-bold">איך זה עובד? נרשמים לאתר ומקבלים שירות באופן</h2>
          <h3 className="text-muted">פשוט, מהיר ושקוף</h3>
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
      <section className="py-6 bg-pink-soft position-relative overflow-hidden">
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
                  <img src={render1} alt="סטודיו עבודה והדפסות בפעולה" loading="lazy" decoding="async" />
                </figure>
                <figure className="about-photo sub a">
                  <img src={render2} alt="דוגמת הדפס קרוב" loading="lazy" decoding="async" />
                </figure>
                <figure className="about-photo sub b">
                  <img src={render3} alt="אריזות ומשלוחים מוכנים" loading="lazy" decoding="async" />
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
      <section className="py-6 bg-pink-soft">
        <div className="container">
          <header className="text-center mb-4">
            <h2 className="h4 fw-bold">תהליך ההזמנה</h2>
            <p className="text-muted m-0">שקיפות בתהליך – צעד-צעד.</p>
          </header>

          <ol className="timeline">
            <li>
              <div className="dot" aria-hidden="true" />
              <h3 className="h6 m-0">קבלת לוגו וקבצים</h3>
              <p className="text-muted small m-0">בדיקת איכות/פורמט ועבודה גרפית במידת הצורך. (בחינם)</p>
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
              <p className="text-muted small m-0">אריזה נקייה ושליחה לכל הארץ.</p>
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
              <a
                href="https://wa.me/972557212443?text=שלום! אשמח להצעת מחיר או פרטים נוספים על הדפסות."
                className="btn btn-success d-flex align-items-center gap-2 px-4 py-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i className="bi bi-whatsapp fs-5" aria-hidden="true"></i>
                <span>צור קשר בוואטסאפ</span>
              </a>
              <NavLink to="/catalog" className="btn btn-outline-primary px-4 py-2">
                עיינו בקטלוג
              </NavLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
