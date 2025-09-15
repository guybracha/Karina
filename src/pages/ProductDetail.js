// src/pages/ProductDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import LogoPlacementModal from "../components/LogoPlacementModal";
import LogoUploadModal from "../components/LogoUploadModal";
import ColorSwatches from "../components/ColorSwatches";
import SizePicker from "../components/SizePicker";

import { PRODUCTS } from "../lib/products";  // ✅ מקור אחד למוצרים

export default function ProductDetail() {
  const [showUpload, setShowUpload] = useState(false);
  const { slug } = useParams();
  const product = useMemo(() => PRODUCTS.find((p) => p.slug === slug), [slug]);

  const [color, setColor] = useState(product?.colors?.[0] || "");
  const [size, setSize]   = useState(product?.sizes?.[0] || "");
  const [qty, setQty]     = useState(1);

  // מודאלים + הדמיה
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // אתחול/רענון בחירות כשמחליפים מוצר
  useEffect(() => {
    setColor(product?.colors?.[0] || "");
    setSize(product?.sizes?.[0] || "");
    setQty(1);
    setPreviewImage(null);
    setLogoDataUrl(null);
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

  function onSavePlacement({ dataUrl }) {
    setPreviewImage(dataUrl);
    setShowLogoModal(false);
  }

  function addToCart() {
    // TODO: חבר לעגלת הקניות (CartContext / api.cartAdd)
    alert(`נוסף לעגלה: ${product.name} - ${color} / ${size} x${qty}`);
  }

  const canAdd = Boolean(color) && Boolean(size) && qty > 0;

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

          {/* העלאת לוגו -> מודאל העלאה ואז מודאל הצבה */}
          <div className="d-flex align-items-center gap-2 mb-3">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => setShowUpload(true)}
            >
              העלה לוגו
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

      {/* מודאלים */}
      <LogoUploadModal
        show={showUpload}
        onClose={() => setShowUpload(false)}
        onConfirm={(dataUrl /*, file */) => {
          setLogoDataUrl(dataUrl);
          setShowUpload(false);
          setShowLogoModal(true);
        }}
      />

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
