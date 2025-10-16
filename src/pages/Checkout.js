// src/pages/Checkout.jsx
import React, { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ref, uploadBytes, uploadString, getDownloadURL } from "firebase/storage";
import { storage, auth, ensureAuthTokenFresh } from "../firebase";
import { useLogosQueue } from "../contexts/LogosQueueContext.tsx";

const LS_CART_KEY = "karina:cart";
const LS_PREVIEW_KEY = (slug, side) => `karina:preview:${slug}:${side}`;

function useCartFallback() {
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
  const merchandiseTotal = useMemo(
    () => items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0),
    [items]
  );
  return { items, totals: { merchandiseTotal, shippingCost: 0, grandTotal: merchandiseTotal } };
}

// עזרי dataURL
function approxBytesFromDataUrl(dataUrl = "") {
  if (!dataUrl) return 0;
  const b64 = dataUrl.split(",")[1] || "";
  return Math.floor((b64.length * 3) / 4);
}
function contentTypeFromDataUrl(dataUrl = "") {
  const m = /^data:([^;]+);base64,/i.exec(dataUrl || "");
  return m?.[1] || "image/png";
}

// POST עם ID Token (מומלץ)
async function authorizedPostJson(url, body) {
  await ensureAuthTokenFresh();
  const token = await auth.currentUser?.getIdToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  let data = {};
  try { data = await r.json(); } catch {}
  if (!r.ok) throw new Error(data?.error || `request_failed (${r.status})`);
  return data;
}

