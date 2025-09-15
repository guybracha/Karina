// src/pages/Catalog.jsx
import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PRODUCTS } from "../lib/products";  // ✅ ייבוא מהרשימה המשותפת

// דוגמאות מוצרים זמניים

export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const [color, setColor] = useState(params.get("color") || "");
  const [size, setSize] = useState(params.get("size") || "");
  const query = (params.get("query") || "").toLowerCase();

  // פילטור מוצרים
  const filtered = PRODUCTS.filter((p) => {
    const matchQuery = !query || p.name.toLowerCase().includes(query);
    const matchColor = !color || p.colors.includes(color);
    const matchSize = !size || p.sizes.includes(size);
    return matchQuery && matchColor && matchSize;
  });

  function handleFilterChange(e, type) {
    const value = e.target.value;
    if (type === "color") setColor(value);
    if (type === "size") setSize(value);

    const newParams = new URLSearchParams(params);
    if (value) newParams.set(type, value);
    else newParams.delete(type);
    setParams(newParams);
  }

  return (
    <div className="container py-4">
      <h1 className="mb-4">קטלוג מוצרים</h1>

      {/* סינון */}
      <div className="row mb-4 g-3">
        <div className="col-md-4">
          <label className="form-label">בחר צבע</label>
          <select
            className="form-select"
            value={color}
            onChange={(e) => handleFilterChange(e, "color")}
          >
            <option value="">כל הצבעים</option>
            <option value="נייבי">נייבי</option>
            <option value="שחור">שחור</option>
            <option value="אפור">אפור</option>
            <option value="לבן">לבן</option>
            <option value="כחול">כחול</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">בחר מידה</label>
          <select
            className="form-select"
            value={size}
            onChange={(e) => handleFilterChange(e, "size")}
          >
            <option value="">כל המידות</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="One Size">One Size</option>
          </select>
        </div>
      </div>

      {/* מוצרים */}
      <div className="row g-4">
        {filtered.length > 0 ? (
          filtered.map((p) => (
            <div className="col-6 col-md-4 col-lg-3" key={p.slug}>
              <div className="card h-100 shadow-sm">
                <img
                  src={p.img}
                  className="card-img-top"
                  alt={p.name}
                  style={{ objectFit: "cover", height: "200px" }}
                />
                <div className="card-body d-flex flex-column">
                  <h6 className="card-title">{p.name}</h6>
                  <p className="text-muted mb-2">{p.price} ₪</p>
                  <Link
                    to={`/product/${p.slug}`}
                    className="btn btn-outline-primary mt-auto"
                  >
                    לפריט
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-muted">לא נמצאו מוצרים מתאימים.</p>
        )}
      </div>
    </div>
  );
}
