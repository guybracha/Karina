// src/pages/ProductDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";

import LogoPlacementModal from "../components/LogoPlacementModal";
import LogoUploadModal from "../components/LogoUploadModal";
import ColorSwatches from "../components/ColorSwatches";
import SizePicker from "../components/SizePicker";
import { PRODUCTS } from "../lib/products";

const LS_USER_LOGO_KEY = "karina:userLogo";
const LS_PREVIEW_KEY = (slug) => `karina:preview:${slug}`;
const LS_CART_KEY = "karina:cart";

export default function ProductDetail() {
  const [showUpload, setShowUpload] = useState(false);
  const { slug } = useParams();
  const location = useLocation();
  const product = useMemo(() => PRODUCTS.find((p) => p.slug === slug), [slug]);

  const [color, setColor] = useState(product?.colors?.[0] || "");
  const [size, setSize]   = useState(product?.sizes?.[0] || "");
  const [qty, setQty]     = useState(1);

  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoDataUrl, setLogoDataUrl]     = useState(null);
  const [previewImage, setPreviewImage]   = useState(null);

  // צד מוצג: 'front' | 'back'
  const [side, setSide] = useState("front");

  // canonical דינמי
  const origin = typeof window !== "undefined" ? window.location.origin : "https://example.com";
  const canonical = `${origin}/product/${slug}`;

  // SEO helpers
  const colorsList = product?.colors?.slice(0, 4)?.join(" / ") || "";
  const sizesList  = product?.sizes?.slice(0, 4)?.join(", ") || "";

  // תמונה שמוצגת כרגע (לפי צד). אם אין backImg – נשתמש ב-front.
  const baseImageForSide = side === "front" ? product?.img : (product?.backImg || product?.img);
  const shownImage = previewImage || baseImageForSide;

  const description = product
    ? `חולצת ${product.name} להדפסה אישית. צבעים: ${colorsList}. מידות: ${sizesList}. הזמנה מהירה מקארינה – הדפסה על חולצות ושירות לכל הארץ.`
    : "המוצר לא נמצא.";

  // -------- מוצרים דומים לפי type או category --------
  const currentKey = product?.type ?? product?.category ?? null;
  const similarProducts = useMemo(
    () =>
      product && currentKey
        ? PRODUCTS
            .filter((p) => p.slug !== product.slug && (p.type ?? p.category) === currentKey)
            .slice(0, 8)
        : [],
    [product, currentKey]
  );
  // ---------------------------------------------------

  // ───── עזרי עגלה (LocalStorage) ─────
  function readCartFromLS() {
    try {
      const raw = localStorage.getItem(LS_CART_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveCartToLS(next) {
    try {
      localStorage.setItem(LS_CART_KEY, JSON.stringify(next));
      // עדכון ה־Navbar (שמאזין לאירוע הזה)
      window.dispatchEvent(new Event("karina:cartUpdated"));
    } catch {}
  }

  // בעת החלפת מוצר: אתחול בחירות וטעינת LocalStorage
  useEffect(() => {
    setColor(product?.colors?.[0] || "");
    setSize(product?.sizes?.[0] || "");
    setQty(1);

    try {
      const savedPreview = localStorage.getItem(LS_PREVIEW_KEY(product?.slug || ""));
      setPreviewImage(savedPreview || null);
    } catch {
      setPreviewImage(null);
    }

    try {
      const savedLogo = localStorage.getItem(LS_USER_LOGO_KEY);
      setLogoDataUrl(savedLogo || null);
    } catch {
      setLogoDataUrl(null);
    }

    setShowLogoModal(false);
    setShowUpload(false);
    setSide("front"); // אתחול לצד קדמי במעבר בין מוצרים
  }, [product]);

  // אם אין מוצר – מחזירים מסך "לא נמצא"
  if (!product) {
    return (
      <div className="container py-4">
        <Helmet>
          <title>המוצר לא נמצא | קארינה</title>
          <meta name="robots" content="noindex" />
          <link rel="canonical" href={`${origin}${location.pathname}`} />
        </Helmet>

        <div className="alert alert-warning">המוצר לא נמצא</div>
        <Link className="btn btn-outline-primary" to="/catalog">
          חזרה לקטלוג
        </Link>
      </div>
    );
  }

  // פעולות
  function onSavePlacement({ dataUrl }) {
    setPreviewImage(dataUrl);
    setShowLogoModal(false);
    try {
      localStorage.setItem(LS_PREVIEW_KEY(product.slug), dataUrl);
    } catch {}
  }

  function addToCart() {
    // מזהה ייחודי לשורה (אותו מוצר+צבע+מידה יתמזג ויגדל בכמות)
    const lineId = `${product.slug}__${color}__${size}`;
    const current = readCartFromLS();

    const existingIdx = current.findIndex((it) => it.id === lineId);
    if (existingIdx >= 0) {
      const next = [...current];
      const prevQty = Number(next[existingIdx].qty || 0);
      next[existingIdx] = { ...next[existingIdx], qty: prevQty + Number(qty || 1) };
      saveCartToLS(next);
    } else {
      const newItem = {
        id: lineId,              // חשוב ל־Navbar (להסרה)
        slug: product.slug,
        name: product.name,
        price: Number(product.price) || 0,
        qty: Number(qty || 1),
        color,
        size,
        addedAt: Date.now()
      };
      saveCartToLS([newItem, ...current]);
    }

    // פידבק קטן למשתמש
    alert(`נוסף לעגלה: ${product.name} - ${color} / ${size} x${qty}`);
  }

  const canAdd = Boolean(color) && Boolean(size) && qty > 0;

  function resetSaved() {
    try {
      localStorage.removeItem(LS_USER_LOGO_KEY);
      localStorage.removeItem(LS_PREVIEW_KEY(product.slug));
    } catch {}
    setLogoDataUrl(null);
    setPreviewImage(null);
  }

  // JSON-LD Product + Breadcrumbs
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: shownImage ? [shownImage] : [],
    description,
    sku: product.slug,
    brand: { "@type": "Brand", name: "Karina" },
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "ILS",
      price: String(product.price),
      availability: "https://schema.org/InStock",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: `${origin}/` },
      { "@type": "ListItem", position: 2, name: "קטלוג", item: `${origin}/catalog` },
      { "@type": "ListItem", position: 3, name: product.name, item: canonical },
    ],
  };

  // אזור הדפסה לפי צד (אם תרצה בעתיד backPrintArea נפרד)
  const shownPrintArea =
    side === "front" ? product.printArea : (product.backPrintArea || product.printArea);

  return (
    <div className="container py-4">
      {/* SEO */}
      <Helmet prioritizeSeoTags>
        <title>{`${product.name} | קארינה - הדפסה על חולצות`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />

        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:site_name" content="Karina" />
        <meta property="og:title" content={`${product.name} | קארינה`} />
        <meta property="og:description" content={description} />
        {shownImage && <meta property="og:image" content={shownImage} />}
        <meta property="og:url" content={canonical} />
        <meta property="product:price:amount" content={String(product.price)} />
        <meta property="product:price:currency" content="ILS" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} | קארינה`} />
        <meta name="twitter:description" content={description} />
        {shownImage && <meta name="twitter:image" content={shownImage} />}

        {/* JSON-LD */}
        <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbJsonLd)}</script>
      </Helmet>

      <div className="row g-4">
        {/* תצוגת פריט / הדמיה */}
        <div className="col-12 col-lg-6">
          {(product.img || product.backImg) && (
            <div className="btn-group mb-2" role="group" aria-label="בחר צד">
              <button
                type="button"
                className={`btn btn-sm ${side === "front" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setSide("front")}
              >
                צד קדמי
              </button>
              <button
                type="button"
                className={`btn btn-sm ${side === "back" ? "btn-primary" : "btn-outline-primary"}`}
                onClick={() => setSide("back")}
                disabled={!product.backImg}
                title={product.backImg ? "" : "אין תמונת צד אחורי"}
              >
                צד אחורי
              </button>
            </div>
          )}

          <div className="border rounded-4 p-2 bg-white" style={{ minHeight: 480 }}>
            <img
              src={shownImage}
              alt={product.name}
              className="img-fluid d-block mx-auto"
              style={{ maxHeight: 520, objectFit: "contain" }}
            />
          </div>

          {/* פס עזר: סטטוס שמירה + פעולה */}
          <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
            <span className="badge text-bg-light">תצוגה: {side === "front" ? "קדמי" : "אחורי"}</span>

            {logoDataUrl ? (
              <span className="badge text-bg-success">לוגו שמור ללקוח</span>
            ) : (
              <span className="badge text-bg-secondary">אין לוגו שמור</span>
            )}
            {previewImage && <span className="badge text-bg-primary">הדמיה שמורה למוצר</span>}

            {(logoDataUrl || previewImage) && (
              <button className="btn btn-sm btn-outline-danger ms-auto" onClick={resetSaved}>
                איפוס לוגו/הדמיה שמורים
              </button>
            )}
          </div>
        </div>

        {/* פרטים ובחירות */}
        <div className="col-12 col-lg-6">
          <h1 className="h3">{product.name}</h1>
          <p className="lead">{product.price} ₪</p>
          <small className="text-muted d-block mb-3">לא כולל משלוח</small>

          <div className="mb-3">
            <ColorSwatches colors={product.colors} value={color} onChange={setColor} />
          </div>

          <div className="mb-3">
            <SizePicker sizes={product.sizes} value={size} onChange={setSize} />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">כמות</label>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="form-control w-auto"
            />
          </div>

          {/* העלאת לוגו + פתיחת הצבה */}
          <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowUpload(true)}
            >
              העלה לוגו
            </button>

            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={!logoDataUrl}
              onClick={() => setShowLogoModal(true)}
              title={logoDataUrl ? "" : "אין לוגו שמור"}
            >
              פתח הצבה עם הלוגו שלי
            </button>

            {previewImage && <span className="small text-success">יש הדמיה שמורה</span>}
          </div>

          <button
            className="btn btn-primary btn-lg"
            onClick={addToCart}
            disabled={!canAdd}
            title={!canAdd ? "בחר צבע ומידה" : undefined}
          >
            הוסף לעגלה
          </button>

          <hr className="my-4" />
          <div>
            <h6 className="fw-bold">מידע</h6>
            <ul className="text-muted small mb-0">
              <li>הדפסה איכותית על מגוון בדים.</li>
              <li>העלאת לוגו והדמיה לפני הזמנה בחלון ייעודי.</li>
              <li>משלוח לכל הארץ או איסוף עצמי.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* מודאל העלאת לוגו */}
      <LogoUploadModal
        show={showUpload}
        onClose={() => setShowUpload(false)}
        onConfirm={(dataUrl) => {
          try {
            localStorage.setItem(LS_USER_LOGO_KEY, dataUrl);
          } catch {}
          setLogoDataUrl(dataUrl);
          setShowUpload(false);
          setShowLogoModal(true);
        }}
      />

      {/* מודאל הצבת לוגו על המוצר */}
      <LogoPlacementModal
        show={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        onSave={onSavePlacement}
        baseImageUrl={baseImageForSide}
        printArea={shownPrintArea}
        logoDataUrl={logoDataUrl}
      />

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
                  <img
                    src={p.img}
                    className="card-img-top"
                    alt={p.name}
                    style={{ height: 120, objectFit: "cover" }}
                  />
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
    </div>
  );
}
