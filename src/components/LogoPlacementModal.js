// src/components/LogoPlacementModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { Canvas, Image as FabricImage, Rect } from "fabric";

export default function LogoPlacementModal({
  show,
  onClose,
  onSave,
  baseImageUrl,           // כתובת תמונת המוצר
  printArea = null,       // {x,y,w,h} בפיקסלים במקור
  logoDataUrl = null,     // DataURL של הלוגו
}) {
  const canvasEl = useRef(null);
  const canvasRef = useRef(null);
  const bgRef = useRef(null);
  const logoRef = useRef(null);
  const printRectRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const CW = 700, CH = 700;

  // ===== Helpers =====
  const isDataUrl = (u) => typeof u === "string" && /^data:image\/[a-zA-Z]+;base64,/.test(u);
  const isAbsolute = (u) => typeof u === "string" && /^(https?:)?\/\//.test(u);
  const isSameOrigin = (u) => {
    if (!isAbsolute(u)) return true;
    try {
      const loc = window.location;
      const url = new URL(u, loc.href);
      return url.origin === loc.origin;
    } catch { return true; }
  };
  async function loadFabricImage(url) {
    const needsCors = isAbsolute(url) && !isSameOrigin(url) && !isDataUrl(url);
    const opts = needsCors ? { crossOrigin: "anonymous" } : undefined;
    return FabricImage.fromURL(String(url), opts);
  }

  // יצירת קנבס רק כשהמודאל פתוח וה-<canvas> קיים
  useEffect(() => {
    if (!show) return;
    const node = canvasEl.current;
    if (!node) return;

    const c = new Canvas(node, {
      width: CW,
      height: CH,
      backgroundColor: "#fff",
      preserveObjectStacking: true,
      selection: false,
    });
    canvasRef.current = c;

    return () => {
      try { c.dispose(); } catch {}
      canvasRef.current = null;
      bgRef.current = null;
      logoRef.current = null;
      printRectRef.current = null;
    };
  }, [show]);

  // Esc = סגור
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, onClose]);

  // טען/עדכן רקע + אזור הדפסה + לוגו
  useEffect(() => {
    let cancelled = false;
    const c = canvasRef.current;
    if (!show || !c) return;

    async function loadAll() {
      setErr("");
      setLoading(true);

      // נקה אובייקטים ורקע
      c.getObjects().forEach(o => c.remove(o));
      c.set({ backgroundImage: undefined });
      bgRef.current = null;
      logoRef.current = null;
      printRectRef.current = null;

      try {
        if (!baseImageUrl) throw new Error("baseImageUrl missing");

        // ----- רקע -----
        const bg = await loadFabricImage(baseImageUrl);
        const el = bg.getElement?.();
        const iw = bg.width || el?.naturalWidth || CW;
        const ih = bg.height || el?.naturalHeight || CH;
        const scale = Math.min(CW / iw, CH / ih);

        bg.set({
          selectable: false,
          evented: false,
          scaleX: scale,
          scaleY: scale,
          left: (CW - iw * scale) / 2,
          top:  (CH - ih * scale) / 2,
        });

        if (cancelled) return;
        bgRef.current = bg;
        c.set({ backgroundImage: bg });
        c.requestRenderAll();

        // ----- אזור הדפסה (לא חובה) -----
        if (printArea) {
          const rect = new Rect({
            left: bg.left + printArea.x * scale,
            top:  bg.top  + printArea.y * scale,
            width:  printArea.w * scale,
            height: printArea.h * scale,
            fill: "rgba(13,110,253,.08)",
            stroke: "rgba(13,110,253,.6)",
            strokeDashArray: [6, 6],
            selectable: false,
            evented: false,
          });
          rect._isPrintArea = true;
          printRectRef.current = rect;
          c.add(rect);
          rect.moveTo(1);
          c.requestRenderAll();
        }

        // ----- לוגו (לא חובה) -----
        if (logoDataUrl) {
          const logo = await loadFabricImage(logoDataUrl);
          const el2 = logo.getElement?.();
          const lw = logo.width || el2?.naturalWidth || 300;
          const initialScale = Math.min(250 / lw, 1);

          logo.set({
            left: CW / 2,
            top: CH / 2,
            originX: "center",
            originY: "center",
            scaleX: initialScale,
            scaleY: initialScale,
            cornerStyle: "circle",
            transparentCorners: false,
            borderColor: "#0d6efd",
            cornerColor: "#0d6efd",
            padding: 4,
          });

          if (printArea && bgRef.current) {
            logo.clipPath = new Rect({
              left: bg.left + printArea.x * scale,
              top:  bg.top  + printArea.y * scale,
              width:  printArea.w * scale,
              height: printArea.h * scale,
              absolutePositioned: true,
            });
          }

          if (cancelled) return;
          logoRef.current = logo;
          c.add(logo);               // ← add בנפרד
          c.setActiveObject(logo);   // ← ואז setActiveObject
          c.requestRenderAll();
        }

        if (!cancelled) setLoading(false);
      } catch (e) {
        console.error("LogoPlacementModal load error:", e, { baseImageUrl, logoDataUrl });
        if (!cancelled) { setErr("לא הצלחתי לטעון את התמונה/לוגו."); setLoading(false); }
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, [show, baseImageUrl, logoDataUrl, printArea]);

  // שמירה
  function handleSave() {
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL({ format: "png", quality: 1 });
    onSave?.({ dataUrl });
  }

  if (!show) return null;

  // סגירה בלחיצה על הרקע
  function onBackdropClick(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ background: "rgba(0,0,0,.6)", zIndex: 2000, padding: 12 }}
      role="dialog"
      aria-modal="true"
      onMouseDown={onBackdropClick}
    >
      <div
        className="bg-white rounded-4 shadow p-3 w-100 position-relative"
        style={{
          maxWidth: 760,       // קטן יותר
          maxHeight: "90vh",   // שלא יגלוש
          overflow: "auto",    // גלילה פנימית
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* כפתור X צף שתמיד נראה */}
        <button
          type="button"
          aria-label="סגור"
          className="btn btn-sm btn-light position-absolute"
          style={{ top: 8, insetInlineEnd: 8, boxShadow: "0 0 0 1px rgba(0,0,0,.06)" }}
          onClick={onClose}
        >
          ✕
        </button>

        <div className="d-flex justify-content-between align-items-center mb-2 pe-5">
          <h5 className="m-0">הצבת לוגו על הפריט</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>סגור</button>
        </div>

        <div className="position-relative border rounded bg-white" style={{ minHeight: 320 }}>
          <canvas
            ref={canvasEl}
            width={CW}
            height={CH}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          {loading && (
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ background: "rgba(255,255,255,.7)" }}>
              <div className="spinner-border" role="status" aria-label="טוען..." />
            </div>
          )}
          {!!err && !loading && (
            <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center p-3" style={{ background: "rgba(255,255,255,.9)" }}>
              <div className="alert alert-danger mb-0 w-100 text-center">{err}</div>
            </div>
          )}
        </div>

        <div className="d-flex justify-content-end gap-2 mt-3">
          <button className="btn btn-light" onClick={onClose}>ביטול</button>
          <button className="btn btn-primary" onClick={handleSave}>שמור הדמיה</button>
        </div>

        <p className="text-muted small mt-2 mb-0">
          ניתן לגרור, לסובב ולשנות גודל ללוגו; אם הוגדר אזור הדפסה – הלוגו ייחתך לתוכו אוטומטית.
        </p>
      </div>
    </div>
  );
}
