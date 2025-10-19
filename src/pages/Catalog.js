// src/pages/Catalog.jsx
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PRODUCTS } from "../lib/products";
import "../style/Catalog.css";

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

/* ---------- קומפוננטה ---------- */
export default function Catalog() {
  const [params, setParams] = useSearchParams();

  // state from URL
  const [query, setQuery]       = useState(params.get("query") || "");
  const [color, setColor]       = useState(params.get("color") || "");
  const [size, setSize]         = useState(params.get("size") || "");
  const [category, setCategory] = useState(params.get("category") || "");
  const [season, setSeason]     = useState(params.get("season") || "");
  const [sort, setSort]         = useState(params.get("sort") || "popular");
  const [page, setPage]         = useState(Number(params.get("page") || 1));

  // Mobile filters drawer
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const firstFocusableRef = useRef(null);
  const openDrawer  = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);

  // lock body scroll when drawer open + Esc to close
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

  // keep URL in sync
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

  // reset page when filters/sort change
  useEffect(() => { setPage(1); }, [query, color, size, category, season, sort]);

  /* ---------- helpers ---------- */
  function handleFilterChange(next, type) {
    if (type === "color") setColor(next);
    if (type === "size") setSize(next);
    if (type === "category") setCategory(next);
    if (type === "season") setSeason(next);
  }
  function clearFilter(type) {
    handleFilterChange("", type);
  }
  function clearAll() {
    setQuery(""); setColor(""); setSize(""); setCategory(""); setSeason(""); setSort("popular"); setPage(1);
  }

  /* ---------- UI ---------- */
  return (
    <div className="container py-4" dir="rtl">
      {/* Title + summary */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
        <h1 className="m-0">קטלוג מוצרים</h1>
        <div className="text-muted">
          נמצאו <strong>{sorted.length}</strong> פריטים {query ? <>ל-“{query}”</> : null}
        </div>
      </div>

      {/* ===== Filters ===== */}

      {/* Mobile top bar: search + open drawer */}
      <div className="card p-2 mb-3 catalog-toolbar mobile-only">
        <div className="row g-2 align-items-center">
          <div className="col-8">
            <div className="position-relative">
              <input
                className="form-control catalog-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש פריט…"
                aria-label="חיפוש"
              />
              <i className="bi bi-search catalog-search-icon" aria-hidden="true" />
            </div>
          </div>
          <div className="col-4 d-grid">
            <button className="btn btn-outline-primary" onClick={openDrawer} aria-haspopup="dialog" aria-controls="filtersDrawer">
              <i className="bi bi-funnel ms-1" aria-hidden="true" /> סנן
            </button>
          </div>
        </div>
      </div>

      {/* Desktop/Tablet full toolbar */}
      <div className="card p-3 mb-3 catalog-toolbar d-none d-md-block">
        <div className="row g-3 align-items-end">
          {/* חיפוש */}
          <div className="col-md-3">
            <label className="form-label">חיפוש</label>
            <div className="position-relative">
              <input
                className="form-control catalog-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="שם פריט / תיאור…"
              />
              <i className="bi bi-search catalog-search-icon" aria-hidden="true" />
            </div>
          </div>

          {/* קטגוריה */}
          <div className="col-md-2">
            <label className="form-label">סוג ביגוד</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => handleFilterChange(e.target.value, "category")}
            >
              <option value="">הכול</option>
              <option value="workwear">ביגוד עבודה</option>
              <option value="safety">מוצרי בטיחות</option>
            </select>
          </div>

          {/* עונה */}
          <div className="col-md-2">
            <label className="form-label">עונה</label>
            <select
              className="form-select"
              value={season}
              onChange={(e) => handleFilterChange(e.target.value, "season")}
            >
              <option value="">כל העונות</option>
              <option value="קיץ">קיץ</option>
              <option value="חורף">חורף</option>
              <option value="כל השנה">כל השנה</option>
            </select>
          </div>

          {/* צבע */}
          <div className="col-md-2">
            <label className="form-label">צבע</label>
            <select
              className="form-select"
              value={color}
              onChange={(e) => handleFilterChange(e.target.value, "color")}
            >
              <option value="">כל הצבעים</option>
              <option value="נייבי">נייבי</option>
              <option value="שחור">שחור</option>
              <option value="אפור">אפור</option>
            </select>
          </div>

          {/* מידה */}
          <div className="col-md-2">
            <label className="form-label">מידה</label>
            <select
              className="form-select"
              value={size}
              onChange={(e) => handleFilterChange(e.target.value, "size")}
            >
              <option value="">כל המידות</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
              <option value="One Size">One Size</option>
            </select>
          </div>

          {/* מיון */}
          <div className="col-md-1">
            <label className="form-label">מיון</label>
            <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="popular">פופולרי</option>
              <option value="price_asc">מחיר ↑</option>
              <option value="price_desc">מחיר ↓</option>
              <option value="new">חדש</option>
            </select>
          </div>
        </div>

        {/* Active filter pills */}
        <div className="d-flex flex-wrap gap-2 mt-3">
          {query && (
            <span className="badge rounded-pill bg-light text-dark border">
              חיפוש: “{query}”
              <button className="btn btn-sm btn-link text-danger ms-2 p-0" onClick={() => setQuery("")}>
                הסר
              </button>
            </span>
          )}
          {category && (
            <span className="badge rounded-pill bg-light text-dark border">
              {CATEGORY_LABELS[category] || category}
              <button className="btn btn-sm btn-link text-danger ms-2 p-0" onClick={() => clearFilter("category")}>
                הסר
              </button>
            </span>
          )}
          {season && (
            <span className="badge rounded-pill bg-light text-dark border">
              עונה: {season}
              <button className="btn btn-sm btn-link text-danger ms-2 p-0" onClick={() => clearFilter("season")}>
                הסר
              </button>
            </span>
          )}
          {color && (
            <span className="badge rounded-pill bg-light text-dark border">
              צבע: {color}
              <button className="btn btn-sm btn-link text-danger ms-2 p-0" onClick={() => clearFilter("color")}>
                הסר
              </button>
            </span>
          )}
          {size && (
            <span className="badge rounded-pill bg-light text-dark border">
              מידה: {size}
              <button className="btn btn-sm btn-link text-danger ms-2 p-0" onClick={() => clearFilter("size")}>
                הסר
              </button>
            </span>
          )}
          {(query || category || season || color || size) && (
            <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={clearAll}>
              נקה הכול
            </button>
          )}
        </div>
      </div>

      {/* Mobile filters drawer */}
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
              <div className="mb-3">
                <label className="form-label">חיפוש</label>
                <input
                  ref={firstFocusableRef}
                  className="form-control"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="שם פריט / תיאור…"
                />
              </div>
              <div className="row g-3">
                <div className="col-12">
                  <label className="form-label">סוג ביגוד</label>
                  <select className="form-select" value={category} onChange={(e) => handleFilterChange(e.target.value, "category")}>
                    <option value="">הכול</option>
                    <option value="workwear">ביגוד עבודה</option>
                    <option value="safety">מוצרי בטיחות</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">עונה</label>
                  <select className="form-select" value={season} onChange={(e) => handleFilterChange(e.target.value, "season")}>
                    <option value="">כל העונות</option>
                    <option value="קיץ">קיץ</option>
                    <option value="חורף">חורף</option>
                    <option value="כל השנה">כל השנה</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">צבע</label>
                  <select className="form-select" value={color} onChange={(e) => handleFilterChange(e.target.value, "color")}>
                    <option value="">כל הצבעים</option>
                    <option value="נייבי">נייבי</option>
                    <option value="שחור">שחור</option>
                    <option value="אפור">אפור</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">מידה</label>
                  <select className="form-select" value={size} onChange={(e) => handleFilterChange(e.target.value, "size")}>
                    <option value="">כל המידות</option>
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                    <option value="One Size">One Size</option>
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label">מיון</label>
                  <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                    <option value="popular">פופולרי</option>
                    <option value="price_asc">מחיר ↑</option>
                    <option value="price_desc">מחיר ↓</option>
                    <option value="new">חדש</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="filters-drawer__actions">
              <button className="btn btn-outline-secondary" onClick={() => { clearAll(); closeDrawer(); }}>
                נקה הכול
              </button>
              <button className="btn btn-primary" onClick={closeDrawer}>
                החיל סינון
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      {paged.length > 0 ? (
        <>
          <div className="row g-3 g-md-4 catalog-grid">
            {paged.map((p) => {
  // ✅ מציגים מלאי רק אם יש ערך stock אמיתי על המוצר
  const hasStock = Number.isFinite(p.stock);
  const stock = hasStock ? p.stock : null;
  const low = hasStock && stock <= 8;
  const barPct = hasStock ? Math.max(12, Math.min(100, Math.round((stock / 30) * 100))) : 0;

  return (
    <div className="col-6 col-md-4 col-lg-3" key={p.slug}>
      <div className="card product-card h-100">
        {p.sale && <span className="product-badge sale">-{p.sale}%</span>}
        {!p.sale && p.isNew && <span className="product-badge new">חדש</span>}
        <span className="price-pill">{formatCurrency(p.price)}</span>

        <div className="product-media">
          <img src={p.img} alt={p.name} loading="lazy" decoding="async" />
        </div>

        <div className="card-body">
          <h6 className="card-title mb-1">{p.name}</h6>
          <div className="meta-row">
            <span>קטגוריה: {CATEGORY_LABELS[p.category] || "כללי"}</span>
            <span>•</span>
            <span>עונה: {p.season}</span>
          </div>

          {/* יוצג רק אם יש נתון stock תקף */}
          {low && (
            <div className="low-stock">
              <div className="bar"><span style={{ width: `${barPct}%` }} /></div>
              <span className="text-muted small">נשארו רק {stock} במלאי</span>
            </div>
          )}

          <div className="d-grid mt-auto">
            <Link to={`/product/${p.slug}`} className="btn btn-primary">לפריט</Link>
          </div>
        </div>
      </div>
    </div>
  );
})}

          </div>

          {/* Pagination */}
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
          <p className="text-muted mb-3">נסו להסיר מסננים, להרחיב חיפוש או לבחור קטגוריה אחרת.</p>
          <button className="btn btn-outline-secondary" onClick={clearAll}>אפס מסננים</button>
        </div>
      )}
    </div>
  );
}
