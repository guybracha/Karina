// src/pages/Catalog.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PRODUCTS } from "../lib/products";
import "../style/Catalog.css";
import summer from "../img/cards/summer.png";
import winter from "../img/cards/winter.png";
import safety from "../img/cards/safety.png";

/* ---------- עזרות ---------- */
const CATEGORY_LABELS = {
  workwear: "ביגוד עבודה",
  safety: "מוצרי בטיחות",
};

function formatCurrency(n) {
  try { return `${Number(n).toLocaleString("he-IL")} ₪`; } catch { return `${n} ₪`; }
}
function clamp(v, min, max) {
  if (typeof v !== "number") return min;
  return Math.max(min, Math.min(max, v));
}
const PAGE_SIZE = 12;

/** ========= כרטיסיות פתיחה מהירה ========= **/
const QUICK_CARDS = [
  {
    kind: "season",
    key: "קיץ",
    title: "בגדי קיץ",
    subtitle: "חולצות כותנה דקות, וסטים מאווררים",
    icon: "🥵",
    img: summer, // שים בתיקיית public
  },
  {
    kind: "season",
    key: "חורף",
    title: "בגדי חורף",
    subtitle: "קפוצ’ונים, סופטשל וביגוד מחמם",
    icon: "❄️",
    img: winter,
  },
  {
    kind: "category",
    key: "safety",
    title: "בגדי בטיחות",
    subtitle: "וסטים זוהרים, ציוד עבודה בטיחותי",
    icon: "🦺",
    img: safety,
  },
];

function QuickCard({ card, active, onClick }) {
  const hasBg = Boolean(card.img);
  const bgStyle = hasBg ? { backgroundImage: `url(${card.img})` } : undefined;

  return (
    <button
      type="button"
      className={`season-card ${hasBg ? "season-card--with-bg season-card--portrait" : "season-card--plain"} ${active ? "is-active" : ""}`}
      onClick={onClick}
      aria-pressed={active}
      style={bgStyle}
    >
      {hasBg && <span className="season-card__overlay" aria-hidden="true" />}
      <div className="season-card__body">
        <div className="season-card__title">
          <span className="season-card__icon" aria-hidden="true">{card.icon}</span>
          {card.title}
        </div>
        <div className="season-card__subtitle">{card.subtitle}</div>
      </div>
    </button>
  );
}

