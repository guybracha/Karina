// src/a11y/ReadAloud.js
import React, { useEffect, useMemo, useRef, useState } from "react";

export default function ReadAloud({ targetSelector = "#main", lang = "he-IL" }) {
  const [voices, setVoices] = useState([]);
  const [voiceIndex, setVoiceIndex] = useState(-1);
  const [rate, setRate] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const utterRef = useRef(null);
  const firstActionRef = useRef(null);

  // טעינת קולות (כרום מטעין באיחור)
  const loadVoices = () => setVoices(window.speechSynthesis?.getVoices() || []);
  useEffect(() => {
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  // ברירת מחדל: קול עברי אם קיים
  useEffect(() => {
    const idx = voices.findIndex(v =>
      (v.lang || "").toLowerCase().startsWith(lang.toLowerCase()) ||
      /he|עברית/.test(`${v.name} ${v.lang}`)
    );
    if (idx >= 0) setVoiceIndex(idx);
  }, [voices, lang]);

  // פתיחה/סגירה מה-FAB + החזרת פוקוס לפעולה הראשונה כשהפאנל נפתח
  useEffect(() => {
    const onToggleAll = () => setIsOpen(v => !v);
    const onOpenRead  = () => setIsOpen(true);
    const onCloseRead = () => setIsOpen(false);
    window.addEventListener("a11y:toggle-all", onToggleAll);
    window.addEventListener("a11y:open-read", onOpenRead);
    window.addEventListener("a11y:close-read", onCloseRead);
    return () => {
      window.removeEventListener("a11y:toggle-all", onToggleAll);
      window.removeEventListener("a11y:open-read", onOpenRead);
      window.removeEventListener("a11y:close-read", onCloseRead);
    };
  }, []);

  // סגירה ב-Esc; בסגירה עוצרים דיבור
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // מיקוד לפעולה הראשונה כשנפתח
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => firstActionRef.current?.focus(), 0);
      return () => clearTimeout(t);
    } else {
      cancel(); // סגירה → עצירת דיבור
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const pickText = () => {
    const sel = window.getSelection?.().toString().trim();
    if (sel) return sel;
    const el = document.querySelector(targetSelector);
    return el ? (el.innerText || el.textContent || "").trim() : "";
  };

  const chunkify = (text, max = 500) => {
    const parts = text.replace(/\s+/g, " ").split(/(?<=[\.!?…\u05BE])\s+/);
    const chunks = [];
    let buf = "";
    for (const p of parts) {
      if ((buf + " " + p).length > max) {
        if (buf) chunks.push(buf);
        buf = p;
      } else {
        buf = buf ? `${buf} ${p}` : p;
      }
    }
    if (buf) chunks.push(buf);
    return chunks;
  };

  const speak = () => {
    const text = pickText();
    if (!text) return;
    cancel(); // איפוס קודם
    const chunks = chunkify(text);
    const synth = window.speechSynthesis;
    let i = 0;

    const speakNext = () => {
      if (i >= chunks.length) {
        setIsSpeaking(false);
        setIsPaused(false);
        return;
      }
      const u = new SpeechSynthesisUtterance(chunks[i++]);
      utterRef.current = u;
      if (voiceIndex >= 0 && voices[voiceIndex]) u.voice = voices[voiceIndex];
      u.lang = voices[voiceIndex]?.lang || lang;
      u.rate = rate;
      u.onend = speakNext;
      u.onerror = speakNext;
      synth.speak(u);
    };

    setIsSpeaking(true);
    speakNext();
  };

  const pause = () => {
    if (!isSpeaking) return;
    if (!isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    } else {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };

  const cancel = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utterRef.current = null;
  };

  // (אופציונלי לשימוש חיצוני)
  const hebrewVoices = useMemo(
    () => voices.filter(v =>
      (v.lang || "").toLowerCase().startsWith("he") || /עברית/i.test(v.name)
    ),
    [voices]
  );

  return (
    <>
      {/* הפאנל תמיד בדום – נפתח/נסגר עם מחלקה כדי לאפשר אנימציית CSS */}
      <div
        id="read-aloud-panel"
        className={`a11y-read-toolbar ${isOpen ? "is-open" : ""}`}
        role="dialog"
        aria-label="כלי קריאה בקול"
        aria-modal="false"
        aria-hidden={!isOpen}
      >
        <div className="a11y-read-row">
          <button
            ref={firstActionRef}
            className="a11y-btn"
            onClick={speak}
            aria-pressed={isSpeaking}
          >
            הקריא/י את הדף
          </button>
          <button className="a11y-btn" onClick={pause} disabled={!isSpeaking}>
            {isPaused ? "המשך" : "השהה"}
          </button>
          <button className="a11y-btn" onClick={cancel} disabled={!isSpeaking}>
            עצור
          </button>
        </div>

        <div className="a11y-read-row">
          <label className="a11y-read-ctrl">
            מהירות:
            <input
              type="range"
              min="0.6" max="1.6" step="0.1"
              value={rate}
              onChange={e => setRate(parseFloat(e.target.value))}
              aria-valuemin={0.6} aria-valuemax={1.6} aria-valuenow={rate}
            />
          </label>

          <label className="a11y-read-ctrl">
            קול:
            <select
              value={voiceIndex}
              onChange={(e) => setVoiceIndex(parseInt(e.target.value, 10))}
              aria-label="בחירת קול לקריאה"
            >
              <option value={-1}>ברירת מחדל</option>
              {voices.map((v, i) => (
                <option key={v.name + i} value={i}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>

          <span className="a11y-hint">
            טיפ: סמנו טקסט ואז לחצו “הקריא” כדי לקרוא רק את הקטע המסומן.
          </span>
        </div>
      </div>
    </>
  );
}
