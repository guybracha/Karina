// src/lib/uploadItemLogoAssets.js
import { ref, uploadBytes, uploadString, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

/**
 * מעלה לוגו לצד מסוים של פריט בתוך הזמנה:
 * PRIVATE (תואם לכללים):
 * users/{uid}/orders/{orderId}/assets/{slug}/{side}/original_*.(ext)
 * ובמידה וזה תמונה – יוצר גם original_*.webp
 *
 * @returns {
 *   originalUrl, webpUrl, pathOriginal, pathWebp, bytes, contentType
 * }
 */
export async function uploadItemLogoAssets({
  uid,
  orderId,
  slug,
  side,            // "front" | "back"
  logoId,          // מזהה לוגו/שם
  file,            // File | null
  dataUrlFallback, // string | null (dataURL)
}) {
  if (!uid || !orderId || !slug || !side) return null;

  // —— נתיב פרטי תואם כללים (assets) ——
  const baseDir = `users/${uid}/orders/${orderId}/assets/${slug}/${side}`;

  // עוזרות
  const ts = Date.now();
  const safeId = String(logoId || "logo").replace(/[^\w\-]+/g, "_");
  const cleanSlug = String(slug || "item").replace(/[^\w\-]+/g, "_");

  const extFromMime = (mime = "") => {
    if (/svg/i.test(mime)) return "svg";
    if (/webp/i.test(mime)) return "webp";
    if (/png/i.test(mime))  return "png";
    if (/jpeg/i.test(mime)) return "jpg";
    if (/jpg/i.test(mime))  return "jpg";
    if (/pdf/i.test(mime))  return "pdf";
    return "bin";
  };

  // —————————— 1) העלאת המקור ——————————
  let contentType = "application/octet-stream";
  let pathOriginal = null;
  let originalUrl = null;
  let bytes = 0;

  if (file) {
    contentType = file.type || "application/octet-stream";
    const safeExt = (file.name?.split(".").pop() || extFromMime(contentType)).toLowerCase();
    const fileName = `original_${cleanSlug}_${safeId}_${ts}.${safeExt}`.replace(/[^\w.\-]+/g, "_");
    pathOriginal = `${baseDir}/${fileName}`;

    const r = ref(storage, pathOriginal);
    const snap = await uploadBytes(r, file, {
      contentType,
      // קבצים פרטיים – cacheControl לא הכרחי; אם תרצה קבצים “קבועים” בצד לקוח, אפשר להוסיף:
      // cacheControl: "private, max-age=0, no-transform",
    });
    originalUrl = await getDownloadURL(snap.ref);
    bytes = file.size || 0;
  } else if (typeof dataUrlFallback === "string" && dataUrlFallback.startsWith("data:")) {
    const m = /^data:([^;]+);/i.exec(dataUrlFallback);
    contentType = m?.[1] || "application/octet-stream";
    const ext = extFromMime(contentType);
    const fileName = `original_${cleanSlug}_${safeId}_${ts}.${ext}`;
    pathOriginal = `${baseDir}/${fileName}`;

    const r = ref(storage, pathOriginal);
    const snap = await uploadString(r, dataUrlFallback, "data_url", {
      contentType,
      // cacheControl: "private, max-age=0, no-transform",
    });
    originalUrl = await getDownloadURL(snap.ref);

    try {
      const b64 = dataUrlFallback.split(",")[1] || "";
      bytes = Math.floor((b64.length * 3) / 4);
    } catch { /* noop */ }
  } else {
    return null; // אין מקור להעלות
  }

  // —————————— 2) יצירת WEBP (רק אם זה תמונה) ——————————
  let webpUrl = null;
  let pathWebp = null;

  if (contentType.startsWith("image/") && !/svg|pdf/i.test(contentType)) {
    try {
      const dataUrlFromFile = (blobOrFile) =>
        new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(blobOrFile);
        });

      // מקור לציור על קנבס
      const sourceDataUrl = file
        ? await dataUrlFromFile(file)
        : dataUrlFallback;

      if (typeof sourceDataUrl === "string") {
        const webpDataUrl = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);
            // איכות 0.95 – אפשר לשנות
            const out = c.toDataURL("image/webp", 0.95);
            resolve(out);
          };
          img.onerror = reject;
          img.src = sourceDataUrl;
        });

        pathWebp = `${baseDir}/original_${cleanSlug}_${safeId}_${ts}.webp`;
        const rWebp = ref(storage, pathWebp);
        await uploadString(rWebp, webpDataUrl, "data_url", {
          contentType: "image/webp",
          // cacheControl: "private, max-age=0, no-transform",
        });
        webpUrl = await getDownloadURL(rWebp);
      }
    } catch (e) {
      console.warn("[uploadItemLogoAssets] WEBP conversion failed:", e);
    }
  }

  return { originalUrl, webpUrl, pathOriginal, pathWebp, bytes, contentType };
}
