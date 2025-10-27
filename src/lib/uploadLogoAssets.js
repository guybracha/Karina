// src/lib/uploadLogoAssets.js
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { auth, storage as defaultStorage, ensureAuthTokenFresh } from "../firebase";

/** ─────────────────────────────────────────────────────────────
 * dataURL -> Blob
 * ───────────────────────────────────────────────────────────── */
function dataUrlToBlob(dataUrl) {
  const [head, b64] = String(dataUrl).split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const bin = atob(b64 || "");
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

/** ─────────────────────────────────────────────────────────────
 * האם התוכן רסטר (ניתן לרינדור לקנבס) לצורך המרת WebP
 * SVG/PDF אינם רסטר — נדלג על המרה עבורם
 * ───────────────────────────────────────────────────────────── */
function isRasterImageContentType(ct = "") {
  const t = (ct || "").toLowerCase();
  return t.startsWith("image/") && !t.includes("svg") && !t.includes("pdf");
}

/** ─────────────────────────────────────────────────────────────
 * המרת תמונה (Blob או dataURL) ל־WebP (רסטר בלבד)
 * משתמש ב-createImageBitmap אם זמין, עם נפילה ל-HTMLImageElement
 * ───────────────────────────────────────────────────────────── */
async function imageToWebpBlob(src, {
  quality = 0.92,
  maxSide = 3000,
} = {}) {
  const blob = typeof src === "string" ? dataUrlToBlob(src) : src;

  // אם זה לא רסטר, אין טעם לנסות להמיר
  if (!isRasterImageContentType(blob?.type || "")) {
    throw new Error("non-raster-image");
  }

  // יצירת מקור לתמונה
  let bitmap;
  try {
    if (typeof createImageBitmap === "function") {
      bitmap = await createImageBitmap(blob);
    } else {
      // fallback לדקורד תמונה
      const url = URL.createObjectURL(blob);
      try {
        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = url;
        });
        // עטוף ב-ImageBitmap-like
        bitmap = { width: img.naturalWidth, height: img.naturalHeight, _img: img };
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  } catch (e) {
    throw new Error("decode-failed");
  }

  let w = bitmap.width, h = bitmap.height;
  if (!w || !h) throw new Error("decode-failed");

  // התאמת ממדים
  if (Math.max(w, h) > maxSide) {
    const r = w / h;
    if (r >= 1) { w = maxSide; h = Math.round(maxSide / r); }
    else { h = maxSide; w = Math.round(maxSide * r); }
  }

  // ציור לקנבס
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  if (bitmap._img) {
    ctx.drawImage(bitmap._img, 0, 0, w, h);
  } else {
    ctx.drawImage(bitmap, 0, 0, w, h);
  }

  // יצירת Blob בפורמט WebP
  const out = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!out) throw new Error("to-webp-failed");
  return out;
}

/** ─────────────────────────────────────────────────────────────
 * חילוץ סיומת לשם קובץ
 * ───────────────────────────────────────────────────────────── */
function extFromName(name = "", fallback = "bin") {
  const m = String(name).match(/\.([a-z0-9]{1,10})$/i);
  return (m ? m[1].toLowerCase() : fallback);
}

/** ─────────────────────────────────────────────────────────────
 * העלאה עם Resumable + callback התקדמות
 * מחזיר snapshot אחרון (בהשלמה)
 * ───────────────────────────────────────────────────────────── */
function uploadResumableWithProgress(storageRef, data, metadata, { signal, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, data, metadata);

    const abort = () => {
      try { task.cancel(); } catch {}
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) return abort();
      signal.addEventListener("abort", abort, { once: true });
    }

    task.on("state_changed",
      (snap) => {
        if (onProgress) {
          const pct = snap.totalBytes ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0;
          onProgress({ pct, bytesTransferred: snap.bytesTransferred, totalBytes: snap.totalBytes, state: snap.state });
        }
      },
      (err) => reject(err),
      () => resolve(task.snapshot)
    );
  });
}

/** ─────────────────────────────────────────────────────────────
 * API ראשי: מעלה מקור + (אופציונלי) WebP
 * פרמטרים:
 *  - storage: אפשר להשאיר undefined — נשתמש ב-storage הדיפולטי מה־firebase.js
 *  - uid: חייב להתאים ל-auth.currentUser.uid (כללי ה-Rules)
 *  - orderId, logoId — מזהים לנתיב
 *  - originalFile | originalDataUrl — מקור
 *  - slug, side — אם נמסרו, ישמר תחת assets/{slug}/{side}, אחרת תחת logos/
 *  - onProgress, signal — אופציונלי לניהול UI/ביטול
 * ───────────────────────────────────────────────────────────── */
