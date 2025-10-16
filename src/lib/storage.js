// src/lib/storage.js
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

// מזהה פשוט ללוגו
const newId = () => Math.random().toString(36).slice(2, 10);

/* =========================
 * 1) העלאת לוגו לחשבון המשתמש
 * ========================= */
export async function uploadUserLogo({ uid, file }) {
  if (!uid || !file) throw new Error("uid/file missing");
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const logoId = newId();

  const path = `users/${uid}/logos/${logoId}/original.${ext}`;
  const r = ref(storage, path);
  const task = uploadBytesResumable(r, file, {
    contentType: file.type || "image/png",
    customMetadata: {
      originalName: file.name || "",
      source: "user-upload",
    },
  });

  await new Promise((res, rej) => task.on("state_changed", null, rej, res));
  const url = await getDownloadURL(task.snapshot.ref);

  return { logoId, path, url, contentType: file.type || "image/png" };
}

/* =========================================
 * 2) העלאת לוגו לנכסי הזמנה (draft/assets)
 *    נתיבים תואמים לכללי Storage שלך
 * ========================================= */
export async function uploadOrderLogo(file, { uid, slug, side }) {
  if (!uid || !file || !slug || !side) {
    throw new Error("uid/file/slug/side missing");
  }
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const ts = Date.now();
  // נתיב תואם לרולס שלך:
  // match /users/{uid}/orders/{orderId}/{rest=**}
  // כאן אנחנו משתמשים orderId="draft"
  const path = `users/${uid}/orders/draft/assets/${slug}/${side}/original/logo_${ts}.${ext}`;

  const r = ref(storage, path);
  const task = uploadBytesResumable(r, file, {
    contentType: file.type || "image/png", // חשוב עבור הכללים שלך
    customMetadata: {
      originalName: file.name || "",
      source: "order-upload",
      slug,
      side,
    },
  });

  await new Promise((res, rej) => task.on("state_changed", null, rej, res));
  const url = await getDownloadURL(task.snapshot.ref);

  return { path, url, contentType: file.type || "image/png" };
}

/* =========================================
 * 3) המרת path ל-URL חתום (לשימוש בתצוגה)
 * ========================================= */
export async function getURLByPath(path) {
  if (!path) throw new Error("path missing");
  const r = ref(storage, path);
  return await getDownloadURL(r);
}
