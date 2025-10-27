// src/lib/saveDraftAssets.js
import { db } from "../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { uploadPreview } from "./uploadPreview";
import { uploadItemLogoAssets } from "./uploadItemLogoAssets";

const LS_CART_KEY = "karina:cart";
const LS_PREVIEW_KEY = (slug, side) => `karina:preview:${slug}:${side}`;
const LS_LOGO_ID = (side) => `karina:logoId:${side}`;
const LS_PENDING_LOGOS = "karina:pendingLogos";

// עוזר קטן לקריאת הדמיות/לוגו מה־LS
function readCartFromLS() {
  try { return JSON.parse(localStorage.getItem(LS_CART_KEY) || "[]"); } catch { return []; }
}
function readPreview(slug, side) {
  try { return localStorage.getItem(LS_PREVIEW_KEY(slug, side)) || null; } catch { return null; }
}
function readPendingLogoDataUrl(logoId) {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_PENDING_LOGOS) || "[]");
    const rec = Array.isArray(arr) ? arr.find(x => x?.id === logoId) : null;
    return rec?.originalDataUrl || null;
  } catch { return null; }
}

export async function saveDraftAssets({ uid, takeOriginalFromMemory }) {
  if (!uid) throw new Error("missing uid");

  // 1) אסוף מזהי לוגו והמקורות האפשריים
  const idFront = localStorage.getItem(LS_LOGO_ID("front"));
  const idBack  = localStorage.getItem(LS_LOGO_ID("back"));
  const logosToTry = [
    { side: "front", id: idFront },
    { side: "back",  id: idBack  },
  ].filter(x => x.id);

  // 2) העלאת לוגואים לתיקיית draft
  const uploadedLogos = {};
  for (const { side, id } of logosToTry) {
    const file = takeOriginalFromMemory?.(id) || null;                  // קובץ גדול מהזיכרון
    const dataUrlFallback = readPendingLogoDataUrl(id) ||                // dataURL קטן מה־LS
                            localStorage.getItem(`karina:logo:${side}:original`) || null; // מפתח חלופי
    if (!file && !dataUrlFallback) continue;

    uploadedLogos[side] = await uploadItemLogoAssets({
      uid,
      orderId: "draft",        // 👈 כאן הקסם
      slug: "common",          // אם יש לך לוגו “גלובלי” שלא תלוי במוצר מסוים
      side,
      logoId: id || side,
      file,
      dataUrlFallback
    }).catch(e => { console.warn("draft logo upload failed", side, e); return null; });
  }

  // 3) העלאת הדמיות לכל מוצר/צד לתיקיית draft
  const cart = readCartFromLS();
  const items = [];
  for (const it of cart) {
    const slug = it?.slug;
    if (!slug) continue;

    const previews = { frontUrl: null, backUrl: null };
    const front = readPreview(slug, "front");
    const back  = readPreview(slug, "back");

    if (front?.startsWith?.("data:")) {
      const up = await uploadPreview({ uid, orderId: "draft", slug, side: "front", source: front })
        .catch(e => { console.warn("draft front preview failed", slug, e); return null; });
      previews.frontUrl = up?.url || null;
    }
    if (back?.startsWith?.("data:")) {
      const up = await uploadPreview({ uid, orderId: "draft", slug, side: "back", source: back })
        .catch(e => { console.warn("draft back preview failed", slug, e); return null; });
      previews.backUrl = up?.url || null;
    }

    items.push({
      slug,
      name: it.name,
      qty:  it.qty,
      price: it.price,
      color: it.color,
      size:  it.size,
      previews,
      // אפשר לשמור גם הפניות ללוגו שהעלינו בסעיף 2 (אם רלוונטי לכל המוצרים)
      logos: { front: uploadedLogos.front || null, back: uploadedLogos.back || null }
    });
  }

  // 4) שמור מסמך טיוטה ב־Firestore
  await setDoc(
    doc(db, "users_prod", uid, "orders_prod", "draft"),
    {
      status: "draft",
      items,
      logos: {
        front: uploadedLogos.front || null,
        back:  uploadedLogos.back  || null
      },
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { items, logos: uploadedLogos };
}
