// src/components/FabricLogoDesigner.jsx
import React, { useEffect, useRef, useState } from "react";
import { Canvas, Image as FabricImage, Rect } from "fabric";

export default function FabricLogoDesigner({
  baseImageUrl,
  productName = "פריט",
  printArea = null,
  showPrintArea = true,
}) {
  const canvasEl = useRef(null);
  const canvasRef = useRef(null);
  const [bgImg, setBgImg] = useState(null);

  const W = 600, H = 600;

  // יצירת קנבס
  useEffect(() => {
    const c = new Canvas(canvasEl.current, {
      width: W,
      height: H,
      backgroundColor: "#fff",
      preserveObjectStacking: true,
    });
    canvasRef.current = c;
    return () => { try { c.dispose(); } catch {} };
  }, []);

  // טעינת תמונת בסיס
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !baseImageUrl) return;

    (async () => {
      const img = await FabricImage.fromURL(String(baseImageUrl), { crossOrigin: "anonymous" });
      const el = img.getElement?.();
      const iw = img.width || el?.naturalWidth || W;
      const ih = img.height || el?.naturalHeight || H;
      const scale = Math.min(W / iw, H / ih);

      img.set({
        selectable: false,
        evented: false,
        scaleX: scale,
        scaleY: scale,
        left: (W - iw * scale) / 2,
        top:  (H - ih * scale) / 2,
      });
      setBgImg(img);
      c.setBackgroundImage(img, c.renderAll.bind(c));
    })().catch(console.error);
  }, [baseImageUrl]);

  // ציור/עדכון אזור הדפסה
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    // הסר ריבועי הדפסה קודמים
    c.getObjects().forEach(o => {
      if (o._isPrintArea) c.remove(o);
    });

    if (printArea && showPrintArea && bgImg) {
      const el = bgImg.getElement?.();
      const iw = bgImg.width || el?.naturalWidth || W;
      const ih = bgImg.height || el?.naturalHeight || H;
      const scale = Math.min(W / iw, H / ih);

      const rect = new Rect({
        left: bgImg.left + printArea.x * scale,
        top:  bgImg.top  + printArea.y * scale,
        width:  printArea.w * scale,
        height: printArea.h * scale,
        fill: "rgba(0, 120, 255, 0.08)",
        stroke: "rgba(0, 120, 255, 0.6)",
        strokeDashArray: [6, 6],
        selectable: false,
        evented: false,
      });
      rect._isPrintArea = true;
      c.add(rect);
      rect.moveTo(1);
      c.renderAll();
    }
  }, [printArea, showPrintArea, bgImg]);

  // העלאת לוגו
  function onLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const logo = await FabricImage.fromURL(String(reader.result));
      const el = logo.getElement?.();
      const lw = logo.width || el?.naturalWidth || 300;
      const initialScale = Math.min(250 / lw, 1);

      logo.set({
        left: W / 2,
        top: H / 2,
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

      if (printArea && bgImg) {
        const elBg = bgImg.getElement?.();
        const iw = bgImg.width || elBg?.naturalWidth || W;
        const ih = bgImg.height || elBg?.naturalHeight || H;
        const scale = Math.min(W / iw, H / ih);

        logo.clipPath = new Rect({
          left: bgImg.left + printArea.x * scale,
          top:  bgImg.top  + printArea.y * scale,
          width:  printArea.w * scale,
          height: printArea.h * scale,
          absolutePositioned: true,
        });
      }

      canvasRef.current.add(logo).setActiveObject(logo);
      canvasRef.current.renderAll();
    };
    reader.readAsDataURL(file);
  }

  // מחיקת האובייקט הנבחר
  function removeSelected() {
    const c = canvasRef.current;
    const obj = c.getActiveObject();
    if (obj) {
      c.remove(obj);
      c.discardActiveObject();
      c.renderAll();
    }
  }

  // הצג/הסתר אזור הדפסה
  function togglePrintArea() {
    const c = canvasRef.current;
    c.getObjects().forEach(o => { if (o._isPrintArea) o.set("visible", !o.visible); });
    c.renderAll();
  }

  // ייצוא PNG
  function exportPng() {
    const dataURL = canvasRef.current.toDataURL({ format: "png", quality: 1 });
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = `${productName || "product"}-preview.png`;
    a.click();
  }

  return (
    <div>
      <div className="mb-2 d-flex align-items-center justify-content-between">
        <div className="fw-semibold">{productName}</div>
        <div className="d-flex gap-2">
          <label className="btn btn-sm btn-outline-secondary mb-0">
            העלה לוגו
            <input type="file" className="d-none" accept="image/*" onChange={onLogoUpload} />
          </label>
          <button onClick={removeSelected} className="btn btn-sm btn-outline-danger">מחק לוגו</button>
          <button onClick={togglePrintArea} className="btn btn-sm btn-outline-dark">הצג/הסתר אזור הדפסה</button>
          <button onClick={exportPng} className="btn btn-sm btn-primary">שמור הדמיה</button>
        </div>
      </div>

      <div className="border rounded shadow-sm p-2 bg-white">
        <canvas ref={canvasEl} width={W} height={H} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      <p className="text-muted small mt-2">
        טיפ: ניתן לגרור, לסובב ולשנות גודל ללוגו ישירות על גבי הקנבס (ידיות כחולות).
      </p>
    </div>
  );
}
