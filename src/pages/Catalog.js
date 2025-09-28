// src/pages/Catalog.jsx
import React, { useMemo, useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PRODUCTS } from "../lib/products";

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

export default function Catalog() {
  const [params, setParams] = useSearchParams();

  // --- state from URL ---
  const [query, setQuery]       = useState(params.get("query") || "");
  const [color, setColor]       = useState(params.get("color") || "");
  const [size, setSize]         = useState(params.get("size") || "");
  const [category, setCategory] = useState(params.get("category") || ""); // workwear | safety
  const [season, setSeason]     = useState(params.get("season") || "");   // קיץ | חורף | כל השנה
  const [sort, setSort]         = useState(params.get("sort") || "popular"); // popular | price_asc | price_desc | new
  const [page, setPage]         = useState(Number(params.get("page") || 1));

  // keep URL in sync when state changes
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

  // ---- פילטור מוצרים ----
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

  // ---- מיון ----
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sort) {
      case "price_asc":
        arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case "price_desc":
        arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case "new":
        arr.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        break;
      case "popular":
      default:
        arr.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
    }
    return arr;
  }, [filtered, sort]);

  // ---- Pagination ----
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = clamp(page, 1, pageCount);
  const paged = useMemo(
    () => sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sorted, currentPage]
  );

  // reset page when filters/sort change
  useEffect(() => { setPage(1); }, [query, color, size, category, season, sort]);

  // ---- helpers ----
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

  // ---- UI ----
  return (
    <div className="container py-4" dir="rtl">
      {/* Title + summary */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
        <h1 className="m-0">קטלוג מוצרים</h1>
        <div className="text-muted">
          נמצאו <strong>{sorted.length}</strong> פריטים {query ? <>ל-“{query}”</> : null}
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-3 shadow-soft mb-3">
        <div className="row g-3 align-items-end">
          {/* חיפוש */}
          <div className="col-md-3">
            <label className="form-label">חיפוש</label>
            <div className="position-relative">
              <input
                className="form-control"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="שם פריט / תיאור…"
              />
              <i className="bi bi-search position-absolute" style={{left: 12, bottom: 12, opacity:.6}} />
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
              {/* הוסף לפי הצורך */}
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

      {/* מוצרים */}
      {paged.length > 0 ? (
        <>
          <div className="row g-3 g-md-4">
            {paged.map((p) => {
              const rating = clamp(p.rating ?? 4.5, 0, 5);
              const reviews = p.reviews ?? Math.floor(40 + Math.random() * 160);
              const stock = p.stock ?? Math.floor(6 + Math.random() * 30);
              const low = stock <= 8;
              const barPct = Math.max(12, Math.min(100, Math.round((stock / 30) * 100)));

              return (
                <div className="col-6 col-md-4 col-lg-3" key={p.slug}>
                  <div className="card product-card h-100 shadow-hover hover-lift">
                    {p.sale && <span className="product-badge sale">-{p.sale}%</span>}
                    {!p.sale && p.isNew && <span className="product-badge new">חדש</span>}

                    <img
                      src={p.img}
                      className="card-img-top object-cover"
                      alt={p.name}
                      style={{ height: 200 }}
                      loading="lazy"
                    />

                    <div className="card-body d-flex flex-column">
                      <h6 className="card-title mb-1">{p.name}</h6>

                      <div className="d-flex align-items-center gap-2 mb-2 text-muted small flex-wrap">
                        <span>קטגוריה: {CATEGORY_LABELS[p.category] || "כללי"}</span>
                        <span>•</span>
                        <span>עונה: {p.season}</span>
                      </div>


                      <div className="text-primary fw-bold my-2">{formatCurrency(p.price)}</div>

                      {low && (
                        <div className="low-stock">
                          <div className="bar"><span style={{ width: `${barPct}%` }} /></div>
                          <span>נשארו רק {stock} במלאי</span>
                        </div>
                      )}

                      <div className="d-grid mt-auto">
                        <Link to={`/product/${p.slug}`} className="btn btn-primary">
                          לפריט
                        </Link>
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
                  <button className="page-link" onClick={() => setPage(currentPage - 1)} aria-label="הקודם">
                    ‹
                  </button>
                </li>
                {Array.from({ length: pageCount }).map((_, i) => (
                  <li key={i} className={`page-item ${currentPage === i + 1 ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setPage(i + 1)}>{i + 1}</button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === pageCount ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage(currentPage + 1)} aria-label="הבא">
                    ›
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      ) : (
        // Empty state
        <div className="text-center bg-white rounded-xl p-5 shadow-soft">
          <div className="mb-2" role="img" aria-label="לא נמצאו תוצאות">🔎</div>
          <h5 className="mb-2">לא נמצאו מוצרים מתאימים</h5>
          <p className="text-muted mb-3">נסו להסיר מסננים, להרחיב חיפוש או לבחור קטגוריה אחרת.</p>
          <button className="btn btn-outline-secondary" onClick={clearAll}>אפס מסננים</button>
        </div>
      )}
    </div>
  );
}
