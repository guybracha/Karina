import React from "react";
import { NavLink } from "react-router-dom";
import "bootstrap-icons/font/bootstrap-icons.css";

export default function Footer() {
  return (
    <footer className="footer bg-dark text-light mt-auto pt-4">
      <div className="container py-2">
        {/* רספונסיבי: 1 עמודה במובייל, 2 ב־sm, 3 ב־md+ */}
        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4 align-items-start">

          {/* ניווט */}
          <div className="col text-center text-sm-start">
            <h6 className="fw-bold mb-3">ניווט</h6>
            <ul className="list-unstyled m-0">
              <li className="mb-2"><NavLink to="/" className="link-light text-decoration-none">דף הבית</NavLink></li>
              <li className="mb-2"><NavLink to="/catalog" className="link-light text-decoration-none">ביגוד</NavLink></li>
              <li className="mb-2"><NavLink to="/faq" className="link-light text-decoration-none">שו״ת</NavLink></li>
              <li className="mb-2"><NavLink to="/about" className="link-light text-decoration-none">אודות</NavLink></li>
              <li className="mb-2"><NavLink to="/contact" className="link-light text-decoration-none">צור קשר</NavLink></li>
              <li className="mb-0"><NavLink to="/legal" className="link-light text-decoration-none">תקנון האתר</NavLink></li>
            </ul>
          </div>

          {/* יצירת קשר */}
          <div className="col text-center text-sm-start">
            <h6 className="fw-bold mb-3">צור קשר</h6>
            <ul className="list-unstyled small m-0">
              <li className="mb-2">
                טלפון:{" "}
                <a href="tel:0557212443" className="link-light text-decoration-none" dir="ltr">
                  055-721-2443
                </a>
              </li>
              <li className="mb-2">
                אימייל:{" "}
                <a
                  href="mailto:karina.offical.israel@gmail.com"
                  className="link-light text-decoration-none text-break"
                  dir="ltr"
                >
                  karina.offical.israel@gmail.com
                </a>
              </li>
              <li className="mb-0">
                <span className="opacity-75">כתובת:</span>{" "}
                <address className="d-inline m-0">צבי הנחל 4, אזור תעשייה עמק חפר</address>
              </li>
            </ul>
          </div>

          {/* רשתות חברתיות */}
          <div className="col text-center text-sm-start">
            <h6 className="fw-bold mb-3">עקבו אחרינו</h6>
            <div className="d-flex justify-content-center justify-content-sm-start gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61557693732178"
                target="_blank" rel="noreferrer"
                aria-label="Facebook"
                className="btn btn-outline-light btn-sm rounded-circle d-inline-flex align-items-center justify-content-center footer-icon"
              >
                <i className="bi bi-facebook" aria-hidden="true"></i>
              </a>
              <a
                href="https://wa.me/972557212443"
                target="_blank" rel="noreferrer"
                aria-label="WhatsApp"
                className="btn btn-outline-light btn-sm rounded-circle d-inline-flex align-items-center justify-content-center footer-icon"
              >
                <i className="bi bi-whatsapp" aria-hidden="true"></i>
              </a>
              <a
                href="https://www.tiktok.com/@karina_printing"
                target="_blank" rel="noreferrer"
                aria-label="TikTok"
                className="btn btn-outline-light btn-sm rounded-circle d-inline-flex align-items-center justify-content-center footer-icon"
              >
                <i className="bi bi-tiktok" aria-hidden="true"></i>
              </a>
            </div>
          </div>
        </div>

        <hr className="border-secondary my-4" />

        {/* זכויות יוצרים */}
        <div className="text-center pb-3 small opacity-75">
          © {new Date().getFullYear()} כל הזכויות שמורות לקארינה תעשיות טקסטיל
        </div>
      </div>
    </footer>
  );
}
