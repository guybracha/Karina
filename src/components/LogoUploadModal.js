// src/components/LogoUploadModal.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { addPending, blobToDataUrl } from "../utils/pendingLogos.ts";
import { useLogosQueue } from "../contexts/LogosQueueContext.tsx";

/**
 * פרמטרים כלליים
 */
const MAX_SIZE_MB = 10;          // גודל קובץ מקסימלי לקליטה
const PREVIEW_MAX_SIDE = 1500;   // צד ארוך של preview (פיקסלים)
const PREVIEW_QUALITY = 0.85;    // איכות WebP
const LOCAL_ORIGINAL_LIMIT = 2 * 1024 * 1024; // קבצים מעל 2MB לא יישמרו ב-localStorage

/**
 * ברירת מחדל לתבנית הדמיה (אפשר לעדכן ע"י prop)
 * imageUrl – כתובת תמונת החולצה
 * rect – המיקום/גודל שבו מציבים את הלוגו על הבד
 * rotationDeg – רוטציה קלה אם צריך
 */
const DEFAULT_MOCKUP_TEMPLATE = {
  imageUrl: "/img/mockups/tshirt-front.png",
  rect: { x: 0.32, y: 0.26, w: 0.36, h: 0.36 }, // יחסי לרוחב/גובה התבנית
  rotationDeg: 0,
};

