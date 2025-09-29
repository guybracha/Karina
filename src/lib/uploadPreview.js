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

// מיפוי content-type לסיומת קובץ
function extFromMime(mime = "") {
  if (/webp/i.test(mime)) return "webp";
  if (/png/i.test(mime))  return "png";
  if (/jpeg/i.test(mime)) return "jpg";
  if (/jpg/i.test(mime))  return "jpg";
  return "png"; // ברירת מחדל בטוחה
}

/**
 * מעלה הדמיה (dataURL או Blob/File) ל-Storage ומחזיר { path, url }.
 * נתיב תואם לכללים הציבוריים של previews:
 * users/{uid}/orders/{orderId}/previews/{slug}/{side}.{ext}
 */
export async function uploadPreview({ uid, orderId, slug, side, source }) {
  if (!uid) throw new Error("Missing uid for upload");
  if (!side) throw new Error("Missing side (front/back)");
  const cleanSlug = (slug || "item").replace(/[^\w\-]+/g, "_");

  // קבע MIME+סיומת לפי מקור הקובץ
  let mime = "image/png";
  if (typeof source === "string" && source.startsWith("data:")) {
    const header = source.split(",")[0];
    const m = /data:(.*?);/.exec(header);
    if (m?.[1]) mime = m[1];
  } else if (source instanceof Blob || source instanceof File) {
    mime = source.type || "image/png";
  }
  const ext = extFromMime(mime);

  const filePath = `users/${uid}/orders/${orderId || "draft"}/previews/${cleanSlug}/${side}.${ext}`;
  const fileRef = ref(storage, filePath);

  let snapshot;
  if (typeof source === "string" && source.startsWith("data:")) {
    // העלאת dataURL ישירות
    snapshot = await uploadString(fileRef, source, "data_url", {
      contentType: mime,
      cacheControl: "public,max-age=31536000,immutable",
    });
  } else if (source instanceof Blob || source instanceof File) {
    // העלאת Blob/File
    snapshot = await uploadBytes(fileRef, source, {
      contentType: mime,
      cacheControl: "public,max-age=31536000,immutable",
    });
  } else {
    throw new Error("Unsupported preview source");
  }

  const url = await getDownloadURL(snapshot.ref);
  return { path: filePath, url };
}
