/* @refresh skip */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ---- Firebase ----
import { auth, db, functions, ensureAuthTokenFresh } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, collection, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

// ---- Upload helpers ----
import { uploadPreview } from "../lib/uploadPreview";
import { uploadItemLogoAssets } from "../lib/uploadItemLogoAssets";

// ---- Logo queue ----
import { useLogosQueue } from "../contexts/LogosQueueContext.tsx";
import { saveDraftAssets } from "../lib/saveDraftAssets";

/* =========================================================================
   Helpers: preview/logo sources
============================================================================ */

// ---- safe number formatting ----
const LOCALE_HE = (Intl.NumberFormat.supportedLocalesOf?.(["he-IL"])?.length ? "he-IL" : undefined);
const dashFix = (s) => (typeof s === "string" ? s.replace(/\u2011|\u2010|\u2013|\u2014/g, "-") : s); // אם פעם יסתנן מקף לא רגיל
function fmt(n) {
  try { return Number(n || 0).toLocaleString(LOCALE_HE); }
  catch { return Number(n || 0).toLocaleString(); }
}


// fetch blob: URL to Blob
async function fetchBlob(blobUrl) {
  const res = await fetch(blobUrl);
  if (!res.ok) throw new Error("blob fetch failed");
  return await res.blob();
}

// Blob -> dataURL
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
}

/**
 * Normalize & upload mockup if needed:
 * http(s) → return as-is
 * blob:   → fetch → upload
 * data:   → upload
 * returns public URL for Firestore
 */
