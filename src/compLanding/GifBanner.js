// src/compLanding/GifBanner.jsx
import React, { useEffect, useRef, useState } from "react";

export default function GifBanner({
  gifSrc,
  alt = "מבצע מיוחד בקארינה",
  ctaHref,
  ctaTarget = "_self",
  storageKey = "karina_gif_banner_dismissed",
  suppressDays = 7,
  autoHideMs = 0,
  dir = "rtl",
  showEveryLoad = true,          // מציג תמיד בכל טעינה
  navbarHeight = 64,             // <<< חדש: גובה ה-Navbar לפדינג בטוח
}) {
  const [open, setOpen] = useState(false);
  const bannerRef = useRef(null);
  const [orientation, setOrientation] = useState("portrait"); // 'portrait' | 'landscape'

  useEffect(() => {
    if (showEveryLoad) {
      setOpen(true);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const { dismissedAt } = JSON.parse(raw);
        const diffDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
        if (diffDays < suppressDays) return;
      }
    } catch {}
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    setOpen(!reduce);
  }, [storageKey, suppressDays, showEveryLoad]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") handleClose(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !autoHideMs) return;
    const t = setTimeout(() => handleClose(), autoHideMs);
    return () => clearTimeout(t);
  }, [open, autoHideMs]);

  const handleClose = () => {
    setOpen(false);
    if (showEveryLoad) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ dismissedAt: Date.now() }));
    } catch {}
  };

  if (!open) return null;

  const onImgLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setOrientation(h >= w ? "portrait" : "landscape");
    bannerRef.current?.classList.add("loaded");
  };

  const img = (
    <img
      src={gifSrc}
      alt={alt}
      className="gif-banner-img"
      loading="eager"
      onLoad={onImgLoad}
    />
  );

  return (
    <div
      ref={bannerRef}
      className="gif-banner-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      dir={dir}
      style={{ "--navbar-h": `${navbarHeight}px` }}
      onClick={handleClose}
    >
      <div
        className={`gif-banner-card ${orientation === "portrait" ? "is-portrait" : "is-landscape"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="gif-banner-close" aria-label="סגור" onClick={handleClose}>×</button>
        {ctaHref ? (
          <a href={ctaHref} target={ctaTarget} rel="noopener noreferrer" className="gif-banner-link">
            {img}
          </a>
        ) : img}
      </div>
    </div>
  );
}
