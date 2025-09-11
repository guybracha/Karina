// Navbar.jsx
import React, { useState } from "react";
import Karina from "../img/logo.png";

export default function Navbar({ onGoWork, onGoShield, onGoContact }) {
  const [open, setOpen] = useState(false);
  const toggle = () => setOpen(v => !v);
  const close  = () => setOpen(false);

  return (
    <header className="navbar-wrap" role="banner" dir="rtl">
      <nav className="navbar" aria-label="ראשי" dir="rtl">
        <a className="brand" href="#top" onClick={close} aria-label="לדף הבית">
          <img src={Karina} alt="קארינה" className="brand-logo" />
        </a>

        <button
          className="hamburger"
          aria-label="פתח תפריט"
          aria-expanded={open}
          aria-controls="primary-nav"
          onClick={toggle}
        >
          <span /><span /><span />
        </button>

        <ul id="primary-nav" className={`nav-links ${open ? "open" : ""}`} onClick={close}>
          <li><button className="nav-btn" onClick={onGoWork}>בגדי עבודה</button></li>
          <li><button className="nav-btn" onClick={onGoShield}>מוצרי בטיחות</button></li>
          <li><a href="#about"    className="nav-link">מי אנחנו</a></li>
          <li><a href="#products" className="nav-link">מוצרים</a></li>
          <li><button className="nav-btn" onClick={onGoContact}>צור קשר</button></li>
          
          <li><a href="tel:0545042443" className="cta-call">התקשרו עכשיו</a></li>
        </ul>
      </nav>
    </header>
  );
}