async function ensurePreviewUploadedSmart({ uid, orderId, slug, side, source }) {
  if (!source) return null;
  if (/^https?:\/\//i.test(source)) return source;
  if (source.startsWith("blob:")) {
    const blob = await fetchBlob(source);
    const { url } = await uploadPreview({ uid, orderId, slug, side, source: blob });
    return url;
  }
  if (source.startsWith("data:")) {
    const { url } = await uploadPreview({ uid, orderId, slug, side, source });
    return url;
  }
  return null;
}

/**
 * Normalize logo source to {file | dataUrl}
 */
async function normalizeLogoSourceForUpload({ file, dataUrl }) {
  if (file) return { file, dataUrl: null };
  if (!dataUrl) return { file: null, dataUrl: null };
  if (dataUrl.startsWith("data:")) return { file: null, dataUrl };
  if (dataUrl.startsWith("blob:")) {
    const blob = await fetchBlob(dataUrl);
    const durl = await blobToDataURL(blob);
    return { file: null, dataUrl: durl };
  }
  return { file: null, dataUrl: null };
}

/* =========================================================================
   LocalStorage keys & constants
============================================================================ */
const LS_CART_KEY = "karina:cart";
const LS_SHIP_KEY = "karina:shipping";
const LS_ADDR_KEY = "karina:shippingAddress";
const LS_PREVIEW_KEY = (slug, side) => `karina:preview:${slug}:${side}`;
const LS_LOGO_ID = (side) => `karina:logoId:${side}`;
const LS_PENDING_LOGOS = "karina:pendingLogos";

const SHIP_OPTIONS = {
  standard: { label: "משלוח רגיל", cost: 20 },
  express: { label: "משלוח אקספרס", cost: 45 },
  pickup: { label: "איסוף מהמפעל", cost: 0 },
};

/* =========================================================================
   Generic helpers
============================================================================ */
function defaultAddress() {
  return { city: "", street: "", house: "", apt: "", zip: "", notes: "" };
}
function normalizeAddress(x) {
  if (!x) return defaultAddress();
  if (typeof x === "string") return { ...defaultAddress(), notes: x };
  const b = defaultAddress();
  const o = { ...b, ...x };
  for (const k of Object.keys(b)) o[k] = String(o[k] ?? "");
  return o;
}
function readAddressFromLS() {
  try {
    const raw = localStorage.getItem(LS_ADDR_KEY);
    return normalizeAddress(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultAddress();
  }
}
function writeAddressToLS(a) {
  try {
    localStorage.setItem(LS_ADDR_KEY, JSON.stringify(normalizeAddress(a)));
  } catch {}
}

// item normalize
function isValidItem(x) {
  return x && typeof x === "object" && "id" in x && "name" in x;
}
function normalizeCartArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(isValidItem)
    .map((it) => ({
      ...it,
      qty: Math.max(1, Number(it.qty) || 1),
      price: Number(it.price) || 0,
      color: typeof it.color === "string" ? it.color : it.color ?? "",
      size: typeof it.size === "string" ? it.size : it.size ?? "",
      slug: typeof it.slug === "string" ? it.slug : it.slug ?? "",
    }));
}

// read/write cart (LS ONLY)
function readCartFromLS() {
  try {
    const raw = localStorage.getItem(LS_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return normalizeCartArray(parsed);
  } catch {
    return [];
  }
}
function saveCartToLS(next) {
  try {
    const norm = normalizeCartArray(next);
    localStorage.setItem(LS_CART_KEY, JSON.stringify(norm));
    window.dispatchEvent(new Event("karina:cartUpdated"));
  } catch {}
}

// pendingLogos -> dataURL
function readOriginalDataUrlFromPending(logoId) {
  if (!logoId) return null;
  try {
    const raw = localStorage.getItem(LS_PENDING_LOGOS);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    const rec = Array.isArray(arr) ? arr.find((x) => x?.id === logoId) : null;
    return rec?.originalDataUrl || null;
  } catch {
    return null;
  }
}

// pick a logo source for side
function collectLogoSource(side, takeOriginalFromMemory) {
  const id = localStorage.getItem(LS_LOGO_ID(side));
  const altId =
    side === "front"
      ? localStorage.getItem(LS_LOGO_ID("back"))
      : localStorage.getItem(LS_LOGO_ID("front"));
  const logoId = id || altId || null;

  const file = logoId ? takeOriginalFromMemory(logoId) || null : null;
  const pendingDataUrl = logoId ? readOriginalDataUrlFromPending(logoId) || null : null;
  const altKey = side === "front" ? "karina:logo:front:original" : "karina:logo:back:original";
  const altDataUrl = localStorage.getItem(altKey) || null;

  return { logoId, file, dataUrl: pendingDataUrl || altDataUrl || null };
}

/* =========================================================================
   Callable utils (logging + retry)
============================================================================ */
function logCallableError(tag, e) {
  const code = e?.code || e?.error?.code || "unknown";
  const message = e?.message || e?.error?.message || String(e);
  const details = e?.details || e?.error?.details || null;
  console.error(`[${tag}]`, { code, message, details, raw: e });
}
async function withRetry(fn, { tries = 2, delayMs = 500, tag = "call" } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      logCallableError(`${tag}#${i + 1}/${tries}`, e);
      const code = e?.code || "";
      // רטריי רק על שגיאות רגעיות
      if (!/resource-exhausted|unavailable|deadline-exceeded|internal|unknown|aborted|cancelled/i.test(code)) break;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

/* =========================================================================
   Firestore refs (kept for orders/drafts, but NOT used for cart syncing)
============================================================================ */
function cartDocRef(userId) {
  return doc(db, "users", userId, "carts", "current");
}
function orderDraftDocRef(userId) {
  return doc(db, "users", userId, "orders", "draft");
}

/* =========================================================================
   Aggregation helpers
============================================================================ */
function firstHttp(...vals) {
  return vals.find((v) => typeof v === "string" && /^https?:\/\//i.test(v)) || null;
}
function aggregateOrderLogos(itemsWithUrls = []) {
  let front = null, back = null;
  for (const row of itemsWithUrls) {
    const L = row?.logos || {};
    if (!front) {
      front = firstHttp(
        L.front?.originalUrl,
        L.front?.url,
        L.frontUrl,
        L.front?.original?.url
      );
    }
    if (!back) {
      back = firstHttp(
        L.back?.originalUrl,
        L.back?.url,
        L.backUrl,
        L.back?.original?.url
      );
    }
    if (front && back) break;
  }
  return { frontUrl: front || null, backUrl: back || null };
}

/* =========================================================================
   Component
============================================================================ */
export default function Cart() {
  const [items, setItems] = useState([]);
  const [shipping, setShipping] = useState(() => {
    try {
      return localStorage.getItem(LS_SHIP_KEY) || "standard";
    } catch {
      return "standard";
    }
  });
  const [shippingAddress, setShippingAddress] = useState(() => readAddressFromLS());
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState(null);
  const saveTimer = useRef(null);
  const busyRef = useRef(false); // הגנה מכפילות לחיצה
  const { takeOriginalFromMemory } = useLogosQueue();

  /* ---------- effects ---------- */
  // ✅ LS-only: init from LocalStorage and keep uid for later flows
  useEffect(() => {
    setItems(readCartFromLS());
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUid(u?.uid || null);
    });
    return () => unsub();
  }, []);

  // מאזינים גלובליים לשגיאות "חולפות" שלא נלכדות
  useEffect(() => {
    const onRejection = (ev) => {
      console.error("[unhandledrejection]", ev?.reason || ev);
    };
    const onError = (ev) => {
      console.error("[window.error]", ev?.message || ev);
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  // keep LS in sync
  useEffect(() => {
    function onStorage(e) {
      if (e.key === LS_CART_KEY) setItems(readCartFromLS());
      if (e.key === LS_SHIP_KEY) {
        try {
          setShipping(localStorage.getItem(LS_SHIP_KEY) || "standard");
        } catch {}
      }
      if (e.key === LS_ADDR_KEY) {
        try {
          setShippingAddress(readAddressFromLS());
        } catch {}
      }
    }
    function onCustom() {
      setItems(readCartFromLS());
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("karina:cartUpdated", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("karina:cartUpdated", onCustom);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_SHIP_KEY, shipping);
    } catch {}
    writeAddressToLS(shippingAddress);
    // ❌ Removed Firestore cart sync — LS is the source of truth
    // eslint-disable-next-line
  }, [shipping, shippingAddress]);

  /* ---------- UI helpers ---------- */
  function updateQty(id, newQty) {
    const qty = Math.max(1, Number(newQty) || 1);
    const next = items.map((it) => (it.id === id ? { ...it, qty } : it));
    setItems(next);
    saveCartToLS(next); // LS ONLY
  }
  function removeItem(id) {
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    saveCartToLS(next); // LS ONLY
  }

  const merchandiseTotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0),
    [items]
  );
  const shippingCost = useMemo(() => {
    const opt = SHIP_OPTIONS[shipping] || SHIP_OPTIONS.standard;
    return items.length === 0 ? 0 : Number(opt.cost || 0);
  }, [shipping, items.length]);
  const grandTotal = useMemo(() => merchandiseTotal + shippingCost, [merchandiseTotal, shippingCost]);

  function getPreviewsForItem(it) {
    try {
      if (!it.slug) return { front: null, back: null };
      const front = localStorage.getItem(LS_PREVIEW_KEY(it.slug, "front"));
      const back = localStorage.getItem(LS_PREVIEW_KEY(it.slug, "back"));
      return { front: front || null, back: back || null };
    } catch {
      return { front: null, back: null };
    }
  }

  // ensure a draft doc (kept for assets/drafts flow)
  async function ensureDraft(uid) {
    const ref = orderDraftDocRef(uid);
    await setDoc(ref, { status: "draft", updatedAt: serverTimestamp() }, { merge: true });
    return { uid };
  }

  // upload mockups + logos for one line (manual "שמור קבצים")
  async function saveAssetsForItem(it) {
    if (!uid) {
      alert("עליך להתחבר כדי לשמור קבצים.");
      return;
    }
    try { await ensureAuthTokenFresh(); } catch (e) { console.error("ensureAuthTokenFresh failed", e); }

    const customer = await ensureDraft(uid);
    const orderId = "draft";
    const slug = it.slug;
    if (!slug) {
      alert("לפריט חסר slug — לא ניתן לשמור קבצים.");
      return;
    }

    const { front, back } = getPreviewsForItem({ slug });

    let frontUrl = null, backUrl = null;
    try { frontUrl = await ensurePreviewUploadedSmart({ uid: customer.uid, orderId, slug, side: "front", source: front }); } catch (e) { console.error(e); }
    try { backUrl  = await ensurePreviewUploadedSmart({ uid: customer.uid, orderId, slug, side: "back",  source: back  }); } catch (e) { console.error(e); }

    const sourceFront = collectLogoSource("front", takeOriginalFromMemory);
    const sourceBack  = collectLogoSource("back",  takeOriginalFromMemory);

    let frontLogo = null, backLogo = null;
    const nf = await normalizeLogoSourceForUpload({ file: sourceFront.file, dataUrl: sourceFront.dataUrl });
    const nb = await normalizeLogoSourceForUpload({ file: sourceBack.file,  dataUrl: sourceBack.dataUrl  });

    if (nf.file || nf.dataUrl) {
      try {
        frontLogo = await uploadItemLogoAssets({
          uid: customer.uid, orderId, slug, side: "front",
          logoId: sourceFront.logoId || "front",
          file: nf.file || null,
          dataUrlFallback: nf.dataUrl || null,
        });
      } catch (e) { console.error("upload logo front failed", e); }
    }
    if (nb.file || nb.dataUrl) {
      try {
        backLogo = await uploadItemLogoAssets({
          uid: customer.uid, orderId, slug, side: "back",
          logoId: sourceBack.logoId || "back",
          file: nb.file || null,
          dataUrlFallback: nb.dataUrl || null,
        });
      } catch (e) { console.error("upload logo back failed", e); }
    }

    const keyOf = (x) => `${x.slug || ""}__${x.color || ""}__${x.size || ""}`;
    const meKey = keyOf(it);

    const currentDraftSnap = await getDoc(orderDraftDocRef(uid));
    const currentItems = Array.isArray(currentDraftSnap.data()?.items) ? currentDraftSnap.data().items : [];

    const nextItems = currentItems.map((row) =>
      keyOf(row) === meKey
        ? {
            ...row,
            previews: { frontUrl: frontUrl || row?.previews?.frontUrl || null, backUrl: backUrl || row?.previews?.backUrl || null },
            logos:    { front: frontLogo || row?.logos?.front || null,        back:  backLogo  || row?.logos?.back  || null },
          }
        : row
    );

    const existed = nextItems.some((r) => keyOf(r) === meKey);
    const completedRow = {
      slug: it.slug, name: it.name, price: it.price, qty: it.qty, color: it.color, size: it.size,
      previews: { frontUrl: frontUrl || null, backUrl: backUrl || null },
      logos:    { front: frontLogo || null,   back: backLogo || null },
    };
    const finalItems = existed ? nextItems : [...nextItems, completedRow];

    await setDoc(orderDraftDocRef(uid), { items: finalItems, updatedAt: serverTimestamp() }, { merge: true });
    alert(`נשמרו הקבצים לפריט "${it.name}".`);
  }

  // save ALL assets
  async function saveAllAssets() {
    if (!uid) { alert("עליך להתחבר כדי לשמור קבצים."); return; }
    try { await ensureAuthTokenFresh(); } catch (e) { console.error("ensureAuthTokenFresh failed", e); }

    for (const it of items) {
      const { front, back } = getPreviewsForItem(it);
      const hasPreview = Boolean(front?.startsWith?.("data:") || back?.startsWith?.("data:") || front?.startsWith?.("blob:") || back?.startsWith?.("blob:"));
      const sf = collectLogoSource("front", takeOriginalFromMemory);
      const sb = collectLogoSource("back",  takeOriginalFromMemory);
      const hasLogo = Boolean(sf.file || sf.dataUrl || sb.file || sb.dataUrl);
      if (hasPreview || hasLogo) {
        try { /* eslint-disable no-await-in-loop */ await saveAssetsForItem(it); /* eslint-enable */ }
        catch (e) { console.error("saveAssetsForItem failed for", it, e); }
      }
    }
    alert("ההדמיות והלוגואים נשמרו לטיוטה.");
  }

  // OPTIONAL: save only logos (no mockups) for quick testing
  async function saveLogosOnly() {
    if (!uid) { alert("עליך להתחבר כדי לשמור קבצים."); return; }
    try { await ensureAuthTokenFresh(); } catch (e) { console.error("ensureAuthTokenFresh failed", e); }
    const customer = await ensureDraft(uid);
    const orderId = "draft";

    const keyOf = (x) => `${x.slug || ""}__${x.color || ""}__${x.size || ""}`;
    const draftSnap = await getDoc(orderDraftDocRef(uid));
    const currentItems = Array.isArray(draftSnap.data()?.items) ? draftSnap.data().items : [];

    const updates = [];

    for (const it of items) {
      const slug = it.slug;
      if (!slug) continue;

      const sf = collectLogoSource("front", takeOriginalFromMemory);
      const sb = collectLogoSource("back",  takeOriginalFromMemory);
      const nf = await normalizeLogoSourceForUpload({ file: sf.file, dataUrl: sf.dataUrl });
      const nb = await normalizeLogoSourceForUpload({ file: sb.file, dataUrl: sb.dataUrl });

      let frontLogo = null, backLogo = null;
      if (nf.file || nf.dataUrl) {
        try {
          frontLogo = await uploadItemLogoAssets({
            uid: customer.uid, orderId, slug, side: "front",
            logoId: sf.logoId || "front",
            file: nf.file || null, dataUrlFallback: nf.dataUrl || null,
          });
        } catch (e) { console.error("upload front logo failed", e); }
      }
      if (nb.file || nb.dataUrl) {
        try {
          backLogo = await uploadItemLogoAssets({
            uid: customer.uid, orderId, slug, side: "back",
            logoId: sb.logoId || "back",
            file: nb.file || null, dataUrlFallback: nb.dataUrl || null,
          });
        } catch (e) { console.error("upload back logo failed", e); }
      }

      const rowKey = keyOf(it);
      const existed = currentItems.find((r) => keyOf(r) === rowKey);
      if (existed) {
        updates.push({
          ...existed,
          logos: {
            front: frontLogo || existed?.logos?.front || null,
            back:  backLogo  || existed?.logos?.back  || null,
          },
        });
      } else {
        updates.push({
          slug: it.slug, name: it.name, price: it.price, qty: it.qty, color: it.color, size: it.size,
          previews: { frontUrl: null, backUrl: null },
          logos:    { front: frontLogo || null, back: backLogo || null },
        });
      }
    }

    await setDoc(orderDraftDocRef(uid), { items: updates, updatedAt: serverTimestamp() }, { merge: true });
    alert("הלוגואים נשמרו לטיוטה (בלי הדמיות).");
  }

  /* ---------- checkout ---------- */
  async function startCheckout() {
    if (busyRef.current) return; // הגנה מכפילות לחיצה
    busyRef.current = true;

    try {
      setLoading(true);

      if (!uid) {
        alert("עליך להתחבר כדי להשלים את ההזמנה והעלאת הקבצים.");
        setLoading(false);
        return;
      }

      try { await ensureAuthTokenFresh(); } catch (e) { console.error("ensureAuthTokenFresh failed", e); }

      const a = normalizeAddress(shippingAddress);
      if (items.length > 0 && shipping !== "pickup" && !(a.city.trim() && a.street.trim() && a.house.trim())) {
        alert("אנא מלא/י עיר, רחוב ומספר בית או בחר/י 'איסוף מהמפעל'.");
        setLoading(false);
        return;
      }

      const customer = { uid };
      const shipOpt = SHIP_OPTIONS[shipping] || SHIP_OPTIONS.standard;

      const basePayload = {
        items: [],
        shipping: { method: shipping, label: shipOpt.label, cost: shipOpt.cost, address: a },
        clientTotals: { merchandiseTotal, shippingCost, grandTotal },
      };

      // create empty order under user
      const ordersCol = collection(db, "users", customer.uid, "orders");
      const newOrderRef = doc(ordersCol);
      const orderId = newOrderRef.id;
      await setDoc(newOrderRef, {
        status: "pending",
        userId: customer.uid,
        currency: "ILS",
        amountCents: Math.round(Number(basePayload.clientTotals.grandTotal || 0) * 100),
        customer,
        items: [],
        shipping: basePayload.shipping,
        totals: basePayload.clientTotals,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        draft: true,
      });

      // mirror at top-level /orders/{orderId}
      await setDoc(
        doc(db, "orders", orderId),
        {
          status: "pending",
          userId: customer.uid,
          currency: "ILS",
          amountCents: Math.round(Number(basePayload.clientTotals.grandTotal || 0) * 100),
          customer,
          items: [],
          shipping: basePayload.shipping,
          totals: basePayload.clientTotals,
          userRef: doc(db, "users", customer.uid),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // ---------------- Upload previews (if any) + logos ALWAYS ----------------
      const sourceFront = collectLogoSource("front", takeOriginalFromMemory);
      const sourceBack  = collectLogoSource("back",  takeOriginalFromMemory);

      const itemsWithUrls = [];
      for (const { slug, qty, color, size, name, price } of items) {
        const { front, back } = getPreviewsForItem({ slug });

        let frontUrl = null, backUrl = null;
        let frontLogo = null, backLogo = null;

        try {
          if (front) {
            frontUrl = await ensurePreviewUploadedSmart({
              uid: customer.uid, orderId, slug, side: "front", source: front
            });
          }
        } catch (e) { console.error("upload front mockup failed", e); }

        try {
          if (back) {
            backUrl = await ensurePreviewUploadedSmart({
              uid: customer.uid, orderId, slug, side: "back", source: back
            });
          }
        } catch (e) { console.error("upload back mockup failed", e); }

        try {
          const nf = await normalizeLogoSourceForUpload({ file: sourceFront.file, dataUrl: sourceFront.dataUrl });
          if (nf.file || nf.dataUrl) {
            frontLogo = await uploadItemLogoAssets({
              uid: customer.uid, orderId, slug, side: "front",
              logoId: sourceFront.logoId || "front",
              file: nf.file || null, dataUrlFallback: nf.dataUrl || null
            });
          }
        } catch (e) { console.error("upload front logo failed", e); }

        try {
          const nb = await normalizeLogoSourceForUpload({ file: sourceBack.file, dataUrl: sourceBack.dataUrl });
          if (nb.file || nb.dataUrl) {
            backLogo = await uploadItemLogoAssets({
              uid: customer.uid, orderId, slug, side: "back",
              logoId: sourceBack.logoId || "back",
              file: nb.file || null, dataUrlFallback: nb.dataUrl || null
            });
          }
        } catch (e) { console.error("upload back logo failed", e); }

        itemsWithUrls.push({
          slug, qty, color, size, name, price,
          previews: { frontUrl: frontUrl || null, backUrl: backUrl || null },
          logos:    { front: frontLogo || null,   back: backLogo || null }
        });
      }
      // ---------------- END loop ----------------

      const { frontUrl: orderFrontLogoUrl, backUrl: orderBackLogoUrl } = aggregateOrderLogos(itemsWithUrls);
      const orderLogosPatch = {
        logos: { frontUrl: orderFrontLogoUrl, backUrl: orderBackLogoUrl },
        autoEmailOnCreate: false,
      };

      // persist items + order-level logos to both docs
      await setDoc(
        doc(db, "users", customer.uid, "orders", orderId),
        { items: itemsWithUrls, ...orderLogosPatch, updatedAt: serverTimestamp() },
        { merge: true }
      );

      await setDoc(
        doc(db, "orders", orderId),
        { items: itemsWithUrls, ...orderLogosPatch, updatedAt: serverTimestamp() },
        { merge: true }
      );

      // ❌ Removed email generation from Cart — will be handled on Checkout page
      // try {
      //   await ensureAuthTokenFresh();
      //   const gen = httpsCallable(functions, "generateOrderSummary");
      //   await withRetry(() => gen({ pathType: "sub", uid: customer.uid, orderId }), {
      //     tag: "generateOrderSummary",
      //   });
      // } catch (e) {
      //   logCallableError("generateOrderSummary(final)", e);
      // }

      // Keep existing payment flow (or just navigate to a dedicated checkout route)
      let checkoutUrl = `/checkout?order=${orderId}`;

      try {
        // If you still want to support direct payment creation here, uncomment:
        // const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
        // const { data } = await withRetry(
        //   () => createCheckoutSession({ ...basePayload, orderId, customer }),
        //   { tag: "createCheckoutSession" }
        // );
        // checkoutUrl = data?.checkoutUrl || checkoutUrl;
      } catch (e) {
        logCallableError("createCheckoutSession(final)", e);
      }

      if (!checkoutUrl) throw new Error("Missing checkoutUrl");
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      alert("אירעה שגיאה בהפניה לקופה. נסה שוב.");
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  }

  /* ---------- render ---------- */
  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">העגלה שלי</h1>
      <div className="d-flex justify-content-end mb-3 gap-2">
        <button className="btn btn-outline-primary" onClick={saveAllAssets} disabled={!uid || items.length === 0}>
          שמור את כל ההדמיות + הלוגואים
        </button>
        <button className="btn btn-outline-success" onClick={saveLogosOnly} disabled={!uid || items.length === 0}>
          שמור לוגואים בלבד
        </button>
      </div>

      {items.length === 0 ? (
        <div className="alert alert-info">
          העגלה שלך ריקה. <Link to="/catalog" className="alert-link">חזור לקטלוג</Link>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>תצוגה</th>
                  <th>מוצר</th>
                  <th>צבע</th>
                  <th>מידה</th>
                  <th style={{ width: 120 }}>כמות</th>
                  <th>מחיר ליחידה</th>
                  <th>סה״כ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const { front, back } = getPreviewsForItem(it);
                  return (
                    <tr key={it.id}>
                      <td>
                        <div className="d-flex gap-2 align-items-center">
                          {front ? (
                            <div className="text-center">
                              <img
                                src={front}
                                alt={`הדמיה קדמית עבור ${it.name}`}
                                style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,.08)", display: "block" }}
                              />
                              <small className="text-muted d-block mt-1" style={{ lineHeight: 1 }}>קדמי</small>
                            </div>
                          ) : <span className="badge text-bg-secondary">אין קדמי</span>}
                          {back ? (
                            <div className="text-center">
                              <img
                                src={back}
                                alt={`הדמיה אחורית עבור ${it.name}`}
                                style={{ width: 60, height: 60, objectFit: "contain", borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,.08)", display: "block" }}
                              />
                              <small className="text-muted d-block mt-1" style={{ lineHeight: 1 }}>אחורי</small>
                            </div>
                          ) : <span className="badge text-bg-secondary">אין אחורי</span>}
                        </div>
                      </td>
                      <td className="fw-semibold">{it.name}</td>
                      <td>{it.color}</td>
                      <td>{it.size}</td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) => updateQty(it.id, e.target.value)}
                          className="form-control form-control-sm w-auto"
                        />
                      </td>
                      <td>{fmt(it.price)} ₪</td>
                      <td>{fmt(Number(it.price) * Number(it.qty))} ₪</td>
                      <td>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(it.id)}>
                          הסר
                        </button>
                      </td>
                      <td className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-success"
                          onClick={() => saveAssetsForItem(it)}
                          title="שמור הדמיה + לוגו לטיוטה"
                        >
                          שמור קבצים
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <button className="btn btn-outline-primary me-2" onClick={async () => {
              if (!uid) return alert("עליך להתחבר");
              try { await ensureAuthTokenFresh(); await saveDraftAssets({ uid, takeOriginalFromMemory }); alert("נשמרה טיוטה בשרת (Storage + Firestore)."); }
              catch (e) { console.error(e); alert("שמירת הטיוטה נכשלה"); }
            }}>
              שמור טיוטה לשרת
            </button>
          </div>

          {/* משלוח + כתובת */}
          <div className="mt-3 p-3 border rounded-3">
            <h6 className="mb-3">אפשרות משלוח</h6>
            <div className=".d-flex flex-wrap gap-4">
              {Object.entries(SHIP_OPTIONS).map(([value, opt]) => (
                <div className="form-check" key={value}>
                  <input
                    className="form-check-input"
                    type="radio"
                    name="shipping"
                    id={`ship-${value}`}
                    value={value}
                    checked={shipping === value}
                    onChange={(e) => setShipping(e.target.value)}
                  />
                  <label className="form-check-label" htmlFor={`ship-${value}`}>
                    {opt.label} <small className="text-muted">({opt.cost.toLocaleString("he-IL")} ₪)</small>
                  </label>
                </div>
              ))}
            </div>

            <hr className="my-3" />
            <div className="mb-2">
              <label className="form-label fw-semibold">כתובת למשלוח</label>
              <div className="row g-2">
                <div className="col-md-6">
                  <label className="form-label">עיר</label>
                  <input
                    type="text"
                    className="form-control"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">רחוב</label>
                  <input
                    type="text"
                    className="form-control"
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">מספר בית</label>
                  <input
                    type="text"
                    className="form-control"
                    value={shippingAddress.house}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, house: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">דירה</label>
                  <input
                    type="text"
                    className="form-control"
                    value={shippingAddress.apt}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, apt: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">מיקוד</label>
                  <input
                    type="text"
                    className="form-control"
                    value={shippingAddress.zip}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label">הערות לשליח</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={shippingAddress.notes}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, notes: e.target.value })}
                  />
                </div>
              </div>
              <small className="text-muted d-block mt-1">
                נדרש עיר, רחוב ומספר בית למשלוח (או בחר/י "איסוף מהמפעל").
              </small>
            </div>
          </div>

          {/* סיכום ותשלום */}
          <div className="d-flex justify-content-between align-items-end mt-4 flex-wrap gap-3">
            <Link to="/catalog" className="btn btn-outline-secondary">
              המשך בקנייה
            </Link>
            <div className="ms-auto">
              <div className="text-end">
                <div className="d-flex justify-content-between" style={{ minWidth: 260 }}>
                  <span className="text-muted">סה״כ מוצרים:</span>
                  <strong>{fmt(merchandiseTotal)} ₪</strong>
                </div>
                <div className="d-flex justify-content-between" style={{ minWidth: 260 }}>
                  <span className="text-muted">משלוח ({SHIP_OPTIONS[shipping]?.label || "—"}):</span>
                  <strong>{fmt(shippingCost)} ₪</strong>
                </div>
                <hr className="my-2" />
                <h5 className="mb-0">סה״כ לתשלום: {fmt(grandTotal)} ₪</h5>
              </div>
              <button
                className="btn btn-primary btn-lg mt-3 w-100"
                onClick={startCheckout}
                disabled={loading || items.length === 0}
                title={items.length === 0 ? "העגלה ריקה" : undefined}
              >
                {loading ? "מפנה לקופה..." : "מעבר לתשלום"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
