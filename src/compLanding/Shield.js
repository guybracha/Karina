import React from "react";
import ThreeDCarousel from "../compLanding/ThreeDCarousel";
import helmet from "../webp/safety/helmet.webp";
import manager from "../webp/safety/manager.webp";
import yellowVest from "../webp/safety/yellowVest.webp";
import orangeVest from "../webp/safety/orangeVest.webp";

export default function Shield() {
  const images = [
    { src: helmet,      alt: "קסדת מיגון 1" },
    { src: manager,     alt: "אפוד מנהל 1" },
    { src: yellowVest,  alt: "אפוד זוהר 1" },
    { src: orangeVest,  alt: "אפוד כתום 1" }
  ];

  return (
    <div className="container my-5">
      <h1 className="text-center mb-4">מוצרי מיגון</h1>
      <div className="card-soft">    {/* מונע גלישה של האלמנטים התלת-ממדיים */}
        <ThreeDCarousel images={images} autoRotateMs={3000} />
      </div>
    </div>
  );
}
