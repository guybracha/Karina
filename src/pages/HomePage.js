// src/pages/HomePage.jsx
import React from "react";
import { NavLink } from "react-router-dom";
import banner from "../img/safety.png";

export default function HomePage() {
  return (
    <main className="homepage" dir="rtl">
      {/* HERO */}
      <section className="hero-wrap position-relative overflow-hidden">
        <picture>
          {/* אפשר להוסיף מקור WebP אם יש */}
          <img
            src={banner}
            alt="צוות עובדים לובשים חולצות ממותגות"
            className="hero-bg"
            loading="eager"
            fetchpriority="high"
          />
        </picture>
        <div className="hero-overlay" />

        <div className="container position-relative">
          <div className="row justify-content-center">
            <div className="col-xl-9 text-center">
              <h1 className="display-5 fw-bolder text-white mb-3 lh-sm">
                חולצות ומדי עבודה ממותגים לעסקים וצוותים
              </h1>
              <p className="lead text-white-50 mb-4">
                מיתוג שמחזק את הנראות והמקצועיות: הדפסה איכותית, ליווי אישי,
                וזמני אספקה מהירים בכל הארץ.
              </p>

              <div className="d-flex gap-2 gap-md-3 justify-content-center flex-wrap">
                <NavLink to="/catalog" className="btn btn-light btn-lg px-4 shadow-soft">
                  עיינו בקטלוג
                </NavLink>
                <NavLink to="/contact" className="btn btn-outline-light btn-lg px-4">
                  קבלו הצעת מחיר
                </NavLink>
              </div>

              {/* Trust badges */}
              <ul className="list-inline mt-4 mb-0 text-white-75 small">
                <li className="list-inline-item me-3">
                  <i className="bi bi-shield-check me-1"></i> איכות הדפסה גבוהה
                </li>
                <li className="list-inline-item me-3">
                  <i className="bi bi-truck me-1"></i> משלוח לכל הארץ
                </li>
                <li className="list-inline-item">
                  <i className="bi bi-clock-history me-1"></i> ייצור מהיר
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* USP STRIP */}
      <section className="bg-body py-4 border-bottom">
        <div className="container">
          <div className="row g-4 text-center text-md-start">
            {[
              { icon: "bi-ink", title: "הדפסה מקצועית", text: "DTF / סובלימציה / משי / רקמה" },
              { icon: "bi-patch-check", title: "בקרת איכות", text: "בדיקה ויזואלית לכל הזמנה" },
              { icon: "bi-geo", title: "שירות ארצי", text: "איסוף/משלוח לכל נקודה" },
              { icon: "bi-chat-dots", title: "ליווי אישי", text: "מסקיצה ועד קבלה" },
            ].map((f, i) => (
              <div key={i} className="col-6 col-lg-3">
                <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-3">
                  <i className={`bi ${f.icon} fs-2 text-primary`} />
                  <div>
                    <div className="fw-bold">{f.title}</div>
                    <div className="text-muted small">{f.text}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="container py-6">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h2 className="fw-bold m-0">קטגוריות מובילות</h2>
          <NavLink to="/catalog" className="btn btn-outline-primary btn-sm">לכל הקטלוג</NavLink>
        </div>

        <div className="row g-3 g-md-4">
          {[
            { to: "/catalog?cat=tshirts", img: "/assets/cat/tshirt.jpg", title: "טי-שירטים" },
            { to: "/catalog?cat=polos", img: "/assets/cat/polo.jpg", title: "פולו לעבודה" },
            { to: "/catalog?cat=hoodies", img: "/assets/cat/hoodie.jpg", title: "קפוצ'ונים" },
            { to: "/catalog?cat=hi-vis", img: "/assets/cat/hi-vis.jpg", title: "ביגוד זוהר" },
            { to: "/catalog?cat=caps", img: "/assets/cat/cap.jpg", title: "כובעים" },
            { to: "/catalog?cat=aprons", img: "/assets/cat/apron.jpg", title: "סינרים" },
          ].map((c, i) => (
            <div key={i} className="col-6 col-md-4 col-lg-2">
              <NavLink to={c.to} className="card cat-card h-100 text-decoration-none hover-lift">
                <img src={c.img} alt={c.title} className="card-img-top object-cover" loading="lazy" />
                <div className="card-body py-3">
                  <h3 className="h6 m-0 text-dark">{c.title}</h3>
                </div>
              </NavLink>
            </div>
          ))}
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="bg-body-tertiary py-6">
        <div className="container">
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="fw-bold m-0">נמכרים ביותר</h2>
            <NavLink to="/catalog" className="btn btn-outline-primary btn-sm">לכל המוצרים</NavLink>
          </div>

          <div className="row g-3 g-md-4">
            {[
              { name: "טי-שירט כותנה 180gsm", price: "מ־ 29₪", img: "/assets/prod/shirt-basic.jpg", to: "/product/tee-180" },
              { name: "קפוצ'ון רוכסן פרימיום", price: "מ־ 119₪", img: "/assets/prod/hoodie-zip.jpg", to: "/product/hoodie-zip" },
              { name: "כובע מצחייה רקום", price: "מ־ 39₪", img: "/assets/prod/cap-embroidered.jpg", to: "/product/cap-embroidered" },
              { name: "פולו DryFit לעבודה", price: "מ־ 59₪", img: "/assets/prod/polo-dry.jpg", to: "/product/polo-dry" },
            ].map((p, i) => (
              <div key={i} className="col-6 col-md-3">
                <div className="card h-100 shadow-hover hover-lift">
                  <img src={p.img} className="card-img-top object-contain p-3" alt={p.name} loading="lazy" />
                  <div className="card-body d-flex flex-column">
                    <h3 className="h6">{p.name}</h3>
                    <div className="text-primary fw-bold mb-3">{p.price}</div>
                    <NavLink to={p.to} className="btn btn-primary mt-auto">לפרטים והזמנה</NavLink>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container py-6">
        <h2 className="fw-bold mb-4 text-center">איך זה עובד?</h2>
        <div className="row g-3 g-md-4">
          {[
            { icon: "bi-collection", title: "בחירת פריט", text: "בחרו את סוג הבגד והכמות הרצויה." },
            { icon: "bi-upload", title: "העלאת לוגו", text: "שלחו לוגו/עיצוב—נכין סקיצה לאישור." },
            { icon: "bi-printer", title: "ייצור ומשלוח", text: "מדפיסים, אורזים ושולחים מהר ובאיכות." },
          ].map((s, i) => (
            <div key={i} className="col-md-4">
              <div className="card h-100 text-start shadow-soft">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <span className="step-index me-2">{i + 1}</span>
                    <i className={`bi ${s.icon} fs-3 me-2 text-primary`}></i>
                    <h3 className="h5 m-0">{s.title}</h3>
                  </div>
                  <p className="mb-0 text-muted">{s.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CLIENT LOGOS */}
      <section className="py-5 border-top border-bottom bg-body">
        <div className="container">
          <div className="brand-row d-flex align-items-center justify-content-center flex-wrap gap-4 opacity-75">
            {["brand1.svg", "brand2.svg", "brand3.svg", "brand4.svg", "brand5.svg"].map((lg, i) => (
              <img key={i} src={`/assets/logos/${lg}`} alt="לוגו לקוח" height="32" loading="lazy" />
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-light py-6">
        <div className="container">
          <h2 className="fw-bold mb-4 text-center">מה הלקוחות אומרים</h2>
          <div className="row g-3 g-md-4">
            {[
              { quote: "שירות מדהים ומהיר! החולצות הגיעו איכותיות והצוות נראה מעולה.", name: "נועה, חברת סטארטאפ" },
              { quote: "הדפסה חדה וברורה. קיבלנו בדיוק את מה שהובטח—ואפילו יותר.", name: "יוסי, מסעדה משפחתית" },
              { quote: "מחיר הוגן וזמני אספקה קצרים. מומלץ בחום.", name: "מיכל, עמותה" },
            ].map((t, i) => (
              <div key={i} className="col-md-4">
                <figure className="card h-100 shadow-soft p-4 text-start">
                  <blockquote className="blockquote mb-3">
                    <p className="mb-0">“{t.quote}”</p>
                  </blockquote>
                  <figcaption className="blockquote-footer mb-0">{t.name}</figcaption>
                </figure>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-6 text-start">
        <h2 className="fw-bold mb-4 text-center">שאלות נפוצות</h2>
        <div className="accordion" id="faq">
          {[
            { q: "איזה סוגי הדפסה אתם מציעים?", a: "DTF, סובלימציה, משי ורקמה—נמליץ על השיטה המתאימה לחומר ולכמות." },
            { q: "תוך כמה זמן מתקבלת הזמנה?", a: "ברוב המקרים 3–7 ימי עסקים, בהתאם לכמות ולמורכבות העיצוב." },
            { q: "האם אפשר להזמין דוגמה?", a: "כן. ניתן להזמין דוגמת הדפסה לפני ייצור מלא (בתוספת תשלום)." },
          ].map((item, idx) => {
            const id = `faq-${idx}`;
            return (
              <div key={id} className="accordion-item">
                <h3 className="accordion-header" id={`${id}-h`}>
                  <button
                    className="accordion-button collapsed"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#${id}-c`}
                    aria-expanded="false"
                    aria-controls={`${id}-c`}
                  >
                    {item.q}
                  </button>
                </h3>
                <div
                  id={`${id}-c`}
                  className="accordion-collapse collapse"
                  aria-labelledby={`${id}-h`}
                  data-bs-parent="#faq"
                >
                  <div className="accordion-body">{item.a}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-primary text-light py-6 mt-4">
        <div className="container">
          <div className="row align-items-center g-4">
            <div className="col-lg-8 text-lg-start text-center">
              <h2 className="fw-bold mb-2">מוכנים להלביש את הצוות?</h2>
              <p className="mb-0">שלחו לוגו וקבלו הצעת מחיר ממוקדת תוך זמן קצר—ללא התחייבות.</p>
            </div>
            <div className="col-lg-4 d-flex gap-3 justify-content-lg-end justify-content-center">
              <NavLink to="/contact" className="btn btn-light btn-lg px-4">צרו קשר</NavLink>
              <NavLink to="/catalog" className="btn btn-outline-light btn-lg px-4">קטלוג</NavLink>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
