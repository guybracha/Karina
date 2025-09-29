// src/lib/uploadLogoAssets.js
import { ref, uploadBytes, uploadString, getDownloadURL } from "firebase/storage";

/** המרה של dataURL -> Blob */
function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)[1] || "application/octet-stream";
  const bin = atob(b64);
  const len = bin.length;
  const buf = new Uint8Array(len);
  for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

/** המרת תמונה (Blob/DataURL) ל־WebP באיכות נתונה */
async function imageToWebpBlob(src, quality = 0.9, maxSide = 3000) {
  const blob = typeof src === "string" ? dataUrlToBlob(src) : src;
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    let { naturalWidth: w, naturalHeight: h } = img;
    if (!w || !h) throw new Error("decode-failed");
    // ריסייז עדין אם קובץ ענק
    if (Math.max(w, h) > maxSide) {
      const r = w / h;
      if (r >= 1) { w = maxSide; h = Math.round(maxSide / r); }
      else { h = maxSide; w = Math.round(maxSide * r); }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    const out = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality)
    );
    if (!out) throw new Error("to-webp-failed");
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * מעלה לוגו מקורי + WebP (אם תמונה) תחת orders/{orderId}/logos/...
 * - לוקח את הקובץ המקורי (File/Blob) או dataURL
 * - קובע שמות קבצים לפי logoId
 * @returns {Promise<{original?:{url,path,bytes,contentType}, webp?:{url,path,bytes,contentType}}>}
 */
export async function uploadLogoAssets({ storage, uid, orderId, logoId, originalFile, originalDataUrl }) {
  if (!uid || !orderId || !logoId) throw new Error("missing-args");

  // קבצים להעלאה
  let original = null;  // {blob, contentType, ext}
  if (originalFile) {
    const ext = (originalFile.name?.split(".").pop() || "").toLowerCase();
    original = { blob: originalFile, contentType: originalFile.type || "application/octet-stream", ext };
  } else if (originalDataUrl) {
    const blob = dataUrlToBlob(originalDataUrl);
    const ext = (blob.type.split("/")[1] || "bin").toLowerCase();
    original = { blob, contentType: blob.type, ext };
  } else {
    // אין מקור – אין מה להעלות
    return {};
  }

  // העלאת המקור
  const origPath = `users/${uid}/orders/${orderId}/logos/original/${logoId}.${original.ext || "bin"}`;
  const origRef = ref(storage, origPath);
  const origSnap = await uploadBytes(origRef, original.blob, { contentType: original.contentType });
  const origUrl = await getDownloadURL(origSnap.ref);

  const result = {
    original: {
      url: origUrl,
      path: origPath,
      bytes: original.blob.size || 0,
      contentType: original.contentType,
    }
  };

  // אם זה תמונה – נעלה גם WebP
  if (original.contentType.startsWith("image/")) {
    const webpBlob = await imageToWebpBlob(originalDataUrl || original.blob, 0.92);
    const webpPath = `users/${uid}/orders/${orderId}/logos/webp/${logoId}.webp`;
    const webpRef = ref(storage, webpPath);
    const webpSnap = await uploadBytes(webpRef, webpBlob, { contentType: "image/webp" });
    const webpUrl = await getDownloadURL(webpSnap.ref);
    result.webp = {
      url: webpUrl,
      path: webpPath,
      bytes: webpBlob.size || 0,
      contentType: "image/webp",
    };
  }

  return result;
}
