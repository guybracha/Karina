// src/compLanding/Clients.js
import React from "react";
import ThreeDCarousel from "../compLanding/ThreeDCarousel";

import rec1 from "../img/rec/rec1.png";
import rec2 from "../img/rec/rec2.png";
import rec3 from "../img/rec/rec3.png";
import rec4 from "../img/rec/rec4.png";
import rec5 from "../img/rec/rec5.png";
import rec6 from "../img/rec/rec6.png";

export default function Clients() {
  const images = [
    { src: rec1, alt: "המלצה מלקוח 1" },
    { src: rec2, alt: "המלצה מלקוח 2" },
    { src: rec3, alt: "המלצה מלקוח 3" },
    { src: rec4, alt: "המלצה מלקוח 4" },
    { src: rec5, alt: "המלצה מלקוח 5" },
    { src: rec6, alt: "המלצה מלקוח 6" },
  ];

  return (
    <section className="container my-5">
      <h2 className="text-center mb-4">המלצות מלקוחות</h2>
      <div className="clients-3d-wrap">
        <ThreeDCarousel
          images={images}
          ariaLabel="קרוסלת המלצות מלקוחות"
          autoRotateMs={3500}
        />
      </div>
    </section>
  );
}
