// src/pages/ProductDetail.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { LogosQueueProvider } from "../contexts/LogosQueueContext.tsx";
import LogoUploadModal from "../components/LogoUploadModal";
import ColorSwatches from "../components/ColorSwatches";
// import SizePicker from "../components/SizePicker";
import { PRODUCTS } from "../lib/products";
import { getDiscountPct } from "../lib/pricing";

import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ensureUserDoc } from "../services/users";
import ProductSEO from "../components/seo/ProductSEO.js";

// ===== LocalStorage keys =====
const LS_LOGO_STORAGE_KEY = (slug, side) => `karina:logoStorage:${slug}:${side}`;
const LS_CART_KEY = "karina:cart";
const LS_RATING_KEY = (slug) => `karina:rating:${slug}`;
const LS_ITEM_LOGOS = "karina:itemLogos";
const LS_PLACEMENT_KEY = (slug, side) => `karina:logoPlacement:${slug}:${side}`;
function readItemLogosMap() { try { return JSON.parse(localStorage.getItem(LS_ITEM_LOGOS) || "{}") || {}; } catch { return {}; } }
function writeItemLogosMap(map) { try { localStorage.setItem(LS_ITEM_LOGOS, JSON.stringify(map)); window.dispatchEvent(new Event("karina:itemLogosUpdated")); } catch {} }

// ✅ Prefill כשחוזרים מהעגלה
const LS_PREFILL = (slug) => `karina:productPrefill:${slug}`;

