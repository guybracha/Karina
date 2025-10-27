/* eslint "object-curly-spacing": ["error","never"] */

import {getStorage,ref,uploadBytes,uploadString,getDownloadURL} from "firebase/storage";
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
 * מעלה נכסי לוגו עבור פריט/צד ומחזיר מטא-דאטה עשיר לשמירה פר־פריט.
 * החזרה כוללת id (שווה ל-logoId שקיבלתם), ו-thumbUrl מוכן לשימוש (webp אם קיים).
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
  if (!uid || !orderId || !slug || !side || !logoId) {
    throw new Error("[uploadItemLogoAssets] missing params");
  }
  if (!file && !dataUrlFallback) {
    throw new Error("[uploadItemLogoAssets] need file or dataUrlFallback");
  }

  const safeSlug = sanitizeName(slug);
  const safeId = sanitizeName(logoId);
  const ts = Date.now();

  // נתיבים עקביים באחסון
  const baseDir = `users_prod/${uid}/orders_prod/${orderId}/draft/assets/${safeSlug}/${side}`;
  const baseName = `_${safeSlug}_${safeId}_${ts}`;

  // --- מצב A: יש FILE ---
  if (file) {
    const nameHasExt = typeof file.name === "string" && /\.[^.]+$/.test(file.name);
    const extFromName = nameHasExt ? file.name.split(".").pop() : null;
    const ext = sanitizeName((extFromName || mimeToExt(file.type || "", "bin")).toLowerCase());

    const pathOriginal = `${baseDir}/original${baseName}.${ext}`;
    const refOriginal = ref(storage, pathOriginal);

    const meta = {
      contentType: file.type || "application/octet-stream",
      cacheControl: "public,max-age=31536000,immutable",
      contentDisposition: `inline; filename="${sanitizeName(file.name || `logo.${ext}`)}"`,
    };

    const snapOriginal = await uploadBytes(refOriginal, file, meta);
    let originalUrl = null;
    try { originalUrl = await getDownloadURL(refOriginal); } catch { originalUrl = null; }
    const gsUriOriginal = refOriginal.toString();

    // WEBP (אופציונלי)
    let pathWebp = null, webpUrl = null, gsUriWebp = null;
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

    // thumbUrl עדיפות ל-webp ואז ל-original
    const thumbUrl = webpUrl || originalUrl || gsUriWebp || gsUriOriginal;

    return {
      id: logoId,              // ← לשמירה פר־פריט
      side,
      slug,
      pathOriginal,
      originalUrl,
      gsUriOriginal,
      url: originalUrl || gsUriOriginal,
      contentType: snapOriginal.metadata.contentType || meta.contentType,
      bytes: snapOriginal.totalBytes,
      pathWebp,
      webpUrl,
      gsUriWebp,
      thumbUrl,               // ← נוח להצגה מיידית
      uploadedAt: ts,
    };
  }

  // --- מצב B: data URL ---
  const ct = dataUrlFallback.match(/^data:(.*?);/)?.[1] || "image/png";
  const ext = mimeToExt(ct, "png");
  const pathOriginal = `${baseDir}/original${baseName}.${ext}`;
  const refOriginal = ref(storage, pathOriginal);

  await uploadString(refOriginal, dataUrlFallback, "data_url", {
    contentType: ct,
    cacheControl: "public,max-age=31536000,immutable",
    contentDisposition: `inline; filename="${sanitizeName(`logo.${ext}`)}"`,
  });

  let originalUrl = null;
  try { originalUrl = await getDownloadURL(refOriginal); } catch { originalUrl = null; }
  const gsUriOriginal = refOriginal.toString();

  // כאן אין המרת WEBP (אין File מקור). אפשרות להוסיף המרה דומה דרך קנבס אם תרצה.

  return {
    id: logoId,
    side,
    slug,
    pathOriginal,
    originalUrl,
    gsUriOriginal,
    url: originalUrl || gsUriOriginal,
    contentType: ct,
    bytes: null,
    pathWebp: null,
    webpUrl: null,
    gsUriWebp: null,
    thumbUrl: originalUrl || gsUriOriginal,   // dataURL הומר ל־storage; מצביע לקובץ
    uploadedAt: ts,
  };
}
