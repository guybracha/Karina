// src/components/Navbar.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import logo from "../img/logo.png";
import useDebounce from "../hooks/useDebounce";
import { searchProducts } from "../lib/searchService";
import { PRODUCTS } from "../lib/products";

const LS_CART_KEY = "karina:cart";
const LS_PREVIEW_KEY = (slug) => `karina:preview:${slug}`;

export default function Navbar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [active, setActive] = useState(-1);
  const debounced = useDebounce(q, 200);

  // ▼ מצב עגלה
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const collapseRef = useRef(null);

  const cartBtnRef = useRef(null);
  const cartPanelRef = useRef(null);

  // Bootstrap collapse close
  function closeNav() {
    const el = collapseRef.current;
    const bs = window?.bootstrap;
    if (!el || !bs?.Collapse) return;
    bs.Collapse.getOrCreateInstance(el).hide();
  }

  // ----- עגלה: קריאה/שמירה מ־LS -----
  function readCartFromLS() {
    try {
      const raw = localStorage.getItem(LS_CART_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  function saveCartToLS(next) {
    try {
      localStorage.setItem(LS_CART_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("karina:cartUpdated"));
    } catch {}
  }
  function removeFromCart(id) {
    const next = readCartFromLS().filter((it) => it.id !== id);
    saveCartToLS(next);
    setCart(next);
  }

  useEffect(() => {
    setCart(readCartFromLS());

    // האזנה לשינויים מחלון אחר
    function onStorage(e) {
      if (e.key === LS_CART_KEY) setCart(readCartFromLS());
    }
    window.addEventListener("storage", onStorage);

    // טריגר פנימי: window.dispatchEvent(new Event("karina:cartUpdated"))
    function onCustom() {
      setCart(readCartFromLS());
    }
    window.addEventListener("karina:cartUpdated", onCustom);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("karina:cartUpdated", onCustom);
    };
  }, []);

  // סכימה
  const cartCount = useMemo(
    () => cart.reduce((sum, it) => sum + Number(it.qty || 0), 0),
    [cart]
  );
  const cartTotal = useMemo(
    () => cart.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0), 0),
    [cart]
  );

  // תצוגת תמונה לפריט
  function getThumbForItem(it) {
    try {
      const preview = localStorage.getItem(LS_PREVIEW_KEY(it.slug || ""));
      if (preview) return preview;
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
    return () => { cancelled = true; };
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
          <img src={logo} alt="Karina" width="28" height="28" />
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
                    <div className="dropdown-divider" />
                    <button
                      className="dropdown-item fw-semibold"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        navigate(`/catalog?query=${encodeURIComponent(q)}`);
                        setOpen(false);
                        closeNav();
                      }}
                    >
                      הצג את כל התוצאות עבור “{q}”
                    </button>
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
                      {cart.slice(0, 6).map((it) => (
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
                              {it.color} • {it.size}
                            </div>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <div className="small text-nowrap">{it.qty}× {it.price} ₪</div>
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
                      ))}
                    </ul>
                    <div className="dropdown-divider" />
                    <div className="px-3 py-2 d-flex justify-content-between align-items-center">
                      <strong>סה״כ:</strong>
                      <span className="fw-bold">{cartTotal} ₪</span>
                    </div>
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

            <NavLink to="/account" className="btn btn-primary" onClick={closeNav}>
              אזור אישי
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
