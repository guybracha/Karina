// src/components/Navbar.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../webp/logo.webp";
import useDebounce from "../hooks/useDebounce";
import { searchProducts } from "../lib/searchService";
import { PRODUCTS } from "../lib/products";
import { getDiscountPct } from "../lib/pricing";

const LS_CART_KEY = "karina:cart";
const LS_PREVIEW_KEY = (slug, side) => `karina:preview:${slug}:${side}`;

// ===== LocalStorage helpers (עם נירמול) =====
function isValidItem(x) {
  return (
    x &&
    typeof x === "object" &&
    "id" in x &&
    "name" in x &&
    "qty" in x &&
    !Number.isNaN(Number(x.qty)) &&
    "price" in x &&
    !Number.isNaN(Number(x.price))
  );
}
function normalizeCartArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(isValidItem)
    .map((it) => ({
      ...it,
      qty: Math.max(1, Number(it.qty) || 1),
      price: Number(it.price) || 0,
    }));
}
function readCartFromLS() {
  try {
    const raw = localStorage.getItem(LS_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeCartArray(parsed);
  } catch {
    return [];
  }
}
function saveCartToLS(next) {
  try {
    const normalized = normalizeCartArray(next);
    localStorage.setItem(LS_CART_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event("karina:cartUpdated"));
  } catch {}
}

// ===== תמחור מדרגות לעגלה =====
const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;
function priceRow(it) {
  const p = PRODUCTS.find((x) => x.slug === it.slug);
  const baseUnit = Number(p?.price ?? it.price ?? 0);
  const qty = Math.max(1, Number(it.qty) || 1);
  const dPct = getDiscountPct(qty); // 0..0.5
  const unitAfter = round2(baseUnit * (1 - dPct));
  const lineTotal = round2(unitAfter * qty);
  const saved = round2(baseUnit * qty - lineTotal);
  return { baseUnit, qty, dPct, unitAfter, lineTotal, saved };
}

// ===== עזר להצגת תקציר מידות =====
function summarizeSizes(it, maxParts = 4) {
  const total = Number(it?.qty || 0);
  const st = it?.variants?.sizeTotals || null;
  if (!st) return `סה״כ ${total} יח׳`;
  const parts = Object.entries(st)
    .filter(([, q]) => Number(q) > 0)
    .map(([s, q]) => `${s}:${q}`)
    .slice(0, maxParts);
  const more =
    Object.entries(st).filter(([, q]) => Number(q) > 0).length - parts.length;
  return `סה״כ ${total} יח׳${parts.length ? " · " + parts.join(" · ") : ""}${
    more > 0 ? ` · ועוד ${more}` : ""
  }`;
}

export default function Navbar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [active, setActive] = useState(-1);
  const debounced = useDebounce(q, 200);

  // ▼ מצב עגלה
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const collapseRef = useRef(null);

  const cartBtnRef = useRef(null);
  const cartPanelRef = useRef(null);

  // שמירת מצב משתמש קודם לזיהוי התנתקות
  const prevUserRef = useRef(user);

  // Bootstrap collapse close
  function closeNav() {
    const el = collapseRef.current;
    const bs = window?.bootstrap;
    if (!el || !bs?.Collapse) return;
    bs.Collapse.getOrCreateInstance(el).hide();
  }

  // ----- עגלה: קריאה/שמירה מ־LS -----
  function removeFromCart(id) {
    const next = readCartFromLS().filter((it) => it.id !== id);
    saveCartToLS(next);
    setCart(next);
  }

  useEffect(() => {
    // בדיקה ראשונית: אם אין משתמש מחובר, נקה את העגלה
    if (!user) {
      try {
        localStorage.removeItem(LS_CART_KEY);
        setCart([]);
      } catch {}
      return;
    }

    // טעינה ראשונית יציבה (רק אם יש משתמש)
    setCart(readCartFromLS());

    // האזנה לשינויים מחלון אחר / טאבים אחרים
    function onStorage(e) {
      if (e.key === LS_CART_KEY) {
        // אם אין משתמש, אל תטען את העגלה
        if (!user) {
          localStorage.removeItem(LS_CART_KEY);
          setCart([]);
        } else {
          setCart(readCartFromLS());
        }
      }
    }
    window.addEventListener("storage", onStorage);

    // טריגר פנימי: window.dispatchEvent(new Event("karina:cartUpdated"))
    function onCustom() {
      if (!user) {
        localStorage.removeItem(LS_CART_KEY);
        setCart([]);
      } else {
        setCart(readCartFromLS());
      }
    }
    window.addEventListener("karina:cartUpdated", onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("karina:cartUpdated", onCustom);
    };
  }, [user]);

  // ניקוי עגלה כאשר משתמש מתנתק
  useEffect(() => {
    // אם היה משתמש מחובר ועכשיו אין - התנתקות
    if (prevUserRef.current && !user) {
      // איפוס העגלה
      try {
        localStorage.removeItem(LS_CART_KEY);
        setCart([]);
        window.dispatchEvent(new Event("karina:cartUpdated"));
      } catch (err) {
        console.error("Failed to clear cart on logout:", err);
      }
    }
    // עדכון מצב קודם
    prevUserRef.current = user;
  }, [user]);

  // סכימה — עם מדרגות הנחה
  const cartCount = useMemo(
    () => cart.reduce((sum, it) => sum + Number(it.qty || 0), 0),
    [cart]
  );

  const pricingRows = useMemo(
    () => cart.map((it) => ({ id: it.id, slug: it.slug, name: it.name, ...priceRow(it) })),
    [cart]
  );

  const cartTotal = useMemo(
    () => pricingRows.reduce((s, r) => s + r.lineTotal, 0),
    [pricingRows]
  );

  const cartSaved = useMemo(
    () => pricingRows.reduce((s, r) => s + r.saved, 0),
    [pricingRows]
  );

  // תצוגת תמונה לפריט (מתואם לעגלה: front → back → תמונת מוצר)
  function getThumbForItem(it) {
    try {
      const front = localStorage.getItem(LS_PREVIEW_KEY(it.slug || "", "front"));
      if (front) return front;
      const back = localStorage.getItem(LS_PREVIEW_KEY(it.slug || "", "back"));
      if (back) return back;
    } catch {}
    const p = PRODUCTS.find((x) => x.slug === it.slug);
    return p?.img || "";
  }

  // סגירה אוטומטית בכל שינוי מסלול
  useEffect(() => {
    setOpen(false);
    setCartOpen(false);
    closeNav();
  }, [location.pathname]);

  // חיפוש עם debounce
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const term = debounced.trim();
      if (!term) {
        setList([]);
        setOpen(false);
        setActive(-1);
        return;
      }
      const res = await searchProducts(term);
      if (!cancelled) {
        setList(res.slice(0, 8));
        setOpen(res.length > 0);
        setActive(-1);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  // סגירה בלחיצה מחוץ להצעות/עגלה
  useEffect(() => {
    function onDocClick(e) {
      // הצעות חיפוש
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
      // עגלה
      if (
        cartPanelRef.current &&
        !cartPanelRef.current.contains(e.target) &&
        cartBtnRef.current &&
        !cartBtnRef.current.contains(e.target)
      ) {
        setCartOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onSubmit(e) {
    e.preventDefault();
    const term = q.trim();
    if (term) navigate(`/catalog?query=${encodeURIComponent(term)}`);
    setOpen(false);
    closeNav();
  }

  function goTo(item) {
    if (item.type === "category") {
      navigate(`/catalog?cat=${encodeURIComponent(item.slug)}`);
    } else {
      navigate(`/product/${item.slug || item.id}`);
    }
    setOpen(false);
    closeNav();
  }

  function onKeyDown(e) {
    if (!open || list.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % list.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + list.length) % list.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      active >= 0 ? goTo(list[active]) : onSubmit(e);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const linkClass = ({ isActive }) =>
    "nav-link" + (isActive ? " active fw-semibold" : "");

  return (
    <nav
      className="navbar navbar-expand-lg bg-body-tertiary border-bottom sticky-top nav-blur"
      aria-label="Primary"
      dir="rtl"
    >
      <div className="container">
        {/* Brand + Toggler */}
        <NavLink
          className="navbar-brand d-flex align-items-center gap-2"
          to="/"
          aria-label="דף הבית"
          onClick={closeNav}
        >
          <img
            src={logo}
            alt="Karina"
            style={{
              height: "clamp(56px, 8vw, 96px)",
              width: "auto",
              display: "block",
            }}
          />
        </NavLink>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="פתח תפריט"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* ===== תפריט ===== */}
        <div
          id="mainNavbar"
          ref={collapseRef}
          className="
            collapse navbar-collapse
            d-lg-flex flex-column flex-lg-row align-items-lg-center w-100
            gap-3 gap-lg-0
            p-3 p-lg-0 mt-2 mt-lg-0
          "
        >
          {/* קישורים */}
          <ul className="navbar-nav gap-3 align-items-center me-lg-3 mb-3 mb-lg-0">
            <li className="nav-item">
              <NavLink to="/catalog" className={linkClass} onClick={closeNav}>
                ביגוד
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/faq" className={linkClass} onClick={closeNav}>
                שו״ת
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/about" className={linkClass} onClick={closeNav}>
                אודות
              </NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/contact" className={linkClass} onClick={closeNav}>
                צור קשר
              </NavLink>
            </li>
          </ul>

          {/* חיפוש */}
          <div className="flex-grow-1 mx-lg-3" style={{ minWidth: 320, maxWidth: 600 }}>
            <form className="d-flex align-items-center gap-2" role="search" onSubmit={onSubmit}>
              <label htmlFor="navSearch" className="visually-hidden">חיפוש</label>
              <div className="position-relative flex-grow-1">
                <i
                  className="bi bi-search position-absolute top-50 translate-middle-y"
                  style={{ left: 12, opacity: 0.6 }}
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  id="navSearch"
                  className="form-control ps-5"
                  type="search"
                  placeholder="חיפוש פריטים…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => list.length && setOpen(true)}
                  onKeyDown={onKeyDown}
                  role="combobox"
                  aria-expanded={open}
                  aria-controls="nav-suggestions"
                  aria-activedescendant={active >= 0 ? `nav-sugg-${active}` : undefined}
                />

                {open && list.length > 0 && (
                  <div
                    ref={panelRef}
                    id="nav-suggestions"
                    className="dropdown-menu show w-100 shadow"
                    role="listbox"
                    aria-label="הצעות חיפוש"
                    style={{
                      top: "calc(100% + 6px)",
                      insetInlineStart: 0,
                      insetInlineEnd: 0,
                      maxHeight: "60vh",
                      overflowY: "auto",
                      borderRadius: "0.5rem",
                      zIndex: 1050,
                    }}
                  >
                    {list.map((item, i) => (
                      <button
                        key={item.id || `${item.type}-${i}`}
                        id={`nav-sugg-${i}`}
                        role="option"
                        aria-selected={active === i}
                        className={`dropdown-item d-flex align-items-center gap-2 ${active === i ? "active" : ""}`}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goTo(item)}
                        title={item.title}
                        style={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}
                      >
                        {item.thumb && (
                          <img
                            src={item.thumb}
                            alt=""
                            width="28"
                            height="28"
                            style={{ objectFit: "cover", borderRadius: 6, flexShrink: 0 }}
                            loading="lazy"
                          />
                        )}
                        <span className="fw-semibold text-truncate">{item.title}</span>
                        {item.meta && (
                          <span className="ms-auto text-muted small text-truncate" style={{ maxWidth: 160 }}>
                            {item.meta}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn btn-outline-secondary" type="submit">חפש</button>
            </form>
          </div>

          {/* פעולות: עגלה + אזור אישי */}
          <div className="d-flex align-items-center gap-2 mt-3 mt-lg-0 position-relative">
            {/* כפתור עגלה */}
            <button
              ref={cartBtnRef}
              type="button"
              className="btn btn-outline-dark position-relative"
              onClick={() => setCartOpen((v) => !v)}
              aria-expanded={cartOpen}
              aria-haspopup="true"
              aria-controls="nav-cart-dropdown"
              title="תצוגת עגלה"
            >
              עגלה
              {cartCount > 0 && (
                <span
                  className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-danger"
                  style={{ fontSize: 11 }}
                >
                  {cartCount}
                </span>
              )}
            </button>

            {/* Dropdown עגלה */}
            {cartOpen && (
              <div
                ref={cartPanelRef}
                id="nav-cart-dropdown"
                className="dropdown-menu dropdown-menu-end show shadow"
                style={{
                  minWidth: 320,
                  maxWidth: 380,
                  top: "100%",
                  insetInlineEnd: 0,
                  marginTop: 8,
                  zIndex: 1060,
                }}
                aria-label="עגלת קניות"
              >
                {cart.length === 0 ? (
                  <div className="px-3 py-2 text-muted small">העגלה ריקה</div>
                ) : (
                  <>
                    <ul className="list-unstyled mb-2" style={{ maxHeight: "50vh", overflowY: "auto" }}>
                      {cart.slice(0, 6).map((it) => {
                        const row = priceRow(it);
                        return (
                          <li key={it.id} className="px-3 py-2 d-flex align-items-center gap-2">
                            <img
                              src={getThumbForItem(it)}
                              alt=""
                              width="48"
                              height="48"
                              style={{ objectFit: "contain", background: "#fff", border: "1px solid rgba(0,0,0,.08)", borderRadius: 8 }}
                            />
                            <div className="flex-grow-1">
                              <div className="small fw-semibold text-truncate">{it.name}</div>
                              <div className="small text-muted text-truncate">
                                {summarizeSizes(it)}
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2 text-nowrap">
                              <div className="small">
                                {Number(it.qty)}×{" "}
                                {row.dPct > 0 ? (
                                  <>
                                    <s>{row.baseUnit.toLocaleString("he-IL")} ₪</s>{" "}
                                    <strong>{row.unitAfter.toLocaleString("he-IL")} ₪</strong>
                                  </>
                                ) : (
                                  <>{row.baseUnit.toLocaleString("he-IL")} ₪</>
                                )}
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                title="הסר מהעגלה"
                                onClick={() => removeFromCart(it.id)}
                              >
                                ✕
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="dropdown-divider" />
                    <div className="px-3 py-2 d-flex justify-content-between align-items-center">
                      <strong>סה״כ (אחרי הנחות):</strong>
                      <span className="fw-bold">{cartTotal.toLocaleString("he-IL")} ₪</span>
                    </div>
                    {cartSaved > 0 && (
                      <div className="px-3 pb-1 d-flex justify-content-between align-items-center text-success small">
                        <span>חסכת עד כה:</span>
                        <strong>{cartSaved.toLocaleString("he-IL")} ₪</strong>
                      </div>
                    )}
                    <div className="px-3 pb-2 d-flex gap-2">
                      <NavLink
                        to="/cart"
                        className="btn btn-primary w-100"
                        onClick={() => {
                          setCartOpen(false);
                          closeNav();
                        }}
                      >
                        לצפייה בעגלה
                      </NavLink>
                    </div>
                  </>
                )}
              </div>
            )}

            <NavLink
              to={user ? "/account" : "/auth"}
              className="btn btn-primary"
              onClick={closeNav}
            >
              {user ? "אזור אישי" : "התחברות"}
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
