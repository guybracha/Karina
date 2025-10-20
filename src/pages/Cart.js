/* @refresh skip */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../style/Cart.css";

// ---- Firebase ----
import { auth, db, ensureAuthTokenFresh } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref as storageRef, getDownloadURL } from "firebase/storage";

// ---- (לשימוש בהדמיות בלבד) ----
import { uploadPreview } from "../lib/uploadPreview";

/* =========================================================================
   LS keys & helpers
============================================================================ */
const LS_CART_KEY = "karina:cart";
const LS_SHIP_KEY = "karina:shipping";
const LS_ADDR_KEY = "karina:shippingAddress";
const LS_PREVIEW_KEY = (slug, side) => `karina:preview:${slug}:${side}`;

// מפה של לוגו פר־שורה: { [lineId]: { front: Meta|null, back: Meta|null } }
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
function defaultAddress() { return { city: "", street: "", house: "", apt: "", zip: "", notes: "" }; }
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
  } catch { return defaultAddress(); }
}
function writeAddressToLS(a) {
  try { localStorage.setItem(LS_ADDR_KEY, JSON.stringify(normalizeAddress(a))); } catch {}
}

function isValidItem(x) { return x && typeof x === "object" && "id" in x && "name" in x; }
function normalizeCartArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(isValidItem).map((it) => ({
    ...it,
    qty: Math.max(1, Number(it.qty) || 1),
    price: Number(it.price) || 0,
    color: typeof it.color === "string" ? it.color : it.color ?? "",
    size: typeof it.size === "string" ? it.size : it.size ?? "",
    slug: typeof it.slug === "string" ? it.slug : it.slug ?? "",
  }));
}
function readCartFromLS() {
  try { return normalizeCartArray(JSON.parse(localStorage.getItem(LS_CART_KEY) || "[]")); }
  catch { return []; }
}
function saveCartToLS(next) {
  try {
    const norm = normalizeCartArray(next);
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

/* =========================================================================
   Firestore refs
============================================================================ */
function orderDraftDocRef(userId) {
  return doc(db, "users", userId, "orders", "draft");
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
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState(null);
  const busyRef = useRef(false);

  // לוגואים פר־שורה (מה-LS)
  const [itemLogosMap, setItemLogosMap] = useState(() => readItemLogosMap());

  // URLים שנפתרו בפועל להצגה (אחרי getDownloadURL אם צריך)
  // מבנה: { [lineId]: { front: string|null, back: string|null } }
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
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("karina:cartUpdated", onCustomCart);
      window.removeEventListener("karina:itemLogosUpdated", onLogosUpdated);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_SHIP_KEY, shipping); } catch {}
    writeAddressToLS(shippingAddress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipping, shippingAddress]);

  // === פותר URLים אמיתיים לתצוגה עבור כל שורה ===
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
  function updateQty(id, newQty) {
    const qty = Math.max(1, Number(newQty) || 1);
    const updated = items.map((it) => (it.id === id ? { ...it, qty } : it));
    setItems(updated);
    saveCartToLS(updated);
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

  const merchandiseTotal = useMemo(
    () => items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0),
    [items]
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

  // שמירת קבצים/מטא־דאטה לשורה אחת — משתמש בלוגו מהמפה (לא מעלה שוב)
  async function saveAssetsForItem(it) {
    if (!uid) { alert("עליך להתחבר כדי לשמור קבצים."); return; }
    try { await ensureAuthTokenFresh(); } catch {}

    const customer = await ensureDraft(uid);
    const orderId = "draft";
    const slug = it.slug;
    if (!slug) { alert("לפריט חסר slug — לא ניתן לשמור קבצים."); return; }

    // הדמיות (כמו שהיה) — עדיפות ל־webp
    const { front, back } = getPreviewsForItem({ slug });
    let frontUrl = null, backUrl = null;

    try {
      if (front?.startsWith?.("data:") || front?.startsWith?.("blob:")) {
        const up = await uploadPreview({ uid: customer.uid, orderId, slug, side: "front", source: front });
        frontUrl = up.webp?.url || up.png?.url || null;
      }
    } catch {}

    try {
      if (back?.startsWith?.("data:") || back?.startsWith?.("blob:")) {
        const up = await uploadPreview({ uid: customer.uid, orderId, slug, side: "back", source: back });
        backUrl = up.webp?.url || up.png?.url || null;
      }
    } catch {}

    // לוגו פר־שורה מתוך המפה
    const logosMeta = itemLogosMap[it.id] || { front: null, back: null };

    // עדכון המסמך בטיוטה
    const keyOf = (x) => `${x.slug || ""}__${x.color || ""}__${x.size || ""}`;
    const meKey = keyOf(it);

    const currentDraftSnap = await getDoc(orderDraftDocRef(uid));
    const currentItems = Array.isArray(currentDraftSnap.data()?.items) ? currentDraftSnap.data().items : [];

    const nextItems = currentItems.map((row) =>
      keyOf(row) === meKey
        ? {
            ...row,
            previews: { frontUrl: frontUrl || row?.previews?.frontUrl || null, backUrl: backUrl || row?.previews?.backUrl || null },
            logos:    { front: logosMeta.front || row?.logos?.front || null,  back:  logosMeta.back  || row?.logos?.back  || null },
          }
        : row
    );

    const existed = nextItems.some((r) => keyOf(r) === meKey);
    const completedRow = {
      slug: it.slug, name: it.name, price: it.price, qty: it.qty, color: it.color, size: it.size,
      previews: { frontUrl: frontUrl || null, backUrl: backUrl || null },
      logos:    { front: logosMeta.front || null, back: logosMeta.back || null },
    };
    const finalItems = existed ? nextItems : [...nextItems, completedRow];

    await setDoc(orderDraftDocRef(uid), { items: finalItems, updatedAt: serverTimestamp() }, { merge: true });
    alert(`נשמרו הקבצים לפריט "${it.name}".`);
  }

  // שמירת כל השורות (אם יש הדמיות/לוגואים)
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
        totals: { merchandiseTotal, shippingCost, grandTotal },
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
                  // meta כפי שנשמר ב-LS עבור השורה
                  const logosMetaForLine = itemLogosMap[it.id] || {};

                  // קודם ננסה URL מיידי מה-meta, אם אין – נשתמש במה שנפתר אסינכרונית
                  const frontImmediate = pickImmediateUrl(logosMetaForLine.front);
                  const backImmediate  = pickImmediateUrl(logosMetaForLine.back);

                  const frontLogoUrl = frontImmediate || resolvedLogos[it.id]?.front || null;
                  const backLogoUrl  = backImmediate  || resolvedLogos[it.id]?.back  || null;

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
          title={
            (itemLogosMap[it.id]?.front?.name) ||
            (itemLogosMap[it.id]?.front?.contentType) ||
            "לוגו קדמי"
          }
          className="cart-logo"
        />
      ) : (
        <div className="cart-logo-empty" title="אין לוגו קדמי">🖼️</div>
      )}
      <small className="text-muted d-block mt-1" style={{ lineHeight: 1 }}>
        לוגו קדמי
      </small>

      {/* אופציונלי: כפתור החלפה יוביל לעמוד המוצר */}
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary mt-1"
        onClick={() => navigate(`/product/${it.slug}`)}
        title="החלף לוגו קדמי"
      >
        החלף
      </button>
    </div>

    {/* אחורי */}
    <div className="text-center">
      {backLogoUrl ? (
        <img
          src={backLogoUrl}
          alt={`לוגו אחורי לשורה ${it.name}`}
          title={
            (itemLogosMap[it.id]?.back?.name) ||
            (itemLogosMap[it.id]?.back?.contentType) ||
            "לוגו אחורי"
          }
          className="cart-logo"
        />
      ) : (
        <div className="cart-logo-empty" title="אין לוגו אחורי">🖼️</div>
      )}
      <small className="text-muted d-block mt-1" style={{ lineHeight: 1 }}>
        לוגו אחורי
      </small>

      <button
        type="button"
        className="btn btn-sm btn-outline-secondary mt-1"
        onClick={() => navigate(`/product/${it.slug}`)}
        title="החלף לוגו אחורי"
      >
        החלף
      </button>
    </div>
  </div>
