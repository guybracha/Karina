// src/pages/ProductDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import LogoPlacementModal from "../components/LogoPlacementModal";
import LogoUploadModal from "../components/LogoUploadModal";
import ColorSwatches from "../components/ColorSwatches";
import SizePicker from "../components/SizePicker";
import { PRODUCTS } from "../lib/products";

// LS keys
const LS_USER_LOGO_KEY = (side) => `karina:userLogo:${side}`;
const LS_PREVIEW_KEY   = (slug, side) => `karina:preview:${slug}:${side}`;
const LS_CART_KEY = "karina:cart";
// ⭐ RATING
const LS_RATING_KEY = (slug) => `karina:rating:${slug}`;

function StarRater({ value, onChange, size = 24, ariaLabel = "דירוג" }) {
  const [hover, setHover] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="d-inline-flex align-items-center" role="radiogroup" aria-label={ariaLabel} onMouseLeave={() => setHover(0)}>
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

export default function ProductDetail() {
  const [showUpload, setShowUpload] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);

  const { slug } = useParams();
  const product = useMemo(() => PRODUCTS.find((p) => p.slug === slug), [slug]);

  // ✨ האם מותר לוגו על מוצר זה (חוסם קסדות ומכנסי דגמ"ח)
  const logoAllowed = !!product && !["helmet", "pants"].includes(product.type);
  const logoBlockMsg = !logoAllowed ? "לא ניתן להציב/להדביק לוגו על מוצר זה." : "";

  // בחירות מוצר
  const [color, setColor] = useState(product?.colors?.[0] || "");
  const [size, setSize]   = useState(product?.sizes?.[0] || "");
  const [qty, setQty]     = useState(1);

  // ===== הזמנה מרוכזת (Bulk) =====
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkByColor, setBulkByColor] = useState({});

  // צד
  const [side, setSide] = useState("front");

  // לוגו/הדמיה
  const [logoBySide, setLogoBySide]       = useState({ front: null, back: null });
  const [previewBySide, setPreviewBySide] = useState({ front: null, back: null });

  // ⭐ RATING: בסיס סטטיסטיקות (מהדאטה) + דירוג משתמש
  const baseAvg = Number(product?.rating ?? 4.5);
  const baseCount = Number(product?.reviews ?? 120);
  const [userRating, setUserRating] = useState(0);
  const [displayAvg, setDisplayAvg] = useState(baseAvg);
  const [displayCount, setDisplayCount] = useState(baseCount);

  // SEO
  const origin = typeof window !== "undefined" ? window.location.origin : "https://example.com";
  const canonical = `${origin}/product/${slug}`;
  const colorsList = product?.colors?.slice(0, 4)?.join(" / ") || "";
  const sizesList  = product?.sizes?.slice(0, 4)?.join(", ") || "";
  const description = product
    ? `חולצת ${product.name} להדפסה אישית. צבעים: ${colorsList}. מידות: ${sizesList}.`
    : "המוצר לא נמצא.";

  const baseImageForSide = side === "front" ? product?.img : (product?.backImg || product?.img);
  const shownImage = previewBySide[side] || baseImageForSide;

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
    try { localStorage.setItem(LS_CART_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("karina:cartUpdated")); } catch {}
  }

  // טעינות/אתחולים
  useEffect(() => {
    setColor(product?.colors?.[0] || "");
    setSize(product?.sizes?.[0] || "");
    setQty(1);
    setSide("front");
    setBulkMode(false);
    setBulkByColor({});

    try {
      const frontPreview = localStorage.getItem(LS_PREVIEW_KEY(product?.slug || "", "front"));
      const backPreview  = localStorage.getItem(LS_PREVIEW_KEY(product?.slug || "", "back"));
      setPreviewBySide({ front: frontPreview || null, back: backPreview || null });
    } catch { setPreviewBySide({ front: null, back: null }); }

    try {
      const frontLogo = localStorage.getItem(LS_USER_LOGO_KEY("front"));
      const backLogo  = localStorage.getItem(LS_USER_LOGO_KEY("back"));
      setLogoBySide({ front: frontLogo || null, back: backLogo || null });
    } catch { setLogoBySide({ front: null, back: null }); }

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
    setShowLogoModal(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.slug]);

  // ודא אובייקט bulk לכל צבע
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

  // הדמיות/לוגו
  function onSavePlacement({ dataUrl }) {
    if (!logoAllowed) return; // 🔒 חסימה
    setPreviewBySide((prev) => {
      const next = { ...prev, [side]: dataUrl };
      try { if (product?.slug) localStorage.setItem(LS_PREVIEW_KEY(product.slug, side), dataUrl); } catch {}
      return next;
    });
    setShowLogoModal(false);
  }
  function onLogoUploaded(dataUrl) {
    if (!logoAllowed) return; // 🔒 חסימה
    setLogoBySide((prev) => {
      const next = { ...prev, [side]: dataUrl };
      try { localStorage.setItem(LS_USER_LOGO_KEY(side), dataUrl); } catch {}
      return next;
    });
    setShowUpload(false);
    setShowLogoModal(true);
  }
  function resetSaved() {
    try {
      localStorage.removeItem(LS_USER_LOGO_KEY("front"));
      localStorage.removeItem(LS_USER_LOGO_KEY("back"));
      if (product?.slug) {
        localStorage.removeItem(LS_PREVIEW_KEY(product.slug, "front"));
        localStorage.removeItem(LS_PREVIEW_KEY(product.slug, "back"));
      }
    } catch {}
    setLogoBySide({ front: null, back: null });
    setPreviewBySide({ front: null, back: null });
  }

  // עגלה
  function addToCart() {
    if (!product) return;
    const lineId = `${product.slug}__${color}__${size}`;
    const current = readCartFromLS();
    const idx = current.findIndex((it) => it.id === lineId);
    if (idx >= 0) {
      const next = [...current];
      const prevQty = Number(next[idx].qty || 0);
      next[idx] = { ...next[idx], qty: prevQty + Number(qty || 1) };
      saveCartToLS(next);
    } else {
      saveCartToLS([{ id: lineId, slug: product.slug, name: product.name, price: Number(product.price) || 0, qty: Number(qty || 1), color, size, addedAt: Date.now() }, ...current]);
    }
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
    const current = readCartFromLS(); const next = [...current];
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
    });
    saveCartToLS(next);
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

  return (
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
            {/* תצוגה/הדמיה */}
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
                {logoAllowed ? (
                  <>
                    {logoBySide[side] ? <span className="badge text-bg-success">לוגו שמור לצד הזה</span> : <span className="badge text-bg-secondary">אין לוגו שמור לצד הזה</span>}
                    {previewBySide[side] && <span className="badge text-bg-primary">הדמיה שמורה לצד הזה</span>}
                    {(logoBySide.front || logoBySide.back || previewBySide.front || previewBySide.back) && (
                      <button className="btn btn-sm btn-outline-danger ms-auto" onClick={resetSaved}>איפוס כל הלוגואים/הדמיות</button>
                    )}
                  </>
                ) : (
                  <span className="badge text-bg-secondary">{logoBlockMsg}</span>
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

                  {/* כפתורי לוגו — יוצגו רק אם מותר */}
                  {logoAllowed ? (
                    <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowUpload(true)}>העלה לוגו ({side === "front" ? "קדמי" : "אחורי"})</button>
                      <button type="button" className="btn btn-outline-primary" disabled={!logoBySide[side]} onClick={() => setShowLogoModal(true)} title={logoBySide[side] ? "" : "אין לוגו שמור לצד הזה"}>
                        פתח הצבה לצד {side === "front" ? "קדמי" : "אחורי"}
                      </button>
                      {previewBySide[side] && <span className="small text-success">יש הדמיה שמורה לצד הזה</span>}
                    </div>
                  ) : (
                    <div className="alert alert-secondary py-2" role="note">{logoBlockMsg}</div>
                  )}

                  <button className="btn btn-primary btn-lg" onClick={addToCart} disabled={!canAdd} title={!canAdd ? "בחר צבע ומידה" : undefined}>
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
                                  <input type="number" min={0} value={bulkForCurrentColor[s] ?? 0}
                                    onChange={(e) => setBulkQty(s, e.target.value)}
                                    className="form-control form-control-sm text-center"
                                    style={{ width: 90, marginInline: "auto" }} />
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
                          <button className="btn btn-primary" onClick={addBulkToCart} disabled={bulkTotalForCurrentColor === 0} title={bulkTotalForCurrentColor === 0 ? "לא הוזנו כמויות" : undefined}>
                            הוסף לעגלה (מרוכז)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* כפתורי לוגו — רק אם מותר */}
                  {logoAllowed ? (
                    <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowUpload(true)}>העלה לוגו ({side === "front" ? "קדמי" : "אחורי"})</button>
                      <button type="button" className="btn btn-outline-primary" disabled={!logoBySide[side]} onClick={() => setShowLogoModal(true)} title={logoBySide[side] ? "" : "אין לוגו שמור לצד הזה"}>
                        פתח הצבה לצד {side === "front" ? "קדמי" : "אחורי"}
                      </button>
                      {previewBySide[side] && <span className="small text-success">יש הדמיה שמורה לצד הזה</span>}
                    </div>
                  ) : (
                    <div className="alert alert-secondary py-2" role="note">{logoBlockMsg}</div>
                  )}
                </>
              )}

              <hr className="my-4" />
              <div>
                <h6 className="fw-bold">מידע</h6>
                <ul className="text-muted small mb-0">
                  <li>הדפסה איכותית על מגוון בדים.</li>
                  <li>העלאת לוגו והדמיה לפי צד — קדמי/אחורי.</li>
                  <li>משלוח לכל הארץ או איסוף עצמי.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* מודאלים — נטענים רק אם מותר לוגו */}
          {logoAllowed && (
            <>
              <LogoUploadModal
                show={showUpload}
                onClose={() => setShowUpload(false)}
                onConfirm={(dataUrl/*, file, uploaded*/) => {
                  onLogoUploaded(dataUrl);
                }}
              />
              <LogoPlacementModal
                show={showLogoModal}
                onClose={() => setShowLogoModal(false)}
                onSave={onSavePlacement}
                baseImageUrl={side === "front" ? product.img : (product.backImg || product.img)}
                printArea={side === "front" ? product.printArea : (product.backPrintArea || product.printArea)}
                logoDataUrl={logoBySide[side]}
              />
            </>
          )}

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
  );
}
