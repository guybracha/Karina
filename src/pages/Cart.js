// src/pages/Cart.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ---- Firebase ----
import { auth, db, functions } from "../firebase"; // ← עדכן את הנתיב/ייצוא לפי הפרויקט שלך
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

const LS_CART_KEY = "karina:cart";
const LS_SHIP_KEY = "karina:shipping";
// הדמיה שמורה לפי מוצר+צד
const LS_PREVIEW_KEY = (slug, side) => `karina:preview:${slug}:${side}`;

// טבלת אפשרויות משלוח (קל לשינוי)
const SHIP_OPTIONS = {
  standard: { label: "משלוח רגיל", cost: 20 },
  express:  { label: "משלוח אקספרס", cost: 45 },
  pickup:   { label: "איסוף מהמפעל", cost: 0  },
};

export default function Cart() {
  const [items, setItems] = useState([]);
  const [shipping, setShipping] = useState(() => {
    try { return localStorage.getItem(LS_SHIP_KEY) || "standard"; } catch { return "standard"; }
  });
  const [loading, setLoading] = useState(false);

  // Firebase user state
  const [uid, setUid] = useState(null);

  // דיבאונס לשמירה ל-Firestore
  const saveTimer = useRef(null);

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
      window.dispatchEvent(new Event("karina:cartUpdated"));
    } catch {}
  }

  // --- Firestore helpers ---
  function cartDocRef(userId) {
    // שמירת עגלת טיוטה תחת users/{uid}/carts/current
    return doc(db, "users", userId, "carts", "current");
  }
  function orderDraftDocRef(userId) {
    // אופציונלי: הזמנת טיוטה אחת פעילה
    return doc(db, "users", userId, "orders", "draft");
  }

  async function loadCartFromFirestore(userId) {
    try {
      const snap = await getDoc(cartDocRef(userId));
      if (snap.exists()) {
        const data = snap.data() || {};
        const fsItems = Array.isArray(data.items) ? data.items : [];
        const fsShipping = data.shipping?.method || "standard";
        setItems(fsItems);
        setShipping(fsShipping);
        // גם לעדכן LS כדי לאפשר גלישה לאורח אח"כ
        saveCartToLS(fsItems);
        try { localStorage.setItem(LS_SHIP_KEY, fsShipping); } catch {}
      } else {
        // אין עגלה ב-FS → לדחוף את ה-LS ל-FS
        const lsItems = readCartFromLS();
        setItems(lsItems);
        await setDoc(cartDocRef(userId), {
          items: lsItems,
          shipping: { method: shipping, label: SHIP_OPTIONS[shipping]?.label || "משלוח רגיל", cost: SHIP_OPTIONS[shipping]?.cost ?? 20 },
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (e) {
      console.warn("Failed to load cart from Firestore, using LS fallback:", e);
      setItems(readCartFromLS());
    }
  }

  function scheduleSaveToFirestore(userId, nextItems, nextShipping) {
    if (!userId) return; // אורח: לא שומר ל-FS
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const opt = SHIP_OPTIONS[nextShipping] || SHIP_OPTIONS.standard;
        await setDoc(cartDocRef(userId), {
          items: nextItems,
          shipping: { method: nextShipping, label: opt.label, cost: opt.cost },
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (e) {
        console.warn("Failed to save cart to Firestore:", e);
      }
    }, 400); // דיבאונס קצר
  }

  // ----- mount: auth + load cart -----
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const userId = user?.uid || null;
      setUid(userId);
      if (userId) {
        await loadCartFromFirestore(userId);
      } else {
        // אורח: נטען מ-LS
        setItems(readCartFromLS());
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // סנכרון LS כשיש שינוי מהחוץ
  useEffect(() => {
    function onStorage(e) {
      if (e.key === LS_CART_KEY) setItems(readCartFromLS());
      if (e.key === LS_SHIP_KEY) {
        try { setShipping(localStorage.getItem(LS_SHIP_KEY) || "standard"); } catch {}
      }
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

  // שמירת בחירת משלוח ב-LS וב-FS
  useEffect(() => {
    try { localStorage.setItem(LS_SHIP_KEY, shipping); } catch {}
    scheduleSaveToFirestore(uid, items, shipping);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipping]);

  function updateQty(id, newQty) {
    const qty = Math.max(1, Number(newQty) || 1);
    setItems((prev) => {
      const next = prev.map((it) => (it.id === id ? { ...it, qty } : it));
      saveCartToLS(next);
      scheduleSaveToFirestore(uid, next, shipping);
      return next;
    });
  }

  function removeItem(id) {
    setItems((prev) => {
      const next = prev.filter((it) => it.id !== id);
      saveCartToLS(next);
      scheduleSaveToFirestore(uid, next, shipping);
      return next;
    });
  }

  // סה״כ מוצרים (ללא משלוח)
  const merchandiseTotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.price || 0) * Number(it.qty || 0), 0),
    [items]
  );

  // עלות משלוח
  const shippingCost = useMemo(() => {
    const opt = SHIP_OPTIONS[shipping] || SHIP_OPTIONS.standard;
    return items.length === 0 ? 0 : Number(opt.cost || 0);
  }, [shipping, items.length]);

  const grandTotal = useMemo(() => merchandiseTotal + shippingCost, [merchandiseTotal, shippingCost]);

  // מביא הדמיות שמורות לכל פריט — קדמי/אחורי
  function getPreviewsForItem(it) {
    try {
      if (!it.slug) return { front: null, back: null };
      const front = localStorage.getItem(LS_PREVIEW_KEY(it.slug, "front"));
      const back  = localStorage.getItem(LS_PREVIEW_KEY(it.slug, "back"));
      return { front: front || null, back: back || null };
    } catch {
      return { front: null, back: null };
    }
  }

  // יצירת/עדכון הזמנת טיוטה ב-FS לפני יציאה לתשלום
  async function upsertDraftOrder(userId, payload) {
    if (!userId) return;
    try {
      await setDoc(orderDraftDocRef(userId), {
        status: "draft",
        payload,
        amount: grandTotal,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to upsert draft order:", e);
    }
  }

  // התחלת תשלום: שולחים גם הדמיות וגם משלוח
  async function startCheckout() {
    try {
      setLoading(true);

      const payloadItems = items.map(({ slug, qty, color, size, name, price }) => {
        const previews = getPreviewsForItem({ slug });
        return {
          slug, qty, color, size, name, price,
          previews: { front: previews.front || null, back: previews.back || null },
        };
      });

      const shipOpt = SHIP_OPTIONS[shipping] || SHIP_OPTIONS.standard;

      const payload = {
        items: payloadItems,
        shipping: {
          method: shipping,
          label: shipOpt.label,
          cost: shipOpt.cost,
        },
        clientTotals: {
          merchandiseTotal,
          shippingCost,
          grandTotal,
        },
      };

      // עדכון הזמנת טיוטה למשתמשים מחוברים (לא חובה לאורחים)
      if (uid) {
        await upsertDraftOrder(uid, payload);
      }

      // --- ניסיון 1: Cloud Function (callable) ---
      let checkoutUrl = null;
      try {
        const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
        const { data } = await createCheckoutSession(payload);
        checkoutUrl = data?.checkoutUrl || null;
      } catch (e) {
        console.info("Callable function failed/absent, trying /api/checkout/session…", e);
      }

      // --- ניסיון 2: fetch ל-API פרטי (נפילה) ---
      if (!checkoutUrl) {
        const res = await fetch("/api/checkout/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Checkout request failed");
        const json = await res.json();
        checkoutUrl = json?.checkoutUrl;
      }

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
          <Link to="/catalog" className="alert-link">חזור לקטלוג</Link>
        </div>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th style={{ width: 140 }}>תצוגה</th>
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
                  const { front, back } = getPreviewsForItem(it);
                  return (
                    <tr key={it.id}>
                      <td>
                        <div className="d-flex gap-2 align-items-center">
                          {/* קדמי */}
                          {front ? (
                            <div className="text-center">
                              <img
                                src={front}
                                alt={`הדמיה קדמית עבור ${it.name}`}
                                style={{
                                  width: 60, height: 60, objectFit: "contain",
                                  borderRadius: 8, background: "#fff",
                                  border: "1px solid rgba(0,0,0,.08)", display: "block",
                                }}
                              />
                              <small className="text-muted d-block mt-1" style={{ lineHeight: 1 }}>קדמי</small>
                            </div>
                          ) : (
                            <span className="badge text-bg-secondary">אין קדמי</span>
                          )}
                          {/* אחורי */}
                          {back ? (
                            <div className="text-center">
                              <img
                                src={back}
                                alt={`הדמיה אחורית עבור ${it.name}`}
                                style={{
                                  width: 60, height: 60, objectFit: "contain",
                                  borderRadius: 8, background: "#fff",
                                  border: "1px solid rgba(0,0,0,.08)", display: "block",
                                }}
                              />
                              <small className="text-muted d-block mt-1" style={{ lineHeight: 1 }}>אחורי</small>
                            </div>
                          ) : (
                            <span className="badge text-bg-secondary">אין אחורי</span>
                          )}
                        </div>
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
                        <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(it.id)}>
                          הסר
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* בחירת משלוח */}
          <div className="mt-3 p-3 border rounded-3">
            <h6 className="mb-3">אפשרות משלוח</h6>
            <div className="d-flex flex-wrap gap-4">
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
                    {opt.label}{" "}
                    <small className="text-muted">({opt.cost.toLocaleString("he-IL")} ₪)</small>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* סיכום תשלום */}
          <div className="d-flex justify-content-between align-items-end mt-4 flex-wrap gap-3">
            <Link to="/catalog" className="btn btn-outline-secondary">המשך בקנייה</Link>

            <div className="ms-auto">
              <div className="text-end">
                <div className="d-flex justify-content-between" style={{ minWidth: 260 }}>
                  <span className="text-muted">סה״כ מוצרים:</span>
                  <strong>{merchandiseTotal.toLocaleString("he-IL")} ₪</strong>
                </div>
                <div className="d-flex justify-content-between" style={{ minWidth: 260 }}>
                  <span className="text-muted">
                    משלוח ({(SHIP_OPTIONS[shipping]?.label) || "—"}):
                  </span>
                  <strong>{shippingCost.toLocaleString("he-IL")} ₪</strong>
                </div>
                <hr className="my-2" />
                <h5 className="mb-0">סה״כ לתשלום: {grandTotal.toLocaleString("he-IL")} ₪</h5>
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
