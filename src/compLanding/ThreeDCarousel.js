// src/compLanding/ThreeDCarousel.jsx
import React, { useMemo, useRef, useState, useEffect } from "react";

export default function ThreeDCarousel({
  images = [],                 // [{src, alt}]
  height = 240,                // גובה התמונה בפיקסלים
  perspective = 900,           // עומק פרספקטיבה
  radius = 320,                // רדיוס הטבעת
  ariaLabel = "קרוסלת תמונות תלת ממדית",
  autoSpin = true,             // סיבוב אוטומטי רציף
  speedDegPerSec = 8,          // מהירות (איטי = 6–12 ד״/ש׳)
  pauseOnHover = true,         // עצירה במעבר עכבר
}) {
  const step = useMemo(() => (images.length ? 360 / images.length : 0), [images.length]);

  // זווית רציפה של כל הטבעת (במעלות). שומר/ת בטווח [0..360) כדי למנוע גלישה.
  const [angle, setAngle] = useState(0);

  // חישוב האינדקס הקדמי מתוך הזווית (לתיחום/נקודות)
  const frontIndex = useMemo(() => {
    if (!images.length || step === 0) return 0;
    const a = ((angle % 360) + 360) % 360;     // נרמול חיובי
    // הפריט שנמצא “בפנים” הוא זה שמבטל את הזווית הנוכחית
    const idx = Math.round((-a) / step);
    const mod = ((idx % images.length) + images.length) % images.length;
    return mod;
  }, [angle, images.length, step]);

  // RAF – סיבוב רציף, מכבד reduced-motion
  const rafRef = useRef(null);
  const lastTsRef = useRef(null);
  const hoverRef = useRef(false);

  useEffect(() => {
    const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!autoSpin || prefersReduce || images.length < 2) return;

    const loop = (ts) => {
      if (hoverRef.current && pauseOnHover) {
        lastTsRef.current = ts;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000; // שניות
      lastTsRef.current = ts;

      // עדכון זווית לפי מהירות (ד״/ש׳) * זמן
      setAngle((prev) => {
        const next = prev + speedDegPerSec * dt;
        // שמירה בטווח 0..360
        return next >= 360 ? next - 360 : next;
      });
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [autoSpin, speedDegPerSec, pauseOnHover, images.length]);

  // שליטה ידנית – קפיצה זוויתית עדינה ונקייה בלי “קפיצת התחלה”
  const gotoIndex = (i) => setAngle((prev) => {
    const target = (-i * step) % 360;
    // בוחרים את הקרוב ביותר לכיוון הנוכחי
    let diff = target - (prev % 360);
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return prev + diff;
  });
  const next = () => gotoIndex((frontIndex + 1) % images.length);
  const prev = () => gotoIndex((frontIndex - 1 + images.length) % images.length);

  // Drag/Swipe בסיסי (מעביר לפריט הבא/הקודם)
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

  return (
    <div
      className="carousel3d"
      style={{ "--perspective": `${perspective}px`, "--radius": `${radius}px`, "--item-h": `${height}px` }}
      role="region"
      aria-label={ariaLabel}
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
      onTouchStart={() => (hoverRef.current = false)}
    >
      <div
        className="carousel3d-ring"
        style={{ transform: `translateZ(calc(var(--radius) * -1)) rotateY(${angle}deg)` }}
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
            className={`carousel3d-item ${i === frontIndex ? "is-front" : ""}`}
            style={{ transform: `rotateY(${i * step}deg) translateZ(var(--radius))` }}
          >
            <img src={img.src} alt={img.alt || ""} loading="lazy" />
            <figcaption className="visually-hidden">{img.alt}</figcaption>
          </figure>
        ))}
      </div>

      {/* פקדים */}
      {images.length > 1 && (
        <>
          <div className="carousel3d-controls" dir="rtl">
            <button className="c3d-btn prev" onClick={prev} aria-label="תמונה קודמת">‹</button>
            <button className="c3d-btn next" onClick={next} aria-label="תמונה הבאה">›</button>
          </div>

          {/* נקודות */}
          <div className="carousel3d-dots" role="tablist" aria-label="בחירת תמונה">
            {images.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === frontIndex}
                className={`dot ${i === frontIndex ? "active" : ""}`}
                onClick={() => gotoIndex(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
