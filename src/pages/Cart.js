// src/pages/Cart.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ---- Firebase ----
import { auth, db, functions } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, setDoc, collection, serverTimestamp
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { uploadPreview } from "../lib/uploadPreview";

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

// ===== LocalStorage helpers (עם נירמול והקשחה) =====
function isValidItem(x) {
  return x && typeof x === "object" &&
    "id" in x && "name" in x &&
    "qty" in x && !Number.isNaN(Number(x.qty)) &&
    "price" in x && !Number.isNaN(Number(x.price));
}
function normalizeCartArray(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter(isValidItem)
    .map(it => ({
      ...it,
      qty: Math.max(1, Number(it.qty) || 1),
      price: Number(it.price) || 0,
    }));
}
function readCartFromLS() {
  try {
    const raw = localStorage.getItem(LS_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const normalized = normalizeCartArray(parsed);
    if (raw && JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      localStorage.setItem(LS_CART_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch (e) {
    console.warn("[Cart] failed to parse LS cart:", e);
    return [];
  }
}
function saveCartToLS(next) {
  try {
    const normalized = normalizeCartArray(next);
    localStorage.setItem(LS_CART_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event("karina:cartUpdated"));
  } catch {}
}

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

  // --- Firestore helpers ---
  function cartDocRef(userId) {
    // שמירת עגלת טיוטה תחת users/{uid}/carts/current
    return doc(db, "users", userId, "carts", "current");
  }
  function orderDraftDocRef(userId) {
    // אופציונלי: הזמנת טיוטה אחת פעילה
    return doc(db, "users", userId, "orders", "draft");
  }

  // טוען עגלה מהענן, מונע דריסת LS
  async function loadCartFromFirestore(userId) {
    try {
      const snap = await getDoc(cartDocRef(userId));
      if (snap.exists()) {
        const data = snap.data() || {};
        const fsItems = Array.isArray(data.items) ? data.items : [];
        const fsShipping = data.shipping?.method || "standard";

        // אם עגלת הענן לא ריקה → היא המקור
        if (fsItems.length > 0) {
          setItems(fsItems);
          setShipping(fsShipping);
          saveCartToLS(fsItems); // סנכרון חד־כיווני FS→LS
          try { localStorage.setItem(LS_SHIP_KEY, fsShipping); } catch {}
          return;
        }

        // אם מסמך קיים אבל ריק → ננסה לקדם את עגלת ה־LS לענן
        const lsItems = readCartFromLS();
        if (lsItems.length > 0) {
          setItems(lsItems);
          await setDoc(cartDocRef(userId), {
            items: lsItems,
            shipping: { method: shipping, label: SHIP_OPTIONS[shipping]?.label || "משלוח רגיל", cost: SHIP_OPTIONS[shipping]?.cost ?? 20 },
            updatedAt: serverTimestamp(),
          }, { merge: true });
          // לא מוחקים LS
        } else {
          // גם FS וגם LS ריקים
          setItems([]);
          setShipping(fsShipping);
          try { localStorage.setItem(LS_SHIP_KEY, fsShipping); } catch {}
        }
      } else {
        // אין מסמך עגלה בענן → קדם את LS אם יש
        const lsItems = readCartFromLS();
        if (lsItems.length > 0) {
          setItems(lsItems);
          await setDoc(cartDocRef(userId), {
            items: lsItems,
            shipping: { method: shipping, label: SHIP_OPTIONS[shipping]?.label || "משלוח רגיל", cost: SHIP_OPTIONS[shipping]?.cost ?? 20 },
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } else {
          setItems([]); // מתחילים ריק, לא נוגעים ב-LS
        }
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

  // ----- פרטי לקוח -----
  async function getCustomerProfile(userId) {
    if (!userId) return null;
    try {
      const userDoc = await getDoc(doc(db, "users", userId));
      const data = userDoc.exists() ? userDoc.data() : {};
      const a = auth.currentUser || {};
      const name  = data.displayName || data.name || a.displayName || "";
      const phone = data.phone || data.phoneNumber || a.phoneNumber || "";
      const email = data.email || a.email || "";
      return { uid: userId, name, phone, email };
    } catch {
      const a = auth.currentUser || {};
      return { uid: userId, name: a.displayName || "", phone: a.phoneNumber || "", email: a.email || "" };
    }
  }

  // יוצר מסמך הזמנה טופ-לבל ומראה תחת המשתמש
  async function createOrderDocument(customer, payload) {
    const ordersCol = collection(db, "orders");
    // יצירת doc עם מזהה אוטומטי
    const newOrderRef = doc(ordersCol);
    const order = {
      status: "initiated",                // או "pending_payment"
      customer,                           // { uid, name, phone, email }
      items: payload.items,               // כולל previews
      shipping: payload.shipping,         // { method, label, cost }
      totals: payload.clientTotals,       // { merchandiseTotal, shippingCost, grandTotal }
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      draft: true
    };
    await setDoc(newOrderRef, order);

    // מראה תחת המשתמש להיסטוריה / דשבורד
    try {
      if (customer?.uid) {
        await setDoc(doc(db, "users", customer.uid, "orders", newOrderRef.id), {
          orderRef: newOrderRef.path,
          status: order.status,
          totals: order.totals,
          shipping: order.shipping,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    } catch {}

    return newOrderRef.id;
  }

  // ----- mount: טען מיד מה-LS ואז התחבר ל-auth -----
  useEffect(() => {
    // טעינה מיידית כדי שלא תראה עגלה ריקה עד שה-auth מסיים
    setItems(readCartFromLS());

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
  async function upsertDraftOrder(userId, payload, customer) {
    if (!userId) return;
    try {
      await setDoc(orderDraftDocRef(userId), {
        status: "draft",
        payload,
        amount: grandTotal,
        customer: customer || null,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      console.warn("Failed to upsert draft order:", e);
    }
  }

  // התחלת תשלום: שולחים גם הדמיות וגם משלוח + שמירת הזמנה במסד
async function startCheckout() {
  try {
    setLoading(true);

    // 1) ודא שיש orderId מוקדם כדי לשמור תמונות תחתיו
    const customer = uid ? await getCustomerProfile(uid) : null;
    let orderId = null;

    // מכין payload בסיסי (ללא קישורים עדיין)
    const shipOpt = SHIP_OPTIONS[shipping] || SHIP_OPTIONS.standard;
    const basePayload = {
      items: [], // נמלא אחרי העלאות
      shipping: { method: shipping, label: shipOpt.label, cost: shipOpt.cost },
      clientTotals: { merchandiseTotal, shippingCost, grandTotal },
    };

    if (customer?.uid) {
      // צור מסמך הזמנה ריק כדי לקבל orderId
      orderId = await createOrderDocument(customer, basePayload);
      try { localStorage.setItem("karina:lastOrderId", orderId); } catch {}
    }

    // 2) העלאת הדמיות ל-Storage והחלפתן ב-URL
    const itemsWithUrls = [];
    for (const { slug, qty, color, size, name, price } of items) {
      const { front, back } = getPreviewsForItem({ slug });
      let frontUrl = null, backUrl = null;

      if (customer?.uid && front?.startsWith?.("data:")) {
        try {
          const up = await uploadPreview({ uid: customer.uid, orderId, slug, side: "front", source: front });
          frontUrl = up.url;
        } catch (e) { console.warn("upload front failed", e); }
      } else if (front && /^https?:\/\//.test(front)) {
        frontUrl = front; // כבר URL
      }

      if (customer?.uid && back?.startsWith?.("data:")) {
        try {
          const up = await uploadPreview({ uid: customer.uid, orderId, slug, side: "back", source: back });
          backUrl = up.url;
        } catch (e) { console.warn("upload back failed", e); }
      } else if (back && /^https?:\/\//.test(back)) {
        backUrl = back;
      }

      itemsWithUrls.push({
        slug, qty, color, size, name, price,
        previews: { frontUrl: frontUrl || null, backUrl: backUrl || null },
      });
    }

    // 3) עדכן את ההזמנה במסד עם ה-URLs החדשים
    const payload = { ...basePayload, items: itemsWithUrls };

    if (uid) {
      // דרפט אישי תחת המשתמש
      await upsertDraftOrder(uid, payload, customer);
    }
    if (customer?.uid && orderId) {
      // עדכון מסמך ההזמנה הטופ-לבל
      await setDoc(
        doc(db, "orders", orderId),
        { items: itemsWithUrls, updatedAt: serverTimestamp() },
        { merge: true }
      );
    }

    // 4) יצירת סשן תשלום
    let checkoutUrl = null;
    try {
      const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
      const { data } = await createCheckoutSession({
        ...payload,
        orderId,
        customer,
      });
      checkoutUrl = data?.checkoutUrl || null;
    } catch (e) {
      console.info("Callable function failed/absent, trying /api/checkout/session…", e);
    }

    if (!checkoutUrl) {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, orderId, customer }),
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
            <div className=".d-flex flex-wrap gap-4">
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
