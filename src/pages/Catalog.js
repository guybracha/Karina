// src/pages/Catalog.jsx
import React from "react";
import { Link } from "react-router-dom";
import "../style/Catalog.css";
import summer from "../img/cards/summer.png";
import safety from "../img/cards/safety.png";

/** ========= כרטיסיות פתיחה מהירה ========= **/
const QUICK_CARDS = [
  { slug: "workwear", link: "/workwear", title: "ביגוד עבודה", subtitle: "חולצות, קפוצ'ונים ומכנסיים", icon: "👕", img: summer },
  { slug: "safety", link: "/safety", title: "מוצרי בטיחות", subtitle: "וסטים זוהרים וקסדות", icon: "🦺", img: safety },
];

function QuickCard({ card, active, onClick }) {
  const hasBg = Boolean(card.img);
  const bgStyle = hasBg ? { backgroundImage: `url(${card.img})` } : undefined;

  return (
    <Link
      to={card.link}
      className={`season-card ${hasBg ? "season-card--with-bg season-card--portrait" : "season-card--plain"} ${active ? "is-active" : ""}`}
      aria-pressed={active}
      style={{ ...bgStyle, textDecoration: 'none' }}
    >
      {hasBg && <span className="season-card__overlay" aria-hidden="true" />}
      <div className="season-card__body">
        <div className="season-card__title">
          <span className="season-card__icon" aria-hidden="true">{card.icon}</span>
          {card.title}
        </div>
        <div className="season-card__subtitle">{card.subtitle}</div>
      </div>
    </Link>
  );
}


/* ---------- קומפוננטה ---------- */
export default function Catalog() {
  /* ---------- UI ---------- */
  return (
    <div className="catalog-page-bg">
      <div className="container py-4" dir="rtl">
        {/* כותרת */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
          <h1 className="m-0">קטלוג מוצרים</h1>
          <div className="text-muted">
            בחרו קטגוריה מהכרטיסיות למטה
          </div>
        </div>

        {/* כרטיסיות פתיחה מהירה */}
        <section className="season-grid mb-3" aria-label="בחירה מהירה">
          {QUICK_CARDS.map((c) => (
            <QuickCard
              key={c.slug}
              card={c}
              active={false}
            />
          ))}
        </section>

        {/* הסבר */}
        <div className="text-center my-5">
          <div className="mb-3" style={{ fontSize: '3rem' }}>🛍️</div>
          <h3>ברוכים הבאים לקטלוג שלנו</h3>
          <p className="text-muted">
            אנו מציעים מגוון רחב של ביגוד עבודה ומוצרי בטיחות איכותיים.<br />
            בחרו קטגוריה מהכרטיסיות למעלה כדי להתחיל לעיין במוצרים.
          </p>
        </div>
      </div>
    </div>
  );
}
