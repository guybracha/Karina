import React from "react";
import ThreeDCarousel from "../compLanding/ThreeDCarousel";
import helmet from "../img/safety/helmet.png";
import manager from "../img/safety/manager.png";
import yellowVest from "../img/safety/yellowVest.png";
import orangeVest from "../img/safety/orangeVest.png";

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
