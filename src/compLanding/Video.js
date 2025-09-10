// src/compLanding/Video.js
import React, { useRef, useEffect } from "react";
import videoSrc from "../img/vid/video1.mp4";

export default function Video({
  vertical = true,   // 👈 אם הווידאו אנכי (9:16)
  fit = "contain",   // "contain" = בלי חיתוך, "cover" = ממלא עם חיתוך קל בצדדים
  poster,            // אופציונלי
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      document.documentElement.classList.contains("a11y-reduced-motion") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const io = new IntersectionObserver(([entry]) => {
      if (!el) return;
      if (entry.isIntersecting) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.6 });

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <figure
      className={[
        "video-wrap",
        vertical ? "video-vertical" : "video-horizontal",
        fit === "cover" ? "fit-cover" : "fit-contain"
      ].join(" ")}
      aria-label="סרטון תדמית"
    >
      <video
        ref={ref}
        className="video-el"
        controls
        playsInline
        preload="metadata"
        poster={poster}
        aria-describedby="video-desc"
        controlsList="noremoteplayback"
      >
        <source src={videoSrc} type="video/mp4" />
        הדפדפן שלך לא תומך בוידאו HTML5.
      </video>

      <figcaption id="video-desc" className="visually-hidden">
        סרטון תדמית אנכי המציג את מוצרי ההדפסה על חולצות של "קארינה".
      </figcaption>
    </figure>
  );
}
