// src/pages/ProductDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import LogoPlacementModal from "../components/LogoPlacementModal";
import LogoUploadModal from "../components/LogoUploadModal";
import ColorSwatches from "../components/ColorSwatches";
import SizePicker from "../components/SizePicker";

import { PRODUCTS } from "../lib/products";

const LS_USER_LOGO_KEY = "karina:userLogo";              // לוגו של המשתמש (DataURL)
const LS_PREVIEW_KEY = (slug) => `karina:preview:${slug}`; // הדמיה לכל מוצר

export default function ProductDetail() {
  const [showUpload, setShowUpload] = useState(false);
  const { slug } = useParams();
  const product = useMemo(() => PRODUCTS.find((p) => p.slug === slug), [slug]);

  const [color, setColor] = useState(product?.colors?.[0] || "");
  const [size, setSize]   = useState(product?.sizes?.[0] || "");
  const [qty, setQty]     = useState(1);

  // מודאלים + הדמיה
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);   // הלוגו של המשתמש (מקומי / שמור)
  const [previewImage, setPreviewImage] = useState(null); // ההדמיה שנוצרה ושמורה

  // בעת החלפת מוצר: אתחול בחירות וטעינת מידע שמור מה-LocalStorage
  useEffect(() => {
    setColor(product?.colors?.[0] || "");
    setSize(product?.sizes?.[0] || "");
    setQty(1);

    // טען הדמיה שמורה למוצר
    try {
      const savedPreview = localStorage.getItem(LS_PREVIEW_KEY(product?.slug || ""));
      setPreviewImage(savedPreview || null);
    } catch { setPreviewImage(null); }

    // טען לוגו שמור של המשתמש (זמין חוצה מוצרים)
    try {
      const savedLogo = localStorage.getItem(LS_USER_LOGO_KEY);
      setLogoDataUrl(savedLogo || null);
    } catch { setLogoDataUrl(null); }

    setShowLogoModal(false);
    setShowUpload(false);
  }, [product]);

  if (!product) {
    return (
      <div className="container py-4">
        <div className="alert alert-warning">המוצר לא נמצא</div>
        <Link className="btn btn-outline-primary" to="/catalog">חזרה לקטלוג</Link>
      </div>
    );
  }

  // שמירת ההדמיה מהמודאל
  function onSavePlacement({ dataUrl }) {
    setPreviewImage(dataUrl);
    setShowLogoModal(false);
    // שמור הדמיה למוצר
    try { localStorage.setItem(LS_PREVIEW_KEY(product.slug), dataUrl); } catch {}
  }

  function addToCart() {
    // TODO: לחבר לעגלת הקניות
    alert(`נוסף לעגלה: ${product.name} - ${color} / ${size} x${qty}`);
  }

  const canAdd = Boolean(color) && Boolean(size) && qty > 0;

  // איפוס לוגו/הדמיה שמורים
  function resetSaved() {
    try {
      localStorage.removeItem(LS_USER_LOGO_KEY);
      localStorage.removeItem(LS_PREVIEW_KEY(product.slug));
    } catch {}
    setLogoDataUrl(null);
    setPreviewImage(null);
  }

  return (
    <div className="container py-4">
      <div className="row g-4">
        {/* תצוגת פריט / הדמיה */}
        <div className="col-12 col-lg-6">
          <div className="border rounded-4 p-2 bg-white" style={{ minHeight: 480 }}>
            <img
              src={previewImage || product.img}
              alt={product.name}
              className="img-fluid d-block mx-auto"
              style={{ maxHeight: 520, objectFit: "contain" }}
            />
          </div>

          {/* פס עזר: סטטוס שמירה + פעולה */}
          <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
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
            <ColorSwatches
              colors={product.colors}
              value={color}
              onChange={setColor}
            />
          </div>

          <div className="mb-3">
            <SizePicker
              sizes={product.sizes}
              value={size}
              onChange={setSize}
            />
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

            {/* אם יש לוגו שמור – אפשר לקפוץ ישר למודאל ההצבה */}
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
        onConfirm={(dataUrl /*, file */) => {
          // שמור לוגו ללקוח
          try { localStorage.setItem(LS_USER_LOGO_KEY, dataUrl); } catch {}
          setLogoDataUrl(dataUrl);
          setShowUpload(false);
          setShowLogoModal(true); // אחרי העלאה – עבור ישר להצבה
        }}
      />

      {/* מודאל הצבת לוגו על המוצר */}
      <LogoPlacementModal
        show={showLogoModal}
        onClose={() => setShowLogoModal(false)}
        onSave={onSavePlacement}
        baseImageUrl={product.img}
        printArea={product.printArea}
        logoDataUrl={logoDataUrl}
      />

      {/* מוצרים דומים */}
      <div className="mt-5">
        <h5 className="mb-3">מוצרים דומים</h5>
        <div className="d-flex gap-3 flex-wrap">
          {PRODUCTS.filter((p) => p.slug !== product.slug).map((p) => (
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
      </div>
    </div>
  );
}
