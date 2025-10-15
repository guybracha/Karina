// src/pages/Checkout.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ref, uploadBytes, uploadString, getDownloadURL } from "firebase/storage";
import { storage, auth, ensureAuthTokenFresh } from "../firebase";
import { useLogosQueue } from "../contexts/LogosQueueContext.tsx";

const LS_CART_KEY = "karina:cart";
const LS_PREVIEW_KEY = (slug, side) => `karina:preview:${slug}:${side}`;

/** עזר: קריאת עגלה מ-LS (עם Fallback לדוגמה) */
function useCart() {
  const lsCart = (() => {
    try {
      const raw = localStorage.getItem(LS_CART_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const demo = [
    { id: "hoodie__navy__L", slug: "hoodie", name: "קפוצ׳ון נייבי", price: 120, qty: 1, color: "navy", size: "L" },
    { id: "tee__gray__M", slug: "tee", name: "חולצת טריקו אפורה", price: 35, qty: 2, color: "gray", size: "M" },
  ];

  const items = lsCart && Array.isArray(lsCart) && lsCart.length ? lsCart : demo;
  const total = useMemo(
    () => items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0),
    [items]
  );
  return { items, total };
}

/** העברת dataURL → הערכת גודל בבייטים (לוגית בלבד, לא קריטי) */
function approxBytesFromDataUrl(dataUrl = "") {
  if (!dataUrl) return 0;
  const b64 = dataUrl.split(",")[1] || "";
  return Math.floor((b64.length * 3) / 4);
}

export default function Checkout() {
  // פרטי טופס
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    zip: "",
    payment: "credit",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { items: cartItems, total } = useCart();
  const { takeOriginalFromMemory } = useLogosQueue();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  /** העלאת קובץ לוגו מקורי (File) ל-Storage */
  async function uploadOriginalLogoIfAvailable() {
    const idFront = localStorage.getItem("karina:logoId:front");
    const idBack  = localStorage.getItem("karina:logoId:back");
    const logoId = idFront || idBack;
    if (!logoId) return null;

    const file = takeOriginalFromMemory(logoId);
    if (!file) return null;

    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("not_authed");

    const safeName = (file.name || "logo").replace(/[^\w.\-]+/g, "_");
    const path = `users/${uid}/logos/${logoId}_${Date.now()}_${safeName}`;
    const r = ref(storage, path);
    const snap = await uploadBytes(r, file, { contentType: file.type || "application/octet-stream" });
    const url = await getDownloadURL(snap.ref);
    return { path, url, bytes: file.size || 0, contentType: file.type || "application/octet-stream", logoId };
  }

  /** העלאת הדמיות שנשמרו ב-LS לכל פריט/צד */
  async function uploadMockupsForCart() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("not_authed");

    const perProduct = new Map(); // key: `${slug}:${side}` => dataUrl
    for (const it of cartItems) {
      const slug = it.slug;
      if (!slug) continue;
      const front = localStorage.getItem(LS_PREVIEW_KEY(slug, "front"));
      const back  = localStorage.getItem(LS_PREVIEW_KEY(slug, "back"));
      if (front) perProduct.set(`${slug}:front`, front);
      if (back)  perProduct.set(`${slug}:back`, back);
    }

    const results = [];
    for (const [key, dataUrl] of perProduct.entries()) {
      const [slug, side] = key.split(":");
      const path = `users/${uid}/mockups/${slug}/${side}-${Date.now()}.png`;
      const r = ref(storage, path);
      const snap = await uploadString(r, dataUrl, "data_url");
      const url = await getDownloadURL(snap.ref);
      results.push({ slug, side, path, url, bytes: approxBytesFromDataUrl(dataUrl), contentType: "image/png" });
    }
    return results;
  }

  /** קריאה לפונקציית ענן שמריצה את בקשת ה-SOAP ומחזירה redirectUrl */
// קריאה לפונקציה בענן שמחזירה redirectUrl
async function startCredit2000Payment({ amount, orderId, clientName, paymentsNumber = 1, firstPayment }) {
  const endpoint = "https://europe-west1-karina-web.cloudfunctions.net/credit2000Start";

  const body = {
    amount,                         // סכום בשקלים (Float). השרת ממיר לאגורות.
    clientName: clientName || "לקוח/ה",
    productId: String(orderId || 9999),
    paymentsNumber,                 // 1 תשלום או יותר
    firstPayment,                   // אופציונלי: אם לא תשלח – כל הסכום בתשלום ראשון
    uid: (auth.currentUser?.uid || ""),
  };

  const r = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || "credit2000_failed");

  // ייתכנו שני מצבים: {redirectUrl} או {raw}
  if (data.redirectUrl) return data.redirectUrl;

  // אם הספק מחזיר מבנה אחר — נציג הודעה ונרשום לקונסול לבדיקה
  console.warn("Credit2000 raw response:", data.raw);
  throw new Error("לא התקבל redirectUrl מהסליקה (ראה קונסול).");
}


  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      setBusy(true);

      // ודא הרשאה (רלוונטי להעלאות)
      await ensureAuthTokenFresh();

      // 1) העלאות קבצים
      const uploadedLogo = await uploadOriginalLogoIfAvailable();
      const uploadedMockups = await uploadMockupsForCart();

      // 2) יצירת הזמנה ב־DB (כאן רק דמה; החלף בשמירה בפועל והחזר orderId)
      const orderId = Math.floor(Date.now() / 1000); // placeholder

      // 3) תשלום לפי שיטה
      if (form.payment === "credit") {
        const { redirectUrl, raw } = await startCredit2000Payment({
          amount: total,
          orderId,
          clientName: form.fullName?.trim(),
        });

        if (redirectUrl) {
          // מעבר לשער התשלום של Credit2000
          window.location.assign(redirectUrl);
          return;
        }

        // אם אין redirectUrl — נציג שגיאה ידידותית ונזרוק raw ללוג
        console.warn("Credit2000 raw response:", raw);
        throw new Error("לא התקבל קישור לתשלום מהספק");
      }

      // PayPal / מזומן – זרימה בסיסית (כאן רק הודעה)
      alert(
        "תודה! ההזמנה נקלטה בהצלחה.\n" +
          (uploadedLogo ? `קישור ללוגו: ${uploadedLogo.url}\n` : "") +
          (uploadedMockups.length
            ? `הועלו ${uploadedMockups.length} קובצי הדמיה.`
            : "לא נמצאו הדמיות להעלאה.")
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || "תקלה בשליחת ההזמנה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container py-5">
      <h1 className="mb-4">תשלום והזמנה</h1>

      <div className="row g-4">
        {/* טופס פרטים אישיים */}
        <div className="col-lg-7">
          <form onSubmit={handleSubmit} className="card shadow-sm p-4">
            <h5 className="mb-3">פרטים אישיים ומשלוח</h5>

            <div className="mb-3">
              <label className="form-label">שם מלא</label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">אימייל</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">טלפון</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">כתובת</label>
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                className="form-control"
                required
              />
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">עיר</label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">מיקוד</label>
                <input
                  type="text"
                  name="zip"
                  value={form.zip}
                  onChange={handleChange}
                  className="form-control"
                />
              </div>
            </div>

            <h5 className="mt-4 mb-3">שיטת תשלום</h5>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="payment"
                value="credit"
                checked={form.payment === "credit"}
                onChange={handleChange}
                id="payCredit"
              />
              <label className="form-check-label" htmlFor="payCredit">
                כרטיס אשראי
              </label>
            </div>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="radio"
                name="payment"
                value="paypal"
                checked={form.payment === "paypal"}
                onChange={handleChange}
                id="payPaypal"
              />
              <label className="form-check-label" htmlFor="payPaypal">
                PayPal
              </label>
            </div>
            <div className="form-check mb-4">
              <input
                className="form-check-input"
                type="radio"
                name="payment"
                value="cash"
                checked={form.payment === "cash"}
                onChange={handleChange}
                id="payCash"
              />
              <label className="form-check-label" htmlFor="payCash">
                מזומן בעת מסירה
              </label>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>
              {busy ? "שולח הזמנה…" : "בצע הזמנה"}
            </button>
          </form>
        </div>

        {/* סיכום הזמנה */}
        <div className="col-lg-5">
          <div className="card shadow-sm p-4">
            <h5 className="mb-3">סיכום הזמנה</h5>
            <ul className="list-group list-group-flush mb-3">
              {cartItems.map((it) => (
                <li
                  key={it.id}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    {it.name}{" "}
                    <small className="text-muted">
                      x{it.qty}
                      {it.color ? ` • ${it.color}` : ""}
                      {it.size ? ` • ${it.size}` : ""}
                    </small>
                  </div>
                  <div>{(Number(it.price) || 0) * (Number(it.qty) || 0)} ₪</div>
                </li>
              ))}
            </ul>
            <h5 className="text-end">סה״כ: {total} ₪</h5>
            <Link to="/cart" className="btn btn-outline-secondary mt-3 w-100">
              חזרה לעגלה
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