/* ---------- קומפוננטה ---------- */
export default function Catalog() {
  const [params, setParams] = useSearchParams();

  // state from URL
  const [query, setQuery]       = useState(params.get("query") || "");
  const [color, setColor]       = useState(params.get("color") || "");
  const [size, setSize]         = useState(params.get("size") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [season, setSeason]     = useState(params.get("season") ?? "");
  const [sort, setSort]         = useState(params.get("sort") || "popular");
  const [page, setPage]         = useState(Number(params.get("page") || 1));

  // האם המשתמש בחר כרטיסייה (מפתח להצגת המוצרים)
  const hasPicked = Boolean(season || category);

  // עוגן לגלילה אחרי בחירה
  const productsAnchorRef = useRef(null);

  // Drawer (נשאר, לא בשימוש כרגע)
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const firstFocusableRef = useRef(null);
  const openDrawer  = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  // ניתוק גלילת גוף כשה-Drawer פתוח
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.classList.add("body-no-scroll");
      setTimeout(() => firstFocusableRef.current?.focus(), 0);
    } else {
      document.body.classList.remove("body-no-scroll");
    }
    const onKey = (e) => { if (e.key === "Escape") closeDrawer(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("body-no-scroll");
    };
  }, [isDrawerOpen]);

  // סנכרון כתובת
  useEffect(() => {
    const p = new URLSearchParams(params);
    const setOrDel = (k, v) => (v ? p.set(k, v) : p.delete(k));
    setOrDel("query", query);
    setOrDel("color", color);
    setOrDel("size", size);
    setOrDel("category", category);
    setOrDel("season", season);
    setOrDel("sort", sort);
    p.set("page", String(page));
    setParams(p, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, color, size, category, season, sort, page]);

  /* ---------- פילטור ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));
      const matchColor     = !color || (Array.isArray(p.colors) && p.colors.includes(color));
      const matchSize      = !size  || (Array.isArray(p.sizes)  && p.sizes.includes(size));
      const matchCategory  = !category || p.category === category;
      const matchSeason =
        !season ||
        p.season === season ||
        (["קיץ", "חורף"].includes(season) && p.season === "כל השנה");
      return matchQuery && matchColor && matchSize && matchCategory && matchSeason;
    });
  }, [query, color, size, category, season]);

  /* ---------- מיון ---------- */
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "price_asc":  arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0)); break;
      case "price_desc": arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); break;
      case "new":        arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)); break;
      case "popular":
      default:           arr.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    }
    return arr;
  }, [filtered, sort]);

  /* ---------- עימוד ---------- */
  const pageCount   = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = clamp(page, 1, pageCount);
  const paged = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );

  // reset page on major changes
  useEffect(() => { setPage(1); }, [query, color, size, category, season, sort]);

  function clearAll() {
    setQuery(""); setColor(""); setSize(""); setCategory(""); setSeason(""); setSort("popular"); setPage(1);
  }

  // בחירה מכרטיסייה + גלילה למוצרים
  function applyQuick(card) {
    setQuery(""); setColor(""); setSize(""); setSort("popular");
    if (card.kind === "season") { setSeason(card.key); setCategory(""); }
    else if (card.kind === "category") { setCategory(card.key); setSeason(""); }

    requestAnimationFrame(() => {
      productsAnchorRef.current?.scrollIntoView({
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function isCardActive(card) {
    if (card.kind === "season") return season === card.key;
    if (card.kind === "category") return category === card.key;
    return false;
  }

  /* ---------- UI ---------- */
  return (
    <div className="catalog-page-bg">
      <div className="container py-4" dir="rtl">
        {/* כותרת + סיכום */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
          <h1 className="m-0">קטלוג מוצרים</h1>
          <div className="text-muted">
            {hasPicked ? (
              <>נמצאו <strong>{sorted.length}</strong> פריטים {season ? <>— {season}</> : <>— {CATEGORY_LABELS[category] || category}</>}</>
            ) : (
              <>בחרו קטגוריה/עונה כדי לראות מוצרים</>
            )}
          </div>
        </div>

        {/* כרטיסיות פתיחה מהירה */}
        <section className="season-grid mb-3" aria-label="בחירה מהירה">
          {QUICK_CARDS.map((c) => (
            <QuickCard
              key={`${c.kind}:${c.key}`}
              card={c}
              active={isCardActive(c)}
              onClick={() => applyQuick(c)}
            />
          ))}
        </section>

        {/* בר מיון – מוצג רק לאחר בחירה */}
        {hasPicked && (
          <div className="card p-2 mb-3 season-toolbar">
            <div className="d-flex align-items-center gap-2">
              <div className="ms-auto d-flex align-items-center gap-2">
                {(season || category) && (
                  <span className="badge rounded-pill bg-light text-dark border">
                    {season ? `עונה: ${season}` : `קטגוריה: ${CATEGORY_LABELS[category] || category}`}
                    <button
                      className="btn btn-sm btn-link text-danger ms-2 p-0"
                      onClick={() => { setSeason(""); setCategory(""); }}
                    >
                      הסר
                    </button>
                  </span>
                )}
                {(query || color || size) && (
                  <button className="btn btn-sm btn-outline-secondary" onClick={clearAll}>
                    נקה הכול
                  </button>
                )}
                <label className="visually-hidden" htmlFor="sortSelect">מיון</label>
                <select
                  id="sortSelect"
                  className="form-select form-select-sm w-auto"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="popular">פופולרי</option>
                  <option value="price_asc">מחיר ↑</option>
                  <option value="price_desc">מחיר ↓</option>
                  <option value="new">חדש</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* עוגן לגלילה */}
        <div ref={productsAnchorRef} aria-hidden="true" />

        {/* גריד המוצרים – רק אחרי בחירה */}
        {hasPicked ? (
          paged.length > 0 ? (
            <>
              <div className="row g-3 g-md-4 catalog-grid" role="list" aria-label="רשימת מוצרים">
                {paged.map((p, idx) => {
                  const hasStock = Number.isFinite(p.stock);
                  const stock = hasStock ? p.stock : null;
                  const low = hasStock && stock <= 8;
                  const barPct = hasStock ? Math.max(12, Math.min(100, Math.round((stock / 30) * 100))) : 0;
                  const titleId = `product-title-${p.slug || idx}`;

                  return (
                    <div className="col-6 col-md-4 col-lg-3" role="listitem" key={p.slug}>
                      <div className="card product-card h-100 product-card--linkable" tabIndex={-1} aria-labelledby={titleId}>
                        {p.sale && <span className="product-badge sale">-{p.sale}%</span>}
                        {!p.sale && p.isNew && <span className="product-badge new">חדש</span>}
                        <span className="price-pill">{formatCurrency(p.price)}</span>

                        <div className="product-media">
                          <img src={p.img} alt={p.name} loading="lazy" decoding="async" />
                          <div className="media-overlay">
                            <Link to={`/product/${p.slug}`} className="btn btn-light btn-sm quick-view" aria-label={`צפייה מהירה ב${p.name}`}>
                              <i className="bi bi-eye" aria-hidden="true" /> צפייה מהירה
                            </Link>
                          </div>
                        </div>

                        <div className="card-body">
                          <h6 id={titleId} className="card-title mb-1">{p.name}</h6>

                          <div className="chips-row">
                            <span className="chip ghost">{CATEGORY_LABELS[p.category] || "כללי"}</span>
                            <span className="chip ghost">{p.season}</span>
                            {Array.isArray(p.colors) && p.colors.length > 0 && (
                              <span className="chip dot">
                                <span className="dot-swatch" data-color={p.colors[0]} title={p.colors[0]} />
                                {p.colors[0]}
                              </span>
                            )}
                          </div>

                          {low && (
                            <div className="low-stock">
                              <div className="bar"><span style={{ width: `${barPct}%` }} /></div>
                              <span className="text-muted small">נשארו רק {stock} במלאי</span>
                            </div>
                          )}

                          <div className="d-grid mt-auto">
                            <Link to={`/product/${p.slug}`} className="btn btn-primary" aria-label={`כניסה לפריט ${p.name}`}>
                              לפריט
                            </Link>
                          </div>

                          {/* הופך את כל הכרטיס ללחיץ */}
                          <Link to={`/product/${p.slug}`} className="stretched-link product-stretched-link" aria-label={`פתח את ${p.name}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {pageCount > 1 && (
                <nav className="mt-4" aria-label="דפדוף עמודים">
                  <ul className="pagination justify-content-center">
                    <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                      <button className="page-link" onClick={() => setPage(currentPage - 1)} aria-label="הקודם">‹</button>
                    </li>
                    {Array.from({ length: pageCount }).map((_, i) => (
                      <li key={i} className={`page-item ${currentPage === i + 1 ? "active" : ""}`}>
                        <button className="page-link" onClick={() => setPage(i + 1)}>{i + 1}</button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === pageCount ? "disabled" : ""}`}>
                      <button className="page-link" onClick={() => setPage(currentPage + 1)} aria-label="הבא">›</button>
                    </li>
                  </ul>
                </nav>
              )}
            </>
          ) : (
            <div className="text-center empty-state">
              <div className="mb-2" role="img" aria-label="לא נמצאו תוצאות">🔎</div>
              <h5 className="mb-2">לא נמצאו מוצרים מתאימים</h5>
              <p className="text-muted mb-3">נסו לבחור עונה/קטגוריה אחרת או לאפס מסננים.</p>
              <button className="btn btn-outline-secondary" onClick={clearAll}>אפס מסננים</button>
            </div>
          )
        ) : (
          // מצב טרום-בחירה – לא מציגים מוצרים כלל
          <div className="text-muted small mb-4">בחרו כרטיסיה כדי לראות מוצרים משויכים.</div>
        )}
      </div>

      {/* Drawer (למקרה עתידי) */}
      {isDrawerOpen && (
        <div
          id="filtersDrawer"
          className={`filters-drawer ${isDrawerOpen ? "is-open" : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="סינון מוצרים"
          onClick={(e) => { if (e.target === e.currentTarget) closeDrawer(); }}
        >
          <div className="filters-drawer__overlay" />
          <div className="filters-drawer__panel">
            <div className="filters-drawer__header">
              <h3 className="filters-drawer__title">מסננים</h3>
              <button className="btn btn-light btn-sm" onClick={closeDrawer}>סגור</button>
            </div>
            <div className="filters-drawer__body">
              <div className="text-muted small">אין מסננים כרגע. הבחירה נעשית מכרטיסיות הפתיחה.</div>
            </div>
            <div className="filters-drawer__actions">
              <button className="btn btn-outline-secondary" onClick={() => { clearAll(); closeDrawer(); }}>
                נקה הכול
              </button>
              <button className="btn btn-primary" onClick={closeDrawer}>סגור</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
