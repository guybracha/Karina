// src/compLanding/ThreeDCarousel.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";

export default function ThreeDCarousel({
  images = [],           // [{src, alt}]
  height = 240,          // גובה התמונה בפיקסלים
  autoRotateMs = 3000,   // זמן בין סיבובים אוטומטיים
  perspective = 900,     // עומק פרספקטיבה
  radius = 320,          // רדיוס הטבעת (אפשר לכוונן)
  ariaLabel = "קרוסלת תמונות תלת ממדית",
}) {
  const [index, setIndex] = useState(0);
  const step = useMemo(() => (images.length ? 360 / images.length : 0), [images.length]);
  const timerRef = useRef(null);

  // סיבוב אוטומטי (מכבד reduced-motion)
  useEffect(() => {
    const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (autoRotateMs && images.length > 1 && !prefersReduce) {
      timerRef.current = setInterval(() => setIndex(i => (i + 1) % images.length), autoRotateMs);
      return () => clearInterval(timerRef.current);
    }
  }, [autoRotateMs, images.length]);

  // ניווט
  const next = () => setIndex(i => (i + 1) % images.length);
  const prev = () => setIndex(i => (i - 1 + images.length) % images.length);

  // Drag/Swipe בסיסי
  const drag = useRef({ x: 0, active: false });
  const onPointerDown = (e) => { drag.current = { x: e.clientX ?? e.touches?.[0]?.clientX, active: true }; };
  const onPointerMove = (e) => {
    if (!drag.current.active) return;
    const x = e.clientX ?? e.touches?.[0]?.clientX;
    const dx = x - drag.current.x;
    if (Math.abs(dx) > 30) {
      dx < 0 ? next() : prev();
      drag.current = { x, active: true };
    }
  };
  const onPointerUp = () => { drag.current.active = false; };

  // זווית הסיבוב של כל הטבעת
  const ringRotate = index * step * -1;

  return (
    <div
      className="carousel3d"
      style={{ "--perspective": `${perspective}px`, "--radius": `${radius}px`, "--item-h": `${height}px` }}
      role="region"
      aria-label={ariaLabel}
    >
      <div
        className="carousel3d-ring"
        style={{ transform: `translateZ(calc(var(--radius) * -1)) rotateY(${ringRotate}deg)` }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={onPointerDown}
        onTouchMove={onPointerMove}
        onTouchEnd={onPointerUp}
      >
        {images.map((img, i) => (
          <figure
            key={i}
            className={`carousel3d-item ${i === index ? "is-front" : ""}`}
            style={{ transform: `rotateY(${i * step}deg) translateZ(var(--radius))` }}
          >
            <img src={img.src} alt={img.alt || ""} loading="lazy" />
            <figcaption className="visually-hidden">{img.alt}</figcaption>
          </figure>
        ))}
      </div>

      {/* פקדים */}
      <div className="carousel3d-controls" dir="rtl">
        <button className="c3d-btn prev" onClick={prev} aria-label="תמונה קודמת">‹</button>
        <button className="c3d-btn next" onClick={next} aria-label="תמונה הבאה">›</button>
      </div>

      {/* נקודות */}
      {images.length > 1 && (
        <div className="carousel3d-dots" role="tablist" aria-label="בחירת תמונה">
          {images.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === index}
              className={`dot ${i === index ? "active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