export async function uploadLogoAssets({
  storage = defaultStorage,
  uid,
  orderId,
  logoId,
  originalFile,       // File/Blob (מומלץ)
  originalDataUrl,    // dataURL (אלטרנטיבה)
  slug,               // אופציונלי: item slug
  side,               // אופציונלי: "front"/"back"
  onProgress,         // (evt) => {}
  signal,             // AbortSignal
}) {
  if (!uid || !orderId || !logoId) throw new Error("missing-args");

  // אימות משתמש וכללי Rules
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) throw new Error("not-signed-in");
  if (currentUid !== uid) throw new Error("uid-mismatch");

  // רענון טוקן לפני העלאה (חשוב עם App Check/Rules)
  try {
    await ensureAuthTokenFresh();
  } catch (e) {
    // נרשום אך לא נסתיר — אם אין משתמש, זה ייזרק ממילא
    console.warn("[uploadLogoAssets] ensureAuthTokenFresh failed:", e?.message || e);
  }

  // בחירת מקור
  let blob, contentType, ext;
  if (originalFile) {
    blob = originalFile;
    contentType = originalFile.type || "application/octet-stream";
    ext = extFromName(originalFile.name, (contentType.split("/")[1] || "bin"));
  } else if (originalDataUrl) {
    const b = dataUrlToBlob(originalDataUrl);
    blob = b;
    contentType = b.type || "application/octet-stream";
    ext = contentType.includes("/") ? contentType.split("/")[1] : "bin";
  } else {
    throw new Error("no-input");
  }

  // בסיס נתיב
  const now = Date.now();
  const base = (slug && side)
    ? `users_prod/${uid}/orders_prod/${orderId}/assets/${slug}/${side}`
    : `users_prod/${uid}/orders_prod/${orderId}/logos`;

  const metadata = {
    contentType,
    cacheControl: "private, max-age=0",
  };

  // ── העלאת המקור (Resumable + התקדמות) ─────────────────────
  const originalName = `${logoId}_${now}.${ext}`;
  const originalPath = `${base}/original/${originalName}`;
  const originalRef = ref(storage, originalPath);

  let origSnap;
  try {
    origSnap = await uploadResumableWithProgress(originalRef, blob, metadata, { signal, onProgress });
  } catch (err) {
    // החזר שגיאה עם מידע שימושי
    const code = err?.code || err?.name || "upload-failed";
    const msg = err?.message || String(err);
    console.error("[uploadLogoAssets] original upload failed:", code, msg);
    throw Object.assign(new Error(msg), { code, stage: "original" });
  }

  let originalUrl = "";
  try {
    originalUrl = await getDownloadURL(origSnap.ref);
  } catch (e) {
    console.warn("[uploadLogoAssets] getDownloadURL(original) failed:", e?.message || e);
  }

  const result = {
    original: {
      url: originalUrl || null,
      path: originalPath,
      bytes: blob.size || 0,
      contentType,
      name: originalName,
    },
  };

  // ── המרת WebP (רק לרסטר) ───────────────────────────────────
  if (isRasterImageContentType(contentType)) {
    try {
      // אם הבאנו dataURL — נשתמש ישירות בו כדי להימנע מהפסדי איכות מצטברים
      const webpBlob = await imageToWebpBlob(originalDataUrl || blob, { quality: 0.92, maxSide: 3000 });
      const webpPath = `${base}/webp/${logoId}_${now}.webp`;
      const webpRef = ref(storage, webpPath);

      const webpSnap = await uploadResumableWithProgress(webpRef, webpBlob, {
        contentType: "image/webp",
        cacheControl: "private, max-age=0",
      }, { signal });

      let webpUrl = "";
      try {
        webpUrl = await getDownloadURL(webpSnap.ref);
      } catch (e) {
        console.warn("[uploadLogoAssets] getDownloadURL(webp) failed:", e?.message || e);
      }

      result.webp = {
        url: webpUrl || null,
        path: webpPath,
        bytes: webpBlob.size || 0,
        contentType: "image/webp",
        name: `${logoId}_${now}.webp`,
      };
    } catch (e) {
      // אם נכשל (למשל תמונה פגומה), לא נכשיל את כל הפעולה — רק נציין
      const msg = e?.message || String(e);
      if (msg === "non-raster-image") {
        // אין מה להמיר — שקט
      } else {
        console.warn("[uploadLogoAssets] webp conversion/upload skipped due to error:", msg);
      }
    }
  }

  return result;
}
