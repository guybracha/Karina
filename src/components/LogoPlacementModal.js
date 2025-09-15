// src/components/LogoPlacementModal.jsx
import React, { useEffect, useRef, useState } from "react";
import { Canvas, Image as FabricImage, Rect } from "fabric";

export default function LogoPlacementModal({
  show,
  onClose,
  onSave,
  baseImageUrl,
  printArea = null,
  logoDataUrl = null,
}) {
  const canvasEl = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const CW = 700, CH = 700;

  // צור/השמד קנבס כל פעם שהמודאל נפתח
  useEffect(() => {
    if (!show) return;
    const c = new Canvas(canvasEl.current, {
      width: CW,
      height: CH,
      backgroundColor: "#fff",
      preserveObjectStacking: true,
    });
    canvasRef.current = c;
    return () => {
      c.dispose();
      canvasRef.current = null;
    };
  }, [show]);

  // טען תמונת בסיס + לוגו
  useEffect(() => {
    if (!show || !canvasRef.current || !baseImageUrl) return;

    let canceled = false;
    setErr("");
    setLoading(true);

    (async () => {
      try {
        // ודא שה-URL אכן מחרוזת
        const bgUrl = String(baseImageUrl);

        // טען רקע (Fabric v6: מבטיח)
        const bg = await FabricImage.fromURL(bgUrl, { crossOrigin: "anonymous" });

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
          top: (CH - ih * scale) / 2,
        });

        if (canceled) return;
        const c = canvasRef.current;
        c.setBackgroundImage(bg, c.renderAll.bind(c));

        // אזור הדפסה (אם קיים)
        if (printArea) {
          const rect = new Rect({
            left: bg.left + printArea.x * scale,
            top: bg.top + printArea.y * scale,
            width: printArea.w * scale,
            height: printArea.h * scale,
            fill: "rgba(13,110,253,.08)",
            stroke: "rgba(13,110,253,.6)",
            strokeDashArray: [6, 6],
            selectable: false,
            evented: false,
          });
          rect._isPrintArea = true;
          c.add(rect);
          rect.moveTo(1);
          c.renderAll();
        }

        // אם כבר נבחר לוגו — הוסף אותו
        if (logoDataUrl) {
          const logo = await FabricImage.fromURL(String(logoDataUrl));
          const lw = logo.width || logo.getElement?.().naturalWidth || 300;
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

          if (printArea) {
            logo.clipPath = new Rect({
              left: bg.left + printArea.x * scale,
              top: bg.top + printArea.y * scale,
              width: printArea.w * scale,
              height: printArea.h * scale,
              absolutePositioned: true,
            });
          }

          if (canceled) return;
          c.add(logo).setActiveObject(logo);
          c.renderAll();
        }

        if (!canceled) setLoading(false);
      } catch (e) {
        console.error("LogoPlacementModal image load error:", e, { baseImageUrl, logoDataUrl });
        if (!canceled) {
          setErr("לא הצלחתי לטעון את התמונה. בדוק שהנתיב/הייבוא תקין.");
          setLoading(false);
        }
      }
    })();

    return () => { canceled = true; };
  }, [show, baseImageUrl, logoDataUrl, printArea]);

  function handleSave() {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL({ format: "png", quality: 1 });
    onSave?.({ dataUrl });
  }

  if (!show) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ background: "rgba(0,0,0,.6)", zIndex: 2000 }}
      role="dialog"
      aria-modal="true"
    >
      <div className="container h-100 d-flex align-items-center">
        <div className="bg-white rounded-4 shadow p-3 w-100" style={{ maxWidth: 880, margin: "0 auto" }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 className="m-0">הצבת לוגו על הפריט</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>סגור</button>
          </div>

          <div className="border rounded p-2 bg-white" style={{ minHeight: 360 }}>
            {loading && (
              <div className="d-flex justify-content-center align-items-center py-5">
                <div className="spinner-border" role="status" aria-label="טוען..." />
              </div>
            )}
            {!loading && err && (
              <div className="alert alert-danger m-2">{err}</div>
            )}
            {!loading && !err && (
              <canvas ref={canvasEl} style={{ width: "100%", height: "auto" }} />
            )}
          </div>

          <div className="d-flex justify-content-end gap-2 mt-3">
            <button className="btn btn-light" onClick={onClose}>ביטול</button>
            <button className="btn btn-primary" onClick={handleSave}>שמור הדמיה</button>
          </div>

          <p className="text-muted small mt-2 mb-0">
            גרור/סובב/שנה גודל את הלוגו; אם הוגדר אזור הדפסה, ההדבקה תיחתך לתוכו אוטומטית.
          </p>
        </div>
      </div>
    </div>
  );
}
