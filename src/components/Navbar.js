import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../img/logo.png";
import useDebounce from "../hooks/useDebounce";
import { searchProducts } from "../lib/searchService";
import { Offcanvas } from "bootstrap";

export default function Navbar() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [active, setActive] = useState(-1);
  const debounced = useDebounce(q, 200);

  const navigate = useNavigate();
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // סגירת offcanvas דרך ה-API של Bootstrap
  function closeOffcanvas() {
    const el = document.getElementById("navOffcanvas");
    if (!el) return;
    const oc = Offcanvas.getInstance(el) || new Offcanvas(el);
    oc.hide();
  }

  // הצעות (עם debounce)
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

  // סגירת לוח הצעות בלחיצה מחוץ (דסקטופ)
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
  }

  function goTo(item) {
    if (item.type === "category") {
      navigate(`/catalog?cat=${encodeURIComponent(item.slug)}`);
    } else {
      navigate(`/product/${item.slug || item.id}`);
    }
    setOpen(false);
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
      <div className="container align-items-center">
        {/* Brand */}
        <NavLink
          className="navbar-brand d-flex align-items-center gap-2"
          to="/"
          aria-label="דף הבית"
        >
          <img src={logo} alt="Karina" width="28" height="28" />
        </NavLink>

        {/* Toggler → Offcanvas במובייל */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#navOffcanvas"
          aria-controls="navOffcanvas"
          aria-label="פתח תפריט"
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* דסקטופ */}
        <div className="collapse navbar-collapse d-none d-lg:flex" id="mainNavbar">
          <ul className="navbar-nav gap-3 align-items-center me-3 mb-2 mb-lg-0">
            <li className="nav-item">
              <NavLink to="/catalog" className={linkClass}>ביגוד</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/faq" className={linkClass}>שו״ת</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/about" className={linkClass}>אודות</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/contact" className={linkClass}>צור קשר</NavLink>
            </li>
          </ul>

          {/* חיפוש דסקטופ */}
          <div className="flex-grow-1 mx-lg-3" style={{ minWidth: 260, maxWidth: 520 }}>
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

                {/* הצעות דסקטופ */}
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

          {/* פעולות */}
          <div className="d-flex align-items-center gap-2">
            <NavLink to="/cart" className="btn btn-outline-dark">עגלה</NavLink>
            <NavLink to="/account" className="btn btn-primary">אזור אישי</NavLink>
          </div>
        </div>

        {/* Offcanvas – מובייל/טאבלט */}
        <div
          className="offcanvas offcanvas-end d-lg-none"
          tabIndex="-1"
          id="navOffcanvas"
          aria-labelledby="navOffcanvasLabel"
          dir="rtl"
        >
          <div className="offcanvas-header">
            <h5 className="offcanvas-title" id="navOffcanvasLabel">תפריט</h5>
            <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="סגור"></button>
          </div>

          <div className="offcanvas-body d-flex flex-column gap-3">
            {/* חיפוש מובייל */}
            <form
              className="d-flex align-items-center gap-2"
              role="search"
              onSubmit={(e) => {
                onSubmit(e);
                closeOffcanvas();
              }}
            >
              <label htmlFor="mobileSearch" className="visually-hidden">חיפוש</label>
              <div className="position-relative flex-grow-1">
                <i
                  className="bi bi-search position-absolute top-50 translate-middle-y"
                  style={{ left: 12, opacity: 0.6 }}
                  aria-hidden="true"
                />
                <input
                  id="mobileSearch"
                  className="form-control ps-5 py-2"
                  type="search"
                  placeholder="חיפוש פריטים…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => list.length && setOpen(true)}
                  onKeyDown={onKeyDown}
                />
                {open && list.length > 0 && (
                  <div
                    className="list-group mt-2 mobile-suggest"
                    role="listbox"
                    aria-label="הצעות חיפוש"
                    style={{ maxHeight: "40vh", overflowY: "auto", borderRadius: "0.5rem" }}
                  >
                    {list.map((item, i) => (
                      <button
                        key={item.id || `${item.type}-${i}`}
                        className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${active === i ? "active" : ""}`}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => {
                          goTo(item);
                          closeOffcanvas();
                        }}
                      >
                        {item.thumb && (
                          <img
                            src={item.thumb}
                            alt=""
                            width="28"
                            height="28"
                            style={{ objectFit: "cover", borderRadius: 6 }}
                            loading="lazy"
                          />
                        )}
                        <span className="fw-semibold text-truncate">{item.title}</span>
                        {item.meta && (
                          <span className="ms-auto text-muted small text-truncate" style={{ maxWidth: 140 }}>
                            {item.meta}
                          </span>
                        )}
                      </button>
                    ))}
                    <button
                      className="list-group-item list-group-item-action fw-semibold"
                      onClick={() => {
                        navigate(`/catalog?query=${encodeURIComponent(q)}`);
                        setOpen(false);
                        closeOffcanvas();
                      }}
                    >
                      הצג את כל התוצאות עבור “{q}”
                    </button>
                  </div>
                )}
              </div>
              <button className="btn btn-outline-secondary" type="submit">חפש</button>
            </form>

            {/* לינקים גדולים לטאץ' */}
            <ul className="list-unstyled m-0">
              {[
                { to: "/catalog", label: "ביגוד" },
                { to: "/faq", label: "שו״ת" },
                { to: "/about", label: "אודות" },
                { to: "/contact", label: "צור קשר" },
              ].map((l) => (
                <li key={l.to} className="mb-2">
                  <NavLink
                    to={l.to}
                    className="btn btn-light w-100 py-3 fs-6"
                    data-bs-dismiss="offcanvas"
                    onClick={closeOffcanvas}
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* CTA תחתון */}
            <div className="mt-auto d-grid gap-2">
              <NavLink
                to="/account"
                className="btn btn-primary btn-lg"
                data-bs-dismiss="offcanvas"
                onClick={closeOffcanvas}
              >
                אזור אישי
              </NavLink>
              <NavLink
                to="/cart"
                className="btn btn-outline-dark btn-lg"
                data-bs-dismiss="offcanvas"
                onClick={closeOffcanvas}
              >
                עגלה
              </NavLink>
              <a
                href="tel:0545042443"
                className="btn btn-outline-secondary btn-lg"
                data-bs-dismiss="offcanvas"
                onClick={closeOffcanvas}
              >
                📞 התקשרו עכשיו
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
