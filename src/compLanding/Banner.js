import React from "react";
import bannerImg from "../img/banner2.png";

export default function Banner() {
  return (
    <section className="banner1-section">
      <div className="banner1-wrapper">
        <img
          src={bannerImg}
          alt="באנר פרסומי"
          className="banner1-img"
        />
      </div>
    </section>
  );
}
