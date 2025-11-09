/* @refresh skip */
import React, { useEffect, useMemo, useRef, useState } from "react";
import useCities from "../hooks/useCities";
import { Link, useNavigate } from "react-router-dom";
import "../style/Cart.css";
import PhoneOrderRequest from "../components/PhoneOrderRequest";

// ---- Firebase ----
import { auth, db, ensureAuthTokenFresh } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref as storageRef, getDownloadURL } from "firebase/storage";

// ---- (לשימוש בהדמיות בלבד) ----
import { uploadPreview } from "../lib/uploadPreview";

// ---- מחירון ומוצרים ----
import { PRODUCTS } from "../lib/products";
import { getDiscountPct } from "../lib/pricing";

/* =========================================================================
   LS keys & helpers
============================================================================ */
const LS_CART_KEY   = "karina:cart";
const LS_SHIP_KEY   = "karina:shipping";
const LS_ADDR_KEY   = "karina:shippingAddress";
const LS_PREVIEW_KEY = (slug, side) => `karina:preview:${slug}:${side}`;

// ✅ Prefill למעבר ל־ProductDetail
const LS_PREFILL = (slug) => `karina:productPrefill:${slug}`;

// מפה של לוגו פר־מוצר: { [slug]: { front: Meta|null, back: Meta|null } }
const LS_ITEM_LOGOS = "karina:itemLogos";
function readItemLogosMap() {
  try { return JSON.parse(localStorage.getItem(LS_ITEM_LOGOS) || "{}") || {}; } catch { return {}; }
}
function writeItemLogosMap(map) {
  try {
    localStorage.setItem(LS_ITEM_LOGOS, JSON.stringify(map));
    window.dispatchEvent(new Event("karina:itemLogosUpdated"));
  } catch {}
}

/* =========================================================================
   Utils
============================================================================ */
const LOCALE_HE = (Intl.NumberFormat.supportedLocalesOf?.(["he-IL"])?.length ? "he-IL" : undefined);
function fmt(n) {
  try { return Number(n || 0).toLocaleString(LOCALE_HE); }
  catch { return Number(n || 0).toLocaleString(); }
}
const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

function defaultAddress() { return { city: "", street: "", house: "", apt: "", zip: "", phoneNumber: "", notes: "" }; }
function normalizeAddress(x) {
  if (!x) return defaultAddress();
  if (typeof x === "string") return { ...defaultAddress(), notes: x };
  const b = defaultAddress();
  const o = { ...b, ...x };
  for (const k of Object.keys(b)) o[k] = String(o[k] ?? "");
  // Normalize phone number to digits only
  if (o.phoneNumber) {
    try { o.phoneNumber = String(o.phoneNumber || "").replace(/\D+/g, ""); } catch {}
  }
  return o;
}
function readAddressFromLS() {
  try {
    const raw = localStorage.getItem(LS_ADDR_KEY);
    return normalizeAddress(raw ? JSON.parse(raw) : null);
  } catch { return defaultAddress(); }
}
function writeAddressToLS(a) {
  try { localStorage.setItem(LS_ADDR_KEY, JSON.stringify(normalizeAddress(a))); } catch {}
}

/* ---------- cart normalization & consolidation (one row per product) ---------- */
function isValidItem(x) { return x && typeof x === "object" && ("id" in x || "slug" in x) && "name" in x; }
function normalizeCartArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(isValidItem).map((it) => ({
    ...it,
    // דואגים שתמיד יהיה slug
    slug: typeof it.slug === "string" && it.slug ? it.slug : (typeof it.id === "string" ? it.id.split("__")[0] : ""),
    // qty/price לשימוש פנימי; המחיר המעודכן נשלף מ-PRODUCTS
    qty: Math.max(1, Number(it.qty) || 1),
    price: Number(it.price) || 0,
    color: typeof it.color === "string" ? it.color : "",
    size:  typeof it.size  === "string" ? it.size  : "",
    variants: it.variants || null,
  }));
}

