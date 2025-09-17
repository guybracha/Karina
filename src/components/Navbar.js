// src/components/Navbar.jsx
import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import logo from "../img/logo.png";
import useDebounce from "../hooks/useDebounce";
import { searchProducts } from "../lib/searchService";

export default function Navbar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [active, setActive] = useState(-1);
  const debounced = useDebounce(q, 200);

  const navigate = useNavigate();
  const location = useLocation();

  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const collapseRef = useRef(null);

  // סגירת הקולאפס (Bootstrap bundle נטען ב-HTML)
  function closeNav() {
    const el = collapseRef.current;
    const bs = window?.bootstrap;
    if (!el || !bs?.Collapse) return;
    bs.Collapse.getOrCreateInstance(el).hide();
  }

  // סגירה אוטומטית בכל שינוי מסלול
  useEffect(() => {
    setOpen(false);
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

  // סגירה בלחיצה מחוץ להצעות
  useEffect(() => {
    function onDocClick(e) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
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

        {/* ===== תפריט רספונסיבי =====
            מובייל: עמודה (collapse)
            דסקטופ: שורה ישרה (d-lg-flex) */}
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
          {/* קישורים (ימין בדסקטופ) */}
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

          {/* חיפוש (אמצע בדסקטופ) */}
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

          {/* פעולות (שמאל בדסקטופ) */}
          <div className="d-flex align-items-center gap-2 mt-3 mt-lg-0">
            <NavLink to="/cart" className="btn btn-outline-dark" onClick={closeNav}>
              עגלה
            </NavLink>
            <NavLink to="/account" className="btn btn-primary" onClick={closeNav}>
              אזור אישי
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
