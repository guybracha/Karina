// src/pages/Catalog.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS } from "../lib/products";
import "../style/Catalog.css";
import summer from "../webp/cards/summer.webp";
import safety from "../webp/cards/safety.webp";

/** ========= כרטיסיות פתיחה מהירה ========= **/
const QUICK_CARDS = [
  { slug: "workwear", link: "/workwear", title: "ביגוד עבודה", subtitle: "חולצות, קפוצ'ונים ומכנסיים", icon: "👕", img: summer },
  { slug: "safety", link: "/safety", title: "מוצרי בטיחות", subtitle: "וסטים זוהרים וקסדות", icon: "🦺", img: safety },
];

/* ---------- helpers לעונות ---------- */
const SEASON_ALIASES = {
  "קיץ": "קיץ",
  "חורף": "חורף",
  "כל השנה": "כל השנה",
  "גם וגם": "גם וגם",
  "אין": "אין",
  "summer": "קיץ",
  "winter": "חורף",
  "all": "כל השנה",
};

function normalizeSeasonOne(s) {
  if (!s) return "";
  const t = String(s).trim();
  return SEASON_ALIASES[t] || t;
}

function explodeSeasons(seasonRaw) {
  if (!seasonRaw) return [];
  const raw = String(seasonRaw).trim();
  if (!raw) return [];
  // מפרידים לפי / , וגם / &
  const parts = raw
    .split(/[\/,&]|וגם|and/gi)
    .map((p) => normalizeSeasonOne(p.trim()))
    .filter(Boolean);
  // אם לא התפצל – מחזירים אחד
  return parts.length ? Array.from(new Set(parts)) : [normalizeSeasonOne(raw)];
}

function buildCatalogTree(products) {
  const tree = {
    "ילדים": {},
    "בגדי עבודה": {},
    "בטיחות": {},
  };

  products.forEach((p) => {
    const main =
      p.isKids ? "ילדים" :
      (p.category === "safety" ? "בטיחות" : "בגדי עבודה");

    const seasons = explodeSeasons(p.season);
    const safeSeasons = seasons.length ? seasons : ["אין"];

    safeSeasons.forEach((s) => {
      if (!tree[main][s]) tree[main][s] = [];
      tree[main][s].push(p);
    });
  });

  return tree;
}

function QuickCard({ card, active, onClick }) {
  const hasBg = Boolean(card.img);
  const bgStyle = hasBg ? { backgroundImage: `url(${card.img})` } : undefined;

  return (
    <button
      type="button"
      onClick={() => onClick?.(card)}
      className={`quick-card ${active ? "active" : ""} ${hasBg ? "has-bg" : ""}`}
      style={bgStyle}
    >
      <div className="overlay" />
      <div className="content">
        <div className="emoji">{card.icon}</div>
        <h5 className="m-0">{card.title}</h5>
        {card.subtitle && <div className="subtitle">{card.subtitle}</div>}
      </div>
    </button>
  );
}

export default function Catalog() {
  const tree = useMemo(() => buildCatalogTree(PRODUCTS), []);

  const getCategoryIcon = (category) => {
    switch (category) {
      case "ילדים": return "👶";
      case "בגדי עבודה": return "👔";
      case "בטיחות": return "🦺";
      default: return "📦";
    }
  };

  const getSeasonIcon = (season) => {
    switch (season) {
      case "קיץ": return "☀️";
      case "חורף": return "❄️";
      case "כל השנה": return "🌤️";
      case "גם וגם": return "🌦️";
      default: return "📅";
    }
  };

  return (
    <div className="catalog-page-bg">
      <div className="container py-5" dir="rtl">
        {/* כותרת עם אנימציה */}
        <div className="text-center mb-5">
          <div className="mb-3" style={{ fontSize: "3.5rem" }}>🛍️</div>
          <h1 className="display-4 fw-bold mb-3" style={{ 
            background: "linear-gradient(135deg, #4f46e5, #10b981)", 
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}>
            קטלוג המוצרים שלנו
          </h1>
          <p className="lead text-muted">
            מגוון רחב של ביגוד עבודה, מוצרים לילדים ומוצרי בטיחות איכותיים
          </p>
        </div>

        {/* כרטיסיות פתיחה מהירה */}
        <div className="row g-4 mb-5">
          {QUICK_CARDS.map((card) => (
            <div className="col-12 col-md-6" key={card.slug}>
              <Link to={card.link} className="text-decoration-none">
                <div className="season-card season-card--with-bg" style={{
                  backgroundImage: card.img ? `url(${card.img})` : 'none',
                  aspectRatio: '3/1',
                  minHeight: '180px'
                }}>
                  <div className="season-card__overlay" />
                  <div className="season-card__body">
                    <div className="season-card__title">
                      <span className="season-card__icon">{card.icon}</span>
                      {card.title}
                    </div>
                    {card.subtitle && (
                      <div className="season-card__subtitle">{card.subtitle}</div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* הסבר על קטלוגים ייעודיים */}
        <div className="text-center mb-5 p-4 rounded-4 shadow-sm" style={{
          background: "linear-gradient(135deg, rgba(79,70,229,0.05), rgba(16,185,129,0.05))",
          border: "1px solid #e5e7eb"
        }}>
          <div className="mb-3" style={{ fontSize: "2rem" }}>📋</div>
          <h4 className="fw-bold mb-3">חפשו את המוצר המושלם</h4>
          <p className="text-muted mb-4">
            לחצו על אחת מהקטגוריות למעלה כדי לצפות בקטלוג המלא עם עץ מוצרים מפורט.<br />
            כל קטלוג מכיל חלוקה מסודרת לפי סוגים ועונות.
          </p>
          <div className="d-flex gap-3 justify-content-center flex-wrap">
            <Link to="/workwear" className="btn btn-primary btn-lg">
              👔 עבור לקטלוג ביגוד עבודה
            </Link>
            <Link to="/safety" className="btn btn-success btn-lg">
              🦺 עבור לקטלוג מוצרי בטיחות
            </Link>
          </div>
        </div>

        {/* פוטר הסבר */}
        <div className="text-center my-5 p-5 rounded-4 shadow-sm" style={{
          background: "linear-gradient(135deg, rgba(244,191,208,0.1), rgba(99,102,241,0.1))",
          border: "1px solid #e5e7eb"
        }}>
          <div className="mb-3" style={{ fontSize: "2.5rem" }}>✨</div>
          <h4 className="fw-bold mb-3">מצאתם מה שחיפשתם?</h4>
          <p className="text-muted mb-0">
            ניתן לדפדף בקטגוריות למעלה או להיכנס לקטלוגים הייעודיים.<br />
            לכל שאלה, אנחנו כאן בשבילכם!
          </p>
        </div>
      </div>
    </div>
  );
}
