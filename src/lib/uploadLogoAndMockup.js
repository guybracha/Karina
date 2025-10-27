// src/lib/uploadLogoAndMockup.js
import { ref, uploadBytes, uploadString, getDownloadURL } from "firebase/storage";
import { auth, storage } from "../firebase";

// עוזר: dataURL -> תוכן base64
function stripDataUrl(dataUrl) {
  return dataUrl.replace(/^data:[^,]+,/, "");
}

/** מעלה את קובץ הלוגו המקורי (File) */
export async function uploadOriginalLogo({ file, uid, logoId }) {
  if (!file) throw new Error("missing_file");
  if (!uid) uid = auth.currentUser?.uid;
  if (!uid) throw new Error("not_authed");

  const path = `users_prod/${uid}/logos/${logoId || "logo"}_${Date.now()}_${file.name}`;
  const r = ref(storage, path);
  const snap = await uploadBytes(r, file, { contentType: file.type });
  const url = await getDownloadURL(snap.ref);
  return { path, url, bytes: file.size, contentType: file.type };
}

/** מעלה קובץ הדמיה (dataURL) כ-PNG */
export async function uploadMockup({ dataUrl, uid, slug, side = "front" }) {
  if (!dataUrl) throw new Error("missing_dataUrl");
  if (!uid) uid = auth.currentUser?.uid;
  if (!uid) throw new Error("not_authed");

  const path = `users_prod/${uid}/mockups/${slug}/${side}-${Date.now()}.png`;
  const r = ref(storage, path);
  // אפשר uploadString(data_url) ישירות:
  const snap = await uploadString(r, dataUrl, "data_url"); // ישמור Content-Type= image/png
  const url = await getDownloadURL(snap.ref);
  return { path, url, bytes: (stripDataUrl(dataUrl).length * 3) / 4, contentType: "image/png" };
}
