// src/components/LogoUploadModal.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { uploadItemLogoAssets } from "../lib/uploadItemLogoAssets"; // ↑ משתמשים רק בזה
import { auth, ensureAuthTokenFresh } from "../firebase";           // רענון טוקן לפני העלאה

export default function LogoUploadModal({
  show,
  onClose,
  onConfirm,
  // מינימום פרופסים הדרושים כדי לשייך ללוגו להזמנה/פריט:
  orderId,           // מזהה הזמנה פעילה
  itemSlug,          // למשל "tshirt-gray"
  side = "front",    // "front" | "back"
  accept = "image/*,application/pdf,application/svg+xml",
  maxSizeMB = 10,
}) {
  const [fileObj, setFileObj] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [error, setError] = useState("");
  const [busyText, setBusyText] = useState("");

  const inputRef = useRef(null);
  const dropRef = useRef(null);

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

      // מבטיחים טוקן טרי לפני ההעלאה (App Check/Rules)
      await ensureAuthTokenFresh(); // ראה firebase.js

      const user = auth.currentUser;
      if (!user) throw new Error("לא מחובר");

      // מעלה את קובץ המקור; אין preview ואין mockup
      const storageMeta = await uploadItemLogoAssets({
        uid: user.uid,
        orderId,
        slug: itemSlug,
        side,
        logoId: "logo",      // מזהה פשוט; אפשר לשלב timestamp אם רוצים
        file: fileObj,
        dataUrlFallback: null,
      });
      // storageMeta: { originalUrl, webpUrl, pathOriginal, pathWebp, bytes, contentType }

      // מחזירים להורה רק מטא-דאטה של ההעלאה (לשמירה במסמך ההזמנה)
      onConfirm?.(
        null,                 // אין preview
        fileObj,              // המקור שנבחר
        { storage: storageMeta, local: false }
      );
    } catch (e) {
      console.error(e);
      setError("העלאת הלוגו נכשלה");
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
