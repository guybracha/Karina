// src/pages/WorkwearCatalog.js
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PRODUCTS } from "../lib/products";
import "../style/Catalog.css";
import summer from "../img/cards/summer.png";
import winter from "../img/cards/winter.png";

/* ---------- עזרות ---------- */
function formatCurrency(n) {
  try { return `${Number(n).toLocaleString("he-IL")} ₪`; } catch { return `${n} ₪`; }
}
function clamp(v, min, max) {
  if (typeof v !== "number") return min;
  return Math.max(min, Math.min(max, v));
}
const PAGE_SIZE = 12;

/* נרמול עונות */
const SEASON_NORMALIZE_ONE = (raw) => {
  if (!raw) return "";
  const s = String(raw).trim().toLowerCase()
    .replace(/[\u200f\u200e]/g, "")
    .replace(/\s+/g, "");
  if (["קיץ","summer"].includes(s))   return "קיץ";
  if (["חורף","winter"].includes(s)) return "חורף";
  if (["כלהשנה","allyear","all-year","yearround","year-round"].includes(s)) return "כל השנה";
  if (["אין","none","-"].includes(s)) return "אין";
  return raw;
};

/** מפצל ערך עונה מרובה */
function explodeSeasons(raw) {
  if (raw == null) return [];
  return String(raw)
    .split(/[,/|]+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .map(SEASON_NORMALIZE_ONE);
}

/** האם מוצר מתאים לעונה שנבחרה */
function seasonMatches(productSeasonRaw, chosenSeasonRaw) {
  const chosen = SEASON_NORMALIZE_ONE(chosenSeasonRaw);
  if (!chosen) return true;
  const productSeasons = explodeSeasons(productSeasonRaw);
  if (productSeasons.includes(chosen)) return true;
  if (["קיץ","חורף"].includes(chosen) && productSeasons.includes("כל השנה")) return true;
  return false;
}

/** כרטיסיות עונות */
const SEASON_CARDS = [
  { slug: "summer", key: "קיץ",   title: "בגדי קיץ",   subtitle: "חולצות דקות ודרייפיט", icon: "🥵", img: summer },
  { slug: "winter", key: "חורף",  title: "בגדי חורף",  subtitle: "קפוצ׳ונים וסופטשל",    icon: "❄️", img: winter },
];

function SeasonCard({ card, active, onClick }) {
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
export default function WorkwearCatalog() {
  const [params, setParams] = useSearchParams();
  
  const [query, setQuery]       = useState(params.get("query") || "");
  const [color, setColor]       = useState(params.get("color") || "");
  const [size, setSize]         = useState(params.get("size") || "");
  const [season, setSeason]     = useState(params.get("season") ?? "");
  const [sort, setSort]         = useState(params.get("sort") || "popular");
  const [page, setPage]         = useState(Number(params.get("page") || 1));

  const productsAnchorRef = useRef(null);

  // כבה :hover בזמן גלילה
  useEffect(() => {
    const root = document.documentElement;
    let rafId = 0;
    let clearId;
    const onScroll = () => {
      root.classList.add("is-scrolling");
      if (rafId) cancelAnimationFrame(rafId);
      if (clearId) clearTimeout(clearId);
      rafId = requestAnimationFrame(() => {
        clearId = setTimeout(() => {
          root.classList.remove("is-scrolling");
          rafId = 0;
        }, 140);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.classList.remove("is-scrolling");
      if (rafId) cancelAnimationFrame(rafId);
      if (clearId) clearTimeout(clearId);
    };
  }, []);

  // סנכרון כתובת
  useEffect(() => {
    const next = new URLSearchParams();
    if (query) next.set("query", query);
    if (color) next.set("color", color);
    if (size) next.set("size", size);
    if (season) next.set("season", season);
    if (sort && sort !== "popular") next.set("sort", sort);
    if (Number(page) > 1) next.set("page", String(page));

    const current = params.toString();
    const serialized = next.toString();
    if (serialized !== current) {
      setParams(next, { replace: true });
    }
  }, [query, color, size, season, sort, page, params, setParams]);

  /* ---------- פילטור - רק workwear ---------- */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      // רק מוצרי workwear
      if (p.category !== "workwear") return false;
      // להסתיר מוצרי ילדים מתוך בגדי עבודה
      if (p.isKids) return false;

      const matchQuery =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));

      const matchColor     = !color || (Array.isArray(p.colors) && p.colors.includes(color));
      const matchSize      = !size  || (Array.isArray(p.sizes)  && p.sizes.includes(size));
      const matchSeason    = seasonMatches(p.season, season);

      return matchQuery && matchColor && matchSize && matchSeason;
    });
  }, [query, color, size, season]);

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

  useEffect(() => { setPage(1); }, [query, color, size, season, sort]);

  function clearAll() {
    setQuery(""); setColor(""); setSize(""); setSeason(""); setSort("popular"); setPage(1);
  }

  function applySeason(card) {
    setQuery(""); setColor(""); setSize(""); setSort("popular");
    setSeason(card.key);
    requestAnimationFrame(() => {
      productsAnchorRef.current?.scrollIntoView({
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  /* ---------- UI ---------- */
  return (
    <div className="catalog-page-bg">
      <div className="container py-4" dir="rtl">
        {/* כותרת */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
          <h1 className="m-0">ביגוד עבודה</h1>
          <div className="text-muted">
            נמצאו <strong>{sorted.length}</strong> פריטים {season && <>— {season}</>}
          </div>
        </div>

        {/* כרטיסיות עונות */}
        <section className="season-grid mb-3" aria-label="בחירה לפי עונה">
          {SEASON_CARDS.map((c) => (
            <SeasonCard
              key={c.key}
              card={c}
              active={season === c.key}
              onClick={() => applySeason(c)}
            />
          ))}
        </section>

        {/* בר מיון */}
        <div className="card p-2 mb-3 season-toolbar">
          <div className="d-flex align-items-center gap-2">
            <div className="ms-auto d-flex align-items-center gap-2">
              {season && (
                <span className="badge rounded-pill bg-light text-dark border">
                  עונה: {season}
                  <button
                    className="btn btn-sm btn-link text-danger ms-2 p-0"
                    onClick={() => setSeason("")}
                  >
                    איפוס
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

        {/* עוגן לגלילה */}
        <div ref={productsAnchorRef} aria-hidden="true" />

        {/* גריד מוצרים */}
        {paged.length > 0 ? (
          <>
            <div className="row g-3 g-md-4 catalog-grid" role="list" aria-label="רשימת מוצרים">
              {paged.map((p, idx) => {
                const hasStock = Number.isFinite(p.stock);
                const stock = hasStock ? p.stock : null;
                const low = hasStock && stock <= 8;
                const barPct = hasStock ? Math.max(12, Math.min(100, Math.round((stock / 30) * 100))) : 0;
                const titleId = `product-title-${p.slug || idx}`;

                const basePrice = p.price ?? 0;
                const salePct   = Number.isFinite(p.sale) ? p.sale : 0;
                const finalPrice = Math.round(basePrice * (1 - salePct / 100));

                return (
                  <div className="col-6 col-md-4 col-lg-3" role="listitem" key={p.slug || idx}>
                    <div className="card product-card h-100 product-card--linkable" tabIndex={-1} aria-labelledby={titleId}>
                      {p.sale && <span className="product-badge sale">-{p.sale}%</span>}
                      {!p.sale && p.isNew && <span className="product-badge new">חדש</span>}
                      {!p.logoAllowed && <span className="product-badge no-logo" title="מוצר זה אינו מאפשר הדפסת לוגו">ללא הדפסה</span>}

                      <span className="price-pill">{formatCurrency(finalPrice)}</span>

                      <div className="product-media">
                        <img
                          src={p.img}
                          alt={p.name}
                          loading="lazy"
                          decoding="async"
                          className="img-front"
                        />
                        <div className="media-overlay">
                          <Link
                            to={`/product/${p.slug}`}
                            className="btn btn-light btn-sm quick-view"
                            aria-label={`צפייה מהירה ב${p.name}`}
                          >
                            <i className="bi bi-eye" aria-hidden="true" /> צפייה מהירה
                          </Link>
                        </div>
                      </div>

                      <div className="card-body d-flex flex-column">
                        <h6 id={titleId} className="card-title mb-1">{p.name}</h6>

                        {salePct > 0 ? (
                          <div className="price-section mb-2">
                            <span className="text-muted text-decoration-line-through me-2">
                              {formatCurrency(basePrice)}
                            </span>
                            <span className="fw-bold text-danger">
                              {formatCurrency(finalPrice)}
                            </span>
                          </div>
                        ) : (
                          <div className="price-section mb-2">
                            <span className="fw-bold">{formatCurrency(basePrice)}</span>
                          </div>
                        )}

                        <div className="chips-row mb-1">
                          <span className="chip ghost">{String(p.season)}</span>
                          {p.type && <span className="chip ghost">{p.type}</span>}
                          {Array.isArray(p.colors) && p.colors.length > 0 && (
                            <span className="chip dot">
                              <span className="dot-swatch" data-color={p.colors[0]} title={p.colors[0]} />
                              {p.colors[0]}
                            </span>
                          )}
                          {Array.isArray(p.sizes) && p.sizes.length > 0 && (
                            <span className="chip ghost">מידות: {p.sizes.join(" / ")}</span>
                          )}
                          {p.logoAllowed && <span className="chip success" title="מוצר מאפשר הדפסה">אפשר הדפסה</span>}
                        </div>

                        {low && (
                          <div className="low-stock mt-1">
                            <div className="bar"><span style={{ width: `${barPct}%` }} /></div>
                            <span className="text-muted small">נשארו רק {stock} במלאי</span>
                          </div>
                        )}

                        <div className="d-grid mt-auto">
                          <Link to={`/product/${p.slug}`} className="btn btn-primary" aria-label={`כניסה לפריט ${p.name}`}>
                            לפריט
                          </Link>
                        </div>

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
            <p className="text-muted mb-3">נסו לבחור עונה אחרת או לאפס מסננים.</p>
            <button className="btn btn-outline-secondary" onClick={clearAll}>אפס מסננים</button>
          </div>
        )}
      </div>
    </div>
  );
}
