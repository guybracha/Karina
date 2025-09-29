// src/lib/uploadPreview.js
import { storage } from "../firebase";
import { ref, uploadBytes, uploadString, getDownloadURL } from "firebase/storage";

// ממיר dataURL ל-Blob (אם תרצה להשתמש ב-uploadBytes)
export function dataURLtoBlob(dataURL) {
  const [header, data] = dataURL.split(",");
  const mimeMatch = /data:(.*?);/.exec(header);
  const mime = mimeMatch?.[1] || "image/png";
  const binStr = atob(data);
  const len = binStr.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

// קורא Image מהדפדפן ומחזיר canvas עם התמונה
function loadToCanvas(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);
      resolve({ canvas: c, width: img.width, height: img.height });
    };
    img.onerror = reject;
    // חשוב ל-dataURL/Blob-URL; אם הטמעת דומיין אחר, תצטרך img.crossOrigin = "anonymous"
    img.src = src;
  });
}

// הופך Blob/File ל-dataURL (אם צריך)
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

/**
 * מעלה הדמיה (source = dataURL או Blob/File) לשני פורמטים (PNG + WebP).
 * מחזיר:
 * {
 *   png: { path, url },
 *   webp: { path, url },
 *   size: { width, height }
 * }
 *
 * שמות קבצים ייחודיים (timestamp) כדי למנוע בעיות קאשינג.
 * נתיב: users/{uid}/orders/{orderId}/previews/{slug}/{side}.{ext}
 */
export async function uploadPreview({
  uid,
  orderId = "draft",
  slug,
  side,                 // "front" | "back"
  source,               // dataURL | Blob | File
  webpQuality = 0.95,   // אפשר לשנות
  cacheSeconds = 31536000, // שנה
}) {
  if (!uid) throw new Error("Missing uid for upload");
  if (!side) throw new Error("Missing side (front/back)");
  const cleanSlug = (slug || "item").replace(/[^\w\-]+/g, "_");
  const ts = Date.now();

  // 1) נוודא שיש לנו dataURL לעבוד איתו
  let dataUrl;
  let inputMime = "image/png";
  if (typeof source === "string" && source.startsWith("data:")) {
    dataUrl = source;
    const m = /data:(.*?);/.exec(source.split(",")[0]);
    if (m?.[1]) inputMime = m[1];
  } else if (source instanceof Blob || source instanceof File) {
    inputMime = source.type || "image/png";
    dataUrl = await blobToDataURL(source);
  } else {
    throw new Error("Unsupported preview source");
  }

  // 2) מעבד לקנבס אחד ואז מוציא שני פורמטים
  const { canvas, width, height } = await loadToCanvas(dataUrl);

  // יצירת dataURL ל-PNG
  const pngDataUrl = canvas.toDataURL("image/png"); // ללא דחיסה מאבדת
  // יצירת dataURL ל-WebP (אם הדפדפן תומך; ברובם כן)
  let webpDataUrl = null;
  try {
    webpDataUrl = canvas.toDataURL("image/webp", webpQuality);
    if (!/^data:image\/webp/i.test(webpDataUrl)) {
      webpDataUrl = null; // fallback אם לא קיבלנו webp
    }
  } catch {
    webpDataUrl = null;
  }

  // 3) העלאה ל-Storage (עם שמות ייחודיים למניעת קאש)
  const basePath = `users/${uid}/orders/${orderId}/previews/${cleanSlug}`;
  const cacheControl = `public,max-age=${cacheSeconds},immutable`;

  // PNG
  const pngPath = `${basePath}/${side}_${ts}.png`;
  const pngRef = ref(storage, pngPath);
  const pngSnap = await uploadString(pngRef, pngDataUrl, "data_url", {
    contentType: "image/png",
    cacheControl,
  });
  const pngUrl = await getDownloadURL(pngSnap.ref);

  // WebP (אופציונלי)
  let webpPath = null;
  let webpUrl = null;
  if (webpDataUrl) {
    webpPath = `${basePath}/${side}_${ts}.webp`;
    const webpRef = ref(storage, webpPath);
    const webpSnap = await uploadString(webpRef, webpDataUrl, "data_url", {
      contentType: "image/webp",
      cacheControl,
    });
    webpUrl = await getDownloadURL(webpSnap.ref);
  }

  return {
    png: { path: pngPath, url: pngUrl },
    webp: webpUrl ? { path: webpPath, url: webpUrl } : null,
    size: { width, height },
  };
}
