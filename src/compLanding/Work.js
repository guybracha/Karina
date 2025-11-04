import React, { useMemo, useState } from "react";
import ThreeDCarousel from "../compLanding/ThreeDCarousel";
import hoodie from "../img/work/hoodie1.png";
import kenguru from "../img/work/kenguru.png";
import hoodiePocket from "../img/work/hoodiePocket.png";
import polo from "../img/work/polo.png";
import coat from "../img/work/coat1.png";

export default function Work() {
  // הוספת תגית עונה לכל מוצר
  const images = [
    { src: hoodie,       alt: "קפוצ'ון ",            season: "winter" },
    { src: kenguru,      alt: "קפוצ'ון קנגורו",       season: "winter" },
    { src: hoodiePocket, alt: "קפוצ'ון עם כיס",       season: "winter" },
    { src: polo,         alt: "פולו",                 season: "summer" },
    { src: coat,         alt: "מעיל",                 season: "winter" },
  ];

  const [activeSeason, setActiveSeason] = useState("summer");

  const summerImages = useMemo(
    () => images.filter(i => i.season === "summer" || i.season === "all"),
    [images]
  );
  const winterImages = useMemo(
    () => images.filter(i => i.season === "winter" || i.season === "all"),
    [images]
  );

  const current = activeSeason === "summer" ? summerImages : winterImages;

  return (
    <div className="container my-5">
      <h1 className="text-center mb-4">בגדי עבודה</h1>

      {/* טאבים של Bootstrap */}
      <ul className="nav nav-pills justify-content-center mb-4" role="tablist" aria-label="קטגוריות עונות">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeSeason === "summer" ? "active" : ""}`}
            onClick={() => setActiveSeason("summer")}
            type="button"
            role="tab"
            aria-selected={activeSeason === "summer"}
          >
            קיץ
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeSeason === "winter" ? "active" : ""}`}
            onClick={() => setActiveSeason("winter")}
            type="button"
            role="tab"
            aria-selected={activeSeason === "winter"}
          >
            חורף
          </button>
        </li>
      </ul>

      {/* הקרוסלה – מקבל רק את הפריטים של העונה הנבחרת */}
      <div className="card-soft">
        <ThreeDCarousel images={current} autoRotateMs={3000} />
      </div>
    </div>
  );
}
