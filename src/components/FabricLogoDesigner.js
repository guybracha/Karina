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

  // יצירת קנבס
  useEffect(() => {
    const c = new Canvas(canvasEl.current, {
      width: 600,
      height: 600,
      backgroundColor: "#fff",
      preserveObjectStacking: true,
    });
    canvasRef.current = c;
    return () => c.dispose();
  }, []);

  // טעינת תמונת בסיס
  useEffect(() => {
    if (!canvasRef.current || !baseImageUrl) return;

    FabricImage.fromURL(
      baseImageUrl,
      (img) => {
        const scale = 600 / img.width; // img.width מוגדר לאחר הטעינה
        img.set({
          selectable: false,
          evented: false,
          scaleX: scale,
          scaleY: scale,
          left: 0,
          top: 0,
        });
        setBgImg(img);
        canvasRef.current.setBackgroundImage(img, canvasRef.current.renderAll.bind(canvasRef.current));
      },
      { crossOrigin: "anonymous" }
    );
  }, [baseImageUrl]);

  // ציור/עדכון אזור הדפסה
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;

    // הסר כל מלבן שסימנו כאזור הדפסה
    c.getObjects().forEach((o) => {
      if (o._isPrintArea) c.remove(o);
    });

    if (printArea && showPrintArea && bgImg) {
      const scale = 600 / bgImg.width;
      const rect = new Rect({
        left: printArea.x * scale,
        top: printArea.y * scale,
        width: printArea.w * scale,
        height: printArea.h * scale,
        fill: "rgba(0, 120, 255, 0.08)",
        stroke: "rgba(0, 120, 255, 0.6)",
        strokeDashArray: [6, 6],
        selectable: false,
        evented: false,
      });
      rect._isPrintArea = true;
      c.add(rect);
      rect.moveTo(1); // מעל הרקע ומתחת ללוגו
      c.renderAll();
    }
  }, [printArea, showPrintArea, bgImg]);

  // העלאת לוגו
  function onLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      FabricImage.fromURL(reader.result, (logo) => {
        const initialScale = 250 / logo.width;
        logo.set({
          left: 300,
          top: 300,
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

        // הגבלת הדפסה לתוך printArea (אם קיים)
        if (printArea && bgImg) {
          const scale = 600 / bgImg.width;
          const clip = new Rect({
            left: printArea.x * scale,
            top: printArea.y * scale,
            width: printArea.w * scale,
            height: printArea.h * scale,
            absolutePositioned: true,
          });
          logo.clipPath = clip;
        }

        canvasRef.current.add(logo).setActiveObject(logo);
        canvasRef.current.renderAll();
      });
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
    c.getObjects().forEach((o) => {
      if (o._isPrintArea) o.set("visible", !o.visible);
    });
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
        <canvas ref={canvasEl} />
      </div>

      <p className="text-muted small mt-2">
        טיפ: ניתן לגרור, לסובב ולשנות גודל ללוגו ישירות על גבי הקנבס (ידיות כחולות).
      </p>
    </div>
  );
}