</td>


                      {/* מוצר + מובייל */}
                      <td className="fw-semibold align-top" style={{ maxWidth: 280 }}>
                        <div className="mb-1">{it.name}</div>

                        {/* מובייל בלבד: פרטי צבע/מידה/כמות/מחיר/סה״כ */}
                        <div className="d-md-none small text-muted">
                          <div className="d-flex flex-wrap gap-2">
                            <span className="badge text-bg-light">צבע: {it.color || "—"}</span>
                            <span className="badge text-bg-light">מידה: {it.size || "—"}</span>
                            <span className="badge text-bg-light">מחיר: {fmt(it.price)} ₪</span>
                            <span className="badge text-bg-light">סה״כ: {fmt(Number(it.price) * Number(it.qty))} ₪</span>
                          </div>
                          <div className="mt-2">
                            <label className="form-label me-2 mb-0">כמות</label>
                            <input
                              type="number"
                              min={1}
                              value={it.qty}
                              onChange={(e) => updateQty(it.id, e.target.value)}
                              className="form-control form-control-sm"
                              style={{ width: 120 }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* עמודות רגילות לטאבלט/דסקטופ */}
                      <td className="d-none d-md-table-cell align-top">{it.color}</td>
                      <td className="d-none d-md-table-cell align-top">{it.size}</td>
                      <td className="d-none d-md-table-cell align-top">
                        <input
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) => updateQty(it.id, e.target.value)}
                          className="form-control form-control-sm w-auto"
                        />
                      </td>
                      <td className="d-none d-md-table-cell align-top">{fmt(it.price)} ₪</td>
                      <td className="d-none d-md-table-cell align-top">{fmt(Number(it.price) * Number(it.qty))} ₪</td>

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
            <div className="d-flex flex-wrap gap-4">{/* <-- תיקון className (ללא הנקודה) */}
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
                  <input type="text" className="form-control" value={shippingAddress.city}
                         onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">רחוב</label>
                  <input type="text" className="form-control" value={shippingAddress.street}
                         onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })} />
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
