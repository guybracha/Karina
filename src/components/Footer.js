// src/components/Footer.jsx
import React from "react";
import { NavLink } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-dark text-light mt-auto pt-4">
      <div className="container">
        <div className="row g-4">
          {/* עמודי ניווט */}
          <div className="col-6 col-md-3">
            <h6 className="fw-bold mb-3">ניווט</h6>
            <ul className="list-unstyled">
              <li><NavLink to="/" className="link-light text-decoration-none">דף הבית</NavLink></li>
              <li><NavLink to="/catalog" className="link-light text-decoration-none">ביגוד</NavLink></li>
              <li><NavLink to="/faq" className="link-light text-decoration-none">שו״ת</NavLink></li>
              <li><NavLink to="/about" className="link-light text-decoration-none">אודות</NavLink></li>
              <li><NavLink to="/contact" className="link-light text-decoration-none">צור קשר</NavLink></li>
            </ul>
          </div>

          {/* פרטי יצירת קשר */}
          <div className="col-6 col-md-3">
            <h6 className="fw-bold mb-3">צור קשר</h6>
            <ul className="list-unstyled small">
              <li>טלפון: <a href="tel:0545042443" className="link-light">0545042443</a></li>
              <li>אימייל: <a href="mailto:info@karina.co.il" className="link-light">info@karina.co.il</a></li>
              <li>כתובת: צבי הנחל 4, אזור תעשייה עמק חפר</li>
            </ul>
          </div>

          {/* רשתות חברתיות */}
          <div className="col-12 col-md-3">
            <h6 className="fw-bold mb-3">עקבו אחרינו</h6>
            <div className="d-flex gap-3">
              <a href="https://www.facebook.com/profile.php?id=61557693732178" target="_blank" rel="noreferrer" className="link-light fs-4">
                <i className="bi bi-facebook"></i>
              </a>
              <a href="https://wa.me/972500000000" target="_blank" rel="noreferrer" className="link-light fs-4">
                <i className="bi bi-whatsapp"></i>
              </a>
            </div>
          </div>
        </div>

        <hr className="border-secondary my-4" />

        {/* זכויות יוצרים */}
        <div className="text-center pb-3 small">
          © {new Date().getFullYear()} כל הזכויות שמורות לקארינה תעשיות טקסטיל
        </div>
      </div>
    </footer>
  );
}
