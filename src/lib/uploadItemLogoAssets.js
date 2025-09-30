/* eslint "object-curly-spacing": ["error","never"] */

import {getStorage,ref,uploadBytes,getDownloadURL} from "firebase/storage";
const storage = getStorage();

function mimeToExt(type = "", fallback = "bin") {
  const t = String(type).toLowerCase();
  if (/image\/png/.test(t)) return "png";
  if (/image\/jpe?g/.test(t)) return "jpg";
  if (/image\/webp/.test(t)) return "webp";
  if (/image\/svg\+xml/.test(t)) return "svg";
  if (/application\/pdf/.test(t)) return "pdf";
  return fallback;
}

async function toWebp(file, quality = 0.92) {
  try {
    if (!/^image\/(png|jpe?g)$/i.test(file.type)) return null;
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bmp, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob) return null;
    // שומרים שם סביר ל-webp גם אם לקובץ המקורי אין שם
    const base = (file.name || "logo").replace(/\.[^.]+$/,"");
    return new File([blob], `${base}.webp`, {type:"image/webp"});
  } catch {
    return null;
  }
}

function sanitizeName(s = "") {
  return String(s).normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(0, 120);
}

/**
 * מעלה לוגו לנתיב:
 * users/{uid}/orders/{orderId}/draft/assets/{slug}/{side}/original_{slug}_{logoId}.ext
 * ואם אפשר – גם WEBP:
 * users/{uid}/orders/{orderId}/draft/assets/{slug}/{side}/webp_{slug}_{logoId}.webp
 *
 * מחזיר גם:
 *  - originalUrl (https) אם אפשר, וגם gsUriOriginal (gs://)
 *  - pathOriginal / pathWebp (נתיב יחסי בבאקט)
 *  - url alias -> originalUrl לנוחות קוד אחר
 */
export async function uploadItemLogoAssets({
  uid,
  orderId,
  slug,
  side,
  logoId,
  file,
  dataUrlFallback = null,
}) {
  if (!uid || !orderId || !slug || !side || !logoId || !file) {
    throw new Error("[uploadItemLogoAssets] missing params");
  }

  const safeSlug = sanitizeName(slug);
  const safeId = sanitizeName(logoId);
  const ts = Date.now();

  // סיומת: קודם מהשם אם יש, אחרת מהמימ־טייפ
  const nameHasExt = typeof file.name === "string" && /\.[^.]+$/.test(file.name);
  const extFromName = nameHasExt ? file.name.split(".").pop() : null;
  const ext = sanitizeName((extFromName || mimeToExt(file.type || "", "bin")).toLowerCase());

  const baseDir = `users/${uid}/orders/${orderId}/draft/assets/${safeSlug}/${side}`;
  const baseName = `_${safeSlug}_${safeId}_${ts}`;
  const pathOriginal = `${baseDir}/original${baseName}.${ext}`;

  // מטא-דאטה
  const meta = {
    contentType: file.type || "application/octet-stream",
    cacheControl: "public,max-age=31536000,immutable",
    contentDisposition: `inline; filename="${sanitizeName(file.name || `logo.${ext}`)}"`,
  };

  // העלאת מקור
  const refOriginal = ref(storage, pathOriginal);
  const snapOriginal = await uploadBytes(refOriginal, file, meta);

  let originalUrl = null;
  try {
    originalUrl = await getDownloadURL(refOriginal);
  } catch {
    originalUrl = null; // ייתכן שזמין רק מאוחר יותר/לפי רולז; זה בסדר כי אצלנו יש gsUri/path
  }
  const gsUriOriginal = refOriginal.toString(); // gs://<bucket>/<path>

  // WEBP אם רלוונטי
  let pathWebp = null;
  let webpUrl = null;
  let gsUriWebp = null;

  const webpFile = await toWebp(file);
  if (webpFile) {
    pathWebp = `${baseDir}/webp${baseName}.webp`;
    const refWebp = ref(storage, pathWebp);
    await uploadBytes(refWebp, webpFile, {
      contentType: "image/webp",
      cacheControl: "public,max-age=31536000,immutable",
      contentDisposition: `inline; filename="${sanitizeName(webpFile.name)}"`,
    });
    try { webpUrl = await getDownloadURL(refWebp); } catch { webpUrl = null; }
    gsUriWebp = refWebp.toString();
  }

  // נחזיר גם alias בשם url לנוחות, וגם שדות gs/path כדי שהשרת יוכל למשוך ישירות מהבאקט
  return {
    pathOriginal,
    originalUrl,
    gsUriOriginal,
    url: originalUrl || gsUriOriginal,           // alias נוח
    contentType: snapOriginal.metadata.contentType || meta.contentType,
    bytes: snapOriginal.totalBytes,
    pathWebp,
    webpUrl,
    gsUriWebp,
  };
}
