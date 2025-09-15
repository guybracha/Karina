import React, { useCallback, useEffect, useRef, useState } from "react";

/**
 * LogoUploadModal
 * מודאל העלאת לוגו עם DnD + תצוגה מקדימה.
 *
 * Props:
 * - show: boolean                 // האם פתוח
 * - onClose: () => void           // סגירה
 * - onConfirm: (dataUrl, file) => void  // מאשר ומחזיר DataURL + File להצבה במודאל הבא
 * - accept?: string               // ברירת מחדל: "image/*"
 * - maxSizeMB?: number            // ברירת מחדל: 10
 */
export default function LogoUploadModal({
  show,
  onClose,
  onConfirm,
  accept = "image/*",
  maxSizeMB = 10,
}) {
  const [dataUrl, setDataUrl] = useState(null);
  const [fileObj, setFileObj] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const dropRef = useRef(null);

  // ניקוי מצב כאשר נסגר
  useEffect(() => {
    if (!show) {
      setDataUrl(null);
      setFileObj(null);
      setError("");
    }
  }, [show]);

  const readFile = useCallback((file) => {
    if (!file) return;
    // ולידציה בסיסית
    if (!file.type.startsWith("image/")) {
      setError("יש לבחור קובץ תמונה (PNG/JPG/SVG)");
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`קובץ גדול מדי. מגבלה: ${maxSizeMB}MB`);
      return;
    }
    setError("");
    setFileObj(file);
    const reader = new FileReader();
    reader.onload = () => setDataUrl(reader.result);
    reader.readAsDataURL(file);
  }, [maxSizeMB]);

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    readFile(file);
  };

  // Drag & Drop
  useEffect(() => {
    if (!show) return;
    const area = dropRef.current;
    if (!area) return;

    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e) => {
      prevent(e);
      const file = e.dataTransfer.files?.[0];
      readFile(file);
    };
    const onDragEnter = (e) => { prevent(e); area.classList.add("border-primary"); };
    const onDragLeave = (e) => { prevent(e); area.classList.remove("border-primary"); };

    area.addEventListener("dragenter", onDragEnter);
    area.addEventListener("dragover", prevent);
    area.addEventListener("dragleave", onDragLeave);
    area.addEventListener("drop", onDrop);

    return () => {
      area.removeEventListener("dragenter", onDragEnter);
      area.removeEventListener("dragover", prevent);
      area.removeEventListener("dragleave", onDragLeave);
      area.removeEventListener("drop", onDrop);
    };
  }, [show, readFile]);

  const handleConfirm = () => {
    if (!dataUrl || !fileObj) {
      setError("נא לבחור קובץ לוגו תחילה");
      return;
    }
    onConfirm?.(dataUrl, fileObj);
  };

  if (!show) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100"
      style={{ background: "rgba(0,0,0,.5)", zIndex: 1050 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logoUploadTitle"
    >
      <div className="container h-100 d-flex align-items-center">
        <div className="bg-white rounded-4 shadow p-3 w-100" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h5 id="logoUploadTitle" className="m-0">העלאת לוגו</h5>
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose} aria-label="סגור">סגור</button>
          </div>

          {/* אזור DnD / בחירת קובץ */}
          <div
            ref={dropRef}
            className="border border-2 border-dashed rounded-3 p-4 text-center"
            style={{ borderStyle: "dashed" }}
          >
            {!dataUrl ? (
              <>
                <p className="mb-3">גררו לכאן קובץ PNG/JPG/SVG או בחרו ידנית</p>
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-outline-primary" onClick={() => inputRef.current?.click()}>
                    בחר קובץ
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="d-none"
                    onChange={onInputChange}
                  />
                </div>
                <div className="text-muted small mt-2">מקסימום {maxSizeMB}MB</div>
              </>
            ) : (
              <div className="row g-3 align-items-center">
                <div className="col-12 col-md-6">
                  <div className="ratio ratio-1x1 border rounded-3 overflow-hidden bg-light">
                    {/* תצוגה מקדימה */}
                    <img src={dataUrl} alt="תצוגת לוגו" style={{ objectFit: "contain" }} />
                  </div>
                </div>
                <div className="col-12 col-md-6 text-start text-md-end">
                  <div className="small mb-2">
                    <strong>שם קובץ:</strong> {fileObj?.name} <br />
                    <strong>גודל:</strong> {(fileObj?.size / (1024 * 1024)).toFixed(2)}MB
                  </div>
                  <div className="d-flex gap-2 justify-content-md-end">
                    <button className="btn btn-light" onClick={() => { setDataUrl(null); setFileObj(null); }}>
                      נקה
                    </button>
                    <button className="btn btn-primary" onClick={handleConfirm}>
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
