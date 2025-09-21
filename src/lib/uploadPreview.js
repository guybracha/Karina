// src/lib/uploadPreview.js
import { storage } from "../firebase";
import { ref, uploadBytes, uploadString, getDownloadURL } from "firebase/storage";

// ממיר dataURL ל-Blob (אם תרצה להשתמש ב-uploadBytes)
export function dataURLtoBlob(dataURL) {
  const [header, data] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)[1] || "image/png";
  const binStr = atob(data);
  const len = binStr.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = binStr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

/**
 * מעלה הדמיה (dataURL או Blob/File) ל-Storage ומחזיר downloadURL.
 * path: users/{uid}/orders/{orderId}/{slug}/{side}.png
 */
export async function uploadPreview({ uid, orderId, slug, side, source }) {
  if (!uid) throw new Error("Missing uid for upload");
  const cleanSlug = (slug || "item").replace(/[^\w\-]+/g, "_");
  const filePath = `users/${uid}/orders/${orderId || "draft"}/${cleanSlug}/${side}.png`;
  const fileRef = ref(storage, filePath);

  let snapshot;
  if (typeof source === "string" && source.startsWith("data:")) {
    // להעלאת dataURL ישירה
    snapshot = await uploadString(fileRef, source, "data_url", {
      contentType: "image/png",
      cacheControl: "public,max-age=31536000",
    });
  } else if (source instanceof Blob || source instanceof File) {
    snapshot = await uploadBytes(fileRef, source, {
      contentType: source.type || "image/png",
      cacheControl: "public,max-age=31536000",
    });
  } else {
    throw new Error("Unsupported preview source");
  }
  const url = await getDownloadURL(snapshot.ref);
  return { path: filePath, url };
}