/* === Logo Placement Modal === */
function LogoPlacementModal({
  show, onClose, productName, productImg, logoUrl, side = "front",
  printArea, initialPlacement, onSavePlacement,
}) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const logoRef = useRef(null);

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [areaRect, setAreaRect] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [placement, setPlacement] = useState({ xPct: 0.5, yPct: 0.5, scalePct: 60 });
  const [logoNatural, setLogoNatural] = useState({ w: 0, h: 0 });
  const [dpiReport, setDpiReport] = useState({ x: 0, y: 0, verdict: "unknown" });

  function computeAreaRect(containerW, containerH, area) {
    if (!area || (!area.w && !area.h)) {
      const w = containerW * 0.5; const h = containerH * 0.6;
      const x = (containerW - w) / 2; const y = containerH * 0.18;
      return { x, y, w, h };
    }
    const isFrac = (v) => typeof v === "number" && v > 0 && v <= 1;
    const toPx = (v, total) => (isFrac(v) ? v * total : (typeof v === "number" ? v : 0));
    const w = toPx(area.w, containerW) || containerW * 0.5;
    const h = toPx(area.h, containerH) || containerH * 0.6;
    let x = toPx(area.x, containerW); let y = toPx(area.y, containerH);
    if (!(x > 0)) x = (containerW - w) / 2;
    if (!(y > 0)) y = (containerH - h) / 5;
    return { x, y, w, h };
  }

  useEffect(() => { if (initialPlacement) setPlacement(initialPlacement); }, [initialPlacement]);
  useEffect(() => {
    function recalc() {
      const el = containerRef.current; if (!el) return;
      const rect = el.getBoundingClientRect(); const w = rect.width;
      const h = Math.max(420, Math.min(640, (rect.width * 4) / 3));
      setContainerSize({ w, h }); setAreaRect(computeAreaRect(w, h, printArea));
    }
    recalc(); window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [printArea, show]);

  useEffect(() => {
    if (!logoUrl) return;
    const im = new Image();
    im.onload = () => setLogoNatural({ w: im.naturalWidth, h: im.naturalHeight });
    im.src = logoUrl;
  }, [logoUrl]);

  function onPointerDown(e) {
    if (!logoRef.current) return;
    const logoRect = logoRef.current.getBoundingClientRect();
    setDragging(true); setDragOffset({ x: e.clientX - logoRect.left, y: e.clientY - logoRect.top });
  }
  function onPointerMove(e) {
    if (!dragging || !containerRef.current) return;
    const cont = containerRef.current.getBoundingClientRect(); const area = areaRect; const logoEl = logoRef.current; if (!logoEl) return;
    const logoW = logoEl.offsetWidth; const logoH = logoEl.offsetHeight;
    let nx = e.clientX - cont.left - dragOffset.x; let ny = e.clientY - cont.top - dragOffset.y;
    nx = Math.max(area.x, Math.min(area.x + area.w - logoW, nx)); ny = Math.max(area.y, Math.min(area.y + area.h - logoH, ny));
    const cx = nx + logoW / 2; const cy = ny + logoH / 2;
    setPlacement((prev) => ({ ...prev, xPct: (cx - area.x) / area.w, yPct: (cy - area.y) / area.h }));
  }
  function onPointerUp() { setDragging(false); }
  function setScalePct(v) { const val = Math.max(10, Math.min(100, Number(v) || 60)); setPlacement((prev) => ({ ...prev, scalePct: val })); }

  useEffect(() => {
    const wCm = (printArea?.widthCm && printArea?.widthCm > 0) ? printArea.widthCm : 30;
    const hCm = (printArea?.heightCm && printArea?.heightCm > 0) ? printArea.heightCm : 35;
    const logoWcm = (placement.scalePct / 100) * wCm; const logoHcm = (placement.scalePct / 100) * hCm;
    const wIn = logoWcm / 2.54; const hIn = logoHcm / 2.54;
    const dpiX = logoNatural.w && wIn ? (logoNatural.w / wIn) : 0; const dpiY = logoNatural.h && hIn ? (logoNatural.h / hIn) : 0;
    const minDpi = Math.min(dpiX, dpiY);
    let verdict = "unknown"; if (minDpi >= 200) verdict = "מצוין"; else if (minDpi >= 150) verdict = "סביר"; else if (minDpi > 0) verdict = "נמוך";
    setDpiReport({ x: Math.round(dpiX), y: Math.round(dpiY), verdict });
  }, [placement.scalePct, logoNatural, printArea]);

  if (!show) return null;

  const logoPx = (() => {
    const lw = (placement.scalePct / 100) * areaRect.w;
    const lh = (placement.scalePct / 100) * areaRect.h;
    const cx = areaRect.x + placement.xPct * areaRect.w; const cy = areaRect.y + placement.yPct * areaRect.h;
    return { w: lw, h: lh, left: cx - lw / 2, top: cy - lh / 2 };
  })();

  const clampedLogoPx = {
    w: Math.min(logoPx.w, areaRect.w), h: Math.min(logoPx.h, areaRect.h),
    left: Math.min(Math.max(logoPx.left, areaRect.x), areaRect.x + areaRect.w - Math.min(logoPx.w, areaRect.w)),
    top: Math.min(Math.max(logoPx.top, areaRect.y), areaRect.y + areaRect.h - Math.min(logoPx.h, areaRect.h)),
  };

  return (
    <div
      className="modal fade show"
      style={{ display: "block", background: "rgba(0,0,0,.5)" }}
      role="dialog" aria-modal="true" aria-labelledby="logoPlaceTitle"
      onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
      onTouchMove={(e) => { if (e.touches[0]) onPointerMove(e.touches[0]); }} onTouchEnd={onPointerUp}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 id="logoPlaceTitle" className="modal-title">בדיקת התאמת לוגו – {productName} ({side === "front" ? "קדמי" : "אחורי"})</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="סגור" />
          </div>
          <div className="modal-body">
            {!logoUrl ? (
              <div className="alert alert-secondary">לא הועלה לוגו עדיין. העלה לוגו ואז נסה שוב.</div>
            ) : (
              <>
                <div ref={containerRef} className="position-relative w-100 mx-auto" style={{ maxWidth: 860, userSelect: "none" }}>
                  <div style={{ width: "100%", height: containerSize.h, position: "relative", borderRadius: 12, overflow: "hidden", background: "#f8fafc", border: "1px solid #eef2f7" }}>
                    {productImg && (
                      <img ref={imgRef} src={productImg} alt={productName} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain", pointerEvents:"none" }} />
                    )}
                    <div
                      style={{
                        position:"absolute", left: areaRect.x, top: areaRect.y, width: areaRect.w, height: areaRect.h,
                        border: "2px dashed rgba(79,70,229,.6)",
                        background: "repeating-linear-gradient(45deg, rgba(99,102,241,.06), rgba(99,102,241,.06) 10px, rgba(99,102,241,.1) 10px, rgba(99,102,241,.1) 20px)",
                        borderRadius: 12
                      }}
                      aria-label="אזור הדפסה"
                    />
                    <img
                      ref={logoRef}
                      src={logoUrl}
                      alt="לוגו להצבה"
                      draggable={false}
                      onMouseDown={onPointerDown}
                      onTouchStart={(e) => { if (e.touches[0]) onPointerDown(e.touches[0]); }}
                      style={{
                        position: "absolute",
                        left: clampedLogoPx.left, top: clampedLogoPx.top,
                        width: clampedLogoPx.w, height: clampedLogoPx.h,
                        objectFit: "contain", cursor: "grab",
                        filter: "drop-shadow(0 4px 12px rgba(2,6,23,.2))",
                      }}
                    />
                  </div>
                </div>

                <div className="row g-3 align-items-center mt-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">גודל הלוגו ביחס לאזור ההדפסה: {placement.scalePct}%</label>
                    <input type="range" min={10} max={100} step={1} className="form-range" value={placement.scalePct} onChange={(e) => setScalePct(e.target.value)} />
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 border rounded-3 bg-light">
                      <div className="fw-bold mb-1">איכות הדפסה משוערת (DPI)</div>
                      <div className="small text-muted mb-2">הערכה לפי גודל קובץ ותצורה נוכחית</div>
                      <div className="d-flex flex-wrap gap-3 align-items-center">
                        <span className="badge text-bg-secondary">X: {dpiReport.x} DPI</span>
                        <span className="badge text-bg-secondary">Y: {dpiReport.y} DPI</span>
                        {dpiReport.verdict === "מצוין" && <span className="badge text-bg-success">מצוין להדפסה (≥200)</span>}
                        {dpiReport.verdict === "סביר" && <span className="badge text-bg-warning">סביר (150–199)</span>}
                        {dpiReport.verdict === "נמוך" && <span className="badge text-bg-danger">איכות נמוכה (&lt;150)</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-light" onClick={onClose}>ביטול</button>
            <button type="button" className="btn btn-primary" disabled={!logoUrl} onClick={() => { onSavePlacement(placement, dpiReport); onClose(); }}>
              שמור הצבה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // גלילה לראש העמוד בכל כניסה או שינוי מוצר
  useEffect(() => {
    // גלילה מיידית
    window.scrollTo(0, 0);
    // גלילה נוספת אחרי רינדור (למקרה שיש תוכן דינמי)
    setTimeout(() => window.scrollTo(0, 0), 100);
  }, [slug]);
  
  const [showUpload, setShowUpload] = useState(false);
  const [showPlacement, setShowPlacement] = useState(false);

  const product = useMemo(() => PRODUCTS.find((p) => p.slug === slug), [slug]);
  const canUploadLogo = product?.logoAllowed !== false;
  const isCartBlocked = useMemo(() => {
    if (!product) return false;
    const priceNum = Number(product.price || 0);
    return priceNum === 0 && product.isBlocked === true;
  }, [product]);

  // auth
  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  async function ensureUserAndDraft(u) {
    if (!u) return;
    try {
      await ensureUserDoc(u);

      await setDoc(doc(db, "users_prod", u.uid, "orders_prod", "draft"), {
        status: "draft",
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.error("[ensureUserAndDraft] failed:", e);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setIsSeller(false);
      setCheckingRole(true);
      try {
        if (u) {
          await ensureUserAndDraft(u);
          const snap = await getDoc(doc(db, "users_prod", u.uid));
          const data = snap.exists() ? snap.data() : {};
          const sellerFlag =
            data?.isSeller === true ||
            data?.role === "seller" ||
            (Array.isArray(data?.roles) && data.roles.includes("seller"));
          setIsSeller(!!sellerFlag);
        }
      } finally {
        setCheckingRole(false);
      }
    });
    return () => unsub();
  }, []);

  // בחירות מוצר
  const [color, setColor] = useState(product?.colors?.[0] || "");
  
  const [side, setSide] = useState("front");

  
// 🖼️ Choose image by selected color (front/back) using product.images/backImages
  const baseImageForSide = useMemo(() => {
    if (!product) return null;
    const byColor = product.images || {};
    const backByColor = product.backImages || {};
    if (side === "back") {
      return backByColor[color] || product.backImg || byColor[color] || product.img || null;
    }
    return byColor[color] || product.img || null;
  }, [product, side, color]);

  const shownImage = baseImageForSide;
// לוגו
  const [logoStorageBySide, setLogoStorageBySide] = useState({ front: null, back: null });

  // דירוג (נשאר)
  const baseAvg = Number(product?.rating ?? 4.5);
  const baseCount = Number(product?.reviews ?? 120);
  const [userRating, setUserRating] = useState(0);
  const [displayAvg, setDisplayAvg] = useState(baseAvg);
  const [displayCount, setDisplayCount] = useState(baseCount);

  // SEO/meta
  const origin = typeof window !== "undefined" ? window.location.origin : "https://example.com";
  const canonical = `${origin}/product/${slug}`;
  const colorsList = product?.colors?.slice(0, 4)?.join(" / ") || "";
  const sizesList  = product?.sizes?.slice(0, 4)?.join(", ") || "";
  const description = product
    ? `${product?.name ?? ""} ${canUploadLogo ? "— מתאים להדפסה אישית." : "— ללא אפשרות הטבעת לוגו."} צבעים: ${colorsList}. מידות: ${sizesList}.`
    : "המוצר לא נמצא.";
  const currentKey = product?.type ?? product?.category ?? null;
  const similarProducts = useMemo(
    () =>
      product && currentKey
        ? PRODUCTS.filter((p) => p.slug !== product.slug && (p.type ?? p.category) === currentKey).slice(0, 8)
        : [],
    [product, currentKey]
  );

  // ----- עגלה LS -----
  function readCartFromLS() { try { return JSON.parse(localStorage.getItem(LS_CART_KEY) || "[]") ?? []; } catch { return []; } }
  function saveCartToLS(next) { try { localStorage.setItem(LS_CART_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("karina:cartUpdated")); } catch {} }

  // אתחול במעבר מוצר
  useEffect(() => {
    setColor(product?.colors?.[0] || "");
    setSide("front");

    if (canUploadLogo) {
      try {
        const sFront = JSON.parse(localStorage.getItem(LS_LOGO_STORAGE_KEY(product?.slug || "unknown", "front")) || "null");
        const sBack  = JSON.parse(localStorage.getItem(LS_LOGO_STORAGE_KEY(product?.slug || "unknown", "back"))  || "null");
        setLogoStorageBySide({ front: sFront, back: sBack });
      } catch { setLogoStorageBySide({ front: null, back: null }); }
    } else {
      try {
        localStorage.removeItem(LS_LOGO_STORAGE_KEY(product?.slug || "unknown", "front"));
        localStorage.removeItem(LS_LOGO_STORAGE_KEY(product?.slug || "unknown", "back"));
      } catch {}
      setLogoStorageBySide({ front: null, back: null });
    }

    try {
      const ur = Number(localStorage.getItem(LS_RATING_KEY(product?.slug || "")) || 0);
      setUserRating(ur || 0);
      if (ur > 0) { setDisplayAvg(((baseAvg * baseCount) + ur) / (baseCount + 1)); setDisplayCount(baseCount + 1); }
      else { setDisplayAvg(baseAvg); setDisplayCount(baseCount); }
    } catch { setUserRating(0); setDisplayAvg(baseAvg); setDisplayCount(baseCount); }

    setShowUpload(false); setShowPlacement(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.slug, canUploadLogo]);

  // ---- Prefill: המרה של variants למפת bulkByColor ----
  function variantsToBulkMap(variants, sizes = []) {
    const out = {};
    if (!variants?.byColorSize) return out;
    for (const [colorKey, sizeObj] of Object.entries(variants.byColorSize)) {
      out[colorKey] = {};
      sizes.forEach((s) => { out[colorKey][s] = 0; });
      for (const [sizeKey, qty] of Object.entries(sizeObj || {})) {
        out[colorKey][sizeKey] = Math.max(0, Number(qty) || 0);
      }
    }
    return out;
  }

  // Bulk בלבד
  const [bulkByColor, setBulkByColor] = useState({});
  useEffect(() => {
    if (!product?.sizes || !color) return;
    setBulkByColor((prev) => {
      if (prev[color]) {
        const copy = { ...prev[color] };
        product.sizes.forEach((s) => { if (typeof copy[s] !== "number") copy[s] = 0; });
        return { ...prev, [color]: copy };
      } else {
        const init = {}; product.sizes.forEach((s) => (init[s] = 0));
        return { ...prev, [color]: init };
      }
    });
  }, [color, product?.sizes]);

  // ✅ שחזור בחירות מהעגלה (prefill)
  useEffect(() => {
    if (!product?.slug) return;

    // קודם מ-location.state, אחרת מ-LS
    let prefill = location.state?.prefill || null;
    if (!prefill) {
      try { prefill = JSON.parse(localStorage.getItem(LS_PREFILL(product.slug)) || "null"); } catch {}
    }
    if (!prefill) return;

    if (prefill.variants) {
      const bulkMap = variantsToBulkMap(prefill.variants, product?.sizes || []);
      if (Object.keys(bulkMap).length > 0) {
        setBulkByColor(bulkMap);

        const selectedColor =
          prefill.lastSelected?.color && bulkMap[prefill.lastSelected.color]
            ? prefill.lastSelected.color
            : (() => {
                for (const c of Object.keys(bulkMap)) {
                  const sum = Object.values(bulkMap[c] || {}).reduce((s, n) => s + (Number(n) || 0), 0);
                  if (sum > 0) return c;
                }
                return product?.colors?.[0] || "";
              })();

        if (selectedColor) setColor(selectedColor);
      }
    }

    // מנקה את ה-prefill אחרי שימוש
    try { localStorage.removeItem(LS_PREFILL(product.slug)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.slug]);

  function onLogoUploaded(_dataUrl, uploaded) {
    if (!canUploadLogo) { alert("לא ניתן להעלות לוגו לפריט זה."); setShowUpload(false); return; }
    const storage = uploaded?.storage || null;
    setLogoStorageBySide((prev) => {
      const next = { ...prev, [side]: storage };
      try { localStorage.setItem(LS_LOGO_STORAGE_KEY(product.slug, side), JSON.stringify(storage)); } catch {}
      return next;
    });
    setShowUpload(false);
  }

  function resetSavedLogosAndPlacement() {
    try {
      localStorage.removeItem(LS_LOGO_STORAGE_KEY(product?.slug, "front"));
      localStorage.removeItem(LS_LOGO_STORAGE_KEY(product?.slug, "back"));
      localStorage.removeItem(LS_PLACEMENT_KEY(product?.slug, "front"));
      localStorage.removeItem(LS_PLACEMENT_KEY(product?.slug, "back"));
    } catch {}
    setLogoStorageBySide({ front: null, back: null });
  }

  function ensureAuthed(){
    if(!user){
      alert("עליך להתחבר כדי להוסיף פריטים לעגלה");
      return false;
    }
    return true;
  }

  // breakdown helper
  function addToBreakdown(breakdown, colorKey, sizeKey, qtyToAdd) {
    const safeQty = Math.max(0, Number(qtyToAdd) || 0);
    const next = breakdown ? { ...breakdown } : { byColorSize: {}, colorTotals: {}, sizeTotals: {} };
    const byColor = next.byColorSize[colorKey] ? { ...next.byColorSize[colorKey] } : {};
    byColor[sizeKey] = (Number(byColor[sizeKey]) || 0) + safeQty;
    next.byColorSize = { ...next.byColorSize, [colorKey]: byColor };
    // totals יתעדכנו מחדש כשנחשב שורה
    return next;
  }

  // 🔁 עזרי סנכרון לעגלה
  function sumBreakdownQty(byColorSize) {
    let sum = 0;
    for (const colorKey of Object.keys(byColorSize || {})) {
      for (const sizeKey of Object.keys(byColorSize[colorKey] || {})) {
        sum += Math.max(0, Number(byColorSize[colorKey][sizeKey]) || 0);
      }
    }
    return sum;
  }

  function recalcTotals(breakdown) {
    const by = breakdown?.byColorSize || {};
    const colorTotals = {};
    const sizeTotals = {};
    Object.entries(by).forEach(([c, sizeObj]) => {
      colorTotals[c] = Object.values(sizeObj || {}).reduce((s, n) => s + (Number(n) || 0), 0);
      Object.entries(sizeObj || {}).forEach(([sz, q]) => {
        sizeTotals[sz] = (sizeTotals[sz] || 0) + (Number(q) || 0);
      });
    });
    return { byColorSize: by, colorTotals, sizeTotals };
  }

  function removeColorFromCartLine(line, colorKey) {
    if (!line?.variants?.byColorSize) return line;
    const by = { ...line.variants.byColorSize };
    delete by[colorKey];
    const variants = recalcTotals({ byColorSize: by });
    const newQty = sumBreakdownQty(by);
    return { ...line, variants, qty: newQty, updatedAt: Date.now() };
  }

  function removeWholeProductFromCart() {
    const current = readCartFromLS();
    const next = current.filter((it) => it.id !== product.slug);
    saveCartToLS(next);
  }

  // חישובי באלק
  const bulkForCurrentColor = bulkByColor[color] || {};
  const bulkTotalForCurrentColor = useMemo(
    () => Object.values(bulkForCurrentColor).reduce((s, n) => s + (Number(n) || 0), 0),
    [bulkForCurrentColor]
  );
  function setBulkQty(sizeKey, value) {
    const num = Math.max(0, Number(value) || 0);
    setBulkByColor((prev) => ({ ...prev, [color]: { ...(prev[color] || {}), [sizeKey]: num } }));
  }

  // ❗ איפוס צבע + סנכרון לעגלה
  function clearBulkForColor() {
    if (!product?.sizes) return;
    // 1) אפס UI
    const cleared = {}; product.sizes.forEach((s) => (cleared[s] = 0));
    setBulkByColor((prev) => ({ ...prev, [color]: cleared }));

    // 2) אפס בעגלה את הצבע הזה
    const current = readCartFromLS();
    const idx = current.findIndex((it) => it.id === product.slug);
    if (idx >= 0) {
      const updated = removeColorFromCartLine(current[idx], color);
      let next = [...current];
      if (updated.qty <= 0) {
        next = next.filter((it) => it.id !== product.slug);
      } else {
        next[idx] = updated;
      }
      saveCartToLS(next);
    }
  }

  // 🗑️ איפוס מלא למוצר הזה (כולל עגלה + לוגו/Placement)
  function resetAllForThisProduct() {
    // אפס UI לכל הצבעים
    const map = {};
    (product?.colors || []).forEach((c) => {
      map[c] = {};
      (product?.sizes || []).forEach((s) => (map[c][s] = 0));
    });
    setBulkByColor(map);
    // מחיקת השורה מהעגלה
    removeWholeProductFromCart();
    // ניקוי לוגואים/placements
    resetSavedLogosAndPlacement();
  }

  // הוספה לעגלה — רק מרוכז
  function addBulkToCart() {
    if (!product) return;
    if (isCartBlocked) { alert("מוצר זה חסום להוספה לעגלה."); return; }
    if (!ensureAuthed()) return;

    const lineId = product.slug; // ריכוז לפי מוצר
    const current = readCartFromLS();
    const next = [...current];
    let idx = next.findIndex((it) => it.id === lineId);

    // לוגואים לפי מוצר
    const logosForThisProduct = {
      front: logoStorageBySide.front || JSON.parse(localStorage.getItem(LS_LOGO_STORAGE_KEY(product.slug, "front")) || "null"),
      back:  logoStorageBySide.back  || JSON.parse(localStorage.getItem(LS_LOGO_STORAGE_KEY(product.slug, "back"))  || "null"),
    };
    const logosMap = readItemLogosMap();

    // סה"כ לבאלק של הצבע הנוכחי
    const totalAdd = Object.values(bulkForCurrentColor).reduce((s, n) => s + (Number(n) || 0), 0);

    if (totalAdd <= 0) {
      alert(`לא הוזנו כמויות להזמנה מרוכזת.`);
      return;
    }

    // הכנת שורת מוצר אם אינה קיימת
    if (idx < 0) {
      next.unshift({
        id: lineId,
        slug: product.slug,
        name: product.name,
        price: Number(product.price) || 0,
        qty: 0,
        lastSelected: { color, size: null },
        variants: { byColorSize: {}, colorTotals: {}, sizeTotals: {} },
        addedAt: Date.now(),
        updatedAt: Date.now(),
      });
      idx = 0;
    }

    // עדכון כמות כוללת + בירוק־דאון לכל המידות שהוזנו
    let updated = { ...next[idx] };
    Object.entries(bulkForCurrentColor).forEach(([sizeKey, q]) => {
      const addQty = Math.max(0, Number(q) || 0);
      if (!addQty) return;
      updated.variants = addToBreakdown(updated.variants, color, sizeKey, addQty);
    });

    // חישוב totals ו־qty מחדש כדי למנוע סטייה
    updated.variants = recalcTotals(updated.variants);
    updated.qty = sumBreakdownQty(updated.variants.byColorSize);

    updated.lastSelected = { color, size: null };
    updated.updatedAt = Date.now();
    next[idx] = updated;

    saveCartToLS(next);

    // שמירת לוגואים תחת מפתח המוצר
    logosMap[lineId] = logosForThisProduct;
    writeItemLogosMap(logosMap);
    window.dispatchEvent(new Event("karina:itemLogosUpdated"));

    alert(`נוספו לעגלה ${totalAdd} יח' של ${product.name} (לצבע ${color}) — שורה אחת מרוכזת למוצר.`);
    navigate("/cart");
  }

  // דירוג
  function handleRate(stars) {
    const clamped = Math.max(1, Math.min(5, Number(stars) || 0));
    try { localStorage.setItem(LS_RATING_KEY(product.slug), String(clamped)); } catch {}
    setUserRating(clamped);
    setDisplayAvg(((baseAvg * baseCount) + clamped) / (baseCount + 1));
    setDisplayCount(baseCount + 1);
  }

  // תמחור מדרגות (מבוסס על כמות באלק לצבע הנוכחי)
  const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;
  const effectiveQty = Math.max(0, Number(bulkTotalForCurrentColor || 0));
  const curDiscPct = getDiscountPct(effectiveQty);
  const unitAfter   = round2((Number(product?.price) || 0) * (1 - curDiscPct));
  const lineTotal   = round2(unitAfter * effectiveQty);

  const step = 5;
  const currentTier = effectiveQty > 0 ? Math.floor((effectiveQty - 1) / step) : 0;
  const nextAt      = (currentTier + 1) * step + 1;
  const moreToNext  = effectiveQty > 0 ? Math.max(0, nextAt - effectiveQty) : step + 1;
  const nextPct     = Math.round(getDiscountPct(nextAt) * 100);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product?.name || "",
    image: shownImage ? [shownImage] : [],
    description,
    sku: product?.slug || "",
    brand: { "@type": "Brand", name: "Karina" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: Number(displayAvg.toFixed(2)),
      reviewCount: displayCount,
      bestRating: 5,
      worstRating: 1
    },
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "ILS",
      price: String(product?.price ?? ""),
      availability: "https://schema.org/InStock"
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: "logoAllowed", value: String(canUploadLogo) }
    ]
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: "קטלוג", item: `${origin}/catalog` },
      { "@type": "ListItem", position: 3, name: product?.name || "המוצר לא נמצא", item: canonical },
    ],
  };

  const shownPrintArea = side === "front" ? product?.printArea : (product?.backPrintArea || product?.printArea);
  const addButtonsDisabled = !user;

  const currentThumb =
    logoStorageBySide[side]?.thumbUrl ||
    logoStorageBySide[side]?.webpUrl ||
    logoStorageBySide[side]?.originalUrl || null;

  const [placementBySide, setPlacementBySide] = useState({ front: null, back: null });
  useEffect(() => {
    try {
      const pf = JSON.parse(localStorage.getItem(LS_PLACEMENT_KEY(product?.slug || "unknown", "front")) || "null");
      const pb = JSON.parse(localStorage.getItem(LS_PLACEMENT_KEY(product?.slug || "unknown", "back"))  || "null");
      setPlacementBySide({ front: pf, back: pb });
    } catch { setPlacementBySide({ front: null, back: null }); }
  }, [product?.slug]);

  function savePlacementForSide(sideKey, placement, dpiReport) {
    try { localStorage.setItem(LS_PLACEMENT_KEY(product.slug, sideKey), JSON.stringify(placement)); } catch {}
    setPlacementBySide((prev) => ({ ...prev, [sideKey]: placement }));
    window.dispatchEvent(new CustomEvent("karina:logoPlacementSaved", { detail: { slug: product.slug, side: sideKey, placement, dpiReport } }));
  }

  return (
    <LogosQueueProvider>
      <div className="container py-4">
        <Helmet prioritizeSeoTags>
          <title>{product ? `${product.name} | קארינה - הדפסה על חולצות` : "המוצר לא נמצא | קארינה"}</title>
          <meta name="description" content={description} />
          <link rel="canonical" href={canonical} />
          <meta property="og:type" content={product ? "product" : "website"} />
          <meta property="og:site_name" content="Karina" />
          <meta property="og:title" content={product ? `${product.name} | קארינה` : "המוצר לא נמצא | קארינה"} />
          <meta property="og:description" content={description} />
          {shownImage && <meta property="og:image" content={shownImage} />}
          <meta property="og:url" content={canonical} />
          {product && <>
            <meta property="product:price:amount" content={String(product.price)} />
            <meta property="product:price:currency" content="ILS" />
          </>}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={product ? `${product.name} | קארינה` : "המוצר לא נמצא | קארינה"} />
          <meta name="twitter:description" content={description} />
          {shownImage && <meta name="twitter:image" content={shownImage} />}
          <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
          <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
        </Helmet>

        {!product ? (
          <>
            <div className="alert alert-warning">המוצר לא נמצא</div>
            <Link className="btn btn-outline-primary" to="/catalog">חזרה לקטלוג</Link>
          </>
        ) : (
          <>
            <div className="row g-4">
              {/* תצוגה */}
              <div className="col-12 col-lg-6">
                {(product.img || product.backImg) && (
                  <div className="btn-group mb-2" role="group" aria-label="בחר צד">
                    <button type="button" className={`btn btn-sm ${side === "front" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setSide("front")}>צד קדמי</button>
                    <button type="button" className={`btn btn-sm ${side === "back" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => setSide("back")} disabled={!product.backImg} title={product.backImg ? "" : "אין תמונת צד אחורי"}>צד אחורי</button>
                  </div>
                )}

                <div className="border rounded-4 p-2 bg-white" style={{ minHeight: 480 }}>
                  <img src={shownImage} alt={product.name} className="img-fluid d-block mx-auto" style={{ maxHeight: 520, objectFit: "contain" }} />
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                  <span className="badge text-bg-light">תצוגה: {side === "front" ? "קדמי" : "אחורי"}</span>
                  {canUploadLogo ? (
                    <>
                      {logoStorageBySide[side] ? (
                        <span className="badge text-bg-success">לוגו הועלה ונשמר לצד הזה</span>
                      ) : (
                        <span className="badge text-bg-secondary">אין לוגו שמור לצד הזה</span>
                      )}
                      {currentThumb && (
                        <img
                          src={currentThumb}
                          alt="לוגו שמור לצד הנבחר"
                          style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 8, background: "#fff", border: "1px solid rgba(0,0,0,.08)" }}
                        />
                      )}
                      {(logoStorageBySide[side]) && (
                        <button className="btn btn-sm btn-outline-danger ms-auto" onClick={resetSavedLogosAndPlacement}>איפוס לוגואים</button>
                      )}
                    </>
                  ) : (
                    <span className="badge text-bg-warning">ללא אפשרות הטבעת לוגו</span>
                  )}
                </div>
              </div>

              {/* פרטים ובחירות */}
              <div className="col-12 col-lg-6">
                <h1 className="h3 mb-1">{product.name}</h1>
                {location.state?.prefill && (
                  <div className="small text-success mb-2">הבחירות הקודמות שוחזרו מהעגלה</div>
                )}

                {/* מחיר בסיס + תמחור מדרגות */}
                <p className="lead mb-1">{round2(product.price)} ₪ ליחידה</p>
                {isCartBlocked && (
                  <div className="small text-danger mb-1">
                    מוצר זה חסום להוספה לעגלה כרגע.
                  </div>
                )}
                <div className="small mb-1">
                  {bulkTotalForCurrentColor > 0 ? (
                    <div className="text-success">
                      הנחת כמות: <strong>{Math.round(curDiscPct * 100)}%</strong>
                      {" · "}מחיר יחידה לאחר הנחה: <strong>{unitAfter} ₪</strong>
                      {" · "}סה״כ לשורה: <strong>{lineTotal} ₪</strong>
                    </div>
                  ) : (
                    <div className="text-muted">
                      מדרגות הנחה: כל 5 יחידות נוספות ⇒ 5% הנחה (עד 50%).
                    </div>
                  )}
                </div>

                <small className="text-muted d-block mb-3">לא כולל משלוח</small>

                {/* בחירת צבע */}
                <div className="mb-3">
                  <ColorSwatches colors={product.colors} value={color} onChange={setColor} />
                </div>

                {/* 🚩 הזמנה מרוכזת לפי מידה */}
                <div className="card mb-3">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="mb-0">כמויות לפי מידה — צבע: <span className="fw-semibold">{color}</span></h6>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-secondary" onClick={clearBulkForColor}>איפוס כמויות לצבע זה</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={resetAllForThisProduct} title="יאפס גם את שורת המוצר בעגלה וינקה לוגואים/הצבות">
                          איפוס מוצר זה (כולל בעגלה)
                        </button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-sm align-middle">
                        <thead><tr>{(product.sizes || []).map((s) => (<th key={s} className="text-center">{s}</th>))}</tr></thead>
                        <tbody>
                          <tr>
                            {(product.sizes || []).map((s) => (
                              <td key={s} className="text-center">
                                <input
                                  type="number" min={0}
                                  value={(bulkByColor[color] || {})[s] ?? 0}
                                  onChange={(e) => setBulkQty(s, e.target.value)}
                                  className="form-control form-control-sm text-center"
                                  style={{ width: 90, marginInline: "auto" }}
                                />
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* סיכום מחיר לבאלק */}
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="small">
                        {bulkTotalForCurrentColor > 0 ? (
                          <>
                            סה״כ יחידות לצבע זה: <strong>{bulkTotalForCurrentColor}</strong>
                            {" · "}הנחה: <strong>{Math.round(getDiscountPct(bulkTotalForCurrentColor) * 100)}%</strong>
                            {" · "}מחיר יחידה אחרי הנחה:{" "}
                            <strong>
                              {round2((Number(product.price) || 0) * (1 - getDiscountPct(bulkTotalForCurrentColor)))} ₪
                            </strong>
                            {" · "}סה״כ:{" "}
                            <strong>
                              {round2(
                                (Number(product.price) || 0) *
                                (1 - getDiscountPct(bulkTotalForCurrentColor)) *
                                bulkTotalForCurrentColor
                              )} ₪
                            </strong>
                          </>
                        ) : (
                          <>הכנס כמויות כדי לראות מחיר לאחר הנחה.</>
                        )}
                      </div>
                      <div>
                        <button
                          className="btn btn-primary"
                          onClick={addBulkToCart}
                          disabled={bulkTotalForCurrentColor === 0 || !user || isCartBlocked}
                          title={
                            checkingRole ? "בודק הרשאות…" :
                            !user ? "עליך להתחבר" :
                            isCartBlocked ? "מוצר זה חסום להוספה לעגלה" :
                            !isSeller ? "רק מוכרים יכולים להוסיף לעגלה" :
                            undefined
                          }
                        >
                          הוסף לעגלה (מרוכז)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* העלאת לוגו / בדיקת התאמה */}
                {canUploadLogo ? (
                  <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={async () => {
                        if (!user) { alert("עליך להתחבר לפני העלאת לוגו."); return; }
                        await ensureUserAndDraft(user);
                        setShowUpload(true);
                      }}
                    >
                      העלה לוגו ({side === "front" ? "קדמי" : "אחורי"})
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      disabled={!currentThumb}
                      title={currentThumb ? "" : "יש להעלות לוגו קודם"}
                      onClick={() => setShowPlacement(true)}
                    >
                      בדיקת התאמת לוגו
                    </button>
                    {logoStorageBySide[side] && <span className="small text-success">לוגו נשמר לצד הזה</span>}
                  </div>
                ) : null}

                <hr className="my-4" />
                <div>
                  <h6 className="fw-bold">מידע</h6>
                  <ul className="text-muted small mb-0">
                    <li>הדפסה איכותית על מגוון בדים.</li>
                    {canUploadLogo ? (
                      <li>העלאת לוגו לפי צד — קדמי/אחורי. ניתן לבדוק התאמה לפני הזמנה.</li>
                    ) : (
                      <li>לפריט זה אין אפשרות הטבעת לוגו.</li>
                    )}
                    <li>משלוח לכל הארץ או איסוף עצמי.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* מודאל העלאת לוגו */}
            {canUploadLogo && (
              <LogoUploadModal
                show={showUpload}
                onClose={() => setShowUpload(false)}
                onConfirm={(_preview, _file, uploaded) => onLogoUploaded(_preview, uploaded)}
                orderId="draft"
                itemSlug={product.slug}
                side={side}
              />
            )}

            {/* מודאל הצבת לוגו */}
            {canUploadLogo && (
              <LogoPlacementModal
                show={showPlacement}
                onClose={() => setShowPlacement(false)}
                productName={product.name}
                productImg={shownImage}
                side={side}
                logoUrl={
                  logoStorageBySide[side]?.originalUrl ||
                  logoStorageBySide[side]?.webpUrl ||
                  logoStorageBySide[side]?.thumbUrl || ""
                }
                printArea={shownPrintArea}
                initialPlacement={placementBySide[side] || { xPct: 0.5, yPct: 0.5, scalePct: 60 }}
                onSavePlacement={(pl, dpi) => savePlacementForSide(side, pl, dpi)}
              />
            )}

            {/* מוצרים דומים */}
            <div className="mt-5">
              <h5 className="mb-3">מוצרים דומים</h5>
              {similarProducts.length === 0 ? (
                <div className="text-muted small">אין פריטים דומים כרגע.</div>
              ) : (
                <div className="d-flex gap-3 flex-wrap">
                  {similarProducts.map((p) => (
                    <Link key={p.slug} to={`/product/${p.slug}`} className="text-decoration-none">
                      <div className="card" style={{ width: 180 }}>
                        <img src={p.img} className="card-img-top" alt={p.name} style={{ height: 120, objectFit: "cover" }} />
                        <div className="card-body p-2">
                          <div className="small fw-semibold">{p.name}</div>
                          <div className="small text-muted">{p.price} ₪</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <ProductSEO
        product={product}
        canonical={canonical}
        origin={origin}
        description={description}
        shownImage={shownImage}
        canUploadLogo={canUploadLogo}
        displayAvg={displayAvg}
        displayCount={displayCount}
      />
    </LogosQueueProvider>
  );
}
