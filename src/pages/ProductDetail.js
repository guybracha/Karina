// src/pages/ProductDetail.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { LogosQueueProvider } from "../contexts/LogosQueueContext.tsx";
import LogoUploadModal from "../components/LogoUploadModal";
import ColorSwatches from "../components/ColorSwatches";
import SizePicker from "../components/SizePicker";
import { PRODUCTS } from "../lib/products";

// Auth/Firestore
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import ProductSEO from "../components/seo/ProductSEO.js";

// ===== LocalStorage keys =====
const LS_LOGO_STORAGE_KEY = (slug, side) => `karina:logoStorage:${slug}:${side}`;
const LS_CART_KEY = "karina:cart";
const LS_RATING_KEY = (slug) => `karina:rating:${slug}`;
// מפת לוגואים פר־שורת עגלה
const LS_ITEM_LOGOS = "karina:itemLogos";
// === Logo Placement === הצבה/סקייל של הלוגו על שטח ההדפסה
const LS_PLACEMENT_KEY = (slug, side) => `karina:logoPlacement:${slug}:${side}`;
function readItemLogosMap() {
  try { return JSON.parse(localStorage.getItem(LS_ITEM_LOGOS) || "{}") || {}; } catch { return {}; }
}
function writeItemLogosMap(map) {
  try {
    localStorage.setItem(LS_ITEM_LOGOS, JSON.stringify(map));
    window.dispatchEvent(new Event("karina:itemLogosUpdated"));
  } catch {}
}

// ⭐ קומפוננטת דירוג קטנה
function StarRater({ value, onChange, size = 24, ariaLabel = "דירוג" }) {
  const [hover, setHover] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="d-inline-flex align-items-center" onMouseLeave={() => setHover(0)}>
      {stars.map((s) => {
        const active = (hover || value) >= s;
        return (
          <button
            key={s}
            type="button"
            className="btn p-0 border-0 bg-transparent"
            role="radio"
            aria-checked={value === s}
            aria-label={`${s} מתוך 5`}
            onMouseEnter={() => setHover(s)}
            onClick={() => onChange(s)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(s); } }}
            style={{ lineHeight: 1, width: size, height: size, cursor: "pointer" }}
            title={`${s} כוכבים`}
          >
            <span style={{ display: "inline-block", width: size, height: size, color: active ? "#f59f00" : "#e5e7eb", fontSize: size * 0.9 }}>★</span>
          </button>
        );
      })}
    </div>
  );
}