// breakdown helpers (תואם ProductDetail)
function addToBreakdown(breakdown, colorKey, sizeKey, qtyToAdd) {
  const safeQty = Math.max(0, Number(qtyToAdd) || 0);
  const next = breakdown ? { ...breakdown } : { byColorSize: {}, colorTotals: {}, sizeTotals: {} };

  const c = colorKey || "—";
  const s = sizeKey || "—";

  const byColor = next.byColorSize[c] ? { ...next.byColorSize[c] } : {};
  byColor[s] = (Number(byColor[s]) || 0) + safeQty;
  next.byColorSize = { ...next.byColorSize, [c]: byColor };

  next.colorTotals[c] = (Number(next.colorTotals[c]) || 0) + safeQty;
  next.sizeTotals[s]  = (Number(next.sizeTotals[s])  || 0) + safeQty;

  return next;
}
function mergeVariants(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  let out = { byColorSize: {}, colorTotals: {}, sizeTotals: {} };
  const push = (src) => {
    if (!src?.byColorSize) return;
    for (const [c, sizes] of Object.entries(src.byColorSize)) {
      for (const [s, q] of Object.entries(sizes || {})) {
        out = addToBreakdown(out, c, s, Number(q) || 0);
      }
    }
  };
  push(a); push(b);
  return out;
}

function consolidateCartByProduct(list) {
  const bySlug = new Map();
  for (const it of list) {
    const slug = it.slug || "";
    if (!slug) continue;

    if (!bySlug.has(slug)) {
      bySlug.set(slug, {
        id: slug,
        slug,
        name: it.name,
        price: it.price,
        qty: 0,
        variants: null,
        lastSelected: it.lastSelected || null,
        addedAt: it.addedAt || Date.now(),
        updatedAt: Date.now(),
      });
    }
    const row = { ...bySlug.get(slug) };
    row.qty = Number(row.qty || 0) + Math.max(1, Number(it.qty) || 1);

    // מיזוג פירוט מידות/צבעים:
    let v = row.variants || null;
    if (it.variants) v = mergeVariants(v, it.variants);
    if (it.color || it.size) {
      v = addToBreakdown(v, it.color || "—", it.size || "—", Math.max(1, Number(it.qty) || 1));
    }

    row.variants = v;
    row.lastSelected = it.lastSelected || row.lastSelected || null;
    row.updatedAt = Date.now();
    bySlug.set(slug, row);
  }
  return Array.from(bySlug.values()).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function readCartFromLS() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_CART_KEY) || "[]");
    const norm = normalizeCartArray(raw);
    return consolidateCartByProduct(norm);
  } catch {
    return [];
  }
}
function saveCartToLS(next) {
  try {
    // נשמר במבנה הנוכחי (מאוחד). אפשר גם לשמר "variants" לשימוש עתידי.
    const norm = next.map((it) => ({
      id: it.slug, // שורה אחת לכל מוצר
      slug: it.slug,
      name: it.name,
      qty: Math.max(1, Number(it.qty) || 1),
      price: Number(it.price) || 0,
      variants: it.variants || null,
      lastSelected: it.lastSelected || null,
      addedAt: it.addedAt || Date.now(),
      updatedAt: Date.now(),
    }));
    localStorage.setItem(LS_CART_KEY, JSON.stringify(norm));
    window.dispatchEvent(new Event("karina:cartUpdated"));
  } catch {}
}

// דוגם הדמיות (אם יש) – לא קשור ללוגו
function getPreviewsForItem(it) {
  try {
    if (!it.slug) return { front: null, back: null };
    const front = localStorage.getItem(LS_PREVIEW_KEY(it.slug, "front"));
    const back  = localStorage.getItem(LS_PREVIEW_KEY(it.slug, "back"));
    return { front: front || null, back: back || null };
  } catch { return { front: null, back: null }; }
}

