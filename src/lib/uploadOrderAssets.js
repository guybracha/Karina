// src/lib/uploadOrderAssets.js
import { ref, uploadString, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

/** המרת dataURL ל-webp באמצעות canvas (לתמונות) */
async function toWebpDataUrl(dataUrl, quality = 0.9) {
  if (!dataUrl?.startsWith?.("data:image/")) return null;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const webp = c.toDataURL("image/webp", quality);
        resolve(webp);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/** העלאת הדמיה (dataURL) ל-Storage, תחת orders/{orderId}/{slug}/{side}.png */
export async function uploadMockupDataUrl({ orderId, slug, side, dataUrl }) {
  if (!dataUrl) return { url: null, path: null };
  const path = `orders/${orderId}/${slug}/${side}.png`;
  const r = ref(storage, path);
  await uploadString(r, dataUrl, "data_url");
  const url = await getDownloadURL(r);
  return { url, path };
}

/** העלאת לוגו כמקור (File או dataURL) ועוד וריאנט WebP, תחת orders/{orderId}/{slug}/logos/ */
export async function uploadLogoForItem({ orderId, slug, file, dataUrl }) {
  const out = { originalUrl: null, originalPath: null, webpUrl: null, webpPath: null };

  // אם הגיע File – נעלה אותו כמות שהוא; אם הגיע dataURL – נעלה אותו כ-PNG
  if (file) {
    const safeName = (file.name || "logo").replace(/[^\w.\-]+/g, "_");
    const path = `orders/${orderId}/${slug}/logos/original-${Date.now()}-${safeName}`;
    const r = ref(storage, path);
    await uploadBytes(r, file, { contentType: file.type || "application/octet-stream" });
    out.originalUrl = await getDownloadURL(r);
    out.originalPath = path;

    // ניסיון ליצור WebP גם מ-File אם מדובר בתמונה
    try {
      if (file.type?.startsWith?.("image/")) {
        const d = await file.arrayBuffer();
        const b = new Blob([d], { type: file.type });
        const bufUrl = URL.createObjectURL(b);
        const img = new Image();
        const webpDataUrl = await new Promise((resolve, reject) => {
          img.onload = async () => {
            const c = document.createElement("canvas");
            c.width = img.width;
            c.height = img.height;
            c.getContext("2d").drawImage(img, 0, 0);
            const w = c.toDataURL("image/webp", 0.9);
            resolve(w);
            URL.revokeObjectURL(bufUrl);
          };
          img.onerror = reject;
          img.src = bufUrl;
        });
        const webpPath = `orders/${orderId}/${slug}/logos/original.webp`;
        const rWebp = ref(storage, webpPath);
        await uploadString(rWebp, webpDataUrl, "data_url");
        out.webpUrl = await getDownloadURL(rWebp);
        out.webpPath = webpPath;
      }
    } catch (e) {
      console.warn("WebP conversion from File failed:", e);
    }
    return out;
  }

  if (dataUrl) {
    // מקור כ-dataURL (נעלה כ-PNG)
    const origPath = `orders/${orderId}/${slug}/logos/original.png`;
    const rOrig = ref(storage, origPath);
    await uploadString(rOrig, dataUrl, "data_url");
    out.originalUrl = await getDownloadURL(rOrig);
    out.originalPath = origPath;

    // WebP מ-dataURL אם זו תמונה
    try {
      const webp = await toWebpDataUrl(dataUrl);
      if (webp) {
        const webpPath = `orders/${orderId}/${slug}/logos/original.webp`;
        const rWebp = ref(storage, webpPath);
        await uploadString(rWebp, webp, "data_url");
        out.webpUrl = await getDownloadURL(rWebp);
        out.webpPath = webpPath;
      }
    } catch (e) {
      console.warn("WebP conversion from dataURL failed:", e);
    }
  }

  return out;
}
