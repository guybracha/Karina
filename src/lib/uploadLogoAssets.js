// src/lib/uploadLogoAssets.js
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/** המרה של dataURL -> Blob */
function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(",");
  const mime = head.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Blob([buf], { type: mime });
}

/** המרת תמונה (Blob/DataURL) ל־WebP */
async function imageToWebpBlob(src, quality = 0.92, maxSide = 3000) {
  const blob = typeof src === "string" ? dataUrlToBlob(src) : src;
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    let w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) throw new Error("decode-failed");
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
    const out = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!out) throw new Error("to-webp-failed");
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function extFromName(name = "", fallback = "bin") {
  const m = String(name).match(/\.(\w{1,10})$/i);
  return (m ? m[1].toLowerCase() : fallback);
}

/**
 * מעלה מקור + webp (אם זה תמונה).
 * אם נמסרו slug/side — ישמור תחת assets/{slug}/{side}/
 * אחרת ישמור תחת logos/{original|webp}/
 */
export async function uploadLogoAssets({
  storage,
  uid,
  orderId,
  logoId,
  originalFile,       // File/Blob (עדיף)
  originalDataUrl,    // dataURL (אלטרנטיבה)
  slug,               // אופציונלי: item slug
  side,               // אופציונלי: "front"/"back"
}) {
  if (!uid || !orderId || !logoId) throw new Error("missing-args");

  // בחר מקור
  let blob, contentType, ext;
  if (originalFile) {
    blob = originalFile;
    contentType = originalFile.type || "application/octet-stream";
    ext = extFromName(originalFile.name, "bin");
  } else if (originalDataUrl) {
    const b = dataUrlToBlob(originalDataUrl);
    blob = b;
    contentType = b.type || "application/octet-stream";
    ext = extFromName(contentType.split("/")[1] || "", "bin");
  } else {
    return {};
  }

  // בסיס נתיב
  const now = Date.now();
  const base = (slug && side)
    ? `users/${uid}/orders/${orderId}/assets/${slug}/${side}`
    : `users/${uid}/orders/${orderId}/logos`;

  // העלאת המקור
  const originalPath = `${base}/original/${logoId}_${now}.${ext}`;
  const originalRef = ref(storage, originalPath);
  const origSnap = await uploadBytes(originalRef, blob, {
    contentType,
    cacheControl: "private, max-age=0",
  });
  const originalUrl = await getDownloadURL(origSnap.ref);

  const result = {
    original: {
      url: originalUrl,
      path: originalPath,
      bytes: blob.size || 0,
      contentType,
    },
  };

  // אם זה תמונה – נעלה גם WebP
  if (contentType.startsWith("image/")) {
    const webpBlob = await imageToWebpBlob(originalDataUrl || blob, 0.92);
    const webpPath = `${base}/webp/${logoId}_${now}.webp`;
    const webpRef = ref(storage, webpPath);
    const webpSnap = await uploadBytes(webpRef, webpBlob, {
      contentType: "image/webp",
      cacheControl: "private, max-age=0",
    });
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
