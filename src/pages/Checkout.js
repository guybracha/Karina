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
    // fallback אם אין עגלה ב-LS
    { id: "hoodie__navy__L", slug: "hoodie", name: "קפוצ׳ון נייבי", price: 120, qty: 1, color: "navy", size: "L" },
    { id: "tee__gray__M", slug: "tee", name: "חולצת טריקו אפורה", price: 35, qty: 2, color: "gray", size: "M" },
  ];

  const items = lsCart && Array.isArray(lsCart) && lsCart.length ? lsCart : demo;
  const total = useMemo(() => items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0), [items]);
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
    // ניקח את ה-logoId הראשון שמצאנו (קדמי/אחורי)
    const idFront = localStorage.getItem("karina:logoId:front");
    const idBack  = localStorage.getItem("karina:logoId:back");
    const logoId = idFront || idBack;
    if (!logoId) return null; // אין מזהה

    // קח את הקובץ מהזיכרון (אם נשמר שם – קבצים מעל 2MB)
    const file = takeOriginalFromMemory(logoId);
    // ייתכן שהקובץ קטן ונשמר כ-dataURL ב-LS דרך pendingLogos; בדף זה לא נטפל בזה כדי לשמור פשטות.
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

    // נרכז הדמיות לפי slug וצד (front/back) — גם אם יש כמה שורות של אותו מוצר
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
      // נעלה ישירות כ-data_url (Firebase מזהה ומעדכן מטא)
      const snap = await uploadString(r, dataUrl, "data_url");
      const url = await getDownloadURL(snap.ref);
      results.push({ slug, side, path, url, bytes: approxBytesFromDataUrl(dataUrl), contentType: "image/png" });
    }
    return results;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      setBusy(true);

      // ודא הרשאה
      await ensureAuthTokenFresh();

      // 1) העלאת הלוגו המקורי (אם יש בזיכרון)
      const uploadedLogo = await uploadOriginalLogoIfAvailable();

      // 2) העלאת ההדמיות שנשמרו ב-LS לכל מוצר/צד שנמצא בעגלה
      const uploadedMockups = await uploadMockupsForCart();

      // 3) כאן תיצור מסמך הזמנה ב-Firestore ותכלול:
      //    - פרטי הלקוח (form)
      //    - פריטי העגלה (cartItems)
      //    - קישורים לקבצים: uploadedLogo, uploadedMockups
      //
      //    לדוגמה:
      //    await setDoc(doc(db, "orders", orderId), {
      //      userId: auth.currentUser.uid,
      //      customer: form,
      //      items: cartItems,
      //      assets: { logo: uploadedLogo, mockups: uploadedMockups },
      //      total,
      //      createdAt: serverTimestamp(),
      //    });

      // 4) ניקוי מקומי אופציונלי
      // localStorage.removeItem(LS_CART_KEY);
      // עבור כל מוצר בעגלה ננקה הדמיות:
      // for (const it of cartItems) {
      //   if (!it.slug) continue;
      //   localStorage.removeItem(LS_PREVIEW_KEY(it.slug, "front"));
      //   localStorage.removeItem(LS_PREVIEW_KEY(it.slug, "back"));
      // }
      // localStorage.removeItem("karina:logoId:front");
      // localStorage.removeItem("karina:logoId:back");

      alert(
        "תודה! ההזמנה נקלטה בהצלחה.\n" +
        (uploadedLogo ? `קישור ללוגו: ${uploadedLogo.url}\n` : "") +
        (uploadedMockups.length ? `הועלו ${uploadedMockups.length} קובצי הדמיה.` : "לא נמצאו הדמיות להעלאה.")
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
                      {it.color ? ` • ${it.color}` : ""}{it.size ? ` • ${it.size}` : ""}
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