export default function Checkout() {
  const { state } = useLocation() || {};
  const fallback = useCartFallback();

  const items = Array.isArray(state?.items) && state.items.length ? state.items : fallback.items;
  const shipping = state?.shipping || { method: "pickup", label: "איסוף מהמפעל", cost: 0, address: {} };
  const totals = state?.totals || fallback.totals;

  const grandTotal = totals?.grandTotal ?? items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 0), 0);

  // פרטי טופס + תשלומים
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: shipping?.address?.address || "",
    city: shipping?.address?.city || "",
    zip: shipping?.address?.zip || "",
    payment: "credit",
    paymentsNumber: 1,     // ← כמה תשלומים
    firstPayment: "",      // ← תשלום ראשון (אופציונלי בש"ח)
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { takeOriginalFromMemory } = useLogosQueue();

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "paymentsNumber" ? Number(value) : value }));
  }

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

  async function uploadMockupsForCart() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("not_authed");

    const perProduct = new Map();
    for (const it of items) {
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
      const ct = contentTypeFromDataUrl(dataUrl);
      const ext = ct.split("/")[1] || "png";
      const path = `users/${uid}/mockups/${slug}/${side}-${Date.now()}.${ext}`;
      const r = ref(storage, path);
      const snap = await uploadString(r, dataUrl, "data_url", { contentType: ct });
      const url = await getDownloadURL(snap.ref);
      results.push({ slug, side, path, url, bytes: approxBytesFromDataUrl(dataUrl), contentType: ct });
    }
    return results;
  }

  // קריאה ל־Cloud Function שמחזירה redirectUrl
  async function startCredit2000Payment({ amount, orderId, clientName, paymentsNumber = 1, firstPayment }) {
    const endpoint = "https://europe-west1-karina-web.cloudfunctions.net/credit2000Start";
    const payload = {
      amount,                                 // ₪ (float)
      clientName: clientName || "לקוח/ה",
      productId: String(orderId || 9999),
      paymentsNumber,
      // שלח firstPayment רק אם יש ערך חוקי
      ...(firstPayment != null && firstPayment !== "" ? { firstPayment: Number(firstPayment) } : {}),
      uid: auth.currentUser?.uid || "",
    };
    const data = await authorizedPostJson(endpoint, payload);
    if (data.redirectUrl) return data.redirectUrl;
    console.warn("Credit2000 raw response:", data.raw);
    throw new Error("לא התקבל redirectUrl מהסליקה (ראה קונסול).");
  }

  // חישוב אינפורמטיבי ללקוח כשנבחרו תשלומים
  const installmentsInfo = useMemo(() => {
    const n = Number(form.paymentsNumber) || 1;
    const first = form.firstPayment === "" ? null : Number(form.firstPayment);
    const total = Number(grandTotal) || 0;

    if (n <= 1) return null;

    if (first != null && isFinite(first) && first >= 0 && first <= total) {
      const rest = Math.max(0, total - first);
      const per = n > 1 ? rest / (n - 1) : 0;
      return { first, count: n, per: Math.max(0, per) };
    }

    // בלי תשלום ראשון – חלוקה שווה
    const per = total / n;
    return { first: per, count: n, per };
  }, [form.paymentsNumber, form.firstPayment, grandTotal]);

  // ולידציה בסיסית לתשלומים לפני קריאה לסליקה
  function validateInstallments() {
    const n = Number(form.paymentsNumber) || 1;
    if (n < 1 || n > 12) return "מספר התשלומים חייב להיות בין 1 ל-12.";
    if (n > 1 && form.firstPayment !== "") {
      const first = Number(form.firstPayment);
      if (!isFinite(first) || first < 0) return "תשלום ראשון חייב להיות מספר תקין.";
      if (first > grandTotal) return "תשלום ראשון לא יכול להיות גדול מהסכום הכולל.";
    }
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      setBusy(true);

      if (!auth.currentUser?.uid) throw new Error("עליך להתחבר לפני השלמת ההזמנה.");
      await ensureAuthTokenFresh();

      // ולידציית תשלומים לפני העלאות/סליקה
      const errI = validateInstallments();
      if (errI) throw new Error(errI);

      // העלאות (אם יש)
      await uploadOriginalLogoIfAvailable().catch(() => null);
      await uploadMockupsForCart().catch(() => []);

      // מזהה הזמנה (רצוי אמיתי משרת/Firestore)
      const orderId = state?.orderId || Math.floor(Date.now() / 1000);

      if (form.payment === "credit") {
        const redirectUrl = await startCredit2000Payment({
          amount: Number(grandTotal || 0),
          orderId,
          clientName: form.fullName?.trim(),
          paymentsNumber: Number(form.paymentsNumber) || 1,
          firstPayment: form.firstPayment === "" ? undefined : Number(form.firstPayment),
        });
        window.location.assign(redirectUrl);
        return;
      }

      if (form.payment === "paypal") {
        alert("תשלום PayPal: ננתב לפי ה־API שלך.");
        return;
      }

      alert("תודה! ההזמנה נקלטה בהצלחה.");
    } catch (err) {
      console.error(err);
      setError(err?.message || "תקלה בשליחת ההזמנה");
    } finally {
      setBusy(false);
    }
  }

  const lineTotal = (it) => (Number(it.price) || 0) * (Number(it.qty) || 0);

  return (
    <div className="container py-5">
      <h1 className="mb-4">תשלום והזמנה</h1>

      <div className="row g-4">
        {/* טופס פרטים אישיים + תשלומים */}
        <div className="col-lg-7">
          <form onSubmit={handleSubmit} className="card shadow-sm p-4">
            <h5 className="mb-3">פרטים אישיים ומשלוח</h5>

            <div className="mb-3">
              <label className="form-label">שם מלא</label>
              <input type="text" name="fullName" value={form.fullName} onChange={handleChange} className="form-control" required />
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">אימייל</label>
                <input type="email" name="email" value={form.email} onChange={handleChange} className="form-control" required />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">טלפון</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="form-control" required />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">כתובת</label>
              <input type="text" name="address" value={form.address} onChange={handleChange} className="form-control" required />
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label">עיר</label>
                <input type="text" name="city" value={form.city} onChange={handleChange} className="form-control" required />
              </div>
              <div className="col-md-6 mb-3">
                <label className="form-label">מיקוד</label>
                <input type="text" name="zip" value={form.zip} onChange={handleChange} className="form-control" />
              </div>
            </div>

            <h5 className="mt-4 mb-2">שיטת תשלום</h5>
            <div className="form-check mb-2">
              <input className="form-check-input" type="radio" name="payment" value="credit" checked={form.payment === "credit"} onChange={handleChange} id="payCredit" />
              <label className="form-check-label" htmlFor="payCredit">כרטיס אשראי (עמוד מאובטח)</label>
            </div>
            <div className="form-check mb-2">
              <input className="form-check-input" type="radio" name="payment" value="paypal" checked={form.payment === "paypal"} onChange={handleChange} id="payPaypal" />
              <label className="form-check-label" htmlFor="payPaypal">PayPal</label>
            </div>
            <div className="form-check mb-3">
              <input className="form-check-input" type="radio" name="payment" value="cash" checked={form.payment === "cash"} onChange={handleChange} id="payCash" />
              <label className="form-check-label" htmlFor="payCash">מזומן בעת מסירה</label>
            </div>

            {/* ⚠️ לא אוספים מספר כרטיס אצלך באתר. רק בחירה של תשלומים/תשלום ראשון */}
            {form.payment === "credit" && (
              <div className="border rounded-3 p-3 mb-3">
                <h6 className="mb-3">העדפות תשלום בכרטיס</h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">מספר תשלומים</label>
                    <select className="form-select" name="paymentsNumber" value={form.paymentsNumber} onChange={handleChange}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">תשלום ראשון (אופציונלי)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="firstPayment"
                      value={form.firstPayment}
                      onChange={handleChange}
                      className="form-control"
                      placeholder="למשל 100.00"
                      disabled={Number(form.paymentsNumber) <= 1}
                    />
                  </div>
                </div>

                {installmentsInfo && (
                  <div className="alert alert-info mt-3 mb-0" dir="rtl">
                    {installmentsInfo.first != null ? (
                      <>
                        תשלום ראשון: <strong>{installmentsInfo.first.toFixed(2)} ₪</strong>, ולאחריו{" "}
                        <strong>{installmentsInfo.count - 1}</strong> תשלומים של{" "}
                        <strong>{installmentsInfo.per.toFixed(2)} ₪</strong>.
                      </>
                    ) : (
                      <>
                        {installmentsInfo.count} תשלומים שווים של{" "}
                        <strong>{installmentsInfo.per.toFixed(2)} ₪</strong>.
                      </>
                    )}
                  </div>
                )}
                <small className="text-muted d-block mt-2">
                  פרטי הכרטיס יוזנו בעמוד הסליקה המאובטח של Credit2000.
                </small>
              </div>
            )}

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
              {items.map((it) => (
                <li key={it.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    {it.name}{" "}
                    <small className="text-muted">
                      x{it.qty}{it.color ? ` • ${it.color}` : ""}{it.size ? ` • ${it.size}` : ""}
                    </small>
                  </div>
                  <div>{lineTotal(it)} ₪</div>
                </li>
              ))}
            </ul>

            <div className="text-end">
              {"merchandiseTotal" in (totals || {}) && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">סה״כ מוצרים:</span>
                  <strong>{Number(totals.merchandiseTotal || 0)} ₪</strong>
                </div>
              )}
              {"shippingCost" in (totals || {}) && (
                <div className="d-flex justify-content-between">
                  <span className="text-muted">
                    משלוח {shipping?.label ? `(${shipping.label})` : ""}
                  </span>
                  <strong>{Number(totals.shippingCost || 0)} ₪</strong>
                </div>
              )}
              <hr className="my-2" />
              <h5 className="mb-0">סה״כ לתשלום: {Number(grandTotal || 0)} ₪</h5>
            </div>

            <Link to="/cart" className="btn btn-outline-secondary mt-3 w-100">
              חזרה לעגלה
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
