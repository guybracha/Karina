// src/components/Navbar.jsx
import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from '../img/logo.png'

export default function Navbar() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  function onSearch(e) {
    e.preventDefault();
    const query = q.trim();
    if (query) navigate(`/catalog?query=${encodeURIComponent(query)}`);
  }

  // מחזיר className עם active ל-NavLink
  const linkClass = ({ isActive }) =>
    "nav-link" + (isActive ? " active fw-semibold" : "");

  return (
    <nav className="navbar navbar-expand-lg bg-body-tertiary border-bottom sticky-top" aria-label="Primary">
      <div className="container">
        {/* Brand */}
        <NavLink className="navbar-brand d-flex align-items-center gap-2" to="/" aria-label="דף הבית">
          <img src={logo} alt="Karina" width="28" height="28" />
        </NavLink>

        {/* Toggler */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="הצג תפריט"
        >
          <span className="navbar-toggler-icon" />
        </button>

        {/* Links + Search + Actions */}
        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item"><NavLink to="/catalog" className={linkClass}>ביגוד</NavLink></li>
            <li className="nav-item"><NavLink to="/faq" className={linkClass}>שו״ת</NavLink></li>
            <li className="nav-item"><NavLink to="/about" className={linkClass}>אודות</NavLink></li>
            <li className="nav-item"><NavLink to="/contact" className={linkClass}>צור קשר</NavLink></li>
          </ul>

          {/* חיפוש */}
          <form className="d-flex gap-2 my-2 my-lg-0" role="search" onSubmit={onSearch}>
            <label htmlFor="navSearch" className="visually-hidden">חיפוש</label>
            <input
              id="navSearch"
              className="form-control"
              type="search"
              placeholder="חיפוש פריטים…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn btn-outline-secondary" type="submit">חפש</button>
          </form>

          {/* פעולות */}
          <div className="d-flex gap-2 ms-lg-3 mt-2 mt-lg-0">
            <NavLink to="/cart" className="btn btn-outline-dark" aria-label="סל קניות">
              עגלה
            </NavLink>
            <NavLink to="/account/karina" className="btn btn-primary" aria-label="אזור אישי">
              אזור אישי
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}
