// src/components/LogoUploadModal.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { uploadLogoAssets } from "../lib/uploadLogoAssets"; // שימוש ב-SDK בלבד
import { auth, ensureAuthTokenFresh, storage } from "../firebase"; // הוספנו storage
import { useLogosQueue } from "../contexts/LogosQueueContext.tsx";

export default function LogoUploadModal({
  show,
  onClose,
  onConfirm,
  // מינימום פרופסים הדרושים כדי לשייך ללוגו להזמנה/פריט:
  orderId,           // מזהה הזמנה פעילה
  itemSlug,          // למשל "tshirt-gray"
  side = "front",    // "front" | "back"
  accept = "image/*,application/pdf,image/svg+xml",
  maxSizeMB = 10,
}) {
  const [fileObj, setFileObj] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [error, setError] = useState("");
  const [busyText, setBusyText] = useState("");

  const inputRef = useRef(null);
  const dropRef = useRef(null);
  const { setOriginalInMemory } = useLogosQueue(); // ← לשמירה בזיכרון

  useEffect(() => { if (!show) resetState(); }, [show]);

  function resetState() {
    setFileObj(null);
    setIsPdf(false);
    setError("");
    setBusyText("");
  }

  const readFile = useCallback((file) => {
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`קובץ גדול מדי. מגבלה: ${maxSizeMB}MB`);
      return;
    }
    const _isImg = file.type.startsWith("image/") || /\.svg$/i.test(file.name || "");
    const _isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
    if (!_isImg && !_isPdf) {
      setError("יש לבחור קובץ תמונה (PNG/JPG/SVG) או PDF.");
      return;
    }
    setError("");
    setFileObj(file);
    setIsPdf(_isPdf);
  }, [maxSizeMB]);

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

  const handleConfirm = async () => {
    try {
      if (!fileObj) {
        setError("נא לבחור קובץ לוגו תחילה");
        return;
      }
      if (!orderId || !itemSlug) {
        setError("חסרים orderId או itemSlug למיקום הקובץ ב-Storage");
        return;
      }
      setError("");
      setBusyText("מעלה ל-Storage…");

      // רענון טוקן לפני העלאה
      await ensureAuthTokenFresh();
      const user = auth.currentUser;
      if (!user) throw new Error("לא מחובר");

      // 1) העלאה ל-Storage (SDK)
      const storageMeta = await uploadLogoAssets({
        storage,
        uid: user.uid,
        orderId,
        slug: itemSlug,
        side,                // "front" | "back"
        logoId: "logo",      // אפשר לשנות למזהה ייחודי אם תרצה
        originalFile: fileObj,
      });
      // storageMeta: { original: {url,path,bytes,contentType}, webp?: {url,path,bytes,contentType} }

      // 2) שמירה מקומית (Context + LocalStorage) כדי להבטיח שהלוגו יהיה זמין גם בלי העלאה נוספת
      setBusyText("שומר מקומית…");

      // הופך את הקובץ ל-dataURL לשמירה ב-LS (לשחזור אחרי רענון/לוגים)
      const fileToDataURL = (file) =>
        new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onerror = reject;
          fr.onload = () => resolve(fr.result);
          fr.readAsDataURL(file);
        });
      const dataUrl = await fileToDataURL(fileObj);

      // מזהה ייחודי ללוגו הזה (לפי צד)
      const id = `${side}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // 2a) שומר את ה-File בזיכרון (Context)
      try {
        setOriginalInMemory?.(id, fileObj);
      } catch (e) {
        console.warn("[LogoUploadModal] setOriginalInMemory failed:", e);
      }

      // 2b) שומר רשומה ב-LocalStorage
      try {
        const LS_PENDING_LOGOS = "karina:pendingLogos";
        const raw = localStorage.getItem(LS_PENDING_LOGOS);
        const arr = raw ? JSON.parse(raw) : [];
        const rec = {
          id,
          side,                         // front/back
          originalDataUrl: dataUrl,     // המקור כ-dataURL
          name: fileObj.name,
          type: fileObj.type,
          bytes: fileObj.size,
          itemSlug: itemSlug || null,
          orderId: orderId || null,
          ts: Date.now(),
        };
        arr.push(rec);
        localStorage.setItem(LS_PENDING_LOGOS, JSON.stringify(arr));

        // נשמור גם את מזהה הצד שנבחר לצורך שליפה מהירה ב-Cart (collectLogoSource)
        localStorage.setItem(`karina:logoId:${side}`, id);
      } catch (e) {
        console.warn("[LogoUploadModal] failed to write pending logos to LS:", e);
      }

      // 3) מחזירים להורה גם Storage וגם סימון מקומי
      onConfirm?.(
        null,                        // אין preview שנוצר כאן
        fileObj,                     // ה-File המקורי (אם ההורה רוצה להציג/לוג)
        { storage: storageMeta, local: true, id, side }
      );

      // אופציונלי: סגור את המודל לאחר שמירה
      // onClose?.();

    } catch (e) {
      console.error(e);
      setError("העלאת הלוגו/שמירה מקומית נכשלה");
    } finally {
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
            className="border border-2 border-dashed rounded-3 p-4 text-center"
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
                  מגבלת גודל: {maxSizeMB}MB
                </div>
              </>
            ) : (
              <div className="row g-3 align-items-center">
                <div className="col-12 col-md-6">
                  <div className="border rounded-3 p-2 bg-light">
                    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 160 }}>
                      <div className="text-center">
                        <div style={{ fontSize: 42, lineHeight: 1 }}>{isPdf ? "📄" : "🖼️"}</div>
                        <div className="mt-2">{fileObj?.name}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6 text-start text-md-end">
                  <div className="small mb-2">
                    <strong>סוג:</strong> {isPdf ? "PDF" : "תמונה"} <br />
                    <strong>גודל:</strong> {(fileObj?.size / (1024 * 1024)).toFixed(2)}MB
                  </div>

                  {busyText && (
                    <div className="mb-2">
                      <div className="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100">
                        <div className="progress-bar" style={{ width: "100%" }}>
                          {busyText}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="d-flex gap-2 justify-content-md-end">
                    <button className="btn btn-light" onClick={() => setFileObj(null)} disabled={!!busyText}>נקה</button>
                    <button className="btn btn-primary" onClick={handleConfirm} disabled={!!busyText}>
                      העלה לוגו
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
