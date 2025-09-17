// src/pages/Cart.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

const LS_PREVIEW_KEY = (slug) => `karina:preview:${slug}`;

export default function Cart() {
  // דמו — בעתיד תחליף ב־CartContext / LocalStorage של העגלה
  const [items, setItems] = useState([
    { id: 1, slug: "hoodie-navy",   name: "קפוצ׳ון נייבי",     price: 120, qty: 2, color: "שחור", size: "M" },
    { id: 2, slug: "tshirt-gray",   name: "חולצת טריקו אפורה", price: 35,  qty: 1, color: "אפור",  size: "L" },
    // הוסף כאן פריטים נוספים עם slug תואם לקטלוג שלך
  ]);

  function updateQty(id, newQty) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, qty: Math.max(1, Number(newQty) || 1) } : it
      )
    );
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.price * it.qty, 0),
    [items]
  );

  // מביא הדמיה שמורה (אם קיימת) לכל פריט
  function getPreviewForItem(it) {
    try {
      if (!it.slug) return null;
      return localStorage.getItem(LS_PREVIEW_KEY(it.slug));
    } catch {
      return null;
    }
  }

  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">העגלה שלי</h1>

      {items.length === 0 ? (
        <div className="alert alert-info">
          העגלה שלך ריקה.{" "}
          <Link to="/catalog" className="alert-link">
            חזור לקטלוג
          </Link>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th style={{ width: 96 }}>תצוגה</th>
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
                  const preview = getPreviewForItem(it);
                  return (
                    <tr key={it.id}>
                      <td>
                        {preview ? (
                          <img
                            src={preview}
                            alt={`הדמיה עבור ${it.name}`}
                            style={{
                              width: 72,
                              height: 72,
                              objectFit: "contain",
                              borderRadius: 8,
                              background: "#fff",
                              border: "1px solid rgba(0,0,0,.08)",
                            }}
                          />
                        ) : (
                          <span className="badge text-bg-secondary">ללא הדמיה</span>
                        )}
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
                      <td>{it.price} ₪</td>
                      <td>{it.price * it.qty} ₪</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeItem(it.id)}
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

          <div className="d-flex justify-content-between align-items-center mt-4">
            <Link to="/catalog" className="btn btn-outline-secondary">
              המשך בקנייה
            </Link>
            <div className="text-end">
              <h5>סה״כ לתשלום: {total} ₪</h5>
              <button className="btn btn-primary btn-lg mt-2">
                מעבר לתשלום
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
