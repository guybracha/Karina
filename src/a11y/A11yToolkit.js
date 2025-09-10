// src/a11y/A11yToolkit.jsx
import React, { useEffect, useRef, useState } from "react";

const toggleHtmlClass = (cls, on) => {
  const el = document.documentElement;
  if (!el) return;
  el.classList.toggle(cls, on);
};

// מפתחות ל-localStorage
const LS = {
  HC: "a11y:highContrast",
  RM: "a11y:reducedMotion",
  BT: "a11y:bigText",
  VIS: "a11y:toolkit:visible",
};

export default function A11yToolkit({ mainId = "main" }) {
  const liveRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    useEffect(() => {
        const onToggle = () => setIsOpen(v => !v);
        window.addEventListener("a11y:toggle-all", onToggle);
        return () => window.removeEventListener("a11y:toggle-all", onToggle);
    }, []);
    // אפשר גם לסגור ב-ESC
    useEffect(() => {
        const onEsc = e => { if (e.key === "Escape") setIsOpen(false); };
        window.addEventListener("keydown", onEsc);
        return () => window.removeEventListener("keydown", onEsc);
    }, []);

  // ברירת מחדל ל-reduced motion לפי מערכת
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // מצבים נשמרים
  const [highContrast, setHighContrast]   = useState(() => localStorage.getItem(LS.HC) === "1");
  const [reducedMotion, setReducedMotion] = useState(() => {
    const saved = localStorage.getItem(LS.RM);
    return saved === null ? prefersReduced : saved === "1";
  });
  const [bigText, setBigText]             = useState(() => localStorage.getItem(LS.BT) === "1");

  // חשיפה/הסתרה של הסרגל (נשמר ב-LS)
  const [visible, setVisible] = useState(() => localStorage.getItem(LS.VIS) === "1");

  // סנכרון מחלקות ל-<html>
  useEffect(() => toggleHtmlClass("a11y-high-contrast", highContrast), [highContrast]);
  useEffect(() => toggleHtmlClass("a11y-reduced-motion", reducedMotion), [reducedMotion]);
  useEffect(() => toggleHtmlClass("a11y-big-text",     bigText),        [bigText]);

  // שמירת העדפות
  useEffect(() => localStorage.setItem(LS.HC,  highContrast  ? "1" : "0"), [highContrast]);
  useEffect(() => localStorage.setItem(LS.RM,  reducedMotion ? "1" : "0"), [reducedMotion]);
  useEffect(() => localStorage.setItem(LS.BT,  bigText       ? "1" : "0"), [bigText]);
  useEffect(() => localStorage.setItem(LS.VIS, visible       ? "1" : "0"), [visible]);

  // Skip to main
  const focusMain = (e) => {
    e.preventDefault();
    const main = document.getElementById(mainId);
    if (main) {
      main.setAttribute("tabindex", "-1");
      main.focus();
      const onBlur = () => {
        main.removeAttribute("tabindex");
        main.removeEventListener("blur", onBlur);
      };
      main.addEventListener("blur", onBlur);
    }
  };

  // הכרזה לקוראי מסך
  const announce = (msg) => {
    if (!liveRef.current) return;
    liveRef.current.textContent = "";
    setTimeout(() => (liveRef.current.textContent = msg), 30);
  };

  // הכרזות להפעלה/כיבוי
  useEffect(() => { announce(highContrast  ? "מצב ניגודיות גבוהה הופעל" : "מצב ניגודיות גבוהה כובה"); }, [highContrast]);
  useEffect(() => { announce(reducedMotion ? "מצב הפחתת אנימציות הופעל" : "מצב הפחתת אנימציות כובה"); }, [reducedMotion]);
  useEffect(() => { announce(bigText       ? "מצב טקסט מוגדל הופעל"      : "מצב טקסט מוגדל כובה"); }, [bigText]);

  // אירועים גלובליים מה-FAB/קומפ' אחרות
  useEffect(() => {
    const onToggleAll    = () => setVisible(v => !v);
    const onOpenToolkit  = () => setVisible(true);
    const onCloseToolkit = () => setVisible(false);

    window.addEventListener("a11y:toggle-all",   onToggleAll);
    window.addEventListener("a11y:open-toolkit", onOpenToolkit);
    window.addEventListener("a11y:close-toolkit",onCloseToolkit);
    return () => {
      window.removeEventListener("a11y:toggle-all",   onToggleAll);
      window.removeEventListener("a11y:open-toolkit", onOpenToolkit);
      window.removeEventListener("a11y:close-toolkit",onCloseToolkit);
    };
  }, []);

  // סגירה ב-Esc (כשגלוי)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && visible) setVisible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  return (
    <>
      {/* Skip link */}
      <a className="a11y-skip-link" href={"#"+mainId} onClick={focusMain}>
        דלג לתוכן הראשי
      </a>

      {/* Live region */}
      <div ref={liveRef} aria-live="polite" aria-atomic="true" className="a11y-live-region" />

      {/* סרגל הנגישות – עם מצבי פתיחה/סגירה אנימטיביים */}
      <div
        className={`a11y-toolbar ${visible ? "is-open" : "is-hidden"}`}
        role="toolbar"
        aria-label="אפשרויות נגישות"
        aria-hidden={!visible}
      >
        <button
          type="button"
          className="a11y-btn"
          onClick={() => setHighContrast(v => !v)}
          aria-pressed={highContrast}
        >
          ניגודיות גבוהה
        </button>

        <button
          type="button"
          className="a11y-btn"
          onClick={() => setReducedMotion(v => !v)}
          aria-pressed={reducedMotion}
        >
          הפחת אנימציות
        </button>

        <button
          type="button"
          className="a11y-btn"
          onClick={() => setBigText(v => !v)}
          aria-pressed={bigText}
        >
          הגדל טקסט
        </button>
      </div>
    </>
  );
}