// בוחר URL מיידי אם יש (thumb/webp/original/url/downloadUrl)
function pickImmediateUrl(meta) {
  if (!meta) return null;
  const cand = meta.thumbUrl || meta.webpUrl || meta.originalUrl || meta.url || meta.downloadUrl;
  if (typeof cand === "string" && /^https?:\/\//i.test(cand)) return cand;
  return null;
}

/* -------- תמחור לשורה אחת (מדרגות) -------- */
function priceRow(it) {
  const p = PRODUCTS.find((x) => x.slug === it.slug);
  const baseUnit = Number(p?.price ?? it.price ?? 0);
  const qty = Math.max(1, Number(it.qty) || 1);
  const dPct = getDiscountPct(qty);          // 0..0.5
  const unitAfter = round2(baseUnit * (1 - dPct));
  const lineTotal = round2(unitAfter * qty);
  const saved = round2(baseUnit * qty - lineTotal);
  return { baseUnit, qty, dPct, unitAfter, lineTotal, saved };
}

/* =========================================================================
   Size totals helpers for UI
============================================================================ */
function buildSizeTotalsForSlug(items, slug) {
  const totals = {};
  for (const row of items) {
    if (row.slug !== slug) continue;
    if (row?.variants?.byColorSize) {
      for (const sizes of Object.values(row.variants.byColorSize)) {
        for (const [sz, q] of Object.entries(sizes || {})) {
          totals[sz] = (totals[sz] || 0) + (Number(q) || 0);
        }
      }
      continue;
    }
    const sz = row.size || "—";
    totals[sz] = (totals[sz] || 0) + Math.max(1, Number(row.qty) || 1);
  }
  return totals;
}
function getSizeTotalsFromItemOrAll(items, it) {
  if (it?.variants?.sizeTotals && Object.keys(it.variants.sizeTotals).length > 0) {
    return it.variants.sizeTotals;
  }
  return buildSizeTotalsForSlug(items, it.slug);
}

/* =========================================================================
   Firestore refs
============================================================================ */
function orderDraftDocRef(userId) {
  return doc(db, "users_prod", userId, "orders_prod", "draft");
}

/* =========================================================================
   Shipping
============================================================================ */
const SHIP_OPTIONS = {
  standard: { label: "משלוח רגיל", cost: 20 },
  express:  { label: "משלוח אקספרס", cost: 45 },
  pickup:   { label: "איסוף מהמפעל", cost: 0 },
};

/* =========================================================================
   Component
============================================================================ */
export default function Cart() {
  const navigate = useNavigate();
  const storage = getStorage();

  const [items, setItems] = useState([]);
  const [shipping, setShipping] = useState(() => {
    try { return localStorage.getItem(LS_SHIP_KEY) || "standard"; }
    catch { return "standard"; }
  });
  const [shippingAddress, setShippingAddress] = useState(() => readAddressFromLS());
  const { filtered: cityOptions, loading: citiesLoading } = useCities(shippingAddress.city);
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState(null);
  const busyRef = useRef(false);

  // לוגואים פר־מוצר (מה-LS), מפתח = slug
  const [itemLogosMap, setItemLogosMap] = useState(() => readItemLogosMap());

  // URLים שנפתרו בפועל להצגה (אחרי getDownloadURL אם צריך)
  // מבנה: { [slug]: { front: string|null, back: string|null } }
  const [resolvedLogos, setResolvedLogos] = useState({});

  useEffect(() => {
    setItems(readCartFromLS());
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid || null));
    return () => unsub();
  }, []);

  // האזנות ל-storage + אירועי custom
  useEffect(() => {
    function onStorage(e) {
      if (e.key === LS_CART_KEY) setItems(readCartFromLS());
      if (e.key === LS_SHIP_KEY) {
        try { setShipping(localStorage.getItem(LS_SHIP_KEY) || "standard"); } catch {}
      }
      if (e.key === LS_ADDR_KEY) setShippingAddress(readAddressFromLS());
      if (e.key === LS_ITEM_LOGOS) setItemLogosMap(readItemLogosMap());
    }
    function onCustomCart() { setItems(readCartFromLS()); }
    function onLogosUpdated() { setItemLogosMap(readItemLogosMap()); }

    window.addEventListener("storage", onStorage);
    window.addEventListener("karina:cartUpdated", onCustomCart);
    window.addEventListener("karina:itemLogosUpdated", onLogosUpdated);
    const onFocus = () => setItems(readCartFromLS());
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("karina:cartUpdated", onCustomCart);
      window.removeEventListener("karina:itemLogosUpdated", onLogosUpdated);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_SHIP_KEY, shipping); } catch {}
    writeAddressToLS(shippingAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipping, shippingAddress]);

  // === פותר URLים אמיתיים לתצוגה עבור כל מוצר ===
  useEffect(() => {
    let cancelled = false;

    async function resolveAll() {
      const next = {};
      for (const it of items) {
        const meta = itemLogosMap[it.id] || {};
        for (const side of ["front", "back"]) {
          const m = meta?.[side] || null;

          // 1) אם כבר יש http — משתמשים בו
          let url = pickImmediateUrl(m);
          // 2) אם אין http — ננסה לפתור מ-pathים
          if (!url && m) {
            const path = m.pathWebp || m.pathOriginal;
            const gs = m.gsUriWebp || m.gsUriOriginal;

            try {
              if (path) {
                url = await getDownloadURL(storageRef(storage, path));
              } else if (typeof gs === "string" && gs.startsWith("gs://")) {
                const withoutScheme = gs.replace(/^gs:\/\//, "");
                const firstSlash = withoutScheme.indexOf("/");
                if (firstSlash > 0) {
                  const pathFromGs = withoutScheme.slice(firstSlash + 1);
                  url = await getDownloadURL(storageRef(storage, pathFromGs));
                }
              }
            } catch (e) {
              url = null;
              console.warn("resolve logo url failed", { lineId: it.id, side, err: e });
            }
          }

          if (!next[it.id]) next[it.id] = { front: null, back: null };
          next[it.id][side] = url || null;
        }
      }
      if (!cancelled) setResolvedLogos(next);
    }

    if (items.length) resolveAll();
    else setResolvedLogos({});

    return () => { cancelled = true; };
  }, [items, itemLogosMap, storage]);

  /* ---------- UI helpers ---------- */
  // כמות כבר “מקובעת” לפי ProductDetail – אין שינוי מהעגלה
  function updateQtyBlocked() {
    // בכוונה ריק – משאיר תאימות אם מישהו ינסה לקרוא
  }

  // ✅ שומר Prefill ומנווט לדף המוצר
  function goToProductWithPrefill(it) {
    const prefill = { variants: it.variants || null, lastSelected: it.lastSelected || null };
    try { localStorage.setItem(LS_PREFILL(it.slug), JSON.stringify(prefill)); } catch {}
    navigate(`/product/${it.slug}`, { state: { from: "cart", prefill } });
  }

  // אישור לפני הסרה + ניקוי מפת לוגואים
  function removeItem(id) {
    if (!window.confirm("אתה בטוח שאתה רוצה להסיר מהעגלה?")) return;

    const updated = items.filter((it) => it.id !== id);
    setItems(updated);
    saveCartToLS(updated);

    const map = { ...itemLogosMap };
    if (map[id]) {
      delete map[id];
      writeItemLogosMap(map);
      setItemLogosMap(map);
    }

    // ננקה גם את ה־cache של ה־URLים שנפתרו
    const res = { ...resolvedLogos };
    if (res[id]) { delete res[id]; setResolvedLogos(res); }
  }

  /* ===== סיכומי סל לפי מדרגות ===== */
  const pricingRows = useMemo(
    () => items.map((it) => ({ id: it.id, name: it.name, ...priceRow(it) })),
    [items]
  );

  const merchandiseTotal = useMemo(
    () => pricingRows.reduce((s, r) => s + r.lineTotal, 0),
    [pricingRows]
  );

  const totalSaved = useMemo(
    () => pricingRows.reduce((s, r) => s + r.saved, 0),
    [pricingRows]
  );

  const shippingCost = useMemo(() => {
    const opt = SHIP_OPTIONS[shipping] || SHIP_OPTIONS.standard;
    return items.length === 0 ? 0 : Number(opt.cost || 0);
  }, [shipping, items.length]);

  const grandTotal = useMemo(() => merchandiseTotal + shippingCost, [merchandiseTotal, shippingCost]);

  // יצירת/עדכון טיוטה (לשמירת מטא־דאטה)
  async function ensureDraft(uid) {
    const ref = orderDraftDocRef(uid);
    await setDoc(ref, { status: "draft", updatedAt: serverTimestamp() }, { merge: true });
    return { uid };
  }

  // שמירת קבצים/מטא־דאטה לכל מוצר (slug אחד) — משתמש בלוגו מהמפה
  async function saveAssetsForItem(it) {
    if (!uid) { alert("עליך להתחבר כדי לשמור קבצים."); return; }
    try { await ensureAuthTokenFresh(); } catch {}

    const { uid: userId } = await ensureDraft(uid);
    const orderId = "draft";
    const slug = it.slug;
    if (!slug) { alert("לפריט חסר slug — לא ניתן לשמור קבצים."); return; }

    // הדמיות — עדיפות ל-webp
    const previews = getPreviewsForItem({ slug });
    let frontUrl = null, backUrl = null;

    try {
      if (previews.front?.startsWith?.("data:") || previews.front?.startsWith?.("blob:")) {
        const up = await uploadPreview({ uid: userId, orderId, slug, side: "front", source: previews.front });
        frontUrl = up.webp?.url || up.png?.url || null;
      }
    } catch {}

    try {
      if (previews.back?.startsWith?.("data:") || previews.back?.startsWith?.("blob:")) {
        const up = await uploadPreview({ uid: userId, orderId, slug, side: "back", source: previews.back });
        backUrl = up.webp?.url || up.png?.url || null;
      }
    } catch {}

    // לוגו פר־מוצר מתוך המפה (מפתח = slug)
    const logosMeta = itemLogosMap[it.id] || { front: null, back: null };

    // שליפת טיוטה ועדכון לפי slug אחד
    const draftRef = orderDraftDocRef(uid);
    const snap = await getDoc(draftRef);
    const curItems = Array.isArray(snap.data()?.items) ? snap.data().items : [];

    const rowIndex = curItems.findIndex((r) => r?.slug === slug);
    const baseRow = rowIndex >= 0 ? { ...curItems[rowIndex] } : {};

    const updatedRow = {
      slug,
      name: it.name,
      price: it.price,     // אינדיקטיבי בלבד; החישוב מתבצע בפרונט
      qty: it.qty,         // כמות כוללת לכל המוצר
      variants: it.variants || null, // breakdown למידות/צבעים
      previews: {
        frontUrl: frontUrl || baseRow?.previews?.frontUrl || null,
        backUrl:  backUrl  || baseRow?.previews?.backUrl  || null,
      },
      logos: {
        front: logosMeta.front || baseRow?.logos?.front || null,
        back:  logosMeta.back  || baseRow?.logos?.back  || null,
      },
      updatedAt: Date.now(),
    };

    const nextItems = [...curItems];
    if (rowIndex >= 0) nextItems[rowIndex] = updatedRow;
    else nextItems.push(updatedRow);

    await setDoc(draftRef, { items: nextItems, updatedAt: serverTimestamp() }, { merge: true });
    alert(`נשמרו הקבצים לפריט "${it.name}".`);
  }

  // שמירת כל המוצרים (אם יש הדמיות/לוגואים)
  async function saveAllAssets() {
    if (!uid) { alert("עליך להתחבר כדי לשמור קבצים."); return; }
    try { await ensureAuthTokenFresh(); } catch {}
    for (const it of items) {
      const { front, back } = getPreviewsForItem(it);
      const hasPreview = Boolean(front?.startsWith?.("data:") || back?.startsWith?.("data:") || front?.startsWith?.("blob:") || back?.startsWith?.("blob:"));
      const logosMeta = itemLogosMap[it.id] || {};
      const hasLogo = Boolean(logosMeta.front || logosMeta.back);
      if (hasPreview || hasLogo) {
        try { /* eslint-disable no-await-in-loop */ await saveAssetsForItem(it); /* eslint-enable */ }
        catch (e) { console.error("saveAssetsForItem failed for", it, e); }
      }
    }
    alert("ההדמיות והלוגואים נשמרו לטיוטה.");
  }

  /* ---------- checkout ---------- */
  async function startCheckout() {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      setLoading(true);
      if (!uid) { alert("עליך להתחבר כדי להמשיך לקופה."); return; }

      const a = normalizeAddress(shippingAddress);
      if (items.length > 0 && shipping !== "pickup" && !(a.city.trim() && a.street.trim() && a.house.trim())) {
        alert('אנא מלא/י עיר, רחוב ומספר בית או בחר/י "איסוף מהמפעל".');
        return;
      }
      const addressLine = [a.street, a.house, a.apt].filter(Boolean).join(" ").trim();
      const addressFull = [a.city.trim(), addressLine].filter(Boolean).join(", ");
      const aOut = { ...a, address: addressFull };

      try {
        localStorage.setItem("karina:shippingAddress", JSON.stringify({ ...aOut, city: a.city || "", zip: a.zip || "" }));
      } catch {}

      const shipOpt = SHIP_OPTIONS[shipping] || SHIP_OPTIONS.standard;
      const checkoutState = {
        items,
        shipping: { method: shipping, label: shipOpt.label, cost: shipOpt.cost, address: aOut },
        totals: { merchandiseTotal, shippingCost, grandTotal, totalSaved },
        from: "cart",
      };
      navigate("/checkout", { state: checkoutState });
    } catch (err) {
      console.error(err);
      alert("אירעה שגיאה במעבר לקופה.");
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  }

  /* ---------- render ---------- */
  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">העגלה שלי</h1>

      {items.length === 0 ? (
        <div className="alert alert-info">
          העגלה שלך ריקה. <Link to="/catalog" className="alert-link">חזור לקטלוג</Link>
        </div>
      ) : (
        <>
          {/* טבלת מוצרים — רספונסיבית */}
          <div className="table-responsive">
            <table className="table align-middle">
              <thead className="d-none d-md-table-header-group">
                <tr>
                  <th style={{ width: 160 }}>תצוגה</th>
                  <th>מוצר</th>
                  <th>חלוקה לפי מידה</th>
                  <th style={{ width: 120 }}>כמות</th>
                  <th>מחיר ליחידה</th>
                  <th>סה״כ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const logosMetaForLine = itemLogosMap[it.id] || {};
                  const frontImmediate = pickImmediateUrl(logosMetaForLine.front);
                  const backImmediate  = pickImmediateUrl(logosMetaForLine.back);
                  const frontLogoUrl = frontImmediate || resolvedLogos[it.id]?.front || null;
                  const backLogoUrl  = backImmediate  || resolvedLogos[it.id]?.back  || null;

                  // תמחור לשורה
                  const row = priceRow(it);
                  const sizeTotals = getSizeTotalsFromItemOrAll(items, it);
                  const sizeKeys = Object.keys(sizeTotals || {});
                  const colorEntries = Object.entries(row.variants?.colorTotals || {});
                  const fallbackColor =
                    (!colorEntries.length && typeof it.color === "string" && it.color.trim()) ? it.color.trim() : "";

                  return (
                    <tr key={it.id} style={{ wordBreak: "break-word" }}>
                      {/* תצוגה */}
                      <td className="align-top">
                        <div className="d-flex gap-3 align-items-center">
                          {/* קדמי */}
                          <div className="text-center">
                            {frontLogoUrl ? (
                              <img
                                src={frontLogoUrl}
                                alt={`לוגו קדמי לשורה ${it.name}`}
                                title={(itemLogosMap[it.id]?.front?.name) || (itemLogosMap[it.id]?.front?.contentType) || "לוגו קדמי"}
                                className="cart-logo"
                              />
                            ) : (
                              <div className="cart-logo-empty" title="אין לוגו קדמי">🖼️</div>
                            )}
                            <small className="text-muted d-block mt-1" style={{ lineHeight: 1 }}>לוגו קדמי</small>
                            <button type="button" className="btn btn-sm btn-outline-secondary mt-1" onClick={() => goToProductWithPrefill(it)}>החלף</button>
                          </div>

                          {/* אחורי */}
                          <div className="text-center">
                            {backLogoUrl ? (
                              <img
                                src={backLogoUrl}
                                alt={`לוגו אחורי לשורה ${it.name}`}
                                title={(itemLogosMap[it.id]?.back?.name) || (itemLogosMap[it.id]?.back?.contentType) || "לוגו אחורי"}
                                className="cart-logo"
                              />
                            ) : (
                              <div className="cart-logo-empty" title="אין לוגו אחורי">🖼️</div>
                            )}
                            <small className="text-muted d-block mt-1" style={{ lineHeight: 1 }}>לוגו אחורי</small>
                            <button type="button" className="btn btn-sm btn-outline-secondary mt-1" onClick={() => goToProductWithPrefill(it)}>החלף</button>
                          </div>
                        </div>
                      </td>

                      {/* מוצר + מובייל */}
                      <td className="fw-semibold align-top" style={{ maxWidth: 280 }}>
                        <div className="mb-1">{it.name}</div>

                        {/* מובייל בלבד: פירוט מידות + מחיר/סה"כ/כמות */}
                        <div className="d-md-none small text-muted">
                          {sizeKeys.length ? (
                            <div className="mb-2">
                              <div className="text-muted">מידות:</div>
                              <div className="d-flex flex-wrap gap-2">
                                {sizeKeys.map((sz) => (
                                  <span key={sz} className="badge text-bg-light">{sz}: {sizeTotals[sz]}</span>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {colorEntries.length > 0 && (
                            <div className="mb-2">
                              <div className="text-muted small">צבעים שנבחרו:</div>
                              <div className="d-flex flex-wrap gap-2">
                                {colorEntries.map(([colorName, qty]) => (
                                  <span key={colorName} className="badge text-bg-light">
                                    {colorName}: {qty}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {!colorEntries.length && fallbackColor && (
                            <div className="mb-2">
                              <span className="text-muted small me-2">צבע שנבחר:</span>
                              <span className="badge text-bg-light">{fallbackColor}</span>
                            </div>
                          )}

                          <div className="d-flex flex-wrap gap-2">
                            <span className="badge text-bg-light">
                              מחיר: {row.dPct > 0 ? (<><s>{fmt(row.baseUnit)}</s> → <strong>{fmt(row.unitAfter)}</strong></>) : (<>{fmt(row.baseUnit)}</>)} ₪
                            </span>
                            <span className="badge text-bg-light">סה״כ: {fmt(row.lineTotal)} ₪</span>
                          </div>
                          <div className="mt-2">
                            <label className="form-label me-2 mb-0">כמות</label>
                            <input
                              type="number"
                              min={1}
                              value={it.qty}
                              readOnly
                              onKeyDown={(e) => e.preventDefault()}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="form-control form-control-sm"
                              style={{ width: 120, pointerEvents: "none", cursor: "not-allowed" }}
                              title="הכמות נקבעת לפי פירוט המידות שבחרת בדף המוצר"
                              aria-readonly="true"
                            />
                          </div>

                          {row.dPct > 0 && (
                            <div className="mt-1 text-success small">הנחת כמות: {Math.round(row.dPct * 100)}% (חסכת {fmt(row.saved)} ₪)</div>
                          )}
                        </div>
                      </td>

                      {/* חלוקה לפי מידה (דסקטופ) */}
                      <td className="d-none d-md-table-cell align-top" style={{ maxWidth: 340 }}>
                        {sizeKeys.length ? (
                          <div className="small">
                            <div className="d-flex flex-wrap gap-2">
                              {sizeKeys.map((sz) => (
                                <span key={sz} className="badge text-bg-light">
                                  {sz}: <strong className="ms-1">{sizeTotals[sz]}</strong>
                                </span>
                              ))}
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-secondary mt-2"
                              onClick={() => goToProductWithPrefill(it)}
                              title="עריכת פירוט המידות בדף המוצר (ישוחזרו הבחירות הקודמות)"
                            >
                              ערוך מידות
                            </button>
                          </div>
                        ) : (
                          <div className="text-muted small">
                            אין פירוט לפי מידה.{" "}
                            <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => goToProductWithPrefill(it)}>
                              הוסף בדף המוצר
                            </button>
                          </div>
                        )}
                      </td>

                      {/* כמות כוללת – דסקטופ (מקובע) */}
                      <td className="d-none d-md-table-cell align-top">
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          readOnly
                          onKeyDown={(e) => e.preventDefault()}
                          onWheel={(e) => e.currentTarget.blur()}
                          onChange={updateQtyBlocked}
                          className="form-control form-control-sm w-auto"
                          style={{ pointerEvents: "none", cursor: "not-allowed" }}
                          title="הכמות נקבעת לפי פירוט המידות שבחרת בדף המוצר"
                          aria-readonly="true"
                        />
                        {row.dPct > 0 && (
                          <div className="small text-success mt-1">הנחה: {Math.round(row.dPct * 100)}%</div>
                        )}
                      </td>

                      {/* מחיר ליחידה */}
                      <td className="d-none d-md-table-cell align-top">
                        {row.dPct > 0 ? (
                          <>
                            <div><s>{fmt(row.baseUnit)} ₪</s></div>
                            <div><strong>{fmt(row.unitAfter)} ₪</strong></div>
                          </>
                        ) : (
                          <>{fmt(row.baseUnit)} ₪</>
                        )}
                      </td>

                      {/* סה"כ לשורה */}
                      <td className="d-none d-md-table-cell align-top">
                        <strong>{fmt(row.lineTotal)} ₪</strong>
                        {row.saved > 0 && <div className="small text-success">חיסכון: {fmt(row.saved)} ₪</div>}
                      </td>

                      {/* פעולות */}
                      <td className="align-top">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeItem(it.id)}
                          aria-label={`הסר את ${it.name} מהעגלה`}
                        >
                          הסר
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* משלוח + כתובת */}
          <div className="mt-3 p-3 border rounded-3">
            <h6 className="mb-3">אפשרות משלוח</h6>
            <div className="d-flex flex-wrap gap-4">
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
                    id="city"
                    list="cities-list"
                    className="form-control"
                    placeholder={citiesLoading ? "טוען ערים…" : "הקלד/י ובחר/י עיר"}
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                    autoComplete="address-level2"
                    dir="rtl"
                  />
                  <datalist id="cities-list">
                    {cityOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>
                <div className="col-md-6">
                  <label className="form-label">רחוב</label>
                  <input type="text" className="form-control" value={shippingAddress.street}
                         onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">מספר טלפון ליצירת קשר</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    pattern="[0-9+\-()\s]{7,20}"
                    className="form-control"
                    placeholder="05x-xxxxxxx"
                    value={shippingAddress.phoneNumber}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, phoneNumber: e.target.value })}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">מספר בית</label>
                  <input type="text" className="form-control" value={shippingAddress.house}
                         onChange={(e) => setShippingAddress({ ...shippingAddress, house: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">דירה</label>
                  <input type="text" className="form-control" value={shippingAddress.apt}
                         onChange={(e) => setShippingAddress({ ...shippingAddress, apt: e.target.value })} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">מיקוד</label>
                  <input type="text" className="form-control" value={shippingAddress.zip}
                         onChange={(e) => setShippingAddress({ ...shippingAddress, zip: e.target.value })} />
                </div>
                <div className="col-12">
                  <label className="form-label">הערות לשליח</label>
                  <textarea className="form-control" rows={2} value={shippingAddress.notes}
                            onChange={(e) => setShippingAddress({ ...shippingAddress, notes: e.target.value })} />
                </div>
              </div>
              <small className="text-muted d-block mt-1">
                נדרש עיר, רחוב ומספר בית למשלוח (או בחר/י "איסוף מהמפעל").
              </small>
            </div>
          </div>

          {/* סיכום ותשלום */}
          <div className="d-flex justify-content-between align-items-end mt-4 flex-wrap gap-3">
            <Link to="/catalog" className="btn btn-outline-secondary">המשך בקנייה</Link>
            <div className="ms-auto">
              <div className="text-end">
                <div className="d-flex justify-content-between" style={{ minWidth: 280 }}>
                  <span className="text-muted">סה״כ מוצרים (אחרי הנחות):</span>
                  <strong>{fmt(merchandiseTotal)} ₪</strong>
                </div>
                {totalSaved > 0 && (
                  <div className="d-flex justify-content-between text-success" style={{ minWidth: 280 }}>
                    <span>חסכת עד כה:</span>
                    <strong>{fmt(totalSaved)} ₪</strong>
                  </div>
                )}
                <div className="d-flex justify-content-between" style={{ minWidth: 280 }}>
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

          <div className="mt-4 w-100">
            <PhoneOrderRequest
              items={items}
              totals={{ merchandiseTotal, shippingCost, grandTotal, totalSaved }}
              shippingAddress={shippingAddress}
              source="cart"
              uid={uid}
            />
          </div>
        </>
      )}
    </div>
  );
}