export default function LogoUploadModal({
  show,
  onClose,
  onConfirm,
  accept = "image/*,application/pdf",
  maxSizeMB = MAX_SIZE_MB,
  uid,                           // אופציונלי: אם יש user מראש
  mockupTemplate = DEFAULT_MOCKUP_TEMPLATE, // תבנית הדמיה של מוצר נוכחי
}) {
  const [dataUrl, setDataUrl] = useState(null);   // preview מקומי לתמונה
  const [fileObj, setFileObj] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [isPdf, setIsPdf] = useState(false);

  const [error, setError] = useState("");
  const [busyText, setBusyText] = useState("");  // טקסט התקדמות (עיבוד/שמירה)

  const inputRef = useRef(null);
  const dropRef = useRef(null);

  const { setOriginalInMemory } = useLogosQueue();
  const isAuthed = Boolean(uid); // במודל הזה לא נדרש Auth להעלאה (כי לא מעלים), אבל נשמור בדיקה אם תרצה לחסום

  useEffect(() => {
    if (!show) resetState();
  }, [show]);

  function resetState() {
    setDataUrl(null);
    setFileObj(null);
    setIsImage(false);
    setIsPdf(false);
    setError("");
    setBusyText("");
  }

  const newId = () => Math.random().toString(36).slice(2, 10);

  /** קריאת קובץ + ולידציה + preview מיידי לתמונה */
  const readFile = useCallback(
    (file) => {
      if (!file) return;

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`קובץ גדול מדי. מגבלה: ${maxSizeMB}MB`);
        return;
      }

      const _isImage = file.type.startsWith("image/");
      const _isPdf = file.type === "application/pdf";

      if (!_isImage && !_isPdf) {
        setError("יש לבחור קובץ תמונה (PNG/JPG/SVG) או PDF.");
        return;
      }

      setError("");
      setFileObj(file);
      setIsImage(_isImage);
      setIsPdf(_isPdf);

      if (_isImage) {
        const reader = new FileReader();
        reader.onload = () => setDataUrl(reader.result);
        reader.readAsDataURL(file);
      } else {
        setDataUrl(null);
      }
    },
    [maxSizeMB]
  );

  const onInputChange = (e) => readFile(e.target.files?.[0]);

  // Drag & Drop
  useEffect(() => {
    if (!show) return;
    const area = dropRef.current;
    if (!area) return;

    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e) => { prevent(e); readFile(e.dataTransfer.files?.[0]); area.classList.remove("border-primary"); };
    const onEnter = (e) => { prevent(e); area.classList.add("border-primary"); };
    const onLeave = (e) => { prevent(e); area.classList.remove("border-primary"); };

    area.addEventListener("dragenter", onEnter);
    area.addEventListener("dragover", prevent);
    area.addEventListener("dragleave", onLeave);
    area.addEventListener("drop", onDrop);
    return () => {
      area.removeEventListener("dragenter", onEnter);
      area.removeEventListener("dragover", prevent);
      area.removeEventListener("dragleave", onLeave);
      area.removeEventListener("drop", onDrop);
    };
  }, [show, readFile]);

  /**
   * יצירת Blob ל-preview כ-WebP – לתמונות בלבד
   */
  async function makePreviewBlob(file, maxSide = PREVIEW_MAX_SIDE, quality = PREVIEW_QUALITY) {
    if (!file.type.startsWith("image/")) return null;

    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });

      const { naturalWidth: w, naturalHeight: h } = img;
      if (!w || !h) throw new Error("failed to decode image");

      const ratio = w / h;
      let targetW = w, targetH = h;
      if (Math.max(w, h) > maxSide) {
        if (ratio >= 1) { targetW = maxSide; targetH = Math.round(maxSide / ratio); }
        else { targetH = maxSide; targetW = Math.round(maxSide * ratio); }
      }

      const canvas = (typeof OffscreenCanvas !== "undefined")
        ? new OffscreenCanvas(targetW, targetH)
        : Object.assign(document.createElement("canvas"), { width: targetW, height: targetH });

      const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (ctx && "imageSmoothingEnabled" in ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
      }
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const mime = "image/webp";
      const blob = await (canvas.convertToBlob
        ? canvas.convertToBlob({ type: mime, quality })
        : new Promise((resolve) => canvas.toBlob(resolve, mime, quality)));
      if (blob) return blob;

      // fallback
      return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * יצירת הדמיה: מצייר לוגו (blob/tImage) על תבנית חולצה.
   * אם רוצים שליטה – מעבירים prop mockupTemplate עם imageUrl ו-rect יחסיים.
   */
  async function makeMockupBlob(logoBlob, template = DEFAULT_MOCKUP_TEMPLATE, outWidth = 1600) {
    const { imageUrl, rect, rotationDeg = 0 } = template;

    // טען את תמונת התבנית
    const baseImg = await loadImage(imageUrl);

    const ratio = baseImg.naturalWidth / baseImg.naturalHeight;
    const W = outWidth;
    const H = Math.round(W / ratio);

    // קנבס הדמיה
    const canvas = (typeof OffscreenCanvas !== "undefined")
      ? new OffscreenCanvas(W, H)
      : Object.assign(document.createElement("canvas"), { width: W, height: H });
    const ctx = canvas.getContext("2d", { alpha: true });

    // צייר בסיס
    ctx.drawImage(baseImg, 0, 0, W, H);

    // טען לוגו
    const logoUrl = URL.createObjectURL(logoBlob);
    const logoImg = await loadImage(logoUrl);

    // תיבת הצבה (פיקסלים)
    const box = {
      x: Math.round(rect.x * W),
      y: Math.round(rect.y * H),
      w: Math.round(rect.w * W),
      h: Math.round(rect.h * H),
    };

    // מדמה יחס – ממלא את התיבה מבלי לעוות
    const scale = Math.min(box.w / logoImg.naturalWidth, box.h / logoImg.naturalHeight);
    const drawW = Math.round(logoImg.naturalWidth * scale);
    const drawH = Math.round(logoImg.naturalHeight * scale);
    const drawX = Math.round(box.x + (box.w - drawW) / 2);
    const drawY = Math.round(box.y + (box.h - drawH) / 2);

    // רוטציה אופציונלית
    if (rotationDeg) {
      ctx.save();
      const cx = drawX + drawW / 2;
      const cy = drawY + drawH / 2;
      ctx.translate(cx, cy);
      ctx.rotate((rotationDeg * Math.PI) / 180);
      ctx.translate(-cx, -cy);
      ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(logoImg, drawX, drawY, drawW, drawH);
    }

    URL.revokeObjectURL(logoUrl);

    // יציאה: WebP
    const blob = await (canvas.convertToBlob
      ? canvas.convertToBlob({ type: "image/webp", quality: 0.92 })
      : new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.92)));

    return blob;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = src;
    });
  }

  /**
   * שמירה מקומית (localStorage + זיכרון למקור גדול).
   * מחזיר { id, previewDataUrl, mockupDataUrl } לשימוש מיידי.
   */
  async function saveLogoLocally(file) {
    const id = newId();
    const isPdf = file.type === "application/pdf";
    const isImg = file.type.startsWith("image/");

    setBusyText("יוצר תצוגה מקדימה…");
    let previewDataUrl = "";
    if (isImg) {
      const previewBlob = await makePreviewBlob(file);
      previewDataUrl = previewBlob ? await blobToDataUrl(previewBlob) : "";
    }

    setBusyText("מייצר הדמיה…");
    let mockupDataUrl = "";
    if (isImg && previewDataUrl) {
      // כדי לשפר איכות, נעדיף להשתמש ב-blob של preview ולא ב-dataURL
      const previewBlob = await (await fetch(previewDataUrl)).blob();
      const mockupBlob = await makeMockupBlob(previewBlob, mockupTemplate);
      mockupDataUrl = await blobToDataUrl(mockupBlob);
    }

    setBusyText("שומר מקומית…");
    let originalDataUrl = "";
    let originalDeferred = false;

    if (file.size <= LOCAL_ORIGINAL_LIMIT) {
      originalDataUrl = await blobToDataUrl(file);
    } else {
      originalDeferred = true;
      // נשמור את הקובץ הגולמי רק בזיכרון עד שלב ההזמנה
      setOriginalInMemory(id, file);
    }

    addPending({
      id,
      name: file.name || "logo",
      mime: file.type || "application/octet-stream",
      size: file.size || 0,
      previewDataUrl,
      mockupDataUrl,
      originalDataUrl: isPdf ? originalDataUrl : (originalDataUrl || undefined),
      originalDeferred,
      createdAt: Date.now(),
      // product: { slug, variantId } // אם תרצה לקשר למוצר
    });

    setBusyText("");
    return { id, previewDataUrl, mockupDataUrl };
  }

  /** שמירה + החזרה ל-caller */
  const handleConfirm = async () => {
    if (!fileObj) {
      setError("נא לבחור קובץ לוגו תחילה");
      return;
    }
    setError("");
    try {
      const saved = await saveLogoLocally(fileObj);
      // נחזיר לקורא preview מקומי לשילוב בקנבס + מזהה מקומי
      onConfirm?.(
        isImage ? (saved.previewDataUrl || dataUrl) : null,
        fileObj,
        { logoId: saved.id, local: true, mockup: saved.mockupDataUrl || null }
      );
      // לא נסגור אוטומטית – תחליטו לפי UX; אם כן:
      // onClose?.();
    } catch (e) {
      console.error(e);
      setError("שמירת הלוגו נכשלה. נסו שוב.");
      setBusyText("");
    }
  };

  if (!show) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ background: "rgba(0,0,0,.5)", zIndex: 1050 }}
      role="dialog" aria-modal="true" aria-labelledby="logoUploadTitle"
    >
      <div className="container h-100 d-flex align-items-center">
        <div className="bg-white rounded-4 shadow p-3 w-100" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 id="logoUploadTitle" className="m-0">העלאת לוגו</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose} aria-label="סגור" disabled={!!busyText}>
              סגור
            </button>
          </div>

          <div
            ref={dropRef}
            className={`border border-2 border-dashed rounded-3 p-4 text-center`}
            style={{ borderStyle: "dashed", opacity: busyText ? 0.6 : 1 }}
            aria-disabled={!!busyText}
          >
            {!fileObj ? (
              <>
                <p className="mb-3">
                  גררו לכאן קובץ <strong>PNG/JPG/SVG</strong> או <strong>PDF</strong>, או בחרו ידנית
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-outline-primary" onClick={() => inputRef.current?.click()} disabled={!!busyText}>
                    בחר קובץ
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="d-none"
                    onChange={onInputChange}
                    disabled={!!busyText}
                  />
                </div>
                <div className="text-muted small mt-2">
                  מומלץ לתמונות: עד {PREVIEW_MAX_SIDE}px בצד הארוך (WebP). מגבלה כללית: {MAX_SIZE_MB}MB
                </div>
              </>
            ) : (
              <div className="row g-3 align-items-center">
                <div className="col-12 col-md-6">
                  <div className="border rounded-3 p-2 bg-light">
                    {isImage && dataUrl ? (
                      <div className="ratio ratio-1x1 overflow-hidden">
                        <img src={dataUrl} alt="תצוגת לוגו" style={{ objectFit: "contain" }} />
                      </div>
                    ) : (
                      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 160 }}>
                        <div>
                          <div style={{ fontSize: 48, lineHeight: 1 }}>📄</div>
                          <div className="mt-2">נבחר קובץ PDF</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-12 col-md-6 text-start text-md-end">
                  <div className="small mb-2">
                    <strong>שם קובץ:</strong> {fileObj?.name} <br />
                    <strong>סוג:</strong> {isPdf ? "PDF" : "תמונה"} <br />
                    <strong>גודל:</strong> {(fileObj?.size / (1024 * 1024)).toFixed(2)}MB
                  </div>

                  {busyText && (
                    <div className="mb-2">
                      <div className="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100">
                        <div className="progress-bar" style={{ width: `100%` }}>
                          {busyText}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="d-flex gap-2 justify-content-md-end">
                    <button className="btn btn-light" onClick={resetState} disabled={!!busyText}>נקה</button>
                    <button className="btn btn-primary" onClick={handleConfirm} disabled={!!busyText}>
                      המשך להצבה
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
        </div>
      </div>
    </div>
  );
}
