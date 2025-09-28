// src/components/LogoUploadModal.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { auth, storage } from "../firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

/**
 * פרמטרים ברירת מחדל (ניתן לכוון לפי הפרויקט)
 */
const MAX_SIZE_MB = 10;             // גודל קובץ נכנס
const PREVIEW_MAX_SIDE = 1500;      // פיקסלים בצד הארוך להדמיה (לתמונות)
const PREVIEW_QUALITY = 0.85;       // 0..1 לאיכות WebP
const ALLOW_ORIGINAL_UPLOAD = true; // האם לשמור גם מקור (חשוב להדפסה)

export default function LogoUploadModal({
  show,
  onClose,
  onConfirm,
  accept = "image/*,application/pdf",
  maxSizeMB = MAX_SIZE_MB,
  uid,
}) {
  const [dataUrl, setDataUrl] = useState(null);     // preview לתמונות בלבד
  const [fileObj, setFileObj] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [isPdf, setIsPdf] = useState(false);

  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const inputRef = useRef(null);
  const dropRef = useRef(null);
  const currentTaskRef = useRef(null);

  const effectiveUid = uid || auth.currentUser?.uid || null;
  const isAuthed = Boolean(effectiveUid);

  useEffect(() => {
    if (!show) {
      resetState();
    }
  }, [show]);

  function resetState() {
    setDataUrl(null);
    setFileObj(null);
    setIsImage(false);
    setIsPdf(false);
    setError("");
    setIsUploading(false);
    setProgress(0);
    try { currentTaskRef.current?.cancel?.(); } catch {}
    currentTaskRef.current = null;
  }

  const newId = () => Math.random().toString(36).slice(2, 10);

  /** קריאה לקובץ, ולידציה + יצירת preview מיידית לתמונה */
  const readFile = useCallback(
    (file) => {
      if (!file) return;

      if (!isAuthed) {
        setError("יש להתחבר למערכת לפני העלאת לוגו.");
        return;
      }

      const _isImage = file.type.startsWith("image/");
      const _isPdf = file.type === "application/pdf";

      if (!_isImage && !_isPdf) {
        setError("יש לבחור קובץ תמונה (PNG/JPG/SVG) או PDF.");
        return;
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`קובץ גדול מדי. מגבלה: ${maxSizeMB}MB`);
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
        // PDF – אין preview תמונה מצד לקוח
        setDataUrl(null);
      }
    },
    [isAuthed, maxSizeMB]
  );

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    readFile(file);
  };

  // DnD
  useEffect(() => {
    if (!show) return;
    const area = dropRef.current;
    if (!area) return;

    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    const onDrop = (e) => {
      prevent(e);
      const file = e.dataTransfer.files?.[0];
      readFile(file);
      area.classList.remove("border-primary");
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

  /**
   * ייצור Blob ל-preview כ-WebP – לתמונות בלבד (עבור PDF נחזיר null).
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
        if (ratio >= 1) {
          targetW = maxSide;
          targetH = Math.round(maxSide / ratio);
        } else {
          targetH = maxSide;
          targetW = Math.round(maxSide * ratio);
        }
      }

      const canvas = (typeof OffscreenCanvas !== "undefined")
        ? new OffscreenCanvas(targetW, targetH)
        : Object.assign(document.createElement("canvas"), { width: targetW, height: targetH });

      const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
      if (ctx.imageSmoothingEnabled !== undefined) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
      }
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const mime = "image/webp";
      const blob = await (canvas.convertToBlob
        ? canvas.convertToBlob({ type: mime, quality })
        : new Promise((resolve) => (canvas.toBlob(resolve, mime, quality))));
      if (blob) return blob;

      const blobJpeg = await new Promise((resolve) => (canvas.toBlob(resolve, "image/jpeg", quality)));
      if (!blobJpeg) throw new Error("failed to create preview blob");
      return blobJpeg;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /** העלאת קובץ יחיד (resumable) */
  function uploadWithProgress(path, fileOrBlob, contentType, meta = {}) {
    const r = ref(storage, path);
    const task = uploadBytesResumable(r, fileOrBlob, {
      contentType,
      customMetadata: meta,
    });
    currentTaskRef.current = task;
    return new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setProgress(pct);
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve({ path, url, bytes: task.snapshot.totalBytes, contentType });
        }
      );
    });
  }

  /**
   * העלאה:
   * - תמונה: מעלה preview.webp דחוס + (אם מוגדר) original.{ext}
   * - PDF: מעלה רק original.pdf (אין preview תמונה בצד לקוח)
   */
  async function uploadLogoAndPreview(file) {
    if (!isAuthed) throw new Error("not_authed");

    const userId = effectiveUid;
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const logoId = newId();

    if (isPdf) {
      // PDF – רק מקור
      const origPath = `users/${userId}/logos/${logoId}/original/original.pdf`;
      const originalUp = await uploadWithProgress(origPath, file, "application/pdf", {
        kind: "original",
        originalName: file.name || "",
        source: "user-upload",
      });
      return {
        logoId,
        preview: null,
        original: originalUp,
      };
    }

    // תמונות
    const previewBlob = await makePreviewBlob(file);
    let previewUp = null;
    if (previewBlob) {
      const previewPath = `users/${userId}/logos/${logoId}/previews/preview.webp`;
      previewUp = await uploadWithProgress(previewPath, previewBlob, previewBlob.type || "image/webp", {
        kind: "preview",
        originalName: file.name || "",
        source: "user-upload",
      });
    }

    let originalUp = null;
    if (ALLOW_ORIGINAL_UPLOAD) {
      const origPath = `users/${userId}/logos/${logoId}/original/original.${ext}`;
      originalUp = await uploadWithProgress(origPath, file, file.type || "application/octet-stream", {
        kind: "original",
        originalName: file.name || "",
        source: "user-upload",
      });
    }

    return { logoId, preview: previewUp, original: originalUp };
  }

  const handleConfirm = async () => {
    if (!isAuthed) {
      setError("יש להתחבר למערכת לפני העלאת לוגו.");
      return;
    }
    if (!fileObj) {
      setError("נא לבחור קובץ לוגו תחילה");
      return;
    }
    setError("");
    setIsUploading(true);
    setProgress(0);

    try {
      const uploaded = await uploadLogoAndPreview(fileObj);
      setIsUploading(false);

      // נשלח ל-caller:
      // - עבור תמונות: dataUrl (preview ל-canvas), ופרטי ההעלאות
      // - עבור PDF: dataUrl=null, original בלבד
      onConfirm?.(
        isImage ? dataUrl : null,
        fileObj,
        uploaded.preview
          ? {
              logoId: uploaded.logoId,
              path: uploaded.preview.path,
              url: uploaded.preview.url,
              contentType: uploaded.preview.contentType,
              bytes: uploaded.preview.bytes,
              original: uploaded.original || undefined,
            }
          : {
              logoId: uploaded.logoId,
              // ל-PDF/למקרה שאין preview תמונה
              path: uploaded.original?.path,
              url: uploaded.original?.url,
              contentType: uploaded.original?.contentType,
              bytes: uploaded.original?.bytes,
            }
      );
    } catch (e) {
      console.error("upload failed:", e);
      setIsUploading(false);
      setError(e?.message === "not_authed" ? "יש להתחבר למערכת לפני העלאת לוגו." : "העלאת הלוגו נכשלה. נסו שוב.");
    } finally {
      currentTaskRef.current = null;
    }
  };

  const cancelUpload = () => {
    try { currentTaskRef.current?.cancel?.(); } catch {}
    setIsUploading(false);
    setProgress(0);
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
            <button className="btn btn-sm btn-outline-secondary" onClick={onClose} aria-label="סגור" disabled={isUploading}>
              סגור
            </button>
          </div>

          {!isAuthed && (
            <div className="alert alert-warning">
              יש להתחבר למערכת כדי להעלות לוגו.
            </div>
          )}

          {/* אזור DnD / בחירת קובץ */}
          <div
            ref={dropRef}
            className={`border border-2 border-dashed rounded-3 p-4 text-center ${!isAuthed ? "opacity-75" : ""}`}
            style={{ borderStyle: "dashed" }}
            aria-disabled={!isAuthed}
          >
            {!fileObj ? (
              <>
                <p className="mb-3">
                  גררו לכאן קובץ <strong>PNG/JPG/SVG</strong> או <strong>PDF</strong>, או בחרו ידנית
                </p>
                <div className="d-flex justify-content-center gap-2">
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => isAuthed && inputRef.current?.click()}
                    disabled={!isAuthed}
                  >
                    בחר קובץ
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    accept={accept}
                    className="d-none"
                    onChange={onInputChange}
                    disabled={!isAuthed}
                  />
                </div>
                <div className="text-muted small mt-2">
                  מומלץ לתמונות: עד {PREVIEW_MAX_SIDE}px בצד הארוך (WebP). מגבלה כללית: {maxSizeMB}MB
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
                      // PDF – תצוגה טקסטואלית פשוטה
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

                  {isUploading && (
                    <div className="mb-2">
                      <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
                        <div className="progress-bar" style={{ width: `${progress}%` }}>
                          {progress}%
                        </div>
                      </div>
                      <div className="d-flex justify-content-end gap-2 mt-2">
                        <button className="btn btn-sm btn-outline-danger" onClick={cancelUpload}>
                          בטל העלאה
                        </button>
                      </div>
                      <div className="text-muted small mt-1">מעלה לוגו ל-Storage…</div>
                    </div>
                  )}

                  <div className="d-flex gap-2 justify-content-md-end">
                    <button
                      className="btn btn-light"
                      onClick={resetState}
                      disabled={isUploading}
                    >
                      נקה
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleConfirm}
                      disabled={isUploading || !isAuthed}
                      title={!isAuthed ? "יש להתחבר למערכת" : undefined}
                    >
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
