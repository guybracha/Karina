// src/pages/Cart.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const LS_CART_KEY = "karina:cart";
const LS_PREVIEW_KEY = (slug) => `karina:preview:${slug}`;

export default function Cart() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- LS helpers ---
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
      // שידור לכל האפליקציה (Navbar וכו׳)
      window.dispatchEvent(new Event("karina:cartUpdated"));
    } catch {}
  }

  // טוען מה־LS ומסתנכרן עם שינויים חיצוניים
  useEffect(() => {
    setItems(readCartFromLS());

    function onStorage(e) {
      if (e.key === LS_CART_KEY) setItems(readCartFromLS());
    }
    function onCustom() {
      setItems(readCartFromLS());
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("karina:cartUpdated", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("karina:cartUpdated", onCustom);
    };
  }, []);

  function updateQty(id, newQty) {
    const qty = Math.max(1, Number(newQty) || 1);
    setItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, qty } : it));
      saveCartToLS(next);
      return next;
    });
  }

  function removeItem(id) {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      saveCartToLS(next);
      return next;
    });
  }

  const total = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0), 0),
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

  // התחלת תשלום: פנייה לשרת שיוצר סשן קופה ומחזיר URL
  async function startCheckout() {
    try {
      setLoading(true);
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // שולחים רק מידע לוגי; המחיר הסופי יחושב בשרת
        body: JSON.stringify({
          items: items.map(({ slug, qty, color, size }) => ({ slug, qty, color, size })),
        }),
      });
      if (!res.ok) throw new Error("Checkout request failed");
      const { checkoutUrl } = await res.json();
      if (!checkoutUrl) throw new Error("Missing checkoutUrl");
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      alert("אירעה שגיאה בהפניה לקופה. נסה שוב.");
    } finally {
      setLoading(false);
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
                      <td>{Number(it.price).toLocaleString("he-IL")} ₪</td>
                      <td>{(Number(it.price) * Number(it.qty)).toLocaleString("he-IL")} ₪</td>
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
              <h5>סה״כ לתשלום: {total.toLocaleString("he-IL")} ₪</h5>
              <button
                className="btn btn-primary btn-lg mt-2"
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