/* === Logo Placement Modal ===
   מציג תמונת המוצר עם מלבן "אזור הדפסה" ומאפשר לגרור/להגדיל את הלוגו בתוכו.
   - printArea: { x, y, w, h } ביחידות: 0–1 (אחוזים) או פיקסלים יחסית לתמונה
                 אופציונלית גם { widthCm, heightCm } להערכת DPI
*/
function LogoPlacementModal({
  show,
  onClose,
  productName,
  productImg,
  logoUrl,
  side = "front",
  printArea,             // אופציונלי
  initialPlacement,      // { xPct, yPct, scalePct } – שמור מ־LS
  onSavePlacement,       // מחזיר אובייקט להצבה
}) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const logoRef = useRef(null);

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [areaRect, setAreaRect] = useState({ x: 0, y: 0, w: 0, h: 0 }); // בפיקסלים בתוך הקונטיינר
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [placement, setPlacement] = useState({ xPct: 0.5, yPct: 0.5, scalePct: 60 }); // אחוז מגודל האזור
  const [logoNatural, setLogoNatural] = useState({ w: 0, h: 0 });
  const [dpiReport, setDpiReport] = useState({ x: 0, y: 0, verdict: "unknown" });

  // קביעת מלבן אזור ההדפסה מתוך product.printArea/backPrintArea או ברירת מחדל
  function computeAreaRect(containerW, containerH, area) {
    if (!area || (!area.w && !area.h)) {
      const w = containerW * 0.5;
      const h = containerH * 0.6;
      const x = (containerW - w) / 2;
      const y = containerH * 0.18;
      return { x, y, w, h };
    }
    const isFrac = (v) => typeof v === "number" && v > 0 && v <= 1;
    const toPx = (v, total) => (isFrac(v) ? v * total : (typeof v === "number" ? v : 0));
    const w = toPx(area.w, containerW) || containerW * 0.5;
    const h = toPx(area.h, containerH) || containerH * 0.6;
    let x = toPx(area.x, containerW);
    let y = toPx(area.y, containerH);
    if (!(x > 0)) x = (containerW - w) / 2;
    if (!(y > 0)) y = (containerH - h) / 5;
    return { x, y, w, h };
  }

  // שמירה/טעינה של מיקום התחלתי
  useEffect(() => {
    if (initialPlacement) setPlacement(initialPlacement);
  }, [initialPlacement]);

  // גודל קונטיינר + אזור הדפסה
  useEffect(() => {
    function recalc() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = Math.max(420, Math.min(640, (rect.width * 4) / 3)); // יחס 4:3 בערך
      setContainerSize({ w, h });
      setAreaRect(computeAreaRect(w, h, printArea));
    }
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [printArea, show]);

  // קריאת גודל מקורי של הלוגו
  useEffect(() => {
    if (!logoUrl) return;
    const im = new Image();
    im.onload = () => setLogoNatural({ w: im.naturalWidth, h: im.naturalHeight });
    im.src = logoUrl;
  }, [logoUrl]);

  // גרירה
  function onPointerDown(e) {
    if (!logoRef.current) return;
    const logoRect = logoRef.current.getBoundingClientRect();
    setDragging(true);
    setDragOffset({ x: e.clientX - logoRect.left, y: e.clientY - logoRect.top });
  }
  function onPointerMove(e) {
    if (!dragging) return;
    if (!containerRef.current) return;
    const cont = containerRef.current.getBoundingClientRect();
    const area = areaRect;
    const logoEl = logoRef.current;
    if (!logoEl) return;
    const logoW = logoEl.offsetWidth;
    const logoH = logoEl.offsetHeight;

    // גבולות: בתוך areaRect
    let nx = e.clientX - cont.left - dragOffset.x;
    let ny = e.clientY - cont.top - dragOffset.y;
    nx = Math.max(area.x, Math.min(area.x + area.w - logoW, nx));
    ny = Math.max(area.y, Math.min(area.y + area.h - logoH, ny));

    const cx = nx + logoW / 2;
    const cy = ny + logoH / 2;
    setPlacement((prev) => ({
      ...prev,
      xPct: (cx - area.x) / area.w,
      yPct: (cy - area.y) / area.h,
    }));
  }
  function onPointerUp() { setDragging(false); }

  // סקייל עם סלאידר
  function setScalePct(v) {
    const val = Math.max(10, Math.min(100, Number(v) || 60));
    setPlacement((prev) => ({ ...prev, scalePct: val }));
  }

  // חישוב DPI משוער: בהינתן area width/height בצ״מ; אם אין – 30×35 ס״מ
  useEffect(() => {
    const wCm = (printArea?.widthCm && printArea?.widthCm > 0) ? printArea.widthCm : 30;
    const hCm = (printArea?.heightCm && printArea?.heightCm > 0) ? printArea.heightCm : 35;
    const logoWcm = (placement.scalePct / 100) * wCm;
    const logoHcm = (placement.scalePct / 100) * hCm;
    const wIn = logoWcm / 2.54;
    const hIn = logoHcm / 2.54;
    const dpiX = logoNatural.w && wIn ? (logoNatural.w / wIn) : 0;
    const dpiY = logoNatural.h && hIn ? (logoNatural.h / hIn) : 0;
    const minDpi = Math.min(dpiX, dpiY);
    let verdict = "unknown";
    if (minDpi >= 200) verdict = "מצוין";
    else if (minDpi >= 150) verdict = "סביר";
    else if (minDpi > 0) verdict = "נמוך";
    setDpiReport({ x: Math.round(dpiX), y: Math.round(dpiY), verdict });
  }, [placement.scalePct, logoNatural, printArea]);

  if (!show) return null;

  // מיקומי פיקסלים של הלוגו מתוך placement
  const logoPx = (() => {
    const lw = (placement.scalePct / 100) * areaRect.w;
    const lh = (placement.scalePct / 100) * areaRect.h;
    const cx = areaRect.x + placement.xPct * areaRect.w;
    const cy = areaRect.y + placement.yPct * areaRect.h;
    return { w: lw, h: lh, left: cx - lw / 2, top: cy - lh / 2 };
  })();

  // ודא שהלוגו בתוך האזור גם אחרי שינוי סקייל
  const clampedLogoPx = {
    w: Math.min(logoPx.w, areaRect.w),
    h: Math.min(logoPx.h, areaRect.h),
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
                  {/* תמונת החולצה */}
                  <div style={{ width: "100%", height: containerSize.h, position: "relative", borderRadius: 12, overflow: "hidden", background: "#f8fafc", border: "1px solid #eef2f7" }}>
                    {productImg && (
                      <img ref={imgRef} src={productImg} alt={productName} style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain", pointerEvents:"none" }} />
                    )}

                    {/* אזור הדפסה */}
                    <div
                      style={{
                        position:"absolute",
                        left: areaRect.x, top: areaRect.y, width: areaRect.w, height: areaRect.h,
                        border: "2px dashed rgba(79,70,229,.6)",
                        background: "repeating-linear-gradient(45deg, rgba(99,102,241,.06), rgba(99,102,241,.06) 10px, rgba(99,102,241,.1) 10px, rgba(99,102,241,.1) 20px)",
                        borderRadius: 12
                      }}
                      aria-label="אזור הדפסה"
                    />

                    {/* לוגו ניתן לגרירה */}
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
                        objectFit: "contain",
                        cursor: "grab",
                        filter: "drop-shadow(0 4px 12px rgba(2,6,23,.2))",
                      }}
                    />
                  </div>
                </div>

                {/* בקרי סקייל + דוח DPI */}
                <div className="row g-3 align-items-center mt-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">גודל הלוגו ביחס לאזור ההדפסה: {placement.scalePct}%</label>
                    <input
                      type="range" min={10} max={100} step={1}
                      className="form-range"
                      value={placement.scalePct}
                      onChange={(e) => setScalePct(e.target.value)}
                    />
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
            <button
              type="button"
              className="btn btn-primary"
              disabled={!logoUrl}
              onClick={() => {
                onSavePlacement(placement, dpiReport);
                onClose();
              }}
            >
              שמור הצבה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const [showUpload, setShowUpload] = useState(false);
  // === Logo Placement ===
  const [showPlacement, setShowPlacement] = useState(false);

  const { slug } = useParams();
  const product = useMemo(() => PRODUCTS.find((p) => p.slug === slug), [slug]);

  const canUploadLogo = product?.logoAllowed !== false;

  // התחברות ותפקיד
  const [user, setUser] = useState(null);
  const [isSeller, setIsSeller] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u || null);
      setIsSeller(false);
      setCheckingRole(true);
      try {
        if (u) {
          const snap = await getDoc(doc(db, "users", u.uid));
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
  const [size, setSize]   = useState(product?.sizes?.[0] || "");
  const [qty, setQty]     = useState(1);

  // Bulk
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkByColor, setBulkByColor] = useState({});

  // צד
  const [side, setSide] = useState("front");

  // לוגו ב־Storage פר צד
  const [logoStorageBySide, setLogoStorageBySide] = useState({ front: null, back: null });

  // ⭐ RATING
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

  const baseImageForSide = side === "front" ? product?.img : (product?.backImg || product?.img);
  const shownImage = baseImageForSide;

  const currentKey = product?.type ?? product?.category ?? null;
  const similarProducts = useMemo(
    () =>
      product && currentKey
        ? PRODUCTS.filter((p) => p.slug !== product.slug && (p.type ?? p.category) === currentKey).slice(0, 8)
        : [],
    [product, currentKey]
  );

  function readCartFromLS() {
    try { return JSON.parse(localStorage.getItem(LS_CART_KEY) || "[]") ?? []; } catch { return []; }
  }
  function saveCartToLS(next) {
    try {
      localStorage.setItem(LS_CART_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event("karina:cartUpdated"));
    } catch {}
  }

  // אתחול במעבר מוצר
  useEffect(() => {
    setColor(product?.colors?.[0] || "");
    setSize(product?.sizes?.[0] || "");
    setQty(1);
    setSide("front");
    setBulkMode(false);
    setBulkByColor({});

    if (canUploadLogo) {
      try {
        const sFront = JSON.parse(localStorage.getItem(LS_LOGO_STORAGE_KEY(product?.slug || "unknown", "front")) || "null");
        const sBack  = JSON.parse(localStorage.getItem(LS_LOGO_STORAGE_KEY(product?.slug || "unknown", "back"))  || "null");
        setLogoStorageBySide({ front: sFront, back: sBack });
      } catch {
        setLogoStorageBySide({ front: null, back: null });
      }
    } else {
      try {
        localStorage.removeItem(LS_LOGO_STORAGE_KEY(product?.slug || "unknown", "front"));
        localStorage.removeItem(LS_LOGO_STORAGE_KEY(product?.slug || "unknown", "back"));
      } catch {}
      setLogoStorageBySide({ front: null, back: null });
    }

    // ⭐ RATING
    try {
      const ur = Number(localStorage.getItem(LS_RATING_KEY(product?.slug || "")) || 0);
      setUserRating(ur || 0);
      if (ur > 0) {
        setDisplayAvg(((baseAvg * baseCount) + ur) / (baseCount + 1));
        setDisplayCount(baseCount + 1);
      } else {
        setDisplayAvg(baseAvg);
        setDisplayCount(baseCount);
      }
    } catch {
      setUserRating(0);
      setDisplayAvg(baseAvg);
      setDisplayCount(baseCount);
    }

    setShowUpload(false);
    setShowPlacement(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.slug, canUploadLogo]);

  // ודא bulk map
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

  // מטפל בתוצאת העלאה: שומר רק מטא־דאטה של Storage
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

  function resetSaved() {
    try {
      localStorage.removeItem(LS_LOGO_STORAGE_KEY(product?.slug, "front"));
      localStorage.removeItem(LS_LOGO_STORAGE_KEY(product?.slug, "back"));
      localStorage.removeItem(LS_PLACEMENT_KEY(product?.slug, "front"));
      localStorage.removeItem(LS_PLACEMENT_KEY(product?.slug, "back"));
    } catch {}
    setLogoStorageBySide({ front: null, back: null });
  }

  // גארד
  function ensureAuthed(){
    if(!user){
      alert("עליך להתחבר כדי להוסיף פריטים לעגלה");
      return false;
    }
    return true;
  }

  // עגלה — רגיל
  function addToCart() {
    if (!product) return;
    if (!ensureAuthed()) return;

    const lineId = `${product.slug}__${color}__${size}`;
    const current = readCartFromLS();
    const idx = current.findIndex((it) => it.id === lineId);

    const logosForThisProduct = {
      front: logoStorageBySide.front || JSON.parse(localStorage.getItem(LS_LOGO_STORAGE_KEY(product.slug, "front")) || "null"),
      back:  logoStorageBySide.back  || JSON.parse(localStorage.getItem(LS_LOGO_STORAGE_KEY(product.slug, "back"))  || "null"),
    };
    const logosMap = readItemLogosMap();
    logosMap[lineId] = logosForThisProduct;
    writeItemLogosMap(logosMap);
    window.dispatchEvent(new Event("karina:itemLogosUpdated"));

    if (idx >= 0) {
      const next = [...current];
      const prevQty = Number(next[idx].qty || 0);
      next[idx] = { ...next[idx], qty: prevQty + Number(qty || 1) };
      saveCartToLS(next);
    } else {
      saveCartToLS([{ id: lineId, slug: product.slug, name: product.name, price: Number(product.price) || 0, qty: Number(qty || 1), color, size, addedAt: Date.now() }, ...current]);
    }

    window.dispatchEvent(new Event("karina:itemLogosUpdated"));
    alert(`נוסף לעגלה: ${product.name} - ${color} / ${size} x${qty}`);
  }

  // Bulk
  const bulkForCurrentColor = bulkByColor[color] || {};
  const bulkTotalForCurrentColor = useMemo(
    () => Object.values(bulkForCurrentColor).reduce((s, n) => s + (Number(n) || 0), 0),
    [bulkForCurrentColor]
  );
  function setBulkQty(sizeKey, value) {
    const num = Math.max(0, Number(value) || 0);
    setBulkByColor((prev) => ({ ...prev, [color]: { ...(prev[color] || {}), [sizeKey]: num } }));
  }
  function clearBulkForColor() {
    if (!product?.sizes) return;
    const cleared = {}; product.sizes.forEach((s) => (cleared[s] = 0));
    setBulkByColor((prev) => ({ ...prev, [color]: cleared }));
  }
  function addBulkToCart() {
    if (!product) return;
    if (!ensureAuthed()) return;

    const current = readCartFromLS(); const next = [...current];
    const logosForThisProduct = {
      front: logoStorageBySide.front || JSON.parse(localStorage.getItem(LS_LOGO_STORAGE_KEY(product.slug, "front")) || "null"),
      back:  logoStorageBySide.back  || JSON.parse(localStorage.getItem(LS_LOGO_STORAGE_KEY(product.slug, "back"))  || "null"),
    };
    const logosMap = readItemLogosMap();

    Object.entries(bulkForCurrentColor).forEach(([sizeKey, q]) => {
      const addQty = Math.max(0, Number(q) || 0); if (!addQty) return;
      const lineId = `${product.slug}__${color}__${sizeKey}`;
      const idx = next.findIndex((it) => it.id === lineId);
      if (idx >= 0) {
        const prevQty = Number(next[idx].qty || 0);
        next[idx] = { ...next[idx], qty: prevQty + addQty };
      } else {
        next.unshift({ id: lineId, slug: product.slug, name: product.name, price: Number(product.price) || 0, qty: addQty, color, size: sizeKey, addedAt: Date.now() });
      }
      logosMap[lineId] = logosForThisProduct;
    });

    saveCartToLS(next);
    writeItemLogosMap(logosMap);
    window.dispatchEvent(new Event("karina:itemLogosUpdated"));

    alert(bulkTotalForCurrentColor > 0 ? `נוספו לעגלה ${bulkTotalForCurrentColor} יח' של ${product.name} בצבע ${color}.` : `לא הוזנו כמויות להזמנה מרוכזת.`);
  }

  const canAdd = Boolean(color) && Boolean(size) && qty > 0;

  // ⭐ RATING
  function handleRate(stars) {
    const clamped = Math.max(1, Math.min(5, Number(stars) || 0));
    try { localStorage.setItem(LS_RATING_KEY(product.slug), String(clamped)); } catch {}
    setUserRating(clamped);
    setDisplayAvg(((baseAvg * baseCount) + clamped) / (baseCount + 1));
    setDisplayCount(baseCount + 1);
  }

  // JSON-LD
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

  const shownPrintArea =
    side === "front" ? product?.printArea : (product?.backPrintArea || product?.printArea);

  const roleStatus = !user ? "עליך להתחבר כדי להוסיף לעגלה" : "";
  const addButtonsDisabled = !user;

  const currentThumb =
    logoStorageBySide[side]?.thumbUrl ||
    logoStorageBySide[side]?.webpUrl ||
    logoStorageBySide[side]?.originalUrl ||
    null;

  // === Logo Placement === טען הצבה שמורה (אם יש)
  const [placementBySide, setPlacementBySide] = useState({ front: null, back: null });
  useEffect(() => {
    try {
      const pf = JSON.parse(localStorage.getItem(LS_PLACEMENT_KEY(product?.slug || "unknown", "front")) || "null");
      const pb = JSON.parse(localStorage.getItem(LS_PLACEMENT_KEY(product?.slug || "unknown", "back"))  || "null");
      setPlacementBySide({ front: pf, back: pb });
    } catch { setPlacementBySide({ front: null, back: null }); }
  }, [product?.slug]);

  function savePlacementForSide(sideKey, placement, dpiReport) {
    try {
      localStorage.setItem(LS_PLACEMENT_KEY(product.slug, sideKey), JSON.stringify(placement));
    } catch {}
    setPlacementBySide((prev) => ({ ...prev, [sideKey]: placement }));
    // פינג סמלי – יאפשר לעגלת ההזמנות/הפקה למשוך הצבה משוערת
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
            {roleStatus && (
              <div className="alert alert-info d-flex align-items-center" role="alert">
                <span className="me-2">ℹ️</span>
                <span>{roleStatus}</span>
                {!user && (
                  <Link className="btn btn-sm btn-primary ms-auto" to="/auth">
                    התחברות
                  </Link>
                )}
              </div>
            )}

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
                      {(logoStorageBySide.front || logoStorageBySide.back) && (
                        <button className="btn btn-sm btn-outline-danger ms-auto" onClick={resetSaved}>איפוס לוגואים</button>
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
                <p className="lead mb-1">{product.price} ₪</p>
                <small className="text-muted d-block mb-3">לא כולל משלוח</small>

                <div className="mb-3">
                  <ColorSwatches colors={product.colors} value={color} onChange={setColor} />
                </div>

                <div className="form-check form-switch mb-3">
                  <input className="form-check-input" type="checkbox" id="bulkToggle" checked={bulkMode} onChange={(e) => setBulkMode(e.target.checked)} />
                  <label className="form-check-label" htmlFor="bulkToggle">הזמנה מרוכזת לפי מידות (לצבע הנוכחי)</label>
                </div>

                {!bulkMode ? (
                  <>
                    <div className="mb-3"><SizePicker sizes={product.sizes} value={size} onChange={setSize} /></div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">כמות</label>
                      <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="form-control w-auto" />
                    </div>

                    {canUploadLogo ? (
                      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowUpload(true)}>
                          העלה לוגו ({side === "front" ? "קדמי" : "אחורי"})
                        </button>
                        {/* === Logo Placement === */}
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
                    ) : (
                      <div className="alert alert-secondary py-2 small">לפריט זה לא ניתן להעלות לוגו.</div>
                    )}

                    <button
                      className="btn btn-primary btn-lg"
                      onClick={addToCart}
                      disabled={!canAdd || addButtonsDisabled}
                      title={ !canAdd ? "בחר צבע ומידה" : (!user ? "עליך להתחבר" : undefined) }
                    >
                      הוסף לעגלה
                    </button>
                  </>
                ) : (
                  <>
                    <div className="card mb-3">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">כמויות לפי מידה — צבע: <span className="fw-semibold">{color}</span></h6>
                          <button className="btn btn-sm btn-outline-secondary" onClick={clearBulkForColor}>איפוס כמויות לצבע זה</button>
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
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="text-muted small">ניתן לעבור לצבע אחר, למלא כמויות, ולהוסיף לעגלה בנפרד.</div>
                          <div>
                            <span className="me-3">סה״כ יחידות לצבע זה: <strong>{bulkTotalForCurrentColor}</strong></span>
                            <button
                              className="btn btn-primary"
                              onClick={addBulkToCart}
                              disabled={bulkTotalForCurrentColor === 0 || addButtonsDisabled}
                              title={
                                checkingRole ? "בודק הרשאות…" :
                                !user ? "עליך להתחבר" :
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

                    {canUploadLogo ? (
                      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                        <button type="button" className="btn btn-outline-secondary" onClick={() => setShowUpload(true)}>
                          העלה לוגו ({side === "front" ? "קדמי" : "אחורי"})
                        </button>
                        {/* === Logo Placement === */}
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
                  </>
                )}

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

            {/* === Logo Placement === מודאל הצבת לוגו */}
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
                  logoStorageBySide[side]?.thumbUrl ||
                  ""
                }
                printArea={shownPrintArea /* יכול לכלול: {x,y,w,h,widthCm,heightCm} */}
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
