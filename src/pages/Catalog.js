// src/pages/Catalog.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { PRODUCTS } from "../lib/products";
import "../style/Catalog.css";
import summer from "../img/cards/summer.png";
import safety from "../img/cards/safety.png";

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

        {/* עץ קטלוגים מעוצב */}
        <div className="accordion accordion-flush shadow-lg rounded-4 overflow-hidden" id="catalogTree" style={{
          background: "white",
          border: "1px solid #eef2f7"
        }}>
          {Object.entries(tree).map(([main, seasons], i) => (
            <div className="accordion-item border-0" key={main} style={{
              borderBottom: i < Object.entries(tree).length - 1 ? "1px solid #f1f5f9" : "none"
            }}>
              <h2 className="accordion-header" id={`h-${i}`}>
                <button
                  className="accordion-button collapsed fw-bold fs-5 py-4"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target={`#c-${i}`}
                  style={{
                    background: "linear-gradient(to right, #f8fafc, #ffffff)",
                    color: "#0f172a",
                    borderRadius: i === 0 ? "1rem 1rem 0 0" : "0"
                  }}
                >
                  <span className="me-3" style={{ fontSize: "1.5rem" }}>
                    {getCategoryIcon(main)}
                  </span>
                  {main}
                  <span className="badge bg-light text-dark ms-3 rounded-pill px-3 py-2">
                    {Object.values(seasons).flat().length} מוצרים
                  </span>
                </button>
              </h2>

              <div
                id={`c-${i}`}
                className="accordion-collapse collapse"
                data-bs-parent="#catalogTree"
              >
                <div className="accordion-body p-4" style={{ background: "#fafbfc" }}>
                  {Object.entries(seasons).map(([season, items]) => (
                    <div key={season} className="mb-5">
                      {/* כותרת עונה מעוצבת */}
                      <div className="d-flex align-items-center mb-3 pb-2" style={{
                        borderBottom: "2px solid #e5e7eb"
                      }}>
                        <span className="me-2" style={{ fontSize: "1.3rem" }}>
                          {getSeasonIcon(season)}
                        </span>
                        <h5 className="mb-0 fw-bold" style={{ color: "#1e293b" }}>
                          {season}
                        </h5>
                        <span className="badge bg-primary rounded-pill ms-3 px-3">
                          {items.length}
                        </span>
                      </div>

                      {/* כרטיסי מוצרים */}
                      <div className="row g-3">
                        {items.map((p) => (
                          <div className="col-6 col-md-4 col-lg-3" key={p.slug}>
                            <Link
                              to={`/product/${p.slug}`}
                              className="product-card card border-0 h-100 text-decoration-none shadow-sm"
                              style={{
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                borderRadius: "1rem",
                                overflow: "hidden"
                              }}
                            >
                              <div className="position-relative" style={{
                                aspectRatio: "1/1",
                                background: "#f8fafc",
                                display: "grid",
                                placeItems: "center"
                              }}>
                                <img 
                                  src={p.img} 
                                  alt={p.name} 
                                  className="p-3"
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "contain"
                                  }}
                                />
                                {/* תג מבצע אם יש */}
                                {p.onSale && (
                                  <span className="product-badge sale position-absolute" style={{
                                    top: "10px",
                                    right: "10px"
                                  }}>
                                    מבצע
                                  </span>
                                )}
                              </div>
                              <div className="card-body p-3">
                                <h6 className="card-title mb-2 fw-bold" style={{
                                  fontSize: "0.9rem",
                                  color: "#0f172a",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden"
                                }}>
                                  {p.name}
                                </h6>
                                {p.basePrice && (
                                  <div className="d-flex align-items-center gap-2">
                                    <span className="fw-bold" style={{ 
                                      color: "#10b981",
                                      fontSize: "1rem"
                                    }}>
                                      ₪{p.basePrice}
                                    </span>
                                    <span className="text-muted small">
                                      מחיר התחלתי
                                    </span>
                                  </div>
                                )}
                              </div>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
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
